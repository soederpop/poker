# Regret Minimizer Roadmap

> For Hermes: use this as the implementation and demo roadmap for the self-improving bot story.

Goal: ship a believable regret-minimizer MVP that produces useful journals and supports readable strategy iteration.

Architecture:
- Start with coarse bucketed regret tracking rather than full CFR.
- Make markdown journals the primary interface between the inner loop and the outer loop.
- Keep generated strategy behavior understandable to humans.

Tech Stack:
- existing game engine and strategy runtime
- situation docs and local server runtime
- markdown journals under `docs/` or a dedicated run output directory
- optional outer-loop agent automation later

---

## Product Story

The differentiator is not “we trained a poker bot somehow.”
The differentiator is:
- the bot plays real local games,
- it records where it is making mistakes,
- it writes down those mistakes in plain English,
- and the strategy improves as readable code.

That means the MVP should optimize for explainability and repeatability, not theoretical optimality.

## MVP Scope

The first public version should do exactly this:

1. Play a batch of hands against house bots.
2. Bucket each decision point into a coarse abstraction.
3. Estimate regret for legal alternatives.
4. Aggregate the biggest regret spots.
5. Write a markdown journal summarizing them.
6. Make it easy for a human or agent to update `strategy.ts` from the journal.

Not required for MVP:
- full CFR
- equilibrium claims
- sophisticated opponent modeling
- automatic strategy patching without review

## Proposed Deliverables

### Deliverable 1: Bucket Assignment
Use the existing plan in `docs/regret-minimizer-plan.md` as the source concept.

Needed outputs:
- preflop bucket key
- postflop bucket key
- optional board wetness/texture metadata
- optional position and facing-action metadata

MVP recommendation:
- keep the original 7 preflop buckets
- keep the 16 postflop made/draw buckets
- add only one or two extra dimensions if clearly justified

### Deliverable 2: Regret Session Runner
A local command should run a batch session.

Candidate interface:
- `pokurr regret run --hands 500 --profile tag --output docs/regret-journals/...`
- or a `sim` submode if that fits the current command surface better

Responsibilities:
- run many hands deterministically when seeded
- collect decision snapshots
- compute EV approximations per action
- aggregate regret totals by bucket/action

### Deliverable 3: Markdown Journal Writer
The journal is the user-facing artifact.

Each journal should include:
- session metadata
- opponents/configuration used
- top regret spots
- current action frequencies
- suggested strategy adjustments in plain language
- a short “what to test next” section

### Deliverable 4: Strategy Review Workflow
The repo needs a documented workflow for turning journals into code updates.

MVP workflow:
- review journal
- adjust `strategy.ts`
- rerun same or similar session
- compare whether targeted regret spots improved

Later workflow:
- agent-assisted patch generation with human review

## Recommended File Layout

Implementation candidates:
- `features/regret-tracker.ts`
- `features/regret-buckets.ts`
- `features/regret-journal.ts`
- `features/regret-session.ts`

Outputs:
- `docs/regret-journals/` for curated/shareable journals
- or `tmp/regret-journals/` for raw runs plus a curated docs subset

Recommendation:
- store raw outputs in `tmp/`
- promote especially useful journals/examples into `docs/`

## Command and UX Recommendations

### CLI
The command should feel intentionally separate from simple analysis.

Good properties:
- explicit hand count / iteration count
- explicit seed support
- explicit opponent/profile configuration
- explicit output path
- concise terminal summary plus detailed markdown report

### Terminal Summary
After a run, print:
- number of hands
- top 3 regret spots
- output path
- recommended next action

### Journal Format
Make the journal readable enough to show during a live demo without further cleanup.

## Validation Strategy

### Technical Validation
- same seed should produce repeatable results within expected tolerances
- journal generation should never crash due to a weird hand state
- regret aggregation should handle all legal action sets correctly

### Product Validation
A human reviewer should be able to answer:
- what was the bot doing wrong?
- in which spots?
- what should change in the strategy?
- how do we test whether the change helped?

If the journal does not answer those questions, the MVP is not good enough.

## Demo Sequence for Roadshow

1. Show baseline strategy playing local games.
2. Run a regret session.
3. Open the markdown journal.
4. Point to one or two obvious leaks.
5. Make a small readable strategy change.
6. Replay and compare.

The wow factor comes from legibility, not from claiming solver-level strength.

## Risks

### Risk: regret estimates feel too fake
Mitigation:
- present the system honestly as approximate regret-guided improvement
- keep examples concrete and intuitive
- focus on exploit leak detection, not game-theory optimality claims

### Risk: journals are noisy and not actionable
Mitigation:
- cap journal output to top issues
- include thresholds/minimum hand counts per bucket
- include plain-language recommendations, not just tables

### Risk: strategy updates become opaque or overfit
Mitigation:
- keep strategy rules readable
- require rationale comments or commit messages tied to journals
- compare across multiple sessions before declaring improvement

## Work Stages

### Stage 1: Internal MVP
- bucketing works
- session runner works
- raw markdown journals exist
- one local end-to-end loop is possible

### Stage 2: Usable Research Tool
- command UX polished
- journals easier to read
- docs explain interpretation
- examples included in repo

### Stage 3: Roadshow Feature
- live demo script prepared
- one polished before/after example ready
- strategy evolution story documented

## Dependencies on Baseline Product Quality

Do not let this roadmap replace core product hardening.
The regret-minimizer becomes more compelling when:
- offline analysis commands are already useful
- local arena workflows are already smooth
- bot authoring is already approachable

In other words: the learning loop should sit on top of a great local poker tool, not distract from building one.
