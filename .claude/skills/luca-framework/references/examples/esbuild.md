---
title: "esbuild"
tags: [esbuild, transpilation, bundling, typescript]
lastTested: null
lastTestPassed: null
---

# esbuild

Transpile TypeScript, TSX, and JSX to JavaScript at runtime using Bun's built-in transpiler. Compile code strings on the fly without touching the filesystem.

## Overview

The `esbuild` feature is a core feature, meaning it is auto-enabled on every container. You can access it directly as a global or via `container.feature('esbuild')`. It wraps Bun's transpiler and exposes both synchronous and asynchronous `transform` methods. Use it for runtime code generation, plugin systems, or any scenario where you need to compile TypeScript strings to runnable JavaScript.

## Synchronous Transform

Use `transformSync()` to transpile a TypeScript string to JavaScript in a single blocking call.

```ts
const result = esbuild.transformSync('const x: number = 42; console.log(x);')
console.log('Input:  const x: number = 42; console.log(x);')
console.log('Output:', result.code.trim())
```

The type annotations are stripped and the output is plain JavaScript.

## Async Transform

The async `transform()` method does the same thing but returns a promise. Prefer this in hot paths where you do not want to block.

```ts
const tsxCode = `
interface Props { name: string }
const Greet = (props: Props) => <h1>Hello {props.name}</h1>
`
const out = await esbuild.transform(tsxCode, { loader: 'tsx' })
console.log('TSX transpiled:')
console.log(out.code.trim())
```

Notice the `loader: 'tsx'` option tells the transpiler to handle JSX syntax.

## Minification

Pass `minify: true` to produce compact output with whitespace removed.

```ts
const verbose = `
  function greet(name: string): string {
    const greeting = "Hello, " + name + "!";
    return greeting;
  }
`
const normal = esbuild.transformSync(verbose)
const minified = esbuild.transformSync(verbose, { minify: true })
console.log('Normal length:', normal.code.length)
console.log('Minified length:', minified.code.length)
console.log('Minified:', minified.code.trim())
```

Minification is useful when generating code that will be sent to a browser or embedded in a response.

## Different Loaders

The feature supports multiple source languages via the `loader` option.

```ts
const jsxResult = esbuild.transformSync(
  'const App = () => <div className="app">Content</div>',
  { loader: 'tsx' }
)
console.log('JSX output:', jsxResult.code.trim())
```

Supported loaders include `ts` (default), `tsx`, `jsx`, and `js`.

## Summary

This demo covered synchronous and asynchronous transpilation, minification, and using different source loaders. The `esbuild` feature gives you runtime TypeScript-to-JavaScript compilation with zero configuration.
