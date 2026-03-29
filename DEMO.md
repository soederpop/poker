# Local Demo Runbook

This is the canonical local demo flow for the repo.

Use it when you want to show:
- offline analysis
- a local bot arena
- the path toward the self-improving bot story

The examples below use source mode with `luca poker`. For the compiled binary, replace `luca poker` with `pokurr`.

## 0) Prerequisites

From the repo root:

```bash
bun install
bun run build:wasm
bun run test
```

Optional: build the standalone binary too.

```bash
bun run compile
```

## 1) Start with an offline analysis win

Use one or more of these in front of an audience before starting the arena.

```bash
luca poker analyze equity AhKd QsQc --iterations 20000
luca poker analyze range "ATs+,AJo+" --vs "QQ+,AKs"
luca poker analyze hand AhQh --board Kh7d2h5h --potSize 42 --toCall 14
```

Optional situation-driven sim:

```bash
luca poker sim \
  --situation docs/situations/turned-flush-draw.md \
  --iterations 5000 \
  --strategy hero=tag villain=calling-station \
  --seed 42
```

Presenter note:
- this establishes that the repo is already useful as a study tool
- do this before talking about the research roadmap

## 2) Start the local arena

Terminal 1:

```bash
luca poker serve \
  --host 127.0.0.1 \
  --port 3000 \
  --seedLobby true
```

Derived ports:
- HTTP: `3000`
- game WS: `3001`
- spectator WS: `3002`

Useful browser surfaces:
- http://127.0.0.1:3000/
- http://127.0.0.1:3000/leaderboard
- http://127.0.0.1:3000/tournaments
- http://127.0.0.1:3000/spectator
- http://127.0.0.1:3000/spectator-fixtures

## 3) Reset the leaderboard baseline

Terminal 2:

```bash
luca poker leaderboard reset --server http://127.0.0.1:3000
```

Use this before a fresh demo run so the standings tell a clean story.

## 4) Seed or register bots

### Fast path: seed demo bots

```bash
luca poker seed http://127.0.0.1:3000 --seedCount 4 --seedPrefix demo-bot
```

This writes a managed credentials block into the project `.env`.

### Custom path: register your own bot

```bash
luca poker register http://127.0.0.1:3000 --name my-bot
```

You will get a bot id, token, and ws URL.

## 5) Scaffold a bot if needed

```bash
luca poker new-agent my-bot tag
```

Only one file really matters for the demo iteration loop:
- `my-bot/strategy.ts`

## 6) Join the arena

### Join with your custom bot

Terminal 3:

```bash
luca poker join ws://127.0.0.1:3001 --token <token> --agent ./my-bot
```

### Join with manual overrides

Useful when demoing a human-assisted agent:

```bash
luca poker join ws://127.0.0.1:3001 --token <token> --agent ./my-bot --manual
```

### Launch seeded bots from `.env`

If you used `seed`, open another terminal and launch the saved bots.

```bash
set -a
source ./.env
set +a

IFS=',' read -r -a BOT_IDS <<< "$POKER_SEED_LAST_BOT_IDS"

for BOT_ID in "${BOT_IDS[@]}"; do
  SAFE_ID=$(echo "$BOT_ID" | sed 's/^bot_//I' | tr '[:lower:]-' '[:upper:]_' | sed 's/[^A-Z0-9_]/_/g')
  TOKEN_VAR="POKER_BOT_${SAFE_ID}_TOKEN"
  TOKEN="${!TOKEN_VAR}"

  luca poker join \
    ws://127.0.0.1:3001 \
    --token "$TOKEN" \
    --strategy tag &

done
```

Stop them with:

```bash
pkill -f "luca poker join"
```

## 7) Spectate and narrate

Terminal spectator:

```bash
luca poker watch ws://127.0.0.1:3002
```

House/runtime health:

```bash
luca poker house status --server http://127.0.0.1:3000
```

Leaderboard API:

```bash
curl -s "http://127.0.0.1:3000/api/v1/leaderboard?limit=20&sort=net_profit" | jq
```

Tournaments API:

```bash
curl -s http://127.0.0.1:3000/api/v1/tournaments/live | jq
```

## 8) Make one visible bot change

Edit:

```bash
my-bot/strategy.ts
```

Good demo changes:
- widen preflop continue range in position
- make value bets larger on strong made hands
- fold more aggressively on bad pot-odds spots

Then restart the bot process and compare behavior.

## 9) Talk about the research capstone

The future demo story is:
1. play a batch of hands
2. write a markdown regret journal
3. point to one or two leaks in plain English
4. make a small readable `strategy.ts` change
5. replay and compare

Relevant roadmap docs:
- `docs/regret-minimizer-plan.md`
- `docs/planning/2026-03-28-regret-minimizer-roadmap.md`

Do not lead with this unless the analysis and arena loops are already working smoothly.

## 10) If you want a persistent competitive server instead

Use:
- `docs/hosting-a-server.md`

That doc is operator-focused and assumes you want fewer demo defaults and more explicit control.

## Demo safety checklist

Before showing the project live:
- `bun run test` passed recently
- WASM artifacts are built
- local ports 3000-3002 are free
- leaderboard baseline reset
- at least one known-good bot token is ready
- one browser tab is already open to `/leaderboard` or `/spectator`
- one small `strategy.ts` tweak is pre-planned so you do not improvise under pressure
