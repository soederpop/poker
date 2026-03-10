# Strategy Globals API Reference

Complete reference for every function, class, and object injected into your `strategy.ts` VM scope. These are available as bare globals — no imports needed.

## DecisionContext (what `decide()` receives)

```ts
type DecisionContext = {
  heroCards: string[]              // ["Ah", "Kd"]
  board: string[]                  // ["Ks", "7d", "2h"] — empty preflop
  street: "preflop" | "flop" | "turn" | "river"
  position: "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB"
  inPosition: boolean              // true if BTN or CO
  toCall: number                   // chips to match (0 = can check)
  potSize: number                  // current pot
  stack: number                    // your remaining chips
  legalActions: PokerAction[]      // e.g. ["fold", "check", "call", "bet", "raise", "all-in"]
  playersInHand: number            // opponents still in
}
```

## StrategyDecision (what `decide()` returns)

```ts
type StrategyDecision = {
  action: "fold" | "check" | "call" | "bet" | "raise" | "all-in"
  amount?: number    // required for bet/raise
  reason?: string    // optional, shows in logs
}
```

If your action isn't legal, pokurr auto-corrects: check if possible, otherwise fold.

---

## Hand Evaluation

### `evaluateHand(cards: string[]): HandRank`

Evaluate the best 5-card hand from 5–7 cards.

```ts
const hand = evaluateHand(["Ah", "Kd", "Ks", "7d", "2h", "Ac", "3s"])
// => { category: 3, label: "two-pair", value: [3, 14, 13, 7], cards: [...] }
```

**HandRank shape:**

| Field      | Type           | Description                                                    |
|------------|----------------|----------------------------------------------------------------|
| `category` | `number`       | 1=high-card, 2=one-pair, 3=two-pair, 4=trips, 5=straight, 6=flush, 7=full-house, 8=quads, 9=straight-flush |
| `label`    | `string`       | Human-readable name like `"two-pair"`                          |
| `value`    | `number[]`     | Comparable array — higher is better                            |
| `cards`    | `CardObject[]` | The 5 cards making the hand                                    |

### `compareHands(a: HandRank, b: HandRank): number`

Compare two evaluated hands. Returns `-1` (a wins), `0` (tie), or `1` (b wins).

```ts
const winner = compareHands(handA, handB) // -1, 0, or 1
```

### `normalizeCombo(cards: string[]): string`

Normalize hole cards to canonical combo notation.

```ts
normalizeCombo(["Ac", "Kd"]) // => "AKo"
normalizeCombo(["Qh", "Jh"]) // => "QJs"
normalizeCombo(["Ks", "Kd"]) // => "KK"
```

> Note: the actual function signature takes `[Card, Card]` objects, but the injected version accepts string arrays.

---

## Equity Calculation

### `equity(hands, board?, iterations?): EquityResult[]`

Synchronous hand-vs-hand equity using poker-tools.

```ts
const eq = equity([["Ah", "Kd"], ["Qs", "Qc"]])
// eq[0].winPercentage => ~43%
// eq[1].winPercentage => ~57%

// With a board
const eq2 = equity([["Ah", "Kd"], ["Qs", "Qc"]], ["Ks", "7d", "2h"])

// Custom iterations (default 20000)
const eq3 = equity([["Ah", "Kd"], ["Qs", "Qc"]], [], 50000)
```

**EquityResult shape:**

| Field                | Type     | Description                          |
|----------------------|----------|--------------------------------------|
| `bestHandCount`      | `number` | Times this hand won                  |
| `tieHandCount`       | `number` | Times this hand tied                 |
| `possibleHandsCount` | `number` | Total simulated hands                |
| `winPercentage`      | `number` | Win % (0–100)                        |
| `tiePercentage`      | `number` | Tie % (0–100)                        |

### `equityEngine`

Lower-level equity engine with backend selection. All methods use the WASM backend.

```ts
// Evaluate a hand (async, WASM-accelerated)
const rank = await equityEngine.evaluateHand(["Ah", "Kd", "Ks", "7d", "2h"])

// Hand vs hand equity with explicit backend
const results = await equityEngine.equityWithBackend(
  "wasm",
  [["Ah", "Kd"], ["Qs", "Qc"]],
  ["Ks", "7d", "2h"],
  5000  // iterations
)

// Range vs range equity
const rangeEq = await equityEngine.rangeEquityWithBackend(
  "wasm",
  "AhKd",       // hero cards joined
  "QQ+,AKs",    // villain range notation
  { board: "Ks7d2h", iterations: 4000 }
)
// => { ours: 62.5, theirs: 37.5 }  (percentages 0–100)
```

**equityEngine methods:**

| Method                    | Returns                    | Description                              |
|---------------------------|----------------------------|------------------------------------------|
| `evaluateHand(cards)`     | `Promise<HandRank>`        | WASM-accelerated hand evaluation         |
| `evaluateHandWithBackend(backend, cards)` | `Promise<HandRank>` | Explicit backend selection       |
| `equity(hands, board?, iterations?)` | `Promise<EquityResult[]>` | Auto-backend equity        |
| `equityWithBackend(backend, hands, board?, iterations?)` | `Promise<EquityResult[]>` | Explicit backend |
| `rangeEquity(r1, r2, opts?)` | `Promise<CompareResult>`  | Range vs range                       |
| `rangeEquityWithBackend(backend, hero, villainRange, opts?)` | `Promise<{ours, theirs}>` | WASM range equity |

---

## Range Analysis

### `new Range(notation, deadCards?, numberOfOpponents?)`

Create a hand range from standard poker notation.

```ts
const villainRange = new Range("QQ+,AKs,AKo")
const widerRange = new Range("22+,A2s+,KTs+", ["Ah", "Kd"])  // exclude dead cards
```

**Instance properties (getters):**

| Property          | Type       | Description                                       |
|-------------------|------------|---------------------------------------------------|
| `size`            | `number`   | Number of specific combos in the range             |
| `percentile`      | `number`   | What % of all 1326 combos this range represents    |
| `strength`        | `number`   | Aggregate strength score (0–100)                   |
| `combos`          | `Combo[]`  | Array of all specific combos                       |
| `comboNames`      | `string[]` | e.g. `["AhKd", "AhKc", ...]`                      |
| `normalizedComboNames` | `string[]` | e.g. `["AKo", "AKs", "QQ"]`                 |
| `maxShowdown`     | `number`   | Highest showdown value in range                    |
| `minShowdown`     | `number`   | Lowest showdown value in range                     |
| `input`           | `string`   | Original notation string                           |

**Instance methods:**

| Method                | Returns   | Description                                          |
|-----------------------|-----------|------------------------------------------------------|
| `includes(hand)`      | `boolean` | Check if a specific hand or normalized combo is in range |
| `include(comboOrRange)` | `this`  | Add a combo or sub-range                             |
| `exclude(comboOrRange)` | `this`  | Remove a combo or sub-range                          |
| `compare(otherRange)` | `Promise<{ours, theirs, tie}>` | Range vs range equity          |

```ts
villainRange.includes("AcKd")  // true
villainRange.includes("AKo")   // true (normalized form works too)
villainRange.includes("JTs")   // false

// Mutable: add/remove combos
const range = new Range("QQ+")
range.include("AKs")
range.exclude("QcQd")
```

**Static methods:**

| Method                              | Returns    | Description                                |
|-------------------------------------|------------|--------------------------------------------|
| `Range.ultraStrong(deadCards?)`     | `Range`    | Sklansky group 1 (AA, KK, QQ, JJ, AKs)    |
| `Range.strong(deadCards?)`          | `Range`    | Sklansky groups 1–2                        |
| `Range.medium(deadCards?)`          | `Range`    | Sklansky groups 1–5                        |
| `Range.loose(deadCards?)`           | `Range`    | Sklansky groups 1–7                        |
| `Range.sklansky(group, deadCards?)` | `Range`    | Specific Sklansky-Malmuth group (1–8)      |
| `Range.strongestHands(percent, opponents?)` | `string[]` | Top N% of starting hands        |
| `Range.strongestVsOpponents(n)`     | `[string, number][]` | All 169 hands ranked by win % vs N opponents |
| `Range.combos`                      | `Combo[]`  | All 1326 starting hand combos              |
| `Range.comboNames`                  | `string[]` | All 1326 combo name strings                |
| `Range.fromString(notation)`        | `Combo[]`  | Parse notation into combo array            |
| `Range.filterCombos(filter)`        | `Combo[]`  | Filter combos by notation, object, or function |

**Combo shape (`StartingHandCombination`):**

| Field                 | Type       | Description                                |
|-----------------------|------------|--------------------------------------------|
| `name`                | `string`   | e.g. `"AhKd"`                             |
| `normalized`          | `string`   | e.g. `"AKo"`                              |
| `cards`               | `Card[]`   | Two Card objects                           |
| `pair`                | `boolean`  | Is a pocket pair                           |
| `suited`              | `boolean`  | Same suit                                  |
| `offsuit`             | `boolean`  | Different suit (and not a pair)            |
| `connected`           | `boolean`  | Adjacent ranks (gap = 1)                   |
| `oneGap`              | `boolean`  | One gap between ranks                      |
| `twoGap`              | `boolean`  | Two gaps                                   |
| `threeGap`            | `boolean`  | Three gaps                                 |
| `gap`                 | `number`   | Gap size between ranks                     |
| `showdown`            | `number`   | Raw showdown strength metric               |
| `strengthVsOpponents` | `number[]` | Win % vs 1–9 random opponents (index 0 = 1 opponent) |
| `vsOnePlayer`         | `number`   | Win % heads-up vs random                   |

### `compareRanges(ours, theirs, opts?)`

Quick range-vs-range equity comparison.

```ts
const result = await compareRanges(
  new Range("QQ+,AKs"),
  new Range("TT+,AQs+"),
  { board: ["Ks", "7d", "2h"], iterations: 10000 }
)
// => { ours: 62.3, theirs: 35.1, tie: 2.6, us: "QQ+,AKs", them: "TT+,AQs+" }
```

**Return shape:**

| Field    | Type     | Description                      |
|----------|----------|----------------------------------|
| `ours`   | `number` | Hero win % (0–100)              |
| `theirs` | `number` | Villain win % (0–100)           |
| `tie`    | `number` | Tie % (0–100)                   |
| `us`     | `string` | Hero range notation             |
| `them`   | `string` | Villain range notation          |

### `new HandEquity(hand, opts?)`

Deeper analysis of a single holding.

```ts
const he = new HandEquity("AhKd", { players: 3 })
he.averageWinPercent   // win % vs N random opponents
he.combo               // the StartingHandCombination object
he.possibleFlops       // all flops not using hero's cards
```

| Property           | Type       | Description                                    |
|--------------------|------------|------------------------------------------------|
| `averageWinPercent`| `number`   | Win % vs `players` random opponents            |
| `combo`            | `Combo`    | Full StartingHandCombination metadata          |
| `possibleFlops`    | `string[]` | All possible flop textures excluding hero cards|

### `new RangeEquity(ranges, opts?)`

Full range-vs-range matchup analysis with per-combo detail.

```ts
const re = new RangeEquity(
  [new Range("QQ+"), new Range("TT+")],
  { board: "Ks7d2h", iterations: 5000 }
)
const results = await re.calculate()
// results: Array<{ matchup: [Combo, Combo], equities: EquityResult[] }>
```

---

## Card Utilities

### `stringToCard(s: string): CardObject`

Parse a card string into a Card object.

```ts
stringToCard("Ah")  // => { rank: 14, suit: 4 }
stringToCard("2c")  // => { rank: 2, suit: 1 }
```

### `cardToString(card: CardObject): string`

Convert a Card object back to a string.

```ts
cardToString({ rank: 14, suit: 4 }) // => "Ah"
```

### `new Deck()`

Standard 52-card deck.

```ts
const deck = new Deck()
deck.shuffle()
const card = deck.draw()        // single Card object
const flop = deck.draw_n(3)     // array of 3 Card objects
deck.count                      // cards remaining
deck.reset()                    // restore to full 52
```

| Method/Property | Returns  | Description                    |
|-----------------|----------|--------------------------------|
| `shuffle()`     | `this`   | Fisher-Yates shuffle in place  |
| `draw()`        | `Card`   | Draw one card from top         |
| `draw_n(count)` | `Card[]` | Draw N cards                   |
| `reset()`       | `this`   | Restore to full 52-card deck   |
| `count`         | `number` | Cards remaining (getter)       |

---

## Strategy Engine

The built-in strategy feature with profiles, equity estimation, and range lookups.

### `strategy.estimateEquity(context): Promise<number>`

Estimate hero equity against a villain range or specific hand.

```ts
const eq = await strategy.estimateEquity({
  heroCards: ["Ah", "Kd"],
  board: ["Ks", "7d", "2h"],
  street: "flop",
  playersInHand: 3,
  villainRange: "TT+,AQs+",  // optional
})
// => 0.72 (72%)
```

If neither `villainRange` nor `villainCards` is provided, returns 0.5 as a default.

### `strategy.rangeForProfile(profileName, position): string`

Get the opening range notation for a built-in profile at a given position.

```ts
strategy.rangeForProfile("tag", "BTN")
// => "66+,A8s+,K9s+,QTs+,JTs,ATo+,KJo+,QJo"

strategy.rangeForProfile("nit", "UTG")
// => "QQ+,AKs"
```

### `strategy.listProfiles(): string[]`

List all available strategy profiles.

```ts
strategy.listProfiles()
// => ["tight-aggressive", "loose-passive", "random", "nit", "tag", "lag",
//     "calling-station", "maniac"]
```

### Available Profiles

| Profile             | Style                              | Range Width |
|---------------------|------------------------------------|-------------|
| `tight-aggressive`  | Disciplined ranges, high aggression| Tight       |
| `tag`               | Same as tight-aggressive           | Tight       |
| `nit`               | Ultra-tight, premium only          | Very tight  |
| `lag`               | Wide ranges, frequent pressure     | Wide        |
| `maniac`            | Hyper-aggressive, loves action     | Very wide   |
| `loose-passive`     | Too many hands, check/call heavy   | Wide        |
| `calling-station`   | Rarely folds, rarely raises        | Wide        |
| `random`            | All hands, weighted random actions | Everything  |

---

## Standard Globals

These JavaScript/Node.js globals are also available in the VM:

- `console` — `console.log()`, `console.warn()`, etc.
- `setTimeout` / `clearTimeout`
- `Promise`
- `Math`, `JSON`, `Date`, `Array`, `Object`, `String`, `Number`, `Map`, `Set`

---

## Container (advanced)

The full luca container is available as `container` for advanced strategies that need filesystem access, state persistence, or other platform features. Most bots won't need this.

```ts
container.feature("fs", { enable: true })  // filesystem
container.paths.resolve("some", "path")    // path utils
container.state.get("key")                 // state store
container.docs                             // content database
```

See the [Authoring with Luca](https://github.com/soederpop/luca) docs for full container API.
