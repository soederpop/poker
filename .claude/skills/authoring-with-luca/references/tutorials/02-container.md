---
title: The Container
tags: [container, singleton, state, events, registries, dependency-injection]
---

# The Container

The container is the heart of every Luca application. It is a per-process singleton that provides:

- **Dependency injection** via factory methods and registries
- **Observable state** that you can watch for changes
- **Event bus** for decoupled communication
- **Registries** for discovering available helpers

## Getting the Container

```typescript
import container from '@soederpop/luca'
```

The import resolves automatically based on environment -- `@soederpop/luca` gives you a `NodeContainer` on the server and a `WebContainer` in browser builds. You can also be explicit:

```typescript
import container from '@soederpop/luca/node'  // Always NodeContainer
import container from '@soederpop/luca/web'   // Always WebContainer
```

The NodeContainer comes pre-loaded with registries for features, clients, servers, commands, and endpoints. Core features like `fs`, `git`, `proc`, `os`, `networking`, `ui`, and `vm` are auto-enabled.

## Registries

Every helper type has a registry. Registries let you discover what's available and create instances:

```typescript
// What features are available?
container.features.available
// => ['fs', 'git', 'proc', 'vm', 'ui', 'networking', 'os', 'diskCache', 'contentDb', ...]

// Get documentation for a feature
container.features.describe('fs')

// Get documentation for all features
container.features.describeAll()

// Check if something is registered
container.features.has('diskCache')

// Same pattern for all helper types:
container.servers.available    // ['express', 'websocket']
container.clients.available    // ['rest', 'graph', 'websocket']
container.commands.available   // ['serve', 'run', ...]
```

## Factory Methods

Create helper instances through the container's factory methods:

```typescript
// Features (cached by id + options hash)
const fs = container.feature('fs')
const cache = container.feature('diskCache', { path: './cache' })

// Servers
const server = container.server('express', { port: 3000, cors: true })

// Clients
const api = container.client('rest', { baseURL: 'https://api.example.com' })
```

Factory results are **cached**. Calling `container.feature('fs')` twice returns the same instance. Different options produce different instances.

## Enabled Features (Shortcuts)

Some features are "enabled" on the container, giving them shortcut access:

```typescript
// These are equivalent:
container.feature('fs')
container.fs

// Auto-enabled features:
container.fs           // File system
container.git          // Git operations
container.proc         // Process execution
container.vm           // JavaScript VM
container.ui           // Terminal UI
container.os           // OS info
container.networking   // Port finding, availability
```

To enable your own feature:

```typescript
const myFeature = container.feature('myFeature', { enable: true })
// Now accessible as container.myFeature
```

## Observable State

The container (and every helper) has observable state:

```typescript
// Set state
container.state.set('ready', true)

// Get state
container.state.get('ready') // true

// Get a snapshot of all state
container.state.current

// Observe all changes (changeType is 'add' | 'update' | 'delete')
container.state.observe((changeType, key, value) => {
  console.log(`${key} ${changeType}:`, value)
})

// State has a version counter
container.state.version // increments on every change
```

## Event Bus

The container has a built-in event bus for decoupled communication:

```typescript
// Listen for events
container.on('featureEnabled', (featureName) => {
  console.log(`${featureName} was enabled`)
})

// Emit events
container.emit('myCustomEvent', { some: 'data' })

// One-time listener
container.once('ready', () => console.log('Container is ready'))

// Wait for an event (promise-based)
await container.waitFor('ready')
```

## Plugins and `.use()`

Extend the container with the `.use()` method:

```typescript
// Enable a feature by name
container.use('diskCache')

// Attach a plugin
container.use(MyPlugin)
```

A plugin is any class with a static `attach(container)` method:

```typescript
class MyPlugin {
  static attach(container) {
    // Add registries, factories, whatever you need
    container.myThing = new MyThing(container)
    return container
  }
}
```

## Utilities

The container provides common utilities so you don't need extra dependencies:

```typescript
container.utils.uuid()                          // Generate a v4 UUID
container.utils.hashObject({ foo: 'bar' })      // Deterministic hash
container.utils.stringUtils.camelCase('my-var')  // 'myVar'
container.utils.stringUtils.kebabCase('MyVar')   // 'my-var'
container.utils.stringUtils.pluralize('feature') // 'features'

// Lodash utilities
const { uniq, groupBy, keyBy, debounce, throttle } = container.utils.lodash
```

## Path Utilities

```typescript
container.paths.resolve('relative/path')    // Resolve from cwd
container.paths.join('a', 'b', 'c')         // Join path segments
container.paths.relative('/absolute/path')  // Make relative to cwd
```

## Package Manifest

Access the project's package.json:

```typescript
container.manifest.name        // "my-app"
container.manifest.version     // "0.1.0"
container.manifest.dependencies
```

## Introspection

Discover everything about the container at runtime:

```typescript
// Structured introspection data
const info = container.inspect()

// Human-readable markdown
const docs = container.inspectAsText()
```

This is what makes Luca especially powerful for AI agents -- they can discover the entire API surface at runtime without reading documentation.
