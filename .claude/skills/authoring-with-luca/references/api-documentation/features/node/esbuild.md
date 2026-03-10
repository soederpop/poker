# Esbuild (features.esbuild)

Esbuild helper

## Usage

```ts
container.feature('esbuild')
```

## Methods

### compile

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | `string` | ✓ | Parameter code |
| `options` | `esbuild.TransformOptions` |  | Parameter options |

**Returns:** `void`



### clearCache

**Returns:** `void`



### start

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `assetLoader` | `any` | Returns the assetLoader feature for loading external libraries from unpkg. |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |

## Examples

**features.esbuild**

```ts
const esbuild = container.feature('esbuild')
const result = esbuild.transformSync('const x: number = 1')
console.log(result.code) // 'const x = 1;\n'
```

