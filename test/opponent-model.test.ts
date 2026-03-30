import { describe, it, expect } from "bun:test"
import {
  buildVillainProfile,
  narrowVillainRange,
  villainAdjustedThresholds,
} from "../lib/opponent-model"
import type { VillainProfile } from "../lib/opponent-model"

// ---------------------------------------------------------------------------
// Helper to build action history entries
// ---------------------------------------------------------------------------
function action(playerId: string, act: string, street = "preflop", amount?: number) {
  return { playerId, action: act, street, amount }
}

// Helper to build a historical hand
function makeHand(
  villainId: string,
  actions: Array<{ playerId: string; action: string; street: string; amount?: number }>,
  otherPlayers: string[] = ["hero"],
) {
  return {
    players: [{ id: villainId }, ...otherPlayers.map(id => ({ id }))],
    actions,
  }
}

// ---------------------------------------------------------------------------
// 1. buildVillainProfile — backward compatible (no historicalHands)
// ---------------------------------------------------------------------------
describe("buildVillainProfile", () => {
  it("computes aggression frequency from action history", () => {
    const history = [
      action("v1", "raise", "preflop", 6),
      action("v1", "bet", "flop", 10),
      action("v1", "check", "turn"),
      action("v1", "bet", "river", 20),
    ]
    const profile = buildVillainProfile(history, "v1")
    // bets=2, raises=1, checks=1 → total=4, aggressionFreq = 3/4 = 0.75
    expect(profile.aggressionFreq).toBe(0.75)
    expect(profile.totalActions).toBe(4)
    expect(profile.isAggressive).toBe(true) // aggressionFreq > 0.50 && totalActions >= 2
    expect(profile.isPassive).toBe(false) // aggressionFreq > 0.25
  })

  it("skips blind actions", () => {
    const history = [
      action("v1", "small-blind", "preflop", 1),
      action("v1", "big-blind", "preflop", 2),
      action("v1", "call", "preflop", 4),
      action("v1", "check", "flop"),
    ]
    const profile = buildVillainProfile(history, "v1")
    // Only call + check counted → total=2, aggressionFreq = 0/2 = 0
    expect(profile.totalActions).toBe(2)
    expect(profile.aggressionFreq).toBe(0)
  })

  it("identifies passive villain (all calls) — current hand only", () => {
    const history = [
      action("v1", "call", "preflop", 4),
      action("v1", "call", "flop", 10),
      action("v1", "call", "turn", 20),
    ]
    const profile = buildVillainProfile(history, "v1")
    expect(profile.isPassive).toBe(true)
    expect(profile.isAggressive).toBe(false)
    expect(profile.aggressionFreq).toBe(0)
  })

  it("identifies aggressive villain (lots of raises) — current hand only", () => {
    const history = [
      action("v1", "raise", "preflop", 6),
      action("v1", "raise", "flop", 20),
      action("v1", "bet", "turn", 40),
      action("v1", "call", "river", 30),
    ]
    const profile = buildVillainProfile(history, "v1")
    // bets=1, raises=2, calls=1 → aggressionFreq = 3/4 = 0.75
    // With no historical hands, isAggressive uses current-hand check: aggressionFreq > 0.50 && totalActions >= 2
    expect(profile.isAggressive).toBe(true)
    expect(profile.aggressionFreq).toBe(0.75)
  })

  it("returns correct preflopAction", () => {
    const raiseHistory = [action("v1", "raise", "preflop", 6)]
    expect(buildVillainProfile(raiseHistory, "v1").preflopAction).toBe("raise")

    const callHistory = [action("v1", "call", "preflop", 2)]
    expect(buildVillainProfile(callHistory, "v1").preflopAction).toBe("call")

    const foldHistory = [action("v1", "fold", "preflop")]
    expect(buildVillainProfile(foldHistory, "v1").preflopAction).toBe("fold")
  })

  it("handles empty action history", () => {
    const profile = buildVillainProfile([], "v1")
    expect(profile.totalActions).toBe(0)
    expect(profile.aggressionFreq).toBe(0)
    expect(profile.isPassive).toBe(false) // needs totalActions >= 2
    expect(profile.isAggressive).toBe(false)
    expect(profile.preflopAction).toBe("unknown")
  })

  it("has new fields with defaults when no historical hands", () => {
    const profile = buildVillainProfile([], "v1")
    expect(profile.vpip).toBe(0)
    expect(profile.pfr).toBe(0)
    expect(profile.af).toBe(0)
    expect(profile.isLoose).toBe(false)
    expect(profile.isTight).toBe(false)
    expect(profile.handsObserved).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. buildVillainProfile — multi-hand stats
// ---------------------------------------------------------------------------
describe("buildVillainProfile with historicalHands", () => {
  it("computes vpip across multiple hands", () => {
    const hands = [
      // Hand 1: villain calls preflop → VPIP
      makeHand("v1", [
        action("v1", "call", "preflop", 4),
        action("v1", "check", "flop"),
      ]),
      // Hand 2: villain raises preflop → VPIP
      makeHand("v1", [
        action("v1", "raise", "preflop", 8),
        action("v1", "bet", "flop", 10),
      ]),
      // Hand 3: villain folds preflop → no VPIP
      makeHand("v1", [
        action("v1", "fold", "preflop"),
      ]),
      // Hand 4: villain calls preflop → VPIP
      makeHand("v1", [
        action("v1", "call", "preflop", 4),
      ]),
    ]

    const profile = buildVillainProfile([], "v1", hands)
    // 3 out of 4 hands VPIP'd
    expect(profile.vpip).toBe(0.75)
    expect(profile.handsObserved).toBe(4)
  })

  it("computes pfr across multiple hands", () => {
    const hands = [
      makeHand("v1", [action("v1", "raise", "preflop", 8)]),
      makeHand("v1", [action("v1", "call", "preflop", 4)]),
      makeHand("v1", [action("v1", "raise", "preflop", 10)]),
      makeHand("v1", [action("v1", "fold", "preflop")]),
    ]

    const profile = buildVillainProfile([], "v1", hands)
    // 2 out of 4 raised preflop
    expect(profile.pfr).toBe(0.5)
  })

  it("computes aggression factor across hands", () => {
    const hands = [
      makeHand("v1", [
        action("v1", "raise", "preflop", 8),
        action("v1", "bet", "flop", 10),
      ]),
      makeHand("v1", [
        action("v1", "call", "preflop", 4),
        action("v1", "call", "flop", 10),
      ]),
    ]

    const profile = buildVillainProfile([], "v1", hands)
    // bets=1, raises=1, calls=2 → af = 2/2 = 1.0
    expect(profile.af).toBe(1)
  })

  it("sets isLoose when vpip > 0.40", () => {
    const hands = Array.from({ length: 10 }, (_, i) =>
      makeHand("v1", [
        action("v1", i < 5 ? "call" : "fold", "preflop", i < 5 ? 4 : undefined),
      ])
    )

    const profile = buildVillainProfile([], "v1", hands)
    // vpip = 5/10 = 0.50 > 0.40
    expect(profile.isLoose).toBe(true)
    expect(profile.isTight).toBe(false)
  })

  it("sets isTight when vpip < 0.22", () => {
    const hands = Array.from({ length: 10 }, (_, i) =>
      makeHand("v1", [
        action("v1", i < 2 ? "call" : "fold", "preflop", i < 2 ? 4 : undefined),
      ])
    )

    const profile = buildVillainProfile([], "v1", hands)
    // vpip = 2/10 = 0.20 < 0.22
    expect(profile.isTight).toBe(true)
    expect(profile.isLoose).toBe(false)
  })

  it("does not count BB check as VPIP", () => {
    const hands = [
      // Villain is BB and just checks preflop — no call/raise, only check
      makeHand("v1", [
        action("v1", "big-blind", "preflop", 2),
        action("v1", "check", "preflop"),
        action("v1", "check", "flop"),
      ]),
      // Villain calls preflop — VPIP
      makeHand("v1", [
        action("v1", "call", "preflop", 4),
      ]),
    ]

    const profile = buildVillainProfile([], "v1", hands)
    // Hand 1: only check preflop (non-blind), no call/raise → no VPIP
    // Hand 2: call → VPIP
    expect(profile.vpip).toBe(0.5)
  })

  it("falls back to current-hand stats with empty historicalHands", () => {
    const currentActions = [
      action("v1", "raise", "preflop", 6),
      action("v1", "bet", "flop", 10),
    ]
    const profile = buildVillainProfile(currentActions, "v1", [])
    expect(profile.handsObserved).toBe(0)
    expect(profile.totalActions).toBe(2)
    expect(profile.aggressionFreq).toBe(1.0)
    expect(profile.vpip).toBe(0)
  })

  it("counts handsObserved only for hands where villain played", () => {
    const hands = [
      makeHand("v1", [action("v1", "fold", "preflop")]),
      // Hand where villain is NOT a player
      { players: [{ id: "other" }, { id: "hero" }], actions: [action("other", "fold", "preflop")] },
      makeHand("v1", [action("v1", "call", "preflop", 4)]),
    ]

    const profile = buildVillainProfile([], "v1", hands)
    expect(profile.handsObserved).toBe(2) // only 2 hands had v1
  })

  it("requires 5+ hands to set isPassive/isAggressive from aggregate stats", () => {
    // Only 3 hands — not enough for passive/aggressive flags
    const hands = [
      makeHand("v1", [action("v1", "call", "preflop", 4), action("v1", "call", "flop", 10)]),
      makeHand("v1", [action("v1", "call", "preflop", 4), action("v1", "call", "flop", 10)]),
      makeHand("v1", [action("v1", "call", "preflop", 4)]),
    ]

    const profile = buildVillainProfile([], "v1", hands)
    // aggressionFreq = 0, af = 0, but only 3 hands observed
    expect(profile.isPassive).toBe(false) // not enough data
    expect(profile.isAggressive).toBe(false)
  })

  it("sets isPassive with 5+ hands of passive play", () => {
    const hands = Array.from({ length: 6 }, () =>
      makeHand("v1", [
        action("v1", "call", "preflop", 4),
        action("v1", "call", "flop", 10),
        action("v1", "check", "turn"),
      ])
    )

    const profile = buildVillainProfile([], "v1", hands)
    expect(profile.handsObserved).toBe(6)
    expect(profile.isPassive).toBe(true)
    expect(profile.isAggressive).toBe(false)
  })

  it("sets isAggressive with 5+ hands of aggressive play", () => {
    const hands = Array.from({ length: 6 }, () =>
      makeHand("v1", [
        action("v1", "raise", "preflop", 8),
        action("v1", "bet", "flop", 15),
        action("v1", "bet", "turn", 30),
      ])
    )

    const profile = buildVillainProfile([], "v1", hands)
    expect(profile.handsObserved).toBe(6)
    expect(profile.isAggressive).toBe(true)
    expect(profile.isPassive).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 3. narrowVillainRange
// ---------------------------------------------------------------------------
describe("narrowVillainRange", () => {
  function makeVP(overrides: Partial<VillainProfile> = {}): VillainProfile {
    return {
      vpip: 0.30,
      pfr: 0.20,
      af: 1.5,
      aggressionFreq: 0.35,
      isPassive: false,
      isAggressive: false,
      isLoose: false,
      isTight: false,
      calledBetCount: 1,
      raisedCount: 0,
      preflopAction: "raise",
      handsObserved: 10,
      totalActions: 5,
      ...overrides,
    }
  }

  it("returns tight range for EP raise", () => {
    const vp = makeVP({ preflopAction: "raise" })
    const range = narrowVillainRange(vp, "UTG", "preflop", 1)
    expect(range).toBeDefined()
    expect(range).toContain("88+")
  })

  it("returns wider range for LP raise", () => {
    const vp = makeVP({ preflopAction: "raise" })
    const range = narrowVillainRange(vp, "BTN", "preflop", 1)
    expect(range).toBeDefined()
    expect(range).toContain("55+")
  })

  it("returns premium range for 3-bet", () => {
    const vp = makeVP({ preflopAction: "raise" })
    const range = narrowVillainRange(vp, "UTG", "preflop", 2)
    expect(range).toBeDefined()
    expect(range).toContain("QQ+")
  })

  it("returns strong range for turn raise", () => {
    const vp = makeVP({ raisedCount: 1, preflopAction: "call" })
    const range = narrowVillainRange(vp, "UTG", "turn", 1)
    expect(range).toBeDefined()
    expect(range).toContain("JJ+")
  })

  it("returns tighter range for passive villain who bets", () => {
    const passive = makeVP({ isPassive: true, raisedCount: 1, preflopAction: "call" })
    const range = narrowVillainRange(passive, "UTG", "flop", 1)
    expect(range).toBeDefined()
    expect(range).toContain("QQ+")
  })

  it("returns wider range for aggressive villain who bets", () => {
    const aggressive = makeVP({ isAggressive: true, raisedCount: 1, preflopAction: "call" })
    const range = narrowVillainRange(aggressive, "UTG", "flop", 1)
    expect(range).toBeDefined()
    expect(range).toContain("88+")
  })

  it("returns undefined when no narrowing applies", () => {
    const vp = makeVP({ preflopAction: "call", raisedCount: 0 })
    const range = narrowVillainRange(vp, "UTG", "flop", 0)
    expect(range).toBeUndefined()
  })

  // ── New tests for loose/tight adjustments ──

  it("widens EP raise range for loose villain", () => {
    const loose = makeVP({ isLoose: true, preflopAction: "raise" })
    const range = narrowVillainRange(loose, "UTG", "preflop", 1)
    expect(range).toBeDefined()
    // Loose EP should be wider than default "88+,ATs+,KQs,AJo+"
    expect(range).toContain("22+")
  })

  it("tightens EP raise range for tight villain", () => {
    const tight = makeVP({ isTight: true, preflopAction: "raise" })
    const range = narrowVillainRange(tight, "UTG", "preflop", 1)
    expect(range).toBeDefined()
    expect(range).toContain("TT+")
  })

  it("widens LP raise range for loose villain", () => {
    const loose = makeVP({ isLoose: true, preflopAction: "raise" })
    const range = narrowVillainRange(loose, "BTN", "preflop", 1)
    expect(range).toBeDefined()
    expect(range).toContain("22+")
  })

  it("tightens LP raise range for tight villain", () => {
    const tight = makeVP({ isTight: true, preflopAction: "raise" })
    const range = narrowVillainRange(tight, "BTN", "preflop", 1)
    expect(range).toBeDefined()
    expect(range).toContain("77+")
  })

  it("widens 3-bet range for loose villain", () => {
    const loose = makeVP({ isLoose: true })
    const range = narrowVillainRange(loose, "UTG", "preflop", 2)
    expect(range).toBeDefined()
    expect(range).toContain("TT+")
  })

  it("tightens 3-bet range for tight villain", () => {
    const tight = makeVP({ isTight: true })
    const range = narrowVillainRange(tight, "UTG", "preflop", 2)
    expect(range).toBeDefined()
    expect(range).toContain("KK+")
  })
})

// ---------------------------------------------------------------------------
// 4. villainAdjustedThresholds
// ---------------------------------------------------------------------------
describe("villainAdjustedThresholds", () => {
  const baseRaise = 0.60
  const baseCall = 0.35
  const baseFold = 0.20

  it("returns unchanged thresholds when no villain profile", () => {
    const result = villainAdjustedThresholds(null, baseRaise, baseCall, baseFold)
    expect(result.raiseThreshold).toBe(baseRaise)
    expect(result.callThreshold).toBe(baseCall)
    expect(result.foldThreshold).toBe(baseFold)
  })

  it("tightens thresholds against passive villain", () => {
    const passive: VillainProfile = {
      vpip: 0.30,
      pfr: 0.10,
      af: 0.5,
      aggressionFreq: 0.10,
      isPassive: true,
      isAggressive: false,
      isLoose: false,
      isTight: false,
      calledBetCount: 4,
      raisedCount: 0,
      preflopAction: "call",
      handsObserved: 10,
      totalActions: 6,
    }
    const result = villainAdjustedThresholds(passive, baseRaise, baseCall, baseFold)
    expect(result.raiseThreshold).toBe(baseRaise + 0.05)
    expect(result.callThreshold).toBe(baseCall + 0.05)
    expect(result.foldThreshold).toBe(baseFold)
  })

  it("loosens thresholds against aggressive villain", () => {
    const aggressive: VillainProfile = {
      vpip: 0.45,
      pfr: 0.35,
      af: 3.0,
      aggressionFreq: 0.70,
      isPassive: false,
      isAggressive: true,
      isLoose: true,
      isTight: false,
      calledBetCount: 1,
      raisedCount: 5,
      preflopAction: "raise",
      handsObserved: 10,
      totalActions: 7,
    }
    const result = villainAdjustedThresholds(aggressive, baseRaise, baseCall, baseFold)
    expect(result.raiseThreshold).toBe(baseRaise - 0.03)
    expect(result.callThreshold).toBe(baseCall - 0.05)
    expect(result.foldThreshold).toBe(baseFold + 0.03)
  })
})
