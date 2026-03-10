import { type Card, Rank, Suit, stringToCard } from "./cards"

// ── Board Texture Analysis ──────────────────────────────────────

export type BoardTexture = {
  // Suit texture
  monotone: boolean        // all cards same suit (3+ on flop, etc.)
  twoTone: boolean         // exactly two of one suit
  rainbow: boolean         // all different suits
  flushPossible: boolean   // 3+ cards of one suit on the board
  flushDrawPossible: boolean // exactly 2 of one suit (someone could be drawing)
  dominantSuit: Suit | null // suit with highest count (null if rainbow on flop)
  suitCounts: Record<Suit, number>

  // Connectedness
  straightPossible: boolean  // board contains 3+ cards within a 5-rank window
  highlyConnected: boolean   // board has 4+ cards within a 5-rank window

  // Pairing
  paired: boolean           // board contains at least one pair
  trips: boolean            // board contains three of a kind
  pairRank: number | null   // rank of the pair (highest if multiple)

  // High card context
  highCard: Rank
  hasAce: boolean
  hasBroadway: boolean      // any T, J, Q, K, A on board

  // Overall wetness score (0-10): higher = more draws possible
  wetness: number

  // Number of cards analyzed
  cardCount: number
}

export type DrawAnalysis = {
  // Flush draws
  flushDraw: boolean           // hero has 4 to a flush (needs 1 more)
  flushDrawSuit: Suit | null   // which suit
  flushDrawOuts: number        // cards that complete it (usually 9, minus visible)
  madeFlush: boolean           // hero already has a flush (5+ of a suit)

  // Straight draws
  openEndedStraightDraw: boolean  // 4 consecutive, open on both ends
  gutshot: boolean                // 4 to a straight with 1 gap
  doubleGutshot: boolean          // two different gutshot possibilities
  straightDrawOuts: number        // cards that complete a straight
  madeStraight: boolean           // hero already has a straight

  // Combined
  comboDrawCount: number          // number of simultaneous draws (flush + straight = 2)
  totalOuts: number               // rough total outs (deduped where possible)

  // Overcards
  overcardCount: number           // hero cards above board high card
}

function toCards(input: Array<Card | string>): Card[] {
  return input.map((c) => (typeof c === "string" ? stringToCard(c) : c))
}

function countSuits(cards: Card[]): Record<Suit, number> {
  const counts = { [Suit.CLUBS]: 0, [Suit.DIAMONDS]: 0, [Suit.HEARTS]: 0, [Suit.SPADES]: 0 }
  for (const c of cards) {
    counts[c.suit]++
  }
  return counts
}

function uniqueRanks(cards: Card[]): number[] {
  return [...new Set(cards.map((c) => c.rank))].sort((a, b) => b - a)
}

function hasStraightWindow(ranks: number[], windowSize: number): boolean {
  const uniques = [...new Set(ranks)].sort((a, b) => a - b)
  // Also add low-ace (1) if ace is present for wheel detection
  if (uniques.includes(Rank.ACE)) {
    uniques.unshift(1)
  }
  for (let i = 0; i <= uniques.length - windowSize; i++) {
    const window = uniques.slice(i, i + windowSize)
    if (window[window.length - 1] - window[0] <= 4) {
      return true
    }
  }
  return false
}

function computeWetness(cards: Card[], suitCounts: Record<Suit, number>): number {
  let score = 0
  const ranks = cards.map((c) => c.rank)

  // Flush potential: monotone = +3, two-tone = +2
  const maxSuit = Math.max(...Object.values(suitCounts))
  if (maxSuit >= 3) score += 3
  else if (maxSuit === 2) score += 2

  // Connectedness: cards close in rank = wet
  const uniques = uniqueRanks(cards)
  const gaps: number[] = []
  for (let i = 0; i < uniques.length - 1; i++) {
    gaps.push(uniques[i] - uniques[i + 1])
  }
  const closeGaps = gaps.filter((g) => g <= 2).length
  score += Math.min(closeGaps * 1.5, 4)

  // Broadway-heavy boards are wetter (more hands connect)
  const broadwayCount = ranks.filter((r) => r >= Rank.TEN).length
  if (broadwayCount >= 2) score += 1

  return Math.min(10, Math.round(score))
}

export function analyzeBoard(input: Array<Card | string>): BoardTexture {
  const cards = toCards(input)

  if (cards.length < 3 || cards.length > 5) {
    throw new Error(`analyzeBoard expects 3-5 cards (flop/turn/river), got ${cards.length}`)
  }

  const suitCounts = countSuits(cards)
  const ranks = cards.map((c) => c.rank)
  const uniques = uniqueRanks(cards)

  // Suit texture
  const maxSuitCount = Math.max(...Object.values(suitCounts))
  const suitsUsed = Object.values(suitCounts).filter((c) => c > 0).length
  const monotone = maxSuitCount >= 3 && suitsUsed === 1
  const twoTone = maxSuitCount === 2 && !monotone
  const rainbow = suitsUsed === cards.length
  const flushPossible = maxSuitCount >= 3
  const flushDrawPossible = maxSuitCount === 2

  let dominantSuit: Suit | null = null
  if (maxSuitCount >= 2) {
    for (const s of [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES]) {
      if (suitCounts[s] === maxSuitCount) {
        dominantSuit = s
        break
      }
    }
  }

  // Connectedness
  const straightPossible = hasStraightWindow(ranks, 3)
  const highlyConnected = hasStraightWindow(ranks, 4)

  // Pairing
  const rankCounts = new Map<number, number>()
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1)
  }
  const pairs = [...rankCounts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[0] - a[0])
  const tripsEntry = [...rankCounts.entries()].find(([, c]) => c >= 3)
  const paired = pairs.length > 0
  const trips = tripsEntry !== undefined
  const pairRank = pairs.length > 0 ? pairs[0][0] : null

  // High card context
  const highCard = uniques[0] as Rank
  const hasAce = uniques.includes(Rank.ACE)
  const hasBroadway = ranks.some((r) => r >= Rank.TEN)

  const wetness = computeWetness(cards, suitCounts)

  return {
    monotone,
    twoTone,
    rainbow,
    flushPossible,
    flushDrawPossible,
    dominantSuit,
    suitCounts,
    straightPossible,
    highlyConnected,
    paired,
    trips,
    pairRank,
    highCard,
    hasAce,
    hasBroadway,
    wetness,
    cardCount: cards.length,
  }
}

// ── Draw Analysis (hero cards + board) ──────────────────────────

function countFlushDraw(
  heroCards: Card[],
  boardCards: Card[],
): { flushDraw: boolean; flushDrawSuit: Suit | null; flushDrawOuts: number; madeFlush: boolean } {
  const allCards = [...heroCards, ...boardCards]
  const suitCounts = countSuits(allCards)

  for (const suit of [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES]) {
    if (suitCounts[suit] >= 5) {
      return { flushDraw: false, flushDrawSuit: null, flushDrawOuts: 0, madeFlush: true }
    }
  }

  // Need at least one hero card in the suit to have a flush draw
  for (const suit of [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES]) {
    if (suitCounts[suit] === 4 && heroCards.some((c) => c.suit === suit)) {
      const outs = 13 - suitCounts[suit] // cards of that suit remaining (minus known)
      return { flushDraw: true, flushDrawSuit: suit, flushDrawOuts: outs, madeFlush: false }
    }
  }

  return { flushDraw: false, flushDrawSuit: null, flushDrawOuts: 0, madeFlush: false }
}

function findStraightDraws(
  heroCards: Card[],
  boardCards: Card[],
): { oesd: boolean; gutshot: boolean; doubleGutshot: boolean; outs: number; madeStraight: boolean } {
  const allCards = [...heroCards, ...boardCards]
  const allRanks = [...new Set(allCards.map((c) => c.rank))].sort((a, b) => a - b)
  const heroRanks = new Set(heroCards.map((c) => c.rank))

  // Add low-ace for wheel
  if (allRanks.includes(Rank.ACE)) {
    allRanks.unshift(1)
  }

  // Check if we already have a straight (5 within a span of 4)
  for (let high = allRanks.length - 1; high >= 4; high--) {
    for (let low = 0; low <= high - 4; low++) {
      const window = allRanks.slice(low, low + 5)
      if (window.length === 5 && window[4] - window[0] === 4) {
        // Verify we have all 5 (no gaps)
        const windowSet = new Set(window)
        let complete = true
        for (let r = window[0]; r <= window[4]; r++) {
          if (!windowSet.has(r)) { complete = false; break }
        }
        if (complete) {
          return { oesd: false, gutshot: false, doubleGutshot: false, outs: 0, madeStraight: true }
        }
      }
    }
  }

  // Count straight draws: check every possible 5-card straight window
  // A straight window is [X, X+1, X+2, X+3, X+4] for X from 1 (A-low) to 10
  const rankSet = new Set(allRanks)
  let oesdCount = 0
  let gutshotCount = 0

  for (let bottom = 1; bottom <= 10; bottom++) {
    const window = [bottom, bottom + 1, bottom + 2, bottom + 3, bottom + 4]
    const have = window.filter((r) => rankSet.has(r === 1 ? 1 : r === 14 ? Rank.ACE : r))
    const missing = window.filter((r) => !rankSet.has(r === 1 ? 1 : r === 14 ? Rank.ACE : r))

    if (have.length !== 4 || missing.length !== 1) continue

    // Must use at least one hero card
    const usesHeroCard = have.some((r) => {
      const actual = r === 1 ? Rank.ACE : r
      return heroRanks.has(actual)
    })
    if (!usesHeroCard) continue

    const gap = missing[0]
    // OESD: the missing card is at either end
    if (gap === window[0] || gap === window[4]) {
      oesdCount++
    } else {
      gutshotCount++
    }
  }

  const oesd = oesdCount >= 2 // open on both ends = 2 windows match
  const doubleGutshot = gutshotCount >= 2
  const gutshot = gutshotCount >= 1 && !oesd

  let outs = 0
  if (oesd) outs = 8
  else if (doubleGutshot) outs = 8
  else if (gutshot) outs = 4

  return { oesd, gutshot, doubleGutshot, outs, madeStraight: false }
}

export function analyzeDraws(
  heroInput: Array<Card | string>,
  boardInput: Array<Card | string>,
): DrawAnalysis {
  const heroCards = toCards(heroInput)
  const boardCards = toCards(boardInput)

  if (heroCards.length < 1 || heroCards.length > 2) {
    throw new Error(`analyzeDraws expects 1-2 hero cards, got ${heroCards.length}`)
  }
  if (boardCards.length < 3 || boardCards.length > 5) {
    throw new Error(`analyzeDraws expects 3-5 board cards, got ${boardCards.length}`)
  }

  const flush = countFlushDraw(heroCards, boardCards)
  const straight = findStraightDraws(heroCards, boardCards)

  let comboDrawCount = 0
  if (flush.flushDraw) comboDrawCount++
  if (straight.oesd || straight.gutshot || straight.doubleGutshot) comboDrawCount++

  // Dedupe outs: if both flush and straight draws, some outs may overlap
  let totalOuts = flush.flushDrawOuts + straight.outs
  if (flush.flushDraw && (straight.oesd || straight.gutshot || straight.doubleGutshot)) {
    // Roughly 1-2 overlap cards (suited connectors on a two-tone connected board)
    totalOuts = Math.max(totalOuts - 2, flush.flushDrawOuts, straight.outs)
  }

  // Overcards: hero cards higher than the board's highest
  const boardHigh = Math.max(...boardCards.map((c) => c.rank))
  const overcardCount = heroCards.filter((c) => c.rank > boardHigh).length

  return {
    flushDraw: flush.flushDraw,
    flushDrawSuit: flush.flushDrawSuit,
    flushDrawOuts: flush.flushDrawOuts,
    madeFlush: flush.madeFlush,
    openEndedStraightDraw: straight.oesd,
    gutshot: straight.gutshot,
    doubleGutshot: straight.doubleGutshot,
    straightDrawOuts: straight.outs,
    madeStraight: straight.madeStraight,
    comboDrawCount,
    totalOuts,
    overcardCount,
  }
}
