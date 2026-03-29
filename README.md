# Pokurr

Pokurr is a local-first poker toolkit with three product pillars:

1. offline poker analysis
2. a local bot arena
3. a self-improving bot research loop

It is built on:
- TypeScript for the CLI, runtime, and bot authoring surface
- Rust + WASM for fast hand evaluation and equity work
- Luca for source-mode command execution and packaging

If you only remember one thing: this repo should be useful before you ever touch the research roadmap.

## Choose your command mode

There are two supported ways to use the project:

### Source mode
Use this while developing inside the repo:

```bash
luca poker ...
```

Examples:

```bash
luca poker analyze equity AhKd QsQc
luca poker serve --port 3000 --seedLobby true
luca poker new-agent my-bot tag
```

### Compiled binary mode
Use this for the standalone CLI experience:

```bash
pokurr ...
```

Examples:

```bash
pokurr analyze equity AhKd QsQc
pokurr serve --port 3000 --seedLobby true
pokurr new-agent my-bot tag
```

The command surface is intended to be the same in both modes.

## Fastest ways to get value

### 1) Offline analysis in 30 seconds

```bash
luca poker analyze equity AhKd QsQc --iterations 20000
luca poker analyze range "ATs+,AJo+" --vs "QQ+,AKs"
luca poker analyze hand AhQh --board Kh7d2h5h --potSize 42 --toCall 14
```

What this gives you:
- hand-vs-hand equity
- range-vs-range comparison
- single-hand study in context

For a fuller study workflow, see `docs/offline-analysis.md`.

### 2) Run a local arena

```bash
luca poker serve --host 127.0.0.1 --port 3000 --seedLobby true
luca poker register http://127.0.0.1:3000 --name my-bot
luca poker join ws://127.0.0.1:3001 --token <token> --agent ./my-bot
luca poker watch ws://127.0.0.1:3002
```

What this gives you:
- a local server
- live bot play over WebSockets
- spectator and leaderboard surfaces
- a tight iteration loop for `strategy.ts`

For the canonical local walkthrough, see `DEMO.md`.

### 3) Scaffold a bot and edit one file

```bash
luca poker new-agent my-bot tag
cd my-bot
```

Edit:
- `strategy.ts`

Everything else is there to make that single file easier to reason about.

For the onboarding path, see `docs/writing-a-bot.md`.

## Project pillars

### Pillar 1: Offline poker analysis

Core commands:

```bash
luca poker analyze equity AhKd QsQc
luca poker analyze range "ATs+,AJo+" --vs "QQ+,AKs"
luca poker analyze hand AhQh --board Kh7d2h5h --potSize 42 --toCall 14
luca poker sim --situation docs/situations/turned-flush-draw.md --iterations 5000 --seed 42
```

This is for:
- reviewing a hand
- comparing ranges
- studying board texture and draw structure
- building reusable situation docs

### Pillar 2: Local bot arena

Core commands:

```bash
luca poker serve --host 127.0.0.1 --port 3000 --seedLobby true
luca poker register http://127.0.0.1:3000 --name my-bot
luca poker join ws://127.0.0.1:3001 --token <token> --agent ./my-bot
luca poker watch ws://127.0.0.1:3002
luca poker house status --server http://127.0.0.1:3000
```

This is for:
- playing against house bots
- iterating on your own bot locally
- running demo nights with spectators and leaderboards
- validating strategy changes with real runtime behavior

### Pillar 3: Self-improving bot research

This is the long-term differentiator:
- play a batch of hands
- bucket decision points
- estimate regret for legal alternatives
- write a markdown journal describing leaks
- update `strategy.ts` in readable code
- replay and compare

The research docs live here:
- `docs/regret-minimizer-plan.md`
- `docs/planning/2026-03-28-regret-minimizer-roadmap.md`

Important: this pillar should sit on top of a polished offline-analysis and local-arena product, not replace them.

## Requirements

- `bun`
- Rust toolchain (`rustup`, `cargo`)
- `wasm-pack` on your `PATH`
- `@soederpop/luca` CLI for source mode (`npm i -g @soederpop/luca`)

### Install Rust + wasm-pack

#### macOS

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

#### Linux

```bash
sudo apt-get update && sudo apt-get install -y build-essential pkg-config libssl-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

Verify:

```bash
rustc --version
wasm-pack --version
```

## Local setup

From the repo root:

```bash
bun install
bun run build:wasm
bun run test
```

## Build the standalone binary

```bash
bun run compile
./dist/pokurr analyze equity AhKd QsQc --iterations 5000
```

The compiled binary embeds the WASM path needed for standalone use.

## Canonical docs

Start here depending on your goal:
- `docs/offline-analysis.md` — study workflows and reusable situations
- `docs/writing-a-bot.md` — scaffold, edit, run, debug
- `DEMO.md` — the canonical local demo/operator flow
- `docs/hosting-a-server.md` — operator-focused persistent server notes
- `docs/strategy-globals-api.md` — exhaustive VM global reference
- `docs/planning/` — roadmap and planning materials

## Workspace layout

- `commands/poker.ts` — main CLI command surface
- `src/cli.ts` — standalone binary entrypoint
- `servers/poker-server.ts` — local server runtime
- `house/actors/` — showcase house bot profiles
- `packages/pokurr-core` — TypeScript API and range/equity boundary
- `packages/pokurr-equity` — Rust/WASM evaluator
- `docs/situations/` — reusable study spots
- `test/` — runtime and rules coverage

## Core development commands

Build WASM artifacts:

```bash
bun run build:wasm
```

Run full tests:

```bash
bun run test
```

Run the Luca markdown demo:

```bash
bun run demo:js-api
```

Compile the binary:

```bash
bun run compile
```

## Benchmarking

Single benchmark:

```bash
bun run --cwd packages/pokurr-core benchmark
```

Full performance suite:

```bash
bun run --cwd packages/pokurr-core benchmark:suite
```

The suite reports:
- average JS runtime
- average WASM runtime
- per-scenario speedup
- drift between JS and WASM outcomes
- weighted speedup summary

## Performance note

Current baseline in this workspace after the table-driven evaluator work:
- weighted suite speedup: about `217x`
- equity scenarios: about `39x` to `67x`
- range scenarios: about `1900x+`

One constrained flop-board scenario can be faster in JS because of `poker-tools` short-circuit behavior. That is expected.

## API boundary rule

Consumer code should prefer `@pokurr/core` APIs such as `equityEngine` and `Range`.
Rust internals should remain behind `@pokurr/equity`.

## Browser surfaces

When the local server is running, the main surfaces are:
- `/`
- `/leaderboard`
- `/tournaments`
- `/spectator?tableId=<tableId>`
- `/spectator-debug?tableId=<tableId>`
- `/spectator-fixtures`

## Status of the product story

Already solid:
- core game engine legality and tournament mechanics
- local server runtime
- house bot ecosystem
- performance test coverage

Actively being hardened:
- docs and first-time-user experience
- source/binary parity
- local bot authoring polish

Next capstone:
- regret-minimizer journals and strategy iteration loop
