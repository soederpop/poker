# Grep (features.grep)

The Grep feature provides utilities for searching file contents using ripgrep (rg) or grep. Returns structured results as arrays of `{ file, line, column, content }` objects with paths relative to the container cwd. Also provides convenience methods for common search patterns.

## Usage

```ts
container.feature('grep')
```

## Methods

### search

Search for a pattern in files and return structured results.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `GrepOptions` | ✓ | Search options |

`GrepOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `pattern` | `string` | Pattern to search for (string or regex) |
| `path` | `string` | Directory or file to search in (defaults to container cwd) |
| `include` | `string | string[]` | Glob patterns to include (e.g. '*.ts') |
| `exclude` | `string | string[]` | Glob patterns to exclude (e.g. 'node_modules') |
| `ignoreCase` | `boolean` | Case insensitive search |
| `fixedStrings` | `boolean` | Treat pattern as a fixed string, not regex |
| `recursive` | `boolean` | Search recursively (default: true) |
| `hidden` | `boolean` | Include hidden files |
| `maxResults` | `number` | Max number of results to return |
| `before` | `number` | Number of context lines before match |
| `after` | `number` | Number of context lines after match |
| `filesOnly` | `boolean` | Only return filenames, not match details |
| `invert` | `boolean` | Invert match (return lines that don't match) |
| `wordMatch` | `boolean` | Match whole words only |
| `rawFlags` | `string[]` | Additional raw flags to pass to grep/ripgrep |

**Returns:** `Promise<GrepMatch[]>`

```ts
// Search for a pattern in TypeScript files
const results = await grep.search({
 pattern: 'useState',
 include: '*.tsx',
 exclude: 'node_modules'
})

// Case insensitive search with context
const results = await grep.search({
 pattern: 'error',
 ignoreCase: true,
 before: 2,
 after: 2
})
```



### filesContaining

Find files containing a pattern. Returns just the relative file paths.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pattern` | `string` | ✓ | The pattern to search for |
| `options` | `Omit<GrepOptions, 'pattern' | 'filesOnly'>` |  | Additional search options |

**Returns:** `Promise<string[]>`

```ts
const files = await grep.filesContaining('TODO')
// ['src/index.ts', 'src/utils.ts']
```



### imports

Find import/require statements for a module or path.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `moduleOrPath` | `string` | ✓ | The module name or path to search for in imports |
| `options` | `Omit<GrepOptions, 'pattern'>` |  | Additional search options |

**Returns:** `Promise<GrepMatch[]>`

```ts
const lodashImports = await grep.imports('lodash')
const localImports = await grep.imports('./utils')
```



### definitions

Find function, class, type, or variable definitions matching a name.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The identifier name to search for definitions of |
| `options` | `Omit<GrepOptions, 'pattern'>` |  | Additional search options |

**Returns:** `Promise<GrepMatch[]>`

```ts
const defs = await grep.definitions('MyComponent')
const classDefs = await grep.definitions('UserService')
```



### todos

Find TODO, FIXME, HACK, and XXX comments.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `Omit<GrepOptions, 'pattern'>` |  | Additional search options |

**Returns:** `Promise<GrepMatch[]>`

```ts
const todos = await grep.todos()
const fixmes = await grep.todos({ include: '*.ts' })
```



### count

Count the number of matches for a pattern.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pattern` | `string` | ✓ | The pattern to count |
| `options` | `Omit<GrepOptions, 'pattern'>` |  | Additional search options |

**Returns:** `Promise<number>`

```ts
const count = await grep.count('console.log')
console.log(`Found ${count} console.log statements`)
```



### findForReplace

Search and replace across files. Returns the list of files that would be affected. Does NOT modify files — use the returned file list to do the replacement yourself.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pattern` | `string` | ✓ | The pattern to search for |
| `options` | `Omit<GrepOptions, 'pattern'>` |  | Additional search options |

**Returns:** `Promise<{ file: string, matches: GrepMatch[] }[]>`

```ts
const affected = await grep.findForReplace('oldFunctionName')
// [{ file: 'src/a.ts', matches: [...] }, { file: 'src/b.ts', matches: [...] }]
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `hasRipgrep` | `boolean` | Whether ripgrep (rg) is available on this system |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |

## Examples

**features.grep**

```ts
const grep = container.feature('grep')

// Basic search
const results = await grep.search({ pattern: 'TODO' })
// [{ file: 'src/index.ts', line: 42, column: 5, content: '// TODO: fix this' }, ...]

// Find all imports of a module
const imports = await grep.imports('lodash')

// Find function/class/variable definitions
const defs = await grep.definitions('MyClass')

// Just get filenames containing a pattern
const files = await grep.filesContaining('API_KEY')
```



**search**

```ts
// Search for a pattern in TypeScript files
const results = await grep.search({
 pattern: 'useState',
 include: '*.tsx',
 exclude: 'node_modules'
})

// Case insensitive search with context
const results = await grep.search({
 pattern: 'error',
 ignoreCase: true,
 before: 2,
 after: 2
})
```



**filesContaining**

```ts
const files = await grep.filesContaining('TODO')
// ['src/index.ts', 'src/utils.ts']
```



**imports**

```ts
const lodashImports = await grep.imports('lodash')
const localImports = await grep.imports('./utils')
```



**definitions**

```ts
const defs = await grep.definitions('MyComponent')
const classDefs = await grep.definitions('UserService')
```



**todos**

```ts
const todos = await grep.todos()
const fixmes = await grep.todos({ include: '*.ts' })
```



**count**

```ts
const count = await grep.count('console.log')
console.log(`Found ${count} console.log statements`)
```



**findForReplace**

```ts
const affected = await grep.findForReplace('oldFunctionName')
// [{ file: 'src/a.ts', matches: [...] }, { file: 'src/b.ts', matches: [...] }]
```

