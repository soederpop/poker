# WebSocketClient (clients.websocket)

No description provided

## Usage

```ts
container.client('websocket', {
  // Base URL for the client connection
  baseURL,
  // Whether to automatically parse responses as JSON
  json,
  // Whether to automatically reconnect on disconnection
  reconnect,
  // Base interval in milliseconds between reconnection attempts
  reconnectInterval,
  // Maximum number of reconnection attempts before giving up
  maxReconnectAttempts,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for the client connection |
| `json` | `boolean` | Whether to automatically parse responses as JSON |
| `reconnect` | `boolean` | Whether to automatically reconnect on disconnection |
| `reconnectInterval` | `number` | Base interval in milliseconds between reconnection attempts |
| `maxReconnectAttempts` | `number` | Maximum number of reconnection attempts before giving up |

## Events (Zod v4 schema)

### failure

Emitted when a request fails

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `any` | The error object |



### message

Emitted when a message is received

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `any` | The parsed message data |



### open

Emitted when the WebSocket connection is established



### close

Emitted when the WebSocket connection is closed

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `number` | Close code |
| `arg1` | `string` | Close reason |



### error

Emitted when a WebSocket error occurs

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `any` | The error |



### reconnecting

Emitted when attempting to reconnect

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `number` | Attempt number |



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | Whether the client is currently connected |
| `connectionError` | `any` | The last connection error, if any |
| `reconnectAttempts` | `number` | Number of reconnection attempts made |