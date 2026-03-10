---
title: "YAML"
tags: [yaml, parsing, serialization, config]
lastTested: null
lastTestPassed: null
---

# yaml

Parse YAML strings into JavaScript objects and serialize objects back to YAML. A thin wrapper around js-yaml.

## Overview

The `yaml` feature is on-demand. It provides two methods: `parse()` and `stringify()`. Use it any time you need to read or write YAML configuration files, convert between formats, or work with YAML data in memory.

## Parsing a YAML String

Start by enabling the feature and parsing some YAML.

```ts
const yml = container.feature('yaml')
const config = yml.parse(`
name: my-app
version: 2.1.0
database:
  host: localhost
  port: 5432
features:
  - auth
  - logging
  - caching
`)
console.log('Parsed name:', config.name)
console.log('Parsed db host:', config.database.host)
console.log('Parsed features:', config.features)
```

The parser handles nested objects, arrays, numbers, and booleans automatically.

## Serializing an Object to YAML

Use `stringify()` to convert a JavaScript object into a YAML-formatted string.

```ts
const output = yml.stringify({
  server: { host: '0.0.0.0', port: 3000 },
  logging: { level: 'info', pretty: true },
  cors: { origins: ['https://example.com', 'https://app.example.com'] }
})
console.log('YAML output:')
console.log(output)
```

The output is human-readable and suitable for writing to configuration files.

## Round-Trip Conversion

A common pattern is reading YAML, modifying data, and writing it back. Here we verify that a round-trip preserves data.

```ts
const original = `
environment: production
replicas: 3
resources:
  cpu: 500m
  memory: 256Mi
`
const parsed = yml.parse(original)
parsed.replicas = 5
parsed.resources.memory = '512Mi'
const updated = yml.stringify(parsed)
console.log('Updated YAML:')
console.log(updated)
const reparsed = yml.parse(updated)
console.log('Replicas after round-trip:', reparsed.replicas)
console.log('Memory after round-trip:', reparsed.resources.memory)
```

The data survives the parse-modify-stringify cycle intact.

## Working with Complex Structures

YAML handles deeply nested and mixed-type structures well.

```ts
const complex = yml.stringify({
  users: [
    { name: 'Alice', roles: ['admin', 'editor'], active: true },
    { name: 'Bob', roles: ['viewer'], active: false },
  ],
  settings: {
    maxRetries: 3,
    timeout: null,
    nested: { deep: { value: 42 } }
  }
})
console.log(complex)
```

Nulls, booleans, numbers, and nested arrays all serialize cleanly.

## Summary

This demo covered parsing YAML strings, serializing objects to YAML, round-trip conversion, and handling complex nested structures. The `yaml` feature gives you a clean two-method API for all YAML operations.
