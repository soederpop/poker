# Repl (features.repl)

REPL feature — provides an interactive read-eval-print loop with tab completion and history. Launches a REPL session that evaluates JavaScript/TypeScript expressions in a sandboxed VM context populated with the container and its helpers. Supports tab completion for dot-notation property access, command history persistence, and async/await.

## Usage

```ts
container.feature('repl', {
  // The prompt string to display in the REPL (default: "> ")
  prompt,
  // Path to the REPL history file for command persistence
  historyPath,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `prompt` | `string` | The prompt string to display in the REPL (default: "> ") |
| `historyPath` | `string` | Path to the REPL history file for command persistence |

## Methods

### start

Start the REPL session. Creates a VM context populated with the container and its helpers, sets up readline with tab completion and history, then enters the interactive loop. Type `.exit` or `exit` to quit. Supports top-level await.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ historyPath?: string, context?: any }` |  | Configuration for the REPL session |

`{ historyPath?: string, context?: any }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `historyPath` | `any` | Custom path for the history file (defaults to node_modules/.cache/.repl_history) |
| `context` | `any` | Additional variables to inject into the VM context |

**Returns:** `void`

```ts
const repl = container.feature('repl', { enable: true })
await repl.start({
 context: { db: myDatabase },
 historyPath: '.repl-history'
})
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `isStarted` | `any` | Whether the REPL session is currently running. |
| `vmContext` | `any` | The VM context object used for evaluating expressions in the REPL. |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `started` | `boolean` | Whether the REPL server has been started |

## Examples

**features.repl**

```ts
const repl = container.feature('repl', { enable: true })
await repl.start({ context: { myVar: 42 } })
```



**start**

```ts
const repl = container.feature('repl', { enable: true })
await repl.start({
 context: { db: myDatabase },
 historyPath: '.repl-history'
})
```

