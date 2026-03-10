# Writing a Bot

Build a poker bot, connect it to a live server, and compete on the leaderboard. Your bot is a single `strategy.ts` file that exports a `decide()` function. Pokurr loads it in a sandboxed VM with equity calculators, range analysis, and hand evaluation injected as globals — no imports needed.

## Scaffold a New Bot

```bash
pokurr new-agent my-bot
```

This creates:

```
my-bot/
├── strategy.ts           # Your decision logic — the only file that matters
├── types/pokurr.d.ts     # TypeScript types for all injected globals
├── tsconfig.json         # TypeScript config (references the types)
├── README.md             # Quick-start instructions
└── docs/situations/      # Hand review workspace
    └── README.md
```

You can optionally seed from a house actor style:

```bash
pokurr new-agent my-bot tag              # tight-aggressive baseline
pokurr new-agent my-bot lag              # loose-aggressive
pokurr new-agent my-bot nit              # ultra-tight
pokurr new-agent my-bot maniac           # hyper-aggressive
pokurr new-agent my-bot calling-station  # passive caller
```

If the types ever get stale (e.g. after a pokurr update), regenerate them:

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

That's it. Your `strategy.ts` runs locally on your machine. The server sends game state over the WebSocket, your `decide()` runs, and the action goes back over the wire.

## The decide() Function

Your bot's entire brain is one function:

```ts
export function decide(context: DecisionContext): StrategyDecision {
  // Your logic here
  return { action: "call", reason: "yolo" }
}
```

### What You Receive

Every time it's your turn, `decide()` gets called with:

```ts
type DecisionContext = {
  heroCards: string[]        // ["Ah", "Kd"]
  board: string[]            // ["Ks", "7d", "2h"] (empty preflop)
  street: "preflop" | "flop" | "turn" | "river"
  position: "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB"
  inPosition: boolean        // true if BTN or CO
  toCall: number             // chips to match current bet (0 = can check)
  potSize: number            // current pot
  stack: number              // your remaining chips
  legalActions: PokerAction[]  // what you can do: ["fold", "check", "call", "bet", "raise", "all-in"]
  playersInHand: number      // how many opponents remain
}
```

### What You Return

```ts
type StrategyDecision = {
  action: "fold" | "check" | "call" | "bet" | "raise" | "all-in"
  amount?: number   // required for bet/raise
  reason?: string   // optional, shows in logs
}
```

If your action isn't legal, pokurr auto-corrects to the safest fallback (check > fold).

## Available Globals

Your `strategy.ts` runs in a VM where these are injected — no imports needed. Just use them.

### Hand Evaluation

```ts
// Evaluate the best 5-card hand from 5-7 cards
const hand = evaluateHand(["Ah", "Kd", "Ks", "7d", "2h", "Ac", "3s"])
// => { category: "TWO_PAIR", label: "Two Pair, Aces and Kings", value: [...] }

// Compare two evaluated hands
const result = compareHands(handA, handB) // -1, 0, or 1

// Normalize a combo to canonical form
normalizeCombo(["Ac", "Kd"]) // => "AKo"
normalizeCombo(["Qh", "Jh"]) // => "QJs"
```

### Equity Calculation

```ts
// Hand vs hand equity (returns array of results per hand)
const eq = equity([["Ah", "Kd"], ["Qs", "Qc"]])
// eq[0].winPercentage => ~43%, eq[1].winPercentage => ~57%

// With a board
const eq2 = equity([["Ah", "Kd"], ["Qs", "Qc"]], ["Ks", "7d", "2h"])
// Now AK is way ahead with top pair top kicker

// Control precision with iterations (default 20000)
const eq3 = equity([["Ah", "Kd"], ["Qs", "Qc"]], [], 50000)

// HandEquity for deeper analysis of a single holding
const he = new HandEquity("AhKd", { players: 3 })
he.averageWinPercent  // win % vs N random opponents
```

### Range Analysis

```ts
// Create a range from standard notation
const villainRange = new Range("QQ+,AKs,AKo")
villainRange.size           // number of combos (getter)
villainRange.percentile     // % of all hands (getter)
villainRange.strength       // aggregate strength (getter)

// Check if a hand is in a range
villainRange.includes("AcKd") // true
villainRange.includes("JTs")  // false

// Pre-built ranges
Range.ultraStrong()  // AA, KK, QQ, AKs
Range.strong()       // TT+, AQs+, AKo
Range.medium()       // wider
Range.loose()        // very wide

// Sklansky groups (1 = strongest, 8 = weakest)
const group1 = Range.sklansky(1) // AA, KK, QQ, JJ, AKs
const group3 = Range.sklansky(3)

// Get strongest X% of hands
const top10 = Range.strongestHands(10) // top 10% of starting hands

// Range vs range comparison
const result = await compareRanges(
  new Range("QQ+,AKs"),
  new Range("TT+,AQs+"),
  { board: ["Ks", "7d", "2h"], iterations: 10000 }
)
// result => { hero: 0.62, villain: 0.35, tie: 0.03 }
```

### Strategy Engine

The built-in strategy engine is available for equity estimation and profile lookups:

```ts
// Estimate equity against a typical opponent range
const eq = await strategy.estimateEquity({
  heroCards: context.heroCards,
  board: context.board,
  street: context.street,
  playersInHand: context.playersInHand,
})
// eq => 0.72 (72%)

// Get opening ranges for built-in profiles
strategy.rangeForProfile("tag", "BTN")
// => "22+,A2s+,K9s+,Q9s+,J9s+,T9s,A9o+,KTo+,QTo+,JTo"

// List available profiles
strategy.listProfiles()
// => ["tight-aggressive", "tag", "lag", "nit", "maniac", ...]
```

### Card Utilities

```ts
// Parse and create cards
const card = stringToCard("Ah")  // { rank: 14, suit: "HEARTS" }
cardToString(card)               // "Ah"

// Full deck
const deck = new Deck()
deck.shuffle()
const card = deck.draw()
const flop = deck.draw_n(3)
```

## Example: Equity-Based Strategy

Here's a bot that actually calculates equity before making decisions:

```ts
export async function decide(context: DecisionContext): Promise<StrategyDecision> {
  const combo = normalizeCombo(context.heroCards)
  const potOdds = context.toCall / Math.max(context.potSize + context.toCall, 1)

  // Preflop: use range-based decisions
  if (context.street === "preflop") {
    const premiums = new Range("QQ+,AKs")
    const opens = new Range("22+,A2s+,K9s+,QTs+,JTs,ATo+,KJo+")

    if (premiums.includes(combo)) {
      if (can("raise", context)) {
        return { action: "raise", amount: context.toCall * 3 || context.potSize, reason: "premium" }
      }
      return { action: "call", reason: "premium-flat" }
    }

    if (opens.includes(combo) && context.toCall <= context.stack * 0.1) {
      if (context.toCall === 0 && can("raise", context)) {
        return { action: "raise", amount: Math.floor(context.potSize * 0.75), reason: "open-raise" }
      }
      if (can("call", context)) return { action: "call", reason: "open-call" }
    }

    return { action: context.toCall === 0 ? "check" : "fold", reason: "not-in-range" }
  }

  // Postflop: calculate equity against a villain range
  const villainRange = context.playersInHand > 2
    ? new Range("22+,A2s+,K9s+,QTs+,JTs,ATo+,KJo+")
    : new Range("TT+,AJs+,KQs,AQo+")

  const rangeResult = await compareRanges(
    new Range(context.heroCards.join("")),
    villainRange,
    { board: context.board, iterations: 5000 }
  )
  const ourEquity = rangeResult.hero

  // Strong hand (>65% equity): bet or raise for value
  if (ourEquity > 0.65) {
    if (context.toCall > 0 && can("raise", context)) {
      return { action: "raise", amount: context.toCall * 2.5, reason: `value-raise eq=${(ourEquity * 100).toFixed(0)}%` }
    }
    if (can("bet", context)) {
      return { action: "bet", amount: Math.floor(context.potSize * 0.66), reason: `value-bet eq=${(ourEquity * 100).toFixed(0)}%` }
    }
    return { action: "call", reason: "value-call" }
  }

  // Marginal hand (35-65% equity): check/call based on pot odds
  if (ourEquity > 0.35) {
    if (context.toCall === 0) {
      return { action: "check", reason: `marginal eq=${(ourEquity * 100).toFixed(0)}%` }
    }
    if (ourEquity > potOdds && can("call", context)) {
      return { action: "call", reason: `odds-call eq=${(ourEquity * 100).toFixed(0)}% odds=${(potOdds * 100).toFixed(0)}%` }
    }
  }

  // Weak hand: check or fold
  if (context.toCall === 0 && can("check", context)) {
    return { action: "check", reason: "weak-check" }
  }
  return { action: "fold", reason: `fold eq=${(ourEquity * 100).toFixed(0)}%` }
}

function can(action: string, context: DecisionContext): boolean {
  return context.legalActions.includes(action as any)
}
```

## Example: Position-Aware Bluffing

```ts
export function decide(context: DecisionContext): StrategyDecision {
  const combo = normalizeCombo(context.heroCards)
  const spr = context.stack / Math.max(context.potSize, 1) // stack-to-pot ratio

  // In position with low SPR = more aggressive
  if (context.inPosition && spr < 4 && context.toCall === 0) {
    // Bluff with backdoor draws and overcards on dry boards
    if (context.board.length === 3 && can("bet", context)) {
      return { action: "bet", amount: Math.floor(context.potSize * 0.33), reason: "ip-probe" }
    }
  }

  // Heads-up in position facing a check = always stab
  if (context.inPosition && context.playersInHand === 2 && context.toCall === 0 && can("bet", context)) {
    return { action: "bet", amount: Math.floor(context.potSize * 0.5), reason: "hu-stab" }
  }

  // ... rest of your logic
}
```

## Async Support

Your `decide()` can be async. Equity calculations that hit the WASM backend return promises:

```ts
export async function decide(context: DecisionContext): Promise<StrategyDecision> {
  const eq = await strategy.estimateEquity({ ... })
  // ...
}
```

## Testing Your Bot

### Against Built-In Profiles

Start a server with house bots to practice against:

```bash
# Server with house bots enabled (default ports: HTTP 3000, WS 3001)
pokurr serve --seedLobby true

# Join with your agent
pokurr join ws://localhost:3001 --token <token> --agent ./my-bot
```

### Manual Override Mode

Play alongside your bot, approving or overriding each decision:

```bash
pokurr join ws://localhost:3001 --token <token> --agent ./my-bot --manual
```

Each turn you'll see your bot's decision and can accept it or pick your own action.

## Tips

1. **Start simple.** The scaffolded `strategy.ts` works out of the box. Play a session, watch the output, then improve.
2. **Range-based preflop, equity-based postflop.** Preflop decisions are mostly solved — use `Range` and `includes()`. Postflop, calculate equity with `compareRanges()`.
3. **Pot odds are free.** `toCall / (potSize + toCall)` — if your equity exceeds this, calling is profitable.
4. **Position matters.** `inPosition` is huge. Play more hands IP, tighter OOP.
5. **Don't over-compute.** 5000 iterations on `compareRanges()` is fast and accurate enough for live play. Save 50k iterations for offline analysis.
6. **Log your reasons.** The `reason` field shows in the terminal. Use it to debug why your bot made each decision.
7. **Review situations.** Drop tough hands into `docs/situations/` with notes on what went wrong and what to change.

## WebSocket Protocol

For building a bot in a language other than TypeScript, see the [WebSocket Guide](./websocket-guide.md) for the raw message protocol.
