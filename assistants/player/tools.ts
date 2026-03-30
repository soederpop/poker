import { z } from 'zod'

export const schemas = {
  README: z.object({}).describe(
    'Get documentation about all poker analysis tools available in runScript. Call this FIRST before making any decisions.'
  ),
  runScript: z.object({
    code: z.string().describe(
      'JavaScript code to execute. Runs in an async context — you can use `await`. All poker analysis globals are pre-defined (see README). Return a value and it will be sent back to you.'
    ),
    description: z.string().optional().describe(
      'Brief description of what this script computes (for logging).'
    ),
  }).describe(
    'Execute JavaScript code with access to poker analysis tools: equity calculators, range constructors, board texture analysis, draw analysis, hand evaluation, and more. Use this to make data-driven decisions.'
  ),
}

export function README() {
  return `
# Poker Analysis VM — Available Globals

All of these are available as top-level variables in your runScript code.
Async functions must be awaited.

─────────────────────────────────────────────
## Decision Context (passed to you each turn)
─────────────────────────────────────────────

These describe the current game state. They are available as variables
in your runScript environment:

  heroCards    : string[]        — Your hole cards, e.g. ["Ah", "Kd"]
  board        : string[]        — Community cards, e.g. ["Ts", "7h", "2c"]
  street       : "preflop" | "flop" | "turn" | "river"
  position     : "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB"
  inPosition   : boolean         — Are you last to act?
  toCall       : number          — Chips needed to call
  potSize      : number          — Current pot size
  stack        : number          — Your remaining stack
  legalActions : string[]        — Valid actions: "fold","check","call","bet","raise","all-in"
  playersInHand: number          — How many players remain in the hand

─────────────────────────────────────────────
## Hand Evaluation
─────────────────────────────────────────────

  evaluateHand(cards: string[]) → HandRank
    Evaluate the best 5-card hand from 5-7 cards.
    Returns: { category, categoryName, rank, cards }
    Example: evaluateHand([...heroCards, ...board])

  compareHands(a: HandRank, b: HandRank) → number
    Compare two HandRank results. Returns -1, 0, or 1.

  normalizeCombo(cards: string[]) → string
    Normalize hole cards to combo notation: ["Ac","Kd"] → "AKo"

─────────────────────────────────────────────
## Equity Calculation
─────────────────────────────────────────────

  await equity(hands: string[][], board?: string[], iterations?: number)
    → EquityResult[]
    Raw equity calc for multiple hands.
    Each result: { bestHandCount, possibleHandsCount, tieHandCount }
    Example:
      const results = await equity([heroCards, ["?h","?h"]], board, 5000)
      const myEquity = results[0].bestHandCount / results[0].possibleHandsCount

  new HandEquity(hand: string)
    .against(villain: string | Range, board?: string[], iterations?: number)
    → Promise<{ equity, wins, ties, total }>
    Example:
      const he = new HandEquity("AhKd")
      const result = await he.against("QQ+,AKs", board, 5000)
      // result.equity is 0-1

  new RangeEquity(range: Range)
    .against(villain: Range, board?: string[], iterations?: number)
    → Promise<{ equity, wins, ties, total }>

  await compareRanges(ours: Range, theirs: Range, opts?)
    → { hero: number, villain: number, tie: number }

  equityEngine.equityWithBackend("wasm", hands, board?, iterations?)
    → Promise<EquityResult[]>

─────────────────────────────────────────────
## Ranges
─────────────────────────────────────────────

  new Range(notation: string)
    Construct a hand range. Supports standard notation.
    Examples: new Range("QQ+,AKs,AKo"), new Range("22+,A2s+,KTs+")
    Properties: .size, .percentile, .strength
    Methods:   .includes(combo), .combos(), .toString()

  Static presets (all accept optional deadCards):
    Range.ultraStrong()      — AA, KK, QQ, AKs
    Range.strong()           — TT+, AQs+, AKo
    Range.medium()           — 77+, A9s+, KTs+, QJs, ATo+, KQo
    Range.loose()            — 22+, A2s+, K9s+, Q9s+, J9s+, T9s, A8o+, KTo+, QTo+, JTo
    Range.sklansky(group)    — Sklansky hand group 1-8
    Range.strongestHands(pct, numOpponents?) — Top X% of hands

─────────────────────────────────────────────
## Board & Draw Analysis
─────────────────────────────────────────────

  analyzeBoard(board: string[]) → BoardTexture
    Returns: {
      monotone, twoTone, rainbow,
      flushPossible, flushDrawPossible,
      dominantSuit, suitCounts,
      straightPossible, highlyConnected,
      paired, trips, pairRank,
      highCard, hasAce, hasBroadway,
      wetness (0-10), cardCount
    }

  analyzeDraws(heroCards: string[], board: string[]) → DrawAnalysis
    Returns: {
      flushDraw, flushDrawSuit, flushDrawOuts, madeFlush,
      openEndedStraightDraw, gutshot, doubleGutshot,
      straightDrawOuts, madeStraight,
      comboDrawCount, totalOuts, overcardCount
    }

─────────────────────────────────────────────
## Strategy Engine
─────────────────────────────────────────────

  strategy.estimateEquity({ heroCards, board?, villainRange?, iterations? })
    → Promise<number>
    Quick equity estimate (0-1).

  strategy.rangeForProfile(profileName, position) → Range | null
    Get the opening range for a known player profile at a position.
    Profiles: nit, tag, balanced, tricky, pressure, lag, maniac,
              short-stack, calling-station, loose-passive, random

  strategy.listProfiles() → string[]
    List all available opponent profile names.

─────────────────────────────────────────────
## Cards & Deck
─────────────────────────────────────────────

  new Deck()          — Fresh 52-card deck
    .shuffle()        → Deck (shuffled)
    .draw(count?)     → Card[]
    .remove(cards)    → Deck (cards removed)
    .remaining()      → number

  stringToCard(s: string) → CardObject { rank, suit }
  cardToString(c: CardObject) → string

─────────────────────────────────────────────
## Tips for Effective Scripts
─────────────────────────────────────────────

1. Keep scripts focused — compute one thing per call.
2. Always return a value so you get the result back.
3. Use 1000-5000 iterations for equity (balance speed vs accuracy).
4. For preflop, use Range presets for villain estimates.
5. For postflop, narrow villain range based on their actions.

Example — compute equity vs a TAG range:
  const he = new HandEquity(heroCards.join(""))
  const villainRange = strategy.rangeForProfile("tag", "CO")
  const result = await he.against(villainRange, board, 3000)
  return { equity: result.equity, potOdds: toCall / (potSize + toCall) }
`
}

export async function runScript(
  options: z.infer<typeof schemas.runScript>,
  { assistant }: { assistant: any }
) {
  const container = assistant?.container
  if (!container) {
    return { error: 'No container available — cannot execute scripts.' }
  }

  const vm = container.feature('vm', { enable: true })

  try {
    // Import poker analysis tools from @pokurr/core
    const pokurrCore = await import('@pokurr/core')
    const strategyFeature = container.feature('strategy', { enable: true })

    // Get the current game context from assistant state
    const gameContext = assistant?.state && typeof assistant.state.get === 'function'
      ? (assistant.state.get('gameContext') || {})
      : (assistant.state?.gameContext || {})

    const result = await vm.run(
      `(async () => { ${options.code} })()`,
      {
        // Game state variables
        heroCards: gameContext.heroCards || [],
        board: gameContext.board || [],
        street: gameContext.street || 'preflop',
        position: gameContext.position || 'UTG',
        inPosition: gameContext.inPosition || false,
        toCall: gameContext.toCall || 0,
        potSize: gameContext.potSize || 0,
        stack: gameContext.stack || 0,
        legalActions: gameContext.legalActions || [],
        playersInHand: gameContext.playersInHand || 2,

        // Equity and hand evaluation
        equity: pokurrCore.equity,
        equityEngine: pokurrCore.equityEngine,
        evaluateHand: pokurrCore.evaluateHand,
        compareHands: pokurrCore.compareHands,
        HandEquity: pokurrCore.HandEquity,

        // Range analysis
        Range: pokurrCore.Range,
        RangeEquity: pokurrCore.RangeEquity,
        compareRanges: pokurrCore.compareRanges,

        // Card utilities
        Deck: pokurrCore.Deck,
        stringToCard: pokurrCore.stringToCard,
        cardToString: pokurrCore.cardToString,
        normalizeCombo: pokurrCore.normalizeCombo,

        // Board and draw analysis
        analyzeBoard: pokurrCore.analyzeBoard,
        analyzeDraws: pokurrCore.analyzeDraws,

        // Strategy engine
        strategy: strategyFeature,

        // Standard globals
        console,
        setTimeout,
        clearTimeout,
        Promise,
      }
    )

    return result
  } catch (err: any) {
    return { error: err.message || String(err) }
  }
}
