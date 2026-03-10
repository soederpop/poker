---
title: "Google Docs"
tags: [googleDocs, google, docs, documents, markdown]
lastTested: null
lastTestPassed: null
---

# googleDocs

Google Docs feature for reading documents and converting them to Markdown. Depends on `googleAuth` for authentication and optionally `googleDrive` for listing documents.

## Overview

Use the `googleDocs` feature when you need to read Google Docs content. Its standout capability is converting Google Docs to well-formatted Markdown, handling headings, bold/italic/strikethrough, links, code, lists, tables, and images. Also supports plain text extraction and raw document structure access.

Requires Google OAuth2 credentials or a service account with Docs access.

## Enabling the Feature

```ts
const docs = container.feature('googleDocs')
console.log('Google Docs feature created')
```

## API Documentation

```ts
const info = await container.features.describe('googleDocs')
console.log(info)
```

## Reading as Markdown

Convert a Google Doc into clean Markdown with full formatting support.

```ts skip
const markdown = await docs.getAsMarkdown('1abc_document_id')
console.log(markdown)
```

The converter handles headings (H1-H6), bold, italic, strikethrough, links, code fonts, ordered/unordered lists with nesting, tables, images, and section breaks. This is the primary method for extracting document content.

## Plain Text and Raw Structure

```ts skip
const text = await docs.getAsText('1abc_document_id')
console.log('Plain text length:', text.length)

const rawDoc = await docs.getDocument('1abc_document_id')
console.log('Document title:', rawDoc.title)
console.log('Sections:', rawDoc.body.content.length)
```

Use `getAsText()` when you only need the words without any formatting. Use `getDocument()` when you need the full Docs API structure for custom processing.

## Saving to Files

```ts skip
const path = await docs.saveAsMarkdown('1abc_document_id', './output/doc.md')
console.log('Saved to:', path)
```

Downloads and converts a doc to Markdown in one step. The path is resolved relative to the container's working directory.

## Listing and Searching Docs

Uses Google Drive under the hood to find Google Docs by name or content.

```ts skip
const allDocs = await docs.listDocs()
console.log(`Found ${allDocs.length} Google Docs`)
allDocs.slice(0, 5).forEach(d => console.log(`  ${d.name} (${d.id})`))

const results = await docs.searchDocs('meeting notes')
console.log(`Search returned ${results.length} docs`)
```

Both methods filter Drive results to the Google Docs MIME type automatically.

## Summary

The `googleDocs` feature reads Google Docs and converts them to Markdown, plain text, or raw API structures. The Markdown converter handles all common formatting elements. Uses `googleDrive` for listing and searching documents. Key methods: `getAsMarkdown()`, `getAsText()`, `getDocument()`, `saveAsMarkdown()`, `listDocs()`, `searchDocs()`.
