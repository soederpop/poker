# FileManager (features.fileManager)

The FileManager feature creates a database like index of all of the files in the project, and provides metadata about these files, and also provides a way to watch for changes to the files.

## Usage

```ts
container.feature('fileManager', {
  // Glob patterns to exclude from file scanning
  exclude,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `exclude` | `any` | Glob patterns to exclude from file scanning |

## Methods

### match

Matches the file IDs against the pattern(s) provided

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `patterns` | `string | string[]` | ✓ | The patterns to match against the file IDs |

**Returns:** `void`



### matchFiles

Matches the file IDs against the pattern(s) provided and returns the file objects for each.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `patterns` | `string | string[]` | ✓ | The patterns to match against the file IDs |

**Returns:** `void`



### start

Starts the file manager and scans the files in the project.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ exclude?: string | string[] }` |  | Options for the file manager |

`{ exclude?: string | string[] }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `exclude` | `any` | The patterns to exclude from the scan |

**Returns:** `void`



### scanFiles

Scans the files in the project and updates the file manager state.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ exclude?: string | string[] }` |  | Options for the file manager |

`{ exclude?: string | string[] }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `exclude` | `any` | The patterns to exclude from the scan |

**Returns:** `void`



### watch

Watches the files in the project and updates the file manager state.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ exclude?: string | string[] }` |  | Options for the file manager |

`{ exclude?: string | string[] }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `exclude` | `any` | The patterns to exclude from the watch |

**Returns:** `void`



### stopWatching

**Returns:** `void`



### updateFile

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | Parameter path |

**Returns:** `void`



### removeFile

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | Parameter path |

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `fileIds` | `any` | Returns an array of all relative file paths indexed by the file manager. |
| `fileObjects` | `any` | Returns an array of all file metadata objects indexed by the file manager. |
| `directoryIds` | `any` | Returns the directory IDs for all of the files in the project. |
| `uniqueExtensions` | `any` | Returns an array of unique file extensions found across all indexed files. |
| `isStarted` | `any` | Whether the file manager has completed its initial scan. |
| `isStarting` | `any` | Whether the file manager is currently performing its initial scan. |
| `isWatching` | `any` | Whether the file watcher is actively monitoring for changes. |
| `watchedFiles` | `Record<string, string[]>` | Returns the directories and files currently being watched by chokidar. |

## Events (Zod v4 schema)

### file:change

Event emitted by FileManager



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `started` | `boolean` | Whether the file manager has completed its initial scan |
| `starting` | `boolean` | Whether the file manager is currently scanning files |
| `watching` | `boolean` | Whether the file watcher is actively monitoring for changes |
| `failed` | `boolean` | Whether the initial file scan failed |

## Examples

**features.fileManager**

```ts
const fileManager = container.feature('fileManager')
await fileManager.start()

const fileIds = fileManager.fileIds
const typescriptFiles = fileManager.matchFiles("**ts")
```

