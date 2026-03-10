---
title: "Content Database"
tags: [contentDb, markdown, content, database]
lastTested: null
lastTestPassed: null
---

# contentDb

Treat folders of structured markdown files as queryable databases. Each markdown file is a document with frontmatter metadata and content.

## Overview

The `contentDb` feature is on-demand. Enable it with a `rootPath` pointing to a directory that contains a `models.ts` file and subfolders of markdown documents. It is perfect for documentation sites, knowledge bases, or any content-driven application where markdown is the source of truth.

## Loading a Collection

We point the feature at the project's docs directory, which already has models and content.

```ts
const contentDb = container.feature('contentDb', { rootPath: '.' })
await contentDb.load()
console.log('Loaded:', contentDb.isLoaded)
```

The `load()` call discovers the models defined in `models.ts` and parses every markdown file in the matching prefix directories.

## Discovering Models

Each collection has named models. Let us see what is available.

```ts
const names = contentDb.modelNames
console.log('Available models:', names)
```

Models correspond to subdirectories. Each model defines a schema for the frontmatter metadata its documents must conform to.

## Querying Documents

Use `query()` to fetch documents belonging to a model. Here we query the Tutorial model.

```ts
const tutorials = await contentDb.query(contentDb.models.Tutorial).fetchAll()
console.log('Tutorial count:', tutorials.length)
tutorials.slice(0, 3).forEach(doc => {
  console.log('-', doc.id, '|', doc.meta?.title)
})
```

Documents come back with their parsed frontmatter, content, and a unique id derived from the file path.

## Parsing a Single File

You can also parse any markdown file directly without going through the query system.

```ts
const doc = contentDb.parseMarkdownAtPath('./docs/tutorials/01-getting-started.md')
console.log('Title:', doc.meta?.title)
console.log('Tags:', doc.meta?.tags)
```

This is useful when you know exactly which file you want and do not need to iterate over a collection.

## Collection Summary

The feature tracks a model summary in its state, giving you a quick overview of the entire collection.

```ts
console.log(contentDb.state.get('modelSummary'))
```

This summary shows each model and how many documents belong to it.

## Summary

This demo covered loading a contentbase collection, listing models, querying documents by model, parsing individual markdown files, and inspecting the collection summary. The `contentDb` feature turns your markdown files into a lightweight, schema-validated content database.
