---
title: Writing Commands
tags: [commands, cli, luca-cli, scripts, args]
---

# Writing Commands

Commands are CLI actions that the `luca` command discovers and runs. Projects can define their own commands in a `commands/` directory at the project root.

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

export async function handler(options: z.infer<typeof argsSchema>, context: ContainerContext) {
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

1. Loads built-in commands (serve, run, etc.)
2. Looks for a `commands/` directory in your project root
3. Scans for `.ts` files and registers them as commands
4. The filename becomes the command name: `commands/seed.ts` -> `luca seed`

## Command File Structure

| Export | Required | Description |
|--------|----------|-------------|
| `handler` | Yes | Async function that runs the command |
| `argsSchema` | No | Zod schema defining accepted arguments |
| `description` | No | Help text for the command |

## Arguments and the Schema

The `argsSchema` uses Zod to define what flags your command accepts. These are parsed from the command line automatically:

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

## Using the Container in Commands

Commands receive a context with the full container:

```typescript
export async function handler(options: any, context: ContainerContext) {
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

## Examples

### Database Migration Command

```typescript
// commands/migrate.ts
import { z } from 'zod'
import type { ContainerContext } from '@soederpop/luca'

export const description = 'Run database migrations'

export const argsSchema = z.object({
  direction: z.enum(['up', 'down']).default('up').describe('Migration direction'),
  steps: z.number().default(1).describe('Number of migrations to run'),
})

export async function handler(options: z.infer<typeof argsSchema>, context: ContainerContext) {
  const { container } = context
  const { files } = container.fs.walk('./migrations', { include: ['*.sql'] })

  console.log(`Running ${options.steps} migration(s) ${options.direction}...`)

  for (const file of files.slice(0, options.steps)) {
    console.log(`  Applying: ${file}`)
    const sql = container.fs.readFile(file)
    // ... execute sql
  }

  console.log('Migrations complete.')
}
```

### Deploy Command

```typescript
// commands/deploy.ts
import { z } from 'zod'
import type { ContainerContext } from '@soederpop/luca'

export const description = 'Deploy the application'

export const argsSchema = z.object({
  env: z.enum(['staging', 'production']).describe('Target environment'),
  dryRun: z.boolean().default(false).describe('Preview without deploying'),
})

export async function handler(options: z.infer<typeof argsSchema>, context: ContainerContext) {
  const { container } = context

  if (options.dryRun) {
    console.log(`[DRY RUN] Would deploy to ${options.env}`)
    return
  }

  const sha = container.git.sha
  console.log(`Deploying ${sha} to ${options.env}...`)

  container.proc.exec('bun run build')
  // ... deployment logic

  console.log('Deployed successfully.')
}
```
