# Regret Minimizer First Slice

> For Hermes: use this plan to turn `docs/regret-minimizer-plan.md` into the first working implementation slice. Keep the first version small, inspectable, and local-only.

Goal: implement the smallest useful regret-minimizer loop that can play hands, bucket decisions, accumulate coarse regret, and write readable journals for an outer-loop coding assistant.

Architecture: start with a local, auditable pipeline rather than a full CFR system. The inner loop should produce transparent markdown and JSON artifacts that a future Luca assistant can inspect and convert into strategy edits.

Tech stack: TypeScript, existing poker strategy/equity helpers, local file output under `docs/` or a dedicated runtime data directory, house-bot self-play or fixed-opponent sessions.

---

## Source document to follow

Primary design reference:
- `docs/regret-minimizer-plan.md`

That document already defines:
- coarse preflop and postflop buckets
- an EV-approximation approach instead of full CFR
- the journal-driven interface between inner and outer loops

This handoff is about the first executable slice, not the whole roadmap.

---

## First-slice scope boundary

In scope:
- bucket assignment
- regret table data structure
- simple action abstraction
- session runner for repeated hands against a chosen opponent
- markdown journal output
- JSON persistence for the regret table

Out of scope for the first slice:
- full outer-loop code editing
- multi-opponent abstraction
- complex opponent modeling
- sophisticated fold-equity estimation
- database integration
- fully autonomous self-rewriting agents

The first deliverable should be something you can run locally, inspect, and iterate on.

---

## Proposed file layout

Create these files if they do not already exist:
- `features/regret-tracker.ts`
- `features/regret-journal.ts`
- `features/regret-session.ts`
- `docs/regret-journals/.gitkeep` or first real session output file
- optionally `data/regret/` for JSON snapshots if runtime output should not live in `docs/`

Potential command surface later:
- add a dedicated CLI entry after the core library pieces work
- examples:
  - `luca poker regret run --vs balanced --hands 500`
  - `luca poker regret summarize`

Do not add the command until the underlying modules are stable enough to exercise directly.

---

## Task 1: Implement bucket assignment as a pure module

Objective: create one small, testable module that classifies a decision point into the coarse buckets described in `docs/regret-minimizer-plan.md`.

Files:
- Create: `features/regret-tracker.ts`
- Optional test target: add or extend a nearby focused test file if an obvious home exists

Minimum API to expose:
- `preflopTier(heroCards: string[]): number`
- `assignBucket(input): { street: string; key: string; made: number; draw: number }`

Expected input shape:
- hero cards
- board cards
- street
- maybe position later, but not required for v1 bucket identity

Rules for v1:
- use the exact coarse bucket rules from `docs/regret-minimizer-plan.md`
- keep the returned `key` stable and string-based, e.g.:
  - `preflop:3`
  - `flop:2:1`
  - `turn:0:2`

Success criteria:
- bucket assignment is deterministic and side-effect free
- the key format is simple enough to use directly in a JSON object

---

## Task 2: Define the regret table and action abstraction

Objective: represent regret in a coarse but inspectable structure.

Files:
- Modify/Create: `features/regret-tracker.ts`

V1 action abstraction:
- `fold`
- `check`
- `call`
- `bet_small`
- `bet_medium`
- `bet_large`
- `raise`

Recommended exported types:
- `type RegretAction = ...`
- `type RegretBucketEntry = { fold: number; check: number; call: number; bet_small: number; bet_medium: number; bet_large: number; raise: number; handCount: number }`
- `type RegretTable = Record<string, RegretBucketEntry>`

Required helpers:
- `createEmptyBucketEntry()`
- `getOrCreateBucket(table, key)`
- `normalizeAction(decisionContext, actualAction, amount)` that maps real game actions into the coarse action vocabulary

Success criteria:
- every decision can be recorded under a stable bucket key and coarse action name
- the JSON shape is obvious to inspect by eye

---

## Task 3: Add a simple EV approximation helper

Objective: estimate a relative regret signal without building a full game tree.

Files:
- Modify: `features/regret-tracker.ts`

V1 formula guidance:
- follow the formulas in `docs/regret-minimizer-plan.md`
- use simple heuristics rather than perfect modeling
- it is acceptable for v1 to estimate fold equity from bet size buckets and street

Suggested exported helper:
- `estimateActionEV(context, coarseAction): number`

Suggested context fields:
- bucket key or bucket metadata
- available actions
- pot size
- to call
- effective stack
- estimated equity
- street

Important v1 simplification:
- if a coarse action is illegal in the current spot, return `-Infinity` or skip it
- pick the legal action with the highest estimated EV as the benchmark
- regret increment for chosen action = `bestEV - chosenEV`

Success criteria:
- the helper works entirely from local context
- the regret update path does not need opponent-tree traversal

---

## Task 4: Record decision events during a session

Objective: create a session runner that can observe decisions, compute regret, and accumulate entries over many hands.

Files:
- Create: `features/regret-session.ts`
- Reuse existing poker client / strategy plumbing where practical

V1 session requirements:
- run hero vs one chosen house-bot profile
- collect decision points only for the hero seat
- for each decision point capture:
  - hero cards
  - board
  - street
  - pot / toCall / stack
  - available actions
  - chosen action and amount
  - estimated equity
  - bucket key
  - coarse mapped action
- update the regret table immediately or after each hand

Important product decision:
- this can start as a library-runner called from a small script instead of a public command
- the first version does not need to be user-friendly; it needs to be inspectable and correct enough to learn from

Success criteria:
- after N hands, there is a populated in-memory regret table and a list of observed decision events

---

## Task 5: Persist JSON snapshots and write markdown journals

Objective: turn the session output into human-readable artifacts for the outer loop.

Files:
- Create: `features/regret-journal.ts`
- Write output under either:
  - `docs/regret-journals/`
  - or a dedicated runtime data directory plus a docs summary file

Required artifacts for v1:
1. JSON snapshot
   - raw regret table
   - summary counts
   - maybe top buckets by regret magnitude
2. Markdown journal
   - session metadata
   - top regret spots
   - current action mix summaries if available
   - recommended next changes in plain English

Suggested markdown structure:
- session header with timestamp and hand count
- top 5 regret spots
- buckets with highest action regret deltas
- plain-English recommendations
- open questions / caveats

Success criteria:
- a human can read the journal and immediately see what the bot is probably doing wrong
- the artifacts are stable enough for a future assistant to parse

---

## Task 6: Run a tiny local session before adding more machinery

Objective: prove the loop works on a small sample before expanding the system.

Suggested first run targets:
- 50 hands vs `balanced`
- then 200 hands vs `balanced`
- only after that, try multiple profiles

What to verify:
- no crashes during repeated hands
- bucket keys look sane
- regret table is non-empty
- journal output names the same kinds of situations described in the roadmap
- recommendations are at least directionally believable

Do not optimize yet for:
- speed at huge hand counts
- perfect EV accuracy
- automatic strategy rewriting

Success criteria:
- one complete local run produces inspectable JSON + markdown artifacts

---

## Recommended next-session order

1. Build bucket assignment in `features/regret-tracker.ts`.
2. Add the regret table shape and coarse action mapping.
3. Add EV approximation and regret-update helpers.
4. Build `features/regret-session.ts` for a small local run.
5. Build `features/regret-journal.ts` and write the first artifacts.
6. Run a 50-hand session and inspect the output manually.
7. Only then decide whether to add a CLI command or outer-loop integration.

---

## Definition of done for the first slice

This slice is done when all of these are true:
- a local runner can play repeated hands against one opponent profile
- hero decision points are bucketed into stable keys
- a regret table is accumulated in memory and persisted to JSON
- a markdown journal is produced after the run
- the journal gives concrete, human-readable strategic recommendations

That is enough to unlock the next phase: the Luca assistant / outer loop that reads journals and proposes strategy code edits.
