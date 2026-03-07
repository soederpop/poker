import { z } from "zod"
import { FeatureStateSchema, FeatureOptionsSchema } from "@soederpop/luca"
import { Feature, features } from "@soederpop/luca"
import { equityEngine } from "@pokurr/core"

import { buildDeckStrings } from "../lib/cards"
import { PRNG } from "../lib/prng"

export type EquityBackendPreference = "wasm"

export type GameStage = "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown" | "complete"

export type PlayerActionType =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "all-in"
  | "small-blind"
  | "big-blind"

export type GamePlayer = {
  id: string
  seat: number
  stack: number
  holeCards: [string, string] | []
  inHand: boolean
  folded: boolean
  allIn: boolean
  committed: number
  totalCommitted: number
  hasActed: boolean
}

export type GameAction = {
  seq: number
  playerId: string
  action: PlayerActionType
  amount?: number
  street: Exclude<GameStage, "waiting" | "complete">
  timestamp: number
}

export type SidePot = {
  amount: number
  eligible: string[]
}

export type HandWinner = {
  playerId: string
  amount: number
  hand?: string
}

export type GameState = {
  handId: string
  tableId?: string
  round: number
  stage: GameStage
  dealer: number
  pot: number
  board: string[]
  players: GamePlayer[]
  actionHistory: GameAction[]
  currentActor: string | null
  deck: string[]
  seed: number
  currentBet: number
  lastRaiseSize: number
  smallBlind: number
  bigBlind: number
  ante: number
  winners: HandWinner[]
  pots: SidePot[]
  startedAt: number
  completedAt?: number
}

export type HandHistory = {
  handId: string
  tableId?: string
  players: Array<{ id: string; seat: number; stack: number; cards?: [string, string] | [] }>
  blinds: { small: number; big: number; ante?: number }
  actions: Array<{ seq: number; playerId: string; action: string; amount?: number; street: string }>
  board: string[]
  pots: SidePot[]
  winners: Array<{ playerId: string; amount: number; hand?: string }>
  seed?: number
  timestamp: number
}

type SeatPlayerEvent = {
  type: "SeatPlayer"
  playerId: string
  seat: number
  stack: number
}

type RemovePlayerEvent = {
  type: "RemovePlayer"
  playerId: string
}

type PostBlindsEvent = {
  type: "PostBlinds"
  smallBlindPlayerId: string
  bigBlindPlayerId: string
}

type DealHoleCardsEvent = {
  type: "DealHoleCards"
  cards: Array<{ playerId: string; cards: [string, string] }>
  deck?: string[]
}

type DealBoardEvent = {
  type: "DealBoard"
  cards: string[]
  deck?: string[]
}

type PlayerActionEvent = {
  type: "PlayerAction"
  playerId: string
  action: Exclude<PlayerActionType, "small-blind" | "big-blind">
  amount?: number
}

type AdvanceStreetEvent = {
  type: "AdvanceStreet"
}

type AwardPotEvent = {
  type: "AwardPot"
  winners: HandWinner[]
  pots?: SidePot[]
}

type EndHandEvent = {
  type: "EndHand"
}

export type GameEvent =
  | SeatPlayerEvent
  | RemovePlayerEvent
  | PostBlindsEvent
  | DealHoleCardsEvent
  | DealBoardEvent
  | PlayerActionEvent
  | AdvanceStreetEvent
  | AwardPotEvent
  | EndHandEvent

declare module "@soederpop/luca" {
  interface AvailableFeatures {
    gameEngine: typeof GameEngine
  }
}

const STREET_ORDER: Exclude<GameStage, "waiting" | "complete">[] = [
  "preflop",
  "flop",
  "turn",
  "river",
  "showdown",
]

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState
}

function addAction(state: GameState, action: Omit<GameAction, "seq" | "timestamp">): GameState {
  const next = cloneState(state)
  const seq = next.actionHistory.length + 1
  next.actionHistory.push({ ...action, seq, timestamp: Date.now() })
  return next
}

function streetFromStage(stage: GameStage): Exclude<GameStage, "waiting" | "complete"> {
  if (stage === "waiting") return "preflop"
  if (stage === "complete") return "showdown"
  return stage
}

function stageAfter(stage: GameStage): GameStage {
  const idx = STREET_ORDER.indexOf(streetFromStage(stage))
  if (idx < 0 || idx + 1 >= STREET_ORDER.length) {
    return "showdown"
  }
  return STREET_ORDER[idx + 1] || "showdown"
}

export function sortedSeats(players: GamePlayer[]): GamePlayer[] {
  return [...players].sort((a, b) => a.seat - b.seat)
}

export function playersInHand(state: GameState): GamePlayer[] {
  return state.players.filter((player) => player.inHand && !player.folded)
}

export function activePlayers(state: GameState): GamePlayer[] {
  return playersInHand(state).filter((player) => !player.allIn)
}

export function toCallForPlayer(state: GameState, playerId: string): number {
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player) {
    throw new Error(`Unknown player: ${playerId}`)
  }
  return Math.max(state.currentBet - player.committed, 0)
}

export function isPotGood(state: GameState): boolean {
  const active = activePlayers(state)
  if (active.length === 0) {
    return true
  }

  return active.every((player) => player.committed === state.currentBet)
}

export function isActionClosed(state: GameState): boolean {
  const alive = playersInHand(state)
  if (alive.length <= 1) {
    return true
  }

  const active = activePlayers(state)
  if (active.length === 0) {
    return true
  }

  return isPotGood(state) && active.every((player) => player.hasActed)
}

export function nextActorId(state: GameState, afterSeat: number): string | null {
  const active = sortedSeats(activePlayers(state))

  if (active.length === 0) {
    return null
  }

  const higher = active.find((player) => player.seat > afterSeat)
  return (higher || active[0] || null)?.id || null
}

function compareRankValues(left: number[], right: number[]): number {
  const len = Math.max(left.length, right.length)

  for (let index = 0; index < len; index += 1) {
    const a = left[index] ?? 0
    const b = right[index] ?? 0
    if (a !== b) {
      return a - b
    }
  }

  return 0
}

function postBlind(state: GameState, playerId: string, amount: number, kind: "small-blind" | "big-blind"): GameState {
  const next = cloneState(state)
  const player = next.players.find((candidate) => candidate.id === playerId)

  if (!player) {
    throw new Error(`Cannot post blind for missing player: ${playerId}`)
  }

  const posted = Math.min(player.stack, amount)

  player.stack -= posted
  player.committed += posted
  player.totalCommitted += posted
  // Posting blinds does not satisfy an action for street closure.
  player.hasActed = false
  player.allIn = player.stack === 0

  next.pot += posted
  next.currentBet = Math.max(next.currentBet, player.committed)

  return addAction(next, {
    playerId,
    action: kind,
    amount: posted,
    street: streetFromStage(next.stage),
  })
}

export function buildSidePots(state: GameState): SidePot[] {
  const contributors = state.players.filter((player) => player.totalCommitted > 0)
  if (contributors.length === 0) {
    return []
  }

  const levels = [...new Set(contributors.map((player) => player.totalCommitted))]
    .filter((level) => level > 0)
    .sort((a, b) => a - b)

  const pots: SidePot[] = []
  let previous = 0

  for (const level of levels) {
    const participants = contributors.filter((player) => player.totalCommitted >= level)
    const amount = (level - previous) * participants.length

    if (amount <= 0) {
      previous = level
      continue
    }

    const eligible = participants
      .filter((player) => player.inHand && !player.folded)
      .map((player) => player.id)

    if (eligible.length === 0) {
      previous = level
      continue
    }

    pots.push({ amount, eligible })
    previous = level
  }

  return pots
}

export async function resolvePayouts(
  state: GameState,
  backend: EquityBackendPreference = "wasm",
): Promise<{ winners: HandWinner[]; pots: SidePot[] }> {
  const contenders = playersInHand(state)

  if (contenders.length === 0) {
    return { winners: [], pots: buildSidePots(state) }
  }

  if (contenders.length === 1) {
    return {
      winners: [{ playerId: contenders[0]!.id, amount: state.pot }],
      pots: [{ amount: state.pot, eligible: [contenders[0]!.id] }],
    }
  }

  const pots = buildSidePots(state)
  const rankMap = new Map<string, { value: number[]; label: string }>()

  for (const player of contenders) {
    if (player.holeCards.length !== 2) {
      continue
    }

    const result = await equityEngine.evaluateHandWithBackend(backend, [...player.holeCards, ...state.board])
    rankMap.set(player.id, { value: result.value, label: result.label })
  }

  const byPlayer = new Map<string, HandWinner>()

  for (const pot of pots) {
    const eligibleRanks = pot.eligible
      .map((playerId) => ({ playerId, rank: rankMap.get(playerId) }))
      .filter((entry): entry is { playerId: string; rank: { value: number[]; label: string } } => Boolean(entry.rank))

    if (eligibleRanks.length === 0) {
      continue
    }

    let best = eligibleRanks[0]!
    for (const entry of eligibleRanks.slice(1)) {
      if (compareRankValues(entry.rank.value, best.rank.value) > 0) {
        best = entry
      }
    }

    const winners = eligibleRanks.filter((entry) => compareRankValues(entry.rank.value, best.rank.value) === 0)
    const share = Math.floor(pot.amount / winners.length)
    const remainder = pot.amount - share * winners.length

    const sortedWinners = [...winners].sort((a, b) => {
      const pa = state.players.find((player) => player.id === a.playerId)
      const pb = state.players.find((player) => player.id === b.playerId)
      return (pa?.seat || 0) - (pb?.seat || 0)
    })

    sortedWinners.forEach((winner, index) => {
      const existing = byPlayer.get(winner.playerId)
      const amount = share + (index === 0 ? remainder : 0)

      byPlayer.set(winner.playerId, {
        playerId: winner.playerId,
        amount: (existing?.amount || 0) + amount,
        hand: winner.rank.label,
      })
    })
  }

  const winners = [...byPlayer.values()].sort((a, b) => {
    const pa = state.players.find((player) => player.id === a.playerId)
    const pb = state.players.find((player) => player.id === b.playerId)
    return (pa?.seat || 0) - (pb?.seat || 0)
  })

  return { winners, pots }
}

export function createInitialGameState(options: {
  seed?: number
  smallBlind: number
  bigBlind: number
  ante: number
  tableId?: string
}): GameState {
  return {
    handId: "",
    ...(options.tableId ? { tableId: options.tableId } : {}),
    round: 0,
    stage: "waiting",
    dealer: 0,
    pot: 0,
    board: [],
    players: [],
    actionHistory: [],
    currentActor: null,
    deck: [],
    seed: options.seed ?? Date.now(),
    currentBet: 0,
    lastRaiseSize: options.bigBlind,
    smallBlind: options.smallBlind,
    bigBlind: options.bigBlind,
    ante: options.ante,
    winners: [],
    pots: [],
    startedAt: Date.now(),
  }
}

export function applyEvent(state: GameState, event: GameEvent): GameState {
  const next = cloneState(state)

  switch (event.type) {
    case "SeatPlayer": {
      if (next.players.some((player) => player.id === event.playerId)) {
        throw new Error(`Player already seated: ${event.playerId}`)
      }
      if (next.players.some((player) => player.seat === event.seat)) {
        throw new Error(`Seat is already occupied: ${event.seat}`)
      }

      next.players.push({
        id: event.playerId,
        seat: event.seat,
        stack: event.stack,
        holeCards: [],
        inHand: true,
        folded: false,
        allIn: false,
        committed: 0,
        totalCommitted: 0,
        hasActed: false,
      })

      return next
    }

    case "RemovePlayer": {
      next.players = next.players.filter((player) => player.id !== event.playerId)
      if (next.currentActor === event.playerId) {
        next.currentActor = next.players[0]?.id || null
      }
      return next
    }

    case "PostBlinds": {
      if (next.stage === "waiting") {
        next.stage = "preflop"
      }

      let withSmallBlind = postBlind(next, event.smallBlindPlayerId, next.smallBlind, "small-blind")
      withSmallBlind = postBlind(withSmallBlind, event.bigBlindPlayerId, next.bigBlind, "big-blind")

      const bigBlindSeat = withSmallBlind.players.find((player) => player.id === event.bigBlindPlayerId)?.seat || 0
      withSmallBlind.currentActor = nextActorId(withSmallBlind, bigBlindSeat)
      return withSmallBlind
    }

    case "DealHoleCards": {
      for (const deal of event.cards) {
        const player = next.players.find((candidate) => candidate.id === deal.playerId)
        if (!player) {
          throw new Error(`Cannot deal cards to missing player: ${deal.playerId}`)
        }
        player.holeCards = deal.cards
      }

      if (event.deck) {
        next.deck = [...event.deck]
      }

      if (next.stage === "waiting") {
        next.stage = "preflop"
      }

      return next
    }

    case "DealBoard": {
      next.board.push(...event.cards)
      if (event.deck) {
        next.deck = [...event.deck]
      }
      return next
    }

    case "PlayerAction": {
      if (next.stage === "waiting" || next.stage === "complete") {
        throw new Error(`Cannot record player action at stage: ${next.stage}`)
      }

      const player = next.players.find((candidate) => candidate.id === event.playerId)
      if (!player) {
        throw new Error(`Unknown player: ${event.playerId}`)
      }

      if (next.currentActor && next.currentActor !== event.playerId) {
        throw new Error(`It is not ${event.playerId}'s turn`)
      }

      if (!player.inHand || player.folded || player.allIn) {
        throw new Error(`Player is not eligible to act: ${event.playerId}`)
      }

      const street = streetFromStage(next.stage)
      const toCall = Math.max(next.currentBet - player.committed, 0)

      if (event.action === "check") {
        if (toCall > 0) {
          throw new Error(`Player ${event.playerId} cannot check while facing ${toCall}`)
        }
        player.hasActed = true
        next.currentActor = nextActorId(next, player.seat)
        return addAction(next, { playerId: event.playerId, action: "check", street })
      }

      if (event.action === "fold") {
        player.folded = true
        player.inHand = false
        player.hasActed = true
        next.currentActor = nextActorId(next, player.seat)
        return addAction(next, { playerId: event.playerId, action: "fold", street })
      }

      let contribution = 0
      const beforeBet = next.currentBet

      if (event.action === "call") {
        if (toCall <= 0) {
          throw new Error(`Player ${event.playerId} has nothing to call`)
        }
        contribution = Math.min(toCall, player.stack)
      } else if (event.action === "all-in") {
        contribution = player.stack
      } else if (event.action === "bet") {
        if (beforeBet > 0) {
          throw new Error("Cannot bet after a bet exists; use raise")
        }
        contribution = Number(event.amount ?? 0)
        // Min bet = bigBlind (unless going all-in for less)
        if (contribution < next.bigBlind && contribution < player.stack) {
          throw new Error(`Bet of ${contribution} is below minimum bet of ${next.bigBlind}`)
        }
      } else if (event.action === "raise") {
        if (beforeBet <= 0) {
          throw new Error("Cannot raise without an existing bet")
        }
        contribution = Number(event.amount ?? 0)
        if (contribution <= toCall) {
          throw new Error(`Raise contribution ${contribution} must exceed to-call amount ${toCall}`)
        }
        // Min raise = toCall + lastRaiseSize (unless going all-in for less)
        const minRaiseContribution = toCall + next.lastRaiseSize
        if (contribution < minRaiseContribution && contribution < player.stack) {
          throw new Error(`Raise contribution ${contribution} is below minimum raise of ${minRaiseContribution}`)
        }
      }

      if (!Number.isFinite(contribution) || contribution <= 0) {
        throw new Error(`Action ${event.action} requires contribution > 0`)
      }

      contribution = Math.min(contribution, player.stack)
      player.stack -= contribution
      player.committed += contribution
      player.totalCommitted += contribution
      player.hasActed = true
      player.allIn = player.stack === 0
      next.pot += contribution

      if (player.committed > next.currentBet) {
        // Track raise size for minimum raise enforcement
        const raiseSize = player.committed - next.currentBet
        if (raiseSize > 0) {
          next.lastRaiseSize = raiseSize
        }
        next.currentBet = player.committed
        next.players = next.players.map((candidate) => {
          if (candidate.id === player.id || candidate.folded || candidate.allIn) {
            return candidate
          }
          return { ...candidate, hasActed: false }
        })
      }

      next.currentActor = nextActorId(next, player.seat)

      return addAction(next, {
        playerId: event.playerId,
        action: event.action,
        amount: contribution,
        street,
      })
    }

    case "AdvanceStreet": {
      next.stage = stageAfter(next.stage)
      next.currentBet = 0
      next.lastRaiseSize = next.bigBlind

      next.players = next.players.map((player) => ({
        ...player,
        committed: 0,
        hasActed: false,
      }))

      next.currentActor = nextActorId(next, next.dealer)
      return next
    }

    case "AwardPot": {
      const paid = event.winners.reduce((memo, winner) => memo + winner.amount, 0)

      for (const winner of event.winners) {
        const player = next.players.find((candidate) => candidate.id === winner.playerId)
        if (player) {
          player.stack += winner.amount
        }
      }

      next.winners = event.winners
      next.pot = Math.max(next.pot - paid, 0)
      next.pots = event.pots ? event.pots : buildSidePots(next)
      return next
    }

    case "EndHand": {
      next.stage = "complete"
      next.currentActor = null
      next.completedAt = Date.now()
      return next
    }

    default:
      return next
  }
}

export const GameEngineStateSchema = FeatureStateSchema.extend({
  game: z.custom<GameState>(),
  lastLogKey: z.string().optional(),
  logsSaved: z.number().default(0),
})

export type GameEngineState = z.infer<typeof GameEngineStateSchema>

export const GameEngineOptionsSchema = FeatureOptionsSchema.extend({
  tableId: z.string().optional(),
  smallBlind: z.number().default(1),
  bigBlind: z.number().default(2),
  ante: z.number().default(0),
  maxPlayers: z.number().int().min(2).max(9).default(9),
  startingStack: z.number().default(100),
  autoDeal: z.boolean().default(false),
  seed: z.number().optional(),
})

export type GameEngineOptions = z.infer<typeof GameEngineOptionsSchema>

export class GameEngine extends Feature<GameEngineState, GameEngineOptions> {
  static override shortcut = "features.gameEngine" as const
  static override stateSchema = GameEngineStateSchema
  static override optionsSchema = GameEngineOptionsSchema
  static override description = "State-machine-first Texas Hold'em engine with deterministic event replay and hand-history logging."

  override get initialState(): GameEngineState {
    return {
      ...super.initialState,
      game: createInitialGameState({
        seed: this.options.seed,
        tableId: this.options.tableId,
        smallBlind: this.options.smallBlind,
        bigBlind: this.options.bigBlind,
        ante: this.options.ante,
      }),
      logsSaved: 0,
    }
  }

  get game(): GameState {
    return this.state.get("game") as GameState
  }

  get diskCache() {
    return this.container.feature("diskCache", {
      enable: true,
      path: this.container.paths.resolve("tmp", "poker-cache"),
    })
  }

  private dispatch(event: GameEvent): GameState {
    const next = applyEvent(this.game, event)
    this.state.set("game", next)
    this.emit("eventApplied", event, next)
    return next
  }

  setGameState(state: GameState): GameState {
    this.state.set("game", cloneState(state))
    return this.game
  }

  reset(seed?: number): GameState {
    const players = this.game.players.map((player) => ({
      ...player,
      holeCards: [],
      inHand: player.stack > 0,
      folded: false,
      allIn: false,
      committed: 0,
      totalCommitted: 0,
      hasActed: false,
    }))

    const state = createInitialGameState({
      seed: seed ?? this.options.seed,
      tableId: this.options.tableId,
      smallBlind: this.options.smallBlind,
      bigBlind: this.options.bigBlind,
      ante: this.options.ante,
    })

    state.players = players
    state.round = this.game.round
    state.dealer = this.game.dealer

    this.state.set("game", state)
    return state
  }

  join(playerId: string, options: { seat?: number; stack?: number } = {}): GameState {
    const occupied = new Set(this.game.players.map((player) => player.seat))

    let seat = options.seat
    if (!seat) {
      for (let nextSeat = 1; nextSeat <= this.options.maxPlayers; nextSeat += 1) {
        if (!occupied.has(nextSeat)) {
          seat = nextSeat
          break
        }
      }
    }

    if (!seat || seat < 1 || seat > this.options.maxPlayers) {
      throw new Error("No seat available for new player")
    }

    return this.dispatch({
      type: "SeatPlayer",
      playerId,
      seat,
      stack: options.stack ?? this.options.startingStack,
    })
  }

  leave(playerId: string): GameState {
    return this.dispatch({ type: "RemovePlayer", playerId })
  }

  deal(seed?: number): GameState {
    const seated = sortedSeats(this.game.players).filter((player) => player.stack > 0)

    if (seated.length < 2) {
      throw new Error("Need at least 2 seated players with chips to deal")
    }

    const nextRound = this.game.round + 1
    const usedSeed = seed ?? this.options.seed ?? Date.now()
    const rng = new PRNG(usedSeed)

    const orderBefore = sortedSeats(this.game.players)
    const previousDealerIndex = Math.max(0, orderBefore.findIndex((player) => player.seat === this.game.dealer))
    const nextDealer = orderBefore[(previousDealerIndex + 1) % orderBefore.length]?.seat || orderBefore[0]?.seat || 1

    const refreshed: GameState = {
      ...createInitialGameState({
        seed: usedSeed,
        tableId: this.options.tableId,
        smallBlind: this.options.smallBlind,
        bigBlind: this.options.bigBlind,
        ante: this.options.ante,
      }),
      handId: this.container.utils.uuid(),
      round: nextRound,
      stage: "preflop",
      dealer: nextDealer,
      players: seated.map((player) => ({
        ...player,
        holeCards: [],
        inHand: true,
        folded: false,
        allIn: false,
        committed: 0,
        totalCommitted: 0,
        hasActed: false,
      })),
      deck: rng.shuffle(buildDeckStrings()),
    }

    this.state.set("game", refreshed)

    const order = sortedSeats(refreshed.players)
    const dealerIndex = Math.max(0, order.findIndex((player) => player.seat === refreshed.dealer))

    // Heads-up: dealer posts SB and acts first preflop.
    // 3+ players: SB is one left of dealer, BB is two left.
    let sb: typeof order[number]
    let bb: typeof order[number]
    if (order.length === 2) {
      sb = order[dealerIndex]
      bb = order[(dealerIndex + 1) % order.length]
    } else {
      sb = order[(dealerIndex + 1) % order.length]
      bb = order[(dealerIndex + 2) % order.length]
    }

    if (!sb || !bb) {
      throw new Error("Could not identify blind positions")
    }

    this.dispatch({ type: "PostBlinds", smallBlindPlayerId: sb.id, bigBlindPlayerId: bb.id })

    const deck = [...this.game.deck]
    const deals = order.map((player) => ({ playerId: player.id, cards: ["", ""] as [string, string] }))

    for (let cardIndex = 0; cardIndex < 2; cardIndex += 1) {
      for (let index = 0; index < deals.length; index += 1) {
        const card = deck.shift()
        if (!card) {
          throw new Error("Deck exhausted while dealing hole cards")
        }
        deals[index]!.cards[cardIndex] = card
      }
    }

    return this.dispatch({ type: "DealHoleCards", cards: deals, deck })
  }

  recordAction(playerId: string, action: Exclude<PlayerActionType, "small-blind" | "big-blind">, amount?: number): GameState {
    const updated = this.dispatch({ type: "PlayerAction", playerId, action, ...(amount !== undefined ? { amount } : {}) })

    const alive = playersInHand(updated)
    if (alive.length <= 1) {
      return this.state.get("game") as GameState
    }

    if (isActionClosed(updated)) {
      if (updated.stage === "river") {
        this.dispatch({ type: "AdvanceStreet" })
      } else if (["preflop", "flop", "turn"].includes(updated.stage)) {
        this.advanceStreet()
      }
    }

    return this.state.get("game") as GameState
  }

  advanceStreet(): GameState {
    const stage = this.game.stage
    const deck = [...this.game.deck]

    if (stage === "preflop") {
      const cards = deck.splice(0, 3)
      this.dispatch({ type: "AdvanceStreet" })
      return this.dispatch({ type: "DealBoard", cards, deck })
    }

    if (stage === "flop" || stage === "turn") {
      const cards = deck.splice(0, 1)
      this.dispatch({ type: "AdvanceStreet" })
      return this.dispatch({ type: "DealBoard", cards, deck })
    }

    if (stage === "river") {
      return this.dispatch({ type: "AdvanceStreet" })
    }

    return this.game
  }

  async finalizeRound(backend: EquityBackendPreference = "wasm"): Promise<HandWinner[]> {
    if (this.game.stage === "complete") {
      return this.game.winners
    }

    while (this.game.board.length < 5 && this.game.deck.length > 0) {
      this.advanceStreet()
    }

    if (this.game.stage !== "showdown") {
      this.dispatch({ type: "AdvanceStreet" })
    }

    const { winners, pots } = await resolvePayouts(this.game, backend)

    this.dispatch({ type: "AwardPot", winners, pots })
    this.dispatch({ type: "EndHand" })
    await this.saveLog()

    return winners
  }

  async saveLog(): Promise<HandHistory> {
    const game = this.game
    const pots = game.pots.length > 0 ? game.pots : buildSidePots(game)

    const hand: HandHistory = {
      handId: game.handId,
      ...(game.tableId ? { tableId: game.tableId } : {}),
      players: game.players.map((player) => ({
        id: player.id,
        seat: player.seat,
        stack: player.stack,
        cards: player.holeCards,
      })),
      blinds: {
        small: game.smallBlind,
        big: game.bigBlind,
        ...(game.ante > 0 ? { ante: game.ante } : {}),
      },
      actions: game.actionHistory.map((action) => ({
        seq: action.seq,
        playerId: action.playerId,
        action: action.action,
        ...(action.amount !== undefined ? { amount: action.amount } : {}),
        street: action.street,
      })),
      board: [...game.board],
      pots,
      winners: [...game.winners],
      ...(Number.isFinite(game.seed) ? { seed: game.seed } : {}),
      timestamp: game.completedAt || Date.now(),
    }

    const key = `poker:hands:${hand.handId}`
    await this.diskCache.set(key, hand)

    this.state.set("lastLogKey", key)
    this.state.set("logsSaved", (this.state.get("logsSaved") || 0) + 1)

    return hand
  }

  async recentHands(limit = 10): Promise<HandHistory[]> {
    const keys = await this.diskCache.keys()
    const handKeys = keys.filter((key: string) => key.startsWith("poker:hands:")).slice(-limit)
    const records = await Promise.all(handKeys.map((key: string) => this.diskCache.get(key, true)))
    return records as HandHistory[]
  }
}

export default features.register("gameEngine", GameEngine)
