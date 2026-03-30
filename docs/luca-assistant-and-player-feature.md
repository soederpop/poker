# Plan: LLM Bot (AIPlayer) + Player Abstraction

## Context

The poker project has a working game server with rule-based house bots that use profile-based ranges and equity calculations. We want to add:
1. **LLM-powered bots** that use the Luca `assistant` feature to reason about poker decisions, calling analysis tools and returning structured output
2. **A `Player` abstraction** that decouples bot identity from decision strategy, enabling multi-strategy and AI-powered players

This enables pure LLM reasoning as a baseline competitor, tool-augmented decision-making, opponent profiling via hand history, and lays the foundation for a regret-minimizing self-improving bot.

---

## Iterative Delivery

### Checkpoint 1: Bare LLM Bot — Skateboard
**Goal**: A working `ai-player` house actor that makes valid poker decisions via LLM structured output.

**Files to create:**
- `house/actors/ai-player.ts` — new actor with `init(container)` lifecycle + `decide()` that calls `assistant.ask()`
- `assistants/poker-ai/CORE.md` — system prompt (poker rules, context format, decision mandate)

**Files to modify:**
- `servers/poker-server.ts`:
  1. Add `heroCards: [string, string]` to `HouseActorContext` type (~line 212) — currently in scope but not passed to `decide()`
  2. Add `init?: (container: AGIContainer) => Promise<void>` to `HouseActorModule` type (~line 229)
  3. In `normalizeHouseActor()` (~line 580): forward `candidate.init` if it exists
  4. In `loadHouseActors()` (~line 609): after loading, call `await actor.init(this.container)` for any actor with `init`
  5. In `runHouseBotTurn()` (~line 3566): pass `heroCards` and `opponentBotIds` in the context spread

**Key design decisions:**
- One assistant instance per table (stored in `Map<tableId, Assistant>`) so each instance builds a mental model of its specific opponents
- `historyMode: 'persistent'` with `resumeThread('poker-ai-table-${tableId}')` to persist across server restarts
- Fallback to `fold`/`check` if container is not yet initialized or decision throws

**HouseActorContext additions:**
```typescript
heroCards: [string, string]       // was available in server, never passed
opponentBotIds?: string[]         // for future profiling
```

**Structured output schema:**
```typescript
z.object({
  action: z.enum(["fold", "check", "call", "bet", "raise", "all-in"]),
  amount: z.number().optional(),
  reasoning: z.string(),
}).describe("PokerDecision")
```

---

### Checkpoint 2: Poker Analysis Tools — Bicycle
**Goal**: The AI calls tools during reasoning to compute equity, pot odds, hand strength, opponent tendencies.

**Files to create:**
- `assistants/poker-ai/tools.ts` — 5 tools using `container.feature('strategy')`:
  1. `computeEquity({ heroCards, opponentRange, board })` — Monte Carlo equity vs a range
  2. `getPotOdds({ toCall, potSize })` — pot odds + break-even equity
  3. `getHandStrength({ heroCards, board })` — categorize hand (pair type, draw, made hand)
  4. `getOpponentTendencies({ botId, limit })` — VPIP/PFR/aggression from diskCache hand history
  5. `getSuggestedBetSizing({ street, potSize, effectiveStack, intent })` — returns common sizing options

**Also modify** `house/actors/ai-player.ts`:
- Before calling `assistant.ask()`, call `assistant.state.set("currentHandContext", context)` so tools can access current context if needed

---

### Checkpoint 3: Player Abstraction — Motorcycle
**Goal**: Introduce a `Player` interface that decouples bot identity from strategy selection.

**Files to create:**
- `features/player.ts`:
  - `Player` interface: `{ id, displayName, decide(context): Promise<PlayerDecision> }`
  - `SingleStrategyPlayer` — wraps existing `HouseActorModule`, delegates to its `decide()`
  - `AIPlayer` class — mirrors `ai-player.ts` but as a first-class Luca feature
  - `PlayerFeature` — Luca Feature subclass, factory for Player instances

**Files to modify:**
- `container.ts`:
  - Add `import "./features/player"`
  - Register `container.feature("player", { enable: true })` in `configurePokerContainer()`
- `servers/poker-server.ts`:
  - Add `private readonly housePlayers = new Map<string, Player>()`
  - After `init()` loop in `loadHouseActors()`: wrap each actor in `SingleStrategyPlayer` (or keep AI actor as-is)
  - In `runHouseBotTurn()`: prefer `housePlayers.get(actorId)?.decide(context)` over direct `actorModule.decide()`

---

### Checkpoint 4: Hand History + Opponent Profiling — Car
**Goal**: The AI can query hand history to profile opponents before deciding.

**Files to modify:**
- `assistants/poker-ai/tools.ts`: add 2 more tools:
  - `getRecentHandHistory({ tableId, limit })` — summary of recent hands (board, pot, winners)
  - `getMyHandHistory({ botId, limit })` — hero's own recent hands to understand table image
- `house/actors/ai-player.ts`:
  - Include `opponentBotIds` in the game state message with a hint to call `getOpponentTendencies()`
  - Call `assistant.addSystemPromptExtension("opponents", ...)` on table init

---

## Critical Files

| File | Role |
|------|------|
| `servers/poker-server.ts` | Type changes (lines ~212, ~229), `init()` call after load, `heroCards` in context (~3566) |
| `house/actors/nit.ts` | Reference for house actor export format |
| `house/actors/ai-player.ts` | New — the AI actor |
| `assistants/poker-ai/CORE.md` | New — system prompt |
| `assistants/poker-ai/tools.ts` | New — analysis tools |
| `features/player.ts` | New — Player interface + feature |
| `container.ts` | Register player feature |
| `features/strategy.ts` | Reuse `strategy.estimateEquity()` in tools |

---

## Gotchas

- **Action clock**: The AI makes LLM calls (+ tool chains). The server's action timeout needs to be raised for the AI bot, or an `isAI` flag should give it a larger time bank multiplier in `addHouseBotToTable()`.
- **`heroCards` sentinel**: Server uses `["Ah", "As"]` fallback when cards aren't dealt (line ~3548). The AI actor should detect this and skip equity tools when cards aren't real.
- **Concurrent table init**: `getAssistantForTable()` can be called simultaneously for the same table. Use a pending-promise cache instead of a plain Map to prevent double-initialization.
- **Embedded/standalone mode**: `ai-player` requires `container.feature('assistant')`. Exclude it from embedded actors in standalone mode, or gate on feature availability.

---

## Verification

1. Start the server: `luca serve` or `bun run serve`
2. Use `luca poker new-agent --actor ai-player` to add an AI bot to a table
3. Watch it make decisions via the spectator CLI: `luca poker watch`
4. Play against it: `luca poker play`
5. Confirm decisions appear in hand history API: `GET /api/v1/hand-history`
6. Verify structured `reasoning` field is present in server logs per decision
