---
title: Creating Custom Features
tags: [features, custom, extend, zod, state, events, module-augmentation, helper]
---

# Creating Custom Features

You can create your own features to encapsulate domain logic, then register them so they're available through `container.feature('yourFeature')` with full type safety.

## Anatomy of a Feature

A feature has:
- **State** -- observable, defined by a Zod schema
- **Options** -- configuration passed at creation, defined by a Zod schema
- **Events** -- typed event bus
- **Methods** -- your domain logic
- **Access to the container** -- via `this.container`

## Basic Example

```typescript
import { z } from 'zod'
import { Feature, features, FeatureStateSchema, FeatureOptionsSchema } from '@soederpop/luca'

// Define state schema by extending the base FeatureStateSchema
export const CounterStateSchema = FeatureStateSchema.extend({
  count: z.number().describe('Current count value'),
  lastUpdated: z.string().optional().describe('ISO timestamp of last update'),
})
export type CounterState = z.infer<typeof CounterStateSchema>

// Define options schema by extending the base FeatureOptionsSchema
export const CounterOptionsSchema = FeatureOptionsSchema.extend({
  initialCount: z.number().default(0).describe('Starting count value'),
  step: z.number().default(1).describe('Increment step size'),
})
export type CounterOptions = z.infer<typeof CounterOptionsSchema>

/**
 * A simple counter feature that demonstrates the feature pattern.
 * Tracks a count value with observable state and events.
 */
export class Counter extends Feature<CounterState, CounterOptions> {
  static override stateSchema = CounterStateSchema
  static override optionsSchema = CounterOptionsSchema

  /** Called when the feature is created */
  async initialize() {
    this.state.set('count', this.options.initialCount ?? 0)
  }

  /** Increment the counter by the configured step */
  increment() {
    const current = this.state.get('count') || 0
    const next = current + (this.options.step ?? 1)
    this.state.set('count', next)
    this.state.set('lastUpdated', new Date().toISOString())
    this.emit('incremented', next)
    return next
  }

  /** Decrement the counter by the configured step */
  decrement() {
    const current = this.state.get('count') || 0
    const next = current - (this.options.step ?? 1)
    this.state.set('count', next)
    this.state.set('lastUpdated', new Date().toISOString())
    this.emit('decremented', next)
    return next
  }

  /** Reset the counter to its initial value */
  reset() {
    this.state.set('count', this.options.initialCount ?? 0)
    this.emit('reset')
  }

  /** Get the current count */
  get value(): number {
    return this.state.get('count') || 0
  }
}

// Register the feature
features.register('counter', Counter)

// Module augmentation for type safety
declare module '@soederpop/luca' {
  interface AvailableFeatures {
    counter: typeof Counter
  }
}
```

## Using Your Feature

```typescript
import './features/counter' // Side-effect import to register

const counter = container.feature('counter', { initialCount: 10, step: 5 })

counter.on('incremented', (value) => {
  console.log(`Count is now ${value}`)
})

counter.increment()  // 15
counter.increment()  // 20
counter.value        // 20
counter.reset()      // Back to 10

// Observe state changes
counter.state.observe((type, key, value) => {
  console.log(`${key} ${type}d:`, value)
})
```

## Enabling on the Container

If your feature should be a container-level singleton with a shortcut:

```typescript
export class Counter extends Feature<CounterState, CounterOptions> {
  // This creates the container.counter shortcut when enabled
  static override shortcut = 'features.counter' as const
  // ...
}

// Enable it
container.feature('counter', { enable: true })

// Now accessible as:
container.counter.increment()
```

## Feature with Container Access

Features can access other features and the full container:

```typescript
export class Analytics extends Feature<AnalyticsState, AnalyticsOptions> {
  /** Log an event, writing to disk cache for persistence */
  async logEvent(name: string, data: Record<string, any>) {
    const cache = this.container.feature('diskCache', { path: './.analytics' })
    const timestamp = new Date().toISOString()

    await cache.set(`event:${timestamp}`, { name, data, timestamp })

    this.state.set('totalEvents', (this.state.get('totalEvents') || 0) + 1)
    this.emit('eventLogged', { name, data })
  }

  /** Get recent events from the cache */
  async recentEvents(limit = 10) {
    const fs = this.container.fs
    // ... read from cache directory
  }
}
```

## Documenting Your Feature

Document your classes, methods, and getters with JSDoc. This is important because Luca's introspection system extracts these docs and makes them available at runtime:

```typescript
/**
 * Manages user sessions with automatic expiration and renewal.
 * Sessions are persisted to disk and can survive process restarts.
 */
export class SessionManager extends Feature<SessionState, SessionOptions> {
  /**
   * Create a new session for the given user.
   * Returns a session token that can be used for authentication.
   */
  async createSession(userId: string): Promise<string> {
    // ...
  }

  /** The number of currently active sessions */
  get activeCount(): number {
    return this.state.get('sessions')?.length || 0
  }
}
```

Then anyone (human or AI) can discover your feature:

```typescript
container.features.describe('sessionManager')
// Returns the full markdown documentation extracted from your JSDoc

// Quick discovery — list available methods and getters
const session = container.feature('sessionManager')
session.$methods  // => ['createSession', ...]
session.$getters  // => ['activeCount', ...]
```

## Best Practices

1. **Use Zod `.describe()` on schema fields** -- these descriptions appear in introspection and help documentation
2. **Emit events for significant actions** -- enables reactive patterns and decoupled observers
3. **Use state for observable values** -- don't hide important state in private variables if consumers need to watch it
4. **Access the container, not imports** -- prefer `this.container.feature('fs')` over importing fs directly, so the feature works in any container
5. **Document everything** -- JSDoc on the class, methods, and getters feeds the introspection system
