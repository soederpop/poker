# Writing a Bot

Build a poker bot, connect it to a live server, and compete on the leaderboard. Your bot is a single `strategy.ts` file that exports a `decide()` function. Pokurr loads it in a sandboxed VM with equity calculators, range analysis, hand evaluation, and board/draw helpers injected as globals — no imports needed.

## Scaffold a New Bot

```bash
pokurr new-agent my-bot
cd my-bot
```

This creates:

```
my-bot/
├── strategy.ts           # Your decision logic — the only file that really matters
├── types/pokurr.d.ts     # Types for the injected globals
├── tsconfig.json         # TypeScript config (references the types)
├── README.md             # Quick-start instructions
└── docs/situations/      # Hand review workspace
    └── README.md
```

You can optionally annotate the scaffold with a house profile reference:

```bash
pokurr new-agent my-bot tag
pokurr new-agent my-bot lag
pokurr new-agent my-bot nit
pokurr new-agent my-bot maniac
pokurr new-agent my-bot calling-station
```

Important:
- these profile names are references, not full copied house-bot implementations
- the generated scaffold is intentionally small and readable so you can edit it safely

If the types ever get stale after a Pokurr upgrade, regenerate them:

```bash
pokurr types           # run from inside your bot directory
pokurr types ./my-bot  # or pass the path
```

## Quick Start

```bash
# Terminal 1: start a server with house bots to play against
pokurr serve --seedLobby true

# Terminal 2: register your bot (default HTTP port is 3000)
pokurr register http://localhost:3000 --name my-bot

# Terminal 3: join with your agent (default WS port is 3001)
pokurr join ws://localhost:3001 --token <token> --agent ./my-bot
```

For your first debug pass, use manual mode once:

```bash
pokurr join ws://localhost:3001 --token <token> --agent ./my-bot --manual
```

That lets you compare your bot's suggested action with your own before trusting it unattended.

## The decide() Function

Your bot's entire brain is one function:

```ts
export function decide(context: DecisionContext): StrategyDecision {
  return { action: "call", reason: "example" }
}
```

## DecisionContext

Your custom `strategy.ts` receives a deliberately small surface:

```ts
type DecisionContext = {
  heroCards: [string, string]
  board: string[]
  street: "preflop" | "flop" | "turn" | "river"
  position: "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB"
  inPosition: boolean
  toCall: number
  potSize: number
  stack: number
  legalActions: PokerAction[]
  playersInHand: number
}
```

This is intentionally smaller than the internal built-in house-bot context. Use it as a stable authoring API, not a full engine dump.

## StrategyDecision

```ts
type StrategyDecision = {
  action: "fold" | "check" | "call" | "bet" | "raise" | "all-in"
  amount?: number
  reason?: string
}
```

Rules to remember:
- `amount` is required for `bet` and `raise`
- always gate aggressive actions against `legalActions`
- if your action is illegal, Pokurr falls back to the safest option (`check` if possible, otherwise `fold`)

## Available Globals

Your `strategy.ts` runs in a VM where these are injected — no imports needed.

### Hand evaluation

```ts
const hand = evaluateHand(["Ah", "Kd", "Ks", "7d", "2h", "Ac", "3s"])
const result = compareHands(hand, hand)
normalizeCombo(["Ac", "Kd"]) // => "AKo"
```

### Equity calculation

```ts
const eq = equity([["Ah", "Kd"], ["Qs", "Qc"]])
// eq[0].winPercentage => ~43

const he = new HandEquity("AhKd", { players: 3 })
he.averageWinPercent
```

Important:
- `equity(...)` is synchronous
- `equityEngine.*` methods are async

### Range analysis

```ts
const villainRange = new Range("QQ+,AKs,AKo")
villainRange.size
villainRange.percentile
villainRange.strength
villainRange.includes("AcKd")

const result = await compareRanges(
  new Range("QQ+,AKs"),
  new Range("TT+,AQs+"),
  { board: context.board.join(""), iterations: 10000 }
)
// result => { ours: 62.3, theirs: 35.1, tie: 2.6, us: "QQ+,AKs", them: "TT+,AQs+" }
```

Notes:
- pass `board` as a concatenated string like `"Ks7d2h"`
- `compareRanges()` returns percentages on a 0-100 scale, not 0-1

### Strategy engine

```ts
const eq = await strategy.estimateEquity({
  heroCards: context.heroCards,
  board: context.board,
  street: context.street,
  playersInHand: context.playersInHand,
})

strategy.rangeForProfile("tag", "BTN")
strategy.listProfiles()
```

### Card, board, and draw helpers

```ts
const deck = new Deck()
deck.shuffle()
const card = deck.draw()
const flop = deck.draw_n(3)

const texture = analyzeBoard(["Th", "7h", "2c"])
const draws = analyzeDraws(["Kh", "9h"], ["Th", "7h", "2c"])
```

## Minimal legal-action-safe pattern

```ts
function can(action: PokerAction, context: DecisionContext): boolean {
  return context.legalActions.includes(action)
}

export function decide(context: DecisionContext): StrategyDecision {
  if (context.toCall === 0 && can("check", context)) {
    return { action: "check", reason: "free-check" }
  }
  if (context.toCall > 0 && can("fold", context)) {
    return { action: "fold", reason: "default-fold" }
  }
  return { action: "call", reason: "fallback" }
}
```

## Example: Equity-based postflop decisions

```ts
function can(action: PokerAction, context: DecisionContext): boolean {
  return context.legalActions.includes(action)
}

export async function decide(context: DecisionContext): Promise<StrategyDecision> {
  const potOdds = context.toCall / Math.max(context.potSize + context.toCall, 1)

  if (context.street === "preflop") {
    const premiums = new Range("QQ+,AKs")
    const opens = new Range("22+,A2s+,K9s+,QTs+,JTs,ATo+,KJo+")
    const combo = normalizeCombo(context.heroCards)

    if (premiums.includes(combo) && can("raise", context)) {
      return { action: "raise", amount: Math.max(6, context.toCall * 3), reason: "premium" }
    }
    if (opens.includes(combo) && context.toCall <= context.stack * 0.1 && can("call", context)) {
      return { action: "call", reason: "preflop-continue" }
    }
    return { action: context.toCall === 0 ? "check" : "fold", reason: "range-fold" }
  }

  const rangeResult = await compareRanges(
    new Range(context.heroCards.join("")),
    new Range(context.playersInHand > 2 ? "22+,A2s+,K9s+,QTs+,JTs,ATo+,KJo+" : "TT+,AJs+,KQs,AQo+"),
    { board: context.board.join(""), iterations: 5000 }
  )

  const ourEquity = rangeResult.ours / 100

  if (ourEquity > 0.65 && context.toCall > 0 && can("raise", context)) {
    return { action: "raise", amount: Math.max(4, Math.floor(context.toCall * 2.5)), reason: `value eq=${rangeResult.ours.toFixed(1)}%` }
  }
  if (ourEquity > 0.65 && can("bet", context)) {
    return { action: "bet", amount: Math.max(2, Math.floor(context.potSize * 0.66)), reason: `value eq=${rangeResult.ours.toFixed(1)}%` }
  }
  if (ourEquity > potOdds && can("call", context)) {
    return { action: "call", reason: `pot-odds eq=${rangeResult.ours.toFixed(1)}%` }
  }
  if (context.toCall === 0 && can("check", context)) {
    return { action: "check", reason: "check-back" }
  }
  return { action: "fold", reason: `fold eq=${rangeResult.ours.toFixed(1)}%` }
}
```

## Common first errors

- using `compareRanges(...).hero` or `.villain` instead of `.ours` and `.theirs`
- treating `compareRanges()` output as 0-1 decimals instead of 0-100 percentages
- passing `board: context.board` instead of `board: context.board.join("")`
- returning `bet` or `raise` without an `amount`
- forgetting to check `legalActions`

## Tips

1. Start simple. Play one session before making your bot fancy.
2. Use `reason` aggressively. It is your easiest debugger.
3. Keep preflop range-based and postflop equity-based at first.
4. Save tough hands in `docs/situations/` so you can replay them offline.
5. Prefer boring legal decisions over clever illegal ones.

## WebSocket Protocol

For building a bot in a language other than TypeScript, see `docs/websocket-guide.md`.
