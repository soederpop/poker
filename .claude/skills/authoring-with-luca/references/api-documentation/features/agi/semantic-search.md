# SemanticSearch (features.semanticSearch)

No description provided

## Usage

```ts
container.feature('semanticSearch', {
  // Path to the SQLite database file
  dbPath,
  // GGUF model name
  embeddingModel,
  // Where to generate embeddings
  embeddingProvider,
  // How to split documents
  chunkStrategy,
  // Token limit per chunk for fixed strategy
  chunkSize,
  // Overlap ratio for fixed strategy
  chunkOverlap,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `dbPath` | `string` | Path to the SQLite database file |
| `embeddingModel` | `string` | GGUF model name |
| `embeddingProvider` | `string` | Where to generate embeddings |
| `chunkStrategy` | `string` | How to split documents |
| `chunkSize` | `number` | Token limit per chunk for fixed strategy |
| `chunkOverlap` | `number` | Overlap ratio for fixed strategy |

## Methods

### initDb

**Returns:** `Promise<void>`



### insertDocument

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `doc` | `DocumentInput` | ✓ | Parameter doc |

`DocumentInput` properties:

| Property | Type | Description |
|----------|------|-------------|
| `pathId` | `string` |  |
| `model` | `string` |  |
| `title` | `string` |  |
| `slug` | `string` |  |
| `meta` | `Record<string, any>` |  |
| `content` | `string` |  |
| `sections` | `Array<{ heading: string; headingPath: string; content: string; level: number }>` |  |

**Returns:** `void`



### insertChunk

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `chunk` | `Chunk` | ✓ | Parameter chunk |

`Chunk` properties:

| Property | Type | Description |
|----------|------|-------------|
| `pathId` | `string` |  |
| `section` | `string` |  |
| `headingPath` | `string` |  |
| `seq` | `number` |  |
| `content` | `string` |  |
| `contentHash` | `string` |  |
| `embedding` | `Float32Array` | ✓ | Parameter embedding |

**Returns:** `void`



### removeDocument

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pathId` | `string` | ✓ | Parameter pathId |

**Returns:** `void`



### getStats

**Returns:** `IndexStatus`



### embed

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `texts` | `string[]` | ✓ | Parameter texts |

**Returns:** `Promise<number[][]>`



### ensureModel

**Returns:** `Promise<void>`



### disposeModel

**Returns:** `Promise<void>`



### getDimensions

**Returns:** `number`



### chunkDocument

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `doc` | `DocumentInput` | ✓ | Parameter doc |

`DocumentInput` properties:

| Property | Type | Description |
|----------|------|-------------|
| `pathId` | `string` |  |
| `model` | `string` |  |
| `title` | `string` |  |
| `slug` | `string` |  |
| `meta` | `Record<string, any>` |  |
| `content` | `string` |  |
| `sections` | `Array<{ heading: string; headingPath: string; content: string; level: number }>` |  |
| `strategy` | `'section' | 'fixed' | 'document'` |  | Parameter strategy |

**Returns:** `Chunk[]`



### search

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✓ | Parameter query |
| `options` | `SearchOptions` |  | Parameter options |

`SearchOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `limit` | `number` |  |
| `model` | `string` |  |
| `where` | `Record<string, any>` |  |

**Returns:** `Promise<SearchResult[]>`



### vectorSearch

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✓ | Parameter query |
| `options` | `SearchOptions` |  | Parameter options |

`SearchOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `limit` | `number` |  |
| `model` | `string` |  |
| `where` | `Record<string, any>` |  |

**Returns:** `Promise<SearchResult[]>`



### hybridSearch

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✓ | Parameter query |
| `options` | `HybridSearchOptions` |  | Parameter options |

`HybridSearchOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `ftsWeight` | `number` |  |
| `vecWeight` | `number` |  |

**Returns:** `Promise<SearchResult[]>`



### deepSearch

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `_query` | `string` | ✓ | Parameter _query |
| `_options` | `SearchOptions` |  | Parameter _options |

`SearchOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `limit` | `number` |  |
| `model` | `string` |  |
| `where` | `Record<string, any>` |  |

**Returns:** `Promise<SearchResult[]>`



### indexDocuments

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `docs` | `DocumentInput[]` | ✓ | Parameter docs |

`DocumentInput[]` properties:

| Property | Type | Description |
|----------|------|-------------|
| `pathId` | `string` |  |
| `model` | `string` |  |
| `title` | `string` |  |
| `slug` | `string` |  |
| `meta` | `Record<string, any>` |  |
| `content` | `string` |  |
| `sections` | `Array<{ heading: string; headingPath: string; content: string; level: number }>` |  |

**Returns:** `Promise<void>`



### reindex

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pathIds` | `string[]` |  | Parameter pathIds |

**Returns:** `Promise<void>`



### removeStale

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `currentPathIds` | `string[]` | ✓ | Parameter currentPathIds |

**Returns:** `void`



### needsReindex

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `doc` | `DocumentInput` | ✓ | Parameter doc |

`DocumentInput` properties:

| Property | Type | Description |
|----------|------|-------------|
| `pathId` | `string` |  |
| `model` | `string` |  |
| `title` | `string` |  |
| `slug` | `string` |  |
| `meta` | `Record<string, any>` |  |
| `content` | `string` |  |
| `sections` | `Array<{ heading: string; headingPath: string; content: string; level: number }>` |  |

**Returns:** `boolean`



### status

**Returns:** `IndexStatus`



### close

**Returns:** `Promise<void>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `db` | `Database` |  |
| `dimensions` | `number` |  |

## Events (Zod v4 schema)

### dbReady

Event emitted by SemanticSearch



### modelLoaded

Event emitted by SemanticSearch



### modelDisposed

Event emitted by SemanticSearch



### indexed

Event emitted by SemanticSearch



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `indexed` | `number` | Count of indexed documents |
| `embedded` | `number` | Count of documents with embeddings |
| `lastIndexedAt` | `any` | ISO timestamp of last indexing |
| `dbReady` | `boolean` | Whether SQLite is initialized |

## Examples

**features.semanticSearch**

```ts
const search = container.feature('semanticSearch', {
 dbPath: '.contentbase/search.sqlite',
 embeddingProvider: 'local',
})
await search.initDb()
await search.indexDocuments(docs)
const results = await search.hybridSearch('how does authentication work')
```

