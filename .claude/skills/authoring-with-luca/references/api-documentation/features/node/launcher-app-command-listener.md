# LauncherAppCommandListener (features.launcherAppCommandListener)

LauncherAppCommandListener — IPC transport for commands from the LucaVoiceLauncher app Listens on a Unix domain socket for the native macOS launcher app to connect. When a command event arrives (voice, hotkey, text input), it wraps it in a `CommandHandle` and emits a `command` event. The consumer is responsible for acknowledging, processing, and finishing the command via the handle. Uses NDJSON (newline-delimited JSON) over the socket per the CLIENT_SPEC protocol.

## Usage

```ts
container.feature('launcherAppCommandListener', {
  // Path to the Unix domain socket to listen on
  socketPath,
  // Automatically start listening when the feature is enabled
  autoListen,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `socketPath` | `string` | Path to the Unix domain socket to listen on |
| `autoListen` | `boolean` | Automatically start listening when the feature is enabled |

## Methods

### enable

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `any` |  | Parameter options |

**Returns:** `Promise<this>`



### listen

Start listening on the Unix domain socket for the native app to connect. Fire-and-forget — binds the socket and returns immediately. Sits quietly until the native app connects; does nothing visible if it never does.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `socketPath` | `string` |  | Override the configured socket path |

**Returns:** `this`



### stop

Stop the IPC server and clean up all connections.

**Returns:** `Promise<this>`



### send

Write an NDJSON message to the connected app client.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `msg` | `Record<string, any>` | ✓ | The message object to send (will be JSON-serialized + newline) |

**Returns:** `boolean`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `isListening` | `boolean` | Whether the IPC server is currently listening. |
| `isClientConnected` | `boolean` | Whether the native app client is currently connected. |

## Events (Zod v4 schema)

### listening

Event emitted by LauncherAppCommandListener



### clientConnected

Event emitted by LauncherAppCommandListener



### clientDisconnected

Event emitted by LauncherAppCommandListener



### command

Event emitted by LauncherAppCommandListener



### message

Event emitted by LauncherAppCommandListener



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `listening` | `boolean` | Whether the IPC server is listening |
| `clientConnected` | `boolean` | Whether the native launcher app is connected |
| `socketPath` | `string` | The socket path in use |
| `commandsReceived` | `number` | Total number of commands received |
| `lastCommandText` | `string` | The text of the last received command |
| `lastError` | `string` | Last error message |

## Examples

**features.launcherAppCommandListener**

```ts
const listener = container.feature('launcherAppCommandListener', {
 enable: true,
 autoListen: true,
})

listener.on('command', async (cmd) => {
 cmd.ack('Working on it!')     // or just cmd.ack() for silent

 // ... do your actual work ...
 cmd.progress(0.5, 'Halfway there')

 cmd.finish()                   // silent finish
 cmd.finish({ result: { action: 'completed' }, speech: 'All done!' })
 // or: cmd.fail({ error: 'not found', speech: 'Sorry, that failed.' })
})
```

