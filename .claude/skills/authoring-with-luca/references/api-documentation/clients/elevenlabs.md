# ElevenLabsClient (clients.elevenlabs)

No description provided

## Usage

```ts
container.client('elevenlabs', {
  // Base URL for the client connection
  baseURL,
  // Whether to automatically parse responses as JSON
  json,
  // ElevenLabs API key (falls back to ELEVENLABS_API_KEY env var)
  apiKey,
  // Default voice ID for speech synthesis
  defaultVoiceId,
  // Default TTS model ID
  defaultModelId,
  // Audio output format (e.g. mp3_44100_128, pcm_16000)
  outputFormat,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for the client connection |
| `json` | `boolean` | Whether to automatically parse responses as JSON |
| `apiKey` | `string` | ElevenLabs API key (falls back to ELEVENLABS_API_KEY env var) |
| `defaultVoiceId` | `string` | Default voice ID for speech synthesis |
| `defaultModelId` | `string` | Default TTS model ID |
| `outputFormat` | `string` | Audio output format (e.g. mp3_44100_128, pcm_16000) |

## Events (Zod v4 schema)

### failure

Emitted when a request fails

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `any` | The error object |



### speech

Emitted after speech synthesis completes

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `object` |  |



### voices

Emitted after listing voices

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `array` |  |



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | Whether the client is currently connected |
| `requestCount` | `number` | Total number of API requests made |
| `characterCount` | `number` | Total characters sent for synthesis (tracks billing usage) |
| `lastRequestTime` | `any` | Timestamp of the last API request |

## Environment Variables

- `ELEVENLABS_API_KEY`