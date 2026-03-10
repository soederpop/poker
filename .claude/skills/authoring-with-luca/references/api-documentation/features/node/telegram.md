# Telegram (features.telegram)

Telegram bot feature powered by grammY. Supports both long-polling and webhook modes. Exposes the grammY Bot instance directly for full API access while bridging events to Luca's event bus.

## Usage

```ts
container.feature('telegram', {
  // Bot token from @BotFather (falls back to TELEGRAM_BOT_TOKEN env var)
  token,
  // Update mode: polling for long-polling, webhook for HTTP callbacks
  mode,
  // Public HTTPS URL for webhook mode
  webhookUrl,
  // HTTP path for the webhook endpoint
  webhookPath,
  // Port for webhook Express server
  webhookPort,
  // Automatically start the bot when enabled
  autoStart,
  // Drop pending updates on start (polling mode)
  dropPendingUpdates,
  // Long-polling timeout in seconds. Lower = faster response. 0 = short polling (fastest, testing only). Default 1s.
  pollingTimeout,
  // Max updates per polling request (1-100, default 100)
  pollingLimit,
  // Update types to receive (e.g. ["message", "callback_query"])
  allowedUpdates,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `token` | `string` | Bot token from @BotFather (falls back to TELEGRAM_BOT_TOKEN env var) |
| `mode` | `string` | Update mode: polling for long-polling, webhook for HTTP callbacks |
| `webhookUrl` | `string` | Public HTTPS URL for webhook mode |
| `webhookPath` | `string` | HTTP path for the webhook endpoint |
| `webhookPort` | `number` | Port for webhook Express server |
| `autoStart` | `boolean` | Automatically start the bot when enabled |
| `dropPendingUpdates` | `boolean` | Drop pending updates on start (polling mode) |
| `pollingTimeout` | `number` | Long-polling timeout in seconds. Lower = faster response. 0 = short polling (fastest, testing only). Default 1s. |
| `pollingLimit` | `number` | Max updates per polling request (1-100, default 100) |
| `allowedUpdates` | `array` | Update types to receive (e.g. ["message", "callback_query"]) |

## Methods

### enable

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `any` |  | Parameter options |

**Returns:** `Promise<this>`



### start

Start the bot in the configured mode (polling or webhook).

**Returns:** `Promise<this>`



### stop

Stop the bot gracefully.

**Returns:** `Promise<this>`



### command

Register a command handler. Also emits 'command' on the Luca event bus.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | Parameter name |
| `handler` | `(ctx: Context) => any` | ✓ | Parameter handler |

**Returns:** `this`



### handle

Register a grammY update handler (filter query). Named 'handle' to avoid collision with the inherited on() event bus method.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filter` | `Parameters<Bot['on']>[0]` | ✓ | Parameter filter |
| `handler` | `(ctx: any) => any` | ✓ | Parameter handler |

**Returns:** `this`

```ts
tg.handle('message:text', (ctx) => ctx.reply('Got text'))
tg.handle('callback_query:data', (ctx) => ctx.answerCallbackQuery('Clicked'))
```



### use

Add grammY middleware.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `middleware` | `Middleware[]` | ✓ | Parameter middleware |

**Returns:** `this`



### startPolling

Start long-polling mode.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dropPendingUpdates` | `boolean` |  | Parameter dropPendingUpdates |

**Returns:** `Promise<this>`



### setupWebhook

Set up webhook mode with an Express server.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` |  | Parameter url |
| `path` | `string` |  | Parameter path |

**Returns:** `Promise<this>`



### deleteWebhook

Remove the webhook from Telegram.

**Returns:** `Promise<this>`



### getMe

Get bot info from Telegram API.

**Returns:** `Promise<UserFromGetMe>`



### diagnostics

Print a diagnostic summary of the bot's current state.

**Returns:** `this`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `token` | `string` | Bot token from options or TELEGRAM_BOT_TOKEN env var. |
| `bot` | `Bot` | The grammY Bot instance. Created lazily on first access. |
| `isRunning` | `boolean` | Whether the bot is currently receiving updates. |
| `mode` | `'polling' | 'webhook' | 'idle'` | Current operation mode: 'polling', 'webhook', or 'idle'. |

## Events (Zod v4 schema)

### stopped

Event emitted by Telegram



### command

Event emitted by Telegram



### started

Event emitted by Telegram



### webhook_ready

Event emitted by Telegram



### error

Event emitted by Telegram



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `mode` | `string` | Current operation mode |
| `isRunning` | `boolean` | Whether the bot is currently receiving updates |
| `webhookUrl` | `string` | Active webhook URL if in webhook mode |
| `commandsRegistered` | `array` | List of registered command names |
| `lastError` | `string` | Last error message |
| `botInfo` | `object` | Bot user information from Telegram API |

## Environment Variables

- `TELEGRAM_BOT_TOKEN`

## Examples

**features.telegram**

```ts
const tg = container.feature('telegram', { autoStart: true })
tg.command('start', (ctx) => ctx.reply('Hello!'))
tg.handle('message:text', (ctx) => ctx.reply(`Echo: ${ctx.message.text}`))
```



**handle**

```ts
tg.handle('message:text', (ctx) => ctx.reply('Got text'))
tg.handle('callback_query:data', (ctx) => ctx.answerCallbackQuery('Clicked'))
```

