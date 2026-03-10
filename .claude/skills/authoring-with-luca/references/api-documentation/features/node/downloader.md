# Downloader (features.downloader)

A feature that provides file downloading capabilities from URLs. The Downloader feature allows you to fetch files from remote URLs and save them to the local filesystem. It handles the network request, buffering, and file writing operations automatically.

## Usage

```ts
container.feature('downloader')
```

## Methods

### download

Downloads a file from a URL and saves it to the specified local path. This method fetches the file from the provided URL, converts it to a buffer, and writes it to the filesystem at the target path. The target path is resolved relative to the container's configured paths.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` | ✓ | The URL to download the file from. Must be a valid HTTP/HTTPS URL. |
| `targetPath` | `string` | ✓ | The local file path where the downloaded file should be saved. |

**Returns:** `void`

```ts
// Download an image file
const imagePath = await downloader.download(
 'https://example.com/photo.jpg',
 'images/downloaded-photo.jpg'
)

// Download a document
const docPath = await downloader.download(
 'https://api.example.com/files/document.pdf',
 'documents/report.pdf'
)
```



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |

## Examples

**features.downloader**

```ts
// Enable the downloader feature
const downloader = container.feature('downloader')

// Download a file
const localPath = await downloader.download(
 'https://example.com/image.jpg',
 'downloads/image.jpg'
)
console.log(`File saved to: ${localPath}`)
```



**download**

```ts
// Download an image file
const imagePath = await downloader.download(
 'https://example.com/photo.jpg',
 'images/downloaded-photo.jpg'
)

// Download a document
const docPath = await downloader.download(
 'https://api.example.com/files/document.pdf',
 'documents/report.pdf'
)
```

