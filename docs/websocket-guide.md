# WebSocket Protocol Guide

This is the raw WebSocket protocol reference for the luca-poker game server. Use this if you're building a client from scratch in any language. If you're using TypeScript and the luca framework, see [Writing a Bot](./writing-a-bot.md) instead.

## Registration

POST to the server's HTTP endpoint to get credentials:

```bash
curl -X POST http://SERVER_HOST:3000/api/v1/bots/register \
  -H "Content-Type: application/json" \
  -d '{"name": "my-bot", "agentVersion": "1.0"}'
```

Response:

```json
{
  "botId": "bot_abc123",
  "token": "tok_...",
  "refreshToken": "rtok_...",
  "wsUrl": "ws://SERVER_HOST:3001",
  "serverId": "poker-...",
  "initialBalance": 100000
}
```

Save the `token` — you'll need it to authenticate the WebSocket connection.

## Authentication

Open a WebSocket to the `wsUrl` from registration. All messages are JSON, one per frame.

```json
// You send:
{"type": "auth", "payload": {"token": "tok_..."}}

// Server responds:
{"type": "auth_ok", "payload": {"botId": "bot_abc123", "playerId": "player_xyz", "serverId": "poker-..."}}
```

## Table Management

```json
// List available tables
{"type": "list_tables", "payload": {}}

// Join any open table (or specify a tableId)
{"type": "join_table", "payload": {}}
{"type": "join_table", "payload": {"tableId": "table_abc"}}

// Server responds:
{"type": "table_joined", "payload": {"tableId": "table_abc", "seat": 3, "players": [...]}}
```

## Game Loop

Once seated, the server drives the game:

```
Server → deal           (your hole cards, position)
Server → state          (board, pot, stacks — sent on each street)
Server → action_on_you  (your turn — respond with an action)
You    → action         (fold, check, call, bet, raise, or all-in)
Server → action_taken   (broadcasts each player's action)
Server → hand_result    (who won, final board, showdown info)
```

## Actions

| Action | When | Amount |
|--------|------|--------|
| `fold` | Facing a bet | Not needed |
| `check` | No bet to call (`toCall` is 0) | Not needed |
| `call` | Facing a bet | Must match `toCall` |
| `bet` | First bet on a street | At least 1 big blind |
| `raise` | Facing a bet | At least 2x the current bet |
| `all-in` | Always available when in hand | Uses entire stack |

Invalid actions get auto-folded by the server.

## Card Format

Rank + suit. Ranks: `2-9`, `T`, `J`, `Q`, `K`, `A`. Suits: `h` (hearts), `d` (diamonds), `c` (clubs), `s` (spades).

Examples: `Ah` = Ace of hearts, `Td` = Ten of diamonds, `2c` = Deuce of clubs.

## Messages You Receive

| Type | Key Payload Fields |
|------|-------------------|
| `auth_ok` | `botId`, `playerId`, `serverId` |
| `table_joined` | `tableId`, `seat`, `players` |
| `deal` | `holeCards`, `position`, `handNumber`, `blinds` |
| `state` | `stage`, `board`, `pot`, `toCall`, `stack`, `availableActions`, `playersInHand` |
| `action_on_you` | `availableActions`, `toCall`, `pot`, `stack`, `stage`, `board`, `timeRemaining`, `timeBankRemaining` |
| `action_taken` | `seat`, `playerName`, `action`, `amount` |
| `hand_result` | `winners`, `pot`, `board`, `stacks`, `showdown` |
| `wallet_state` | `balance` |
| `timebank_state` | `timeBankRemaining`, `reason` |
| `error` | `message` |
| `ping` | — (respond with `pong`) |

## Messages You Send

| Type | Payload |
|------|---------|
| `auth` | `{ token }` |
| `list_tables` | `{}` |
| `join_table` | `{ tableId? }` — omit tableId for any available table |
| `action` | `{ action, amount? }` |
| `wallet` | `{}` |
| `pong` | `{}` |

## Time Management

- **30 seconds** per action
- Time bank starts at **120 seconds**, refills +5s per hand (capped at 120)
- Both timers expire → auto-fold
- `action_on_you` includes `timeRemaining` and `timeBankRemaining`
- `warning: true` when time is low, `overtime: true` when burning time bank

## Opponents

The server runs house bots with distinct play styles:

| Bot | Style |
|-----|-------|
| TAG | Tight-aggressive. Selective hands, aggressive betting. |
| Calling Station | Calls most bets, rarely raises or folds. |
| Nit | Ultra-tight. Only plays premium hands. |
| LAG | Loose-aggressive. Wide ranges, frequent pressure. |
| Maniac | Hyper-aggressive. Raises and bets constantly. |

Understanding their tendencies is key to exploiting them.

## Tips

1. **Respond to pings.** The server sends `ping` messages for keep-alive. Reply with `pong` or you'll get disconnected.
2. **Always check `availableActions`.** Don't send an action that isn't in the list — invalid actions get auto-folded.
3. **Track opponent actions.** Log every `action_taken` and `hand_result` with `showdown` data. This is how you profile opponents and find exploits.
4. **Position matters.** Play tighter from early position (UTG, MP), wider from late position (CO, BTN).
5. **Manage your time.** You have 30 seconds per action plus a refilling time bank.
6. **Start simple.** A bot that folds junk, calls with decent hands, and raises with strong ones will beat the Calling Station and hold its own against the others.
