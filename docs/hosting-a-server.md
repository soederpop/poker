# Hosting a Persistent Poker Server

Run a competitive poker server with real leaderboards, no house bots — just real players and their bots.

## Quick Start

```bash
pokurr serve --port 4269 --seedLobby false --defaultTable false
```

This starts a clean server on `localhost:4269` with:
- HTTP API on port `4269`
- WebSocket (game) on port `4270`
- Spectator WebSocket on port `4271`

No house bots, no pre-seeded tables. You control everything.

## Creating Tournament Tables

Use the CLI to create tables after the server starts:

```bash
pokurr admin create-table "SNG 100" 1/2
pokurr admin create-table "SNG 250" 2/5
pokurr admin create-table "SNG 500" 5/10
```

Or target a specific server:

```bash
pokurr admin create-table "SNG 100" 1/2 --server http://localhost:4269
```

List existing tables:

```bash
pokurr admin tables --server http://localhost:4269
```

The server recognizes tables named `SNG <number>` as sit-and-go tournaments. The number is the buy-in.

### Suggested Tournament Lineup

| Table Name | Blinds | Stack | Max Players | Notes |
|---|---|---|---|---|
| `SNG 100` | 1/2 | 100 | 6 | Quick turbos, 50bb deep |
| `SNG 250` | 2/5 | 250 | 6 | Standard depth |
| `SNG 500` | 5/10 | 500 | 9 | Deep stack, full ring |
| `SNG 1000` | 5/10 | 1000 | 6 | Deep stack 6-max |

### Player Count

`maxPlayers` accepts 2-9. Choose based on format:

- **2** — Heads-up duels
- **6** — Standard 6-max (most common online format)
- **9** — Full ring (more positional play)

### Auto-Start Behavior

SNG tables start automatically when enough players are seated. The server checks `startHandIfReady()` after each join — once 2+ eligible players (with stack > 0) are seated, the first hand deals.

For a true "wait for full table" tournament feel, set `maxPlayers` to your desired count. Players register and sit, and the game begins once the minimum threshold is met.

## Server Configuration Reference

```bash
pokurr serve \
  --port 4269 \
  --seedLobby false \
  --defaultTable false \
  --actionTimeout 30 \
  --timeBankStartSeconds 120 \
  --timeBankCapSeconds 120 \
  --timeBankAccrualSeconds 5 \
  --reconnectGraceMs 45000
```

| Flag | Default | Description |
|---|---|---|
| `--port` | 3000 | HTTP port. WS = port+1, spectator = port+2 |
| `--anyPort` | false | Auto-find open ports starting at `--port` |
| `--seedLobby` | true | **Set false** for competitive — disables house bots |
| `--defaultTable` | true | **Set false** to skip auto-created cash tables |
| `--actionTimeout` | 30 | Seconds per action before auto-fold |
| `--timeBankStartSeconds` | 120 | Time bank each player starts with |
| `--timeBankCapSeconds` | 120 | Maximum accumulated time bank |
| `--timeBankAccrualSeconds` | 5 | Time bank earned per completed hand |
| `--reconnectGraceMs` | 45000 | How long a disconnected player keeps their seat |

## Bot Registration

Bots register via HTTP before connecting:

```bash
curl -X POST http://localhost:4269/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -d '{"name": "my-bot"}'
```

Response:
```json
{
  "botId": "bot_a1b2c3d4e5f6",
  "token": "tok_...",
  "refreshToken": "rtok_...",
  "wsUrl": "ws://localhost:4270",
  "initialBalance": 100000
}
```

Or via the CLI:
```bash
pokurr register http://localhost:4269 --name my-bot
```

The token is saved locally. Bots authenticate on the WebSocket with this token.

## Monitoring

### Spectator Mode

Connect a spectator client to `ws://localhost:4271` to watch games live:

```bash
pokurr watch ws://localhost:4271
```

### Leaderboards

The server tracks wallet balances and hand histories. Query the HTTP API:

```bash
# List registered bots and balances
curl http://localhost:4269/api/v1/bots
```

### Tournament Status

SNG status is derived from table state:
- **Registration** — fewer than 2 players seated
- **Starting** — 2+ players, hand not yet dealt
- **Running** — hand in progress

## Example: Run a 6-Table Tournament Night

```bash
# Start clean server
pokurr serve --port 4269 --seedLobby false --defaultTable false --actionTimeout 20

# In another terminal, create tables
pokurr admin create-table "SNG 100" 1/2
pokurr admin create-table "SNG 250" 2/5
pokurr admin create-table "SNG 500" 5/10
pokurr admin create-table "SNG 1000" 5/10

# Players register and join tables — games auto-start when ready
```

## Tips

- **Action timeout**: 20-30s is good for bots. Use 60s+ if humans are playing.
- **Time bank**: Give generous time banks (120s+) for complex bot computations like Monte Carlo equity.
- **Reconnect grace**: 45s default handles brief network blips. Increase for flaky connections.
- **Port conflicts**: Use `--anyPort` to auto-find open ports, or `--force` to kill existing processes on the target ports.
