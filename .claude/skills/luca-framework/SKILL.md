---
name: Using the luca framework
description: The @soederpop/luca framework, when you see a project with docs/ commands/ features/ luca.cli.ts endpoints/ folders, or @soederpop/luca is in the package.json, or the user is asking you to develop a new Luca feature, use this skill to learn about the APIs and how to learn the framework at runtime.  The luca cli bundles all of the documentation in a searchable, progressively learnable interface designed for students and AI assistants alike
---
# Luca: Learning the Container

The Luca framework `@soederpop/luca` ships a `luca` binary — a bun-based CLI for a dependency injection container. This project is based on it if this skill is present. The container auto-discovers modules in `commands/`, `clients/`, `servers/`, `features/`, and `endpoints/` folders.

The `luca` cli loads typescript modules in through its VM which injects a `container` global that is a singleton object from which you can learn about, and access all different kinds of utils and Helpers (features, clients, servers, commands, and compositions thereof)

There are three things to learn, in this order:

1. **Discover** what the container can do — `luca describe`
2. **Build** new helpers when your project needs them — `luca scaffold`
3. **Prototype** and debug with live code — `luca eval`
4. **Write Runnable Markdown** a great usecase is `luca run markdown.md` where the markdown codeblocks are executed inside the Luca VM.
---

## Phase 1: Discover with `luca describe`

This is your primary tool. The `luca` binary is a compiled artifact that bundles all introspection data — it is the authority on what the container provides. Run `luca describe` first — it outputs full documentation for any part of the container: methods, options, events, state, examples. Reading source can be helpful for additional context if it exists in the project, but the source for built-in helpers may not be present — the binary is always the ground truth.

### See what's available

```shell
luca describe features     # index of all available features
luca describe clients      # index of all available clients
luca describe servers      # index of all available servers
```

You can even learn about features in the browser container, or a specific platform (server, node are the same, browser,web are the same)

```shell
luca describe features --platform=web 
luca describe features --platform=server
```

### Learn about specific helpers

```shell
luca describe fs           # full docs for the fs feature
luca describe git          # full docs for git
luca describe rest         # full docs for the rest client
luca describe express      # full docs for the express server
luca describe git fs proc  # multiple helpers in one shot
```

### Drill into a specific method or getter

Use dot notation to get docs for a single method or getter on any helper:

```shell
luca describe ui.banner            # docs for the banner() method on ui
luca describe fs.readFile          # docs for readFile() on fs
luca describe ui.colors            # docs for the colors getter on ui
luca describe git.branch           # docs for the branch getter on git
```

This shows the description, parameters, return type, and examples for just that member. If the member doesn't exist, it lists all available methods and getters on the helper.

### Get targeted documentation

You can filter to only the sections you need:

```shell
luca describe fs --methods          # just the methods
luca describe git --events          # just the events it emits
luca describe express --options     # just the constructor options
luca describe fs git --examples     # just examples for both
luca describe fs --usage --methods  # combine sections
```

### Get approximate TypeScript types

Need to know the shape of a helper for type-safe code? Use `--ts`:

```shell
luca describe fs --ts              # approximate TS interface for fs
luca describe conversation --ts    # see the conversation feature's type surface
luca describe rest --ts            # client type shape
```

This outputs a ~95% accurate TypeScript representation based on runtime introspection. If a type looks wrong or a method signature seems off, verify with `luca eval` against the live instance.

### Describe the container itself

```shell
luca describe              # overview of the container
luca describe self         # same thing
```

### Get help on any command

```shell
luca                       # list all available commands
luca describe --help       # full flag reference for describe
luca help scaffold         # help for any command
```

**Use `luca describe` liberally.** It is the fastest, safest way to understand what the container provides. Every feature, client, and server is self-describing — if you know a name, describe will tell you everything about it. Use dot notation (`ui.banner`, `fs.readFile`) when you need docs on just one method or getter. Use `--ts` when you need type information for writing code.

> **NOTE:** The `luca` binary is compiled and bundles all introspection data. `luca describe` reflects what actually ships in the binary — source files for built-in helpers may not exist in your project. Reading source can add context when it's available, but `luca describe` and `luca eval` are always the authority.

---

## Phase 2: Build with `luca scaffold`

When your project needs a new helper, scaffold it. The `scaffold` command generates correct boilerplate — you fill in the logic.

### Learn how to build each type

Before creating anything, read the tutorial for that helper type:

```shell
luca scaffold feature --tutorial    # how features work, full guide
luca scaffold command --tutorial    # how commands work
luca scaffold endpoint --tutorial   # how endpoints work
luca scaffold client --tutorial     # how clients work
luca scaffold server --tutorial     # how servers work
```

These tutorials are the authoritative reference for each helper type. They cover imports, schemas, class structure, registration, conventions, and complete examples.

### Generate a helper

```shell
luca scaffold <type> <name> --description "What it does"
```

The workflow after scaffolding:

```shell
luca scaffold command sync-data --description "Pull data from staging"
# edit commands/sync-data.ts — add your logic
luca describe sync-data            # verify it shows up and reads correctly
```

Every scaffolded helper is auto-discovered by the container at runtime.

### When to use each type

| You need to...                                     | Scaffold a...  | Example                                                        |
|----------------------------------------------------|----------------|----------------------------------------------------------------|
| Add a reusable local capability (caching, crypto)  | **feature**    | `luca scaffold feature disk-cache --description "File-backed key-value cache"` |
| Add a CLI task (build, deploy, generate)           | **command**    | `luca scaffold command deploy --description "Deploy to production"` |
| Talk to an external API or service                 | **client**     | `luca scaffold client github --description "GitHub API wrapper"` |
| Accept incoming connections (HTTP, WS)             | **server**     | `luca scaffold server mqtt --description "MQTT broker"` |
| Add a REST route to `luca serve`                   | **endpoint**   | `luca scaffold endpoint users --description "User management API"` |

### Scaffold options

```shell
luca scaffold command deploy --description "..."    # writes to commands/deploy.ts
luca scaffold endpoint users --print                # print to stdout instead of writing
luca scaffold feature cache --output lib/cache.ts   # override output path
```

---

## Phase 3: Prototype with `luca eval`

Once you know what's available (describe) and how to build things (scaffold), use `luca eval` to test ideas, verify behavior, and debug.

```shell
luca eval "container.features.available"
luca eval "container.feature('proc').exec('ls')"
luca eval "container.feature('fs').readFile('package.json')"
```

The eval command boots a full container with all helpers discovered and registered. Core features are available as top-level shortcuts:

```shell
luca eval "fs.readFile('package.json')"
luca eval "git.branch"
luca eval "proc.exec('ls')"
```

**Reach for eval when you're stuck.** It gives you full control of the container at runtime — you can test method calls, inspect state, verify event behavior, and debug issues that are hard to reason about from docs alone.

**Use eval as a testing tool.** Before wiring up a full command handler or feature, test your logic in eval first. Want to verify how `fs.moveAsync` behaves, or whether a watcher event fires the way you expect? Run it in eval. This is the fastest way to validate container code without the overhead of building the full command around it.

```shell
# Test file operations before building a command around them
luca eval "await fs.moveAsync('inbox/test.json', 'inbox/valid/test.json')"

# First: luca describe fileManager --events  (to learn what events exist)
# Then test the behavior:
luca eval "const fm = container.feature('fileManager'); fm.on('file:change', (e) => console.log(e)); await fm.watch({ paths: ['inbox'] })"
```

### The REPL

For interactive exploration, `luca console` opens a persistent REPL with the container in scope. Useful when you need to try multiple things in sequence.

---

## Key Concepts

### The Container

The container is a singleton that holds everything your application needs. It organizes components into **registries**: features, clients, servers, commands, and endpoints. Use the factory functions to get instances:

```js
const fs = container.feature('fs')
const rest = container.client('rest')
const server = container.server('express')
```

### State

Every helper and the container itself have observable state:

```js
const feature = container.feature('fs')

feature.state.current              // snapshot of all state
feature.state.get('someKey')       // single value
feature.state.set('key', 'value')  // update

// Watch for changes
feature.state.observe((changeType, key, value) => {
  // changeType: 'add' | 'update' | 'delete'
})
```

The container has state too: `container.state.current`, `container.state.observe()`.

### Events

Every helper and the container are event emitters — `on`, `once`, `emit`, `waitFor` all work as expected. Use `luca describe <name> --events` to see what a helper emits.

### Utilities

The container provides common utilities at `container.utils` — no external imports needed:

- `container.utils.uuid()` — v4 UUID
- `container.utils.hashObject(obj)` — deterministic hash
- `container.utils.stringUtils` — camelCase, kebabCase, pluralize, etc.
- `container.utils.lodash` — groupBy, keyBy, pick, omit, debounce, etc.
- `container.paths.resolve()` / `container.paths.join()` — path operations

### Programmatic introspection

Everything `luca describe` outputs is also available at runtime in code:

```js
container.features.describe('fs')   // markdown docs (same as the CLI)
feature.introspect()                // structured object: { methods, events, state, options }
container.introspectAsText()           // full container overview as markdown
```

This is useful inside commands and scripts where you need introspection data programmatically.

---

## Server development troubleshooting

- You can use `container.proc.findPidsByPort(3000)` which will return an array of numbers.
- You can use `container.proc.kill(pid)` to kill that process
- You can combine these two functions in `luca eval` if a server you're developing won't start because a previous instance is running (common inside e.g. claude code sessions )
- `luca serve --force` will also replace the running process with the current one
- `luca serve --any-port` will open on any port


## Framework Index

A table of contents for the container. **Run `luca describe <name>` for full docs on any item.** Use `luca describe <name> --ts` when you need type information. Source may not exist locally for built-in helpers — the compiled binary is the authority.

### Features by Category

| Category | Features | What they do |
|----------|----------|--------------|
| **File System & Code** | `fs`, `grep`, `fileManager` | Read/write files, search code, watch for changes |
| **Process & Shell** | `proc`, `processManager`, `secureShell` | Run commands, manage long-running processes, SSH |
| **AI Assistants** | `assistant`, `assistantsManager`, `conversation`, `conversationHistory`, `fileTools` | Build AI assistants, manage conversations, tool calling. `fileTools` composes lower-level features (`fs`, `grep`) into an assistant-ready tool surface — a good example of how features can define tools for assistants (see `references/examples/feature-as-tool-provider.md`). |
| **AI Agent Wrappers** | `claudeCode`, `openaiCodex`, `lucaCoder` | Spawn and manage external AI agent CLIs as subprocesses |
| **Data & Storage** | `sqlite`, `postgres`, `diskCache`, `contentDb`, `redis` | Databases, caching, document management |
| **Networking** | `networking`, `dns` | Network utilities, DNS |
| **Google Workspace** | `googleAuth`, `googleDrive`, `googleDocs`, `googleSheets`, `googleCalendar`, `googleMail` | OAuth and Google service wrappers |
| **Dev Tools** | `git`, `docker`, `esbuild`, `vm`, `python`, `packageFinder` | Version control, containers, bundling, sandboxed execution |
| **Content & NLP** | `docsReader`, `nlp`, `semanticSearch`, `skillsLibrary`, `jsonTree`, `yamlTree` | Document Q&A, text analysis, semantic search, skills, structured file ingestion |
| **UI & Output** | `ui`, `ink`, `yaml` | Terminal UI, colors, ascii art, structured data display |
| **Media & Browser** | `browserUse`, `tts`, `downloader`, `opener`, `telegram` | Browser automation, text-to-speech, downloads, messaging |
| **System** | `os`, `vault`, `helpers`, `introspectionScanner`, `containerLink`, `repl`, `runpod` | OS info, secrets, runtime introspection, remote container linking |

### Clients

| Client | Purpose |
|--------|---------|
| `openai` | Chat completions, embeddings, image generation |
| `rest` | Generic HTTP client (GET/POST/PUT/PATCH/DELETE) |
| `websocket` | WebSocket connections |
| `elevenlabs` | Text-to-speech synthesis |
| `graph` | GraphQL queries and mutations |

### Servers

| Server | Purpose |
|--------|---------|
| `express` | HTTP server with file-based endpoint routing |
| `mcp` | Model Context Protocol server for AI tool exposure |
| `websocket` | WebSocket server with JSON framing |
| `ipcSocket` | Local IPC socket server for inter-process communication |

### Type Discovery

`luca describe <name> --ts` outputs an approximate TypeScript representation of any helper as it exists at runtime — ~95% accurate. This is your go-to for writing type-safe code against the container. The binary compiles in the introspection data, so `--ts` reflects what actually exists at runtime even when source isn't available. Reading source can provide additional context when it's there.

```shell
luca describe fs --ts              # approximate TS interface for the fs feature
luca describe conversation --ts    # conversation feature type surface
luca describe express --ts         # express server type shape
```

If a method signature or return type looks wrong, verify with `luca eval`:

```shell
luca eval "typeof container.feature('fs').readFile"
luca eval "container.feature('fs').readFile('package.json')"
```

### Bundled Examples and Tutorials

The skill directory includes reference material:

- **`references/examples/`** — short, focused example docs for individual features (e.g. `fs.md`, `git.md`, `proc.md`)
- **`references/tutorials/`** — longer-form guides covering the container, helpers, commands, endpoints, state/events, assistants, and more

These complement `luca describe` — describe gives you the API surface, examples show you patterns in action, and tutorials walk through building things end to end.

**Tip:** Runnable markdown is a great artifact to produce when building with luca. `luca run doc.md` executes code blocks inside the Luca VM — useful for both testing and documentation. When prototyping a feature or writing a how-to, consider writing it as a markdown file that can be run.

### Container Primitives

| Primitive | Access | Purpose |
|-----------|--------|---------|
| State | `container.state`, `helper.state` | Observable key-value state on every object |
| Events | `container.on()`, `helper.on()` | Event bus on every object |
| Paths | `container.paths` | `resolve()`, `join()`, `cwd` |
| Utils | `container.utils` | `uuid()`, `lodash`, `stringUtils`, `hashObject()` |
| Registries | `container.features`, `.clients`, `.servers` | Discovery and metadata for all helpers |
