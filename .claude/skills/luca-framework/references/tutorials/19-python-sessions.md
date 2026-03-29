---
title: Working with Python Projects
tags: [python, sessions, persistent, bridge, codebase, interop, data-science]
---

# Working with Python Projects

Luca's `python` feature has two modes: **stateless** execution (fire-and-forget, one process per call) and **persistent sessions** (a long-lived Python process that maintains state across calls). This tutorial focuses on sessions — the mode that lets you actually work inside a Python codebase.

## When to Use Sessions

Stateless `execute()` is fine for one-off scripts. But if you need any of these, you want a session:

- **Imports that persist** — load `pandas` once, use it across many calls
- **State that builds up** — query a database, filter results, then export
- **Working inside a real project** — import your own modules, call your own functions
- **Expensive setup** — ML model loading, database connections, API client initialization

## Quick Start

```ts skip
const python = container.feature('python', { dir: '/path/to/my-python-project' })
await python.enable()
await python.startSession()

// Everything below runs in the same Python process.
// Variables, imports, and state persist across calls.

await python.run('import pandas as pd')
await python.run('df = pd.read_csv("data/sales.csv")')

const result = await python.run('print(df.shape)')
console.log(result.stdout) // '(1000, 12)\n'

const total = await python.eval('df["revenue"].sum()')
console.log('Total revenue:', total)

await python.stopSession()
```

## Project Directory

The `dir` option tells Luca where the Python project lives. This determines:

1. **sys.path** — the bridge adds the project root (and `src/`, `lib/` if they exist) so your imports work
2. **Environment detection** — Luca looks for `uv.lock`, `pyproject.toml`, `venv/`, etc. in this directory
3. **Working directory** — the bridge process runs with `cwd` set to this path

```ts skip
// Explicit project directory
const python = container.feature('python', { dir: '/Users/me/projects/my-api' })

// Or defaults to wherever luca was invoked from
const python = container.feature('python')
```

If your project uses a `src/` layout (common in modern Python), the bridge automatically adds it to `sys.path`:

```
my-project/
  src/
    myapp/
      __init__.py
      models.py
  pyproject.toml
```

```ts skip
await python.startSession()
// This works because src/ was added to sys.path
await python.importModule('myapp.models', 'models')
```

## Session Lifecycle

### Starting

`startSession()` spawns a Python bridge process that talks to Luca over stdin/stdout using a JSON-line protocol. The bridge sets up `sys.path` and signals when it's ready.

```ts skip
await python.enable()
await python.startSession()

console.log(python.state.get('sessionActive')) // true
console.log(python.state.get('sessionId'))     // uuid
```

### Stopping

`stopSession()` kills the bridge process and cleans up. Any pending requests are rejected.

```ts skip
await python.stopSession()
console.log(python.state.get('sessionActive')) // false
```

### Crash Recovery

If the Python process dies unexpectedly (segfault, killed externally), the feature:
- Sets `sessionActive` to `false`
- Rejects all pending requests
- Emits a `sessionError` event

```ts skip
python.on('sessionError', ({ error, sessionId }) => {
  console.error('Python session error:', error)
  // You could restart: await python.startSession()
})
```

## The Session API

### run(code, variables?)

Execute Python code in the persistent namespace. This is the workhorse method.

```ts skip
// Simple execution
const result = await python.run('print("hello")')
// result.ok === true
// result.stdout === 'hello\n'

// With variable injection
const result = await python.run('print(f"Processing {count} items")', { count: 42 })

// Errors don't crash the session
const bad = await python.run('raise ValueError("oops")')
// bad.ok === false
// bad.error === 'oops'
// bad.traceback === 'Traceback (most recent call last):\n...'

// Session still alive after error
const good = await python.run('print("still here")')
// good.ok === true
```

### eval(expression)

Evaluate a Python expression and return its value to JavaScript.

```ts skip
await python.run('x = [1, 2, 3]')
const length = await python.eval('len(x)')      // 3
const doubled = await python.eval('[i*2 for i in x]') // [2, 4, 6]
```

Values are JSON-serialized. Complex types that can't be serialized come back as their `repr()` string.

### importModule(name, alias?)

Import a module into the session namespace. The alias defaults to the last segment of the module path.

```ts skip
await python.importModule('json')                    // import json
await python.importModule('myapp.models', 'models')  // import myapp.models as models
await python.importModule('os.path')                 // import os.path (available as "path")
```

### call(funcPath, args?, kwargs?)

Call a function by its dotted path in the namespace.

```ts skip
await python.importModule('json')
const encoded = await python.call('json.dumps', [{ a: 1 }], { indent: 2 })
// '{\n  "a": 1\n}'

// Works with your own functions too
await python.run('def add(a, b): return a + b')
const sum = await python.call('add', [3, 4]) // 7
```

### getLocals()

Inspect everything in the session namespace.

```ts skip
await python.run('x = 42')
await python.importModule('json')
const locals = await python.getLocals()
// { x: 42, json: '<module ...>' }
```

### resetSession()

Clear all variables and imports without restarting the process.

```ts skip
await python.run('big_model = load_model()')
await python.resetSession()
// big_model is gone, but the session process is still running
```

## Real-World Patterns

### Data Analysis Pipeline

```ts skip
const python = container.feature('python', { dir: '/path/to/analytics' })
await python.enable()
await python.startSession()

// Setup
await python.run('import pandas as pd')
await python.run('import matplotlib')
await python.run('matplotlib.use("Agg")')  // headless
await python.run('import matplotlib.pyplot as plt')

// Load and analyze
await python.run('df = pd.read_csv("data/events.csv")')
const shape = await python.eval('list(df.shape)')
console.log(`Loaded ${shape[0]} rows, ${shape[1]} columns`)

const columns = await python.eval('list(df.columns)')
console.log('Columns:', columns)

// Filter and aggregate
await python.run(`
filtered = df[df["status"] == "completed"]
summary = filtered.groupby("category")["amount"].agg(["sum", "mean", "count"])
`)

const summary = await python.eval('summary.to_dict()')
console.log('Summary:', summary)

// Generate a chart
await python.run(`
fig, ax = plt.subplots(figsize=(10, 6))
summary["sum"].plot(kind="bar", ax=ax)
ax.set_title("Revenue by Category")
fig.savefig("output/revenue.png", dpi=150, bbox_inches="tight")
plt.close(fig)
`)

await python.stopSession()
```

### Working with a Django Project

```ts skip
const python = container.feature('python', { dir: '/path/to/django-project' })
await python.enable()
await python.startSession()

// Django requires this before you can import models
await python.run(`
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")

import django
django.setup()
`)

// Now you can work with the ORM
await python.run('from myapp.models import User, Order')

const userCount = await python.eval('User.objects.count()')
console.log(`${userCount} users in database`)

const recentOrders = await python.eval(`
list(Order.objects.filter(status="pending").values("id", "total", "created_at")[:10])
`)
console.log('Recent pending orders:', recentOrders)

await python.stopSession()
```

### ML Model Interaction

```ts skip
const python = container.feature('python', { dir: '/path/to/ml-project' })
await python.enable()
await python.startSession()

// Expensive setup — only happens once
await python.run(`
from transformers import pipeline
classifier = pipeline("sentiment-analysis")
print("Model loaded")
`)

// Now you can call it cheaply many times
async function classify(text: string) {
  return python.call('classifier', [text])
}

const results = await Promise.all([
  classify('I love this product!'),
  classify('Terrible experience.'),
  classify('It was okay, nothing special.'),
])

console.log(results)
// [
//   [{ label: 'POSITIVE', score: 0.9998 }],
//   [{ label: 'NEGATIVE', score: 0.9994 }],
//   [{ label: 'NEGATIVE', score: 0.7231 }],
// ]

await python.stopSession()
```

### Luca Command That Uses Python

```ts skip
// commands/analyze.ts
import { z } from 'zod'
import type { ContainerContext } from '@soederpop/luca'
import { CommandOptionsSchema } from '@soederpop/luca/schemas'

export const positionals = ['target']
export const argsSchema = CommandOptionsSchema.extend({
  target: z.string().describe('Path to CSV file to analyze'),
})

async function handler(options: z.infer<typeof argsSchema>, context: ContainerContext) {
  const container = context.container as any
  const python = container.feature('python')
  await python.enable()
  await python.startSession()

  try {
    await python.run('import pandas as pd')
    await python.run(`df = pd.read_csv("${options.target}")`)

    const shape = await python.eval('list(df.shape)')
    const dtypes = await python.eval('dict(df.dtypes.astype(str))')
    const nulls = await python.eval('dict(df.isnull().sum())')

    console.log(`Rows: ${shape[0]}, Columns: ${shape[1]}`)
    console.log('Column types:', dtypes)
    console.log('Null counts:', nulls)
  } finally {
    await python.stopSession()
  }
}

export default {
  description: 'Analyze a CSV file using pandas',
  argsSchema,
  handler,
}
```

```bash
luca analyze data/sales.csv
```

## Stateless vs. Session: Choosing the Right Mode

| | `execute()` (stateless) | `run()` (session) |
|---|---|---|
| Process | Fresh per call | Shared, long-lived |
| State | None — each call starts clean | Persists across calls |
| Imports | Re-imported every time | Imported once, reused |
| Startup cost | ~50-200ms per call | ~200ms once, then ~1ms per call |
| Use case | One-off scripts, simple eval | Real projects, data pipelines, REPL-like |
| Error isolation | Perfect — crash is contained | Errors caught, session survives |

Both modes use the same environment detection (uv, conda, venv, system) and respect the same `dir` and `pythonPath` options.

## Environment Detection

The feature detects Python environments in this order:

1. **Explicit** — `pythonPath` option overrides everything
2. **uv** — `uv.lock` or `pyproject.toml` present, `uv run python` works
3. **conda** — `environment.yml` or `conda.yml` present
4. **venv** — `venv/` or `.venv/` directory with a Python binary inside
5. **system** — falls back to `python3` or `python` on PATH

```ts skip
const python = container.feature('python', { dir: '/path/to/project' })
await python.enable()
console.log(python.environmentType) // 'uv' | 'conda' | 'venv' | 'system'
console.log(python.pythonPath)      // e.g. '/Users/me/.local/bin/uv run python'
```

## Events

The session emits events you can listen to for monitoring and debugging:

```ts skip
python.on('sessionStarted', ({ sessionId }) => {
  console.log('Session started:', sessionId)
})

python.on('sessionStopped', ({ sessionId }) => {
  console.log('Session stopped:', sessionId)
})

python.on('sessionError', ({ error, sessionId }) => {
  console.error('Session error:', error)
})
```

## What's Next

- [Creating Features](./10-creating-features.md) — build your own feature that wraps a Python service
- [Commands](./08-commands.md) — create CLI commands that leverage Python
- [Servers and Endpoints](./06-servers.md) — expose Python-powered analysis via HTTP
