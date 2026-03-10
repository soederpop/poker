# Helpers (features.helpers)

The Helpers feature discovers and loads project-level helpers from a JSON manifest served over HTTP. Scripts are injected via AssetLoader and self-register into the container's registries. This is the web equivalent of the node Helpers feature, which scans the filesystem. Instead of filesystem scanning, this feature fetches a manifest from a well-known URL and uses AssetLoader.loadScript() to inject each helper's script tag.

## Usage

```ts
container.feature('helpers', {
  // Root directory to scan for helper folders. Defaults to container.cwd
  rootDir,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `rootDir` | `string` | Root directory to scan for helper folders. Defaults to container.cwd |

## Methods

### setManifestURL

Set a new manifest URL. Invalidates any cached manifest.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` | ✓ | The new URL to fetch the manifest from |

**Returns:** `void`



### discover

Discover and register helpers of the given type from the manifest. Fetches the manifest, then for each entry of the requested type, loads the script via AssetLoader and checks what got newly registered.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `RegistryType` | ✓ | Which type of helpers to discover ('features' or 'clients') |

**Returns:** `Promise<string[]>`



### discoverAll

Discover all helper types from the manifest.

**Returns:** `Promise<Record<string, string[]>>`



### discoverFeatures

Convenience method to discover only features.

**Returns:** `Promise<string[]>`



### discoverClients

Convenience method to discover only clients.

**Returns:** `Promise<string[]>`



### lookup

Look up a helper class by type and name.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `RegistryType` | ✓ | The registry type |
| `name` | `string` | ✓ | The helper name within that registry |

**Returns:** `any`



### describe

Get the introspection description for a specific helper.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `RegistryType` | ✓ | The registry type |
| `name` | `string` | ✓ | The helper name |

**Returns:** `string`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `manifestURL` | `string` | The URL to fetch the helpers manifest from. |
| `available` | `Record<string, string[]>` | Returns a unified view of all available helpers across all registries. Each key is a registry type, each value is the list of helper names in that registry. |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `discovered` | `object` | Which registry types have been discovered |
| `registered` | `array` | Names of project-level helpers that were discovered (type.name) |

## Examples

**features.helpers**

```ts
const helpers = container.feature('helpers', { enable: true })

// Discover all helper types from the manifest
await helpers.discoverAll()

// Discover a specific type
await helpers.discover('features')

// Unified view of all available helpers
console.log(helpers.available)
```

