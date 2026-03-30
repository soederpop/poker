# Strategy Profile Upgrade Plan

**Goal**: Turn the strategy profiles from equity-threshold-only bots into
texture-aware, street-aware, opponent-reading decision makers that are hard
enough to exploit that the regret minimizer actually has to learn real poker.

---

## Phase 1 — Fix the Plumbing (prerequisite, ~1 session)

### 1a. Enrich DecisionContext

The `DecisionContext` already has `board`, `street`, `heroCards`. We need to
add fields so the decision functions don't have to recompute:

```
+ boardTexture: BoardTexture        // from analyzeBoard()
+ draws: DrawAnalysis               // from analyzeDraws()
+ raiseCount: number                // raises on this street (0 = unopened, 1 = open/bet, 2 = 3bet, 3 = 4bet)
+ streetHistory: GameAction[]       // actions this street only
+ aggressor: string | null          // who last raised on this street
+ isAggressor: boolean              // did hero make the last raise?
+ spr: number                       // stack-to-pot ratio (effectiveStack / potSize)
+ streetIndex: number               // 0=preflop, 1=flop, 2=turn, 3=river
```

Changes:
- `features/actor.ts` — pass `actionHistory` (already available) and compute
  `raiseCount` from it before calling `strategy.decide()`
- `features/strategy.ts` — update `DecisionContext` type, compute
  `boardTexture` and `draws` at the top of `decide()` (only on postflop streets),
  derive `facingThreeBet` from `raiseCount >= 2` instead of hardcoding false
- `lib/strategy-profiles.ts` — no changes needed (just open ranges)

### 1b. Fix facingThreeBet / facingRaise

Count raises on current street from actionHistory:

```ts
const streetActions = actionHistory.filter(a => a.street === currentStreet)
const raiseActions = streetActions.filter(a => a.action === "raise" || a.action === "all-in")
// On preflop: open-raise = 1 raise, 3-bet = 2 raises, 4-bet = 3 raises
// On postflop: bet = "raise count 0", raise = 1, re-raise = 2
const raiseCount = raiseActions.length
const facingBet = toCall > 0
const facingRaise = raiseCount >= 1 && toCall > 0
const facingThreeBet = raiseCount >= 2 && toCall > 0
const facingFourBet = raiseCount >= 3 && toCall > 0
```

This is straightforward — the action history is already on GameState and
passed through the actor context.

---

## Phase 2 — Board Texture Integration (~1 session)

The `analyzeBoard()` and `analyzeDraws()` functions in pokurr-core already
produce rich texture data. Currently zero profiles use them.

### 2a. Add texture-adjusted bet sizing

Instead of fixed pot-fraction sizes, size based on texture:

| Board type     | Value sizing  | Bluff sizing | Reasoning |
|----------------|---------------|--------------|-----------|
| Dry rainbow    | 33-50% pot    | 33% pot      | Less to protect, cheap bluffs |
| Wet two-tone   | 66-75% pot    | 66% pot      | Charge draws, price them in |
| Monotone       | 75-100% pot   | Overbet       | Must protect, or rep it |
| Paired         | 50-66% pot    | 33% pot      | Fewer combos connect |
| Highly connected| 66-80% pot   | 66% pot      | Many draws possible |

Implementation: a `sizingForTexture(texture: BoardTexture, equity: number): number`
helper in strategy.ts that returns a pot-fraction multiplier.

### 2b. Add draw-aware semibluff logic

When hero has draws (from `analyzeDraws()`):

- **Combo draw (flush + straight)**: Bet/raise aggressively as semibluff
  (totalOuts >= 12 ≈ 48% equity with 2 cards to come)
- **Flush draw**: Bet ~60% of the time on flop, check-call turn, fold
  river if missed
- **OESD**: Bet as semibluff if IP, check-call if OOP
- **Gutshot**: Only continue if pot odds justify (4 outs ≈ 16%)
- **Made flush/straight on later streets**: Bet for value, size up on
  wet boards

Implementation: a `drawDecisionOverride(context, draws, rng)` function
that returns a decision or null (let the normal equity logic handle it).
Called early in each profile's decision function.

### 2c. Texture-aware c-bet logic

The aggressor from the previous street should c-bet based on texture:

- **Dry board (wetness 0-3)**: C-bet 70-80% of the time (hard for caller to connect)
- **Medium board (wetness 4-6)**: C-bet 50-60% with equity > 40%
- **Wet board (wetness 7+)**: Only c-bet with strong equity (55%+) or combo draws

This replaces the current "equity > X → bet" logic for the aggressor.

---

## Phase 3 — Street-Specific Logic (~1 session)

Currently every profile uses the same thresholds on flop/turn/river. Real
poker narrows ranges and changes strategy each street.

### 3a. Flop logic

- Widest c-bet frequency
- Semibluffs are most profitable here (2 cards to come)
- Check-raise frequency for OOP strong hands
- Float frequency for IP with position (balanced, tricky profiles)

### 3b. Turn logic

- Tighten up: fewer bluffs, need more equity to continue
- "Barrel" decision: if hero bet flop, does hero bet turn?
  - Yes if equity improved (draw hit, overcard peeled)
  - Yes if board brick (villain's range didn't improve)
  - No if scare card for hero's perceived range
- Turn raise = very strong signal; all profiles should tighten calling range vs turn raise

### 3c. River logic

- Pure value or pure bluff (no more "drawing" equity)
- Bluff frequency should be proportional to bet size
  (bet 66% pot → need to bluff 40% of bet range to stay balanced)
- Thin value threshold: equity > 55% → bet for value
- Bluff-catch threshold: if pot odds say call needs 30% vs range, and hero beats
  30% of villain's range → call
- Check back marginal showdown value

### 3d. Implementation approach

Replace the single `tightAggressiveDecision()` etc. with:
```ts
private tightAggressiveDecision(context, rng) {
  if (context.street === "preflop") return this.tagPreflop(context, rng)
  if (context.street === "flop")    return this.tagFlop(context, rng)
  if (context.street === "turn")    return this.tagTurn(context, rng)
  if (context.street === "river")   return this.tagRiver(context, rng)
}
```

To keep the file from exploding, factor street logic into a shared module:
`lib/street-logic.ts` with parameterized helpers:

```ts
export function flopDecision(params: {
  equity: number
  potOdds: number
  texture: BoardTexture
  draws: DrawAnalysis
  isAggressor: boolean
  inPosition: boolean
  spr: number
  aggressionProfile: "passive" | "standard" | "aggressive" | "hyper"
  rng: PRNG
}): StrategyDecision | null
```

Each profile passes its personality through the `aggressionProfile` param
(and a few numeric knobs), so the core street logic is shared but behavior
differs.

---

## Phase 4 — Opponent Modeling (Lightweight) (~1 session)

Not asking for a neural net. Just use the action history that's already
available.

### 4a. Villain aggression frequency

From `actionHistory` for a given villain:
```ts
const villainActions = actionHistory.filter(a => a.playerId === villainId)
const betsAndRaises = villainActions.filter(a => a.action === "raise" || a.action === "bet")
const aggressionFreq = betsAndRaises.length / Math.max(villainActions.length, 1)
```

- High (> 0.5): villain is aggressive → widen calling range, tighten bluff range
- Low (< 0.2): villain is passive → fold to their bets more (they have it)

### 4b. Villain range narrowing

Coarse version based on actions this hand:
- Villain open-raised preflop → assign them an opening range for their position
- Villain 3-bet → narrow to 3-bet range (premium subset)
- Villain called a flop bet → remove trash, keep pairs+draws
- Villain raised on the turn → strong range (top pair+, sets, 2-pair)
- Villain bet river → polarized (nutted or bluff)

Don't need to track exact combos. Just tighten the `villainRange` string
passed to `estimateEquity()`. Right now it often defaults to 0.5 equity
because no range is passed.

### 4c. Per-hand opponent model

Add to DecisionContext:
```
+ villainProfile: {
    aggressionFreq: number    // 0-1 from action history
    vpip: number              // voluntarily put money in pot frequency
    pfr: number               // preflop raise frequency
    actions: number           // sample size
  } | null
```

The actor can compute this from the game server's hand history for the
current session. Even 10-20 hands of data shifts decisions meaningfully.

---

## Phase 5 — SPR-Aware Play (~0.5 session)

Stack-to-pot ratio (SPR) fundamentally changes correct strategy. Currently
only `short-stack` considers stack depth at all.

### 5a. SPR zones

| SPR     | Zone      | Style |
|---------|-----------|-------|
| < 3     | Committed | Jam or fold; no room for post-flop play |
| 3-7     | Shallow   | Big hands play fast, draws fold, top pair is a monster |
| 7-15    | Medium    | Standard poker; draws have implied odds |
| > 15    | Deep      | Speculative hands gain value; sets mine profitably |

### 5b. Profile adjustments by SPR

- **All profiles**: When SPR < 3, simplify to jam/fold with equity > 40%
- **TAG/Balanced**: At SPR 3-7, bet bigger for protection, reduce float frequency
- **LAG/Pressure**: At deep SPR, increase speculative open rate and 3-bet bluff frequency
- **Tricky**: At medium SPR, increase slowplay frequency (room to let villain hang themselves)

---

## Phase 6 — Profile Personality Differentiation (~0.5 session)

After the shared infrastructure is in place, tune each profile's knobs to
create genuinely different opponents:

| Profile      | C-bet% | Bluff:Value | Float freq | Turn barrel% | River bluff% | Draw aggression |
|--------------|--------|-------------|------------|--------------|--------------|-----------------|
| nit          | 40%    | 1:5         | 5%         | 30%          | 5%           | passive         |
| tag          | 65%    | 1:3         | 12%        | 55%          | 18%          | standard        |
| balanced     | 60%    | 1:2         | 18%        | 50%          | 25%          | standard        |
| tricky       | 50%    | 1:2         | 25%        | 40%          | 20%          | sneaky          |
| pressure     | 75%    | 1:1.5       | 15%        | 65%          | 35%          | aggressive      |
| lag          | 70%    | 1:1.5       | 20%        | 60%          | 30%          | aggressive      |
| maniac       | 85%    | 1:1         | 30%        | 75%          | 45%          | hyper           |
| short-stack  | 55%    | 1:2         | 8%         | jam-or-check | jam-or-check | jam if drawing  |
| calling-stn  | 30%    | 1:10        | 40% (call) | 20%          | 5%           | passive-call    |

---

## Implementation Order

```
Phase 1 (plumbing)      ████░░░░░░  ~1 session
  1a. Enrich DecisionContext
  1b. Fix facingThreeBet from action history

Phase 2 (texture)       ████░░░░░░  ~1 session
  2a. Texture-adjusted sizing
  2b. Draw-aware semibluffs
  2c. Texture-aware c-betting

Phase 3 (streets)       ████░░░░░░  ~1 session
  3a-d. Street-specific logic with shared parameterized helpers

Phase 4 (opponents)     ████░░░░░░  ~1 session
  4a. Villain aggression frequency
  4b. Villain range narrowing
  4c. Per-hand opponent model

Phase 5 (SPR)           ██░░░░░░░░  ~0.5 session
  5a-b. SPR zones and profile adjustments

Phase 6 (personality)   ██░░░░░░░░  ~0.5 session
  Tuning the knobs per profile
```

Each phase is independently testable and shippable. Phase 1 is prerequisite
for everything else. Phases 2-5 can be done in any order after Phase 1.
Phase 6 is a tuning pass after 2-5 are in.

**Total estimate: ~5 sessions of focused work.**

---

## Testing Strategy

- Existing `strategy-profiles.test.ts` validates profiles exist and actors route correctly
- Add unit tests for each new helper (sizingForTexture, drawDecisionOverride, etc.)
- Add "situation" tests: given a specific board + hand + history, assert the
  decision matches expected behavior (e.g., TAG should c-bet dry A-high flop)
- Run 1000-hand simulations between profiles to verify:
  - No profile has > 80% fold frequency (degenerate)
  - Aggression profiles actually raise more than passive ones
  - Win rates roughly match: balanced ≈ tag > lag > tricky > maniac > calling-station > nit
- Performance: decision time should stay < 5ms per call (equity engine is the bottleneck)
