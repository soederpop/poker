# Strategy Globals API Reference

Complete reference for the functions, classes, and objects injected into your `strategy.ts` VM scope. These are available as bare globals — no imports needed.

## DecisionContext

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

## StrategyDecision

```ts
type StrategyDecision = {
  action: "fold" | "check" | "call" | "bet" | "raise" | "all-in"
  amount?: number
  reason?: string
}
```

If your action is not legal, Pokurr auto-corrects to `check` when possible, otherwise `fold`.

## Sync vs async quick table

- sync:
  - `equity(...)`
  - `evaluateHand(...)`
  - `compareHands(...)`
  - `normalizeCombo(...)`
  - `analyzeBoard(...)`
  - `analyzeDraws(...)`
- async:
  - `compareRanges(...)`
  - `strategy.estimateEquity(...)`
  - all `equityEngine.*` methods
  - `RangeEquity.calculate()`

## Hand evaluation

```ts
const hand = evaluateHand(["Ah", "Kd", "Ks", "7d", "2h", "Ac", "3s"])
// => { category: 3, label: "two-pair", value: [...], cards: [...] }

const winner = compareHands(handA, handB)
normalizeCombo(["Ac", "Kd"]) // => "AKo"
```

## Equity calculation

### `equity(hands, board?, iterations?)`

Synchronous hand-vs-hand equity.

```ts
const eq = equity([["Ah", "Kd"], ["Qs", "Qc"]])
const eq2 = equity([["Ah", "Kd"], ["Qs", "Qc"]], ["Ks", "7d", "2h"], 50000)
```

### `equityEngine`

Async lower-level engine.

```ts
const rank = await equityEngine.evaluateHand(["Ah", "Kd", "Ks", "7d", "2h"])
const results = await equityEngine.equityWithBackend("wasm", [["Ah", "Kd"], ["Qs", "Qc"]], ["Ks", "7d", "2h"], 5000)
const rangeEq = await equityEngine.rangeEquityWithBackend("wasm", "AhKd", "QQ+,AKs", { board: "Ks7d2h", iterations: 4000 })
```

## Range analysis

### `Range`

```ts
const villainRange = new Range("QQ+,AKs,AKo")
villainRange.size
villainRange.percentile
villainRange.strength
villainRange.comboNames
villainRange.normalizedComboNames
villainRange.includes("AcKd")
villainRange.include("AQs")
villainRange.exclude("QcQd")
```

Useful static constructors:

```ts
Range.ultraStrong()
Range.strong()
Range.medium()
Range.loose()
Range.sklansky(3)
Range.strongestHands(10)
```

### `compareRanges(ours, theirs, opts?)`

```ts
const result = await compareRanges(
  new Range("QQ+,AKs"),
  new Range("TT+,AQs+"),
  { board: "Ks7d2h", iterations: 10000 }
)
// => { ours: 62.3, theirs: 35.1, tie: 2.6, us: "QQ+,AKs", them: "TT+,AQs+" }
```

Notes:
- `board` is a concatenated string like `"Ks7d2h"`
- `ours`, `theirs`, and `tie` are percentages from 0 to 100

### `HandEquity`

```ts
const he = new HandEquity("AhKd", { players: 3 })
he.averageWinPercent
he.combo
he.possibleFlops
```

### `RangeEquity`

```ts
const re = new RangeEquity([new Range("QQ+"), new Range("TT+")], { board: "Ks7d2h", iterations: 5000 })
const results = await re.calculate()
```

## Board and draw helpers

```ts
const texture = analyzeBoard(["Th", "7h", "2c"])
const draws = analyzeDraws(["Kh", "9h"], ["Th", "7h", "2c"])
```

These are useful for lightweight heuristics when you do not want to run a full equity estimate every decision.

## Strategy feature

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

`strategy.rangeForProfile(...)` returns a range string, not a `Range` instance.

## Card helpers

```ts
const deck = new Deck()
deck.shuffle()
const one = deck.draw()
const flop = deck.draw_n(3)
deck.reset()
```

Also available:

```ts
stringToCard("Ah")
cardToString(stringToCard("Ah"))
```

## Container access

`container` is also injected for advanced strategies, but most bot authors should avoid depending on it unless necessary.
