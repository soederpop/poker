---
title: "File Manager"
tags: [fileManager, files, indexing, filesystem]
lastTested: null
lastTestPassed: null
---

# fileManager

Builds an in-memory index of every file in your project with metadata and glob matching. Think of it as a fast, queryable snapshot of your file tree.

## Overview

The `fileManager` feature is on-demand. After enabling it and calling `start()`, it scans the project directory and indexes every file. You can then match files by glob patterns, inspect metadata, and list unique extensions. It is useful for code analysis tools, documentation generators, or any script that needs to reason about project structure.

## Starting the File Manager

Enable the feature and kick off the initial scan.

```ts
const fm = container.feature('fileManager')
await fm.start()
console.log('Scan complete:', fm.isStarted)
console.log('Total files indexed:', fm.fileIds.length)
```

The scan respects common ignore patterns (node_modules, .git, etc.) by default.

## Matching Files by Glob

Use `match()` to find file paths matching a glob pattern.

```ts
const tsFiles = fm.match('**/*.ts')
console.log('TypeScript files found:', tsFiles.length)
tsFiles.slice(0, 5).forEach(f => console.log(' ', f))
```

This returns an array of relative file paths that match the pattern.

## Inspecting File Metadata

Use `matchFiles()` to get full file objects instead of just paths. Each object contains metadata about the file.

```ts
const pkgFiles = fm.matchFiles('package.json')
pkgFiles.forEach(f => {
  console.log('File:', f.id)
  console.log('  Extension:', f.extension)
  console.log('  Directory:', f.directory)
})
```

File objects include properties like `id` (relative path), `extension`, and `directory`.

## Unique Extensions

The file manager tracks every file extension it encounters across the project.

```ts
const extensions = fm.uniqueExtensions
console.log('Unique extensions:', extensions.length)
console.log('Extensions:', extensions.slice(0, 15).join(', '))
```

This is handy for understanding the technology mix in a project at a glance.

## Directory Listing

You can also get the unique set of directories that contain indexed files.

```ts
const dirs = fm.directoryIds
console.log('Directories:', dirs.length)
dirs.slice(0, 8).forEach(d => console.log(' ', d))
```

Combined with glob matching, this gives you a complete picture of the project layout.

## Summary

This demo covered starting the file manager, glob matching, inspecting file metadata, listing unique extensions, and enumerating directories. The `fileManager` feature provides a fast, in-memory file index for project analysis and tooling.
