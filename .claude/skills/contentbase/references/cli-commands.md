# CLI Command Reference

Detailed reference for every `cnotes` command. All commands accept `--contentFolder <path>`.

---

## cnotes init [name]

Scaffold a new contentbase project with a sample model and document.

| Argument | Description | Default |
|----------|-------------|---------|
| `name` | Directory name for the project | `my-content` |

Creates: `models.ts`, `index.ts`, `posts/hello-world.md`

```bash
cnotes init
cnotes init docs
cnotes init content/blog
```

---

## cnotes create \<model\> --title "..."

Create a new document from a model definition with proper frontmatter and section scaffolding.

| Option | Description |
|--------|-------------|
| `--title` | Required. Title for the document (H1 heading and slug) |
| `--meta.*` | Set frontmatter fields (e.g. `--meta.status active`) |

**Template lookup:** If `templates/<model>.md` exists in the content root, it's used as the scaffold.

**Meta priority (last wins):** Zod defaults → model defaults → template frontmatter → CLI `--meta.*`

```bash
cnotes create Post --title "My First Post"
cnotes create Task --title "Fix login" --meta.status active --meta.priority high
cnotes create Epic --title "Auth System" --contentFolder ./docs
```

Output file: `{prefix}/{kebab-title}.md` (e.g. `tasks/fix-login.md`)

---

## cnotes inspect

Display collection summary: models, schemas, sections, relationships, document counts.

```bash
cnotes inspect
cnotes inspect --contentFolder ./sdlc
```

---

## cnotes validate [target]

Validate documents against model Zod schemas.

| Argument | Description | Default |
|----------|-------------|---------|
| `target` | `all`, a path ID, or a model name | `all` |

| Option | Description |
|--------|-------------|
| `--setDefaultMeta` | Write missing Zod defaults to documents |

Exit code 1 if any documents are invalid.

```bash
cnotes validate
cnotes validate epics/auth-system
cnotes validate Story
cnotes validate all --setDefaultMeta
```

---

## cnotes export

Export entire collection as JSON to stdout.

```bash
cnotes export
cnotes export > backup.json
cnotes export | jq '.[] | select(.meta.status == "published")'
```

---

## cnotes extract \<target\> --sections "..."

Extract specific sections from documents matching a glob pattern.

| Argument | Description |
|----------|-------------|
| `target` | Path ID or glob pattern (e.g. `epics/*`, `tasks/auth-*`) |

| Option | Alias | Description |
|--------|-------|-------------|
| `--sections` | `-s` | Required. Comma-separated section headings |
| `--title` | `-t` | Add a top-level H1 title to the output |
| `--frontmatter` | | Include YAML frontmatter in output |
| `--noNormalizeHeadings` | | Preserve original heading depths |

```bash
cnotes extract epics/auth-system --sections "Overview"
cnotes extract "stories/**/*" -s "Acceptance Criteria"
cnotes extract "epics/*" -s "Overview,Stories" -t "Epic Summaries"
cnotes extract "epics/*" -s "Stories" --frontmatter --noNormalizeHeadings
```

---

## cnotes text-search \<pattern\>

Search file contents using ripgrep.

| Option | Default | Description |
|--------|---------|-------------|
| `--expanded` | `false` | Line-level matches instead of file paths |
| `--include` | | Glob filter (e.g. `"*.md"`) |
| `--exclude` | | Glob to exclude (e.g. `"node_modules"`) |
| `--ignoreCase` | `false` | Case-insensitive |
| `--maxResults` | | Limit results |

```bash
cnotes text-search "authentication"
cnotes text-search "TODO" --ignoreCase --expanded
cnotes text-search "status: draft" --include "*.md"
cnotes text-search "import" --maxResults 10 --expanded
```

---

## cnotes summary

Generate `MODELS.md` and `TABLE-OF-CONTENTS.md` in the content root.

```bash
cnotes summary
cnotes summary --contentFolder ./docs
```

---

## cnotes teach

Output combined documentation (MODELS.md + TOC + CLI.md + PRIMER.md) for LLM context.

```bash
cnotes teach
cnotes teach > context.md
cnotes teach | pbcopy
```

---

## cnotes action \<name\>

Run a named action registered on the collection.

```bash
cnotes action generate-report
cnotes action sync --contentFolder ./docs
```

---

## cnotes serve [contentFolder]

Start an HTTP server with REST API endpoints.

| Option | Default | Description |
|--------|---------|-------------|
| `--port` | `8000` | Port to listen on |
| `--force` | `false` | Kill existing process on the port |
| `--anyPort` | `false` | Find next available port |
| `--open` | `false` | Open browser after starting |
| `--readOnly` | `false` | Disable write endpoints |
| `--cors` | `true` | Enable CORS |
| `--staticDir` | `public/` | Static file directory |
| `--endpointsDir` | auto | User endpoint modules directory |
| `--refreshInterval` | `60` | Seconds between collection rescans |

```bash
cnotes serve
cnotes serve ./docs --port 3000 --open
cnotes serve --readOnly --port 8080
cnotes serve --anyPort --force
```

---

## cnotes mcp [contentFolder]

Start an MCP server for AI agent integration.

| Option | Default | Description |
|--------|---------|-------------|
| `--transport` | `stdio` | `stdio` or `http` |
| `--port` | `3003` | Port for HTTP transport |

```bash
cnotes mcp
cnotes mcp ./docs
cnotes mcp --transport http --port 3003
```

---

## cnotes console

Interactive REPL with collection and container features in scope.

Scope: `collection`, all luca container features (fs, git, proc, etc.), and exports from `cnotes.console.ts` if present.

```bash
cnotes console
cnotes console --contentFolder ./docs
```
