---
title: "REPL"
tags: [repl, interactive, debugging, console]
lastTested: null
lastTestPassed: null
---

# repl

Interactive read-eval-print loop with tab completion, history, and full container access.

## Overview

The `repl` feature is an on-demand feature that launches an interactive REPL session inside a VM context populated with the container and all its helpers. It supports tab completion for dot-notation property access, command history persistence, and top-level await. Since it is interactive, it cannot run inside a markdown code block -- instead, the typical workflow is to run `luca run somefile.md --console` which executes all code blocks first and then drops into a REPL with the accumulated context.

## Feature Documentation

Let us inspect the feature's built-in documentation.

```ts
const desc = container.features.describe('repl')
console.log(desc)
```

The main method is `start(options?)` which begins the interactive session. It accepts an optional context object and history path.

## Enabling the Feature

We can enable the feature and inspect its state without starting the interactive session.

```ts
const repl = container.feature('repl', { enable: true })
console.log('REPL enabled:', repl.state.enabled)
console.log('REPL started:', repl.state.started)
```

The feature is enabled but not started. Starting it would block execution waiting for interactive input, which is not suitable for a markdown runner context.

## Configuration Options

The REPL feature accepts several options for customization.

```ts
const options = {
  prompt: 'Custom prompt string displayed before each input line',
  historyPath: 'Path to a file where command history is persisted between sessions',
  context: 'Additional variables injected into the VM evaluation context',
}
for (const [key, desc] of Object.entries(options)) {
  console.log(`  ${key}: ${desc}`)
}
```

When you provide a `context` object to `start()`, those variables become globally available in the REPL session alongside the container and its helpers.

## How to Use the REPL

The recommended way to use the REPL is through the `--console` flag on `luca run`.

```ts
console.log('Usage patterns:')
console.log('')
console.log('  luca run script.md --console')
console.log('    Run all code blocks, then drop into REPL with accumulated context')
console.log('')
console.log('  luca run setup.md --console')
console.log('    Execute setup code, then explore interactively')
console.log('')
console.log('Inside the REPL:')
console.log('  - Tab completion works on all container properties')
console.log('  - Top-level await is supported')
console.log('  - Type .exit or exit to quit')
```

This is especially powerful when combined with runnable markdown files: you define your setup and data loading in code blocks, then explore the results interactively in the REPL.

## REPL Context

When launched via `--console`, the REPL inherits everything from the markdown execution context. This means all variables, enabled features, and loaded data carry over.

```ts
console.log('The REPL context automatically includes:')
const globals = ['container', 'fs', 'git', 'proc', 'grep', 'os', 'networking', 'ui', 'vm', 'esbuild', 'console']
for (const name of globals) {
  console.log(`  ${name}`)
}
console.log('')
console.log('Plus any variables defined in preceding code blocks.')
```

## Summary

This demo covered the `repl` feature, which provides an interactive REPL with tab completion, history, and async support. Since it is interactive by nature, it is best used via `luca run somefile.md --console` to combine scripted setup with interactive exploration. The REPL inherits the full container context plus any variables accumulated during markdown execution.
