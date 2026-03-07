import { CardGroup, OddsCalculator } from "poker-tools"
import FLOPS from "../data/flops.json"
import { Range, type StartingHandCombination } from "./range"

export type PokerToolsEquity = {
  bestHandCount: number
  tieHandCount: number
  possibleHandsCount: number
  winPercentage?: number
  tiePercentage?: number
}

type MatchupResult = {
  matchup: [StartingHandCombination, StartingHandCombination]
  equities: PokerToolsEquity[]
}

export class HandEquity {
  hand: string

  players: number

  constructor(hand: string, options: { players?: number } = {}) {
    this.hand = hand
    this.players = options.players ?? 6
  }

  get combo(): StartingHandCombination {
    const combo = Range.combos.find((candidate) => candidate.name === this.hand || candidate.normalized === this.hand)
    if (!combo) {
      throw new Error(`Unknown hand: ${this.hand}`)
    }

    return combo
  }

  get averageWinPercent(): number {
    return this.combo.strengthVsOpponents[this.players - 1] ?? 0
  }

  get possibleFlops(): string[] {
    const first = this.combo.name.slice(0, 2)
    const second = this.combo.name.slice(2, 4)
    return FLOPS.filter((flop) => !flop.includes(first) && !flop.includes(second))
  }
}

export class RangeEquity {
  ranges: [Range, Range]

  board: string

  iterations: number

  constructor(ranges: [Range | string, Range | string], options: { board?: string; iterations?: number } = {}) {
    this.ranges = [
      typeof ranges[0] === "string" ? new Range(ranges[0]) : ranges[0],
      typeof ranges[1] === "string" ? new Range(ranges[1]) : ranges[1],
    ]
    this.board = options.board ?? ""
    this.iterations = options.iterations ?? 10_000
  }

  get matchups(): Array<[StartingHandCombination, StartingHandCombination]> {
    const [leftRange, rightRange] = this.ranges
    const matchups: Array<[StartingHandCombination, StartingHandCombination]> = []

    for (const left of leftRange.combos) {
      for (const right of rightRange.combos) {
        const overlap = left.cards.some((card) => right.cards.some((other) => card.rank === other.rank && card.suit === other.suit))
        if (!overlap) {
          matchups.push([left, right])
        }
      }
    }

    return matchups
  }

  async calculate(): Promise<MatchupResult[]> {
    const boardGroup = this.board ? CardGroup.fromString(this.board) : undefined
    const out: MatchupResult[] = []

    for (const matchup of this.matchups) {
      const groups = matchup.map((combo) => CardGroup.fromString(combo.name))
      const result = boardGroup
        ? OddsCalculator.calculateEquity(groups, boardGroup, this.iterations)
        : OddsCalculator.calculateEquity(groups, undefined, this.iterations)

      out.push({ matchup, equities: result.equities as PokerToolsEquity[] })
    }

    return out
  }
}

export async function compareRanges(
  ours: Range,
  theirs: Range,
  options: { board?: string; iterations?: number; full?: boolean } = {},
): Promise<{ us: string; them: string; ours: number; theirs: number; tie: number; numbers?: number[][][] }> {
  const rangeEquity = new RangeEquity([ours, theirs], options)
  const results = await rangeEquity.calculate()

  if (results.length === 0) {
    return {
      us: ours.input,
      them: theirs.input,
      ours: 0,
      theirs: 0,
      tie: 0,
      ...(options.full ? { numbers: [] } : {}),
    }
  }

  const numbers = results.map(({ equities }) => {
    const p1 = equities[0]
    const p2 = equities[1]
    const d1 = p1.possibleHandsCount || 1
    const d2 = p2.possibleHandsCount || 1

    const p1Win = Number((((p1.bestHandCount || 0) / d1) * 100).toFixed(2))
    const p2Win = Number((((p2.bestHandCount || 0) / d2) * 100).toFixed(2))
    const tie = Number((((p1.tieHandCount || 0) / d1) * 100).toFixed(2))

    return [
      [p1Win, tie],
      [p2Win, tie],
    ]
  })

  const ourWins = numbers.reduce((memo, pair) => memo + pair[0][0], 0) / numbers.length
  const theirWins = numbers.reduce((memo, pair) => memo + pair[1][0], 0) / numbers.length
  const ties = numbers.reduce((memo, pair) => memo + pair[0][1], 0) / numbers.length

  return {
    us: ours.input,
    them: theirs.input,
    ours: Number(ourWins.toFixed(2)),
    theirs: Number(theirWins.toFixed(2)),
    tie: Number(ties.toFixed(2)),
    ...(options.full ? { numbers } : {}),
  }
}

export function equity(hands: string[][], board: string[] = [], iterations = 20_000): PokerToolsEquity[] {
  const groups = hands.map((hand) => CardGroup.fromString(hand.join("")))
  const boardGroup = board.length > 0 ? CardGroup.fromString(board.join("")) : undefined
  const result = boardGroup
    ? OddsCalculator.calculateEquity(groups, boardGroup, iterations)
    : OddsCalculator.calculateEquity(groups, undefined, iterations)

  return result.equities as PokerToolsEquity[]
}
