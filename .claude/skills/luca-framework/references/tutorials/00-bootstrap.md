---
title: "Bootstrap: Learning the Container at Runtime"
tags:
  - bootstrap
  - introspection
  - repl
  - agent
  - discovery
  - quickstart
---
# Bootstrap: Learning the Container at Runtime

You don't need to memorize the Luca API. The container tells you everything it can do — at runtime. This tutorial teaches you the discovery pattern so you can explore any feature, client, server, or command without reading docs.

## Start with `luca eval`

The `eval` command runs JavaScript with the container in scope. All features are available as top-level variables.

```bash
# What features are available?
luca eval "container.features.available"
# => ['fs', 'git', 'proc', 'vm', 'networking', 'os', 'grep', ...]

# What clients?
luca eval "container.clients.available"

# What servers?
luca eval "container.servers.available"

# What commands?
luca eval "container.commands.available"
```

## Describe Anything

The `luca describe` command generates API docs for any helper. It reads JSDoc, Zod schemas, and method signatures to produce markdown documentation.

```bash
# Describe the container itself
luca describe

# Describe a feature
luca describe fs

# Describe multiple at once
luca describe git fs proc

# Show only specific sections
luca describe fs --methods --examples

# Describe all features
luca describe features
```

In code, the same works via registries:

```js
container.features.describe('fs')       // markdown docs for fs
container.features.describeAll()        // condensed overview of all features
container.clients.describe('rest')      // docs for the rest client
```

## The Discovery Pattern

Every registry follows the same shape. Once you know the pattern, you can explore anything:

```js
// List what's available
container.features.available
container.clients.available
container.servers.available
container.commands.available

// Get docs for a specific helper
container.features.describe('fs')
container.clients.describe('rest')
container.servers.describe('express')

// Check if something exists
container.features.has('fs')           // => true

// Get a helper instance
const fs = container.feature('fs')
const rest = container.client('rest')
```

## Instance Introspection

Once you have a helper instance, it can describe itself:

```js
const fs = container.feature('fs')

// Structured introspection (object with methods, getters, events, state, options)
fs.introspect()

// Human-readable markdown
fs.introspectAsText()
```

The container itself is introspectable:

```js
container.introspect()          // structured object with all registries, state, events
container.introspectAsText()    // full markdown overview
```

## The REPL

For interactive exploration, use `luca console`. It gives you a persistent REPL with the container and all features in scope:

```bash
luca console
```

Inside the REPL, you can tab-complete, call methods, and explore interactively. Variables survive across lines.

## Feature Shortcuts

In eval and REPL contexts, core features are available as top-level variables — no need to call `container.feature()`:

```bash
luca eval "fs.readFile('package.json')"
luca eval "git.branch"
luca eval "proc.exec('ls')"
luca eval "grep.search('.', 'TODO')"
```

## Quick Reference

| Want to know...                | Ask                                    |
|--------------------------------|----------------------------------------|
| What registries exist?         | `container.registries`                 |
| What features are available?   | `container.features.available`         |
| Full docs for a feature?       | `container.features.describe('fs')`    |
| All features at a glance?      | `container.features.describeAll()`     |
| Structured introspection?      | `feature.introspect()`                 |
| What state does it have?       | `feature.state.current`               |
| What events does it emit?      | `feature.introspect().events`          |
| Full container overview?       | `container.introspectAsText()`            |
| CLI docs for a helper?         | `luca describe <name>`                 |

## Gotchas

### `paths.join()` vs `paths.resolve()`

`container.paths.join()` and `container.paths.resolve()` are Node's `path.join` and `path.resolve` curried with `container.cwd`. This means `paths.join()` always prepends `cwd` — even if you pass an absolute path as the first argument.

```js
// WRONG — paths.join will prepend cwd to the absolute tmpdir path
const bad = container.paths.join(os.tmpdir, 'mydir')
// => "/your/project/tmp/mydir" (not what you want)

// RIGHT — paths.resolve respects absolute first args
const good = container.paths.resolve(os.tmpdir, 'mydir')
// => "/tmp/mydir"
```

**Rule of thumb:** Use `paths.join()` for project-relative paths, `paths.resolve()` when the base is already absolute.

## What's Next

- [The Container](./02-container.md) — deep dive into state, events, and lifecycle
- [Scripts](./03-scripts.md) — run scripts and executable markdown notebooks
- [Features Overview](./04-features-overview.md) — explore built-in features
- [Writing Commands](./08-commands.md) — add CLI commands to your project
