# GoogleDocs (features.googleDocs)

Google Docs feature for reading documents and converting them to Markdown. Depends on googleAuth for authentication and optionally googleDrive for listing docs. The markdown converter handles headings, text formatting, links, lists, tables, and images.

## Usage

```ts
container.feature('googleDocs')
```

## Methods

### getDocument

Get the raw document structure from the Docs API.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `documentId` | `string` | ✓ | The Google Docs document ID |

**Returns:** `Promise<docs_v1.Schema$Document>`



### getAsMarkdown

Read a Google Doc and convert it to Markdown. Handles headings, bold/italic/strikethrough, links, code fonts, ordered/unordered lists with nesting, tables, images, and section breaks.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `documentId` | `string` | ✓ | The Google Docs document ID |

**Returns:** `Promise<string>`



### getAsText

Read a Google Doc as plain text (strips all formatting).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `documentId` | `string` | ✓ | The Google Docs document ID |

**Returns:** `Promise<string>`



### saveAsMarkdown

Download a Google Doc as Markdown and save to a local file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `documentId` | `string` | ✓ | The Google Docs document ID |
| `localPath` | `string` | ✓ | Local file path (resolved relative to container cwd) |

**Returns:** `Promise<string>`



### listDocs

List Google Docs in Drive (filters by Docs MIME type).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` |  | Optional additional Drive search query |
| `options` | `{ pageSize?: number; pageToken?: string }` |  | Pagination options |

**Returns:** `Promise<DriveFile[]>`



### searchDocs

Search for Google Docs by name or content.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `term` | `string` | ✓ | Search term |

**Returns:** `Promise<DriveFile[]>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `auth` | `GoogleAuth` | Access the google-auth feature lazily. |
| `drive` | `GoogleDrive` | Access the google-drive feature lazily. |

## Events (Zod v4 schema)

### documentFetched

Event emitted by GoogleDocs



### error

Event emitted by GoogleDocs



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `lastDocId` | `string` | Last document ID accessed |
| `lastDocTitle` | `string` | Title of the last document accessed |
| `lastError` | `string` | Last Docs API error message |

## Examples

**features.googleDocs**

```ts
const docs = container.feature('googleDocs')

// Get a doc as markdown
const markdown = await docs.getAsMarkdown('1abc_document_id')

// Save to file
await docs.saveAsMarkdown('1abc_document_id', './output/doc.md')

// List all Google Docs in Drive
const allDocs = await docs.listDocs()

// Get raw document structure
const rawDoc = await docs.getDocument('1abc_document_id')

// Plain text extraction
const text = await docs.getAsText('1abc_document_id')
```

