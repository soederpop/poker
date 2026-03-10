---
title: "YAML Tree"
tags: [yamlTree, yaml, files, data-loading]
lastTested: null
lastTestPassed: null
---

# yamlTree

Load YAML files from directory structures into a nested object tree.

## Overview

The `yamlTree` feature is an on-demand feature that recursively scans a directory for `.yml` and `.yaml` files and builds a hierarchical JavaScript object from them. It works identically to `jsonTree` but for YAML content. File paths are converted to camelCased property paths, so `config/database/production.yml` becomes `tree.config.database.production`. This is useful for projects that store configuration, infrastructure definitions, or data in YAML format.

## Feature Documentation

Let us inspect the feature's built-in documentation.

```ts
const desc = container.features.describe('yamlTree')
console.log(desc)
```

Like jsonTree, the key method is `loadTree(basePath, key?)` and the data is accessed through the `tree` getter.

## Enabling the Feature

Enable yamlTree and check its initial state.

```ts
const yamlTree = container.feature('yamlTree', { enable: true })
console.log('yamlTree enabled:', yamlTree.state.enabled)
console.log('Initial tree:', JSON.stringify(yamlTree.tree))
```

The tree starts empty until you load directories into it.

## Loading YAML Files

We can attempt to load YAML files from the project. If the project has any `.yml` or `.yaml` files, they will appear in the tree.

```ts
await yamlTree.loadTree('.', 'root')
const keys = Object.keys(yamlTree.tree.root || {})
console.log('Keys loaded under root:', keys.length ? keys.join(', ') : '(no YAML files found)')
```

If no YAML files are found, the tree for that key will be empty. This is expected for projects that do not use YAML.

## How It Compares to jsonTree

The yamlTree and jsonTree features share the same design pattern:

- Both recursively scan directories
- Both convert file paths to camelCased property paths
- Both store results in a `tree` getter
- Both accept a custom key for namespacing

The only difference is the file extensions they look for and the parser they use.

```ts
const comparison = {
  jsonTree: { extensions: ['.json'], parser: 'JSON.parse' },
  yamlTree: { extensions: ['.yml', '.yaml'], parser: 'YAML parser' },
}
for (const [name, info] of Object.entries(comparison)) {
  console.log(`${name}: scans ${info.extensions.join(', ')} files, uses ${info.parser}`)
}
```

## Path Transformation Rules

The same path transformation rules apply as in jsonTree:

- Directory names become nested object properties
- File names (without extension) become leaf properties
- All names are converted to camelCase

```ts
const mappings = {
  'infra/k8s/deployment.yml': 'tree.infra.k8s.deployment',
  'config/app-settings.yaml': 'tree.config.appSettings',
  'data/seed/users.yml': 'tree.data.seed.users',
}
for (const [file, path] of Object.entries(mappings)) {
  console.log(`${file} => ${path}`)
}
```

## Summary

This demo covered the `yamlTree` feature, which scans directories for YAML files (.yml and .yaml) and builds a nested object tree. It follows the same pattern as `jsonTree` and is ideal for projects that rely on YAML for configuration, infrastructure definitions, or structured data.
