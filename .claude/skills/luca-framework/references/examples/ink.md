---
title: "Ink"
tags: [ink, react, terminal, ui, components]
lastTested: null
lastTestPassed: null
---

# ink

React-powered terminal UI via the Ink library. Build rich, interactive command-line interfaces using React components that render directly in the terminal.

## Overview

The `ink` feature exposes the Ink library (React for CLIs) through the container. It provides access to React itself, all Ink components (Box, Text, Spacer, etc.), all Ink hooks (useInput, useApp, useFocus, etc.), and a render/unmount lifecycle. Because Ink renders an interactive React tree in the terminal, it cannot be fully demonstrated in a non-interactive markdown runner. Runnable blocks cover setup and introspection; actual rendering is shown in skip blocks.

## Enabling the Feature

```ts
const ink = container.feature('ink', { enable: true })
console.log('Ink enabled:', ink.state.get('enabled'))
console.log('Currently mounted:', ink.isMounted)
```

## Exploring the API

```ts
const docs = container.features.describe('ink')
console.log(docs)
```

## Loading Modules

The `loadModules` method pre-loads React and Ink so that the sync getters work immediately.

```ts
const ink = container.feature('ink', { enable: true })
await ink.loadModules()
const componentNames = Object.keys(ink.components)
const hookNames = Object.keys(ink.hooks)
console.log('Components:', componentNames.join(', '))
console.log('Hooks:', hookNames.join(', '))
console.log('React available:', typeof ink.React.createElement)
```

## Rendering a Component

Mount a React element to the terminal using `React.createElement`.

```ts skip
const { Box, Text } = ink.components
const { React } = ink

ink.render(
  React.createElement(Box, { flexDirection: 'column' },
    React.createElement(Text, { color: 'green' }, 'Hello from Ink'),
    React.createElement(Text, { dimColor: true }, 'Powered by Luca')
  )
)
await ink.waitUntilExit()
```

The `render` method mounts the React tree and starts the Ink render loop. `waitUntilExit` returns a promise that resolves when the app exits (via `useApp().exit()` or `unmount()`).

## Using Hooks

Ink hooks like `useInput` and `useFocus` work inside functional components passed to `render`.

```ts skip
const { Text } = ink.components
const { React } = ink
const { useInput, useApp } = ink.hooks

function App() {
  const { exit } = useApp()
  useInput((input, key) => {
    if (input === 'q') exit()
  })
  return React.createElement(Text, null, 'Press q to quit')
}

ink.render(React.createElement(App))
await ink.waitUntilExit()
console.log('App exited')
```

## Unmounting and Cleanup

Tear down the rendered app and clear terminal output.

```ts skip
ink.render(
  React.createElement(ink.components.Text, null, 'Temporary UI')
)
ink.clear()
ink.unmount()
console.log('Mounted after unmount:', ink.isMounted)
```

The `clear` method erases all Ink-rendered content from the terminal. The `unmount` method tears down the React tree. Both are safe to call when no app is mounted.

## Summary

The `ink` feature brings React-based terminal UIs to Luca scripts. It provides the full Ink component and hook library, a render lifecycle with mount/unmount/rerender, and access to the React module itself. Best suited for interactive CLI tools and dashboards.
