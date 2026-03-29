---
title: "grep"
tags: [grep, search, core]
lastTested: null
lastTestPassed: null
---

# grep

Search file contents for patterns, find imports, definitions, and TODO comments.

## Overview

The `grep` feature is a core feature, auto-enabled on every container. You can access it directly as a global or via `container.feature('grep')`. It wraps ripgrep with a structured API, providing methods for pattern search, import discovery, definition lookup, and TODO scanning. Results come back as arrays of match objects with file, line, and content info.

## Searching for a Pattern

Use `search()` to find occurrences of a pattern across files. Options let you filter by file type, limit results, and control case sensitivity.

```ts
const results = await grep.search({ pattern: 'container', include: '*.ts', exclude: 'node_modules', maxResults: 5 })
console.log('Matches for "container" in .ts files (first 5):')
results.forEach(r => {
  console.log(`  ${r.file}:${r.line} ${r.content.trim().slice(0, 60)}`)
})
```

Each match object contains `file`, `line`, and `content` fields.

## Counting Matches

Use `count()` to get just the number of matches without fetching all the details.

```ts
const total = await grep.count('container', { include: '*.ts', exclude: 'node_modules' })
console.log('Total "container" occurrences in .ts files:', total)
```

This is much faster when you only need the total.

## Finding Import Statements

Use `imports()` to find all files that import a specific module or path.

```ts
const results = await grep.imports('path', { include: '*.ts', exclude: 'node_modules', maxResults: 5 })
console.log('Files importing "path" (first 5):')
results.forEach(r => {
  console.log(`  ${r.file}:${r.line} ${r.content.trim().slice(0, 70)}`)
})
```

This searches for both `import` and `require` patterns automatically.

## Finding Definitions

Use `definitions()` to locate where functions, classes, types, or variables are defined.

```ts
const defs = await grep.definitions('Feature', { include: '*.ts', exclude: 'node_modules', maxResults: 5 })
console.log('Definitions matching "Feature" (first 5):')
defs.forEach(d => {
  console.log(`  ${d.file}:${d.line} ${d.content.trim().slice(0, 70)}`)
})
```

This searches for `function`, `class`, `type`, `interface`, `const`, and `let` declarations.

## Finding TODOs

Use `todos()` to scan for TODO, FIXME, HACK, and XXX comments across the codebase.

```ts
const todos = await grep.todos({ include: '*.ts', exclude: 'node_modules', maxResults: 5 })
console.log('TODOs found in .ts files (first 5):')
todos.forEach(t => {
  console.log(`  ${t.file}:${t.line} ${t.content.trim().slice(0, 70)}`)
})
```

This is handy for tracking technical debt and outstanding work items.

## Summary

This demo covered pattern searching with structured results, counting matches efficiently, finding import statements, locating definitions by name, and scanning for TODO comments. The `grep` feature is the go-to tool for codebase analysis and discovery.
