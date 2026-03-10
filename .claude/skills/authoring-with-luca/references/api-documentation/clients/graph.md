# GraphClient (clients.graph)

No description provided

## Usage

```ts
container.client('graph', {
  // Base URL for the client connection
  baseURL,
  // Whether to automatically parse responses as JSON
  json,
  // The GraphQL endpoint path, defaults to /graphql
  endpoint,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for the client connection |
| `json` | `boolean` | Whether to automatically parse responses as JSON |
| `endpoint` | `string` | The GraphQL endpoint path, defaults to /graphql |

## Events (Zod v4 schema)

### failure

Emitted when a request fails

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `any` | The error object |



### graphqlError

Emitted when GraphQL-level errors are present in the response

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `array` | Array of GraphQL errors |



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | Whether the client is currently connected |