# Speech (features.speech)

Speech helper

## Usage

```ts
container.feature('speech')
```

## Methods

### loadVoices

**Returns:** `void`



### setDefaultVoice

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | Parameter name |

**Returns:** `void`



### cancel

**Returns:** `void`



### say

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | Parameter text |
| `options` | `{ voice?: Voice }` |  | Parameter options |

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `voices` | `any` | Returns the array of available speech synthesis voices. |
| `defaultVoice` | `any` | Returns the Voice object matching the currently selected default voice name. |