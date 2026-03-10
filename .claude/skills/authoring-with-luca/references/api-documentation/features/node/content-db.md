# ContentDb (features.contentDb)

Provides access to a Contentbase Collection for a folder of structured markdown files. Models are defined in the collection's models.ts file and auto-discovered on load. This feature is a thin wrapper that manages the collection lifecycle and provides convenience accessors for models and documents.

## Usage

```ts
container.feature('contentDb', {
  // Root directory path containing the structured markdown collection
  rootPath,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `rootPath` | `string` | Root directory path containing the structured markdown collection |

## Methods

### query

Query documents belonging to a specific model definition.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `model` | `T` | ✓ | The model definition to query against |

**Returns:** `void`

```ts
const contentDb = container.feature('contentDb', { rootPath: './docs' })
await contentDb.load()
const articles = await contentDb.query(contentDb.models.Article).fetchAll()
```



### parseMarkdownAtPath

Parse a markdown file at the given path without loading the full collection.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✓ | Absolute or relative path to the markdown file |

**Returns:** `void`

```ts
const doc = contentDb.parseMarkdownAtPath('./docs/getting-started.md')
console.log(doc.frontmatter, doc.content)
```



### load

Load the collection, discovering models from models.ts and parsing all documents.

**Returns:** `Promise<ContentDb>`

```ts
const contentDb = container.feature('contentDb', { rootPath: './docs' })
await contentDb.load()
console.log(contentDb.isLoaded) // true
```



### reload

Force-reload the collection from disk, picking up new/changed/deleted documents.

**Returns:** `Promise<ContentDb>`



### read

Read a single document by its path ID, optionally filtering to specific sections. The document title (H1) is always included in the output. When using `include`, the leading content (paragraphs between the H1 and first H2) is also included by default, controlled by the `leadingContent` option. When `include` is provided, only those sections are returned (via extractSections in flat mode). When `exclude` is provided, those sections are removed from the full document. If both are set, `include` takes precedence.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `idStringOrObject` | `string | { id: string }` | ✓ | Document path ID string, or an object with an `id` property |
| `options` | `{ exclude?: string[], include?: string[], meta?: boolean, leadingContent?: boolean }` |  | Optional filtering and formatting options |

`{ exclude?: string[], include?: string[], meta?: boolean, leadingContent?: boolean }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `include` | `any` | Only return sections matching these heading names |
| `exclude` | `any` | Remove sections matching these heading names |
| `meta` | `any` | Whether to include YAML frontmatter in the output (default: false) |
| `leadingContent` | `any` | Include content between the H1 and first H2 when using include filter (default: true) |

**Returns:** `Promise<string>`

```ts
await contentDb.read('guides/intro')
await contentDb.read('guides/intro', { include: ['Installation', 'Usage'] })
await contentDb.read('guides/intro', { exclude: ['Changelog'], meta: true })
await contentDb.read('guides/intro', { include: ['API'], leadingContent: false })
```



### readMultiple

Read multiple documents by their path IDs, concatenated into a single string. By default each document is wrapped in `<!-- BEGIN: id -->` / `<!-- END: id -->` dividers for easy identification. Supports the same filtering options as {@link read}.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | `string[] | { id: string }[]` | ✓ | Array of document path ID strings or objects with `id` properties |
| `options` | `{ exclude?: string[], include?: string[], meta?: boolean, leadingContent?: boolean, dividers?: boolean }` |  | Optional filtering and formatting options (applied to each document) |

`{ exclude?: string[], include?: string[], meta?: boolean, leadingContent?: boolean, dividers?: boolean }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `dividers` | `any` | Wrap each document in BEGIN/END comment dividers showing the ID (default: true) |

**Returns:** `Promise<string>`

```ts
await contentDb.readMultiple(['guides/intro', 'guides/setup'])
await contentDb.readMultiple([{ id: 'guides/intro' }], { include: ['Overview'], dividers: false })
```



### generateTableOfContents

**Returns:** `void`



### generateModelSummary

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `any` | ✓ | Parameter options |

**Returns:** `void`



### search

BM25 keyword search across indexed documents. If no search index exists, throws with an actionable message.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✓ | Parameter query |
| `options` | `{ limit?: number; model?: string; where?: Record<string, any> }` |  | Parameter options |

**Returns:** `void`



### vectorSearch

Vector similarity search using embeddings. Finds conceptually related documents even without keyword matches.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✓ | Parameter query |
| `options` | `{ limit?: number; model?: string; where?: Record<string, any> }` |  | Parameter options |

**Returns:** `void`



### hybridSearch

Combined keyword + semantic search with Reciprocal Rank Fusion. Best for general questions about the collection.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✓ | Parameter query |
| `options` | `{ limit?: number; model?: string; where?: Record<string, any>; ftsWeight?: number; vecWeight?: number }` |  | Parameter options |

**Returns:** `void`



### buildSearchIndex

Build the search index from all documents in the collection. Chunks documents and generates embeddings.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ force?: boolean; embeddingProvider?: string; embeddingModel?: string; onProgress?: (indexed: number, total: number) => void }` |  | Parameter options |

**Returns:** `void`



### rebuildSearchIndex

Rebuild the entire search index from scratch.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ embeddingProvider?: string; embeddingModel?: string; onProgress?: (indexed: number, total: number) => void }` |  | Parameter options |

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `isLoaded` | `any` | Whether the content database has been loaded. |
| `collection` | `any` | Returns the lazily-initialized Collection instance for the configured rootPath. |
| `collectionPath` | `any` | Returns the absolute resolved path to the collection root directory. |
| `models` | `Record<string, ModelDefinition>` | Returns an object mapping model names to their model definitions, sourced from the collection. |
| `modelNames` | `string[]` | Returns an array of all registered model names from the collection. |
| `searchIndexStatus` | `any` | Get the current search index status. |
| `queries` | `Record<string, ReturnType<typeof this.query>>` | Returns an object with query builders keyed by model name (singular and plural, lowercased). Provides a convenient shorthand for querying without looking up model definitions manually. |

## Events (Zod v4 schema)

### reloaded

Event emitted by ContentDb



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `loaded` | `boolean` | Whether the content collection has been loaded and parsed |
| `tableOfContents` | `string` | Generated table of contents string for the collection |
| `modelSummary` | `string` | Summary of all discovered content models and their document counts |

## Examples

**features.contentDb**

```ts
const contentDb = container.feature('contentDb', { rootPath: './docs' })
await contentDb.load()
console.log(contentDb.modelNames) // ['Article', 'Page', ...]
```



**query**

```ts
const contentDb = container.feature('contentDb', { rootPath: './docs' })
await contentDb.load()
const articles = await contentDb.query(contentDb.models.Article).fetchAll()
```



**parseMarkdownAtPath**

```ts
const doc = contentDb.parseMarkdownAtPath('./docs/getting-started.md')
console.log(doc.frontmatter, doc.content)
```



**load**

```ts
const contentDb = container.feature('contentDb', { rootPath: './docs' })
await contentDb.load()
console.log(contentDb.isLoaded) // true
```



**read**

```ts
await contentDb.read('guides/intro')
await contentDb.read('guides/intro', { include: ['Installation', 'Usage'] })
await contentDb.read('guides/intro', { exclude: ['Changelog'], meta: true })
await contentDb.read('guides/intro', { include: ['API'], leadingContent: false })
```



**readMultiple**

```ts
await contentDb.readMultiple(['guides/intro', 'guides/setup'])
await contentDb.readMultiple([{ id: 'guides/intro' }], { include: ['Overview'], dividers: false })
```



**queries**

```ts
const contentDb = container.feature('contentDb', { rootPath: './docs' })
await contentDb.load()
const allArticles = await contentDb.queries.articles.fetchAll()
const firstTask = await contentDb.queries.task.first()
```

