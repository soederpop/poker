---
name: authoring-with-luca
description: >
  Comprehensive guide for AI agents building applications with the Luca framework.
  Auto-trigger when @soederpop/luca appears in package.json, the luca binary is
  available in PATH, a luca.console.ts file exists, or commands/ / endpoints/
  directories are present in the project.
user-invocable: false
---

# Authoring with Luca

## 1. You Are In a Luca Project

Luca (Lightweight Universal Conversational Architecture) provides a `container` singleton that gives your application filesystem access, networking, process management, git, UI utilities, AI integrations, and dozens more capabilities — all without installing additional packages. The container is introspectable at runtime, meaning both humans and AI agents can discover its full API surface programmatically.

**Detection signals** — this skill applies when any of the following are true:
- `@soederpop/luca` appears in `package.json` dependencies
- The `luca` binary is available in PATH
- A `luca.console.ts` file exists at the project root
- A `commands/` or `endpoints/` directory exists

**The core rule:** Everything goes through the container. Never `import { readFileSync } from 'fs'` or `import { resolve } from 'path'`. Use `container.fs`, `container.paths`, `container.proc`, etc. The only exception is inside feature *implementations* themselves (e.g., building `fs.ts` may use Node's `fs` internally).

---

## 2. The Container

Import the container for your runtime:

```ts
// Node backend (fs, git, proc, networking, databases, etc.)
import container from '@soederpop/luca/node'

// AGI layer (assistant, conversation, MCP, plus all node features)
import container from '@soederpop/luca/agi'

// Browser frontend (reactive state, UI bindings)
import container from '@soederpop/luca/web'
```

The container is a **per-process singleton**. Import it once, use it everywhere.

### Auto-enabled shortcuts

When you import the node or agi container, these features are already available as direct properties:

| Shortcut | Feature | What it does |
|----------|---------|-------------|
| `container.fs` | FileSystem | Read/write files, walk directories, JSON/YAML helpers |
| `container.git` | Git | Branch, sha, status, commit, diff, log |
| `container.proc` | Process | `exec()`, `spawn()`, `runScript()` |
| `container.vm` | VM | Evaluate code with container in scope |
| `container.ui` | UI | Colors, tables, spinners, prompts |
| `container.os` | OS | Platform info, env vars, home dir |
| `container.networking` | Networking | Port scanning, `isPortOpen()`, `findOpenPort()` |
| `container.grep` | Grep | Regex search across files |

### Other useful properties

- `container.paths` — path resolution helpers (`resolve()`, `join()`, `cwd`)
- `container.utils` — general utilities
- `container.manifest` — project's `package.json` as an object

### Getting any feature, client, or server

```ts
// Features — container capabilities
const cache = container.feature('diskCache')
const postgres = container.feature('postgres', { url: 'postgresql://...' })

// Clients — external service wrappers
const rest = container.client('rest')
const ws = container.client('websocket')

// Servers — listeners
const app = container.server('express', { port: 3000 })
const mcp = container.server('mcp')
```

---

## 3. Discovery First

Before writing code or installing packages, **discover what the container already provides**. Luca's introspection system is its killer feature.

### Runtime discovery (in code)

```ts
// List available helpers
container.features.available   // => ['fs', 'git', 'proc', 'diskCache', ...]
container.clients.available    // => ['rest', 'websocket', 'openai', ...]
container.servers.available    // => ['express', 'websocket', 'mcp', ...]

// Get markdown docs for a specific helper
container.features.describe('diskCache')

// Get docs for everything in a registry
container.features.describeAll()

// Structured introspection (methods, getters, state, events, options)
container.features.introspect('fs')

// Instance-level introspection
const fs = container.feature('fs')
fs.introspect()         // structured object
fs.introspectAsText()   // markdown documentation
```

### CLI discovery (from terminal)

```bash
luca describe container           # Full container introspection
luca describe features            # List all features
luca describe fs                  # Docs for a specific feature
luca describe features.vm --methods --pretty   # Filter sections
luca eval "container.features.available"       # Quick one-liner
```

### MCP discovery (when luca-sandbox MCP is available)

The `luca-sandbox` MCP server exposes these tools:

| Tool | Purpose |
|------|---------|
| `find_capability` | Search container capabilities by intent |
| `list_registry` | List all items in features/clients/servers/commands/endpoints |
| `describe_helper` | Get full API docs for any helper |
| `inspect_helper_instance` | Inspect a live, running helper instance |
| `eval` | Run code in the container sandbox |
| `scaffold` | Generate boilerplate for new helpers |

### Project-level auto-loading

Luca auto-discovers project helpers from conventional directories:

```ts
// In your entrypoint or container setup
await container.helpers.discover('features')  // loads from features/
await container.helpers.discover('clients')   // loads from clients/
await container.helpers.discover('servers')   // loads from servers/
```

### The golden rule

> Check the container before installing a package. If `container.features.available` includes what you need, use it. If it doesn't, discuss adding it to the container rather than `npm install`-ing a one-off dependency.

See [references/discovery-and-introspection.md](./references/discovery-and-introspection.md) for a condensed reference.

---

## 4. The luca CLI

The `luca` binary is a project-aware command runner. When given a file path instead of a command name, it delegates to `run` automatically.

### Core commands

**`luca serve`** — Start an API server with file-based endpoints

```bash
luca serve                           # Default: port 3000, auto-discover endpoints/
luca serve --port 4000               # Custom port
luca serve --setup setup.ts          # Custom server configuration
luca serve --force                   # Kill existing process on the port
luca serve --any-port                # Find an available port
```

Auto-discovers endpoints from `endpoints/` or `src/endpoints/`, serves static files from `public/`, generates OpenAPI spec at `/openapi.json`, enables CORS by default.

**`luca run`** — Execute scripts and runnable markdown notebooks

```bash
luca run scripts/migrate.ts          # Run a TypeScript script
luca run notebooks/setup.md          # Execute markdown code blocks sequentially
luca run notebooks/setup.md --safe   # Require approval before each block
luca run notebooks/setup.md --console  # Start REPL after execution
```

**`luca eval`** — One-liner code evaluation with container in scope

```bash
luca eval "container.features.available"
luca eval "fs.readdir('src')" --json
luca eval "networking.isPortOpen(3000)"
```

**`luca describe`** — Introspect helpers, registries, and the container

```bash
luca describe container              # Full container overview
luca describe features               # List all features
luca describe fs --methods --pretty  # Specific sections, formatted
luca describe rest websocket --json  # Multiple helpers, JSON output
```

**`luca console`** — Interactive REPL with all features in scope

All registered features are top-level variables. If `luca.console.ts` exists, its exports are merged into scope.

**`luca chat`** — Interactive AI chat with local assistants

```bash
luca chat                            # Pick from discovered assistants
luca chat my-assistant --model gpt-4o
```

**`luca prompt`** — Send a prompt file to an AI target

```bash
luca prompt claude prompts/refactor.md
luca prompt codex prompts/add-tests.md
luca prompt my-assistant prompts/summarize.md
```

**`luca mcp`** — Start an MCP server exposing project tools

```bash
luca mcp                             # stdio transport (default)
luca mcp --transport http --port 3001
```

See [references/cli-quick-reference.md](./references/cli-quick-reference.md) for a condensed cheat sheet.

---

## 5. Project Structure & File Conventions

Luca uses file-based conventions for discovery. Place files in the right directory and they auto-register.

### Standard layout

```
my-project/
├── package.json
├── commands/           # CLI commands → luca <name>
├── endpoints/          # HTTP routes → luca serve
├── features/           # Custom features → container.feature('x')
├── clients/            # Custom clients → container.client('x')
├── servers/            # Custom servers → container.server('x')
├── assistants/         # AI assistant definitions → luca chat
├── public/             # Static files → served by luca serve
├── scripts/            # Runnable scripts → luca run scripts/x.ts
└── luca.console.ts     # REPL extensions → luca console
```

### Commands

Files in `commands/` become CLI commands. The filename is the command name.

```ts
// commands/seed.ts → luca seed --count 20
import { z } from 'zod'
import type { ContainerContext } from '@soederpop/luca'

export const description = 'Seed the database with sample data'

export const argsSchema = z.object({
  count: z.number().default(10).describe('Number of records to seed'),
  table: z.string().optional().describe('Specific table to seed'),
})

export async function handler(options: z.infer<typeof argsSchema>, context: ContainerContext) {
  const { container } = context
  console.log(`Seeding ${options.count} records...`)
}
```

**Exports:** `handler` (required), `argsSchema` (optional, Zod schema), `description` (optional).

Commands are loaded through the VM — container and all features are in scope. See [templates/command-template.md](./templates/command-template.md).

### Endpoints

Files in `endpoints/` become HTTP routes, auto-mounted by `luca serve`.

```ts
// endpoints/users.ts → GET/POST /api/users
import { z } from 'zod'
import type { EndpointContext } from '@soederpop/luca'

export const path = '/api/users'
export const description = 'User management'
export const tags = ['users']

export const getSchema = z.object({
  role: z.string().optional().describe('Filter by role'),
  limit: z.number().default(50).describe('Max results'),
})

export async function get(params: z.infer<typeof getSchema>, ctx: EndpointContext) {
  return { users: [], total: 0 }
}

export const postSchema = z.object({
  name: z.string().describe('Full name'),
  email: z.string().email().describe('Email address'),
})

export async function post(params: z.infer<typeof postSchema>, ctx: EndpointContext) {
  return { user: { id: '1', ...params } }
}
```

**Exports:** `path` (required), HTTP method handlers (`get`, `post`, `put`, `patch`, `delete`), corresponding schemas (`getSchema`, `postSchema`, etc.), `description`, `tags`.

The `EndpointContext` provides: `container`, `request`, `response`, `query`, `body`, `params` (URL params).

URL parameters use `:param` syntax in path or `[param]` bracket file naming (`endpoints/users/[id].ts`).

OpenAPI spec is auto-generated at `/openapi.json`. See [templates/endpoint-template.md](./templates/endpoint-template.md).

### Helpers discovery

Project-local features, clients, and servers in their respective directories are auto-loaded:

```ts
await container.helpers.discover('features')  // loads features/*.ts
await container.helpers.discover('clients')   // loads clients/*.ts
await container.helpers.discover('servers')   // loads servers/*.ts
```

### Global commands

`~/.luca/commands/` contains commands available in every project (not just the current one).

See [references/project-conventions.md](./references/project-conventions.md) for a complete reference table.

---

## 6. Coding Patterns

### Script pattern

A standalone script with container access:

```ts
import container from '@soederpop/luca/node'

async function main() {
  const fs = container.feature('fs')
  const ui = container.feature('ui')
  const files = await fs.readdir('.')
  console.log(ui.colors.green(`Found ${files.length} files`))
}

main()
```

Run with: `bun run script.ts` or `luca run script.ts`

### API server pattern

```ts
import container from '@soederpop/luca/node'

const server = container.server('express', { port: 3000 })
await server.useEndpoints('./endpoints')
server.serveOpenAPISpec({ title: 'My API', version: '1.0.0' })
await server.start()
```

Or simply: `luca serve` (auto-discovers `endpoints/` and `public/`).

### CLI tool pattern

A project whose primary interface is a set of commands:

```
my-tool/
├── commands/
│   ├── init.ts
│   ├── build.ts
│   └── deploy.ts
└── package.json
```

```bash
luca init --template react
luca build --minify
luca deploy --env production
```

### Feature composition

Build complex behavior by combining simpler container features:

```ts
class NotificationService extends Feature<NotifState, NotifOptions> {
  async initialize() {
    this.cache = this.container.feature('diskCache', { path: './.notif-cache' })
    this.api = this.container.client('rest', { baseURL: this.options.webhookUrl })
  }

  async send(channel: string, message: string) {
    const key = `ratelimit:${channel}`
    if (await this.cache.has(key)) {
      this.emit('rateLimited', { channel })
      return
    }
    await this.api.post('/send', { channel, message })
    await this.cache.set(key, true, { ttl: 60 })
    this.emit('sent', { channel, message })
  }
}
```

### Decision tree: what to write

| You need... | Write a... | Lives in... |
|-------------|-----------|-------------|
| Reusable domain logic with state/events | Feature | `features/` |
| Wrapper for an external API | Client | `clients/` |
| Something that listens for connections | Server | `servers/` |
| A CLI action | Command | `commands/` |
| An HTTP route | Endpoint | `endpoints/` |

---

## 7. Writing Custom Features

When the built-in features don't cover your domain, extend `Feature`. This is the same pattern every built-in feature follows.

### Step 1: Define Zod schemas

Every feature has three schemas: **options** (constructor config), **state** (observable data), **events** (typed event bus).

```ts
import { z } from 'zod'
import { FeatureStateSchema, FeatureOptionsSchema, FeatureEventsSchema } from '@soederpop/luca/schemas'

export const MyFeatureOptionsSchema = FeatureOptionsSchema.extend({
  apiKey: z.string().describe('API key for the service'),
  maxRetries: z.number().default(3).describe('Maximum retry attempts'),
})
export type MyFeatureOptions = z.infer<typeof MyFeatureOptionsSchema>

export const MyFeatureStateSchema = FeatureStateSchema.extend({
  connected: z.boolean().default(false).describe('Whether we are connected'),
  requestCount: z.number().default(0).describe('Total requests made'),
})
export type MyFeatureState = z.infer<typeof MyFeatureStateSchema>

export const MyFeatureEventsSchema = FeatureEventsSchema.extend({
  connected: z.tuple([]).describe('Fired when connection is established'),
  request: z.tuple([z.string().describe('endpoint'), z.number().describe('status code')])
    .describe('Fired after each request completes'),
  error: z.tuple([z.any().describe('The error')]).describe('Fired on failure'),
})
```

### Step 2: Extend Feature

```ts
import { Feature, features } from '@soederpop/luca/node'
import type { ContainerContext } from '@soederpop/luca'

/**
 * MyFeature does something useful.
 *
 * @example
 * ```ts
 * const myFeature = container.feature('myFeature', { apiKey: '...' })
 * await myFeature.connect()
 * ```
 */
export class MyFeature extends Feature<MyFeatureState, MyFeatureOptions> {
  static override shortcut = 'features.myFeature' as const
  static override stateSchema = MyFeatureStateSchema
  static override optionsSchema = MyFeatureOptionsSchema
  static override eventsSchema = MyFeatureEventsSchema

  constructor(options: MyFeatureOptions, context: ContainerContext) {
    super(options, context)
  }

  /** Connect to the service. */
  async connect() {
    const { apiKey, maxRetries } = this.options
    const rest = this.container.client('rest')
    this.state.set('connected', true)
    this.emit('connected')
  }

  /** Make a request. */
  async request(endpoint: string) {
    this.state.set('requestCount', this.state.get('requestCount') + 1)
    this.emit('request', endpoint, 200)
  }
}
```

### Step 3: Register and augment types

```ts
// Runtime: register so container.feature('myFeature') works
export default features.register('myFeature', MyFeature)

// Types: augment so TypeScript knows about it
declare module '@soederpop/luca' {
  interface AvailableFeatures {
    myFeature: typeof MyFeature
  }
}
```

### Step 4: Import the feature

Features must be imported (side-effect) so the registration runs:

```ts
import './features/my-feature'  // side-effect: registers with features registry
```

Or use `helpers.discover('features')` to auto-load everything in `features/`.

### Key points

- `static shortcut` must be `'features.yourName' as const` — this is the registry path
- `this.container` gives access to every other feature, client, server
- State is observable: use `state.get()` / `state.set()`, never raw properties
- Events are tuples: `z.tuple([z.string(), z.number()])` means listeners receive `(arg0: string, arg1: number)`
- JSDoc on the class, methods, and getters becomes `feature.introspect()` output

---

## 8. Writing Custom Clients & Servers

### Clients

Clients wrap external services. Extend `RestClient` for HTTP APIs, `WebSocketClient` for real-time, or `Client` for other protocols.

```ts
import { z } from 'zod'
import { ClientStateSchema, ClientOptionsSchema, ClientEventsSchema } from '@soederpop/luca/schemas'
import { RestClient, clients } from '@soederpop/luca'
import type { ContainerContext } from '@soederpop/luca'

export const StripeOptionsSchema = ClientOptionsSchema.extend({
  secretKey: z.string().describe('Stripe secret API key'),
})

export const StripeStateSchema = ClientStateSchema.extend({
  authenticated: z.boolean().default(false).describe('Whether API key has been verified'),
})

export const StripeEventsSchema = ClientEventsSchema.extend({
  charge: z.tuple([z.string().describe('charge ID'), z.number().describe('amount')])
    .describe('Emitted after a successful charge'),
})

/**
 * Stripe API client.
 *
 * @example
 * ```ts
 * const stripe = container.client('stripe', { secretKey: process.env.STRIPE_KEY })
 * const charge = await stripe.createCharge(2000, 'usd')
 * ```
 */
export class StripeClient extends RestClient<z.infer<typeof StripeStateSchema>, z.infer<typeof StripeOptionsSchema>> {
  static override shortcut = 'clients.stripe' as const
  static override stateSchema = StripeStateSchema
  static override optionsSchema = StripeOptionsSchema
  static override eventsSchema = StripeEventsSchema

  constructor(options: z.infer<typeof StripeOptionsSchema>, context: ContainerContext) {
    super({ ...options, baseURL: 'https://api.stripe.com/v1' }, context)
    this.axios.defaults.headers.common['Authorization'] = `Bearer ${options.secretKey}`
  }

  async createCharge(amount: number, currency: string) {
    const result = await this.post('/charges', { amount, currency })
    this.emit('charge', result.id, amount)
    return result
  }
}

export default clients.register('stripe', StripeClient)

declare module '@soederpop/luca' {
  interface AvailableClients {
    stripe: typeof StripeClient
  }
}
```

**Built-in client base classes:**

| Class | Use when... | Gives you... |
|-------|------------|-------------|
| `Client` | Custom protocol | Connection state, event bus |
| `RestClient` | HTTP API | `this.axios`, `get()`, `post()`, `put()`, `patch()`, `delete()` |
| `GraphClient` | GraphQL API | `query()`, `mutate()` (extends RestClient) |
| `WebSocketClient` | Real-time connection | `connect()`, `send()`, `disconnect()`, auto-reconnect |

### Servers

Servers listen for connections. Extend `Server` for custom protocols or `ExpressServer` for HTTP.

```ts
import { z } from 'zod'
import { ServerStateSchema, ServerOptionsSchema, ServerEventsSchema } from '@soederpop/luca/schemas'
import { Server, servers, type StartOptions } from '@soederpop/luca'
import type { ContainerContext } from '@soederpop/luca'

export const GrpcOptionsSchema = ServerOptionsSchema.extend({
  protoPath: z.string().describe('Path to the .proto definition file'),
  serviceName: z.string().describe('Name of the gRPC service to expose'),
})

export const GrpcStateSchema = ServerStateSchema.extend({
  rpcCount: z.number().default(0).describe('Total RPCs handled'),
})

export const GrpcEventsSchema = ServerEventsSchema.extend({
  rpcCall: z.tuple([z.string().describe('method'), z.any().describe('request')])
    .describe('Emitted on each RPC call'),
})

/**
 * gRPC server.
 *
 * @example
 * ```ts
 * const grpc = container.server('grpc', { port: 50051, protoPath: './service.proto', serviceName: 'MyService' })
 * grpc.handle('GetUser', async (req) => ({ id: req.id, name: 'Alice' }))
 * await grpc.start()
 * ```
 */
export class GrpcServer extends Server<z.infer<typeof GrpcStateSchema>, z.infer<typeof GrpcOptionsSchema>> {
  static override shortcut = 'servers.grpc' as const
  static override stateSchema = GrpcStateSchema
  static override optionsSchema = GrpcOptionsSchema
  static override eventsSchema = GrpcEventsSchema

  private handlers = new Map<string, Function>()

  handle(method: string, handler: (request: any) => Promise<any>) {
    this.handlers.set(method, handler)
  }

  override async start(options?: StartOptions) {
    const port = await this.container.networking.findOpenPort(this.port)
    this.state.set('port', port)
    this.state.set('listening', true)
    return this
  }
}

export default servers.register('grpc', GrpcServer)

declare module '@soederpop/luca' {
  interface AvailableServers {
    grpc: typeof GrpcServer
  }
}
```

**Built-in server base classes:**

| Class | Use when... | Gives you... |
|-------|------------|-------------|
| `Server` | Custom protocol | Port, listening state, configure/start/stop lifecycle |
| `ExpressServer` | HTTP server | Full Express with CORS, JSON body parsing, static files, endpoint mounting |
| `WebsocketServer` | WebSocket server | Connection management, message routing |
| `MCPServer` | MCP integration | Tool, resource, and prompt registration for AI agents |

---

## 9. Custom Containers

When your project has multiple custom features, create a typed container:

```ts
import { NodeContainer, type NodeFeatures } from '@soederpop/luca/node'

// Side-effect imports register the features
import './features/my-feature'
import './features/another-feature'

import type { MyFeature } from './features/my-feature'
import type { AnotherFeature } from './features/another-feature'

export interface AppFeatures extends NodeFeatures {
  myFeature: typeof MyFeature
  anotherFeature: typeof AnotherFeature
}

const container = new NodeContainer<AppFeatures>()
export default container
```

Now `container.feature('myFeature')` is fully typed everywhere you import this container.

See [templates/custom-container-template.md](./templates/custom-container-template.md).

---

## 10. The Zod Schema System

Every helper uses three Zod schemas (options, state, events) that serve **dual purposes**:

### TypeScript types (dev-time)

```ts
export type MyState = z.infer<typeof MyStateSchema>
// state.get('fieldName') is autocompleted and type-checked
```

### Runtime introspection

```ts
const myFeature = container.feature('myFeature')
myFeature.introspect()       // structured object with all schema info
myFeature.introspectAsText() // markdown documentation

container.features.describe('myFeature')  // same markdown, from the registry
```

### The `.describe()` chain

Always use `.describe()` on schema fields — it becomes documentation:

```ts
const Schema = FeatureStateSchema.extend({
  connected: z.boolean().default(false).describe('Whether the WebSocket is connected'),
  //                                      ^^^^^^^^^ Shows up in introspect() output
})
```

### Events schema pattern

Events are `z.tuple()` — each element describes one argument passed to listeners:

```ts
const EventsSchema = FeatureEventsSchema.extend({
  // No args: listener receives ()
  ready: z.tuple([]).describe('Fired when ready'),

  // One arg: listener receives (message: string)
  message: z.tuple([z.string().describe('The message text')]).describe('New message'),

  // Multiple args: listener receives (id: string, code: number, error: any)
  failed: z.tuple([
    z.string().describe('request ID'),
    z.number().describe('HTTP status code'),
    z.any().describe('error details'),
  ]).describe('Request failed'),
})
```

---

## 11. Rules & Best Practices

1. **Container first.** Always check `container.features.available` before adding a dependency. If it's not there, discuss adding it to the container.
2. **No Node builtins.** Never `import { readFileSync } from 'fs'` or `import { resolve } from 'path'`. Use `container.fs`, `container.paths`, `container.proc`.
3. **Bun runtime.** Use `bun run` to execute scripts. The project uses ESM (`"type": "module"`).
4. **Zod everywhere.** For endpoint schemas, command args, feature options/state/events. Types + validation + documentation in one place.
5. **JSDoc everything.** Class docs, method docs, and getter docs feed the introspection system. Your documentation IS your code.
6. **Thin endpoints, rich features.** Endpoints validate input and delegate. Business logic belongs in features.
7. **Emit events.** Enable reactive patterns and decoupled observers. Other features and consumers can listen.
8. **Observable state.** Use `state.get()` / `state.set()` / `state.observe()`. Don't hide important data in private variables.
9. **Compose, don't import.** Build complex behavior by combining container features (`this.container.feature(...)`) rather than importing external libraries.

See [references/container-first-philosophy.md](./references/container-first-philosophy.md) for the reasoning behind these rules.

---

## 12. Contentbase Integration

Luca projects use **contentbase** collections as a typed, queryable content layer. The `docs/` folder at a project root is the standard location for structured markdown managed by contentbase models.

The `contentDb` feature provides access. In AGI projects, `container.docs` is pre-wired to `./docs`:

```ts
await container.docs.load()

// Discover models from docs/models.ts
const Task = container.docs.models.Task

// Query
const active = await container.docs
  .query(Task)
  .where('meta.status', 'active')
  .fetchAll()

// Read formatted content
const text = await container.docs.read('epics/auth', {
  include: ['Overview', 'Stories']
})

// Shorthand queries (auto-generated per model)
const allTasks = await container.docs.queries.tasks.fetchAll()
```

Commands, endpoints, and scripts all follow the same pattern: `await container.docs.load()`, then query/read/update.

The `cnotes` CLI manages the content (create, validate, inspect, search). The `luca` CLI runs your application code that uses the content (commands, endpoints, servers).

See [references/contentbase-integration.md](./references/contentbase-integration.md) for the full guide: patterns for commands, endpoints, batch scripts, bootstrapping a new project, and CLI interplay.
