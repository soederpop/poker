# Public Roadshow Readiness Plan

> For Hermes: treat this as the top-level coordination document for getting the repo ready for public demos, local use, and iterative bot research.

Goal: make this repository compelling, reliable, and easy to use for three audiences: spectators, bot builders, and offline poker-analysis users.

Architecture:
- Keep one shared poker core and one shared CLI/binary surface.
- Prioritize a smooth local-first experience over hosted/cloud complexity.
- Stage work so the repo is demoable early, then harden packaging, docs, and learning workflows.

Tech Stack:
- Bun + TypeScript
- Luca runtime/container
- Rust/WASM poker evaluation path
- Standalone compiled binary (`dist/pokurr`)

---

## Success Criteria

A roadshow-ready version should let a new person do all of the following without hand-holding:

1. Install dependencies or download a binary.
2. Run offline analysis commands successfully.
3. Start a local server and watch games.
4. Scaffold a bot, edit `strategy.ts`, and run it locally.
5. Understand the product from the README in under 5 minutes.
6. See a clear path toward the regret-minimizer / self-improving bot vision.

## Product Pillars

### Pillar 1: Offline Poker Analysis
The project should be useful even for users who never run the server.

Core outcomes:
- `analyze equity`, `analyze range`, `analyze hand` feel polished and trustworthy
- situation docs are easy to create and simulate
- output is readable enough for hand review and study

### Pillar 2: Local Bot Arena
The project should be useful for people who want to write bots and run them locally.

Core outcomes:
- `serve`, `register`, `join`, `watch`, `new-agent`, and `types` work reliably
- docs clearly explain the local workflow
- house bots provide a fun and informative baseline ecosystem

### Pillar 3: Research / Self-Improving Bot Story
The project should demonstrate a novel learning loop.

Core outcomes:
- regret-tracking/journal pipeline exists in a usable form
- generated journals are legible and actionable
- strategy updates remain human-readable
- the story is demonstrable in a live roadshow

## Delivery Phases

### Phase 0: Positioning and Narrative
Purpose: make the project easy to explain.

Deliverables:
- sharpen README around three use cases:
  - offline analysis
  - local bot arena
  - self-improving bot research
- align command names and examples around `pokurr`
- create one canonical demo flow for live presentations
- create one canonical quickstart for technical users

Exit criteria:
- README reflects what the repo is now, not what it used to be
- a presenter can explain the repo in 60 seconds

### Phase 1: CLI and Binary Reliability
Purpose: ensure the public entrypoint is dependable.

Deliverables:
- verify standalone binary behavior for all core commands
- eliminate any project-root assumptions that break compiled mode
- confirm WASM/embedded assets load correctly
- test `new-agent`, `types`, `analyze`, `serve`, `join`, `watch` from the binary path
- add a release checklist for macOS/Linux

Exit criteria:
- core commands work from source and from compiled binary
- first-run failures produce clear messages and remediation hints

### Phase 2: Offline Analysis Productization
Purpose: make the repo valuable as a study tool.

Deliverables:
- improve `analyze` output formatting for terminal readability
- add examples for common study workflows
- expand `docs/situations/` with representative spots
- define conventions for reusable situation documents
- consider exportable summaries or markdown output for analysis sessions

Exit criteria:
- offline users can get value without learning the server runtime
- situation-driven workflows feel intentional, not incidental

### Phase 3: Bot Authoring Experience
Purpose: make local bot writing feel delightful.

Deliverables:
- ensure `new-agent` scaffold is clean and minimal
- ensure `types` generation is stable and documented
- tighten docs around `strategy.ts` globals and debugging
- add a “first winning bot” tutorial
- add a “how to test a bot against house actors” tutorial

Exit criteria:
- a new user can write a basic bot in under 30 minutes
- docs answer the common “what does decide() receive and return?” questions immediately

### Phase 4: Server + Spectator Polish
Purpose: make live demos impressive and robust.

Deliverables:
- stabilize local server startup flow
- polish spectator and leaderboard experience
- ensure house bots create interesting but understandable action
- create a repeatable tournament-night demo script
- verify table creation/admin flows

Exit criteria:
- live demo operator can start a compelling local arena quickly
- spectator output is legible and entertaining

### Phase 5: Regret-Minimizer MVP
Purpose: make the research story real.

Deliverables:
- bucket assignment
- regret tracking session runner
- markdown journal generation
- baseline strategy update loop
- one end-to-end demo where a strategy changes based on journal findings

Exit criteria:
- the repo can demonstrate “play -> analyze -> update strategy -> replay”
- journals are useful to a human reviewer, not just the agent

## Cross-Cutting Quality Gates

These should apply to every phase.

### Documentation
- README should match the current command surface
- top-level docs should clearly split user-facing docs from planning docs
- examples should use the same ports/naming conventions consistently

### Testing
- core engine tests remain green
- runtime integration tests cover the happy-path local workflow
- binary smoke tests exist for the most important commands

### Demo Safety
- commands should fail fast with actionable guidance
- demo flows should avoid surprise network dependencies
- default local workflows should be deterministic where possible

### Maintainability
- continue reducing oversized command/runtime files over time
- prefer small focused modules for new work
- keep public docs aligned with actual implementation

## Recommended Public Demo Scenarios

### Demo A: Offline Study Tool
- run `pokurr analyze equity`
- run `pokurr analyze range`
- run `pokurr analyze hand`
- run `pokurr sim --situation ...`
- show how situation docs become study assets

### Demo B: Bot Arena
- start local server
- seed or register bots
- join one custom bot and a few house bots
- show leaderboard and spectator views
- tweak strategy and rerun

### Demo C: Self-Improving Bot
- run a regret session
- inspect markdown journal
- make a readable strategy adjustment
- replay and compare outcomes

## Risks

### Risk: product story is fragmented
Mitigation:
- keep all docs organized around the three product pillars
- use one canonical language set throughout README and demos

### Risk: compiled binary differs from source workflow
Mitigation:
- maintain a dedicated binary smoke-test checklist
- document standalone-mode caveats explicitly

### Risk: regret-minimizer steals focus from core usability
Mitigation:
- treat it as a Phase 5 capstone, not a prerequisite for usefulness
- ensure offline analysis and local bot workflows are already strong first

## Recommended Immediate Next Steps

1. Rewrite/align README around the three product pillars.
2. Make a binary/source command verification matrix.
3. Expand docs for offline analysis and first-time bot authors.
4. Add a public-demo script/checklist.
5. Implement the regret-minimizer MVP only after the baseline product loops feel polished.
