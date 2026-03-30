# Luca framework suggestions for `features/*`

## Bottom line

Current status:

- `strategy.ts`: real Luca feature, mostly valid
- `game-engine.ts`: real Luca feature, mostly valid
- `table-manager.ts`: real Luca feature, mostly valid
- `actor.ts`: **not** a Luca feature and should not be in `features/`

Primary recommendation:

1. Keep `strategy`, `game-engine`, and `table-manager` as features.
2. Move `actor.ts` to `lib/` or `src/domain/`.
3. Make feature files thinner and push pure poker logic into `lib/`.
4. Improve feature state, event naming, and lifecycle hooks.

---

## What a proper Luca feature should do

A proper Luca feature here should:

- extend `Feature<State, Options>`
- define `description`, `stateSchema`, and `optionsSchema`
- register with `features.register(...)`
- expose a clear public API
- use `afterInitialize()` for bootstrap work when needed
- emit meaningful events
- keep container concerns in the feature and pure logic outside it

Rule of thumb:

- if it needs container lifecycle/state/config/shared access, it can be a feature
- if it is just a reusable class or algorithm, it should live outside `features/`

---

## `features/actor.ts`

### Assessment

This is not a Luca feature. It is a plain domain/service class.

### Why

It:

- does not extend `Feature`
- does not register with Luca
- has no feature schemas
- is instantiated per player/game
- behaves like a helper object, not a shared container capability

### Recommendation

Move it to one of:

- `lib/actor.ts`
- `src/domain/actor.ts`
- `src/services/actor.ts`

If you want a Luca-native wrapper, add a separate feature like `actorFactory`, `decisionEngine`, or `botRuntime` that creates/uses `Actor` instances.

### Priority

Highest priority. This is the clearest structural mismatch.

---

## `features/strategy.ts`

### Assessment

This is already a proper Luca feature structurally.

### Good

- extends `Feature`
- has schemas and description
- registers correctly
- has a coherent API

### Problems

- too much poker decision logic lives directly in the feature class
- state is very thin
- container integration uses weak typing (`as any` around conversation access)
- no strong event model

### Recommendation

Refactor toward:

- `features/strategy.ts` → Luca wrapper
- `lib/strategy-engine.ts` → orchestration
- `lib/strategy-rules/*` → decision rules
- `lib/strategy-llm.ts` → LLM fallback adapter

Add feature state like:

- `decisionCount`
- `lastDecision`
- `lastProfileUsed`
- `lastEquityEstimate`
- `llmFallbackCount`

Emit events like:

- `strategy:decisionStarted`
- `strategy:decisionCompleted`
- `strategy:equityEstimated`
- `strategy:llmFallback`

### Goal

Keep it as a feature, but make it a thinner and more observable Luca feature.

---

## `features/game-engine.ts`

### Assessment

This is a valid Luca feature, but it is mixing pure game engine logic with Luca runtime/persistence concerns.

### Good

- proper feature subclass
- meaningful state (`game`)
- useful description
- event emission exists
- uses Luca dependencies like `diskCache`

### Problems

The file mixes too many concerns:

- domain types
- selectors/helpers
- state machine transitions
- payout logic
- persistence
- feature methods

This hurts separability and testability.

### Recommendation

Refactor toward:

- `features/game-engine.ts` → Luca wrapper/orchestrator
- `lib/game-engine/state-machine.ts`
- `lib/game-engine/payouts.ts`
- `lib/game-engine/selectors.ts`
- `lib/game-engine/types.ts`
- `lib/game-engine/history-store.ts`

Improve events with names like:

- `game:reset`
- `game:dealt`
- `game:action`
- `game:streetAdvanced`
- `game:completed`
- `game:historySaved`

Potential extra state:

- `lastEvent`
- `lastCompletedHandId`
- `historySaveCount`
- `isDirty`

### Goal

Keep it as a feature, but move the actual poker engine into pure modules.

---

## `features/table-manager.ts`

### Assessment

This is a proper Luca feature structurally, but it should be tightened up.

### Good

- proper feature subclass
- good fit for shared state
- clear API and responsibility

### Problems

Most important issue:

```ts
tables: z.array(z.any()).default([])
```

That is too loose for Luca feature state.

Also:

- default seeding behavior is not tied cleanly to lifecycle
- event naming is a bit ad hoc

### Recommendation

- replace `z.any()` with full `zod` schemas for table/player state
- use `afterInitialize()` if default table seeding is intended
- consider options like `seedDefaultTables` and `defaultTables`
- use namespaced events:
  - `table:created`
  - `table:updated`
  - `table:joined`
  - `table:left`
  - `table:statusChanged`

### Goal

Make it a strongly typed, observable registry feature.

---

## Cross-cutting refactor suggestions

### 1. Keep feature files thin

Feature classes should mostly do:

- options/state definition
- dependency wiring
- lifecycle
- event emission
- persistence/integration boundaries

Pure poker logic should mostly live in `lib/`.

### 2. Standardize event naming

Prefer namespaced events:

- `strategy:*`
- `game:*`
- `table:*`

### 3. Improve schemas

Use real `zod` schemas for nested state instead of `z.any()`.

### 4. Use lifecycle explicitly

If a feature should bootstrap or seed data, use `afterInitialize()` rather than leaving it as an optional manual method.

### 5. Localize container dependencies

Avoid spreading container-specific access patterns through domain logic. Wrap them behind small feature methods.

---

## Suggested implementation order

1. Move `features/actor.ts` out of `features/`
2. Add strong schemas to `table-manager`
3. Add event naming cleanup across all three real features
4. Extract pure modules from `game-engine`
5. Extract pure modules from `strategy`
6. Add richer observable state where useful

---

## Final recommendation

The repo is closer to Luca-idiomatic than it may look at first glance. The real issue is not that most of these are invalid features; it is that two of them are **feature + domain engine hybrids**, and one file (`actor.ts`) is simply **not a feature**.

If you do only one thing: **move `actor.ts` out of `features/`**.

If you do the full cleanup: keep the real features, thin them aggressively, and move pure poker logic into `lib/`.