# Offline Analysis and Local Bot Product Plan

> For Hermes: use this plan when prioritizing end-user usability outside the research roadmap.

Goal: make `pokurr` independently useful as (1) an offline poker analysis tool and (2) a local-first bot development environment.

Architecture:
- Treat the CLI as the primary product surface.
- Keep the local server and bot-authoring workflow optional but first-class.
- Favor polished defaults and strong examples over broad feature count.

Tech Stack:
- Bun CLI
- standalone compiled binary
- local files for agent projects and situation docs
- local server/websocket runtime for bot testing

---

## User Personas

### Persona A: Offline Analyst
Wants to study hands, compare ranges, understand board textures, and run local sims.

Primary jobs:
- compute equity
- compare ranges
- evaluate a hand in context
- save/reuse situation docs

### Persona B: Bot Builder
Wants to scaffold a bot, edit one file, and play against local opponents.

Primary jobs:
- scaffold bot project
- understand available globals
- run locally against house bots
- iterate quickly with visible results

### Persona C: Demo User / Friend
Wants to try the binary quickly without understanding the whole codebase.

Primary jobs:
- download or clone
- run one command successfully fast
- see something cool immediately

## Product Surface to Harden

### 1. Core Analysis Commands
Commands:
- `pokurr analyze equity ...`
- `pokurr analyze range ...`
- `pokurr analyze hand ...`
- `pokurr sim --situation ...`

Desired qualities:
- readable terminal output
- obvious examples in help text and README
- consistent flags and terminology
- fast failure on malformed card/range inputs

Open questions:
- should analysis commands support `--json` for programmatic use?
- should `analyze hand` surface more strategy-oriented guidance?
- should simulations emit markdown reports to disk?

### 2. Situation Documents
Purpose:
- create a reusable format for analysis spots and teaching material

Desired qualities:
- simple frontmatter schema
- easy to hand-author
- usable by `sim` and future regret tools
- examples for common training spots

Needed work:
- define a canonical schema in docs
- add at least 8-12 example situations across preflop/flop/turn/river
- document naming conventions and folder usage

### 3. New-Agent Scaffold
Commands:
- `pokurr new-agent my-bot`
- `pokurr types`

Desired qualities:
- generated folder is tiny and comprehensible
- README inside scaffold is excellent
- `strategy.ts` starts with a minimal but sane baseline
- no confusing extra files

Needed work:
- review scaffold contents from a first-time-user perspective
- ensure generated comments explain only what matters
- add one “debugging your first bot” section to scaffold README

### 4. Local Arena Loop
Commands:
- `pokurr serve`
- `pokurr register`
- `pokurr join`
- `pokurr watch`

Desired qualities:
- one-page quickstart
- predictable local ports
- useful error messages when server is absent or token is invalid
- spectator flow feels alive and easy to understand

Needed work:
- make the local loop the centerpiece of one tutorial
- verify defaults are good for single-machine usage
- ensure house actors create educational game dynamics

## Documentation Plan

### Must-Have Docs
1. `README.md`
   - what this project is
   - three fastest ways to use it
   - install/run instructions
   - links to deeper docs

2. `docs/writing-a-bot.md`
   - tighten for new-user onboarding
   - add a 15-minute quickstart path

3. `docs/strategy-globals-api.md`
   - keep as reference, not tutorial
   - ensure it matches actual `DecisionContext`

4. `docs/hosting-a-server.md`
   - keep focused on operators
   - avoid duplicating bot-authoring content

5. new doc to add later: `docs/offline-analysis.md`
   - task-oriented study workflows
   - hand/range/situation examples

### Documentation Principle
Tutorial docs should be narrative and minimal.
Reference docs should be exhaustive.
Do not mix them unless necessary.

## UX Improvements to Prioritize

### Analysis UX
- suit rendering and board formatting should be consistently readable
- percentages and EV-style numbers should be clearly labeled
- output should support both “quick glance” and “deeper interpretation” modes

### Bot UX
- house profiles should have memorable descriptions
- first bot scaffold should encourage small safe edits
- illegal action fallback behavior should be documented clearly

### Demo UX
- every major command should have a copy-pasteable example
- error output should suggest the next likely fix
- default local flow should not require users to know Luca internals

## Candidate Milestones

### Milestone A: First-Time User Success
Definition:
- a fresh user can clone/install and run 3 successful commands in under 10 minutes

Checklist:
- one offline analysis command
- one local server command
- one bot scaffold command

### Milestone B: First Bot Success
Definition:
- a fresh user can create, run, and observe a bot locally in under 30 minutes

Checklist:
- scaffold bot
- register bot
- join table
- watch a hand
- make one change and rerun

### Milestone C: Shareable Binary Success
Definition:
- a non-developer can use the compiled binary for basic analysis and local demo flows

Checklist:
- binary install instructions
- binary help text polished
- smoke-tested commands from standalone mode

## Suggested Work Order

1. README repositioning
2. command help/output polish for analysis flows
3. new user bot tutorial improvements
4. situation doc conventions and more examples
5. local arena quickstart and smoke testing
6. binary distribution/readiness pass

## Acceptance Criteria

This plan is successful when:
- people can use the project before understanding the research roadmap
- the repo is obviously useful as a tool, not just a prototype
- bot-writing feels approachable rather than intimidating
- local demos work consistently from a clean machine
