# Contentbase Integration

How to use contentbase collections inside luca projects. Contentbase is a first-class luca feature — you access it through the container like everything else.

---

## The `contentDb` Feature

Contentbase collections are available via the `contentDb` feature. In projects using the AGI container, `container.docs` is a pre-configured instance pointing at `./docs`.

### Using the shortcut (AGI projects)

```ts
// container.docs is already wired up to ./docs
await container.docs.load()

// Access models discovered from docs/models.ts
const Task = container.docs.models.Task
const Epic = container.docs.models.Epic

// Query
const active = await container.docs
  .query(Task)
  .where('meta.status', 'active')
  .fetchAll()
```

### Creating your own instance

```ts
// Point at any folder with markdown + models.ts
const content = container.feature('contentDb', {
  rootPath: './my-content'
})
await content.load()

// Same API
const posts = await content.query(content.models.Post).fetchAll()
```

### Multiple collections in one project

```ts
const docs = container.feature('contentDb', { rootPath: './docs' })
const blog = container.feature('contentDb', { rootPath: './blog' })

await docs.load()
await blog.load()

const tasks = await docs.query(docs.models.Task).fetchAll()
const posts = await blog.query(blog.models.Post).fetchAll()
```

---

## Key API

### Reading documents

```ts
await container.docs.load()

// Read a document as formatted markdown
const text = await container.docs.read('epics/authentication')

// Read with section filtering
const overview = await container.docs.read('epics/authentication', {
  include: ['Overview', 'Stories']
})

// Exclude sections
const trimmed = await container.docs.read('epics/authentication', {
  exclude: ['Changelog'],
  meta: true  // include frontmatter
})

// Read multiple documents concatenated
const all = await container.docs.readMultiple([
  'epics/authentication',
  'epics/payments'
], { include: ['Overview'] })
```

### Querying

```ts
await container.docs.load()

// Explicit model reference
const Task = container.docs.models.Task
const urgent = await container.docs
  .query(Task)
  .where('meta.priority', 'high')
  .where('meta.status', 'neq', 'done')
  .fetchAll()

// Shorthand queries (auto-generated for each model, singular and plural)
const allTasks = await container.docs.queries.tasks.fetchAll()
const firstEpic = await container.docs.queries.epic.first()
```

### Model and collection info

```ts
container.docs.modelNames       // ['Task', 'Epic', 'Story', ...]
container.docs.models           // { Task: ModelDefinition, Epic: ... }
container.docs.isLoaded         // boolean
container.docs.collection       // the raw Collection instance
container.docs.collectionPath   // absolute path to the docs folder
```

### Parsing standalone files

```ts
// Parse any markdown file without loading the full collection
const doc = container.docs.parseMarkdownAtPath('./README.md')
doc.frontmatter  // YAML frontmatter object
doc.content      // markdown body
```

---

## The `docs/` Convention

In luca projects, the `docs/` folder at the project root is the standard location for a contentbase collection. This convention means:

```
my-project/
├── docs/
│   ├── models.ts          # Model definitions (Zod schemas)
│   ├── index.ts           # Optional: Collection with registrations
│   ├── templates/         # Optional: document scaffolds
│   ├── MODELS.md          # Generated: model documentation
│   ├── TABLE-OF-CONTENTS.md
│   ├── epics/
│   ├── tasks/
│   └── plans/
├── commands/              # Luca commands that query docs/
├── endpoints/             # API routes that serve docs/
└── package.json
```

The AGI container auto-wires `container.docs` to `./docs`. The `cnotes` CLI defaults to `./docs` as its content folder. Everything agrees on the convention.

To use a different folder, set it in `package.json`:

```json
{
  "contentbase": {
    "contentFolder": "content"
  }
}
```

---

## Common Patterns

### Command that queries content

A luca command that uses the docs collection to drive behavior:

```ts
// commands/report.ts
import { z } from 'zod'

export const description = 'Generate a status report from tasks'

export const argsSchema = z.object({
  status: z.enum(['active', 'done', 'all']).default('all'),
})

export async function handler(options, { container }) {
  await container.docs.load()
  const Task = container.docs.models.Task

  let query = container.docs.query(Task)
  if (options.status !== 'all') {
    query = query.where('meta.status', options.status)
  }

  const tasks = await query.sort('meta.priority', 'desc').fetchAll()

  for (const task of tasks) {
    console.log(`[${task.meta.status}] ${task.title} (${task.meta.priority || 'none'})`)
  }
}
```

Run with: `luca report --status active`

### Endpoint that serves content

An API endpoint backed by the docs collection:

```ts
// endpoints/tasks.ts
import { z } from 'zod'

export const path = '/api/tasks'
export const tags = ['tasks']

export const getSchema = z.object({
  status: z.string().optional(),
  limit: z.number().default(50),
})

export async function get(params, ctx) {
  const { container } = ctx
  await container.docs.load()
  const Task = container.docs.models.Task

  let query = container.docs.query(Task)
  if (params.status) {
    query = query.where('meta.status', params.status)
  }

  const tasks = await query.limit(params.limit).fetchAll()
  return tasks.map(t => t.toJSON())
}
```

### Script that batch-updates documents

```ts
import container from '@soederpop/luca/node'

await container.docs.load()
const Task = container.docs.models.Task

const stale = await container.docs
  .query(Task)
  .where('meta.status', 'active')
  .whereLt('meta.updatedAt', '2025-01-01')
  .fetchAll()

for (const task of stale) {
  Object.assign(task.document.meta, { status: 'stale' })
  await task.document.save()
}

console.log(`Marked ${stale.length} tasks as stale`)
```

### Assistant / AI agent that reads docs

```ts
// In an assistant's tool implementation
async function readProjectDocs({ query }) {
  await container.docs.load()

  // Use readMultiple to get formatted content for the LLM
  const docs = await container.docs.readMultiple(
    container.docs.collection.available.slice(0, 10),
    { include: ['Overview'], meta: true }
  )

  return docs
}
```

### Startup hook that loads context

```ts
// luca.cli.ts — runs before commands
export async function main(container) {
  await container.docs.load()

  // Make query results available to all commands
  const Domain = container.docs.models.Domain
  const liveDomains = await container.docs
    .query(Domain)
    .where('meta.status', 'live')
    .fetchAll()

  container.addContext('liveDomains', liveDomains)
}
```

---

## Bootstrapping a New Project with Both

Starting from scratch with luca + contentbase:

```bash
# 1. Create the project
mkdir my-project && cd my-project
bun init

# 2. Add dependencies
bun add @soederpop/luca contentbase

# 3. Scaffold the content folder
cnotes init docs

# 4. Edit docs/models.ts to define your domain schemas

# 5. Create some documents
cnotes create Task --title "Set up CI" --meta.status active
cnotes create Epic --title "MVP Launch" --contentFolder docs

# 6. Add a command that uses the docs
mkdir commands
# write commands/status.ts (see pattern above)

# 7. Validate everything
cnotes validate

# 8. Start building
luca status
```

---

## CLI Interplay

Both CLIs work together. The `cnotes` CLI manages the content layer. The `luca` CLI runs your application code that uses the content.

| Task | Use |
|------|-----|
| Create/validate/inspect documents | `cnotes create`, `cnotes validate`, `cnotes inspect` |
| Run commands that query docs | `luca report`, `luca status` |
| Serve docs as a REST API | `cnotes serve` (standalone) or `luca serve` (with your endpoints) |
| Expose docs to AI agents | `cnotes mcp` (standalone) or configure as luca MCP |
| Generate documentation | `cnotes summary`, `cnotes teach` |
| Interactive exploration | `cnotes console` or `luca console` (both have collection in scope) |
| Search content | `cnotes text-search "pattern"` |
