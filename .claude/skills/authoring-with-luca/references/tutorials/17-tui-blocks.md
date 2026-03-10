---
title: Building TUI Primitive Blocks
tags: [ink, react, terminal, ui, components, tui, blocks, tutorial]
---

# Building TUI Primitive Blocks

This tutorial teaches you how to build a library of reusable terminal UI primitives using Ink blocks. Each block is a React component you can render inline in any runnable markdown document. We'll build them from simple to complex, covering layout, color, state, and composition patterns along the way.

Run this tutorial to see every block in action:

```
luca run docs/tutorials/17-tui-blocks
```

## Blocks

```tsx
const { Box, Text, Newline, Spacer } = ink.components
const React = ink.React

// ─── Divider ──────────────────────────────────────────
// A horizontal rule with an optional centered label.
function Divider({ label, color, width }) {
  const w = width || 60
  const ch = '─'

  if (!label) {
    return <Text color={color || 'gray'}>{ch.repeat(w)}</Text>
  }

  const pad = ` ${label} `
  const side = Math.max(0, Math.floor((w - pad.length) / 2))
  const right = Math.max(0, w - side - pad.length)

  return (
    <Text>
      <Text color={color || 'gray'}>{ch.repeat(side)}</Text>
      <Text color={color || 'white'} bold>{pad}</Text>
      <Text color={color || 'gray'}>{ch.repeat(right)}</Text>
    </Text>
  )
}

// ─── Badge ────────────────────────────────────────────
// A compact colored label, like a GitHub status badge.
const BADGE_STYLES = {
  success: { bg: 'green', fg: 'white', icon: '✓' },
  error:   { bg: 'red', fg: 'white', icon: '✗' },
  warning: { bg: 'yellow', fg: 'black', icon: '!' },
  info:    { bg: 'blue', fg: 'white', icon: 'i' },
  neutral: { bg: 'gray', fg: 'white', icon: '·' },
}

function Badge({ type, label }) {
  const style = BADGE_STYLES[type] || BADGE_STYLES.neutral
  return (
    <Text backgroundColor={style.bg} color={style.fg} bold>
      {` ${style.icon} ${label} `}
    </Text>
  )
}

// ─── Alert ────────────────────────────────────────────
// A bordered message box for notices, warnings, errors.
const ALERT_STYLES = {
  info:    { border: 'blue', icon: 'ℹ', title: 'Info' },
  success: { border: 'green', icon: '✓', title: 'Success' },
  warning: { border: 'yellow', icon: '⚠', title: 'Warning' },
  error:   { border: 'red', icon: '✗', title: 'Error' },
}

function Alert({ type, message, title }) {
  const style = ALERT_STYLES[type] || ALERT_STYLES.info
  const heading = title || style.title

  return (
    <Box borderStyle="round" borderColor={style.border} paddingX={1} flexDirection="column" width={60}>
      <Text color={style.border} bold>{style.icon}  {heading}</Text>
      <Text>{message}</Text>
    </Box>
  )
}

// ─── KeyValue ─────────────────────────────────────────
// Display a record as aligned key: value pairs.
function KeyValue({ data, keyColor, separator }) {
  const entries = Object.entries(data)
  const maxKey = Math.max(...entries.map(([k]) => k.length))
  const sep = separator || ':'

  return (
    <Box flexDirection="column">
      {entries.map(([key, val], i) => (
        <Box key={i}>
          <Text color={keyColor || 'cyan'} bold>{key.padEnd(maxKey)}</Text>
          <Text dimColor> {sep} </Text>
          <Text>{String(val)}</Text>
        </Box>
      ))}
    </Box>
  )
}

// ─── DataTable ────────────────────────────────────────
// A data table with headers, column widths, and borders.
function DataTable({ headers, rows, borderColor }) {
  const bc = borderColor || 'gray'
  const colWidths = headers.map((h, ci) => {
    const vals = [h.label || h, ...rows.map(r => String(r[ci] ?? ''))]
    return Math.max(...vals.map(v => v.length)) + 2
  })

  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + headers.length + 1
  const hLine = '─'.repeat(totalWidth - 2)

  function Row({ cells, bold: isBold, color }) {
    return (
      <Box>
        <Text color={bc}>│</Text>
        {cells.map((cell, ci) => (
          <Box key={ci}>
            <Text color={color} bold={isBold}>{` ${String(cell).padEnd(colWidths[ci] - 2)} `}</Text>
            <Text color={bc}>│</Text>
          </Box>
        ))}
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text color={bc}>┌{hLine}┐</Text>
      <Row cells={headers.map(h => h.label || h)} bold={true} color="cyan" />
      <Text color={bc}>├{hLine}┤</Text>
      {rows.map((row, ri) => (
        <Row key={ri} cells={row} color={ri % 2 === 0 ? 'white' : 'gray'} />
      ))}
      <Text color={bc}>└{hLine}┘</Text>
    </Box>
  )
}

// ─── ProgressBar ──────────────────────────────────────
// A visual bar with percentage and optional label.
function ProgressBar({ value, total, label, width, color }) {
  const pct = Math.min(1, Math.max(0, value / (total || 100)))
  const barWidth = (width || 30)
  const filled = Math.round(pct * barWidth)
  const empty = barWidth - filled
  const c = color || 'green'

  return (
    <Box>
      {label && <Text color="white" bold>{label.padEnd(12)} </Text>}
      <Text color={c}>{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
      <Text dimColor> {Math.round(pct * 100)}%</Text>
    </Box>
  )
}

// ─── Tree ─────────────────────────────────────────────
// Render a nested object/array as a tree view.
function TreeNode({ name, children: kids, isLast, prefix }) {
  const connector = isLast ? '└── ' : '├── '
  const childPrefix = prefix + (isLast ? '    ' : '│   ')

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="gray">{prefix}{connector}</Text>
        {kids ? (
          <Text color="yellow" bold>{name}/</Text>
        ) : (
          <Text color="green">{name}</Text>
        )}
      </Text>
      {kids && kids.map((child, i) => (
        <TreeNode
          key={i}
          name={child.name}
          children={child.children}
          isLast={i === kids.length - 1}
          prefix={childPrefix}
        />
      ))}
    </Box>
  )
}

function Tree({ label, items }) {
  return (
    <Box flexDirection="column">
      <Text color="yellow" bold>{label || '.'}</Text>
      {items.map((item, i) => (
        <TreeNode
          key={i}
          name={item.name}
          children={item.children}
          isLast={i === items.length - 1}
          prefix=""
        />
      ))}
    </Box>
  )
}

// ─── Panel ────────────────────────────────────────────
// A titled bordered box that wraps any child content.
function Panel({ title, children, borderColor, width }) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor || 'blue'}
      paddingX={1}
      width={width || 60}
    >
      {title && (
        <Box marginBottom={1}>
          <Text color={borderColor || 'blue'} bold>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  )
}

// ─── Spinner ──────────────────────────────────────────
// An animated spinner that runs until done() is called.
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

function Spinner({ message, done }) {
  const [frame, setFrame] = React.useState(0)

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % SPINNER_FRAMES.length)
    }, 80)
    // Signal done after a short display so the tutorial keeps moving
    const exit = setTimeout(() => done(), 1500)
    return () => { clearInterval(timer); clearTimeout(exit) }
  }, [])

  return (
    <Box>
      <Text color="cyan">{SPINNER_FRAMES[frame]} </Text>
      <Text>{message || 'Loading...'}</Text>
    </Box>
  )
}
```

## 1. Dividers — Simple Separation

The simplest useful primitive: a horizontal line. The `Divider` block accepts an optional label that gets centered in the rule, and a color.

A plain divider:

```ts
await render('Divider', {})
```

With a label:

```ts
await render('Divider', { label: 'Section One', color: 'cyan' })
```

Wide with a custom color:

```ts
await render('Divider', { label: 'Results', color: 'yellow', width: 50 })
```

**Pattern:** Use `Text` for inline styled strings. The `color` prop accepts any named color or hex value. Use `bold`, `dimColor`, `italic`, `underline`, `inverse`, and `strikethrough` for styling.

## 2. Badges — Compact Status Labels

Badges are small colored labels for tagging status or categories. They use `backgroundColor` to create the filled look.

```ts
await render('Badge', { type: 'success', label: 'PASSING' })
```

```ts
await render('Badge', { type: 'error', label: 'FAILED' })
```

```ts
await render('Badge', { type: 'warning', label: 'UNSTABLE' })
```

```ts
await render('Badge', { type: 'info', label: 'v2.1.0' })
```

**Pattern:** Define a styles map keyed by type name. This keeps your component clean and makes it easy to add new variants. `backgroundColor` on `Text` creates solid filled backgrounds.

## 3. Alerts — Bordered Message Boxes

Alerts combine borders, colors, and icons for eye-catching notices. They use `Box` with `borderStyle` and `borderColor`.

```ts
await render('Alert', { type: 'info', message: 'The ink feature provides Box, Text, Spacer, Newline, Static, and Transform components.' })
```

```ts
await render('Alert', { type: 'success', message: 'All 47 tests passed in 1.2s.' })
```

```ts
await render('Alert', { type: 'warning', message: 'Disk usage at 89%. Consider cleanup.' })
```

```ts
await render('Alert', { type: 'error', message: 'Connection refused: ECONNREFUSED 127.0.0.1:5432', title: 'Database Error' })
```

**Pattern:** `Box` supports border styles: `single`, `double`, `round`, `bold`, `singleDouble`, `doubleSingle`, `classic`. Combine `borderColor` with `paddingX`/`paddingY` for clean framing.

## 4. Key-Value — Structured Data Display

`KeyValue` renders an object as aligned label-value pairs. Great for config views, server status, and metadata displays.

```ts
await render('KeyValue', {
  data: {
    Host: '0.0.0.0',
    Port: 3000,
    Mode: 'development',
    PID: 48291,
    Uptime: '3h 14m',
    Workers: 4,
  },
})
```

With a custom key color and separator:

```ts
await render('KeyValue', {
  data: { Name: 'luca', Version: '0.8.0', Runtime: 'bun', License: 'MIT' },
  keyColor: 'yellow',
  separator: '→',
})
```

**Pattern:** Use `padEnd` to align columns. The `flexDirection="column"` on `Box` stacks rows vertically. Map over `Object.entries()` to render dynamic data.

## 5. Data Tables — Rows and Columns

`DataTable` is the workhorse for displaying tabular data with headers, computed column widths, and box-drawing borders.

```ts
await render('DataTable', {
  headers: ['Feature', 'Status', 'Type'],
  rows: [
    ['fs',       'enabled',  'core'],
    ['git',      'enabled',  'core'],
    ['ink',      'enabled',  'ui'],
    ['esbuild',  'lazy',     'build'],
    ['tts',      'disabled', 'media'],
  ],
})
```

Wider dataset:

```ts
await render('DataTable', {
  headers: ['Method', 'Path', 'Handler', 'Auth'],
  rows: [
    ['GET',    '/api/health',  'health.ts',  'none'],
    ['GET',    '/api/users',   'users.ts',   'jwt'],
    ['POST',   '/api/users',   'users.ts',   'jwt'],
    ['DELETE', '/api/users/:id', 'users.ts', 'admin'],
  ],
  borderColor: 'cyan',
})
```

**Pattern:** Auto-compute column widths from header + data. Use box-drawing characters (`┌─┐│├┤└─┘`) for clean borders. Alternating row colors (`ri % 2`) improve readability.

## 6. Progress Bars — Visual Metrics

`ProgressBar` fills a bar proportionally. Useful for build status, disk usage, test coverage — anywhere you want a quick visual read.

```ts
await render('ProgressBar', { label: 'Tests', value: 47, total: 50, color: 'green' })
```

```ts
await render('ProgressBar', { label: 'Coverage', value: 72, total: 100, color: 'yellow' })
```

```ts
await render('ProgressBar', { label: 'Disk', value: 89, total: 100, color: 'red' })
```

```ts
await render('ProgressBar', { label: 'Upload', value: 30, total: 100, color: 'cyan', width: 40 })
```

**Pattern:** Use `█` and `░` (or any unicode pair) for filled/empty. Calculate fill width as `Math.round(pct * barWidth)`. Clamp the percentage to avoid overflow.

## 7. Trees — Hierarchical Data

`Tree` renders nested structures with box-drawing connectors. Pass an array of `{ name, children? }` nodes.

```ts
await render('Tree', {
  label: 'my-app',
  items: [
    { name: 'src', children: [
      { name: 'commands', children: [
        { name: 'serve.ts' },
        { name: 'run.ts' },
      ]},
      { name: 'features', children: [
        { name: 'auth.ts' },
        { name: 'cache.ts' },
      ]},
      { name: 'index.ts' },
    ]},
    { name: 'endpoints', children: [
      { name: 'health.ts' },
      { name: 'users.ts' },
    ]},
    { name: 'package.json' },
    { name: 'tsconfig.json' },
  ],
})
```

**Pattern:** Recursive components are natural in React. Pass a `prefix` string down that builds the indentation. Use `├──` for intermediate nodes and `└──` for the last child. Color directories differently from files.

## 8. Spinner — Async Animation

The `Spinner` block uses `setInterval` to cycle through braille frames. Since it stays mounted until `done()` is called, use `renderAsync`.

```ts
await renderAsync('Spinner', { message: 'Compiling project...' })
```

```ts
await renderAsync('Spinner', { message: 'Fetching remote data...' })
```

**Pattern:** `renderAsync` keeps the component mounted until the `done` callback fires (or the timeout expires). Use `React.useEffect` to set up timers and return cleanup functions. The `done` prop is injected automatically by the rendering system.

## 9. Composition — Combining Blocks

The real power comes from composing primitives together. Here's a dashboard using multiple blocks rendered in sequence:

```ts
await render('Divider', { label: 'System Dashboard', color: 'cyan' })
```

```ts
await render('KeyValue', {
  data: { Host: 'localhost', Port: 3000, Env: 'development', Runtime: 'bun' },
  keyColor: 'cyan',
})
```

```ts
await render('Divider', { label: 'Services', color: 'cyan' })
```

```ts
await render('DataTable', {
  headers: ['Service', 'Status', 'Latency'],
  rows: [
    ['Express', 'running', '2ms'],
    ['WebSocket', 'running', '1ms'],
    ['Redis', 'stopped', '—'],
  ],
  borderColor: 'cyan',
})
```

```ts
await render('Divider', { label: 'Resources', color: 'cyan' })
```

```ts
await render('ProgressBar', { label: 'Memory', value: 64, total: 100, color: 'green' })
await render('ProgressBar', { label: 'CPU', value: 23, total: 100, color: 'green' })
await render('ProgressBar', { label: 'Disk', value: 87, total: 100, color: 'yellow' })
```

```ts
await render('Divider', {})
```

```ts
await render('Alert', { type: 'warning', message: 'Redis is not responding. Cache reads will fall through to database.' })
```

## Summary

These eight primitives cover most TUI needs:

```ts
await render('DataTable', {
  headers: ['Block', 'Use Case'],
  rows: [
    ['Divider',     'Visual separation between sections'],
    ['Badge',       'Compact status or version labels'],
    ['Alert',       'Notices, warnings, errors with borders'],
    ['KeyValue',    'Config, metadata, record display'],
    ['DataTable',   'Tabular data with headers'],
    ['ProgressBar', 'Percentages, quotas, progress'],
    ['Tree',        'File trees, dependency graphs, nested data'],
    ['Spinner',     'Async loading states with animation'],
  ],
  borderColor: 'green',
})
```

### Key Patterns

- **Style maps** — Keep variant styles in an object keyed by type name
- **Auto-sizing** — Compute widths from data with `padEnd` and `Math.max`
- **Box-drawing** — Use unicode box chars for clean borders and connectors
- **Recursion** — React components can call themselves for tree structures
- **Async lifecycle** — Use `renderAsync` + `done()` for animated or time-based blocks
- **Composition** — Render blocks in sequence to build dashboards from primitives
