# ExpressServer (servers.express)

ExpressServer helper

## Usage

```ts
container.server('express', {
  // Port number to listen on
  port,
  // Hostname or IP address to bind to
  host,
  // Whether to enable CORS middleware
  cors,
  // Path to serve static files from
  static,
  // Serve index.html for unmatched routes (SPA history fallback)
  historyFallback,
  // (app: Express, server: Server) => Express
  create,
  // (options: StartOptions, server: Server) => Promise<any>
  beforeStart,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `port` | `number` | Port number to listen on |
| `host` | `string` | Hostname or IP address to bind to |
| `cors` | `boolean` | Whether to enable CORS middleware |
| `static` | `string` | Path to serve static files from |
| `historyFallback` | `boolean` | Serve index.html for unmatched routes (SPA history fallback) |
| `create` | `any` | (app: Express, server: Server) => Express |
| `beforeStart` | `any` | (options: StartOptions, server: Server) => Promise<any> |

## Methods

### start

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `StartOptions` |  | Parameter options |

**Returns:** `void`



### stop

**Returns:** `void`



### configure

**Returns:** `void`



### useEndpoint

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `endpoint` | `Endpoint` | ✓ | Parameter endpoint |

**Returns:** `this`



### useEndpoints

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dir` | `string` | ✓ | Parameter dir |

**Returns:** `Promise<this>`



### serveOpenAPISpec

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ title?: string; version?: string; description?: string }` |  | Parameter options |

**Returns:** `this`



### generateOpenAPISpec

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ title?: string; version?: string; description?: string }` |  | Parameter options |

**Returns:** `Record<string, any>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `express` | `any` |  |
| `hooks` | `any` |  |
| `app` | `any` |  |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `port` | `number` | The port the server is bound to |
| `listening` | `boolean` | Whether the server is actively listening for connections |
| `configured` | `boolean` | Whether the server has been configured |
| `stopped` | `boolean` | Whether the server has been stopped |