import HAND_STRENGTHS from "../data/hand-strength.json"
import FLOPS from "../data/flops.json"
import {
  ALIASES,
  type Card,
  cardToString,
  createStandardDeck,
  normalizeCombo,
  stringToCard,
} from "./cards"

export type ComboFilter = {
  item?: string
  rank?: number
  kicker?: number
  pair?: boolean
  suited?: boolean
  offsuit?: boolean
  connected?: boolean
  oneGap?: boolean
  twoGap?: boolean
  threeGap?: boolean
  greater?: boolean
  weaker?: boolean
  modifier?: string
  ranged?: boolean
  top?: ComboFilter
  bottom?: ComboFilter
}

export type StartingHandCombination = {
  cards: [Card, Card]
  name: string
  normalized: string
  rank: number
  kicker: number
  pair: boolean
  suited: boolean
  offsuit: boolean
  connected: boolean
  oneGap: boolean
  twoGap: boolean
  threeGap: boolean
  gap: number
  showdown: number
  strengthVsOpponents: number[]
  vsOnePlayer: number
}

export const SKLANSKY_RANGES: Record<string, string> = {
  "1": "AA,KK,QQ,JJ,AKs",
  "2": "TT,AQs,AJs,KQs,AKo",
  "3": "99,JTs,QJs,ATs,AQo",
  "4": "T9s,KQo,88,QTs,98s,J9s,AJo,KTs",
  "5": "77,87s,Q9s,T8s,KJo,QJo,JTo,76s,97s,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,65s",
  "6": "66,ATo,55,86s,KTo,QTo,54s,K9s,J8s,75s",
  "7": "44,J9o,64s,T9o,53s,33,98o,43s,22,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s",
  "8": "87,A9o,Q9o,76o,42s,32s,96s,85s,J8o,J7s,65o,54o,74s,K9o,T8o",
}

export const combosMap = new Map<string, StartingHandCombination>()
export const flopsMap = new Map<string, { name: string }>()
export const turnsMap = new Map<string, { name: string }>()
export const riversMap = new Map<string, { name: string }>()

const rankAlias: Record<string, number> = Object.entries(ALIASES).reduce<Record<string, number>>((memo, [key, value]) => {
  if (typeof value === "number") {
    memo[key] = value
  }
  return memo
}, {})

function cardsFromComboString(combo: string): [Card, Card] {
  const c1 = combo.slice(0, 2)
  const c2 = combo.slice(2, 4)
  return [stringToCard(c1), stringToCard(c2)]
}

function comboUsesDeadCard(comboName: string, deadCards: string[]): boolean {
  return deadCards.some((dead) => comboName.includes(dead))
}

function comboOverlap(left: StartingHandCombination, right: StartingHandCombination): boolean {
  return left.cards.some((card) => right.cards.some((other) => cardToString(card) === cardToString(other)))
}

function uniqueByName(combos: StartingHandCombination[]): StartingHandCombination[] {
  const seen = new Set<string>()
  const out: StartingHandCombination[] = []
  for (const combo of combos) {
    if (seen.has(combo.name)) {
      continue
    }
    seen.add(combo.name)
    out.push(combo)
  }
  return out
}

function filterCombo(combo: StartingHandCombination, filters: ComboFilter): boolean {
  if (filters.ranged && filters.top && filters.bottom) {
    return filterCombo(combo, { ...filters.top, weaker: true }) && filterCombo(combo, { ...filters.bottom, greater: true })
  }

  const {
    item = "",
    pair = false,
    suited = false,
    greater = false,
    weaker = false,
    rank = 0,
    kicker = 0,
    offsuit = false,
  } = filters

  if (combo.normalized === item) {
    return true
  }

  if (suited && !combo.suited) {
    return false
  }

  if (offsuit && combo.suited) {
    return false
  }

  if (pair && !combo.pair) {
    return false
  }

  if (pair && greater && combo.pair && combo.rank < rank) {
    return false
  }

  if (pair && weaker && combo.pair && combo.rank > rank) {
    return false
  }

  if (pair && !greater && !weaker && combo.rank !== rank) {
    return false
  }

  if (!pair && greater) {
    if (combo.rank === kicker && combo.kicker < rank) {
      return false
    }

    if (combo.kicker < kicker) {
      return false
    }

    if (combo.rank !== rank && combo.kicker !== rank) {
      return false
    }

    return true
  }

  if (!pair && weaker) {
    if (combo.rank !== rank && combo.kicker !== rank) {
      return false
    }

    if (combo.rank === rank && combo.kicker > kicker) {
      return false
    }

    return true
  }

  if (!pair && !greater && !weaker) {
    return combo.rank === rank && combo.kicker === kicker
  }

  return true
}

function buildCombos(): void {
  if (combosMap.size > 0) {
    return
  }

  const deck = createStandardDeck().map((card) => ({ card, name: cardToString(card) }))

  for (let i = 0; i < deck.length; i += 1) {
    for (let j = i + 1; j < deck.length; j += 1) {
      const hand = [deck[i], deck[j]].sort((a, b) => {
        if (b.card.rank !== a.card.rank) {
          return b.card.rank - a.card.rank
        }

        return a.card.suit.localeCompare(b.card.suit)
      })

      const cards: [Card, Card] = [hand[0].card, hand[1].card]
      const name = `${hand[0].name}${hand[1].name}`
      const normalized = normalizeCombo(cards)

      const high = Math.max(cards[0].rank, cards[1].rank)
      const low = Math.min(cards[0].rank, cards[1].rank)
      const gap = Math.abs(cards[0].rank - cards[1].rank)

      const strengthVsOpponents = (HAND_STRENGTHS as Record<string, number[]>)[normalized] ?? [0, 0, 0, 0, 0, 0, 0, 0]
      const showdown = high * 100 + low

      const combo: StartingHandCombination = {
        cards,
        name,
        normalized,
        rank: high,
        kicker: low,
        pair: cards[0].rank === cards[1].rank,
        suited: cards[0].suit === cards[1].suit,
        offsuit: cards[0].suit !== cards[1].suit && cards[0].rank !== cards[1].rank,
        connected: gap === 1,
        oneGap: gap === 2,
        twoGap: gap === 3,
        threeGap: gap === 4,
        gap,
        showdown,
        strengthVsOpponents,
        vsOnePlayer: strengthVsOpponents[0] ?? 0,
      }

      combosMap.set(name, combo)
    }
  }
}

function buildFlops(): void {
  if (flopsMap.size > 0) {
    return
  }

  for (const flop of FLOPS) {
    flopsMap.set(flop, { name: flop })
  }
}

export function getCombo(combo: string): StartingHandCombination | undefined {
  buildCombos()

  const direct = combosMap.get(combo)
  if (direct) {
    return direct
  }

  if (combo.length === 4) {
    const reversed = `${combo.slice(2, 4)}${combo.slice(0, 2)}`
    return combosMap.get(reversed)
  }

  return undefined
}

export class Range {
  input: string

  deadCards: string[]

  numberOfOpponents: number

  private readonly excludedCombos = new Set<string>()

  private readonly includedCombos = new Set<string>()

  constructor(rangeInput = "", deadCards: string[] = [], numberOfOpponents = 6) {
    buildCombos()
    buildFlops()

    this.input = rangeInput
    this.deadCards = deadCards
    this.numberOfOpponents = numberOfOpponents
  }

  toJSON(): Record<string, unknown> {
    return {
      input: this.input,
      maxShowdown: this.maxShowdown,
      minShowdown: this.minShowdown,
      percentile: this.percentile,
      strength: this.strength,
      size: this.size,
      combos: this.combos,
    }
  }

  get size(): number {
    return this.combos.length
  }

  get comboNames(): string[] {
    return this.combos.map((combo) => combo.name)
  }

  get normalizedCombos(): Record<string, StartingHandCombination[]> {
    const grouped: Record<string, StartingHandCombination[]> = {}
    for (const combo of this.combos) {
      if (!grouped[combo.normalized]) {
        grouped[combo.normalized] = []
      }
      grouped[combo.normalized].push(combo)
    }
    return grouped
  }

  get normalizedComboNames(): string[] {
    return Object.keys(this.normalizedCombos)
  }

  get maxShowdown(): number {
    return Math.max(...this.combos.map((combo) => combo.showdown))
  }

  get minShowdown(): number {
    return Math.min(...this.combos.map((combo) => combo.showdown))
  }

  get percentile(): number {
    return (this.size / Range.combos.length) * 100
  }

  get strength(): number {
    const rankList = Range.strongestVsOpponents(this.numberOfOpponents)
    const names = rankList.map((row) => row[0])

    const values = this.normalizedComboNames
      .map((name) => names.indexOf(name))
      .filter((index) => index >= 0)
      .map((index) => 100 - Math.round((index / 169) * 100))

    if (values.length === 0) {
      return 0
    }

    const total = values.reduce((memo, value) => memo + value, 0)
    return total / values.length
  }

  get combos(): StartingHandCombination[] {
    const base = Range.filterCombos(this.input).filter((combo) => !comboUsesDeadCard(combo.name, this.deadCards))
    const additional = [...this.includedCombos]
      .map((name) => getCombo(name))
      .filter((combo): combo is StartingHandCombination => Boolean(combo))
      .filter((combo) => !comboUsesDeadCard(combo.name, this.deadCards))

    return uniqueByName([...base, ...additional]).filter((combo) => !this.excludedCombos.has(combo.name))
  }

  include(comboOrRange: string): this {
    const combo = getCombo(comboOrRange)
    if (combo) {
      this.excludedCombos.delete(combo.name)
      this.includedCombos.add(combo.name)
      return this
    }

    for (const item of Range.fromString(comboOrRange)) {
      this.excludedCombos.delete(item.name)
      this.includedCombos.add(item.name)
    }

    return this
  }

  exclude(comboOrRange: string): this {
    const combo = getCombo(comboOrRange)
    if (combo) {
      this.includedCombos.delete(combo.name)
      this.excludedCombos.add(combo.name)
      return this
    }

    for (const item of Range.fromString(comboOrRange)) {
      this.includedCombos.delete(item.name)
      this.excludedCombos.add(item.name)
    }

    return this
  }

  includes(hand: string): boolean {
    const combo = getCombo(hand)
    if (combo) {
      return this.comboNames.includes(combo.name)
    }

    return this.normalizedComboNames.includes(hand)
  }

  async compare(anotherRange: Range): Promise<{ ours: number; theirs: number; tie: number; us: string; them: string }> {
    const { rangeEquity } = await import("./equity-engine")
    return rangeEquity(this, anotherRange)
  }

  normalizedCombosExcluding(deadCards: string[] = []): Record<string, string[]> {
    const grouped: Record<string, string[]> = {}

    for (const combo of this.combos) {
      if (comboUsesDeadCard(combo.name, deadCards)) {
        continue
      }

      if (!grouped[combo.normalized]) {
        grouped[combo.normalized] = []
      }

      grouped[combo.normalized].push(combo.name)
    }

    return grouped
  }

  generateMatchups(anotherRange: Range): Array<[StartingHandCombination, StartingHandCombination]> {
    const matchups: Array<[StartingHandCombination, StartingHandCombination]> = []

    for (const left of this.combos) {
      for (const right of anotherRange.combos) {
        if (!comboOverlap(left, right)) {
          matchups.push([left, right])
        }
      }
    }

    return matchups
  }

  static get cards(): Card[] {
    return createStandardDeck()
  }

  static get combos(): StartingHandCombination[] {
    buildCombos()
    return [...combosMap.values()].sort((a, b) => a.showdown - b.showdown)
  }

  static get comboNames(): string[] {
    return this.combos.map((combo) => combo.name)
  }

  static get flops(): Array<{ name: string }> {
    buildFlops()
    return [...flopsMap.values()]
  }

  static get turns(): Array<{ name: string }> {
    return [...turnsMap.values()]
  }

  static get rivers(): Array<{ name: string }> {
    return [...riversMap.values()]
  }

  static strongestHands(percent: number, numberOfOpponents = 8): string[] {
    const limit = Math.floor(169 * (percent / 100))
    return this.strongestVsOpponents(numberOfOpponents).slice(0, limit).map((row) => row[0])
  }

  static strongestVsOpponents(numberOfOpponents: number): Array<[string, number]> {
    const index = Math.max(0, Math.min(7, numberOfOpponents - 1))

    const grouped = new Map<string, number>()
    for (const combo of this.combos) {
      if (!grouped.has(combo.normalized)) {
        grouped.set(combo.normalized, combo.strengthVsOpponents[index] ?? 0)
      }
    }

    return [...grouped.entries()].sort((a, b) => b[1] - a[1])
  }

  static filterCombos(filters: string | ComboFilter[] | ComboFilter | ((combo: StartingHandCombination) => boolean)): StartingHandCombination[] {
    if (typeof filters === "function") {
      return this.combos.filter(filters)
    }

    if (typeof filters === "string") {
      return this.filterCombos(this.parseRange(filters))
    }

    if (Array.isArray(filters)) {
      return uniqueByName(filters.flatMap((filter) => this.filterCombos(filter)))
    }

    return this.combos.filter((combo) => filterCombo(combo, filters))
  }

  static fromString(input = ""): StartingHandCombination[] {
    return this.filterCombos(this.parseRange(input))
  }

  static enforceRankOrder(str: string): {
    rankOne: string
    rankTwo: string
    rankValues: [number, number]
    modifier: string
  } {
    const parts = str.split("")
    const [rankOne, rankTwo, ...modifiers] = parts
    const modifier = modifiers.join("")
    const rankValues = [rankAlias[rankOne] ?? 0, rankAlias[rankTwo] ?? 0].sort((a, b) => b - a) as [number, number]
    return { rankOne, rankTwo, rankValues, modifier }
  }

  static expandHand(str: string): ComboFilter {
    const { rankOne, rankTwo, rankValues, modifier } = this.enforceRankOrder(str)

    const [high, low] = rankValues

    return {
      item: str,
      pair: rankOne === rankTwo,
      modifier,
      connected: high === 14 ? low === 2 || low === 13 : high - low === 1,
      oneGap: high === 14 ? low === 3 || low === 12 : high - low === 2,
      twoGap: high === 14 ? low === 4 || low === 11 : high - low === 3,
      threeGap: high === 14 ? low === 5 || low === 10 : high - low === 4,
      suited: modifier.toLowerCase().startsWith("s"),
      offsuit: modifier.toLowerCase().startsWith("o"),
      greater: modifier.toLowerCase().endsWith("+"),
      weaker: modifier.toLowerCase().endsWith("-"),
      rank: high,
      kicker: low,
    }
  }

  static parseRange(input = ""): ComboFilter[] {
    const items = String(input)
      .trim()
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)

    return items.map((item) => {
      if (item.includes("-")) {
        let [left, right] = item.split("-").map((x) => this.expandHand(x.trim()))

        const ordered = [left, right].sort((a, b) => {
          const aRank = a.rank ?? 0
          const bRank = b.rank ?? 0
          if (bRank !== aRank) {
            return bRank - aRank
          }

          const aKicker = a.kicker ?? 0
          const bKicker = b.kicker ?? 0
          return bKicker - aKicker
        })

        left = ordered[0] ?? left
        right = ordered[1] ?? right

        if (left.rank === right.rank && !left.pair && !right.pair) {
          left = { ...left, weaker: true, connected: false, oneGap: false, twoGap: false, threeGap: false }
          right = { ...right, greater: true, connected: false, oneGap: false, twoGap: false, threeGap: false }
        }

        return { ranged: true, top: left, bottom: right }
      }

      return this.expandHand(item)
    })
  }

  static sklansky(groupNumber: number, deadCards: string[] = []): Range {
    return new Range(SKLANSKY_RANGES[String(groupNumber)] ?? "", deadCards)
  }

  static ultraStrong(deadCards: string[] = []): Range {
    return this.sklansky(1, deadCards)
  }

  static strong(deadCards: string[] = []): Range {
    return new Range(`${this.sklansky(1, deadCards).input},${this.sklansky(2, deadCards).input}`, deadCards)
  }

  static medium(deadCards: string[] = []): Range {
    return new Range(
      `${this.sklansky(1, deadCards).input},${this.sklansky(2, deadCards).input},${this.sklansky(3, deadCards).input},${this.sklansky(4, deadCards).input},${this.sklansky(5, deadCards).input}`,
      deadCards,
    )
  }

  static loose(deadCards: string[] = []): Range {
    return new Range(
      `${this.sklansky(1, deadCards).input},${this.sklansky(2, deadCards).input},${this.sklansky(3, deadCards).input},${this.sklansky(4, deadCards).input},${this.sklansky(5, deadCards).input},${this.sklansky(6, deadCards).input},${this.sklansky(7, deadCards).input}`,
      deadCards,
    )
  }
}

export function groups(): Record<string, string[]> {
  const combos = Range.combos

  const pocketPairs = [...new Set(combos.filter((combo) => combo.pair).map((combo) => combo.normalized))]
  const offsuitKingsAndAces = [...new Set(combos.filter((combo) => combo.offsuit && combo.rank >= 13).map((combo) => combo.normalized))]
  const broadwayHands = [...new Set(combos.filter((combo) => combo.offsuit && combo.rank >= 10 && combo.kicker >= 10).map((combo) => combo.normalized))]
  const suitedBroadwayHands = [...new Set(combos.filter((combo) => combo.suited && combo.rank >= 10 && combo.kicker >= 10).map((combo) => combo.normalized))]
  const connectors = [...new Set(combos.filter((combo) => combo.offsuit && combo.connected).map((combo) => combo.normalized))]
  const suitedConnectors = [...new Set(combos.filter((combo) => combo.suited && combo.connected).map((combo) => combo.normalized))]
  const suitedOneGappers = [...new Set(combos.filter((combo) => combo.suited && combo.oneGap).map((combo) => combo.normalized))]
  const suitedAces = [...new Set(combos.filter((combo) => combo.suited && combo.rank === 14).map((combo) => combo.normalized))]

  return {
    pocketPairs,
    offsuitKingsAndAces,
    broadwayHands,
    suitedBroadwayHands,
    connectors,
    suitedConnectors,
    suitedOneGappers,
    suitedAces,
  }
}

export function generateCombos(count: number, deadCards: string[] = []): string[][] {
  const cards = Range.cards.map((card) => cardToString(card))
  const result: string[][] = []

  function build(start: number, selected: string[]): void {
    if (selected.length === count) {
      if (!selected.some((card) => deadCards.includes(card))) {
        result.push([...selected])
      }
      return
    }

    for (let i = start; i < cards.length; i += 1) {
      selected.push(cards[i])
      build(i + 1, selected)
      selected.pop()
    }
  }

  build(0, [])
  return result
}
