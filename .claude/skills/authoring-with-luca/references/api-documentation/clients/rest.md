# RestClient (clients.rest)

No description provided

## Usage

```ts
container.client('rest', {
  // Base URL for the client connection
  baseURL,
  // Whether to automatically parse responses as JSON
  json,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for the client connection |
| `json` | `boolean` | Whether to automatically parse responses as JSON |

## Events (Zod v4 schema)

### failure

Emitted when a request fails

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `any` | The error object |



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | Whether the client is currently connected |