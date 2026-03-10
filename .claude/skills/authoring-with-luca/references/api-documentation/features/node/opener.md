# Opener (features.opener)

The Opener feature opens files, URLs, desktop applications, and code editors. HTTP/HTTPS URLs are opened in Google Chrome. Desktop apps can be launched by name. VS Code and Cursor can be opened to a specific path. All other paths are opened with the platform's default handler (e.g. Preview for images, Finder for folders).

## Usage

```ts
container.feature('opener')
```

## Methods

### open

Opens a path or URL with the appropriate application. HTTP and HTTPS URLs are opened in Google Chrome. Everything else is opened with the system default handler via `open` (macOS).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `target` | `string` | ✓ | A URL or file path to open |

**Returns:** `Promise<void>`



### app

Opens a desktop application by name. On macOS, uses `open -a` to launch the app. On Windows, uses `start`. On Linux, attempts to run the lowercase app name as a command.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The application name (e.g. "Slack", "Finder", "Safari") |

**Returns:** `Promise<void>`



### code

Opens VS Code at the specified path. Uses the `code` CLI command. Falls back to `open -a "Visual Studio Code"` on macOS.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` |  | The file or folder path to open |

**Returns:** `Promise<void>`



### cursor

Opens Cursor at the specified path. Uses the `cursor` CLI command. Falls back to `open -a "Cursor"` on macOS.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` |  | The file or folder path to open |

**Returns:** `Promise<void>`



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |

## Examples

**features.opener**

```ts
const opener = container.feature('opener')

// Open a URL in Chrome
await opener.open('https://www.google.com')

// Open a file with the default application
await opener.open('/path/to/image.png')

// Open a desktop application
await opener.app('Slack')

// Open VS Code at a project path
await opener.code('/Users/jon/projects/my-app')

// Open Cursor at a project path
await opener.cursor('/Users/jon/projects/my-app')
```

