---
title: Introspection and Discovery
tags: [introspection, runtime, discovery, documentation, describe, inspect]
---

# Introspection and Discovery

One of Luca's defining features is that everything is discoverable at runtime. You don't need to read documentation to learn what's available -- you can ask the system itself.

## Why Introspection Matters

Introspection serves two audiences:

1. **Developers** -- discover APIs while coding, without leaving the REPL or editor
2. **AI Agents** -- learn the full API surface dynamically, enabling them to use features they weren't explicitly trained on

## Container-Level Introspection

```typescript
// Structured data about the entire container
const info = container.introspect()
// Returns: registries, enabled features, state schema, available helpers

// Human-readable markdown
const docs = container.introspectAsText()
```

## Registry-Level Discovery

```typescript
// What's available?
container.features.available
// => ['fs', 'git', 'proc', 'vm', 'ui', 'diskCache', 'contentDb', ...]

// Describe one
container.features.describe('diskCache')
// => Markdown documentation for diskCache feature

// Describe everything
container.features.describeAll()
// => Full documentation for all registered features

// Structured introspection data
container.features.introspect('fs')
// => { methods, getters, state, options, events, ... }
```

Same API for all registries:

```typescript
container.servers.available
container.servers.describe('express')

container.clients.available
container.clients.describe('rest')

container.commands.available
container.commands.describe('serve')
```

## Helper-Level Introspection

Every helper instance can describe itself:

```typescript
const fs = container.feature('fs')

// Structured data
const info = fs.introspect()
// => { className, methods: [...], getters: [...], state: {...}, events: [...] }

// Human-readable markdown
const docs = fs.introspectAsText()
```

### Quick Discovery with $getters and $methods

Every helper exposes `$getters` and `$methods` — string arrays listing what's available on the instance. Useful for quick exploration without parsing the full introspection object:

```typescript
const fs = container.feature('fs')
fs.$methods  // => ['readFile', 'writeFile', 'walk', 'readdir', ...]
fs.$getters  // => ['cwd', 'sep', ...]
```

### What's in the Introspection Data?

- **Class name** and description (from JSDoc)
- **Methods** -- name, description, parameters, return type
- **Getters** -- name, description, type
- **State schema** -- all observable state fields with descriptions
- **Options schema** -- all configuration options with descriptions and defaults
- **Events** -- known event names with descriptions

## How It Works

Introspection comes from two sources:

1. **Build-time extraction** -- Luca's build step parses JSDoc comments, method signatures, and getter types from source code using AST analysis. Run `bun run build:introspection` to update this.

2. **Runtime Zod schemas** -- State, options, and events schemas provide descriptions, types, and defaults at runtime via Zod's `.describe()` method.

## Practical Example: Dynamic Tool Generation

An AI agent can use introspection to generate tool definitions for any feature:

```typescript
// Agent discovers available features
const available = container.features.available

// Agent learns about a specific feature
const fsInfo = container.features.introspect('fs')

// fsInfo.methods tells the agent:
// - readFile(path: string): string
// - writeFile(path: string, content: string): Promise<string>
// - walk(basePath: string, options?: WalkOptions): { files: string[], directories: string[] }
// etc.

// The agent can now use these methods without prior training on the fs feature
```

## Using Introspection in Your Features

Make your custom features introspectable by:

1. Writing JSDoc on the class, methods, and getters
2. Using Zod `.describe()` on schema fields
3. Running `bun run build:introspection` after changes

```typescript
/**
 * Manages a pool of database connections with automatic health checking.
 * Connections are recycled when they become stale or unhealthy.
 */
export class ConnectionPool extends Feature<PoolState, PoolOptions> {
  /**
   * Acquire a connection from the pool.
   * Blocks until a connection is available or the timeout is reached.
   */
  async acquire(timeout?: number): Promise<Connection> {
    // ...
  }

  /** The number of idle connections currently in the pool */
  get idleCount(): number {
    // ...
  }

  /** The number of active connections currently checked out */
  get activeCount(): number {
    // ...
  }
}
```

Now `container.features.describe('connectionPool')` returns rich documentation, and `container.features.introspect('connectionPool')` returns structured data -- all extracted from what you already wrote.
