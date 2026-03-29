---
title: Writing Commands
tags: [commands, cli, luca-cli, scripts, args]
---

# Writing Commands

Commands are CLI actions that the `luca` command discovers and runs. They are Helper subclasses under the hood — the framework grafts your module exports into a proper Command class at runtime, so you get the full Helper lifecycle (state, events, introspection) without ceremony.

## Basic Command

```typescript
// commands/seed.ts
import { z } from 'zod'
import type { ContainerContext } from '@soederpop/luca'

export const description = 'Seed the database with sample data'

export const argsSchema = z.object({
  count: z.number().default(10).describe('Number of records to seed'),
  table: z.string().optional().describe('Specific table to seed'),
})

export default async function seed(options: z.infer<typeof argsSchema>, context: ContainerContext) {
  const { container } = context

  console.log(`Seeding ${options.count} records...`)

  for (let i = 0; i < options.count; i++) {
    console.log(`  Created record ${i + 1}`)
  }

  console.log('Done.')
}
```

Run it:

```bash
luca seed --count 20 --table users
```

## How Discovery Works

When you run `luca <command>`, the CLI:

1. Loads built-in commands (serve, run, eval, describe, etc.)
2. Loads `luca.cli.ts` if present (for project-level container customization)
3. Discovers project commands via the `helpers` feature — scans `commands/` for `.ts` files
4. Discovers user commands from `~/.luca/commands/`
5. The filename becomes the command name: `commands/seed.ts` → `luca seed`

Discovery routes through the `helpers` feature (`container.feature('helpers')`), which handles native import vs VM loading and deduplicates concurrent discovery calls. Commands loaded through the VM get `container` injected as a global.

The `LUCA_COMMAND_DISCOVERY` env var controls discovery: `"disable"` skips all, `"no-local"` skips project, `"no-home"` skips user commands.

## Command Module Patterns

### Pattern 1: Default Export Function (recommended for project commands)

The simplest pattern — export a default async function. The function becomes the command's `run` method.

```typescript
// commands/greet.ts
import { z } from 'zod'
import type { ContainerContext } from '@soederpop/luca'

export const description = 'Greet someone'
export const argsSchema = z.object({
  name: z.string().default('world').describe('Who to greet'),
})

export default async function greet(options: z.infer<typeof argsSchema>, context: ContainerContext) {
  console.log(`Hello, ${options.name}!`)
}
```

### Pattern 2: Object Default Export with handler

Useful when you want to co-locate all exports in one object:

```typescript
// commands/deploy.ts
import { z } from 'zod'
import type { ContainerContext } from '@soederpop/luca'

export const argsSchema = z.object({
  env: z.enum(['staging', 'production']).describe('Target environment'),
  dryRun: z.boolean().default(false).describe('Preview without deploying'),
})

async function deploy(options: z.infer<typeof argsSchema>, context: ContainerContext) {
  const { container } = context
  if (options.dryRun) {
    console.log(`[DRY RUN] Would deploy to ${options.env}`)
    return
  }
  console.log(`Deploying ${container.git.sha} to ${options.env}...`)
}

export default {
  description: 'Deploy the application',
  argsSchema,
  handler: deploy,
}
```

### Pattern 3: registerHandler (used by built-in commands)

Built-in commands use `commands.registerHandler()` for explicit registration. This is the pattern used in `src/commands/`:

```typescript
// src/commands/my-builtin.ts
import { z } from 'zod'
import { commands } from '../command'
import { CommandOptionsSchema } from '../schemas/base'
import type { ContainerContext } from '../container'

declare module '../command.js' {
  interface AvailableCommands {
    'my-builtin': ReturnType<typeof commands.registerHandler>
  }
}

export const argsSchema = CommandOptionsSchema.extend({
  verbose: z.boolean().default(false).describe('Enable verbose output'),
})

export default async function myBuiltin(options: z.infer<typeof argsSchema>, context: ContainerContext) {
  // implementation
}

commands.registerHandler('my-builtin', {
  description: 'A built-in command',
  argsSchema,
  handler: myBuiltin,
})
```

Project commands generally don't need `registerHandler` — discovery handles registration automatically.

## Module Exports Reference

| Export | Type | Description |
|--------|------|-------------|
| `default` | function or object | Async function becomes `run`, or object with `{ description, argsSchema, handler }` |
| `description` | string | Help text shown in `luca --help` |
| `argsSchema` | Zod schema | Defines accepted flags, parsed from CLI args automatically |
| `positionals` | string[] | Names for positional arguments (mapped from `container.argv._`) |
| `run` | function | Named export alternative to default function — grafted as the command's run method |
| `handler` | function | Legacy alternative to `run` — receives parsed args via `parseArgs()` |

When discovery loads your module, `graftModule()` synthesizes a Command subclass from these exports. The `run` or `handler` function becomes the command's implementation, schemas become static properties, and any other exported functions become methods on the command instance.

## Arguments and Schemas

The `argsSchema` uses Zod to define what flags your command accepts. These are parsed from the CLI automatically:

```typescript
export const argsSchema = z.object({
  // String flag: --name "John"
  name: z.string().describe('User name'),

  // Number flag: --port 3000
  port: z.number().default(3000).describe('Port number'),

  // Boolean flag: --verbose
  verbose: z.boolean().default(false).describe('Enable verbose logging'),

  // Optional flag: --output file.json
  output: z.string().optional().describe('Output file path'),

  // Enum flag: --format json
  format: z.enum(['json', 'csv', 'table']).default('table').describe('Output format'),
})
```

### Positional Arguments

Export a `positionals` array to map CLI positional args into named fields on `options`. Each entry names the corresponding positional — `positionals[0]` maps `_[1]` (the first arg after the command name), `positionals[1]` maps `_[2]`, etc.

```typescript
export const positionals = ['target', 'destination']

export const argsSchema = z.object({
  target: z.string().describe('Source path to operate on'),
  destination: z.string().optional().describe('Where to write output'),
})

// luca my-command ./src ./out
// => options.target === './src', options.destination === './out'
```

Positional mapping only applies when dispatched from the CLI. For programmatic dispatch (`cmd.dispatch({ target: './src' }, 'headless')`), args are already named.

The raw positional array is still available as `options._` if you need it — `_[0]` is always the command name:

```typescript
// luca greet Alice Bob
// options._ => ['greet', 'Alice', 'Bob']
```

## Using the Container

Commands receive a context with the full container:

```typescript
export default async function handler(options: any, context: ContainerContext) {
  const { container } = context

  // File system operations
  const config = container.fs.readJson('./config.json')

  // Git info (these are getters, not methods)
  const branch = container.git.branch
  const sha = container.git.sha

  // Terminal UI
  container.ui.colors.green('Success!')

  // Run external processes (synchronous, returns string)
  const result = container.proc.exec('ls -la')

  // Use any feature
  const cache = container.feature('diskCache', { path: './.cache' })
}
```

## Command Dispatch

When the CLI runs a command, it calls `cmd.dispatch()` which:

1. Reads raw input from `container.argv` (or explicit args if called programmatically)
2. Validates args against `argsSchema` if present
3. Maps positional args if `positionals` is declared
4. Intercepts `--help` to show auto-generated help text
5. Calls `run(parsedOptions, context)` with the validated, typed options

You can also dispatch commands programmatically:

```typescript
const cmd = container.command('seed')
await cmd.dispatch({ count: 20, table: 'users' }, 'headless')
```

## Conventions

- **File location**: `commands/<name>.ts` in the project root. Auto-discovered by the CLI.
- **Naming**: kebab-case filenames. `commands/build-site.ts` → `luca build-site`.
- **Use the container**: Never import `fs`, `path`, `child_process` directly. Use `container.feature('fs')`, `container.paths`, `container.feature('proc')`.
- **Exit codes**: Return nothing for success. Throw for errors — the CLI catches and reports them.
- **Help text**: Use `.describe()` on every schema field — it powers `luca <command> --help`.
