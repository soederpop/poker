---
title: Getting Started with Luca
tags: [setup, quickstart, project, init]
---

# Getting Started with Luca

## Prerequisites

- [Bun](https://bun.sh) installed (Luca's runtime)
- A new or existing bun project

## Create a New Project

```bash
mkdir my-app && cd my-app
bun init -y
bun add @soederpop/luca 
```

## Project Structure

A typical Luca project looks like this:

```
my-app/
├── package.json
├── endpoints/          # File-based HTTP routes (auto-discovered by `luca serve`)
│   ├── health.ts
│   └── users.ts
├── commands/           # Project-local CLI commands (auto-discovered by `luca`)
│   └── seed.ts
├── assistants/         # AI assistants (file-based convention)
│   └── my-helper/
│       ├── CORE.md
│       ├── tools.ts
│       ├── hooks.ts
│       └── docs/
├── public/             # Static files served by `luca serve`
│   └── index.html
└── scripts/            # Standalone scripts that use the container
    └── migrate.ts
```

## The Container

Everything in Luca revolves around the **container**. It is a per-process singleton that acts as your dependency injector, event bus, and state machine.

In scripts, you create one directly:

```typescript
import container from '@soederpop/luca/node'

// Now you have access to all features
const fs = container.fs           // File system operations
const git = container.git         // Git utilities (branch, sha, lsFiles, etc.)
const ui = container.ui           // Terminal UI (colors, prompts, figlet)
const proc = container.feature('proc')  // Process execution
```

In endpoints and commands, the container is provided for you via context:

```typescript
// endpoints/health.ts
export const path = '/health'

export async function get(_params: any, ctx: EndpointContext) {
  const { container } = ctx
  return { status: 'ok', uptime: process.uptime() }
}
```

## Running Your Project

### Start the API server

```bash
luca serve
# or with options:
luca serve --port 4000 --endpointsDir src/endpoints
```

This auto-discovers your `endpoints/` directory, mounts all routes, and generates an OpenAPI spec at `/openapi.json`.

### Run a CLI command

```bash
luca seed --count 10
```

This auto-discovers `commands/seed.ts` from your project and runs it.

### Run a script

```bash
luca run scripts/migrate.ts
```

## What's Next

- [The Container](./02-container.md) -- deep dive into the container
- [Scripts and Markdown Notebooks](./03-scripts.md) -- run scripts and executable markdown
- [Using Features](./04-features-overview.md) -- explore built-in features
- [Servers](./06-servers.md) -- set up Express and WebSocket servers
- [Writing Endpoints](./07-endpoints.md) -- build your API routes
- [Writing Commands](./08-commands.md) -- add CLI commands to your project
