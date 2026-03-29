---
title: State and Events
tags: [state, events, observable, reactive, bus, emit, on, once, waitFor]
---

# State and Events

Every container and helper in Luca has observable state and a typed event bus. These are the core primitives for building reactive applications.

## Observable State

State is a key-value store that notifies observers when values change.

### Basic Usage

```typescript
// Every helper has state
const feature = container.feature('myFeature')

feature.state.set('loading', true)
feature.state.get('loading')      // true
feature.state.current              // Snapshot: { loading: true, ... }
feature.state.version              // Number, increments on every change
```

### Observing Changes

```typescript
// Watch all state changes
const dispose = feature.state.observe((changeType, key, value) => {
  // changeType: 'add' | 'update' | 'delete'
  console.log(`${key} was ${changeType}d:`, value)
})

// Later, stop observing
dispose()
```

### Container State

The container itself tracks important state:

```typescript
container.state.get('started')           // boolean
container.state.get('enabledFeatures')   // string[]
container.state.get('registries')        // string[]
```

### State in Custom Features

Define your feature's state shape with a Zod schema:

```typescript
const TaskStateSchema = FeatureStateSchema.extend({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    done: z.boolean(),
  })).default([]).describe('List of tasks'),
  filter: z.enum(['all', 'active', 'done']).default('all').describe('Current filter'),
})

class TaskManager extends Feature<z.infer<typeof TaskStateSchema>> {
  static override stateSchema = TaskStateSchema

  addTask(title: string) {
    const tasks = this.state.get('tasks') || []
    const task = { id: crypto.randomUUID(), title, done: false }
    this.state.set('tasks', [...tasks, task])
    this.emit('taskAdded', task)
  }

  get activeTasks() {
    return (this.state.get('tasks') || []).filter(t => !t.done)
  }
}
```

## Event Bus

The event bus enables decoupled communication between components.

### Emitting and Listening

```typescript
// Listen for an event
feature.on('taskCompleted', (task) => {
  console.log(`Task "${task.title}" is done!`)
})

// Emit an event
feature.emit('taskCompleted', { id: '1', title: 'Write docs', done: true })
```

### One-Time Listeners

```typescript
feature.once('initialized', () => {
  console.log('Feature is ready (this runs once)')
})
```

### Waiting for Events (Promise-Based)

```typescript
// Block until an event fires
await feature.waitFor('ready')
console.log('Feature is now ready')

// Useful for initialization sequences
const server = container.server('express', { port: 3000 })
await server.start()
console.log('Server is accepting connections on port', server.state.get('port'))
```

### Container Events

The container emits events for lifecycle moments:

```typescript
container.on('featureEnabled', (featureId, feature) => {
  console.log(`Feature ${featureId} was enabled`)
})
```

## Patterns

### Coordinating Between Features

```typescript
const auth = container.feature('auth')
const analytics = container.feature('analytics')

// Analytics reacts to auth events
auth.on('userLoggedIn', (user) => {
  analytics.logEvent('login', { userId: user.id })
})

auth.on('userLoggedOut', (user) => {
  analytics.logEvent('logout', { userId: user.id })
})
```

### State-Driven UI Updates

```typescript
const cart = container.feature('cart')

cart.state.observe((type, key, value) => {
  if (key === 'items') {
    renderCartBadge(value.length)
  }
  if (key === 'total') {
    renderCartTotal(value)
  }
})
```

### Initialization Gates

```typescript
// Wait for multiple features to be ready
await Promise.all([
  container.feature('db').waitFor('connected'),
  container.feature('cache').waitFor('ready'),
  container.feature('auth').waitFor('initialized'),
])

console.log('All systems ready, starting server...')
await container.server('express', { port: 3000 }).start()
```
