# Model Definition Reference

Complete reference for `defineModel()` — the core function for declaring content types.

---

## Signature

```ts
defineModel(name: string, config: ModelConfig): ModelDefinition
```

## Config Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `prefix` | `string` | No | Folder name for matching documents. Auto-pluralized from name if omitted. |
| `description` | `string` | No | Human-readable summary. Auto-generated from schema if omitted. |
| `meta` | `z.ZodObject` | No | Zod schema for YAML frontmatter validation |
| `sections` | `Record<string, SectionDef>` | No | Named extractions from heading-based content |
| `relationships` | `Record<string, RelDef>` | No | `hasMany` and `belongsTo` links |
| `computed` | `Record<string, Function>` | No | Derived properties from instance data |
| `defaults` | `Record<string, any>` | No | Static default values for frontmatter |
| `pattern` | `string \| string[]` | No | Express-style path pattern for inferring meta |
| `match` | `(doc: Document) => boolean` | No | Custom matching function |
| `exclude` | `(string \| RegExp)[]` | No | Glob/regex patterns to exclude from queries |
| `scopes` | `Record<string, ScopeFn>` | No | Reusable query presets |

---

## Full Example

```ts
import { defineModel, section, hasMany, belongsTo, z, toString } from "contentbase";

export const Epic = defineModel("Epic", {
  // Folder matching
  prefix: "epics",

  // Human description (auto-generated if omitted)
  description: "A project epic that groups related user stories.",

  // Frontmatter schema
  meta: z.object({
    status: z.enum(["created", "in-progress", "complete"]).default("created"),
    priority: z.enum(["low", "medium", "high"]).optional(),
    owner: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),

  // Default frontmatter values (applied before Zod defaults)
  defaults: {
    status: "created",
  },

  // Section extraction
  sections: {
    overview: section("Overview", {
      extract: (q) => q.selectAll("paragraph").map((n) => toString(n)).join("\n"),
      schema: z.string(),
    }),
    acceptanceCriteria: section("Acceptance Criteria", {
      extract: (q) => q.selectAll("listItem").map((n) => toString(n)),
      schema: z.array(z.string()),
      alternatives: ["Requirements", "Criteria"],
    }),
  },

  // Relationships
  relationships: {
    stories: hasMany(() => Story, { heading: "Stories" }),
  },

  // Derived values
  computed: {
    isComplete: (self) => self.meta.status === "complete",
    storyCount: (self) => self.relationships.stories.fetchAll().length,
  },

  // Reusable query presets
  scopes: {
    active: (q) => q.where("meta.status", "in-progress"),
    highPriority: (q) => q.where("meta.priority", "high"),
  },

  // Path pattern for meta inference
  pattern: "epics/:slug",

  // Exclude patterns
  exclude: ["*.draft.md", /^_/],
});
```

---

## Section Definition

```ts
section(headingText: string, config: {
  extract: (query: AstQuery) => T,        // Required: extraction function
  schema?: z.ZodType<T>,                   // Optional: validation schema
  alternatives?: string[],                 // Optional: fallback heading names
})
```

The `extract` function receives an `AstQuery` scoped to the content underneath the heading. Common extraction patterns:

```ts
// List items → string array
extract: (q) => q.selectAll("listItem").map((n) => toString(n))

// Links → object map
extract: (q) => Object.fromEntries(
  q.selectAll("link").map((l) => [toString(l), l.url])
)

// Tables → object array
extract: (q) => q.selectAll("table").map((t) => parseTable(t))

// Paragraphs → joined text
extract: (q) => q.selectAll("paragraph").map((n) => toString(n)).join("\n")

// Code blocks → source strings
extract: (q) => q.selectAll("code").map((c) => c.value)

// Raw markdown text of the section
extract: (q) => toString(q.tree)
```

---

## Relationship Definitions

### hasMany

Extracts children from sub-headings within a section of the parent document.

```ts
hasMany(targetThunk: () => ModelDefinition, config: {
  heading: string,                          // Required: parent section heading
  meta?: (self: Instance) => object,        // Optional: inject meta into children
  id?: (slug: string) => string,            // Optional: custom child ID generation
})
```

### belongsTo

Resolves a parent document via a foreign key in frontmatter.

```ts
belongsTo(targetThunk: () => ModelDefinition, config: {
  foreignKey: (doc: Document) => string,    // Required: function returning parent slug
})
```

---

## Model Assignment Rules

Documents are assigned to models in this priority:

1. **`_model` frontmatter field** — explicit model name (highest priority)
2. **`match` function** — custom matching logic
3. **Prefix** — file path starts with the model's prefix folder
4. **Base model** — catch-all for unmatched documents

---

## Meta Merge Priority

When a model instance is created, frontmatter values come from multiple sources (last wins):

1. Pattern-inferred values (from `pattern`)
2. Model `defaults`
3. Zod schema `.default()` values
4. Actual document frontmatter (highest priority)
