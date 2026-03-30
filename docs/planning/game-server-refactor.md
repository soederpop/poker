# Game server refactor: player-agnostic architecture

## Goal

Refactor the poker server so it is completely ignorant of bots, house bots, and house profiles.

Target model:

- the **server** hosts games and enforces rules
- **clients** join tables and submit actions
- **bots are just clients**
- **humans are just clients**
- optional **orchestrators** may fill seats, but they live outside server core

In short:

> The game server should be a neutral poker host, not a bot runtime.

---

## Why do this

The current design appears to mix two concerns:

1. hosting poker games
2. managing built-in house bots/profiles

Separating them gives:

- a simpler server
- a cleaner protocol for third-party bots
- better testability
- no privileged server-side players
- easier orchestration/tournament tooling later
- easier support for bots in any language

---

## Desired end state

The server should know only about:

- tables
- seats
- players
- stacks
- blinds
- action order
- legal actions
- disconnect/reconnect
- timeouts
- persistence/history
- state broadcasting

The server should not know about:

- house actors
- actor files on disk
- preferred house actor per table
- house profiles
- whether a player is a bot or human
- special rebuy/fill rules for house-controlled seats

---

## Architecture

## 1. Server

The server is the arbiter.

Responsibilities:

- validate joins/leaves
- manage tables and seats
- run hands according to rules
- enforce legal actions and timeouts
- persist game/hand history
- notify clients when action is required
- accept actions over the network

The server should treat all seats identically.

## 2. Client

A client can be:

- web UI
- terminal UI
- bot runner
- benchmark bot
- research agent

Responsibilities:

- connect
- identify/authenticate
- join a table
- receive state and prompts
- decide and submit actions

## 3. Orchestrator

An external orchestrator may:

- inspect open tables
- connect bots as normal clients
- rebuy/reseat bots
- create benchmark matchups
- keep demo tables full

This logic should not live inside the server core.

---

## Server changes

Remove server concepts related to:

- house actor loading from disk
- embedded house actors
- `preferredHouseActor`
- `isHouseBot`
- server-owned `profile` semantics for players
- automatic server-side bot spawning
- server-side actor init lifecycle
- house-specific rebuy/refill logic

The server should not import or instantiate strategy code for seated players.

---

## Data model changes

## Table/player state

Keep generic fields such as:

- `playerId`
- `name`
- `seat`
- `stack`
- `connected`
- `joinedAt`
- `updatedAt`

Remove:

- `isHouseBot`
- `preferredHouseActor`
- any server-owned `profile` field used to decide who a player is

If needed for UI only, use generic metadata such as:

- `tags?: string[]`
- `metadata?: Record<string, unknown>`

But server logic should not branch on those fields.

---

## Protocol implications

The wire protocol should not distinguish humans from bots.

Clients should be able to:

- connect/register
- list tables
- create table
- join seat
- leave seat
- receive action prompt/state snapshot
- submit action
- reconnect and resume

Action prompts should be generic and complete, for example including:

- current actor id
- legal actions
- to-call amount
- min raise / stack info
- public game state
- private player state for the acting client only

Any bot-specific formatting belongs client-side.

---

## Timeout behavior

Timeout rules should be neutral:

- if `check` is legal, auto-check
- otherwise auto-fold
- optionally sit a player out after repeated timeouts

These rules should apply equally to all players.

---

## Recommended component split

## Server core

Contains:

- networking
- table registry access
- game engine integration
- action validation
- persistence
- broadcast/update pipeline

## External bot runners

Contain:

- strategy selection
- actor module loading
- self-play logic
- research loops
- bot logs/journals

## Optional orchestration service

Contains:

- auto-fill policy
- lobby balancing
- tournament scheduling
- rebuy policy for demos

---

## Likely impacted files

- `servers/poker-server.ts`
- `features/table-manager.ts`
- commands that rely on preferred house actors
- endpoints/UI code that assume house bot identity
- player/table models containing bot-only flags

Also revisit docs that assume server-managed actor files.

---

## Refactor plan

## Phase 1: freeze house-specific growth

- stop adding new house actor/server-managed bot behavior
- document player-agnostic direction
- prefer “player/client” language over “house bot” language

## Phase 2: genericize state

- remove `preferredHouseActor` from tables
- remove `isHouseBot` from players
- remove server-owned `profile` semantics from player state
- update serialization and UI payloads accordingly

Deliverable: core state contains only generic multiplayer concepts.

## Phase 3: remove strategy loading from server

- delete actor file scanning/import logic
- delete embedded house actor fallback logic
- delete actor init lifecycle from server startup

Deliverable: `poker-server.ts` no longer loads strategy modules.

## Phase 4: remove server-side auto-fill/rebuy policy

- delete automatic server-side seat filling
- delete house-specific rebuy behavior
- delete preferred-actor matchmaking logic

Deliverable: server only responds to actual clients and generic table actions.

## Phase 5: move convenience to external tooling

Possible replacements:

- `luca poker fill-table`
- `luca poker run-bot`
- `luca poker benchmark-match`
- separate bot-manager service

That tooling should connect as normal clients and manage bots externally.

## Phase 6: harden client protocol

- ensure action prompts are generic and sufficient
- ensure reconnect/resume works for bot clients too
- document protocol for third-party bot authors

Deliverable: external bots are first-class without any privileged server path.

---

## Suggested target model

### Table manager

Should only manage generic seat registry state.

Example player shape:

```ts
type TablePlayer = {
  playerId: string
  name: string
  seat: number
  stack: number
  connected: boolean
  joinedAt: number
  updatedAt: number
}
```

No bot/human distinction needed.

### Poker server

Should only:

- host connections
- manage sessions
- prompt current actor
- validate and apply actions
- publish updates
- enforce timeouts

It should never decide actions for a player.

### Bot runtime

Lives outside the server and:

- connects like a normal client
- receives state/prompt
- runs strategy code locally
- sends action back

---

## Migration risks

- some current demo flows likely assume built-in house bots
- some UI surfaces may display house-specific info
- some commands may depend on preferred house actor behavior
- some persistence/reporting may assume `profile` or `isHouseBot`

These should be treated as migration chores, not reasons to keep the coupling.

---

## Recommendation on sequencing

Best order:

1. update docs and freeze new house-specific behavior
2. genericize `table-manager` state
3. remove house-specific branches from `poker-server.ts`
4. extract bot/orchestration behavior into external commands/services
5. document the player protocol for humans and bots alike

---

## Final recommendation

This refactor is worth doing.

The clean long-term design is:

- **server = neutral host**
- **bot = external client**
- **human = external client**
- **orchestrator = external automation**

That architecture better matches your goals around competition, openness, benchmarking, and self-improving agents.