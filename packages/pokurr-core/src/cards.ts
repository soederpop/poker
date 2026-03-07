export enum Suit {
  CLUBS = "c",
  DIAMONDS = "d",
  HEARTS = "h",
  SPADES = "s",
}

export enum Rank {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14,
}

export type Card = {
  suit: Suit
  rank: Rank
}

export const SUITS: Suit[] = [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES]
export const RANKS: Rank[] = [
  Rank.TWO,
  Rank.THREE,
  Rank.FOUR,
  Rank.FIVE,
  Rank.SIX,
  Rank.SEVEN,
  Rank.EIGHT,
  Rank.NINE,
  Rank.TEN,
  Rank.JACK,
  Rank.QUEEN,
  Rank.KING,
  Rank.ACE,
]

const RANK_TO_SYMBOL: Record<number, string> = {
  [Rank.TWO]: "2",
  [Rank.THREE]: "3",
  [Rank.FOUR]: "4",
  [Rank.FIVE]: "5",
  [Rank.SIX]: "6",
  [Rank.SEVEN]: "7",
  [Rank.EIGHT]: "8",
  [Rank.NINE]: "9",
  [Rank.TEN]: "T",
  [Rank.JACK]: "J",
  [Rank.QUEEN]: "Q",
  [Rank.KING]: "K",
  [Rank.ACE]: "A",
}

const SYMBOL_TO_RANK: Record<string, Rank> = {
  "2": Rank.TWO,
  "3": Rank.THREE,
  "4": Rank.FOUR,
  "5": Rank.FIVE,
  "6": Rank.SIX,
  "7": Rank.SEVEN,
  "8": Rank.EIGHT,
  "9": Rank.NINE,
  "10": Rank.TEN,
  T: Rank.TEN,
  t: Rank.TEN,
  J: Rank.JACK,
  j: Rank.JACK,
  Q: Rank.QUEEN,
  q: Rank.QUEEN,
  K: Rank.KING,
  k: Rank.KING,
  A: Rank.ACE,
  a: Rank.ACE,
}

const SYMBOL_TO_SUIT: Record<string, Suit> = {
  c: Suit.CLUBS,
  C: Suit.CLUBS,
  clubs: Suit.CLUBS,
  d: Suit.DIAMONDS,
  D: Suit.DIAMONDS,
  diamonds: Suit.DIAMONDS,
  h: Suit.HEARTS,
  H: Suit.HEARTS,
  hearts: Suit.HEARTS,
  s: Suit.SPADES,
  S: Suit.SPADES,
  spades: Suit.SPADES,
}

export const ALIASES: Record<string, Rank | Suit> = {
  ...SYMBOL_TO_RANK,
  ...SYMBOL_TO_SUIT,
}

export const SYMBOLS: Record<number | Suit, string> = {
  [Rank.TWO]: "2",
  [Rank.THREE]: "3",
  [Rank.FOUR]: "4",
  [Rank.FIVE]: "5",
  [Rank.SIX]: "6",
  [Rank.SEVEN]: "7",
  [Rank.EIGHT]: "8",
  [Rank.NINE]: "9",
  [Rank.TEN]: "T",
  [Rank.JACK]: "J",
  [Rank.QUEEN]: "Q",
  [Rank.KING]: "K",
  [Rank.ACE]: "A",
  [Suit.CLUBS]: "c",
  [Suit.DIAMONDS]: "d",
  [Suit.HEARTS]: "h",
  [Suit.SPADES]: "s",
}

export function cardToString({ suit, rank }: Card): string {
  return `${SYMBOLS[rank]}${SYMBOLS[suit]}`
}

export function stringToCard(value: string): Card {
  const text = String(value).trim()
  const suitSymbol = text.slice(-1)
  const rankSymbol = text.slice(0, -1)
  const suit = SYMBOL_TO_SUIT[suitSymbol]
  const rank = SYMBOL_TO_RANK[rankSymbol]

  if (!suit || !rank) {
    throw new Error(`Invalid card string: ${value}`)
  }

  return { suit, rank }
}

export function createStandardDeck(): Card[] {
  return RANKS.flatMap((rank) => SUITS.map((suit) => ({ suit, rank })))
}

export class Deck {
  private readonly initial: Card[]

  cards: Card[]

  constructor() {
    this.initial = createStandardDeck()
    this.cards = [...this.initial]
  }

  get count(): number {
    return this.cards.length
  }

  shuffle(): this {
    for (let i = this.cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
    return this
  }

  draw(): Card {
    const card = this.cards.pop()
    if (!card) {
      throw new Error("Not enough cards")
    }
    return card
  }

  draw_n(count: number): Card[] {
    if (count < 0) {
      throw new Error("draw_n count must be >= 0")
    }

    if (this.cards.length < count) {
      throw new Error("Not enough cards")
    }

    const cards: Card[] = []
    for (let i = 0; i < count; i += 1) {
      cards.push(this.draw())
    }
    return cards
  }

  reset(): this {
    this.cards = [...this.initial]
    return this
  }
}

export enum HandCategory {
  HIGH_CARD = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
}

export type HandRank = {
  category: HandCategory
  label: string
  value: number[]
  cards: Card[]
}

const HAND_LABELS: Record<HandCategory, string> = {
  [HandCategory.HIGH_CARD]: "high-card",
  [HandCategory.ONE_PAIR]: "one-pair",
  [HandCategory.TWO_PAIR]: "two-pair",
  [HandCategory.THREE_OF_A_KIND]: "three-of-a-kind",
  [HandCategory.STRAIGHT]: "straight",
  [HandCategory.FLUSH]: "flush",
  [HandCategory.FULL_HOUSE]: "full-house",
  [HandCategory.FOUR_OF_A_KIND]: "four-of-a-kind",
  [HandCategory.STRAIGHT_FLUSH]: "straight-flush",
}

function compareValues(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (av !== bv) {
      return av > bv ? 1 : -1
    }
  }
  return 0
}

function findStraightHighCard(ranks: number[]): number | undefined {
  const uniques = [...new Set(ranks)].sort((a, b) => b - a)
  if (uniques.length < 5) {
    return undefined
  }

  // Wheel support (A-2-3-4-5)
  if (
    uniques.includes(Rank.ACE) &&
    uniques.includes(Rank.FIVE) &&
    uniques.includes(Rank.FOUR) &&
    uniques.includes(Rank.THREE) &&
    uniques.includes(Rank.TWO)
  ) {
    return Rank.FIVE
  }

  for (let i = 0; i <= uniques.length - 5; i += 1) {
    const window = uniques.slice(i, i + 5)
    if (window[0] - window[4] === 4) {
      return window[0]
    }
  }

  return undefined
}

function evaluateFive(cards: Card[]): HandRank {
  const ranks = cards.map((c) => c.rank)
  const suits = cards.map((c) => c.suit)
  const isFlush = suits.every((s) => s === suits[0])
  const straightHigh = findStraightHighCard(ranks)

  const counts = new Map<number, number>()
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1)
  }

  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1]
    }
    return b[0] - a[0]
  })

  if (isFlush && straightHigh) {
    return {
      category: HandCategory.STRAIGHT_FLUSH,
      label: HAND_LABELS[HandCategory.STRAIGHT_FLUSH],
      value: [HandCategory.STRAIGHT_FLUSH, straightHigh],
      cards,
    }
  }

  if (groups[0][1] === 4) {
    return {
      category: HandCategory.FOUR_OF_A_KIND,
      label: HAND_LABELS[HandCategory.FOUR_OF_A_KIND],
      value: [HandCategory.FOUR_OF_A_KIND, groups[0][0], groups[1][0]],
      cards,
    }
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return {
      category: HandCategory.FULL_HOUSE,
      label: HAND_LABELS[HandCategory.FULL_HOUSE],
      value: [HandCategory.FULL_HOUSE, groups[0][0], groups[1][0]],
      cards,
    }
  }

  if (isFlush) {
    return {
      category: HandCategory.FLUSH,
      label: HAND_LABELS[HandCategory.FLUSH],
      value: [HandCategory.FLUSH, ...ranks.sort((a, b) => b - a)],
      cards,
    }
  }

  if (straightHigh) {
    return {
      category: HandCategory.STRAIGHT,
      label: HAND_LABELS[HandCategory.STRAIGHT],
      value: [HandCategory.STRAIGHT, straightHigh],
      cards,
    }
  }

  if (groups[0][1] === 3) {
    const kickers = groups.slice(1).map((group) => group[0]).sort((a, b) => b - a)
    return {
      category: HandCategory.THREE_OF_A_KIND,
      label: HAND_LABELS[HandCategory.THREE_OF_A_KIND],
      value: [HandCategory.THREE_OF_A_KIND, groups[0][0], ...kickers],
      cards,
    }
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const highPair = Math.max(groups[0][0], groups[1][0])
    const lowPair = Math.min(groups[0][0], groups[1][0])
    const kicker = groups[2][0]
    return {
      category: HandCategory.TWO_PAIR,
      label: HAND_LABELS[HandCategory.TWO_PAIR],
      value: [HandCategory.TWO_PAIR, highPair, lowPair, kicker],
      cards,
    }
  }

  if (groups[0][1] === 2) {
    const pair = groups[0][0]
    const kickers = groups.slice(1).map((group) => group[0]).sort((a, b) => b - a)
    return {
      category: HandCategory.ONE_PAIR,
      label: HAND_LABELS[HandCategory.ONE_PAIR],
      value: [HandCategory.ONE_PAIR, pair, ...kickers],
      cards,
    }
  }

  return {
    category: HandCategory.HIGH_CARD,
    label: HAND_LABELS[HandCategory.HIGH_CARD],
    value: [HandCategory.HIGH_CARD, ...ranks.sort((a, b) => b - a)],
    cards,
  }
}

function combinations<T>(items: T[], size: number): T[][] {
  const out: T[][] = []

  function visit(start: number, current: T[]): void {
    if (current.length === size) {
      out.push([...current])
      return
    }

    for (let i = start; i < items.length; i += 1) {
      current.push(items[i])
      visit(i + 1, current)
      current.pop()
    }
  }

  visit(0, [])
  return out
}

export function evaluateHand(input: Array<Card | string>): HandRank {
  const cards = input.map((card) => (typeof card === "string" ? stringToCard(card) : card))
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`evaluateHand expects 5 to 7 cards, got ${cards.length}`)
  }

  const everyFive = combinations(cards, 5)
  let best = evaluateFive(everyFive[0])

  for (let i = 1; i < everyFive.length; i += 1) {
    const candidate = evaluateFive(everyFive[i])
    if (compareValues(candidate.value, best.value) > 0) {
      best = candidate
    }
  }

  return best
}

export function compareHands(a: HandRank, b: HandRank): number {
  return compareValues(a.value, b.value)
}

export function comboToString(cards: [Card, Card]): string {
  const sorted = [...cards].sort((a, b) => {
    if (b.rank !== a.rank) {
      return b.rank - a.rank
    }
    return a.suit.localeCompare(b.suit)
  }) as [Card, Card]

  return `${cardToString(sorted[0])}${cardToString(sorted[1])}`
}

export function normalizeCombo(cards: [Card, Card]): string {
  const [c1, c2] = [...cards].sort((a, b) => b.rank - a.rank) as [Card, Card]
  const top = RANK_TO_SYMBOL[c1.rank]
  const bottom = RANK_TO_SYMBOL[c2.rank]

  if (c1.rank === c2.rank) {
    return `${top}${top}`
  }

  return `${top}${bottom}${c1.suit === c2.suit ? "s" : "o"}`
}
