# Endpoint Template

Copy this into `endpoints/<name>.ts`:

```ts
import { z } from 'zod'
import type { EndpointContext } from '@soederpop/luca'

export const path = '/api/<name>'
export const description = 'What this endpoint does'
export const tags = ['<group>']

// GET /api/<name>?param=value
export const getSchema = z.object({
  param: z.string().optional().describe('A query parameter'),
  limit: z.number().default(50).describe('Max results'),
})

export async function get(params: z.infer<typeof getSchema>, ctx: EndpointContext) {
  const { container } = ctx
  return { items: [], total: 0 }
}

// POST /api/<name>
export const postSchema = z.object({
  name: z.string().describe('Required field'),
  value: z.number().optional().describe('Optional field'),
})

export async function post(params: z.infer<typeof postSchema>, ctx: EndpointContext) {
  const { container } = ctx
  return { created: true, item: params }
}
```

Start server with: `luca serve`

OpenAPI spec auto-generated at `/openapi.json`.

For URL parameters, use `endpoints/items/[id].ts` with `export const path = '/api/items/:id'` and access via `ctx.params.id`.
