# OpenAPI (features.openapi)

The OpenAPI feature loads an OpenAPI/Swagger spec from a URL and provides inspection and conversion utilities. Works in both browser and node environments since it uses fetch.

## Usage

```ts
container.feature('openapi')
```

## Methods

### load

Fetches and parses the OpenAPI spec from the configured URL. Populates `endpoints`, updates state with spec metadata.

**Returns:** `Promise<this>`



### endpoint

Get a single endpoint by its friendly name or operationId.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The friendly name or operationId to look up |

**Returns:** `EndpointInfo | undefined`



### toTools

Convert all endpoints into OpenAI-compatible tool definitions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filter` | `(ep: EndpointInfo) => boolean` |  | Optional predicate to select which endpoints to include |

**Returns:** `OpenAIToolDef[]`



### toTool

Convert a single endpoint (by name) to an OpenAI-compatible tool definition.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The endpoint friendly name or operationId |

**Returns:** `OpenAIToolDef | undefined`



### toFunctions

Convert all endpoints into OpenAI-compatible function definitions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filter` | `(ep: EndpointInfo) => boolean` |  | Optional predicate to select which endpoints to include |

**Returns:** `OpenAIFunctionDef[]`



### toFunction

Convert a single endpoint (by name) to an OpenAI function definition.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The endpoint friendly name or operationId |

**Returns:** `OpenAIFunctionDef | undefined`



### toJSON

Return a compact JSON summary of all endpoints, useful for logging or REPL inspection.

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `serverUrl` | `string` | The base server URL derived from options, normalizing the openapi.json suffix |
| `specUrl` | `string` | The URL that will be fetched for the spec document |
| `spec` | `any` | The raw spec object. Null before load() is called. |
| `endpoints` | `EndpointInfo[]` | All parsed endpoints as an array |
| `endpointNames` | `string[]` | All endpoint friendly names |
| `endpointsByTag` | `Record<string, EndpointInfo[]>` | Map of endpoints grouped by tag |

## Events (Zod v4 schema)

### loaded

Event emitted by OpenAPI



## Examples

**features.openapi**

```ts
const api = container.feature('openapi', { url: 'https://petstore.swagger.io/v2' })
await api.load()

// Inspect all endpoints
api.endpoints

// Get a single endpoint by its friendly name
api.endpoint('getPetById')

// Convert to OpenAI tool definitions
api.toTools()

// Convert a single endpoint to a function definition
api.toFunction('getPetById')
```

