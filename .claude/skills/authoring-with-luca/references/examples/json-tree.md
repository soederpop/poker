---
title: "JSON Tree"
tags: [jsonTree, json, files, data-loading]
lastTested: null
lastTestPassed: null
---

# jsonTree

Load JSON files from directory structures into a nested object tree.

## Overview

The `jsonTree` feature is an on-demand feature that recursively scans a directory for `.json` files and builds a hierarchical JavaScript object from them. File paths are converted to camelCased property paths, so `config/database/production.json` becomes `tree.config.database.production`. This is useful when your project stores structured data across many JSON files and you want to access it all through a single unified object.

## Feature Documentation

Let us inspect the feature's built-in documentation.

```ts
const desc = container.features.describe('jsonTree')
console.log(desc)
```

The key method is `loadTree(basePath, key?)` which scans a directory and populates the `tree` getter.

## Enabling the Feature

Enable jsonTree and check its initial state.

```ts
const jsonTree = container.feature('jsonTree', { enable: true })
console.log('jsonTree enabled:', jsonTree.state.enabled)
console.log('Initial tree:', JSON.stringify(jsonTree.tree))
```

The tree starts empty until you load directories into it.

## How loadTree Works

The `loadTree(basePath, key?)` method recursively scans a directory for `.json` files, parses each one, and builds a nested object from the file paths. The optional `key` parameter controls where in the tree the data is stored.

```ts
console.log('loadTree processing steps:')
console.log('  1. Scans basePath recursively for *.json files')
console.log('  2. Reads and parses each file with JSON.parse()')
console.log('  3. Converts file paths to camelCased property paths')
console.log('  4. Stores the result under the given key in feature state')
console.log('')
console.log('Example call: await jsonTree.loadTree("config", "appConfig")')
console.log('  config/db/prod.json => jsonTree.tree.appConfig.db.prod')
```

After calling `loadTree`, the data is accessible through the `tree` getter, which returns all loaded trees minus internal state properties.

## Inspecting the Tree Getter

The `tree` getter provides clean access to loaded data. Before any data is loaded, it returns an empty object.

```ts
console.log('Tree before loading:', JSON.stringify(jsonTree.tree))
console.log('Tree type:', typeof jsonTree.tree)
console.log('Tree is clean (no "enabled" key):', !('enabled' in jsonTree.tree))
```

The getter filters out the internal `enabled` state property so you only see your loaded JSON data.

## Path Transformation Rules

The feature applies consistent transformations when building the tree:

- Directory names become nested object properties
- File names (without `.json`) become leaf properties
- All names are converted to camelCase
- Hyphens and dots in names are handled by the camelCase conversion

```ts
// Conceptual example of path mapping:
const mappings = {
  'config/database/production.json': 'tree.config.database.production',
  'data/user-profiles.json': 'tree.data.userProfiles',
  'settings/app-config.json': 'tree.settings.appConfig',
}
for (const [file, path] of Object.entries(mappings)) {
  console.log(`${file} => ${path}`)
}
```

## Summary

This demo covered the `jsonTree` feature, which scans directories for JSON files and builds a nested object tree from them. File paths are transformed into camelCased property paths, making it easy to access deeply nested configuration or data files through a single unified interface.
