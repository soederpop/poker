# Regret Minimizer Plan

How `analyzeBoard` and `analyzeDraws` connect to the bucketing system, and the full plan for building the regret minimizer.

## How Board/Draw Analysis Enables Bucketing

The regret minimizer needs to group similar situations into **buckets** so it can learn from patterns rather than memorizing every unique hand. Raw equity alone isn't enough — two hands at 45% equity can play completely differently depending on whether that equity comes from a made hand or a draw.

`analyzeBoard` and `analyzeDraws` provide the features that make meaningful postflop buckets possible.

### Preflop Buckets (simple — no board analysis needed)

Use `Range.strongestHands(percent)` to assign each hand to a tier:

| Bucket | Percentile | Examples |
|--------|-----------|----------|
| 0 | Top 3% | AA, KK, QQ, AKs |
| 1 | 3-8% | JJ, TT, AKo, AQs |
| 2 | 8-18% | 99, 88, AJs, KQs |
| 3 | 18-30% | 77, ATo, KJo, QJs |
| 4 | 30-50% | 66, A9s, KTo, JTs |
| 5 | 50-75% | Small pairs, suited connectors |
| 6 | 75-100% | Everything else |

### Postflop Buckets (two dimensions — this is where the new globals matter)

**Dimension 1: Made Hand Strength** (from `evaluateHand`):

| Value | Category | How to detect |
|-------|----------|---------------|
| 0 | Nothing / air | `evaluateHand(hero + board).category === 1` (high card) |
| 1 | Weak pair (bottom/middle pair) | category 2, pair rank below board high card |
| 2 | Top pair / overpair | category 2, pair rank >= board high card |
| 3 | Two pair or better | category >= 3 |

**Dimension 2: Draw Potential** (from `analyzeDraws`):

| Value | Category | How to detect |
|-------|----------|---------------|
| 0 | No draw | `comboDrawCount === 0 && overcardCount === 0` |
| 1 | Weak draw | `gutshot || overcardCount >= 1` |
| 2 | Strong draw | `flushDraw || openEndedStraightDraw` |
| 3 | Monster draw | `comboDrawCount >= 2` (flush draw + straight draw) |

This gives a **4 x 4 = 16 bucket** grid. Each postflop situation maps to a coordinate like `(2, 1)` = "top pair with a gutshot."

### The Bucketing Function

```ts
function assignBucket(heroCards: string[], board: string[], street: string): { made: number; draw: number } {
  if (street === "preflop" || board.length === 0) {
    // Preflop: use single dimension (hand tier)
    return { made: preflopTier(heroCards), draw: 0 }
  }

  // Made hand strength
  const hand = evaluateHand([...heroCards, ...board])
  const texture = analyzeBoard(board)
  let made = 0
  if (hand.category >= 3) made = 3                                         // two pair+
  else if (hand.category === 2 && hand.value[1] >= texture.highCard) made = 2  // top pair/overpair
  else if (hand.category === 2) made = 1                                    // weak pair
  // else 0 = air

  // Draw potential
  const draws = analyzeDraws(heroCards, board)
  let draw = 0
  if (draws.comboDrawCount >= 2) draw = 3         // combo draw
  else if (draws.flushDraw || draws.openEndedStraightDraw) draw = 2  // strong draw
  else if (draws.gutshot || draws.overcardCount >= 1) draw = 1       // weak draw
  // else 0 = no draw

  return { made, draw }
}
```

### Why Board Texture Also Matters for Action Selection

The `BoardTexture.wetness` score (0-10) modifies how aggressively to play within a bucket:

- **Dry board** (wetness 0-2): Made hands can slow-play, draws are rare, bet for value.
- **Wet board** (wetness 5+): Protect made hands with larger bets, draws have more equity, semi-bluffs become viable.

The regret minimizer can learn this implicitly, but `wetness` gives it a head start — or the outer loop (Claude Code) can write explicit rules like "on wet boards (wetness > 5), increase bet sizing by 25% with made hands."

---

## Regret Minimizer Architecture

### Overview

Two loops:

1. **Inner loop** — plays hands, tracks regret per bucket, writes journals
2. **Outer loop** — Claude Code reads journals, identifies patterns, updates `strategy.ts`

### Inner Loop: Monte Carlo Regret Tracking

**Not full CFR.** Instead, equity-based regret approximation:

1. At each decision point, compute equity via `strategy.estimateEquity()` or `equityEngine`
2. Compute EV of each legal action:
   - `EV(fold) = 0`
   - `EV(call) = (equity × (pot + toCall)) - ((1 - equity) × toCall)`
   - `EV(bet/raise X) = (foldEquity × pot) + ((1 - foldEquity) × equity × (pot + X)) - ((1 - foldEquity) × (1 - equity) × X)`
   - Fold equity estimated from bet sizing relative to pot and street
3. Record regret: `regret[bucket][action] += (EV of best action) - (EV of action taken)`
4. Over many hands, positive regret accumulates for underused actions

**Data structure:**

```ts
type RegretTable = {
  // key: "preflop:3" or "flop:2:1" (street:made:draw)
  [bucketKey: string]: {
    fold: number
    check: number
    call: number
    bet_small: number   // < 0.5 pot
    bet_medium: number  // 0.5-1.0 pot
    bet_large: number   // > 1.0 pot
    raise: number
    handCount: number
  }
}
```

### Journal Output

After N hands (e.g., 500), the inner loop writes a journal entry:

```markdown
## Session 2026-03-10T14:30 — 500 hands

### Top Regret Spots

1. **Bucket flop:(2,1)** — Top pair + gutshot, facing bet
   - Current: fold 45%, call 40%, raise 15%
   - Regret signal: raise is +3.2 EV/hand, fold is -1.8 EV/hand
   - Recommendation: Raise more often with top pair + draw

2. **Bucket preflop:4** — Marginal hands (30-50%) in position
   - Current: fold 70%, call 25%, raise 5%
   - Regret signal: call is +0.8 EV/hand
   - Recommendation: Defend wider in position

3. **Bucket river:(3,0)** — Two pair+ with no draw (river)
   - Current: bet_small 60%, check 30%, bet_large 10%
   - Regret signal: bet_large is +2.1 EV/hand
   - Recommendation: Value bet larger with strong made hands
```

### Outer Loop: Claude Code Strategy Updates

Claude Code reads the journal and modifies `strategy.ts`:

1. **Parse the journal** — identify which buckets have the highest accumulated regret
2. **Understand the pattern** — "we're folding too much with top pair + draws"
3. **Write code** — add or modify conditional logic in `decide()`
4. **Commit with rationale** — the commit message explains _why_ based on the regret data
5. **Re-run inner loop** — verify regret decreases in the targeted buckets

The strategy evolves as readable TypeScript, not as a lookup table:

```ts
// v1: baseline
if (toCall > potSize * 0.5) return { action: "fold" }

// v2: after regret journal shows folding too much with draws
const draws = analyzeDraws(context.heroCards, context.board)
if (draws.comboDrawCount >= 2 || (draws.flushDraw && draws.overcardCount > 0)) {
  // combo draws and flush draws with overcards have enough equity to continue
  return { action: "call" }
}
if (toCall > potSize * 0.5) return { action: "fold" }
```

### File Layout

```
features/
  regret-tracker.ts       — RegretTable, bucket assignment, EV calculation
  regret-journal.ts       — Journal writer (markdown output)
  regret-session.ts       — Orchestrates N hands and writes journal

docs/
  regret-journals/        — Output directory for session journals
    2026-03-10-session-1.md
    2026-03-10-session-2.md
```

### Implementation Order

1. **Bucket assignment function** — uses `evaluateHand`, `analyzeBoard`, `analyzeDraws` to classify each decision point
2. **Regret table** — simple in-memory map, persisted to JSON after each session
3. **EV calculator** — uses existing equity engine to estimate action EVs
4. **Journal writer** — formats regret data as readable markdown
5. **Session runner** — plays N hands against house bots, records all decisions, computes regret, writes journal
6. **Outer loop integration** — Claude Code reads journals and proposes strategy changes

### Key Design Decisions

- **Start with 7 preflop + 16 postflop = 23 total buckets.** This is coarse enough to converge in hundreds of hands, not millions. Refine later if needed.
- **Equity-based regret, not full tree traversal.** We skip opponent modeling and counterfactual reach probabilities. This won't find Nash equilibrium, but it will find exploitable leaks — which is what the outer loop needs.
- **Fold equity is estimated, not computed.** We use simple heuristics (bigger bets = more fold equity) rather than modeling villain's calling range. The regret data will reveal if these estimates are wrong.
- **Journals are the interface between loops.** The inner loop writes markdown. The outer loop reads markdown. No shared data structures — this keeps the loops decoupled and the learning process auditable.
