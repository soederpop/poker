---
title: "Features as Tool Providers for Assistants"
tags: [feature, tools, assistant, composition, use, setupToolsConsumer]
lastTested: null
lastTestPassed: null
---

# Features as Tool Providers for Assistants

Any feature can expose tools that assistants pick up via `assistant.use(feature)`. This is how you compose lower-level container capabilities into an assistant-ready tool surface. The built-in `fileTools` feature is the canonical example — it wraps `fs` and `grep` into a focused set of tools modeled on what coding assistants need.

## The Pattern

A feature becomes a tool provider by defining three things:

1. **`static tools`** — a record mapping tool names to Zod schemas with descriptions
2. **Matching methods** — instance methods whose names match the keys in `static tools`
3. **`setupToolsConsumer()`** (optional) — a hook that runs when an assistant calls `use()`, perfect for injecting system prompt guidance

When an assistant calls `assistant.use(feature)`, the framework:
- Reads `static tools` to register each tool with its schema
- Routes tool calls to the matching instance methods
- Calls `setupToolsConsumer()` so the feature can configure the assistant (e.g. add system prompt extensions)

## Anatomy of fileTools

Here's the structure of the built-in `fileTools` feature (simplified for clarity):

```ts
import { z } from 'zod'
import { Feature } from '@soederpop/luca/feature'

export class FileTools extends Feature {
  static { Feature.register(this, 'fileTools') }

  // ── 1. Declare tools with Zod schemas ──────────────────────────
  static tools = {
    readFile: {
      description: 'Read the contents of a file.',
      schema: z.object({
        path: z.string().describe('File path relative to the project root'),
        offset: z.number().optional().describe('Line number to start reading from'),
        limit: z.number().optional().describe('Maximum number of lines to read'),
      }),
    },
    searchFiles: {
      description: 'Search file contents for a pattern using ripgrep.',
      schema: z.object({
        pattern: z.string().describe('Search pattern (regex supported)'),
        path: z.string().optional().describe('Directory to search in'),
        include: z.string().optional().describe('Glob pattern to filter files'),
      }),
    },
    editFile: {
      description: 'Replace an exact string match in a file.',
      schema: z.object({
        path: z.string().describe('File path relative to the project root'),
        oldString: z.string().describe('The exact text to find and replace'),
        newString: z.string().describe('The replacement text'),
      }),
    },
    // ... more tools
  }

  // ── 2. Implement each tool as an instance method ───────────────
  // Method names must match the keys in static tools exactly.
  // Each receives the parsed args object and returns a string.

  async readFile(args: { path: string; offset?: number; limit?: number }) {
    const fs = this.container.feature('fs')
    const content = await fs.readFileAsync(args.path)
    // ... handle offset/limit
    return content
  }

  async searchFiles(args: { pattern: string; path?: string; include?: string }) {
    const grep = this.container.feature('grep')
    const results = await grep.search({ pattern: args.pattern, path: args.path, include: args.include })
    return JSON.stringify(results.map(r => ({ file: r.file, line: r.line, content: r.content })))
  }

  async editFile(args: { path: string; oldString: string; newString: string }) {
    const fs = this.container.feature('fs')
    const content = await fs.readFileAsync(args.path)
    const updated = content.replace(args.oldString, args.newString)
    await fs.writeFileAsync(args.path, updated)
    return `Edited ${args.path}`
  }

  // ── 3. Configure the assistant when it calls use() ─────────────
  override setupToolsConsumer(consumer) {
    // If the consumer is an assistant, inject guidance into its system prompt
    if (typeof consumer.addSystemPromptExtension === 'function') {
      consumer.addSystemPromptExtension('fileTools', [
        '## File Tools',
        '- All file paths are relative to the project root unless they start with /',
        '- Use searchFiles to understand code before modifying it',
        '- Use editFile for surgical changes — prefer it over writeFile',
      ].join('\n'))
    }
  }
}
```

## Using It

```ts
const assistant = container.feature('assistant', {
  systemPrompt: 'You are a coding assistant.',
  model: 'gpt-4.1-mini',
})

const fileTools = container.feature('fileTools')
assistant.use(fileTools)
await assistant.start()

// The assistant now has readFile, searchFiles, editFile, etc.
// and its system prompt includes the fileTools guidance.
console.log(Object.keys(assistant.tools))
```

### Selective tool registration

You can expose only a subset of tools:

```ts
assistant.use(fileTools.toTools({ only: ['readFile', 'searchFiles', 'listDirectory'] }))
```

## Why This Pattern Matters

This is how features compose for AI. Instead of the assistant importing `fs` and `grep` directly:

- The **feature** owns the tool surface — schemas, descriptions, and implementations in one place
- The **assistant** gets a curated interface, not raw container access
- **`setupToolsConsumer()`** lets the feature teach the assistant how to use the tools well
- **`toTools({ only })`** lets you scope down what the assistant can do

Any feature you build can follow this same pattern. Define `static tools`, implement matching methods, optionally override `setupToolsConsumer()`, and assistants can `use()` it.

## Summary

Features are the natural place to package tools for assistants. The `static tools` record declares the schema, instance methods implement the logic, and `setupToolsConsumer()` wires up assistant-specific configuration like system prompt extensions. This keeps tool definitions, implementations, and assistant guidance co-located in a single feature class.
