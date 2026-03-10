# TTS (features.tts)

TTS feature — synthesizes text to audio files via RunPod's Chatterbox Turbo endpoint. Generates high-quality speech audio by calling the Chatterbox Turbo public endpoint on RunPod, downloads the resulting audio, and saves it locally. Supports 20 preset voices and voice cloning via a reference audio URL.

## Usage

```ts
container.feature('tts', {
  // RunPod API key (falls back to RUNPOD_API_KEY env var)
  apiKey,
  // Default preset voice name
  voice,
  // Directory to save generated audio files
  outputDir,
  // Audio output format
  format,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `apiKey` | `string` | RunPod API key (falls back to RUNPOD_API_KEY env var) |
| `voice` | `string` | Default preset voice name |
| `outputDir` | `string` | Directory to save generated audio files |
| `format` | `string` | Audio output format |

## Methods

### synthesize

Synthesize text to an audio file using Chatterbox Turbo. Calls the RunPod public endpoint, downloads the generated audio, and saves it to the output directory.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The text to synthesize into speech |
| `options` | `{
    voice?: string
    format?: 'wav' | 'flac' | 'ogg'
    voiceUrl?: string
  }` |  | Override voice, format, or provide a voiceUrl for cloning |

**Returns:** `Promise<string>`

```ts
// Use a preset voice
const path = await tts.synthesize('Good morning!', { voice: 'ethan' })

// Clone a voice from a reference audio URL
const path = await tts.synthesize('Hello world', {
 voiceUrl: 'https://example.com/reference.wav'
})
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `apiKey` | `string` | RunPod API key from options or environment. |
| `outputDir` | `string` | Directory where generated audio files are saved. |
| `voices` | `readonly string[]` | The 20 preset voice names available in Chatterbox Turbo. |

## Events (Zod v4 schema)

### synthesized

Event emitted by TTS



### error

Event emitted by TTS



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `lastFile` | `string` | Path to the last generated audio file |
| `lastText` | `string` | Text of the last synthesis request |
| `generating` | `boolean` | Whether audio is currently being generated |

## Environment Variables

- `RUNPOD_API_KEY`

## Examples

**features.tts**

```ts
const tts = container.feature('tts', { enable: true })
const path = await tts.synthesize('Hello, how are you?', { voice: 'lucy' })
console.log(`Audio saved to: ${path}`)
```



**synthesize**

```ts
// Use a preset voice
const path = await tts.synthesize('Good morning!', { voice: 'ethan' })

// Clone a voice from a reference audio URL
const path = await tts.synthesize('Hello world', {
 voiceUrl: 'https://example.com/reference.wav'
})
```

