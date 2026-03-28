# Discovery & Introspection Reference

## Registry-level discovery

```ts
// List available helpers (returns string[])
container.features.available
container.clients.available
container.servers.available
container.commands.available
container.endpoints.available

// Get markdown docs for one helper
container.features.describe('diskCache')

// Get markdown docs for all helpers in a registry
container.features.describeAll()

// Get structured introspection data
container.features.introspect('fs')
// => { className, methods, getters, state, options, events }
```

## Instance-level introspection

```ts
const fs = container.feature('fs')
fs.$methods             // quick list: ['readFile', 'writeFile', ...]
fs.$getters             // quick list: ['cwd', 'sep', ...]
fs.introspect()         // structured object
fs.introspectAsText()   // markdown documentation
```

Introspection data includes:
- Class name and description (from JSDoc)
- Methods with name, description, parameters, return type
- Getters with name, description, type
- State schema fields with descriptions and defaults
- Options schema fields with descriptions and defaults
- Event names with argument signatures and descriptions

## Container-level introspection

```ts
container.inspect()         // structured overview of entire container
container.inspectAsText()   // markdown overview
```

## CLI introspection

```bash
luca describe container
luca describe features
luca describe fs
luca describe fs --methods --pretty
luca eval "container.features.available"
```

## MCP introspection (luca-sandbox)

| Tool | Use |
|------|-----|
| `find_capability` | Search by intent ("I need to read files") |
| `list_registry` | Browse a registry |
| `describe_helper` | Full docs for a specific helper |
| `inspect_helper_instance` | Live instance state and methods |
| `eval` | Run any code in the container sandbox |

## Introspection sources

1. **Zod schemas** — `.describe()` on fields powers runtime docs for state, options, events
2. **JSDoc** — Class, method, and getter docs are extracted by AST analysis at build time
3. **Build step** — `bun run build:introspection` updates extracted metadata
