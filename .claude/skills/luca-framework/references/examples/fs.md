---
title: "fs"
tags: [fs, filesystem, core]
lastTested: null
lastTestPassed: null
---

# fs

File system utilities for reading, writing, checking, and walking files and directories.

## Overview

The `fs` feature is a core feature, meaning it is auto-enabled on every container. You can access it directly as a global or via `container.feature('fs')`. It provides synchronous and asynchronous methods for common filesystem operations. All paths are resolved relative to the container's working directory.

## Reading Files

Use `readFile()` to read a file as a string. This is the simplest way to get file contents.

```ts
const content = fs.readFile('README.md')
console.log('README.md length:', content.length, 'characters')
console.log('First line:', content.split('\n')[0])
```

The returned value is always a string, ready for processing.

## Reading JSON

Use `readJson()` to read and parse a JSON file in one step. No need for manual `JSON.parse()`.

```ts
const pkg = fs.readJson('package.json')
console.log('Package name:', pkg.name)
console.log('Version:', pkg.version)
console.log('Dependencies:', Object.keys(pkg.dependencies || {}).length, 'packages')
```

This is especially handy for configuration files and manifests.

## Checking Existence

Use `exists()` to check whether a file or directory is present before operating on it.

```ts
console.log('README.md exists:', fs.exists('README.md'))
console.log('package.json exists:', fs.exists('package.json'))
console.log('nonexistent.txt exists:', fs.exists('nonexistent.txt'))
console.log('src/ exists:', fs.exists('src'))
```

Returns a simple boolean. There is also an `existsAsync()` variant.

## Walking a Directory

Use `walk()` to recursively list all files under a directory tree. You can filter to just files or just directories.

```ts
const result = fs.walk('src', { files: true, directories: false, exclude: ['node_modules'] })
console.log('Total files in src/:', result.files.length)
console.log('First 5 files:')
result.files.slice(0, 5).forEach(f => console.log(' ', f))
```

Walk returns an object with `files` and `directories` arrays of relative paths.

## Finding Files Upward

Use `findUp()` to search for a file by walking up the directory tree from the current working directory. This is useful for locating project root markers.

```ts
const tsconfig = fs.findUp('tsconfig.json')
console.log('tsconfig.json found at:', tsconfig)

const packageJson = fs.findUp('package.json')
console.log('package.json found at:', packageJson)
```

Returns the absolute path if found, or `null` if the file is not in any ancestor directory.

## Summary

This demo covered reading files as strings and JSON, checking existence, recursively walking directories, and searching upward for project configuration files. These are the bread-and-butter operations for any script that needs to interact with the filesystem.
