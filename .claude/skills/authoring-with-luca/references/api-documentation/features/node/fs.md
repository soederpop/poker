# FS (features.fs)

The FS feature provides methods for interacting with the file system, relative to the container's cwd.

## Usage

```ts
container.feature('fs')
```

## Methods

### readFileAsync

Asynchronously reads a file and returns its contents as a Buffer.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The file path relative to the container's working directory |

**Returns:** `void`

```ts
const fs = container.feature('fs')
const buffer = await fs.readFileAsync('data.txt')
console.log(buffer.toString())
```



### readdir

Asynchronously reads the contents of a directory.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The directory path relative to the container's working directory |

**Returns:** `void`

```ts
const fs = container.feature('fs')
const entries = await fs.readdir('src')
console.log(entries) // ['index.ts', 'utils.ts', 'components']
```



### walk

Recursively walks a directory and returns an array of relative path names for each file and directory.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `basePath` | `string` | ✓ | The base directory path to start walking from |
| `options` | `WalkOptions` |  | Options to configure the walk behavior |

`WalkOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `directories` | `boolean` | Whether to include directories in results |
| `files` | `boolean` | Whether to include files in results |
| `exclude` | `string | string[]` | ] - Patterns to exclude from results |
| `include` | `string | string[]` | ] - Patterns to include in results |

**Returns:** `void`

```ts
const result = fs.walk('src', { files: true, directories: false })
console.log(result.files) // ['src/index.ts', 'src/utils.ts', 'src/components/Button.tsx']
```



### walkAsync

Asynchronously and recursively walks a directory and returns an array of relative path names.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `baseDir` | `string` | ✓ | The base directory path to start walking from |
| `options` | `WalkOptions` |  | Options to configure the walk behavior |

`WalkOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `directories` | `boolean` | Whether to include directories in results |
| `files` | `boolean` | Whether to include files in results |
| `exclude` | `string | string[]` | ] - Patterns to exclude from results |
| `include` | `string | string[]` | ] - Patterns to include in results |

**Returns:** `void`

```ts
const result = await fs.walkAsync('src', { exclude: ['node_modules'] })
console.log(`Found ${result.files.length} files and ${result.directories.length} directories`)
```



### ensureFileAsync

Asynchronously ensures a file exists with the specified content, creating directories as needed.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The file path where the file should be created |
| `content` | `string` | ✓ | The content to write to the file |
| `overwrite` | `any` |  | Whether to overwrite the file if it already exists |

**Returns:** `void`

```ts
await fs.ensureFileAsync('config/settings.json', '{}', true)
// Creates config directory and settings.json file with '{}' content
```



### writeFileAsync

Asynchronously writes content to a file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The file path where content should be written |
| `content` | `Buffer | string` | ✓ | The content to write to the file |

**Returns:** `void`

```ts
await fs.writeFileAsync('output.txt', 'Hello World')
await fs.writeFileAsync('data.bin', Buffer.from([1, 2, 3, 4]))
```



### appendFile

Synchronously appends content to a file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The file path to append to |
| `content` | `Buffer | string` | ✓ | The content to append |

**Returns:** `void`

```ts
fs.appendFile('log.txt', 'New line\n')
```



### appendFileAsync

Asynchronously appends content to a file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The file path to append to |
| `content` | `Buffer | string` | ✓ | The content to append |

**Returns:** `void`

```ts
await fs.appendFileAsync('log.txt', 'New line\n')
```



### ensureFolder

Synchronously ensures a directory exists, creating parent directories as needed.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The directory path to create |

**Returns:** `void`

```ts
fs.ensureFolder('logs/debug')
// Creates logs and logs/debug directories if they don't exist
```



### mkdirp

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `folder` | `string` | ✓ | Parameter folder |

**Returns:** `void`



### ensureFile

Synchronously ensures a file exists with the specified content, creating directories as needed.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The file path where the file should be created |
| `content` | `string` | ✓ | The content to write to the file |
| `overwrite` | `any` |  | Whether to overwrite the file if it already exists |

**Returns:** `void`

```ts
fs.ensureFile('logs/app.log', '', false)
// Creates logs directory and app.log file if they don't exist
```



### findUp

Synchronously finds a file by walking up the directory tree from the current working directory.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fileName` | `string` | ✓ | The name of the file to search for |
| `options` | `{ cwd?: string }` |  | Options for the search |

`{ cwd?: string }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `cwd` | `any` | The directory to start searching from (defaults to container.cwd) |

**Returns:** `string | null`

```ts
const packageJson = fs.findUp('package.json')
if (packageJson) {
 console.log(`Found package.json at: ${packageJson}`)
}
```



### existsAsync

Asynchronously checks if a file or directory exists.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The path to check for existence |

**Returns:** `void`

```ts
if (await fs.existsAsync('config.json')) {
 console.log('Config file exists!')
}
```



### exists

Synchronously checks if a file or directory exists.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The path to check for existence |

**Returns:** `boolean`

```ts
if (fs.exists('config.json')) {
 console.log('Config file exists!')
}
```



### existsSync

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | Parameter path |

**Returns:** `boolean`



### rm

Asynchronously removes a file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The path of the file to remove |

**Returns:** `void`

```ts
await fs.rm('temp/cache.tmp')
```



### readJson

Synchronously reads and parses a JSON file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The path to the JSON file |

**Returns:** `void`

```ts
const config = fs.readJson('config.json')
console.log(config.version)
```



### readFile

Synchronously reads a file and returns its contents as a string.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | The path to the file |

**Returns:** `void`

```ts
const content = fs.readFile('README.md')
console.log(content)
```



### rmdir

Asynchronously removes a directory and all its contents.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dirPath` | `string` | ✓ | The path of the directory to remove |

**Returns:** `void`

```ts
await fs.rmdir('temp/cache')
// Removes the cache directory and all its contents
```



### findUpAsync

Asynchronously finds a file by walking up the directory tree.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fileName` | `string` | ✓ | The name of the file to search for |
| `options` | `{ cwd?: string; multiple?: boolean }` |  | Options for the search |

`{ cwd?: string; multiple?: boolean }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `cwd` | `any` | The directory to start searching from (defaults to container.cwd) |
| `multiple` | `any` | Whether to find multiple instances of the file |

**Returns:** `Promise<string | string[] | null>`

```ts
const packageJson = await fs.findUpAsync('package.json')
const allPackageJsons = await fs.findUpAsync('package.json', { multiple: true })
```



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |

## Examples

**features.fs**

```ts
const fs = container.feature('fs')
const content = fs.readFile('package.json')
const exists = fs.exists('tsconfig.json')
await fs.ensureFileAsync('output/result.json', '{}')
```



**readFileAsync**

```ts
const fs = container.feature('fs')
const buffer = await fs.readFileAsync('data.txt')
console.log(buffer.toString())
```



**readdir**

```ts
const fs = container.feature('fs')
const entries = await fs.readdir('src')
console.log(entries) // ['index.ts', 'utils.ts', 'components']
```



**walk**

```ts
const result = fs.walk('src', { files: true, directories: false })
console.log(result.files) // ['src/index.ts', 'src/utils.ts', 'src/components/Button.tsx']
```



**walkAsync**

```ts
const result = await fs.walkAsync('src', { exclude: ['node_modules'] })
console.log(`Found ${result.files.length} files and ${result.directories.length} directories`)
```



**ensureFileAsync**

```ts
await fs.ensureFileAsync('config/settings.json', '{}', true)
// Creates config directory and settings.json file with '{}' content
```



**writeFileAsync**

```ts
await fs.writeFileAsync('output.txt', 'Hello World')
await fs.writeFileAsync('data.bin', Buffer.from([1, 2, 3, 4]))
```



**appendFile**

```ts
fs.appendFile('log.txt', 'New line\n')
```



**appendFileAsync**

```ts
await fs.appendFileAsync('log.txt', 'New line\n')
```



**ensureFolder**

```ts
fs.ensureFolder('logs/debug')
// Creates logs and logs/debug directories if they don't exist
```



**ensureFile**

```ts
fs.ensureFile('logs/app.log', '', false)
// Creates logs directory and app.log file if they don't exist
```



**findUp**

```ts
const packageJson = fs.findUp('package.json')
if (packageJson) {
 console.log(`Found package.json at: ${packageJson}`)
}
```



**existsAsync**

```ts
if (await fs.existsAsync('config.json')) {
 console.log('Config file exists!')
}
```



**exists**

```ts
if (fs.exists('config.json')) {
 console.log('Config file exists!')
}
```



**rm**

```ts
await fs.rm('temp/cache.tmp')
```



**readJson**

```ts
const config = fs.readJson('config.json')
console.log(config.version)
```



**readFile**

```ts
const content = fs.readFile('README.md')
console.log(content)
```



**rmdir**

```ts
await fs.rmdir('temp/cache')
// Removes the cache directory and all its contents
```



**findUpAsync**

```ts
const packageJson = await fs.findUpAsync('package.json')
const allPackageJsons = await fs.findUpAsync('package.json', { multiple: true })
```

