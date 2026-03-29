# Agent AI Outer Loop Architecture

Goal:
Reframe the project roadmap around the real public hook: an agentic self-improving poker system, where a Luca Assistant is the outer loop and the regret optimizer is the inner loop.

Status / alignment captured from discussion:
- The offline poker tool is useful infrastructure, but not the public hype engine by itself.
- The compelling story is the Agent AI loop:
  - bot plays
  - inner loop identifies leaks / regret-heavy spots
  - system writes readable journals
  - outer loop updates readable strategy artifacts
  - bot replays and improves
- A winning poker strategy should not live forever inside one monolithic `strategy.ts`.
- The Luca framework should provide the machinery for a more complex system:
  - Assistants
  - skills / SKILLS.md loading
  - persistent storage / DB / content machinery
  - structured artifacts the assistant can reason over

---

## Core Architecture

### Outer loop
Use a Luca Assistant as the outer loop.

Preferred candidate:
- the Luca coding assistant

Responsibilities:
- read strategy API docs
- load relevant skills / SKILLS.md
- read journals emitted by the inner loop
- inspect prior strategy artifacts and experiment history
- propose or implement strategy changes
- evaluate whether the changes improved the target leaks

### Inner loop
Use the regret optimizer as the inner loop.

Responsibilities:
- run many hands / sims / sessions
- bucket spots into abstractions
- estimate regret or leak signals
- aggregate recurring mistakes
- emit structured markdown and/or JSON artifacts for the outer loop

### Runtime adapter
Keep `strategy.ts` as the runtime entrypoint only.

Meaning:
- `strategy.ts` must continue to export `decide(context)` because the runtime expects it
- but `strategy.ts` should become a thin wrapper, not the entire strategy system

In other words:
- `strategy.ts` = adapter layer
- real strategy = modular substrate behind it

---

## What “strategy.ts is a wrapper” means

It does NOT mean `strategy.ts` goes away.
It means `strategy.ts` stops being the place where all strategic intelligence is stored.

Instead:
- `strategy.ts` receives `DecisionContext`
- delegates to modular policies / rules / data / helpers
- returns `StrategyDecision`

Example conceptual shape:

- `strategy.ts`
  - imports or loads a coordinator
  - calls `buildDecision(context)`
  - returns the result

- `strategy/` or `bot-system/`
  - `coordinator.ts`
  - `preflop.ts`
  - `postflop.ts`
  - `profiles.ts`
  - `sizing.ts`
  - `overrides.ts`
  - `journals/`
  - `policies/`

This keeps the runtime contract stable while allowing the real strategy system to grow.

---

## Why this architecture is necessary

### 1. Monolithic strategy files do not scale
A strong strategy system will eventually need:
- street-specific logic
- profile-specific adaptations
- exploit overrides
- learned heuristics
- sizing rules
- experiment branches
- rollback-friendly change history

That becomes unreadable and hard to evolve if forced into one giant `strategy.ts`.

### 2. The outer loop needs modular artifacts
A Luca Assistant will work much better if it can modify:
- one sizing rule
- one profile definition
- one override
- one policy fragment
- one journal-derived heuristic

rather than constantly rewriting one giant file.

### 3. The public story becomes stronger
The pitch becomes:
- not “a poker CLI”
- but “a persistent agentic poker system that critiques itself and evolves readable strategy artifacts over time”

That is the actual hook for Hacker News / X / public demos.

---

## Public Positioning

The primary public narrative should be:
- Luca-powered Agent AI for poker
- self-improving bot loop
- readable journals
- readable strategy evolution
- persistent strategic memory / artifacts

Supporting layers still matter:
- offline analysis
- local arena
- bot scaffold

But they should be treated as enabling infrastructure, not the main headline.

Recommended public story order:
1. the system can play
2. the system can detect its mistakes
3. the system can explain those mistakes in plain English
4. the outer loop assistant can update the strategy substrate
5. the system can replay and improve

---

## Target System Layers

### Layer 1: Runtime contract
Files / surfaces:
- `strategy.ts`
- bot VM globals / strategy API docs

Purpose:
- satisfy the existing runtime contract
- keep join/play flows simple and stable

### Layer 2: Modular strategy substrate
Candidate contents:
- preflop policy modules
- postflop policy modules
- sizing modules
- profile definitions
- exploit overrides
- learned heuristic fragments
- coordination / arbitration logic

Purpose:
- allow strategy to outgrow a single file cleanly
- give the outer loop structured edit targets

### Layer 3: Inner-loop artifacts
Candidate outputs:
- markdown journals
- JSON summaries
- top-regret spot tables
- replay references
- before/after comparisons

Purpose:
- provide machine- and human-readable learning signals

### Layer 4: Outer-loop assistant workspace
Candidate contents:
- assistant instructions
- strategy API reference
- loaded skills / SKILLS.md
- prior experiment logs
- current strategy artifact graph
- target leak list / backlog

Purpose:
- let the Luca Assistant operate as a real strategic coding/research loop

### Layer 5: Persistence / memory layer
Potential Luca-backed substrate:
- contentbase docs
- structured records
- assistant state
- strategy lineage
- experiment history
- promoted heuristics

Purpose:
- preserve learning over time
- avoid repeated rediscovery
- support more complex multi-session evolution

---

## Recommended Implementation Phases

### Phase A: Thin wrapper refactor
Objective:
Turn `strategy.ts` into a stable adapter over modular internals.

Deliverables:
- minimal `strategy.ts`
- `strategy/` or `bot-system/` folder introduced
- coordinator module introduced
- at least preflop/postflop logic separated

Exit criteria:
- runtime still works through `strategy.ts`
- strategy logic is no longer concentrated in one file

### Phase B: Define machine-readable journal contract
Objective:
Make inner-loop output reliably consumable by the outer loop.

Deliverables:
- markdown journal schema
- optional paired JSON schema
- fields for spot identity, bucket, action frequencies, regret, recommendation
- one or more sample journals checked into repo

Exit criteria:
- a Luca Assistant could consume journals deterministically
- a human can also read them comfortably

### Phase C: Assistant outer-loop contract
Objective:
Give the Luca Assistant a stable workflow and artifact surface.

Deliverables:
- assistant prompt/instructions
- strategy API reference path(s)
- skill-loading conventions
- target output locations for patches, notes, and experiment logs
- one worked example of assistant-driven strategy revision

Exit criteria:
- the outer loop can read journals and propose a bounded strategy change

### Phase D: End-to-end self-improving demo
Objective:
Create the minimum compelling public demo.

Demo flow:
1. run baseline bot
2. run regret session
3. inspect markdown journal
4. outer loop assistant updates strategy substrate
5. rerun same or similar session
6. compare results

Exit criteria:
- one believable before/after example exists
- strategy changes are readable
- journals are readable
- improvement is observable enough to tell the story

### Phase E: Persistence and scaling
Objective:
Move from file-only artifacts to a longer-lived strategy memory system where useful.

Possible additions:
- experiment DB/content store
- promoted heuristic records
- policy lineage tracking
- assistant memory of prior successful/failed changes

Exit criteria:
- the system can evolve over multiple sessions without relying on a single file or transient context

---

## Design Principles

### Keep the runtime contract simple
Do not break the simplicity of:
- `strategy.ts`
- `decide(context)`

That contract is valuable and should remain the stable boundary.

### Move complexity behind the boundary
Let complexity live in:
- modules
- policy fragments
- journals
- assistant-managed artifacts
- persistent stores

### Prefer readable artifacts over opaque ones
The wow factor comes from legibility:
- readable journals
- readable code changes
- readable strategy modules
- readable experiment notes

### Build only enough generic product polish to support the loop
Offline analysis and local arena should be good enough to support the capstone.
They are not the main event.

---

## Immediate Next Planning Implications

The roadmap should now prioritize:
1. stabilize baseline command/runtime flows
2. refactor strategy into thin-wrapper + modular substrate
3. define journal contract for the inner loop
4. wire a Luca Assistant outer loop around those artifacts
5. produce one minimum compelling self-improving demo

This deprioritizes:
- broad generic “offline poker tool” positioning as the main public story
- event-style / showcase-night framing

And prioritizes:
- Agent AI
- self-improving loop
- readable strategy evolution
- persistent strategic machinery

---

## Open Questions for Next Execution Round

1. What should the first modular substrate layout be?
   - `strategy/`
   - `bot-system/`
   - hybrid?

2. Which strategy artifacts should be code vs data?
   - TS modules
   - markdown
   - JSON/YAML
   - contentbase-backed records

3. What exact input/output contract should the Luca Assistant use?
   - prompt shape
   - journal location
   - patch target conventions
   - experiment log conventions

4. How much persistence should be file-backed first vs Luca DB/content-backed first?

5. What is the minimum compelling self-improving demo we can produce fastest?

---

## Recommended next action

Next execution round should focus on:
- planning and then implementing the thin-wrapper refactor for `strategy.ts`
- simultaneously defining the inner-loop journal schema and the outer-loop Luca Assistant contract

That is the shortest path toward the actual public hook.