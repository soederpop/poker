import { describe, expect, it } from "bun:test"

import { Actor, seatPosition } from "../features/actor"
import { createInitialGameState, type GameState } from "../features/game-engine"

function stubRuntime() {
  const gameState: GameState = {
    ...createInitialGameState({ smallBlind: 1, bigBlind: 2, ante: 0 }),
    stage: "flop",
    dealer: 1,
    pot: 20,
    currentBet: 10,
    board: ["Kh", "7d", "2h"],
    players: [
      {
        id: "hero",
        seat: 1,
        stack: 90,
        holeCards: ["Ah", "Qh"],
        inHand: true,
        folded: false,
        allIn: false,
        committed: 5,
        totalCommitted: 5,
        hasActed: false,
      },
      {
        id: "villain",
        seat: 2,
        stack: 95,
        holeCards: ["Ks", "Kd"],
        inHand: true,
        folded: false,
        allIn: false,
        committed: 10,
        totalCommitted: 10,
        hasActed: true,
      },
    ],
    actionHistory: [],
    currentActor: "hero",
    handId: "stub",
    seed: 42,
    deck: [],
    winners: [],
    pots: [],
  }

  return {
    game: gameState,
    recordActionCalls: [] as any[],
    recordAction(playerId: string, action: string, amount?: number) {
      this.recordActionCalls.push({ playerId, action, amount })
      return this.game
    },
  }
}

describe("actor system", () => {
  it("maps seats to positions", () => {
    const runtime = stubRuntime() as any
    expect(seatPosition(runtime, "hero")).toBe("BTN")
    expect(seatPosition(runtime, "villain")).toBe("BB")
  })

  it("exposes contextual properties and hooks", async () => {
    const runtime = stubRuntime() as any

    const strategy = {
      rangeForProfile() {
        return "ATs+,AJo+"
      },
      async decide() {
        return { action: "call", amount: 5 }
      },
    } as any

    const actor = new Actor({
      game: runtime,
      strategy,
      playerId: "hero",
      hooks: {
        makeDecision() {
          return { action: "call", amount: 5 }
        },
      },
    })

    expect(actor.chips).toBe(90)
    expect(actor.combo).toBe("AQs")
    expect(actor.handInOpeningRange("tight-aggressive")).toBeTrue()

    const decision = await actor.act({ profileName: "tight-aggressive" })
    expect(decision.action).toBe("call")
    expect(runtime.recordActionCalls).toEqual([{ playerId: "hero", action: "call", amount: 5 }])
  })
})
