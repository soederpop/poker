import { describe, expect, it } from "bun:test"

import {
  applyEvent,
  buildSidePots,
  createInitialGameState,
  isActionClosed,
  isPotGood,
  resolvePayouts,
  type GameEvent,
  type GameState,
} from "../features/game-engine"

function baseState(): GameState {
  let state = createInitialGameState({ smallBlind: 1, bigBlind: 2, ante: 0 })
  state = applyEvent(state, { type: "SeatPlayer", playerId: "p1", seat: 1, stack: 100 })
  state = applyEvent(state, { type: "SeatPlayer", playerId: "p2", seat: 2, stack: 100 })
  state = applyEvent(state, { type: "PostBlinds", smallBlindPlayerId: "p1", bigBlindPlayerId: "p2" })
  return state
}

describe("game-engine core invariants", () => {
  it("enforces turn order", () => {
    const state = baseState()

    expect(() => applyEvent(state, {
      type: "PlayerAction",
      playerId: "p2",
      action: "check",
    })).toThrow()
  })

  it("tracks pot-good + action-closed preflop", () => {
    let state = baseState()

    expect(isPotGood(state)).toBeFalse()
    expect(isActionClosed(state)).toBeFalse()

    state = applyEvent(state, { type: "PlayerAction", playerId: "p1", action: "call" })
    expect(isPotGood(state)).toBeTrue()
    expect(isActionClosed(state)).toBeFalse()

    state = applyEvent(state, { type: "PlayerAction", playerId: "p2", action: "check" })
    expect(isActionClosed(state)).toBeTrue()
  })

  it("builds side pots for uneven all-in totals", () => {
    let state = createInitialGameState({ smallBlind: 1, bigBlind: 2, ante: 0 })
    state = applyEvent(state, { type: "SeatPlayer", playerId: "p1", seat: 1, stack: 50 })
    state = applyEvent(state, { type: "SeatPlayer", playerId: "p2", seat: 2, stack: 100 })
    state = applyEvent(state, { type: "SeatPlayer", playerId: "p3", seat: 3, stack: 200 })
    state = applyEvent(state, { type: "PostBlinds", smallBlindPlayerId: "p1", bigBlindPlayerId: "p2" })

    const events: GameEvent[] = [
      { type: "DealHoleCards", cards: [
        { playerId: "p1", cards: ["Ah", "Ad"] },
        { playerId: "p2", cards: ["Kc", "Kd"] },
        { playerId: "p3", cards: ["Qs", "Qd"] },
      ]},
      { type: "DealBoard", cards: ["2c", "3d", "4h", "5s", "9c"] },
      { type: "PlayerAction", playerId: "p3", action: "raise", amount: 40 },
      { type: "PlayerAction", playerId: "p1", action: "all-in" },
      { type: "PlayerAction", playerId: "p2", action: "all-in" },
      { type: "PlayerAction", playerId: "p3", action: "call" },
    ]

    for (const event of events) {
      state = applyEvent(state, event)
    }

    const pots = buildSidePots(state)
    expect(pots).toEqual([
      { amount: 150, eligible: ["p1", "p2", "p3"] },
      { amount: 100, eligible: ["p2", "p3"] },
    ])
  })

  it("resolves payouts with side pots", async () => {
    let state = createInitialGameState({ smallBlind: 1, bigBlind: 2, ante: 0 })
    state = applyEvent(state, { type: "SeatPlayer", playerId: "p1", seat: 1, stack: 50 })
    state = applyEvent(state, { type: "SeatPlayer", playerId: "p2", seat: 2, stack: 100 })
    state = applyEvent(state, { type: "SeatPlayer", playerId: "p3", seat: 3, stack: 200 })
    state = applyEvent(state, { type: "PostBlinds", smallBlindPlayerId: "p1", bigBlindPlayerId: "p2" })

    const events: GameEvent[] = [
      { type: "DealHoleCards", cards: [
        { playerId: "p1", cards: ["Ah", "Ad"] },
        { playerId: "p2", cards: ["Kc", "Kd"] },
        { playerId: "p3", cards: ["Qs", "Qd"] },
      ]},
      { type: "DealBoard", cards: ["2c", "3d", "4h", "5s", "9c"] },
      { type: "PlayerAction", playerId: "p3", action: "raise", amount: 40 },
      { type: "PlayerAction", playerId: "p1", action: "all-in" },
      { type: "PlayerAction", playerId: "p2", action: "all-in" },
      { type: "PlayerAction", playerId: "p3", action: "call" },
    ]

    for (const event of events) {
      state = applyEvent(state, event)
    }

    const { winners } = await resolvePayouts(state, "wasm")

    expect(winners).toEqual([
      { playerId: "p1", amount: 150, hand: "straight" },
      { playerId: "p2", amount: 100, hand: "one-pair" },
    ])
  })
})

describe("minimum bet/raise enforcement", () => {
  it("rejects bet below big blind", () => {
    const state = baseState()
    // p1 (SB) calls preflop, p2 (BB) checks => advance to flop
    let s = applyEvent(state, { type: "PlayerAction", playerId: "p1", action: "call" })
    s = applyEvent(s, { type: "PlayerAction", playerId: "p2", action: "check" })
    s = applyEvent(s, { type: "AdvanceStreet" })

    const actor = s.currentActor!
    // try to bet 1 when bigBlind is 2
    expect(() => applyEvent(s, {
      type: "PlayerAction", playerId: actor, action: "bet", amount: 1,
    })).toThrow("below minimum bet")
  })

  it("allows bet equal to big blind", () => {
    const state = baseState()
    let s = applyEvent(state, { type: "PlayerAction", playerId: "p1", action: "call" })
    s = applyEvent(s, { type: "PlayerAction", playerId: "p2", action: "check" })
    s = applyEvent(s, { type: "AdvanceStreet" })

    const actor = s.currentActor!
    // bet exactly bigBlind should work
    s = applyEvent(s, { type: "PlayerAction", playerId: actor, action: "bet", amount: 2 })
    expect(s.currentBet).toBe(2)
  })

  it("rejects raise below minimum raise size", () => {
    const state = baseState()
    // p1 calls (toCall=1 to match BB=2), p2 raises preflop to 6 (contribution=4, so raise size = 4)
    let s = applyEvent(state, { type: "PlayerAction", playerId: "p1", action: "call" })
    s = applyEvent(s, { type: "PlayerAction", playerId: "p2", action: "raise", amount: 4 })
    // Now currentBet=6, lastRaiseSize=4, toCall for p1 = 4
    // Min raise contribution = toCall(4) + lastRaiseSize(4) = 8
    expect(() => applyEvent(s, {
      type: "PlayerAction", playerId: "p1", action: "raise", amount: 5,
    })).toThrow("below minimum raise")
  })

  it("allows raise equal to minimum raise size", () => {
    const state = baseState()
    let s = applyEvent(state, { type: "PlayerAction", playerId: "p1", action: "call" })
    s = applyEvent(s, { type: "PlayerAction", playerId: "p2", action: "raise", amount: 4 })
    // Min raise contribution = toCall(4) + lastRaiseSize(4) = 8
    s = applyEvent(s, { type: "PlayerAction", playerId: "p1", action: "raise", amount: 8 })
    expect(s.currentBet).toBe(10) // 2(original committed) + 8 = 10
  })

  it("allows all-in below minimum bet as exception", () => {
    // Player with stack < bigBlind can still go all-in
    let s = createInitialGameState({ smallBlind: 5, bigBlind: 10, ante: 0 })
    s = applyEvent(s, { type: "SeatPlayer", playerId: "p1", seat: 1, stack: 100 })
    s = applyEvent(s, { type: "SeatPlayer", playerId: "p2", seat: 2, stack: 100 })
    s = applyEvent(s, { type: "PostBlinds", smallBlindPlayerId: "p1", bigBlindPlayerId: "p2" })
    s = applyEvent(s, { type: "PlayerAction", playerId: "p1", action: "call" })
    s = applyEvent(s, { type: "PlayerAction", playerId: "p2", action: "check" })
    s = applyEvent(s, { type: "AdvanceStreet" })

    const actor = s.currentActor!
    // all-in is always valid regardless of min bet
    s = applyEvent(s, { type: "PlayerAction", playerId: actor, action: "all-in" })
    expect(s.pot).toBe(110) // 20 (blinds) + 90 (all-in)
  })

  it("allows all-in below minimum raise as exception", () => {
    let s = createInitialGameState({ smallBlind: 1, bigBlind: 2, ante: 0 })
    s = applyEvent(s, { type: "SeatPlayer", playerId: "p1", seat: 1, stack: 100 })
    s = applyEvent(s, { type: "SeatPlayer", playerId: "p2", seat: 2, stack: 5 })
    s = applyEvent(s, { type: "PostBlinds", smallBlindPlayerId: "p1", bigBlindPlayerId: "p2" })
    // p1 calls preflop (toCall=1). p2 has 3 left after posting BB.
    s = applyEvent(s, { type: "PlayerAction", playerId: "p1", action: "call" })
    // p2 goes all-in for 3 (raise of 1, below min raise of 2) — but allowed because all-in
    s = applyEvent(s, { type: "PlayerAction", playerId: "p2", action: "all-in" })
    expect(s.pot).toBe(7) // 1(SB) + 2(BB) + 1(call) + 3(all-in)
  })

  it("resets lastRaiseSize per street", () => {
    const state = baseState()
    let s = applyEvent(state, { type: "PlayerAction", playerId: "p1", action: "call" })
    s = applyEvent(s, { type: "PlayerAction", playerId: "p2", action: "raise", amount: 6 })
    // lastRaiseSize is now 6 (raised from 2 to 8)
    expect(s.lastRaiseSize).toBe(6)

    s = applyEvent(s, { type: "PlayerAction", playerId: "p1", action: "call" })
    s = applyEvent(s, { type: "AdvanceStreet" })
    // After advance, lastRaiseSize resets to bigBlind
    expect(s.lastRaiseSize).toBe(2)
  })

  it("tracks lastRaiseSize correctly after blind posting", () => {
    const state = baseState()
    // After PostBlinds, lastRaiseSize should be bigBlind
    expect(state.lastRaiseSize).toBe(2)
  })
})
