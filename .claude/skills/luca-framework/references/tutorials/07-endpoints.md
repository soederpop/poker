---
title: Writing Endpoints
tags: [endpoints, routes, api, express, openapi, rest, http, server]
---

# Writing Endpoints

Endpoints are file-based HTTP routes. Each file in your `endpoints/` directory becomes an API route. Luca auto-discovers them when you run `luca serve`.

## Basic Endpoint

```typescript
// endpoints/health.ts
export const path = '/health'
export const description = 'Health check endpoint'

export async function get() {
  return { status: 'ok', uptime: process.uptime() }
}
```

That's it. `luca serve` will mount `GET /health` and include it in the auto-generated OpenAPI spec.

## Request Validation with Zod

Define schemas for your handlers. Parameters are validated automatically:

```typescript
// endpoints/users.ts
import { z } from 'zod'
import type { EndpointContext } from '@soederpop/luca'

export const path = '/api/users'
export const description = 'User management'
export const tags = ['users']

// GET /api/users?role=admin&limit=10
export const getSchema = z.object({
  role: z.string().optional().describe('Filter by role'),
  limit: z.number().default(50).describe('Max results'),
})

export async function get(params: z.infer<typeof getSchema>, ctx: EndpointContext) {
  // params.role and params.limit are validated and typed
  return { users: [], total: 0 }
}

// POST /api/users
export const postSchema = z.object({
  name: z.string().describe('Full name'),
  email: z.string().email().describe('Email address'),
  role: z.enum(['user', 'admin']).default('user').describe('User role'),
})

export async function post(params: z.infer<typeof postSchema>, ctx: EndpointContext) {
  // params are validated
  return { user: { id: '1', ...params }, message: 'User created' }
}
```

## URL Parameters

Use `:param` in the path or bracket-based file naming:

```typescript
// endpoints/users/[id].ts
import { z } from 'zod'
import type { EndpointContext } from '@soederpop/luca'

export const path = '/api/users/:id'
export const description = 'Get, update, or delete a specific user'
export const tags = ['users']

export async function get(_params: any, ctx: EndpointContext) {
  const { id } = ctx.params  // From the URL
  return { user: { id, name: 'Example' } }
}

export const putSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
})

export async function put(params: z.infer<typeof putSchema>, ctx: EndpointContext) {
  const { id } = ctx.params
  return { user: { id, ...params }, message: 'Updated' }
}

// Use `destroy` for DELETE — it's a reserved word in JS
export async function destroy(_params: any, ctx: EndpointContext) {
  const { id } = ctx.params
  return { message: `User ${id} deleted` }
}
```

## The EndpointContext

Every handler receives `(params, ctx)`. The context gives you access to:

```typescript
export async function post(params: any, ctx: EndpointContext) {
  const {
    container,   // The Luca container -- access any feature from here
    request,     // Express request object
    response,    // Express response object
    query,       // Parsed query string
    body,        // Parsed request body
    params: urlParams,  // URL parameters (:id, etc.)
  } = ctx

  // Use container features
  const data = container.fs.readJson('./data/config.json')

  return { success: true }
}
```

## Supported HTTP Methods

Export any of these handler functions:

- `get` -- GET requests
- `post` -- POST requests
- `put` -- PUT requests
- `patch` -- PATCH requests
- `destroy` -- DELETE requests (preferred — avoids the `delete` reserved word)
- `delete` -- DELETE requests (also works via `export { del as delete }`)

Each can have a corresponding schema export: `getSchema`, `postSchema`, `putSchema`, `patchSchema`, `destroySchema` / `deleteSchema`.

## What Gets Exported

| Export | Required | Description |
|--------|----------|-------------|
| `path` | Yes | The route path (e.g. `/api/users`, `/api/users/:id`) |
| `description` | No | Human-readable description (used in OpenAPI spec) |
| `tags` | No | Array of tags for OpenAPI grouping |
| `get`, `post`, `put`, `patch`, `destroy` | At least one | Handler functions (`destroy` maps to DELETE) |
| `getSchema`, `postSchema`, `destroySchema`, etc. | No | Zod schemas for request validation |

## Starting the Server

```bash
# Default: looks for endpoints/ or src/endpoints/, serves on port 3000
luca serve

# Custom port and directories
luca serve --port 4000 --endpointsDir src/routes --staticDir public
```

The server automatically:
- Discovers and mounts all endpoint files
- Generates an OpenAPI spec at `/openapi.json`
- Serves static files from `public/` if it exists
- Enables CORS by default
- Prints all mounted routes to the console

## Programmatic Server Setup

You can also set up the server in a script:

```typescript
import container from '@soederpop/luca'

const server = container.server('express', { port: 3000, cors: true })

await server.useEndpoints('./endpoints')

server.serveOpenAPISpec({
  title: 'My API',
  version: '1.0.0',
  description: 'My awesome API',
})

await server.start()
console.log('Server running on http://localhost:3000')
```

## Streaming Responses

For endpoints that need to stream (e.g. AI responses), you can write directly to the response:

```typescript
export const path = '/api/stream'

export async function post(params: any, ctx: EndpointContext) {
  const { response } = ctx

  response.setHeader('Content-Type', 'text/event-stream')
  response.setHeader('Cache-Control', 'no-cache')

  for (const chunk of data) {
    response.write(`data: ${JSON.stringify(chunk)}\n\n`)
  }

  response.end()
}
```
