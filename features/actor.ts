import { Range, normalizeCombo, stringToCard } from "@pokurr/core"

import type { GameEngine } from "./game-engine"
import type { PokerAction, PokerPosition, Strategy } from "./strategy"

export type ActorDecision = {
  action: PokerAction
  amount?: number
  reasoning?: string
}

export type ActorContext = {
  chips: number
  holding: [string, string] | []
  combo: string
  position: PokerPosition
  toGo: number
  potOdds: number
  playersLeftInHand: number
  board: string[]
  stage: string
  actionHistory: Array<{ playerId: string; action: string; amount?: number; street: string }>
}

export type ActorStrategyHooks = {
  makeDecision?: (options: { legalActions: PokerAction[] }, context: ActorContext) => Promise<ActorDecision> | ActorDecision
  defineRanges?: () => Record<string, string>
  findRange?: (name: string, context: ActorContext) => string | undefined
}

export class Actor {
  readonly game: GameEngine
  readonly strategy: Strategy
  readonly playerId: string
  readonly hooks?: ActorStrategyHooks

  constructor(options: {
    game: GameEngine
    strategy: Strategy
    playerId: string
    hooks?: ActorStrategyHooks
  }) {
    this.game = options.game
    this.strategy = options.strategy
    this.playerId = options.playerId
    this.hooks = options.hooks
  }

  get player() {
    const player = this.game.game.players.find((candidate) => candidate.id === this.playerId)
    if (!player) {
      throw new Error(`Actor player not found in game: ${this.playerId}`)
    }
    return player
  }

  get chips(): number {
    return this.player.stack
  }

  get holding(): [string, string] | [] {
    return this.player.holeCards
  }

  get combo(): string {
    if (this.player.holeCards.length !== 2) {
      return ""
    }

    return normalizeCombo([
      stringToCard(this.player.holeCards[0]),
      stringToCard(this.player.holeCards[1]),
    ])
  }

  get position(): PokerPosition {
    return seatPosition(this.game, this.playerId)
  }

  get toGo(): number {
    return Math.max(this.game.game.currentBet - this.player.committed, 0)
  }

  get potOdds(): number {
    if (this.toGo <= 0) {
      return 0
    }

    return this.toGo / Math.max(this.game.game.pot + this.toGo, 1)
  }

  get playersLeftInHand(): number {
    return this.game.game.players.filter((candidate) => candidate.inHand && !candidate.folded).length
  }

  handInRange(range: string): boolean {
    if (!this.combo) {
      return false
    }

    return new Range(range).includes(this.combo)
  }

  handInOpeningRange(profileName: string): boolean {
    const defaultRange = this.strategy.rangeForProfile(profileName, this.position)
    const hookRange = this.hooks?.findRange?.("open", this.context())
    const range = hookRange || defaultRange
    return range ? this.handInRange(range) : false
  }

  handInCallingRange(profileName: string): boolean {
    const defaultRange = this.strategy.rangeForProfile(profileName, this.position)
    const hookRange = this.hooks?.findRange?.("call", this.context())
    const range = hookRange || defaultRange
    return range ? this.handInRange(range) : false
  }

  context(): ActorContext {
    const game = this.game.game

    return {
      chips: this.chips,
      holding: this.holding,
      combo: this.combo,
      position: this.position,
      toGo: this.toGo,
      potOdds: this.potOdds,
      playersLeftInHand: this.playersLeftInHand,
      board: game.board,
      stage: game.stage,
      actionHistory: game.actionHistory.map((action) => ({
        playerId: action.playerId,
        action: action.action,
        ...(action.amount !== undefined ? { amount: action.amount } : {}),
        street: action.street,
      })),
    }
  }

  async act(options: {
    profileName: string
    legalActions?: PokerAction[]
    villainCards?: [string, string]
    villainRange?: string
    inPosition?: boolean
  }): Promise<ActorDecision> {
    const ctx = this.context()
    const legalActions = options.legalActions || (this.toGo > 0 ? ["fold", "call", "raise", "all-in"] : ["check", "bet", "all-in"])

    let decision: ActorDecision | undefined

    if (this.hooks?.makeDecision) {
      decision = await this.hooks.makeDecision({ legalActions }, ctx)
    }

    if (!decision) {
      const result = await this.strategy.decide(
        options.profileName,
        {
          heroCards: this.holding.length === 2 ? this.holding : ["Ah", "As"],
          ...(options.villainCards ? { villainCards: options.villainCards } : {}),
          ...(options.villainRange ? { villainRange: options.villainRange } : {}),
          board: this.game.game.board,
          street: this.game.game.stage === "waiting" || this.game.game.stage === "complete" ? "preflop" : this.game.game.stage,
          position: this.position,
          inPosition: options.inPosition ?? ["BTN", "CO"].includes(this.position),
          checkedTo: this.toGo <= 0,
          potSize: this.game.game.pot,
          toCall: this.toGo,
          effectiveStack: this.chips,
          playersInHand: this.playersLeftInHand,
          playersLeftToAct: this.game.game.players.filter((player) => player.inHand && !player.folded && !player.allIn).length,
          facingBet: this.toGo > 0,
          facingRaise: this.toGo > 0,
          facingThreeBet: false,
        },
      )

      decision = {
        action: result.action,
        ...(result.amount !== undefined ? { amount: result.amount } : {}),
        ...(result.reasoning ? { reasoning: result.reasoning } : {}),
      }
    }

    if (!legalActions.includes(decision.action)) {
      decision = this.toGo > 0 ? { action: "fold" } : { action: "check" }
    }

    this.game.recordAction(this.playerId, decision.action, decision.amount)
    return decision
  }
}

export function seatPosition(game: GameEngine, playerId: string): PokerPosition {
  const seats = [...game.game.players].sort((a, b) => a.seat - b.seat)
  const dealerSeat = game.game.dealer
  const dealerIdx = seats.findIndex((player) => player.seat === dealerSeat)
  const target = seats.find((player) => player.id === playerId)

  if (!target || dealerIdx < 0) {
    return "BTN"
  }

  const rotated = [...seats.slice(dealerIdx), ...seats.slice(0, dealerIdx)]
  const count = rotated.length

  if (count === 2) {
    return rotated[0]?.id === playerId ? "BTN" : "BB"
  }

  const labels: PokerPosition[] = ["BTN", "SB", "BB"]
  const remaining = count - labels.length

  for (let i = 0; i < remaining; i += 1) {
    if (i === 0) {
      labels.push("UTG")
    } else if (i === remaining - 1) {
      labels.push("CO")
    } else {
      labels.push("MP")
    }
  }

  const idx = rotated.findIndex((player) => player.id === playerId)
  return labels[idx] || "MP"
}
