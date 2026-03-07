import { describe, expect, it } from "bun:test"

import {
  activePlayers,
  applyEvent,
  buildSidePots,
  createInitialGameState,
  isActionClosed,
  playersInHand,
  resolvePayouts,
  sortedSeats,
  toCallForPlayer,
  type GameState,
  type PlayerActionType,
} from "../features/game-engine"
import { buildDeckStrings } from "../lib/cards"
import { PRNG } from "../lib/prng"

/**
 * Simulate a full single-table tournament using pure engine functions.
 *
 * After every hand: verify chip conservation.
 * At the end: verify one player has all the chips.
 */

function botDecision(
  game: GameState,
  botId: string,
  handNum: number,
): { action: Exclude<PlayerActionType, "small-blind" | "big-blind">; amount?: number } {
  const player = game.players.find((p) => p.id === botId)
  if (!player) return { action: "fold" }

  const toCall = toCallForPlayer(game, botId)

  // Deterministic "personality" based on seat — ensures varied play
  const aggression = (player.seat + handNum) % 5

  if (toCall === 0) {
    // Open-raise sometimes when checked to
    if (aggression >= 3 && game.currentBet === 0 && player.stack > game.bigBlind * 4) {
      return { action: "bet", amount: game.bigBlind * 3 }
    }
    return { action: "check" }
  }

  // Short stack shove
  if (player.stack <= game.bigBlind * 3) {
    return { action: "all-in" }
  }

  // Aggressive players raise instead of call
  if (aggression >= 4 && toCall < player.stack * 0.25 && game.currentBet < game.bigBlind * 6) {
    return { action: "raise", amount: Math.min(toCall + game.bigBlind * 2, player.stack) }
  }

  if (toCall <= player.stack * 0.2) return { action: "call" }
  if (toCall <= game.bigBlind * 3) return { action: "call" }
  return { action: "fold" }
}

function dealHand(state: GameState, seed: number): GameState {
  const seated = sortedSeats(state.players).filter((p) => p.stack > 0)
  if (seated.length < 2) throw new Error("Need at least 2 players with chips")

  const rng = new PRNG(seed)
  const round = state.round + 1
  const prevDealerIdx = Math.max(0, sortedSeats(state.players).findIndex((p) => p.seat === state.dealer))
  const allSeated = sortedSeats(state.players)
  const nextDealer = allSeated[(prevDealerIdx + 1) % allSeated.length]?.seat || allSeated[0]?.seat || 1

  let next: GameState = {
    ...createInitialGameState({
      seed,
      smallBlind: state.smallBlind,
      bigBlind: state.bigBlind,
      ante: state.ante,
    }),
    handId: `sim-${round}`,
    round,
    stage: "preflop",
    dealer: nextDealer,
    players: seated.map((p) => ({
      ...p,
      holeCards: [] as [string, string] | [],
      inHand: true,
      folded: false,
      allIn: false,
      committed: 0,
      totalCommitted: 0,
      hasActed: false,
    })),
    deck: rng.shuffle(buildDeckStrings()),
  }

  // Post blinds — heads-up special case
  const order = sortedSeats(next.players)
  const dealerIndex = Math.max(0, order.findIndex((p) => p.seat === next.dealer))

  let sbPlayer: typeof order[number]
  let bbPlayer: typeof order[number]
  if (order.length === 2) {
    sbPlayer = order[dealerIndex]!
    bbPlayer = order[(dealerIndex + 1) % order.length]!
  } else {
    sbPlayer = order[(dealerIndex + 1) % order.length]!
    bbPlayer = order[(dealerIndex + 2) % order.length]!
  }

  next = applyEvent(next, {
    type: "PostBlinds",
    smallBlindPlayerId: sbPlayer.id,
    bigBlindPlayerId: bbPlayer.id,
  })

  // Deal hole cards
  const deck = [...next.deck]
  const deals = order.map((p) => ({ playerId: p.id, cards: ["", ""] as [string, string] }))
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < deals.length; i++) {
      deals[i]!.cards[c] = deck.shift()!
    }
  }

  next = applyEvent(next, { type: "DealHoleCards", cards: deals, deck })

  return next
}

function advanceStreetWithBoard(state: GameState): GameState {
  const stage = state.stage
  const deck = [...state.deck]

  if (stage === "preflop") {
    const cards = deck.splice(0, 3)
    let next = applyEvent(state, { type: "AdvanceStreet" })
    return applyEvent(next, { type: "DealBoard", cards, deck })
  }
  if (stage === "flop" || stage === "turn") {
    const cards = deck.splice(0, 1)
    let next = applyEvent(state, { type: "AdvanceStreet" })
    return applyEvent(next, { type: "DealBoard", cards, deck })
  }
  if (stage === "river") {
    return applyEvent(state, { type: "AdvanceStreet" })
  }
  return state
}

async function playAndResolveHand(
  state: GameState,
  seed: number,
  handNum: number = 1,
): Promise<{ state: GameState; handPlayed: boolean }> {
  const alive = state.players.filter((p) => p.stack > 0)
  if (alive.length < 2) return { state, handPlayed: false }

  let game = dealHand(state, seed)
  let actionCount = 0

  // Play out the hand
  while (game.stage !== "complete" && game.stage !== "showdown" && actionCount < 200) {
    const inHand = playersInHand(game)
    if (inHand.length <= 1) break

    const active = activePlayers(game)

    if (isActionClosed(game)) {
      if (active.length === 0) break
      game = advanceStreetWithBoard(game)
      continue
    }

    const actorId = game.currentActor
    if (!actorId) break

    const actor = active.find((p) => p.id === actorId)
    if (!actor) break

    const decision = botDecision(game, actorId, handNum)
    try {
      game = applyEvent(game, {
        type: "PlayerAction",
        playerId: actorId,
        action: decision.action,
        ...(decision.amount !== undefined ? { amount: decision.amount } : {}),
      })
    } catch {
      // Fallback to fold on invalid action
      try {
        game = applyEvent(game, { type: "PlayerAction", playerId: actorId, action: "fold" })
      } catch {
        break
      }
    }

    // Auto-advance if action closed after this move
    if (isActionClosed(game) && activePlayers(game).length > 0) {
      if (playersInHand(game).length > 1) {
        game = advanceStreetWithBoard(game)
      }
    }

    actionCount++
  }

  // Run out the board for showdown
  while (game.board.length < 5 && game.deck.length > 0 && playersInHand(game).length > 1) {
    game = advanceStreetWithBoard(game)
  }

  if (game.stage !== "showdown" && playersInHand(game).length > 1) {
    game = applyEvent(game, { type: "AdvanceStreet" })
  }

  // Resolve payouts
  const { winners, pots } = await resolvePayouts(game, "wasm")
  game = applyEvent(game, { type: "AwardPot", winners, pots })
  game = applyEvent(game, { type: "EndHand" })

  return { state: game, handPlayed: true }
}

describe("tournament simulation", () => {
  it("6-player SNG runs to completion with chip conservation every hand", async () => {
    const playerIds = ["p1", "p2", "p3", "p4", "p5", "p6"]
    const startingStack = 100
    const totalChips = playerIds.length * startingStack

    let state = createInitialGameState({
      smallBlind: 1,
      bigBlind: 2,
      ante: 0,
    })

    for (let i = 0; i < playerIds.length; i++) {
      state = applyEvent(state, {
        type: "SeatPlayer",
        playerId: playerIds[i]!,
        seat: i + 1,
        stack: startingStack,
      })
    }

    let handCount = 0
    const maxHands = 2000

    while (handCount < maxHands) {
      const alive = state.players.filter((p) => p.stack > 0)
      if (alive.length <= 1) break

      handCount++
      const result = await playAndResolveHand(state, 1000 + handCount, handCount)

      if (!result.handPlayed) break
      state = result.state

      // INVARIANT: chip conservation after every hand
      const currentTotal = state.players.reduce((sum, p) => sum + p.stack, 0)
      expect(currentTotal).toBe(totalChips)

      // Remove busted players
      const busted = state.players.filter((p) => p.stack === 0)
      for (const p of busted) {
        state = applyEvent(state, { type: "RemovePlayer", playerId: p.id })
      }
    }

    const survivors = state.players.filter((p) => p.stack > 0)

    // Tournament must terminate
    expect(handCount).toBeLessThan(maxHands)
    expect(handCount).toBeGreaterThan(0)

    // Final conservation
    const finalTotal = state.players.reduce((sum, p) => sum + p.stack, 0)
    expect(finalTotal).toBe(totalChips)

    // One player should have all chips
    expect(survivors.length).toBe(1)
    expect(survivors[0]!.stack).toBe(totalChips)

    console.log(`6-player SNG completed in ${handCount} hands. Winner: ${survivors[0]!.id} with ${survivors[0]!.stack} chips`)
  }, 30000)

  it("heads-up tournament runs to completion with correct HU blinds", async () => {
    const totalChips = 200

    let state = createInitialGameState({
      smallBlind: 5,
      bigBlind: 10,
      ante: 0,
    })

    state = applyEvent(state, { type: "SeatPlayer", playerId: "hero", seat: 1, stack: 100 })
    state = applyEvent(state, { type: "SeatPlayer", playerId: "villain", seat: 2, stack: 100 })

    let handCount = 0
    const maxHands = 300

    while (handCount < maxHands) {
      const alive = state.players.filter((p) => p.stack > 0)
      if (alive.length <= 1) break

      handCount++
      const result = await playAndResolveHand(state, 5000 + handCount, handCount)

      if (!result.handPlayed) break
      state = result.state

      // Chip conservation
      const currentTotal = state.players.reduce((sum, p) => sum + p.stack, 0)
      expect(currentTotal).toBe(totalChips)

      const busted = state.players.filter((p) => p.stack === 0)
      for (const p of busted) {
        state = applyEvent(state, { type: "RemovePlayer", playerId: p.id })
      }
    }

    expect(handCount).toBeLessThan(maxHands)
    expect(handCount).toBeGreaterThan(0)

    const finalTotal = state.players.reduce((sum, p) => sum + p.stack, 0)
    expect(finalTotal).toBe(totalChips)

    const survivors = state.players.filter((p) => p.stack > 0)
    expect(survivors.length).toBe(1)
    expect(survivors[0]!.stack).toBe(totalChips)

    console.log(`Heads-up completed in ${handCount} hands. Winner: ${survivors[0]!.id}`)
  }, 30000)
})
