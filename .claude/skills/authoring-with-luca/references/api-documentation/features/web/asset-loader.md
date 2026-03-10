# AssetLoader (features.assetLoader)

The AssetLoader provides an API for injecting scripts and stylesheets into the page. It also provides a convenient way of loading any library from unpkg.com

## Usage

```ts
container.feature('assetLoader')
```

## Methods

### removeStylesheet

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `href` | `string` | ✓ | Parameter href |

**Returns:** `void`



### loadScript

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` | ✓ | Parameter url |

**Returns:** `Promise<void>`



### unpkg

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `packageName` | `string` | ✓ | Parameter packageName |
| `globalName` | `string` | ✓ | Parameter globalName |

**Returns:** `Promise<any>`

