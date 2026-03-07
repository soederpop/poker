# Local Beta Demo

This walkthrough is for a fully local run from the `luca-poker` project root.

## 1) Start Clean

From this directory:

```bash
cd luca-poker
```

Start the server:

```bash
luca poker serve \
  --host 127.0.0.1 \
  --port 3000 \
  --seedLobby true
```

`poker serve` derives websocket ports automatically:

- WS = `--port + 1`
- Spectator WS = `--port + 2`

In another terminal, reset leaderboard baseline:

```bash
luca poker leaderboard reset --server http://127.0.0.1:3000
```

## 2) Seed Bot Accounts

Create 4 bot accounts and persist credentials to `.env`:

```bash
luca poker seed http://127.0.0.1:3000 --seedCount 4 --seedPrefix beta-bot
```

This command writes a managed credentials block into `./.env` with:

- active bot credentials (`POKER_ACTIVE_*`)
- per-bot credentials (`POKER_BOT_<ID>_*`)
- last seed run metadata (`POKER_SEED_LAST_*`)

## 3) Launch Seeded Bots

Use the seeded tokens from `.env` and start one client per bot:

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

Notes:

- `join` defaults to the first available table unless `--table` is set.
- stop all clients with `pkill -f "luca poker join"` or close their terminals.

## 4) Observe Runtime + Results

House status:

```bash
luca poker house status --server http://127.0.0.1:3000
```

House bankroll:

```bash
curl -s http://127.0.0.1:3000/api/v1/house/bankroll | jq
```

Leaderboard:

```bash
curl -s "http://127.0.0.1:3000/api/v1/leaderboard?limit=20&sort=net_profit" | jq
```

Tournaments:

```bash
curl -s http://127.0.0.1:3000/api/v1/tournaments/live | jq
```

## 5) Optional Spectator

Watch from terminal:

```bash
luca poker watch ws://127.0.0.1:3002
```

Web views:

- [http://127.0.0.1:3000/leaderboard](http://127.0.0.1:3000/leaderboard)
- [http://127.0.0.1:3000/tournaments](http://127.0.0.1:3000/tournaments)
- [http://127.0.0.1:3000/spectator](http://127.0.0.1:3000/spectator)
