import { describe, expect, it } from "bun:test"
import fixtures from "./fixtures/golden-hands.json"

import {
  applyEvent,
  createInitialGameState,
  resolvePayouts,
  type GameEvent,
  type GameState,
} from "../features/game-engine"

type Fixture = {
  id: string
  setup: {
    smallBlind: number
    bigBlind: number
    ante: number
    players: Array<{ id: string; seat: number; stack: number }>
    dealer?: number
  }
  events: GameEvent[]
  expected: {
    pots: Array<{ amount: number; eligible: string[] }>
    winners: Array<{ playerId: string; amount: number }>
  }
}

function sortPots(pots: Array<{ amount: number; eligible: string[] }>) {
  return pots
    .map((pot) => ({ amount: pot.amount, eligible: [...pot.eligible].sort() }))
    .sort((a, b) => a.amount - b.amount)
}

function sortWinners(winners: Array<{ playerId: string; amount: number }>) {
  return winners
    .map((winner) => ({ playerId: winner.playerId, amount: winner.amount }))
    .sort((a, b) => a.playerId.localeCompare(b.playerId))
}

describe("golden fixture replay", () => {
  for (const fixture of fixtures as Fixture[]) {
    it(`replays fixture: ${fixture.id}`, async () => {
      let state: GameState = createInitialGameState({
        smallBlind: fixture.setup.smallBlind,
        bigBlind: fixture.setup.bigBlind,
        ante: fixture.setup.ante,
      })

      state.handId = fixture.id
      if (fixture.setup.dealer) {
        state.dealer = fixture.setup.dealer
      }

      for (const player of fixture.setup.players) {
        state = applyEvent(state, {
          type: "SeatPlayer",
          playerId: player.id,
          seat: player.seat,
          stack: player.stack,
        })
      }

      for (const event of fixture.events) {
        state = applyEvent(state, event)
      }

      const { winners, pots } = await resolvePayouts(state, "wasm")

      expect(sortPots(pots)).toEqual(sortPots(fixture.expected.pots))
      expect(sortWinners(winners)).toEqual(sortWinners(fixture.expected.winners))
    })
  }
})
