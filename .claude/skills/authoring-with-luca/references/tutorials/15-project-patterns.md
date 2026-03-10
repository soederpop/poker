---
title: Project Patterns and Recipes
tags: [patterns, recipes, examples, architecture, full-stack, best-practices]
---

# Project Patterns and Recipes

Common patterns for building applications with Luca.

## Pattern: REST API with File-Based Routing

The most common Luca project -- a JSON API with automatic OpenAPI docs.

```
my-api/
├── package.json
├── endpoints/
│   ├── health.ts
│   ├── users.ts
│   └── users/[id].ts
├── commands/
│   └── seed.ts
└── public/
    └── index.html
```

```json
// package.json
{
  "name": "my-api",
  "scripts": {
    "dev": "luca serve",
    "seed": "luca seed"
  },
  "dependencies": {
    "@soederpop/luca": "latest",
    "zod": "^3.24.0"
  }
}
```

Start with `bun run dev`. OpenAPI spec auto-generated at `/openapi.json`.

## Pattern: CLI Tool

A project that's primarily a set of CLI commands.

```
my-tool/
├── package.json
├── commands/
│   ├── init.ts
│   ├── build.ts
│   ├── deploy.ts
│   └── status.ts
└── lib/
    └── helpers.ts
```

```bash
luca init --template react
luca build --minify
luca deploy --env production
luca status
```

## Pattern: AI-Powered App

An API with an AI assistant behind it.

```
ai-app/
├── package.json
├── endpoints/
│   ├── health.ts
│   ├── ask.ts           # Proxies to the assistant
│   └── conversations.ts # List/manage conversations
├── assistants/
│   └── helper/
│       ├── CORE.md
│       ├── tools.ts
│       ├── hooks.ts
│       └── docs/
│           ├── product-info.md
│           ├── faq.md
│           └── policies.md
└── public/
    └── index.html       # Chat UI
```

The endpoint creates the assistant and forwards questions:

```typescript
// endpoints/ask.ts
import { z } from 'zod'
import type { EndpointContext } from '@soederpop/luca'

export const path = '/api/ask'
export const postSchema = z.object({
  question: z.string(),
  conversationId: z.string().optional(),
})

export async function post(params: z.infer<typeof postSchema>, ctx: EndpointContext) {
  const assistant = ctx.container.feature('assistant', {
    folder: 'assistants/helper',
    model: 'gpt-4o',
  })

  const answer = await assistant.ask(params.question)
  return { answer }
}
```

## Pattern: Content-Driven Site

Using contentbase to power a documentation site or blog.

```
docs-site/
├── package.json
├── content/
│   ├── guides/
│   │   ├── getting-started.md
│   │   ├── configuration.md
│   │   └── deployment.md
│   └── reference/
│       ├── api.md
│       └── cli.md
├── endpoints/
│   ├── docs.ts          # Query and serve content
│   └── search.ts        # Full-text search over content
└── public/
    └── index.html
```

```typescript
// endpoints/docs.ts
import { z } from 'zod'
import type { EndpointContext } from '@soederpop/luca'

export const path = '/api/docs'
export const getSchema = z.object({
  section: z.string().optional(),
})

export async function get(params: z.infer<typeof getSchema>, ctx: EndpointContext) {
  const db = ctx.container.feature('contentDb', { rootPath: './content' })
  await db.load()
  // ... query and return content
}
```

## Pattern: Automation Script Suite

A collection of scripts for DevOps or data tasks.

```
automation/
├── package.json
├── scripts/
│   ├── backup-db.ts
│   ├── sync-data.ts
│   ├── generate-report.ts
│   └── cleanup-old-files.ts
└── config.json
```

```bash
luca run scripts/backup-db.ts
luca run scripts/sync-data.ts --since 2024-01-01
luca run scripts/generate-report.ts --format pdf
```

## Pattern: Feature Composition

Build complex features by composing simpler ones:

```typescript
class NotificationService extends Feature<NotifState, NotifOptions> {
  private cache: any
  private api: any

  async initialize() {
    // Compose other features
    this.cache = this.container.feature('diskCache', { path: './.notif-cache' })
    this.api = this.container.client('rest', {
      baseURL: this.options.webhookUrl,
    })
    await this.api.connect()
  }

  async send(channel: string, message: string) {
    // Check rate limiting via cache
    const key = `ratelimit:${channel}`
    if (await this.cache.has(key)) {
      this.emit('rateLimited', { channel })
      return
    }

    // Send via API client
    await this.api.post('/send', { channel, message })
    await this.cache.set(key, true, { ttl: 60 })

    this.emit('sent', { channel, message })
  }
}
```

## Best Practices

1. **Use file-based conventions** -- endpoints in `endpoints/`, commands in `commands/`, assistants in `assistants/`. This is the Luca way.

2. **Let the container own your dependencies** -- instead of importing libraries directly, use features and clients. This gives you introspection, state management, and events for free.

3. **Keep endpoints thin** -- endpoints should validate input and delegate to features. Business logic belongs in features, not route handlers.

4. **Compose features** -- build complex behavior by combining simpler features. Each feature should do one thing well.

5. **Use Zod everywhere** -- for endpoint schemas, feature options, state definitions. It gives you types, validation, and documentation in one place.

6. **Document with JSDoc** -- Luca's introspection system extracts it. Your documentation IS your code.
