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

describe("chip conservation invariant", () => {
  for (const fixture of fixtures as Fixture[]) {
    it(`chips are conserved: ${fixture.id}`, async () => {
      const startingTotal = fixture.setup.players.reduce((sum, p) => sum + p.stack, 0)

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

      // Verify pot equals total committed
      const totalCommitted = state.players.reduce((sum, p) => sum + p.totalCommitted, 0)
      expect(state.pot).toBe(totalCommitted)

      // Verify stacks + pot = starting total (no chips created or destroyed during play)
      const stacksInPlay = state.players.reduce((sum, p) => sum + p.stack, 0)
      expect(stacksInPlay + state.pot).toBe(startingTotal)

      // Resolve payouts
      const { winners } = await resolvePayouts(state, "wasm")
      const totalAwarded = winners.reduce((sum, w) => sum + w.amount, 0)

      // Verify total awarded equals pot
      expect(totalAwarded).toBe(state.pot)

      // Apply AwardPot and verify final stacks equal starting total
      state = applyEvent(state, { type: "AwardPot", winners })
      const finalTotal = state.players.reduce((sum, p) => sum + p.stack, 0)

      expect(finalTotal).toBe(startingTotal)
    })
  }
})
