---
name: contentbase
description: >
  Work with contentbase — an ORM for structured Markdown. Use this skill when a project
  has a docs/ folder with a models.ts, when you see cnotes commands, when frontmatter-driven
  markdown collections need querying, creating, validating, or serving. Covers the CLI,
  TypeScript API, MCP server, REST API, and scripting patterns for knowledge bases.
user-invocable: false
metadata:
  author: soederpop
  version: "1.0.0"
---

# Contentbase

Contentbase treats a folder of Markdown/MDX files as a typed, queryable database. Models are defined with Zod schemas, content sections are extracted from headings, documents have relationships — and it all lives on disk as plain `.md` files. No database. No build step.

**Detection signals** — this skill applies when any of the following are true:
- A `models.ts` or `index.ts` that imports from `contentbase` exists in a docs folder
- The `cnotes` CLI is used or referenced
- `package.json` has a `contentbase` key or `contentbase` in dependencies
- A folder of markdown files with YAML frontmatter needs structured querying
- An MCP server config references `cnotes mcp`

---

## 1. Mental Model

```
Folder of .md files  ──▶  Collection  ──▶  Typed Model Instances
       │                      │                     │
  frontmatter = meta     models.ts          query, validate,
  headings = sections    (Zod schemas)      serialize, relate
  sub-headings = children
```

Everything is a file. The collection loads them, the model definitions give them types, and the query system lets you filter and traverse them. When you edit a document, you're editing a markdown file. When you save, you're writing a markdown file.

### Key concepts

| Concept | What it is | Where it lives |
|---------|-----------|----------------|
| **Collection** | The database. Loads a directory tree of .md files | `new Collection({ rootPath })` |
| **Document** | A single .md file with AST, frontmatter, sections | `collection.document(pathId)` |
| **Model** | A type definition: schema, sections, relationships | `defineModel("Name", { ... })` |
| **Model Instance** | A Document + its Model applied = typed accessors | `collection.getModel(pathId, Model)` |
| **Section** | Structured data extracted from a heading's content | `section("Heading", { extract })` |
| **Path ID** | The file path without extension, relative to root | `"epics/authentication"` |
| **Prefix** | Subfolder that determines model assignment | `prefix: "epics"` → `epics/*.md` |

### File layout

```
docs/
├── models.ts                    # Model definitions (Zod schemas)
├── index.ts                     # Optional: Collection setup with registrations
├── templates/                   # Optional: scaffolds for `cnotes create`
│   ├── Epic.md
│   └── Story.md
├── MODELS.md                    # Generated: model documentation
├── TABLE-OF-CONTENTS.md         # Generated: document listing
├── epics/
│   ├── authentication.md        # pathId: "epics/authentication"
│   └── payments.md
├── stories/
│   └── authentication/
│       ├── user-can-register.md  # pathId: "stories/authentication/user-can-register"
│       └── user-can-login.md
└── tasks/
    └── fix-login-bug.md
```

---

## 2. The CLI

The `cnotes` command is the primary interface. All commands accept `--contentFolder <path>` to target a specific content directory (defaults to `./docs`).

### Orientation commands

```bash
# See what models exist, their fields, sections, relationships, doc counts
cnotes inspect

# List all commands
cnotes help

# Get help for a specific command
cnotes help serve
```

### Content management

```bash
# Scaffold a new project
cnotes init my-docs

# Create a document from a model definition (uses templates if available)
cnotes create Epic --title "User Authentication"
cnotes create Task --title "Fix login bug" --meta.status active --meta.priority high

# Validate all documents against schemas
cnotes validate

# Validate a single document or all of one model type
cnotes validate epics/authentication
cnotes validate Story

# Fill in missing default frontmatter values
cnotes validate all --setDefaultMeta
```

### Querying and extraction

```bash
# Search file contents
cnotes text-search "TODO"
cnotes text-search "status: draft" --include "*.md" --ignoreCase --expanded

# Extract specific sections from matching documents
cnotes extract "stories/**/*" --sections "Acceptance Criteria"
cnotes extract "epics/*" -s "Overview,Stories" --title "Epic Summaries"

# Export entire collection as JSON
cnotes export
cnotes export | jq '.[] | select(.meta.status == "active")'
```

### Documentation generation

```bash
# Generate MODELS.md and TABLE-OF-CONTENTS.md in the content folder
cnotes summary

# Output combined documentation suitable for LLM context
cnotes teach
cnotes teach > CONTEXT.md
```

### Servers

```bash
# HTTP REST API server
cnotes serve
cnotes serve --port 3000 --open
cnotes serve --readOnly --port 8080

# MCP server (for Claude Desktop, Cursor, etc.)
cnotes mcp
cnotes mcp --transport http --port 3003
```

### Interactive

```bash
# REPL with collection and container features in scope
cnotes console

# Inside the console:
#   collection.available              — all document path IDs
#   collection.document('epics/auth') — load a document
#   await collection.query(Epic).fetchAll()
```

### Collection actions

```bash
# Run a named action defined in your collection setup
cnotes action generate-report
```

---

## 3. Defining Models

Models live in a `models.ts` (or are registered in an `index.ts`). Everything uses `defineModel()` from contentbase.

### Basic model

```ts
import { defineModel, z } from "contentbase";

export const Task = defineModel("Task", {
  prefix: "tasks",
  meta: z.object({
    status: z.enum(["pending", "active", "done"]).default("pending"),
    priority: z.enum(["low", "medium", "high"]).optional(),
    assignee: z.string().optional(),
  }),
  defaults: {
    status: "pending",
  },
});
```

The `prefix` determines which folder's documents match this model. Files at `tasks/*.md` become Task instances. If prefix is omitted, it's auto-pluralized from the name.

### Sections

Extract typed, structured data from heading-based sections in the document body:

```ts
import { defineModel, section, z, toString } from "contentbase";

export const Story = defineModel("Story", {
  prefix: "stories",
  meta: z.object({
    status: z.enum(["draft", "ready", "shipped"]).default("draft"),
  }),
  sections: {
    acceptanceCriteria: section("Acceptance Criteria", {
      extract: (query) =>
        query.selectAll("listItem").map((n) => toString(n)),
      schema: z.array(z.string()).min(1),
      alternatives: ["Requirements"],  // fallback heading names
    }),
    links: section("Links", {
      extract: (query) =>
        Object.fromEntries(
          query.selectAll("link").map((l) => [toString(l), l.url])
        ),
      schema: z.record(z.string(), z.string()),
    }),
  },
});
```

Sections are lazily extracted on first access and cached. The `extract` function receives an `AstQuery` scoped to the content under that heading.

### Relationships

```ts
import { defineModel, hasMany, belongsTo, z } from "contentbase";

export const Epic = defineModel("Epic", {
  prefix: "epics",
  meta: z.object({
    status: z.enum(["created", "in-progress", "complete"]).default("created"),
  }),
  relationships: {
    // Children extracted from sub-headings under "## Stories"
    stories: hasMany(() => Story, { heading: "Stories" }),
  },
});

export const Story = defineModel("Story", {
  prefix: "stories",
  meta: z.object({
    status: z.enum(["draft", "ready"]).default("draft"),
    epic: z.string().optional(),
  }),
  relationships: {
    // Parent resolved via frontmatter foreign key
    epic: belongsTo(() => Epic, {
      foreignKey: (doc) => doc.meta.epic as string,
    }),
  },
});
```

- **hasMany**: Extracts child documents from sub-headings within the parent document
- **belongsTo**: Resolves a parent document via a frontmatter field

Relationship targets use thunks (`() => Model`) to handle circular references.

### Computed properties

```ts
computed: {
  isComplete: (self) => self.meta.status === "complete",
  storyCount: (self) => self.relationships.stories.fetchAll().length,
}
```

### Path patterns

Infer frontmatter values from file paths:

```ts
const Story = defineModel("Story", {
  prefix: "stories",
  pattern: "stories/:epic/:slug",
  meta: z.object({
    epic: z.string(),
    slug: z.string(),
  }),
});
// stories/auth/user-login.md → { epic: "auth", slug: "user-login" }
```

### Model discovery

The CLI resolves models in this order:

1. **index.ts** — Imports your Collection instance with registered models (recommended)
2. **models.ts** — Auto-registers all exported model definitions
3. **Auto-discovery** — Scans subdirectories and generates basic models from folder names

---

## 4. The TypeScript API

### Loading a collection

```ts
import { Collection } from "contentbase";

const collection = new Collection({ rootPath: "./docs" });
await collection.load();
```

If `models.ts` exists in the root path and no models are registered, they're auto-discovered.

### Querying

```ts
// Fluent query builder
const results = await collection
  .query(Story)
  .where("meta.status", "ready")
  .whereExists("meta.epic")
  .sort("title", "asc")
  .limit(10)
  .fetchAll();

// Shorthand methods
const first = await collection.query(Epic).first();
const count = await collection.query(Story).count();

// Object shorthand
const drafts = await collection
  .query(Story)
  .where({ "meta.status": "draft" })
  .fetchAll();

// Comparison operators
const urgent = await collection
  .query(Story)
  .whereGt("meta.points", 5)
  .whereIn("meta.status", ["created", "in-progress"])
  .fetchAll();
```

Available operators: `eq`, `neq`, `in`, `notIn`, `gt`, `lt`, `gte`, `lte`, `contains`, `startsWith`, `endsWith`, `regex`, `exists`.

### Working with documents

```ts
const doc = collection.document("epics/authentication");

// Read
doc.title;          // "Authentication"
doc.meta;           // { priority: "high", status: "created" }
doc.content;        // markdown body (without frontmatter)
doc.rawContent;     // full file content with frontmatter

// AST querying
doc.astQuery.selectAll("heading");
doc.astQuery.findHeadingByText("Stories");
doc.nodes.links;         // all link nodes
doc.nodes.tables;        // all table nodes
doc.nodes.codeBlocks;    // all code blocks
doc.nodes.tablesAsData;  // tables as { headers, rows } objects

// Section operations (immutable by default — returns new Document)
const updated = doc.replaceSectionContent("Stories", newMarkdown);
const expanded = doc.appendToSection("Stories", "### New Story\nDetails");
const trimmed = doc.removeSection("Notes");

// Mutable when needed
doc.replaceSectionContent("Stories", newMarkdown, { mutate: true });

// Persistence
await doc.save();
await doc.reload();
```

### Working with model instances

```ts
const epic = collection.getModel("epics/authentication", Epic);

epic.id;                    // "epics/authentication"
epic.title;                 // "Authentication"
epic.meta.status;           // "created" (typed)
epic.meta.priority;         // "high" | "medium" | "low" | undefined
epic.computed.isComplete;   // false

// Relationships
const stories = epic.relationships.stories.fetchAll();
const first = epic.relationships.stories.first();

// Validation
const result = await epic.validate();
result.valid;    // boolean
result.errors;   // ZodIssue[]

// Serialization
epic.toJSON();
epic.toJSON({ sections: ["stories"], computed: ["isComplete"] });

// Update and save
Object.assign(epic.document.meta, { status: "in-progress" });
await epic.document.save();
```

### Standalone parsing

Parse any markdown file or string without a Collection:

```ts
import { parse } from "contentbase";

const doc = await parse("./path/to/file.md");
// or
const doc = await parse("# Hello\n\nWorld");

doc.title;
doc.meta;
doc.astQuery.selectAll("heading");
doc.querySection("Introduction").selectAll("paragraph");
```

### Extracting sections across documents

```ts
import { extractSections } from "contentbase";

const combined = extractSections([
  { source: doc1, sections: "Acceptance Criteria" },
  { source: doc2, sections: ["Acceptance Criteria", "Mockups"] },
], {
  title: "All Acceptance Criteria",
  mode: "grouped",    // "grouped" (default) or "flat"
  onMissing: "skip",  // "skip" (default) or "throw"
});
```

### JSON Query DSL

For querying over the wire (REST, MCP) without executing arbitrary code:

```json
{
  "model": "Story",
  "where": {
    "meta.status": "ready",
    "meta.points": { "$gte": 5 }
  },
  "sort": { "meta.priority": "desc" },
  "select": ["id", "title", "meta"],
  "limit": 10,
  "method": "fetchAll"
}
```

**Where value shortcuts:**
- Literal → implicit `$eq`: `"meta.status": "active"`
- Array → implicit `$in`: `"meta.tags": ["a", "b"]`
- Operator object → explicit: `"meta.priority": { "$gt": 5 }`

**Operators:** `$eq`, `$neq`, `$in`, `$notIn`, `$gt`, `$lt`, `$gte`, `$lte`, `$contains`, `$startsWith`, `$endsWith`, `$regex`, `$exists`

### Collection actions

```ts
collection.action("publish", async (coll, instance, opts) => {
  Object.assign(instance.document.meta, { status: "published" });
  await instance.document.save();
});

// Run from code
await instance.runAction("publish");

// Run from CLI
// cnotes action publish
```

---

## 5. The REST API

Start with `cnotes serve`. All endpoints return JSON.

### Document CRUD

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/api/documents` | | List all documents (`?model=` to filter) |
| `POST` | `/api/documents` | `{ pathId, title, meta?, model? }` | Create document |
| `GET` | `/api/documents/:pathId` | | Get full document JSON |
| `PUT` | `/api/documents/:pathId` | `{ meta?, content? }` | Replace meta/content |
| `PATCH` | `/api/documents/:pathId` | `{ heading, action, content? }` | Edit a section |
| `DELETE` | `/api/documents/:pathId` | | Delete document |

### Querying

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/query?model=&where=` | Query with URL params |
| `POST` | `/api/query` | Query with JSON DSL body |
| `GET` | `/api/search?pattern=` | Full-text regex search |
| `GET` | `/api/text-search?pattern=` | File-level search (add `&expanded=true` for line detail) |

### Other endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/inspect` | Collection overview |
| `GET` | `/api/models` | All model definitions |
| `GET` | `/api/validate?pathId=` | Validate a document |
| `GET/POST` | `/api/actions` | List or execute actions |
| `GET` | `/docs/:path.html` | Rendered HTML |
| `GET` | `/docs/:path.md` | Raw markdown |
| `GET` | `/docs/:path.json` | Document JSON |
| `GET` | `/openapi.json` | Auto-generated OpenAPI 3.1 spec |

---

## 6. The MCP Server

Start with `cnotes mcp` for AI agent integration. Exposes tools, resources, and prompts.

### Tools

| Tool | Description |
|------|-------------|
| `read_me` | Returns the collection guide |
| `inspect` | Collection overview — models, counts, actions |
| `get_model_info` | Detailed info about a single model |
| `list_documents` | List all document path IDs, optionally filtered by model |
| `query` | MongoDB-style query with where, sort, limit, select |
| `search_content` | Regex search across document body text |
| `text_search` | File-level search with ripgrep |
| `validate` | Validate a document against its model schema |
| `create_document` | Create a new document with proper scaffolding |
| `update_document` | Update frontmatter and/or replace content body |
| `update_section` | Surgically edit a specific section (replace, append, remove) |
| `delete_document` | Delete a document |
| `run_action` | Execute a registered collection action |

### Resources

| URI | Description |
|-----|-------------|
| `contentbase://schema` | Full schema information |
| `contentbase://toc` | Table of contents |
| `contentbase://models-summary` | Model documentation |
| `contentbase://primer` | API primer |
| `contentbase://documents/{pathId}` | Per-document resource |

### Prompts

| Prompt | Description |
|--------|-------------|
| `create-{model}` | Guided document creation (one per model) |
| `review-document` | Review a document for completeness |
| `teach` | Full documentation for onboarding |
| `query-guide` | Help with constructing queries |

### Configuration for Claude Desktop

```json
{
  "mcpServers": {
    "my-docs": {
      "command": "cnotes",
      "args": ["mcp", "./docs"]
    }
  }
}
```

---

## 7. Common Workflows

### Scripting with contentbase

Contentbase is ideal for scripting operations across structured markdown collections:

```ts
import { Collection } from "contentbase";

// Load the collection
const collection = new Collection({ rootPath: "./docs" });
await collection.load();

// Find all tasks that are overdue
const overdue = await collection
  .query(Task)
  .where("meta.status", "neq", "done")
  .whereLt("meta.dueDate", new Date().toISOString())
  .fetchAll();

// Batch update
for (const task of overdue) {
  Object.assign(task.document.meta, { status: "overdue" });
  await task.document.save();
}
```

### Building a knowledge base

Define models for your domain, then query and extract:

```ts
// Find all decisions tagged with "architecture"
const decisions = await collection
  .query(Decision)
  .whereContains("meta.tags", "architecture")
  .sort("updatedAt", "desc")
  .fetchAll();

// Extract summaries across all decisions into a single document
const combined = extractSections(
  decisions.map(d => ({ source: d.document, sections: "Summary" })),
  { title: "Architecture Decision Log", mode: "grouped" }
);
```

### Updating frontmatter programmatically

```ts
const doc = collection.document("tasks/fix-login-bug");
Object.assign(doc.meta, { status: "done", completedAt: new Date().toISOString() });
await doc.save();
```

**Important:** Always use the Document API for meta updates. Don't manually serialize YAML or reconstruct frontmatter strings — the Document class handles that via `rawContent`.

### Using section operations

```ts
const doc = collection.document("epics/authentication");

// Append a new story to the Stories section
const updated = doc.appendToSection("Stories", `
### Password Reset

As a user, I want to reset my password so I can regain access to my account.
`);
await updated.save();

// Replace a section entirely
const replaced = doc.replaceSectionContent("Notes", "Updated notes content here.");
await replaced.save();

// Remove a section
const trimmed = doc.removeSection("Deprecated");
await trimmed.save();
```

---

## 8. Rules and Anti-Patterns

### Do

- **Use `cnotes inspect` first** to understand any collection before making changes
- **Use `cnotes validate`** after making bulk changes to catch schema violations
- **Use the Document API** for programmatic meta updates (`Object.assign(doc.meta, ...)`)
- **Use path IDs** everywhere — they're the primary key (`"epics/authentication"`, not file paths)
- **Use sections for structured extraction** — don't regex-parse markdown body text
- **Use the query builder** for filtering — don't load all documents and filter in JS
- **Use `cnotes teach`** to generate LLM context for the collection
- **Use templates** (`templates/<Model>.md`) for consistent document scaffolding
- **Ensure every document has an H1 title** as the first line after frontmatter — derive it from the filename (kebab-case to Title Case), preserving acronyms and proper nouns (e.g., `mcp-cloudflare-tunnels.md` → `# MCP Cloudflare Tunnels`)

### Don't

- **Don't manually write YAML frontmatter** in code — use `doc.meta` + `doc.save()`
- **Don't use `fs.readFileSync` or `fs.writeFileSync`** to modify collection documents
- **Don't hardcode file extensions** — documents can be `.md` or `.mdx`
- **Don't create documents by writing files directly** — use `cnotes create` or the API so defaults and templates are applied
- **Don't parse markdown with regex** — use the AST query system (`doc.astQuery`, `doc.nodes`)
- **Don't forget `await collection.load()`** — the collection is empty until loaded
- **Don't mutate model instances directly** — mutate the underlying `document.meta` and save
- **Don't create documents without an H1 title** — every document must have `# Title` as the first content line after frontmatter
- **Don't use H1 titles that diverge from the filename words** — the title should be a natural Title Case rendering of the kebab-case filename

---

## 9. Quick Reference

### Imports

```ts
import {
  Collection,
  Document,
  defineModel,
  section,
  hasMany,
  belongsTo,
  parse,
  extractSections,
  z,
  toString,
} from "contentbase";
```

### CLI cheatsheet

```bash
cnotes inspect                          # What models and docs exist?
cnotes create Epic --title "Auth"       # Create a document
cnotes validate                         # Check everything
cnotes validate --setDefaultMeta        # Fix missing defaults
cnotes text-search "TODO" --expanded    # Find TODOs with line numbers
cnotes extract "epics/*" -s "Overview"  # Pull sections out
cnotes export | jq '.[].title'         # List all titles
cnotes summary                          # Regenerate MODELS.md + TOC
cnotes teach > context.md               # Generate LLM context
cnotes serve --port 3000                # Start REST API
cnotes mcp                              # Start MCP server
cnotes console                          # Interactive REPL
```

### Query operators

| Fluent method | JSON DSL | Description |
|---------------|----------|-------------|
| `.where(path, value)` | `"path": value` | Equality |
| `.whereIn(path, [...])` | `"path": [...]` | In array |
| `.whereGt(path, n)` | `"path": { "$gt": n }` | Greater than |
| `.whereLt(path, n)` | `"path": { "$lt": n }` | Less than |
| `.whereGte(path, n)` | `"path": { "$gte": n }` | Greater or equal |
| `.whereLte(path, n)` | `"path": { "$lte": n }` | Less or equal |
| `.whereContains(path, s)` | `"path": { "$contains": s }` | String contains |
| `.whereStartsWith(path, s)` | `"path": { "$startsWith": s }` | Starts with |
| `.whereEndsWith(path, s)` | `"path": { "$endsWith": s }` | Ends with |
| `.whereRegex(path, r)` | `"path": { "$regex": r }` | Regex match |
| `.whereExists(path)` | `"path": { "$exists": true }` | Field exists |
