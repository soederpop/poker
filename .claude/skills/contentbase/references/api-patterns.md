# API Patterns

Common patterns for working with the contentbase TypeScript API.

---

## Collection Setup

### Minimal (auto-discovery from models.ts)

```ts
import { Collection } from "contentbase";

const collection = new Collection({ rootPath: "./docs" });
await collection.load(); // auto-imports models.ts if found
```

### Explicit registration

```ts
import { Collection } from "contentbase";
import { Epic, Story, Task } from "./models";

const collection = new Collection({ rootPath: "./docs" });
collection.register(Epic);
collection.register(Story);
collection.register(Task);
await collection.load();
```

### With actions

```ts
const collection = new Collection({ rootPath: "./docs" });
collection.register(Task);

collection.action("mark-done", async (coll, instance) => {
  Object.assign(instance.document.meta, {
    status: "done",
    completedAt: new Date().toISOString(),
  });
  await instance.document.save();
});

await collection.load();
```

---

## Query Patterns

### Filter and sort

```ts
const active = await collection
  .query(Task)
  .where("meta.status", "active")
  .sort("meta.priority", "desc")
  .sort("title", "asc")
  .fetchAll();
```

### Pagination

```ts
const page2 = await collection
  .query(Task)
  .sort("createdAt", "desc")
  .limit(10)
  .offset(10)
  .fetchAll();
```

### Complex filters

```ts
const results = await collection
  .query(Task)
  .whereIn("meta.status", ["active", "pending"])
  .whereExists("meta.assignee")
  .whereGte("meta.priority", 3)
  .fetchAll();
```

### Named scopes

Define reusable query filters in the model:

```ts
const Task = defineModel("Task", {
  meta: z.object({
    status: z.enum(["pending", "active", "done"]).default("pending"),
  }),
  scopes: {
    active: (q) => q.where("meta.status", "active"),
    incomplete: (q) => q.where("meta.status", "neq", "done"),
  },
});

// Use scopes
const active = await collection.query(Task).scope("active").fetchAll();
const incomplete = await collection.query(Task).scope("incomplete").fetchAll();
```

### Count and existence

```ts
const total = await collection.query(Task).count();
const first = await collection.query(Task).first();
const last = await collection.query(Task).last();
```

---

## Document Manipulation

### Read a document

```ts
const doc = collection.document("epics/authentication");
doc.title;       // "Authentication"
doc.meta;        // frontmatter object
doc.content;     // markdown body without frontmatter
doc.rawContent;  // full file with frontmatter
```

### Update frontmatter

```ts
const doc = collection.document("tasks/fix-bug");
Object.assign(doc.meta, { status: "done" });
await doc.save();
```

### Section operations

```ts
const doc = collection.document("epics/auth");

// All immutable (return new Document)
const appended = doc.appendToSection("Stories", "### New Story\nContent");
const replaced = doc.replaceSectionContent("Notes", "Updated notes");
const removed = doc.removeSection("Deprecated");

// Save the result
await appended.save();

// Or mutate in place
doc.appendToSection("Stories", "### Another Story", { mutate: true });
await doc.save();
```

### AST querying

```ts
const doc = collection.document("epics/auth");

// Find specific nodes
const headings = doc.astQuery.selectAll("heading");
const links = doc.nodes.links;
const tables = doc.nodes.tablesAsData;
const codeBlocks = doc.nodes.codeBlocks;

// Query within a section
const criteriaQuery = doc.querySection("Acceptance Criteria");
const items = criteriaQuery.selectAll("listItem");

// Find headings by text
const storiesH = doc.astQuery.findHeadingByText("Stories");

// Extract section content
const storyNodes = doc.extractSection("Stories");
```

### Node shortcuts

```ts
doc.nodes.headings;              // all headings
doc.nodes.headingsByDepth;       // Record<depth, Heading[]>
doc.nodes.firstHeading;          // the H1
doc.nodes.links;                 // all links
doc.nodes.images;                // all images
doc.nodes.tables;                // all table AST nodes
doc.nodes.tablesAsData;          // tables as { headers, rows }[]
doc.nodes.codeBlocks;            // all code blocks
doc.nodes.paragraphs;            // all paragraphs
doc.nodes.lists;                 // all lists
doc.nodes.leadingElementsAfterTitle;  // content between H1 and first H2
```

---

## Relationship Access

### hasMany

```ts
const epic = collection.getModel("epics/auth", Epic);
const stories = epic.relationships.stories.fetchAll();  // StoryInstance[]
const first = epic.relationships.stories.first();       // StoryInstance | undefined
```

### belongsTo

```ts
const story = collection.getModel("stories/auth/login", Story);
const epic = story.relationships.epic.fetch();  // EpicInstance (throws if not found)
```

---

## Validation

### Single instance

```ts
const instance = collection.getModel("epics/auth", Epic);
const result = await instance.validate();

if (!result.valid) {
  for (const error of result.errors) {
    console.log(`${error.path.join(".")}: ${error.message}`);
  }
}
```

### Batch validation

```ts
const all = await collection.query(Story).fetchAll();
for (const story of all) {
  const result = await story.validate();
  if (!result.valid) {
    console.log(`${story.id}: ${result.errors.length} errors`);
  }
}
```

---

## Serialization

### Single instance

```ts
const json = instance.toJSON();
// { id, title, meta }

const full = instance.toJSON({
  sections: ["acceptanceCriteria"],
  computed: ["isComplete"],
  related: ["stories"],
});
```

### Full collection export

```ts
const data = await collection.export();
// Array of all document data as JSON
```

---

## Standalone Parsing

Parse any markdown without a Collection:

```ts
import { parse } from "contentbase";

// From file
const doc = await parse("./README.md");

// From string
const doc = await parse("# Hello\n\n## Section\n\n- item 1\n- item 2");

doc.title;
doc.meta;
doc.astQuery.selectAll("listItem");
doc.querySection("Section").selectAll("listItem");
doc.extractSection("Section");
```

---

## Cross-Document Section Extraction

```ts
import { extractSections } from "contentbase";

const docs = await collection.query(Epic).fetchAll();

const combined = extractSections(
  docs.map(d => ({
    source: d.document,
    sections: ["Overview", "Stories"],
  })),
  {
    title: "All Epics",
    mode: "grouped",   // each epic gets its own heading
    onMissing: "skip",
  }
);

// combined is a ParsedDocument — fully queryable
combined.astQuery.selectAll("heading");
```
