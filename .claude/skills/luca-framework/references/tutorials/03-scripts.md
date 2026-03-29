---
title: Running Scripts and Markdown Notebooks
tags: [scripts, luca-run, automation, bun, standalone, markdown, codeblocks, notebook]
---

# Running Scripts and Markdown Notebooks

`luca run` executes TypeScript/JavaScript files and markdown files. This is often the fastest way to try out Luca features, automate tasks, or build runnable documentation.

## Running a TypeScript Script

```bash
luca run scripts/hello.ts
```

```typescript
// scripts/hello.ts
import container from '@soederpop/luca'

console.log('Available features:', container.features.available)
console.log('Git branch:', container.git.branch)
console.log('OS:', container.os.platform, container.os.arch)
```

The extension is optional -- `luca run scripts/hello` tries `.ts`, `.js`, and `.md` automatically.

## Running Markdown Files

This is one of Luca's most useful features. `luca run` can execute markdown files as runnable notebooks. It walks through the document, renders the prose to the terminal, and executes each `ts` or `js` fenced codeblock in sequence. All blocks share the same VM context, so variables defined in one block are available in the next.

```bash
luca run docs/tutorial.md
```

### How It Works

Given a markdown file like this:

````markdown
# Setup Tutorial

First, let's see what's available (container is provided automatically):

```ts
console.log(container.features.available)
```

Now let's use the file system feature:

```ts
const { files } = container.fs.walk('./src', { include: ['*.ts'] })
console.log(`Found ${files.length} TypeScript files`)
```

This block won't run because it's Python:

```python
print("I'm skipped -- only ts and js blocks run")
```
````

When you run `luca run docs/tutorial.md`, it:

1. Renders "# Setup Tutorial" and the prose as formatted markdown in your terminal
2. Displays the first codeblock, then executes it
3. Renders the next paragraph
4. Displays and executes the second codeblock (which can reference `container` from block 1)
5. Skips the Python block entirely (only `ts` and `js` blocks execute)

### Skipping Blocks

Add `skip` in the code fence meta to prevent a block from running:

````markdown
```ts skip
// This block is shown but NOT executed
dangerousOperation()
```
````

### Safe Mode

Use `--safe` to require manual approval before each block runs:

```bash
luca run docs/tutorial.md --safe
```

The runner will prompt "Run this block? (y/n)" before executing each codeblock. Great for walkthroughs where you want to pause and observe.

### Shared Context

All codeblocks in a markdown file share a VM context. The context includes `console` and the full container context, so you can use container features without importing:

````markdown
```ts
// Block 1: container is already available in the context
const { files } = container.fs.walk('./src')
```

```ts
// Block 2: `files` from block 1 is still in scope
console.log(`Found ${files.length} files in src/`)
```
````

### Use Cases for Markdown Scripts

- **Runnable tutorials** -- documentation that actually executes
- **Onboarding guides** -- new developers run the guide and see real output
- **Demo scripts** -- explain and execute in the same document
- **Literate DevOps** -- annotated operational runbooks

## TypeScript Script Examples

### File Processor

```typescript
// scripts/process-images.ts
import container from '@soederpop/luca'

const { fs, proc } = container

const { files: images } = fs.walk('./uploads', { include: ['*.png', '*.jpg'] })
console.log(`Processing ${images.length} images...`)

for (const image of images) {
  console.log(`  Optimizing: ${image}`)
  proc.exec(`optipng ${image}`)
}

console.log('Done.')
```

### Data Migration

```typescript
// scripts/migrate-data.ts
import container from '@soederpop/luca'

const { fs } = container

const api = container.client('rest', {
  baseURL: 'https://api.example.com',
})
await api.connect()

const oldData = fs.readJson('./data/legacy-users.json')
console.log(`Migrating ${oldData.length} users...`)

for (const user of oldData) {
  await api.post('/users', {
    name: user.full_name,
    email: user.email_address,
    role: 'user',
  })
  console.log(`  Migrated: ${user.full_name}`)
}

console.log('Migration complete.')
```

### Generate Report

```typescript
// scripts/weekly-report.ts
import container from '@soederpop/luca'

const { git, fs } = container

const branch = git.branch       // getter, not a method
const sha = git.sha             // getter, not a method
const files = await git.lsFiles()
const { files: srcFiles } = fs.walk('./src', { include: ['*.ts'] })

const report = `# Weekly Report

- Branch: ${branch}
- Commit: ${sha}
- Tracked files: ${files.length}
- Source files: ${srcFiles.length}

Generated: ${new Date().toISOString()}
`

await fs.writeFile('./reports/weekly.md', report)
console.log('Report generated: reports/weekly.md')
```

## Tips

- **Use the container** -- don't import `fs` from Node directly. `container.fs` gives you the same operations with the benefit of working within the container ecosystem.
- **Markdown scripts are great for prototyping** -- write a markdown file, mix explanation with code, run it, iterate.
- **Use `--safe` for unfamiliar scripts** -- review each block before it runs.
