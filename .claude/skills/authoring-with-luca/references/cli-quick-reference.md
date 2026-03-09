# luca CLI Quick Reference

## Running things

| Command | What it does |
|---------|-------------|
| `luca serve` | Start API server, auto-discover endpoints/ and public/ |
| `luca serve --port 4000` | Custom port |
| `luca serve --setup setup.ts` | Custom Express configuration |
| `luca serve --force` | Kill existing process on the port |
| `luca serve --any-port` | Find an available port |
| `luca run script.ts` | Run a TypeScript/JavaScript file |
| `luca run notebook.md` | Execute markdown code blocks sequentially |
| `luca run notebook.md --safe` | Require approval before each block |
| `luca run notebook.md --console` | Start REPL after execution |
| `luca eval "<code>"` | Evaluate code with container in scope |
| `luca eval "expr" --json` | Output as JSON |
| `luca console` | Interactive REPL with all features as top-level vars |

## Inspecting things

| Command | What it does |
|---------|-------------|
| `luca describe container` | Full container introspection |
| `luca describe features` | List all registered features |
| `luca describe clients` | List all registered clients |
| `luca describe servers` | List all registered servers |
| `luca describe commands` | List all registered commands |
| `luca describe fs` | Full docs for the fs feature |
| `luca describe features.vm` | Qualified name lookup |
| `luca describe fs --methods` | Show only methods section |
| `luca describe fs --pretty` | Render with terminal styling |
| `luca describe fs --json` | Output as structured JSON |
| `luca describe rest websocket` | Describe multiple helpers at once |

Section filters: `--description`, `--usage`, `--methods`, `--getters`, `--events`, `--state`, `--options`, `--env-vars`, `--examples`. Combine as needed.

## AI and assistants

| Command | What it does |
|---------|-------------|
| `luca chat` | Interactive chat (picks from assistants/) |
| `luca chat name` | Chat with a specific assistant |
| `luca chat name --model gpt-4o` | Override the model |
| `luca prompt claude prompt.md` | Send prompt to Claude Code |
| `luca prompt codex prompt.md` | Send prompt to OpenAI Codex |
| `luca prompt name prompt.md` | Send prompt to a local assistant |

## MCP servers

| Command | What it does |
|---------|-------------|
| `luca mcp` | Start MCP server (stdio transport) |
| `luca mcp --transport http --port 3001` | HTTP transport |
| `luca sandbox-mcp` | Start sandbox MCP for AI agents |

## Project commands

Any `.ts` file in `commands/` becomes a command: `commands/deploy.ts` -> `luca deploy`.

Global commands in `~/.luca/commands/` are available in every project.

## Tips

- `luca <file>` is shorthand for `luca run <file>`
- File resolution tries: path as-is, then `.ts`, `.js`, `.md`
- `luca.console.ts` exports are merged into `luca console` scope
