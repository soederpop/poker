# luca-poker

`luca-poker` is the modern port of the legacy `pokurr` engine into:

- TypeScript for public API + range tooling
- Rust + WASM for high-performance evaluation/equity
- Luca runnable markdown demos for interactive verification

The goal is one shared poker core that supports:

- local analysis
- local simulation
- future server/tournament modes

## Workspace Layout

- `packages/pokurr-core`: TS API (cards, ranges, equity engine boundary)
- `packages/pokurr-equity`: Rust/WASM evaluator + equity engine
- `demos/js-api.md`: runnable markdown demo executed in Luca VM

## Requirements

- `bun`
- Rust toolchain (`rustup`, `cargo`)
- `wasm-pack` on your `PATH` (or the scripts should point to your cargo bin location)
- Luca CLI source available in this mono-repo (`../../luca/src/cli/cli.ts`)

## Quick Start

From this directory:

```bash
cd /Users/jon/@soederpop/playground/luca-poker
bun install
bun run build:wasm
bun run test
```

## Demos

Run the runnable markdown API walkthrough:

```bash
bun run demo:js-api
```

This executes [js-api.md](/Users/jon/@soederpop/playground/luca-poker/demos/js-api.md) in Luca VM, demonstrates:

- module loading from source
- cards/deck/range APIs
- WASM equity path
- shared markdown VM context behavior

## Core Commands

Build both WASM targets (node + bundler):

```bash
bun run build:wasm
```

Run tests (includes WASM cross-check tests):

```bash
bun run test
```

## Benchmarking

### Single Scenario

Fast sanity benchmark:

```bash
bun run --cwd packages/pokurr-core benchmark
```

### Full Performance Suite

Multi-workload benchmark (equity + range scenarios, speed + drift checks):

```bash
bun run --cwd packages/pokurr-core benchmark:suite
```

What the suite reports:

- average JS runtime
- average WASM runtime
- per-scenario speedup
- drift between JS and WASM outcomes (Monte Carlo tolerance)
- weighted speedup summary

## Performance Baseline (March 2, 2026)

On this workspace after the table-driven evaluator integration:

- weighted suite speedup: ~`217x`
- equity scenarios: roughly `39x` to `67x`
- range scenarios: roughly `1900x+`

One flop-board scenario can be faster in JS due to `poker-tools` short-circuit behavior when the board state is highly constrained; this is expected.

## API Boundary Rule

Consumer/app code should use `@pokurr/core` APIs (`equityEngine`, `Range`, etc.).
Rust internals stay behind `@pokurr/equity` and should remain an implementation detail.

## Plan 2 Bootstrap Commands

From this directory:

```bash
bun run ../../luca/src/cli/cli.ts poker analyze equity AhKd QsQc --iterations 20000
bun run ../../luca/src/cli/cli.ts poker analyze range "ATs+,AJo+" --vs "QQ+,AKs"
bun run ../../luca/src/cli/cli.ts poker analyze hand AhQh --board Kh7d2h5h --potSize 42 --toCall 14
```

`luca-poker` requires WASM artifacts and will fail fast if they are missing.

Run deterministic simulation from markdown situations:

```bash
bun run ../../luca/src/cli/cli.ts poker sim \
  --situation situations/turned-flush-draw \
  --iterations 5000 \
  --strategy hero=tight-aggressive villain=loose-passive \
  --seed 42
```

`sim` results are saved to diskCache under `tmp/poker-cache` with keys prefixed by `poker:sim:`.

## Plan 3 Runtime Notes

For a full local walkthrough (server + seeding + multi-bot run + observability), see [DEMO.md](/Users/jon/@soederpop/playground/luca-poker/DEMO.md).

Start server mode with dedicated spectator websocket:

```bash
bun run ../../luca/src/cli/cli.ts poker serve \
  --port 3000 \
  --wsPort 3001 \
  --spectatorPort 3002 \
  --houseActorsPath house/actors \
  --actionTimeout 30 \
  --botThinkDelayMinMs 1200 \
  --botThinkDelayMaxMs 2600
```

Join as an agent with optional manual override:

```bash
bun run ../../luca/src/cli/cli.ts poker join ws://localhost:3001 --token <token> --manual
```

Bot credentials are persisted automatically in a managed block inside `.env` at this project root, and still cached in `tmp/poker-cache`.

Watch a table from terminal spectator mode:

```bash
bun run ../../luca/src/cli/cli.ts poker watch ws://localhost:3002 --table <tableId>
```

Inspect house runtime health/status from CLI:

```bash
bun run ../../luca/src/cli/cli.ts poker house status --server http://localhost:3000
```

House bots are disk-backed actor modules in `house/actors/` (default). Edit those files to tweak showcase bot behavior.

Scaffold a new local agent project:

```bash
bun run ../../luca/src/cli/cli.ts poker new-agent my-bot tag
```

This creates `my-bot/` with `README.md`, `container.ts`, `strategy.ts`, and `docs/situations/`.

Reset leaderboard baseline (with confirmation prompt, local server-side diskCache mutation):

```bash
bun run ../../luca/src/cli/cli.ts poker leaderboard reset --server http://localhost:3000
```

Open product surfaces in browser:

- `/` (Luca frontend home)
- `/leaderboard`
- `/tournaments`
- `/spectator?tableId=<tableId>` (graphics)
- `/spectator-debug?tableId=<tableId>` (debug)
- `/spectator-fixtures` (deterministic golden fixture replay)

Legacy `/web/*` URLs now redirect to the Luca frontend routes.

Protocol additions:

- `action_on_you` now includes `timeBankRemaining`
- `timebank_state` emits turn-start, consumption, and per-hand accrual updates
- spectators connect on `--spectatorPort` and subscribe with `{ type: "spectate", payload: { tableId } }`
- golden fixtures are available via `/api/v1/fixtures/golden` and replay payloads via `/api/v1/fixtures/golden/:fixtureId/replay`
- tournament lobby protocol supports `list_tournaments` and `register_tournament`

Spectator card policy is `reveal-on-showdown`: no live hole-card leakage; hole cards are only included in `hand_result.showdown` when showdown occurs.
