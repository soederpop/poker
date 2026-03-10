---
title: Semantic Search
tags: [semantic-search, embeddings, vector-search, bm25, hybrid-search, sqlite, contentdb]
---

# Semantic Search

Luca's `semanticSearch` feature provides BM25 keyword search, vector similarity search, and hybrid search with Reciprocal Rank Fusion -- all backed by SQLite. It chunks documents intelligently, generates embeddings via OpenAI or a local GGUF model, and stores everything in a single `.sqlite` file.

## Quick Start with ContentDb

The fastest way to use semantic search is through the `contentDb` feature, which handles indexing and querying automatically:

```typescript
import container from '@soederpop/luca'

const db = container.feature('contentDb', { rootPath: './docs' })
await db.load()

// Build the search index (generates embeddings for all documents)
await db.buildSearchIndex({
  onProgress: (indexed, total) => console.log(`${indexed}/${total}`)
})

// Search your documents
const results = await db.hybridSearch('how does authentication work')
for (const r of results) {
  console.log(`${r.title} (score: ${r.score.toFixed(3)})`)
  console.log(`  ${r.snippet}`)
}
```

ContentDb provides three search methods that delegate to the underlying semanticSearch feature:

```typescript
// BM25 keyword search -- best for exact term matching
await db.search('OAuth2 token refresh')

// Vector similarity search -- finds conceptually related documents
await db.vectorSearch('how do users log in')

// Hybrid search -- combines both via Reciprocal Rank Fusion (recommended)
await db.hybridSearch('authentication flow', { limit: 5 })
```

## Using SemanticSearch Directly

For more control, use the `semanticSearch` feature directly:

```typescript
import container from '@soederpop/luca'
import { SemanticSearch } from '@soederpop/luca/node/features/semantic-search'

// Attach the feature to the container
SemanticSearch.attach(container)

const search = container.feature('semanticSearch', {
  dbPath: '.contentbase/search.sqlite',
  embeddingProvider: 'openai',        // or 'local'
  embeddingModel: 'text-embedding-3-small',
  chunkStrategy: 'section',           // 'section' | 'fixed' | 'document'
  chunkSize: 900,
})

await search.initDb()
```

## Indexing Documents

Documents are represented as `DocumentInput` objects with optional section metadata:

```typescript
await search.indexDocuments([
  {
    pathId: 'guides/auth',
    model: 'Guide',
    title: 'Authentication Guide',
    meta: { status: 'published', category: 'security' },
    content: 'Full document content here...',
    sections: [
      {
        heading: 'OAuth2 Flow',
        headingPath: 'Authentication Guide > OAuth2 Flow',
        content: 'OAuth2 uses authorization codes and tokens...',
        level: 2,
      },
      {
        heading: 'Session Management',
        headingPath: 'Authentication Guide > Session Management',
        content: 'Sessions are stored server-side with a cookie...',
        level: 2,
      },
    ],
  },
  {
    pathId: 'guides/deployment',
    title: 'Deployment Guide',
    content: 'How to deploy your application...',
  },
])
```

The `indexDocuments` method:
1. Stores documents in SQLite with FTS5 full-text indexing
2. Chunks each document based on the configured strategy
3. Generates embeddings for every chunk
4. Stores embeddings as BLOBs alongside the chunk text

## Chunking Strategies

The feature splits documents into chunks before embedding. Choose a strategy based on your content:

### Section (default)

Splits at heading boundaries (`## H2`, `### H3`). Each section becomes a chunk, prefixed with the heading path for context. Falls back to fixed chunking if the document has no sections.

```typescript
const search = container.feature('semanticSearch', {
  chunkStrategy: 'section',
  chunkSize: 900,  // max tokens per chunk (sections exceeding this are split at paragraphs)
})
```

Best for: structured documents with clear heading hierarchies.

### Fixed

Splits by word count with configurable overlap between chunks:

```typescript
const search = container.feature('semanticSearch', {
  chunkStrategy: 'fixed',
  chunkSize: 900,
  chunkOverlap: 0.15,  // 15% overlap between adjacent chunks
})
```

Best for: unstructured prose, logs, or transcripts.

### Document

One chunk per document -- no splitting:

```typescript
const search = container.feature('semanticSearch', {
  chunkStrategy: 'document',
})
```

Best for: short documents where splitting would lose context.

## Search Methods

### BM25 Keyword Search

Uses SQLite FTS5 with Porter stemming for traditional keyword matching:

```typescript
const results = await search.search('authentication tokens', {
  limit: 10,
  model: 'Guide',                        // filter by document model
  where: { status: 'published' },         // filter by metadata fields
})
```

Returns results ranked by BM25 relevance with highlighted snippets.

### Vector Similarity Search

Embeds the query and computes cosine similarity against all stored chunk embeddings:

```typescript
const results = await search.vectorSearch('how do users prove their identity', {
  limit: 10,
})
```

Finds conceptually related content even without keyword overlap. Results are deduplicated by document, keeping the best-scoring chunk per document.

### Hybrid Search (Recommended)

Runs both BM25 and vector search in parallel, then fuses results using Reciprocal Rank Fusion:

```typescript
const results = await search.hybridSearch('authentication flow', {
  limit: 10,
  model: 'Guide',
  where: { category: 'security' },
})
```

This gives the best results for most queries -- keyword precision combined with semantic recall.

## Search Results

All search methods return `SearchResult[]`:

```typescript
interface SearchResult {
  pathId: string          // document identifier
  model: string           // content model name
  title: string           // document title
  meta: Record<string, any>  // document metadata
  score: number           // relevance score
  snippet: string         // matched text excerpt
  matchedSection?: string // section heading where the match occurred
  headingPath?: string    // full heading breadcrumb (e.g. "Auth > OAuth2 > Tokens")
}
```

## Embedding Providers

### OpenAI (default)

Uses the OpenAI embeddings API. Requires an `openai` client registered in the container.

```typescript
const search = container.feature('semanticSearch', {
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-3-small',  // 1536 dimensions
  // also available: 'text-embedding-3-large' (3072 dimensions)
})
```

### Local (GGUF)

Runs embeddings locally using `node-llama-cpp` with a GGUF model file:

```typescript
const search = container.feature('semanticSearch', {
  embeddingProvider: 'local',
  embeddingModel: 'embedding-gemma-300M-Q8_0',  // 768 dimensions
})

// Install the dependency if needed
await search.installLocalEmbeddings(process.cwd())
```

Local models are loaded from `~/.cache/luca/models/` or `~/.cache/qmd/models/`. The model is kept in memory and automatically disposed after 5 minutes of inactivity.

## Index Management

### Incremental Updates

The feature tracks content hashes to avoid re-embedding unchanged documents:

```typescript
// Check if a document needs re-indexing
if (search.needsReindex(doc)) {
  search.removeDocument(doc.pathId)
  await search.indexDocuments([doc])
}
```

### Remove Stale Documents

Clean up documents that no longer exist in your collection:

```typescript
const currentIds = ['guides/auth', 'guides/deployment']
search.removeStale(currentIds)  // deletes any indexed docs not in this list
```

### Full Reindex

Clear everything and start fresh:

```typescript
await search.reindex()  // clears all data
await search.indexDocuments(allDocs)  // re-index everything
```

### Index Status

```typescript
const stats = search.getStats()
// {
//   documentCount: 42,
//   chunkCount: 187,
//   embeddingCount: 187,
//   lastIndexedAt: '2026-03-06T...',
//   provider: 'openai',
//   model: 'text-embedding-3-small',
//   dimensions: 1536,
//   dbSizeBytes: 2457600,
// }
```

## Database Scoping

Each provider/model combination gets its own SQLite file. If you configure `dbPath: '.contentbase/search.sqlite'` with the OpenAI provider and `text-embedding-3-small` model, the actual file will be `.contentbase/search.openai-text-embedding-3-small.sqlite`. This prevents dimension mismatches if you switch providers.

## ContentDb Integration Details

When using `contentDb.buildSearchIndex()`, the feature automatically:

- Extracts sections from your markdown documents at H2 boundaries
- Converts each document to a `DocumentInput` with pathId, title, meta, and sections
- Skips unchanged documents (incremental by default)
- Removes documents that no longer exist in the collection

```typescript
const db = container.feature('contentDb', { rootPath: './docs' })
await db.load()

// Incremental update (default)
const { indexed, total } = await db.buildSearchIndex()
console.log(`Indexed ${indexed} of ${total} documents`)

// Force full rebuild
await db.rebuildSearchIndex()

// Check index health
console.log(db.searchIndexStatus)
```

## Lifecycle

Always close the feature when done to release the SQLite connection and any loaded models:

```typescript
await search.close()
```

The feature emits events you can listen to:

```typescript
search.on('dbReady', () => console.log('Database initialized'))
search.on('indexed', ({ documents, chunks }) => {
  console.log(`Indexed ${documents} docs (${chunks} chunks)`)
})
search.on('modelLoaded', () => console.log('Local embedding model loaded'))
search.on('modelDisposed', () => console.log('Local embedding model released'))
```
