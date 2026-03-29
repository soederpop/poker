---
title: "Disk Cache"
tags: [diskCache, storage, caching]
lastTested: null
lastTestPassed: null
---

# diskCache

A file-backed key-value cache powered by cacache (the same store behind npm). Persist arbitrary data to disk with a simple get/set interface.

## Overview

The `diskCache` feature is on-demand. Enable it with a `path` option pointing to a cache directory. It is ideal for persisting computed results, downloaded assets, or any data you want to survive across process restarts without setting up a full database.

## Creating a Cache

We start by enabling the feature and pointing it at a temporary directory.

```ts
const cache = container.feature('diskCache', { path: '/tmp/luca-example-cache' })
console.log('diskCache enabled:', cache.state.get('enabled'))
```

The cache directory is created automatically when the first entry is written.

## Storing and Retrieving Values

Use `set()` to write a key and `get()` to read it back.

```ts
await cache.set('greeting', 'Hello from Luca!')
const value = await cache.get('greeting')
console.log('Retrieved:', value)
```

The value comes back exactly as stored.

## Checking for Keys

Use `has()` to check whether a key exists without reading it.

```ts
const exists = await cache.has('greeting')
console.log('Has greeting?', exists)
const missing = await cache.has('nonexistent')
console.log('Has nonexistent?', missing)
```

This is useful for conditional caching patterns where you want to skip expensive work if a result is already stored.

## Listing All Keys

Use `keys()` to enumerate everything in the cache.

```ts
await cache.set('user:1', JSON.stringify({ name: 'Alice' }))
await cache.set('user:2', JSON.stringify({ name: 'Bob' }))
const allKeys = await cache.keys()
console.log('All keys:', allKeys)
```

Keys are plain strings, so you can use naming conventions like prefixes to organize entries.

## Removing Entries

Use `rm()` to delete a single key, or `clearAll(true)` to wipe the entire cache.

```ts
await cache.rm('user:2')
const afterRemove = await cache.keys()
console.log('After removing user:2:', afterRemove)

await cache.clearAll(true)
const afterClear = await cache.keys()
console.log('After clearAll:', afterClear)
```

Note that `clearAll` requires passing `true` as a confirmation safeguard.

## Summary

This demo covered creating a disk cache, storing and retrieving values, checking key existence, listing keys, and removing entries. The `diskCache` feature provides a lightweight persistence layer without any external dependencies.
