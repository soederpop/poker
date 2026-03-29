---
title: "Package Finder"
tags: [packageFinder, packages, dependencies, npm]
lastTested: null
lastTestPassed: null
---

# packageFinder

Scans your workspace's node_modules and builds a queryable index of every installed package. Find duplicates, inspect versions, and map dependency relationships.

## Overview

The `packageFinder` feature is on-demand. After enabling and starting it, it recursively walks all node_modules directories, reads every package.json, and indexes the results. Use it for dependency auditing, duplicate detection, or understanding what is actually installed in your project.

## Starting the Finder

Enable the feature and run the initial scan.

```ts
const finder = container.feature('packageFinder')
await finder.start()
console.log('Scan complete:', finder.isStarted)
console.log('Unique packages:', finder.packageNames.length)
console.log('Total manifests:', finder.manifests.length)
```

The difference between unique package names and total manifests reveals how many packages exist in multiple copies (different versions in different locations).

## Listing Packages

Browse the discovered package names.

```ts
const names = finder.packageNames
console.log('First 10 packages:')
names.slice(0, 10).forEach(n => console.log(' ', n))
```

Package names include both scoped and unscoped packages from every node_modules tree in the workspace.

## Finding a Package by Name

Look up a specific package to see its version and location.

```ts
const zod = finder.findByName('zod')
if (zod) {
  console.log('Found:', zod.name)
  console.log('Version:', zod.version)
  console.log('Description:', zod.description)
}
```

If multiple versions exist, `findByName` returns the first match. Use `filter()` to find all instances.

## Scoped Packages

The finder tracks which npm scopes are present in your dependencies.

```ts
const scopes = finder.scopes
console.log('Scopes found:', scopes.length)
scopes.slice(0, 8).forEach(s => {
  const count = finder.packageNames.filter(n => n.startsWith(s)).length
  console.log(`  ${s}: ${count} packages`)
})
```

This is useful for auditing which organizations and ecosystems your project depends on.

## Detecting Duplicates

Packages that appear in multiple locations (often at different versions) show up in the duplicates list.

```ts
const dupes = finder.duplicates
console.log('Duplicate packages:', dupes.length)
dupes.slice(0, 5).forEach(name => {
  const count = finder.counts[name]
  console.log(`  ${name}: ${count} copies`)
})
```

Duplicates increase install size and can cause subtle bugs when multiple versions of the same library coexist.

## Summary

This demo covered scanning the workspace for packages, listing and looking up packages, inspecting scopes, and detecting duplicates. The `packageFinder` feature gives you a complete inventory of your installed dependencies for auditing and analysis.
