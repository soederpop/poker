---
title: Features Overview
tags: [features, built-in, fs, git, proc, vm, ui, networking, os, diskCache]
---

# Features Overview

Features are the core building blocks in Luca. A feature is a thing that emits events, has observable state, and provides an interface for doing something meaningful. The container comes with many built-in features.

## Using Features

```typescript
// Auto-enabled features have shortcuts
container.fs          // File system
container.git         // Git operations
container.proc        // Process execution
container.vm          // JavaScript VM
container.ui          // Terminal UI
container.os          // OS info
container.networking  // Port utilities

// On-demand features are created through the factory
const cache = container.feature('diskCache', { path: './.cache' })
const db = container.feature('contentDb', { rootPath: './docs' })
```

## Built-In Feature Reference

### fs -- File System

Read, write, and navigate the file system:

```typescript
const fs = container.fs

// Read files (synchronous)
const content = fs.readFile('./README.md')
const json = fs.readJson('./package.json')

// Write files (async -- creates parent dirs automatically)
await fs.writeFile('./output.txt', 'Hello')

// Check existence
fs.exists('./path/to/file')

// Walk directories -- returns { files: string[], directories: string[] }
const { files } = fs.walk('./src', { include: ['*.ts'] })

// Find files upward (synchronous)
const configPath = fs.findUp('tsconfig.json')
```

### git -- Git Operations

Work with git repositories:

```typescript
const git = container.git

const branch = git.branch                  // Current branch name (getter)
const sha = git.sha                        // Current commit SHA (getter)
const isRepo = git.isRepo                  // Whether cwd is a git repo (getter)
const root = git.repoRoot                  // Absolute path to repo root (getter)
const files = await git.lsFiles()          // List tracked files
const recent = await git.getLatestChanges(5) // Recent commits
```

### proc -- Process Execution

Run external processes:

```typescript
const proc = container.proc

// Execute a command synchronously and get output as a string
const result = proc.exec('ls -la')

// Execute with options
const output = proc.exec('npm test', {
  cwd: '/path/to/project',
  env: { NODE_ENV: 'test' },
})
```

### vm -- JavaScript VM

Execute JavaScript in an isolated context:

```typescript
const vm = container.vm

const result = await vm.run('1 + 2 + 3')  // 6

const greeting = await vm.run('`Hello ${name}!`', { name: 'World' })
// 'Hello World!'

// The VM has access to the container context by default
const files = await vm.run('container.fs.walk("./src")')
```

### ui -- Terminal UI

Colors, prompts, and formatted output:

```typescript
const ui = container.ui

// Colors
ui.colors.green('Success!')
ui.colors.red('Error!')
ui.colors.yellow('Warning!')

// ASCII art
console.log(ui.asciiArt('My App', 'Standard'))

// Colorful ASCII banner with gradient
console.log(ui.banner('My App', { font: 'Star Wars', colors: ['red', 'white', 'blue'] }))

// Render markdown in the terminal
ui.markdown('# Hello\n\nThis is **bold**')
```

### networking -- Port Utilities

```typescript
const net = container.networking

// Find an available port (starting from a preferred port)
const port = await net.findOpenPort(3000)
```

### os -- System Info

```typescript
const os = container.os

os.platform   // 'darwin', 'linux', 'win32'
os.arch       // 'x64', 'arm64'
os.cpuCount   // Number of CPU cores
os.tmpdir     // Temp directory path
```

### diskCache -- Disk-Based Cache

```typescript
const cache = container.feature('diskCache', { path: './.cache' })

await cache.set('key', { data: 'value' })
const data = await cache.get('key')
await cache.has('key')    // true
await cache.rm('key')     // remove a cached item
```

### contentDb -- Markdown as a Database

Turn markdown folders into queryable collections. See the dedicated [ContentBase tutorial](./11-contentbase.md).

### fileManager -- Batch File Operations

```typescript
const fm = container.feature('fileManager')
// Batch read, write, copy, move operations
```

### grep -- Search File Contents

```typescript
const grep = container.grep
const results = await grep.search({ pattern: 'TODO', include: '*.ts' })
// Returns array of { file, line, column, match } objects
```

### docker -- Docker Operations

```typescript
const docker = container.feature('docker')
// Build, run, manage containers
```

## Discovering Features

Don't memorize this list. You can always discover what's available at runtime:

```typescript
// List all registered features
container.features.available

// Get documentation for any feature
container.features.describe('diskCache')

// Get docs for everything
container.features.describeAll()

// Structured introspection data for a feature's full API
container.feature('fs').introspect()
```
