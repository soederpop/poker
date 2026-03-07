import { describe, expect, it } from "bun:test"

import { sortedSeats } from "../features/game-engine"
import { GameEngine } from "../features/game-engine"
import { Container } from "@soederpop/luca"

/**
 * Standard heads-up poker rules:
 * - The dealer posts the small blind
 * - The non-dealer posts the big blind
 * - Preflop: dealer (SB) acts first
 * - Postflop: non-dealer (BB) acts first
 */
describe("heads-up blind rules", () => {
  it("deal() assigns dealer as small blind in heads-up", async () => {
    const container = new Container({ cwd: process.cwd() })
    await container.start()

    const engine = container.feature("gameEngine", {
      enable: true,
      smallBlind: 5,
      bigBlind: 10,
      ante: 0,
      startingStack: 100,
      seed: 42,
    }) as GameEngine

    engine.join("alice", { seat: 1, stack: 100 })
    engine.join("bob", { seat: 2, stack: 100 })

    engine.deal(42)
    const game = engine.game

    const dealerSeat = game.dealer
    const dealerPlayer = game.players.find((p) => p.seat === dealerSeat)!
    const otherPlayer = game.players.find((p) => p.seat !== dealerSeat)!

    const sbAction = game.actionHistory.find((a) => a.action === "small-blind")!
    const bbAction = game.actionHistory.find((a) => a.action === "big-blind")!

    // In heads-up, dealer posts SB
    expect(sbAction.playerId).toBe(dealerPlayer.id)
    expect(bbAction.playerId).toBe(otherPlayer.id)

    // Verify blind amounts
    expect(sbAction.amount).toBe(5)
    expect(bbAction.amount).toBe(10)

    // Preflop: dealer (SB) acts first in heads-up
    expect(game.currentActor).toBe(dealerPlayer.id)
  })

  it("deal() assigns SB to left of dealer in 3+ player game", async () => {
    const container = new Container({ cwd: process.cwd() })
    await container.start()

    const engine = container.feature("gameEngine", {
      enable: true,
      smallBlind: 5,
      bigBlind: 10,
      ante: 0,
      startingStack: 100,
      seed: 42,
    }) as GameEngine

    engine.join("alice", { seat: 1, stack: 100 })
    engine.join("bob", { seat: 2, stack: 100 })
    engine.join("carol", { seat: 3, stack: 100 })

    engine.deal(42)
    const game = engine.game

    const dealerSeat = game.dealer
    const order = sortedSeats(game.players)
    const dealerIndex = order.findIndex((p) => p.seat === dealerSeat)

    // SB is one seat left of dealer, BB is two seats left
    const sbPlayer = order[(dealerIndex + 1) % order.length]!
    const bbPlayer = order[(dealerIndex + 2) % order.length]!

    const sbAction = game.actionHistory.find((a) => a.action === "small-blind")!
    const bbAction = game.actionHistory.find((a) => a.action === "big-blind")!

    expect(sbAction.playerId).toBe(sbPlayer.id)
    expect(bbAction.playerId).toBe(bbPlayer.id)

    // Preflop: first to act is UTG (after BB), which in 3-way is the dealer
    expect(game.currentActor).toBe(order[dealerIndex]!.id)
  })
})
