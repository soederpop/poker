# Pokurr Plan Stack and Execution Order

> For Hermes: use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** turn the existing roadmap docs into one actionable execution sequence that gets `luca-poker` demo-ready without losing the longer-term regret-minimizer story.

**Architecture:** treat the work as three stacked product pillars that already exist in planning docs: offline analysis, local bot arena, and self-improving bot research. Execute them in that order so the research loop lands on top of a polished, reliable local product. Keep the public surface centered on the CLI/binary in `commands/poker.ts` and `src/cli.ts`, with docs and smoke tests moving in lockstep.

**Tech Stack:** Bun + TypeScript CLI, Luca container/runtime, Rust/WASM evaluator, local server runtime, Bun test suite, markdown docs.

---

## Current context / assumptions

Relevant existing planning docs:
- `docs/planning/2026-03-28-public-roadshow-readiness.md`
- `docs/planning/2026-03-28-offline-analysis-and-local-bot-product.md`
- `docs/planning/2026-03-28-regret-minimizer-roadmap.md`
- `docs/regret-minimizer-plan.md`

Observed repo facts:
- Main user-facing command surface lives in `commands/poker.ts`.
- Standalone binary entrypoint is `src/cli.ts`.
- Core runtime coverage already exists in `test/integration/runtime.test.ts` and engine tests under `test/`.
- Top-level docs already exist for README, hosting, bot writing, websocket flow, and demo walkthroughs.
- There is no implemented regret/journal/bucket code yet.
- `commands/poker.ts` is large and is likely to be the main pressure point for product polish work.

Planning principle:
- Do not start the regret-minimizer MVP until the source and compiled command flows are clearly reliable.

---

## Proposed approach

Work in 4 execution waves:

1. Narrative and command-surface alignment
2. Reliability and smoke-test hardening
3. Docs and first-time-user polish
4. Regret-minimizer MVP

Each wave should finish with:
- updated docs/examples
- explicit validation commands
- at least one test or smoke-test artifact proving the behavior

---

## Delivery map

### Wave 1: Reposition the repo around 3 pillars

**Outcome:** a new visitor immediately understands the project as:
- offline poker analysis tool
- local bot arena
- self-improving bot research platform

**Files likely to change:**
- Modify: `README.md`
- Modify: `DEMO.md`
- Modify: `docs/writing-a-bot.md`
- Modify: `docs/hosting-a-server.md`
- Possibly modify: `commands/poker.ts` help/usage text near `printUsage()`

**Tasks:**
1. Rewrite `README.md` opening section around the three pillars.
2. Replace legacy/ambiguous wording with one canonical command vocabulary: prefer `pokurr` for binary-facing docs and clearly note `luca poker` source-mode equivalents.
3. Add three copy-pasteable “fastest success” flows:
   - analysis
   - local arena
   - self-improving bot story preview
4. Tighten `DEMO.md` into one canonical operator script.
5. Make sure help text in `commands/poker.ts` matches docs examples exactly.

**Validation:**
- Read-through test: a new user should understand the repo in under 5 minutes.
- Manual spot-check that every command shown in `README.md` exists in `printUsage()` or the actual command handler.

---

### Wave 2: Source/binary reliability matrix

**Outcome:** the compiled binary and source mode behave the same for core flows, or differences are explicitly documented.

**Files likely to change:**
- Modify: `src/cli.ts`
- Modify: `commands/poker.ts`
- Modify: `container.ts`
- Create: `docs/release-checklist.md` or `docs/binary-smoke-tests.md`
- Create or modify tests under `test/` for command/runtime coverage

**Primary risks to eliminate:**
- project-root assumptions in compiled mode
- missing embedded assets/WASM in standalone runs
- `new-agent` scaffold path confusion between standalone and project mode
- unclear first-run errors

**Tasks:**
1. Create a command verification matrix for these commands in both source and binary mode:
   - `analyze equity`
   - `analyze range`
   - `analyze hand`
   - `sim --situation ...`
   - `new-agent`
   - `types`
   - `serve`
   - `register`
   - `join`
   - `watch`
2. Identify which behaviors can be covered by Bun tests versus manual smoke tests.
3. Add or extend tests for command-mode assumptions where feasible.
4. Improve error messages for missing files, invalid agent paths, invalid tokens, and absent local server.
5. Add a release/smoke-test checklist for macOS/Linux.

**Likely test targets:**
- `bun test test/integration/runtime.test.ts`
- `bun test test/actor.test.ts`
- `bun test test/game-engine.test.ts`
- `bun run test`
- binary smoke tests using `bun run compile` then running `./dist/pokurr ...`

**Definition of done:**
- a human can run a short matrix and record pass/fail without reading source code
- first-run failures suggest the next likely fix

---

### Wave 3: Offline analysis + first-bot product polish

**Outcome:** the project is independently valuable even before the regret-minimizer lands.

**Files likely to change:**
- Modify: `commands/poker.ts`
- Modify: `docs/writing-a-bot.md`
- Modify: `docs/strategy-globals-api.md`
- Create: `docs/offline-analysis.md`
- Modify/Create: `docs/situations/*`
- Possibly modify scaffold-generating sections in `commands/poker.ts` around:
  - `newAgentReadmeContent()`
  - generated `strategy.ts`
  - generated `types/pokurr.d.ts`

**Tasks:**
1. Polish terminal output for `analyze` commands so results are easy to scan.
2. Add one dedicated offline-analysis doc with study workflows.
3. Expand `docs/situations/` with representative training spots across streets.
4. Audit `new-agent` scaffold from a first-time-user perspective.
5. Improve scaffold README quickstart and debugging guidance.
6. Add a short “first winning bot” tutorial.

**Validation:**
- A fresh user can successfully do the following in under 30 minutes:
  1. run one analysis command
  2. scaffold a bot
  3. register it
  4. join a table
  5. watch at least one hand
  6. make one safe `strategy.ts` edit and rerun

**Suggested test additions:**
- scaffold-generation assertions if not already covered
- integration checks for register/join/watch happy path
- snapshot-like tests for stable output fragments if practical

---

### Wave 4: Regret-minimizer MVP

**Outcome:** the repo can demonstrate `play -> analyze -> update strategy -> replay` with readable journals.

**Files likely to create:**
- Create: `features/regret-buckets.ts`
- Create: `features/regret-tracker.ts`
- Create: `features/regret-journal.ts`
- Create: `features/regret-session.ts`
- Modify: `commands/poker.ts`
- Create: `test/regret-buckets.test.ts`
- Create: `test/regret-tracker.test.ts`
- Create: `test/regret-session.test.ts`
- Create: `docs/regret-journals/README.md`
- Create: `tmp/regret-journals/` runtime output path handling

**Recommended command surface:**
- prefer a dedicated command instead of hiding this under generic sim flows
- candidate: `pokurr regret run --hands 500 --profile tag --seed 42 --output tmp/regret-journals/session.md`

**Tasks:**
1. Implement preflop and postflop bucket assignment from `docs/regret-minimizer-plan.md`.
2. Add legal-action normalization and regret-table aggregation.
3. Implement simple EV approximation heuristics per legal action.
4. Write markdown journal output focused on top regret spots.
5. Add terminal summary after each run.
6. Document the human review loop for editing `strategy.ts` from journal findings.
7. Prepare one polished before/after example for demos.

**Validation:**
- same seed yields repeatable top-level outputs within expected tolerance
- journal generation survives unusual game states
- journal answers:
  - what was the bot doing wrong?
  - where?
  - what should change?
  - how do we test the change?

---

## Exact near-term execution order

If starting immediately, do the next 10 tasks in this order:

1. Rewrite `README.md` around the 3 pillars.
2. Align `commands/poker.ts` usage examples with README command wording.
3. Tighten `DEMO.md` into the canonical live-demo flow.
4. Create a binary/source verification checklist doc.
5. Run the verification matrix and record failures.
6. Fix the highest-value binary/source mismatch.
7. Audit and improve `new-agent` generated README and starter strategy comments.
8. Create `docs/offline-analysis.md`.
9. Add more representative situation docs under `docs/situations/`.
10. Only then begin `features/regret-buckets.ts` and its tests.

---

## Tests / verification commands

Core suite:
```bash
bun run test
```

Focused runtime suite:
```bash
bun test test/integration/runtime.test.ts
```

Core rules suite:
```bash
bun test test/game-engine.test.ts
bun test test/actor.test.ts
```

Compiled binary smoke path:
```bash
bun run compile
./dist/pokurr analyze equity AhKd QsQc --iterations 5000
./dist/pokurr analyze hand AhQh --board Kh7d2h5h --potSize 42 --toCall 14
./dist/pokurr new-agent smoke-bot tag
```

Manual local arena smoke path:
```bash
./dist/pokurr serve --host 127.0.0.1 --port 3000 --seedLobby true
./dist/pokurr register http://127.0.0.1:3000 --name smoke-bot
./dist/pokurr join ws://127.0.0.1:3001 --token <token> --agent ./smoke-bot
./dist/pokurr watch ws://127.0.0.1:3002
```

---

## Risks / tradeoffs

1. `commands/poker.ts` is already very large.
   - Mitigation: as polish work proceeds, extract helpers/modules instead of adding more branching inline.

2. Docs can drift from actual behavior.
   - Mitigation: every doc edit should pair with a smoke-test command list.

3. The regret-minimizer could consume attention before the baseline product is lovable.
   - Mitigation: treat it as Wave 4, not Wave 1.

4. Binary/source parity may expose hidden container/path assumptions.
   - Mitigation: explicitly test both paths before adding major new features.

---

## Open questions

1. Should `analyze` commands support `--json` before roadshow polish, or is that post-MVP?
2. Should regret sessions live under `regret run` or under `sim` as a specialized mode?
3. Do we want curated journal examples committed in `docs/regret-journals/`, or only generated under `tmp/` until the format stabilizes?
4. Should compiled-binary release docs target only macOS first, or macOS + Linux together?

---

## Recommended next move

Start with Wave 1 immediately: README/help/demo alignment. That gives the fastest visible improvement, de-risks public explanation, and creates a clean baseline before reliability and feature work.