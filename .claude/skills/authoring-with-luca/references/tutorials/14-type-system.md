---
title: Type System and Module Augmentation
tags: [types, typescript, zod, module-augmentation, schemas, type-safety]
---

# Type System and Module Augmentation

Luca's type system ensures that as you add features, clients, servers, and commands, the container's factory methods stay fully typed. This is powered by Zod schemas and TypeScript module augmentation.

## The Pattern

When you register a new helper, you augment the corresponding interface so TypeScript knows about it:

```typescript
import { Feature, features, FeatureStateSchema, FeatureOptionsSchema } from '@soederpop/luca'
import { z } from 'zod'

// 1. Define your feature
export class MyCache extends Feature<MyCacheState, MyCacheOptions> {
  // ...
}

// 2. Register it
features.register('myCache', MyCache)

// 3. Augment the interface
declare module '@soederpop/luca' {
  interface AvailableFeatures {
    myCache: typeof MyCache
  }
}

// 4. Now fully typed everywhere:
const cache = container.feature('myCache', { ttl: 3600 })
//    ^-- TypeScript knows this is MyCache
//                                  ^-- autocomplete for MyCache options
```

## Zod Schemas = Types + Runtime Validation

Every schema you define gives you both compile-time types and runtime validation:

```typescript
// Define once with Zod
export const UserOptionsSchema = FeatureOptionsSchema.extend({
  apiKey: z.string().describe('API key for authentication'),
  timeout: z.number().default(5000).describe('Request timeout in ms'),
  retries: z.number().default(3).describe('Max retry attempts'),
})

// Extract the type
export type UserOptions = z.infer<typeof UserOptionsSchema>

// Use for static typing
export class UserService extends Feature<UserState, UserOptions> {
  static override optionsSchema = UserOptionsSchema

  connect() {
    // this.options is typed: { apiKey: string, timeout: number, retries: number }
    const { apiKey, timeout } = this.options
  }
}
```

The schema also powers:
- **Runtime validation** when options are passed to the factory
- **Introspection** -- `.describe()` text appears in `helper.introspect()`
- **Documentation** -- field descriptions appear in `container.features.describe('userService')`

## State Typing

```typescript
const TaskStateSchema = FeatureStateSchema.extend({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    done: z.boolean(),
  })).default([]),
  filter: z.enum(['all', 'active', 'done']).default('all'),
})

type TaskState = z.infer<typeof TaskStateSchema>

class TaskManager extends Feature<TaskState> {
  static override stateSchema = TaskStateSchema

  addTask(title: string) {
    const tasks = this.state.get('tasks')
    //    ^-- typed as Array<{ id: string, title: string, done: boolean }>

    this.state.set('tasks', [...(tasks || []), { id: '1', title, done: false }])
    //                       ^-- TypeScript validates the shape
  }
}
```

## Module Augmentation for All Helper Types

The pattern is the same for features, clients, servers, and commands:

```typescript
// Features
declare module '@soederpop/luca' {
  interface AvailableFeatures {
    myFeature: typeof MyFeature
  }
}

// Clients
declare module '@soederpop/luca' {
  interface AvailableClients {
    myClient: typeof MyClient
  }
}

// Servers
declare module '@soederpop/luca' {
  interface AvailableServers {
    myServer: typeof MyServer
  }
}

// Commands
declare module '@soederpop/luca' {
  interface AvailableCommands {
    myCommand: typeof MyCommand
  }
}
```

## Using .describe() Effectively

```typescript
const ConfigSchema = z.object({
  host: z.string().describe('Database hostname or IP address'),
  port: z.number().default(5432).describe('Database port'),
  database: z.string().describe('Database name to connect to'),
  ssl: z.boolean().default(false).describe('Whether to use SSL/TLS for the connection'),
  pool: z.object({
    min: z.number().default(2).describe('Minimum connections to keep open'),
    max: z.number().default(10).describe('Maximum connections allowed'),
  }).describe('Connection pool configuration'),
})
```

These descriptions are not just for humans reading the code -- they show up in:
- `container.features.describe('db')` output
- `container.features.introspect('db')` data
- OpenAPI specs when used in endpoint schemas
- AI agent tool descriptions

## The Full Typed Flow

```typescript
// 1. You define a feature with schemas
export class Analytics extends Feature<AnalyticsState, AnalyticsOptions> { ... }

// 2. You register + augment
features.register('analytics', Analytics)
declare module '@soederpop/luca' {
  interface AvailableFeatures { analytics: typeof Analytics }
}

// 3. Now every interaction is typed:
const a = container.feature('analytics', { trackingId: 'UA-123' })
//    ^-- Analytics instance     ^-- autocomplete: 'analytics'
//                                         ^-- type error if wrong options

a.state.get('pageViews')  // typed by AnalyticsState
a.on('pageView', ...)     // typed by event definitions
a.track('click', { ... }) // typed by Analytics methods
```

This is the core principle: **never break the type system.** Every step of `container.feature('name', options)` should give you autocomplete, type checking, and documentation.
