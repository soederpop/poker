# Project Conventions Reference

## Directory conventions

| Directory | What goes here | How to run | Exports |
|-----------|---------------|-----------|---------|
| `commands/` | CLI commands | `luca <name>` | `handler`, `argsSchema`, `description` |
| `endpoints/` | HTTP routes | `luca serve` | `path`, HTTP methods, schemas, `description`, `tags` |
| `features/` | Custom features | `helpers.discover('features')` | Feature class, registration, module augmentation |
| `clients/` | Custom clients | `helpers.discover('clients')` | Client class, registration, module augmentation |
| `servers/` | Custom servers | `helpers.discover('servers')` | Server class, registration, module augmentation |
| `assistants/` | AI assistants | `luca chat` | `CORE.md`, `tools.ts`, `hooks.ts` |
| `public/` | Static files | `luca serve` (auto-detected) | Any static assets (HTML, CSS, JS, images) |
| `scripts/` | Runnable scripts | `luca run scripts/x.ts` | Standard TS/JS modules |
| `~/.luca/commands/` | Global commands | `luca <name>` (from any project) | Same as commands/ |

## File conventions

| File | Purpose |
|------|---------|
| `package.json` | Must have `@soederpop/luca` in dependencies |
| `luca.console.ts` | Exports merged into `luca console` REPL scope |
| `endpoints/[param].ts` | Dynamic URL parameter (`/users/:param`) |

## Command file structure

```ts
export const description = 'What this command does'
export const argsSchema = z.object({ /* Zod schema for CLI flags */ })
export async function handler(options, context: ContainerContext) {
  const { container } = context
  // ...
}
```

## Endpoint file structure

```ts
export const path = '/api/resource'
export const description = 'What this endpoint does'
export const tags = ['groupName']
export const getSchema = z.object({ /* query params */ })
export async function get(params, ctx: EndpointContext) { /* ... */ }
export const postSchema = z.object({ /* body params */ })
export async function post(params, ctx: EndpointContext) { /* ... */ }
```

Supported methods: `get`, `post`, `put`, `patch`, `delete` (use `export { del as delete }` for delete).

## Assistant directory structure

```
assistants/my-assistant/
├── CORE.md       # System prompt / personality
├── tools.ts      # Tool definitions (Zod schemas)
├── hooks.ts      # Lifecycle hooks
└── docs/         # Reference documents for the assistant
```
