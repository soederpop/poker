# Writing a Bot

This guide covers building a poker bot using the luca framework — the same tools the poker server itself is built on. You get a WebSocket client, equity calculator, strategy engine, and game state machine out of the box.

For the raw WebSocket protocol (language-agnostic), see [WebSocket Guide](./websocket-guide.md).

## Scaffold a New Bot

```bash
luca poker new-agent my-bot
```

This creates:

```
my-bot/
├── strategy.ts      # Your decision logic — edit this first
├── container.ts     # Local container bootstrap
└── docs/situations/ # Hand review workspace
```

## Quick Start

Start a game server and join it:

```bash
# Terminal 1: start the server with house bots
luca poker serve --seedLobby true

# Terminal 2: register your bot
luca poker register http://127.0.0.1:3000 --name my-bot

# Terminal 3: join with your token
luca poker join ws://127.0.0.1:3001 --token <token> --strategy tag
```

The `--strategy` flag picks a built-in profile to start from. Available profiles: `tag`, `lag`, `nit`, `maniac`, `calling-station`, `tight-aggressive`, `loose-passive`, `random`.

## The PokerClient

`PokerClient` wraps the WebSocket connection. It handles authentication, table management, and message routing.

```ts
import container from "@soederpop/luca/agi"
import { bootPokerContainer } from "../container"

await bootPokerContainer(container)

const client = container.client("poker", {
  wsUrl: "ws://127.0.0.1:3001",
  reconnect: true,
})

await client.connect()
await client.authenticate(token)

const tables = await client.requestTables()
await client.joinTable()
```

### Handling Messages

```ts
client.onMessage((msg) => {
  switch (msg.type) {
    case "deal":
      // msg.payload.holeCards — your cards, e.g. ["Ah", "Kd"]
      // msg.payload.position — "BTN", "BB", etc.
      break

    case "action_on_you":
      // msg.payload.availableActions — ["fold", "call", "raise"]
      // msg.payload.toCall, .pot, .stack, .stage, .board
      const decision = decide(msg.payload)
      client.send("action", { action: decision.action, amount: decision.amount })
      break

    case "hand_result":
      // msg.payload.winners, .pot, .showdown
      break

    case "ping":
      client.send("pong", {})
      break
  }
})
```

### Waiting for Specific Messages

```ts
const authResponse = await client.waitFor("auth_ok")
const tableResponse = await client.waitFor("table_joined")
```

## The Strategy Engine

The `Strategy` feature provides equity calculation and pre-built decision profiles. Every profile defines position-specific opening ranges and threshold-based decision logic.

```ts
const strategy = container.feature("strategy")

// List available profiles
strategy.listProfiles()
// => ["tight-aggressive", "tag", "lag", "nit", "maniac", "calling-station", ...]

// Get opening range for a profile and position
strategy.rangeForProfile("tag", "BTN")
// => "22+,A2s+,K9s+,Q9s+,J9s+,T9s,A9o+,KTo+,QTo+,JTo"
```

### Making Decisions

The `decide` method takes a profile name and a decision context. It estimates equity via the WASM backend, then applies the profile's rules to pick an action.

```ts
const decision = await strategy.decide("tag", {
  heroCards: ["Ah", "Kd"],
  board: ["Ks", "7d", "2h"],
  street: "flop",
  position: "BTN",
  inPosition: true,
  checkedTo: false,
  potSize: 20,
  toCall: 10,
  effectiveStack: 90,
  playersInHand: 2,
  playersLeftToAct: 1,
  facingBet: true,
  facingRaise: false,
  facingThreeBet: false,
})

// decision => { action: "raise", amount: 30, source: "rules" }
```

### Equity Estimation

You can estimate equity directly for more nuanced decisions:

```ts
const equity = await strategy.estimateEquity({
  heroCards: ["Ah", "Kd"],
  board: ["Ks", "7d", "2h"],
  street: "flop",
  villainRange: "QQ+,AKs,AKo",
  // ...rest of context
})
// equity => 0.72 (72% against that range)
```

## The Actor System

`Actor` wraps a player in a running game. It gives you computed properties for position, pot odds, combo classification, and range checking — plus a simple `act()` method.

```ts
import { Actor } from "../features/actor"

const actor = new Actor({
  game: gameEngine,
  strategy,
  playerId: "hero",
})

// Computed context
actor.chips       // current stack
actor.combo       // "AKo", "QQ", "87s", etc.
actor.position    // "BTN", "BB", "UTG", etc.
actor.potOdds     // toCall / (pot + toCall)
actor.board       // community cards

// Range checks
actor.handInOpeningRange("tag")    // is hero's hand in TAG opening range for this position?
actor.handInRange("QQ+,AKs,AKo")  // arbitrary range check

// Make a decision
const decision = await actor.act({
  profileName: "tag",
  villainRange: "22+,A2s+,KTs+",
  inPosition: true,
})
// decision => { action: "raise", amount: 24 }
```

### Custom Decision Hooks

Override the strategy engine entirely by providing a `makeDecision` hook:

```ts
const actor = new Actor({
  game: gameEngine,
  strategy,
  playerId: "hero",
  hooks: {
    async makeDecision({ legalActions }, context) {
      // context has: chips, combo, position, potOdds, board, stage, actionHistory, etc.

      if (context.combo === "AA" || context.combo === "KK") {
        return { action: "raise", amount: context.toGo * 3 }
      }

      if (context.potOdds < 0.2 && legalActions.includes("call")) {
        return { action: "call" }
      }

      return { action: "fold" }
    },
  },
})
```

When `makeDecision` is provided, the Actor calls it instead of `strategy.decide`. This is where your custom logic lives.

## The GameEngine

`GameEngine` is an event-sourced state machine that tracks the full game state. You typically won't construct one yourself (the server manages it), but it's useful for local testing and simulation.

```ts
const gameEngine = container.feature("gameEngine", {
  smallBlind: 1,
  bigBlind: 2,
  maxPlayers: 6,
  startingStack: 200,
})

// Seat players
gameEngine.join("hero")
gameEngine.join("villain")

// Deal a hand
gameEngine.deal()

// Access state
gameEngine.game.stage       // "preflop"
gameEngine.game.board       // []
gameEngine.game.pot         // 3 (blinds)
gameEngine.game.players     // [{ id: "hero", stack: 199, holeCards: [...], ... }, ...]

// Record actions
gameEngine.recordAction("villain", "raise", 6)
gameEngine.recordAction("hero", "call", 6)

// Advance to flop
gameEngine.advanceStreet()

// Finalize the hand (evaluates hands, awards pot)
const winners = await gameEngine.finalizeRound("wasm")
```

## Running Simulations

Use the CLI to simulate thousands of hands and measure strategy performance:

```bash
luca poker simulate --strategy tag --iterations 5000
```

Or programmatically with Actors:

```ts
const hero = new Actor({ game: gameEngine, strategy, playerId: "hero" })
const villain = new Actor({ game: gameEngine, strategy, playerId: "villain" })

for (let i = 0; i < 1000; i++) {
  gameEngine.deal()

  while (gameEngine.game.stage !== "complete") {
    const current = gameEngine.game.currentActor
    const actor = current === "hero" ? hero : villain

    await actor.act({
      profileName: current === "hero" ? "tag" : "lag",
    })

    if (["showdown", "complete"].includes(gameEngine.game.stage)) break
    if (gameEngine.game.currentActor === null) gameEngine.advanceStreet()
  }

  await gameEngine.finalizeRound("wasm")
  gameEngine.reset()
}
```

## Analysis Tools

The CLI has built-in equity and range analysis:

```bash
# Hand vs hand equity
luca poker analyze equity AhKd QsQc

# Hand vs hand on a board
luca poker analyze equity AhKd QsQc --board Kh7d2h

# Range vs range
luca poker analyze range "QQ+,AKs" --vs "TT+,AQs+"

# Full hand analysis with pot odds
luca poker analyze hand AhKd --board Kh7d2h --potSize 40 --toCall 20
```

## Putting It All Together

Here's the complete flow for a bot that connects to a live server using the framework:

```ts
import container from "@soederpop/luca/agi"
import { bootPokerContainer } from "./container"

await bootPokerContainer(container)

const strategy = container.feature("strategy")
const client = container.client("poker", {
  wsUrl: "ws://127.0.0.1:3001",
  reconnect: true,
})

await client.connect()
await client.authenticate(process.env.POKER_ACTIVE_TOKEN!)
await client.joinTable()

let heroCards: [string, string] = ["", ""]
let position = "BTN"

client.onMessage(async (msg) => {
  if (msg.type === "deal") {
    heroCards = msg.payload.holeCards as [string, string]
    position = msg.payload.position as string
  }

  if (msg.type === "action_on_you") {
    const { availableActions, toCall, pot, stack, stage, board } = msg.payload as any

    const decision = await strategy.decide("tag", {
      heroCards,
      board: board || [],
      street: stage,
      position: position as any,
      inPosition: ["BTN", "CO"].includes(position),
      checkedTo: toCall === 0,
      potSize: pot,
      toCall,
      effectiveStack: stack,
      playersInHand: 2,
      playersLeftToAct: 1,
      facingBet: toCall > 0,
      facingRaise: false,
      facingThreeBet: false,
    })

    client.send("action", {
      action: decision.action,
      amount: decision.amount,
    })
  }

  if (msg.type === "ping") {
    client.send("pong", {})
  }
})
```

## Tips

1. **Start with a built-in profile.** Use `--strategy tag` and observe how it plays before writing custom logic.
2. **Use hooks for experimentation.** The `makeDecision` hook lets you inject custom logic without reimplementing the entire strategy engine.
3. **Log hand results.** The `gameEngine.saveLog()` method persists hand histories for post-session analysis.
4. **Review situations.** Use the `docs/situations/` workspace to document tough spots and track your strategy evolution.
5. **Test offline first.** Simulate thousands of hands against different profiles before connecting to a live server.
6. **Check equity.** The WASM equity engine runs 3000-4000 iterations per call — use it in your decision logic for informed play.
