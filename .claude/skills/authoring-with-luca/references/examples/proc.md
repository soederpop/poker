---
title: "proc"
tags: [proc, process, shell, core]
lastTested: null
lastTestPassed: null
---

# proc

Process execution utilities for running shell commands and capturing their output.

## Overview

The `proc` feature is a core feature, auto-enabled on every container. You can access it directly as a global or via `container.feature('proc')`. It provides synchronous and asynchronous methods for executing shell commands. Use `exec()` for quick synchronous calls and `execAndCapture()` when you need structured output with exit codes.

## Simple Command Execution

Use `exec()` to run a command synchronously and get its stdout as a string.

```ts
const result = proc.exec('echo hello from luca')
console.log('Output:', result.trim())
```

The output is returned directly as a string, with no wrapper object.

## Listing Files

Commands that produce multi-line output work naturally. Each line comes through as part of the string.

```ts
const listing = proc.exec('ls src')
const entries = listing.trim().split('\n')
console.log('Entries in src/:', entries.length)
entries.slice(0, 5).forEach(e => console.log(' ', e))
```

You can split and process the output like any other string.

## Working Directory Option

Pass a `cwd` option to run a command in a different directory without changing the container's working directory.

```ts
const rootFiles = proc.exec('ls -1', { cwd: '.' })
console.log('Files in project root:')
rootFiles.trim().split('\n').slice(0, 5).forEach(f => console.log(' ', f))
```

This is useful when you need to operate on files in a subdirectory or sibling project.

## Getting System Info

Shell commands work for gathering system information that might not be available through other features.

```ts
const date = proc.exec('date')
console.log('Current date:', date.trim())

const whoami = proc.exec('whoami')
console.log('Current user:', whoami.trim())
```

Any command available on the system PATH can be called through `exec()`.

## Async Execution with Capture

Use `execAndCapture()` for async execution with structured output including exit code and stderr.

```ts
const result = await proc.execAndCapture('ls src')
console.log('Exit code:', result.exitCode)
console.log('Stdout lines:', result.stdout.trim().split('\n').length)
console.log('Stderr:', result.stderr || '(empty)')
```

The returned object gives you `stdout`, `stderr`, `exitCode`, and `pid` for full control over the result.

## Summary

This demo covered synchronous command execution, processing multi-line output, running commands in different directories, gathering system info, and async execution with structured results. The `proc` feature is the escape hatch for anything the other features do not cover directly.
