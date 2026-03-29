---
title: Contentbase - Markdown as a Database
tags: [contentbase, contentdb, markdown, database, models, query, collections]
---

# Contentbase - Markdown as a Database

Contentbase lets you treat folders of markdown files as queryable database collections. Define models with Zod schemas, extract structured data from frontmatter and content, and query it with a fluent API.

## Setup

```typescript
import container from '@soederpop/luca'

const db = container.feature('contentDb', { rootPath: './content' })
const { defineModel, section, hasMany, belongsTo } = db.library
```

## Directory Structure

```
content/
├── posts/
│   ├── hello-world.md
│   ├── getting-started.md
│   └── advanced-tips.md
├── authors/
│   ├── alice.md
│   └── bob.md
└── tags/
    ├── javascript.md
    └── typescript.md
```

## Defining Models

Models map to subdirectories and define the shape of your content:

```typescript
import { z } from 'zod'

const Post = defineModel('Post', {
  // Maps to content/posts/
  prefix: 'posts',

  // Frontmatter schema
  meta: z.object({
    title: z.string(),
    date: z.string(),
    status: z.enum(['draft', 'published', 'archived']),
    author: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),

  // Extract structured data from the markdown body
  sections: {
    summary: section('Summary', {
      extract: (query) => query.select('paragraph')?.toString() || '',
      schema: z.string(),
    }),
    codeExamples: section('Code Examples', {
      extract: (query) => query.selectAll('code').map((n: any) => n.toString()),
      schema: z.array(z.string()),
    }),
  },

  // Relationships
  relationships: {
    author: belongsTo(() => Author, { key: 'meta.author' }),
    tags: hasMany(() => Tag, { heading: 'Tags' }),
  },
})

const Author = defineModel('Author', {
  prefix: 'authors',
  meta: z.object({
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['writer', 'editor', 'admin']),
  }),
  relationships: {
    posts: hasMany(() => Post, { foreignKey: 'meta.author' }),
  },
})
```

## Registering and Loading

```typescript
db.register(Post)
db.register(Author)
await db.load()  // Parses all markdown files and builds the queryable index
```

## Querying

Contentbase provides a fluent query API:

```typescript
// Fetch all posts
const allPosts = await db.query(Post).fetchAll()

// Filter by frontmatter fields
const published = await db.query(Post)
  .where('meta.status', 'published')
  .fetchAll()

// Multiple filters
const recentPosts = await db.query(Post)
  .where('meta.status', 'published')
  .where('meta.tags', 'includes', 'javascript')
  .fetchAll()

// Get a single document by slug (filename without .md)
const post = await db.query(Post).find('hello-world')
```

## Markdown File Format

Each markdown file has YAML frontmatter and a body:

```markdown
---
title: Hello World
date: 2024-01-15
status: published
author: alice
tags: [javascript, tutorial]
---

# Hello World

This is the post content.

## Summary

A brief introduction to our blog.

## Code Examples

\`\`\`javascript
console.log('Hello!')
\`\`\`
```

## Use Cases

- **Documentation sites** -- query and render docs with frontmatter metadata
- **Blog engines** -- posts with authors, tags, categories
- **Knowledge bases** -- structured content with relationships
- **Project management** -- epics, stories, tasks as markdown with status tracking
- **Configuration** -- human-readable config files that are also queryable

## Full Example: Blog Engine

```typescript
import container from '@soederpop/luca'
import { z } from 'zod'

const db = container.feature('contentDb', { rootPath: './blog' })
const { defineModel, section, hasMany } = db.library

const Post = defineModel('Post', {
  prefix: 'posts',
  meta: z.object({
    title: z.string(),
    date: z.string(),
    status: z.enum(['draft', 'published']),
    tags: z.array(z.string()).default([]),
  }),
  sections: {
    excerpt: section('Excerpt', {
      extract: (q) => q.select('paragraph')?.toString() || '',
      schema: z.string(),
    }),
  },
})

db.register(Post)
await db.load()

// Get published posts for the homepage
const posts = await db.query(Post)
  .where('meta.status', 'published')
  .fetchAll()

for (const post of posts) {
  console.log(`${post.meta.title} (${post.meta.date})`)
  console.log(`  ${post.sections.excerpt}`)
}
```
