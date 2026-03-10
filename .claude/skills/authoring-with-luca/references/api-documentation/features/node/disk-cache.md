# DiskCache (features.diskCache)

File-backed key-value cache built on top of the cacache library (the same store that powers npm). Suitable for persisting arbitrary data including very large blobs when necessary, with optional encryption support.

## Usage

```ts
container.feature('diskCache')
```

## Methods

### saveFile

Retrieve a file from the disk cache and save it to the local disk

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | ✓ | The cache key to retrieve |
| `outputPath` | `string` | ✓ | The local path where the file should be saved |
| `isBase64` | `any` |  | Whether the cached content is base64 encoded |

**Returns:** `void`

```ts
await diskCache.saveFile('myFile', './output/file.txt')
await diskCache.saveFile('encodedImage', './images/photo.jpg', true)
```



### ensure

Ensure a key exists in the cache, setting it with the provided content if it doesn't exist

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | ✓ | The cache key to check/set |
| `content` | `string` | ✓ | The content to set if the key doesn't exist |

**Returns:** `void`

```ts
await diskCache.ensure('config', JSON.stringify(defaultConfig))
```



### copy

Copy a cached item from one key to another

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `source` | `string` | ✓ | The source cache key |
| `destination` | `string` | ✓ | The destination cache key |
| `overwrite` | `boolean` |  | Whether to overwrite if destination exists (default: false) |

**Returns:** `void`

```ts
await diskCache.copy('original', 'backup')
await diskCache.copy('file1', 'file2', true) // force overwrite
```



### move

Move a cached item from one key to another (copy then delete source)

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `source` | `string` | ✓ | The source cache key |
| `destination` | `string` | ✓ | The destination cache key |
| `overwrite` | `boolean` |  | Whether to overwrite if destination exists (default: false) |

**Returns:** `void`

```ts
await diskCache.move('temp', 'permanent')
await diskCache.move('old_key', 'new_key', true) // force overwrite
```



### has

Check if a key exists in the cache

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | ✓ | The cache key to check |

**Returns:** `void`

```ts
if (await diskCache.has('myKey')) {
 console.log('Key exists!')
}
```



### get

Retrieve a value from the cache

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | ✓ | The cache key to retrieve |
| `json` | `any` |  | Whether to parse the value as JSON (default: false) |

**Returns:** `void`

```ts
const text = await diskCache.get('myText')
const data = await diskCache.get('myData', true) // parse as JSON
```



### set

Store a value in the cache

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | ✓ | The cache key to store under |
| `value` | `any` | ✓ | The value to store (string, object, or any serializable data) |
| `meta` | `any` |  | Optional metadata to associate with the cached item |

**Returns:** `void`

```ts
await diskCache.set('myKey', 'Hello World')
await diskCache.set('userData', { name: 'John', age: 30 })
await diskCache.set('file', content, { size: 1024, type: 'image' })
```



### rm

Remove a cached item

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | ✓ | The cache key to remove |

**Returns:** `void`

```ts
await diskCache.rm('obsoleteKey')
```



### clearAll

Clear all cached items

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `confirm` | `any` |  | Must be set to true to confirm the operation |

**Returns:** `void`

```ts
await diskCache.clearAll(true) // Must explicitly confirm
```



### keys

Get all cache keys

**Returns:** `Promise<string[]>`

```ts
const allKeys = await diskCache.keys()
console.log(`Cache contains ${allKeys.length} items`)
```



### listKeys

List all cache keys (alias for keys())

**Returns:** `Promise<string[]>`

```ts
const keyList = await diskCache.listKeys()
```



### create

Create a cacache instance with the specified path

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` |  | Optional cache directory path (defaults to options.path or node_modules/.cache/luca-disk-cache) |

**Returns:** `void`

```ts
const customCache = diskCache.create('/custom/cache/path')
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `cache` | `any` | Returns the underlying cacache instance configured with the cache directory path. |
| `securely` | `any` | Get encrypted cache operations interface Requires encryption to be enabled and a secret to be provided |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |

## Examples

**features.diskCache**

```ts
const diskCache = container.feature('diskCache', { path: '/tmp/cache' })
await diskCache.set('greeting', 'Hello World')
const value = await diskCache.get('greeting')
```



**saveFile**

```ts
await diskCache.saveFile('myFile', './output/file.txt')
await diskCache.saveFile('encodedImage', './images/photo.jpg', true)
```



**ensure**

```ts
await diskCache.ensure('config', JSON.stringify(defaultConfig))
```



**copy**

```ts
await diskCache.copy('original', 'backup')
await diskCache.copy('file1', 'file2', true) // force overwrite
```



**move**

```ts
await diskCache.move('temp', 'permanent')
await diskCache.move('old_key', 'new_key', true) // force overwrite
```



**has**

```ts
if (await diskCache.has('myKey')) {
 console.log('Key exists!')
}
```



**get**

```ts
const text = await diskCache.get('myText')
const data = await diskCache.get('myData', true) // parse as JSON
```



**set**

```ts
await diskCache.set('myKey', 'Hello World')
await diskCache.set('userData', { name: 'John', age: 30 })
await diskCache.set('file', content, { size: 1024, type: 'image' })
```



**rm**

```ts
await diskCache.rm('obsoleteKey')
```



**clearAll**

```ts
await diskCache.clearAll(true) // Must explicitly confirm
```



**keys**

```ts
const allKeys = await diskCache.keys()
console.log(`Cache contains ${allKeys.length} items`)
```



**listKeys**

```ts
const keyList = await diskCache.listKeys()
```



**create**

```ts
const customCache = diskCache.create('/custom/cache/path')
```



**securely**

```ts
// Initialize with encryption
const cache = container.feature('diskCache', { 
 encrypt: true, 
 secret: Buffer.from('my-secret-key') 
})

// Use encrypted operations
await cache.securely.set('sensitive', 'secret data')
const decrypted = await cache.securely.get('sensitive')
```

