# Self-Improving Bot Milestones

Purpose:
Translate the agreed architecture into concrete milestones for future implementation.

---

## Milestone 1: Stable Baseline Boundary

Goal:
Keep the current runtime stable while preparing for modular growth.

Deliverables:
- `strategy.ts` remains the single runtime entrypoint
- command/runtime flows remain usable
- docs explain that `strategy.ts` is the boundary, not the whole future system

Success check:
- bot still joins and plays through the same runtime contract

---

## Milestone 2: Thin Wrapper Strategy Entry

Goal:
Make `strategy.ts` a wrapper over modular internals.

Deliverables:
- introduce a modular strategy folder
- move logic out of `strategy.ts`
- `strategy.ts` delegates to a coordinator

Success check:
- strategy internals are now split into named components
- runtime still only needs `strategy.ts`

---

## Milestone 3: Inner-Loop Journal Contract

Goal:
Create a reliable learning artifact for the outer loop.

Deliverables:
- markdown journal schema
- optional JSON schema for machine use
- sample journal(s)
- explicit fields for leak spot, regret signal, and suggested change

Success check:
- assistant can consume a journal without guessing structure

---

## Milestone 4: Luca Assistant Outer Loop

Goal:
Use a Luca Assistant as the system that reads journals and updates strategy artifacts.

Deliverables:
- assistant workflow definition
- loaded skills / SKILLS.md conventions
- strategy API input references
- bounded patch targets

Success check:
- assistant can take one journal and produce one readable strategy improvement proposal

---

## Milestone 5: End-to-End Before/After Demo

Goal:
Demonstrate the public hook.

Demo flow:
1. run baseline strategy
2. run regret session
3. inspect journal
4. assistant updates strategy substrate
5. rerun evaluation
6. compare before/after

Success check:
- one compelling example exists and is legible

---

## Milestone 6: Persistent Strategy Memory

Goal:
Use Luca machinery to preserve strategic knowledge beyond one run or one file.

Candidate artifacts to persist:
- experiment history
- promoted heuristics
- prior journals
- strategy lineage
- successful/failed patches

Success check:
- the system can improve across sessions without relying on a single monolithic file

---

## Recommended implementation order

1. stable baseline boundary
2. thin wrapper refactor
3. journal contract
4. Luca Assistant outer loop
5. end-to-end before/after demo
6. persistence and scaling

---

## What not to optimize for first

Do not spend the next major effort on:
- generic offline analysis marketing
- broad public positioning for the CLI alone
- event/showcase-night operator framing

Those are secondary to the actual hook:
- Agent AI + self-improving bot loop