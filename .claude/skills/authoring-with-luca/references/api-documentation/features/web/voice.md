# VoiceRecognition (features.voice)

VoiceRecognition helper

## Usage

```ts
container.feature('voice')
```

## Methods

### whenFinished

**Returns:** `void`



### start

**Returns:** `void`



### stop

**Returns:** `void`



### abort

**Returns:** `void`



### clearTranscript

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `listening` | `any` | Whether the speech recognizer is currently listening for audio input. |
| `transcript` | `any` | Returns the accumulated final transcript text from recognition results. |

## Events (Zod v4 schema)

### start

Event emitted by VoiceRecognition



### stop

Event emitted by VoiceRecognition



### abort

Event emitted by VoiceRecognition

