---
title: "vm"
tags: [vm, sandbox, evaluation, core]
lastTested: null
lastTestPassed: null
---

# vm

JavaScript VM for evaluating code in isolated contexts with shared or independent state.

## Overview

The `vm` feature is a core feature, auto-enabled on every container. You can access it directly as a global or via `container.feature('vm')`. It provides methods for running JavaScript in sandboxed contexts, passing variables in, and optionally preserving state across multiple runs. Use it for plugin systems, dynamic code evaluation, or testing snippets in isolation.

## Simple Expression Evaluation

Use `runSync()` to evaluate a JavaScript expression and get the result back immediately.

```ts
const sum = vm.runSync('2 + 3 * 4')
console.log('2 + 3 * 4 =', sum)

const greeting = vm.runSync('`Hello ${name}!`', { name: 'Luca' })
console.log(greeting)
```

The second argument is an optional context object whose keys become variables in the evaluated code.

## Running with Context Variables

Use `run()` for async evaluation with injected variables. This is the async equivalent of `runSync()`.

```ts
const result = await vm.run('numbers.reduce((a, b) => a + b, 0)', {
  numbers: [10, 20, 30, 40]
})
console.log('Sum of [10, 20, 30, 40]:', result)
```

Any JavaScript value can be passed through the context -- arrays, objects, functions, and primitives.

## Getting the Context Back

Use `performSync()` to run code and get both the result and the modified context. This lets you inspect variables that were set during execution.

```ts
const { result, context } = vm.performSync('x = x * 2; x + 1', { x: 21 })
console.log('Result:', result)
console.log('x after execution:', context.x)
```

The context is mutated in place, so you can see side effects of the evaluated code.

## Shared State Across Runs

Use `createContext()` to build a persistent context that carries state across multiple evaluations.

```ts
const ctx = vm.createContext({ counter: 0 })
vm.runSync('counter += 1', ctx)
vm.runSync('counter += 1', ctx)
vm.runSync('counter += 10', ctx)
console.log('Counter after 3 runs:', vm.runSync('counter', ctx))
```

The same context object is reused, so variables accumulate across calls.

## Error Handling

When evaluated code might throw, wrap the call in a try/catch to handle it gracefully.

```ts
try {
  vm.runSync('undefinedFunction()')
} catch (err) {
  console.log('Error caught:', err.constructor.name)
  console.log('Message:', err.message)
}
```

This keeps a bad snippet from crashing the rest of your program.

## Summary

This demo covered synchronous and async expression evaluation, passing context variables into the sandbox, inspecting mutated context after execution, maintaining shared state across runs, and safe error handling. The `vm` feature is the foundation for dynamic code execution in any Luca application.
