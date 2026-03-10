# OpenAIClient (clients.openai)

No description provided

## Usage

```ts
container.client('openai', {
  // Base URL for the client connection
  baseURL,
  // Whether to automatically parse responses as JSON
  json,
  // OpenAI API key (falls back to OPENAI_API_KEY env var)
  apiKey,
  // OpenAI organization ID
  organization,
  // OpenAI project ID
  project,
  // Allow usage in browser environments
  dangerouslyAllowBrowser,
  // Default model for completions (default: gpt-4o)
  defaultModel,
  // Request timeout in milliseconds
  timeout,
  // Maximum number of retries on failure
  maxRetries,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for the client connection |
| `json` | `boolean` | Whether to automatically parse responses as JSON |
| `apiKey` | `string` | OpenAI API key (falls back to OPENAI_API_KEY env var) |
| `organization` | `string` | OpenAI organization ID |
| `project` | `string` | OpenAI project ID |
| `dangerouslyAllowBrowser` | `boolean` | Allow usage in browser environments |
| `defaultModel` | `string` | Default model for completions (default: gpt-4o) |
| `timeout` | `number` | Request timeout in milliseconds |
| `maxRetries` | `number` | Maximum number of retries on failure |

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
| `requestCount` | `number` | Total number of API requests made |
| `lastRequestTime` | `any` | Timestamp of the last API request |
| `tokenUsage` | `object` | Cumulative token usage across all requests |

## Environment Variables

- `OPENAI_API_KEY`