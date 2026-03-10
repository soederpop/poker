# ProcessManager (features.processManager)

Manages long-running child processes with tracking, events, and automatic cleanup. Unlike the `proc` feature whose spawn methods block until the child exits, ProcessManager returns a SpawnHandler immediately — a handle object with its own state, events, and lifecycle methods. The feature tracks all spawned processes, maintains observable state, and can automatically kill them on parent exit.

## Usage

```ts
container.feature('processManager', {
  // Register process.on exit/SIGINT/SIGTERM handlers to kill all tracked processes
  autoCleanup,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `autoCleanup` | `boolean` | Register process.on exit/SIGINT/SIGTERM handlers to kill all tracked processes |

## Methods

### spawn

Spawn a long-running process and return a handle immediately. The returned SpawnHandler provides events for stdout/stderr streaming, exit/crash notifications, and methods to kill or await the process.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `command` | `string` | ✓ | The command to execute (e.g. 'node', 'bun', 'python') |
| `args` | `string[]` |  | Arguments to pass to the command |
| `options` | `SpawnOptions` |  | Spawn configuration |

`SpawnOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `tag` | `string` | User-defined tag for later lookups via getByTag() |
| `cwd` | `string` | Working directory for the spawned process (defaults to container cwd) |
| `env` | `Record<string, string>` | Additional environment variables merged with process.env |
| `stdin` | `'pipe' | 'inherit' | 'ignore' | null` | stdin mode: 'pipe' to write to the process, 'inherit', or 'ignore' (default: 'ignore') |
| `stdout` | `'pipe' | 'inherit' | 'ignore' | null` | stdout mode: 'pipe' to capture output, 'inherit', or 'ignore' (default: 'pipe') |
| `stderr` | `'pipe' | 'inherit' | 'ignore' | null` | stderr mode: 'pipe' to capture errors, 'inherit', or 'ignore' (default: 'pipe') |

**Returns:** `SpawnHandler`



### get

Get a SpawnHandler by its unique ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✓ | The process ID returned by spawn |

**Returns:** `SpawnHandler | undefined`



### getByTag

Find a SpawnHandler by its user-defined tag.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `tag` | `string` | ✓ | The tag passed to spawn() |

**Returns:** `SpawnHandler | undefined`



### list

List all tracked SpawnHandlers (running and finished).

**Returns:** `SpawnHandler[]`



### killAll

Kill all running processes.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `signal` | `NodeJS.Signals | number` |  | Signal to send (default: SIGTERM) |

**Returns:** `void`



### stop

Stop the process manager: kill all running processes and remove cleanup handlers.

**Returns:** `Promise<void>`



### remove

Remove a finished handler from tracking.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✓ | The process ID to remove |

**Returns:** `boolean`



### enable

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `any` |  | Parameter options |

**Returns:** `Promise<this>`



### _onHandlerDone

Called by SpawnHandler when a process finishes. Updates feature-level state.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `handler` | `SpawnHandler` | ✓ | Parameter handler |
| `status` | `'exited' | 'crashed' | 'killed'` | ✓ | Parameter status |
| `exitCode` | `number` |  | Parameter exitCode |

**Returns:** `void`



## Events (Zod v4 schema)

### spawned

Event emitted by ProcessManager



### exited

Event emitted by ProcessManager



### crashed

Event emitted by ProcessManager



### killed

Event emitted by ProcessManager



### allStopped

Event emitted by ProcessManager



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `processes` | `object` | Map of process ID to metadata |
| `totalSpawned` | `number` | Total number of processes spawned since feature creation |

## Examples

**features.processManager**

```ts
const pm = container.feature('processManager', { enable: true })

const server = pm.spawn('node', ['server.js'], { tag: 'api', cwd: '/app' })
server.on('stdout', (data) => console.log('[api]', data))
server.on('crash', (code) => console.error('API crashed:', code))

// Kill one
server.kill()

// Kill all tracked processes
pm.killAll()

// List and lookup
pm.list()              // SpawnHandler[]
pm.getByTag('api')     // SpawnHandler | undefined
```

