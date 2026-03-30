import type { BoardTexture, DrawAnalysis } from "@pokurr/core"
import type { PRNG } from "./prng"
import type { VillainProfile } from "./opponent-model"

export type AggressionLevel = "passive" | "standard" | "aggressive" | "hyper"

export type ProfileParams = {
  aggression: AggressionLevel
  cbetFreq: number
  bluffToValueRatio: number
  floatFreq: number
  turnBarrelFreq: number
  riverBluffFreq: number
  drawAggression: "passive" | "standard" | "aggressive" | "hyper"
  threeBetBluffFreq: number
}

// ---------------------------------------------------------------------------
// Helper 1: sizingForTexture
// ---------------------------------------------------------------------------
export function sizingForTexture(
  texture: BoardTexture | null,
  equity: number,
  potSize: number,
  isBluff: boolean,
): number {
  if (texture === null) {
    return Math.max(1, Math.round(potSize * 0.66))
  }

  let fraction: number

  const wetness = texture.wetness ?? 0

  if (wetness <= 3) {
    // Dry board
    fraction = isBluff ? 0.33 : 0.45
  } else if (wetness <= 6) {
    // Medium board
    fraction = isBluff ? 0.60 : 0.58
  } else {
    // Wet board
    fraction = isBluff ? 0.80 : 0.72
  }

  // Paired board: reduce by ~10%
  if (texture.paired) {
    fraction *= 0.90
  }

  return Math.max(1, Math.round(potSize * fraction))
}

// ---------------------------------------------------------------------------
// Helper 2: drawDecisionOverride
// ---------------------------------------------------------------------------
export function drawDecisionOverride(
  draws: DrawAnalysis | null,
  context: {
    equity: number
    potOdds: number
    potSize: number
    toCall: number
    inPosition: boolean
    street: string
    effectiveStack: number
    spr: number
  },
  drawAggression: "passive" | "standard" | "aggressive" | "hyper",
  rng: PRNG,
): { action: string; amount?: number; reasoning?: string } | null {
  if (!draws) return null
  if (context.street === "preflop") return null

  const pot = context.potSize

  // Made flush or straight → value bet
  if (draws.madeFlush || draws.madeStraight) {
    const size = Math.max(1, Math.round(pot * (0.66 + rng.next() * 0.14)))
    if (context.toCall > 0) {
      return { action: "raise", amount: Math.max(context.toCall * 2, size), reasoning: "Value bet made hand" }
    }
    return { action: "bet", amount: size, reasoning: "Value bet made hand" }
  }

  // Passive draw aggression: never semibluff, only call with odds
  if (drawAggression === "passive") {
    if (context.toCall > 0 && context.equity >= context.potOdds) {
      return { action: "call", amount: context.toCall, reasoning: "Passive draw call with odds" }
    }
    return null
  }

  // Hyper draw aggression: always semibluff with any draw
  if (drawAggression === "hyper") {
    const hasAnyDraw = draws.flushDraw || draws.openEndedStraightDraw || draws.gutshot || draws.doubleGutshot || draws.totalOuts >= 4
    if (hasAnyDraw) {
      const size = Math.max(1, Math.round(pot * 0.70))
      if (context.toCall > 0) {
        return { action: "raise", amount: Math.max(context.toCall * 2, size), reasoning: "Hyper aggressive semibluff" }
      }
      return { action: "bet", amount: size, reasoning: "Hyper aggressive semibluff" }
    }
    return null
  }

  // Combo draw (totalOuts >= 12)
  if (draws.totalOuts >= 12) {
    if (context.street === "flop") {
      const size = Math.max(1, Math.round(pot * (0.60 + rng.next() * 0.15)))
      if (context.toCall > 0) {
        return { action: "raise", amount: Math.max(context.toCall * 2, size), reasoning: "Combo draw semibluff" }
      }
      return { action: "bet", amount: size, reasoning: "Combo draw semibluff" }
    }
    if (context.street === "turn") {
      if (drawAggression === "aggressive") {
        const size = Math.max(1, Math.round(pot * 0.65))
        if (context.toCall > 0) {
          return { action: "raise", amount: Math.max(context.toCall * 2, size), reasoning: "Aggressive combo draw barrel" }
        }
        return { action: "bet", amount: size, reasoning: "Aggressive combo draw barrel" }
      }
      // standard: check-call
      if (context.toCall > 0 && context.equity >= context.potOdds) {
        return { action: "call", amount: context.toCall, reasoning: "Combo draw check-call turn" }
      }
      return null
    }
  }

  // Flush draw (9 outs)
  if (draws.flushDraw && draws.flushDrawOuts >= 9) {
    const semibluffFreq = drawAggression === "aggressive" ? 0.80 : 0.60
    if (context.street === "flop") {
      if (rng.next() < semibluffFreq) {
        const size = Math.max(1, Math.round(pot * 0.60))
        if (context.toCall > 0) {
          return { action: "raise", amount: Math.max(context.toCall * 2, size), reasoning: "Flush draw semibluff" }
        }
        return { action: "bet", amount: size, reasoning: "Flush draw semibluff" }
      }
      if (context.toCall > 0 && context.equity >= context.potOdds) {
        return { action: "call", amount: context.toCall, reasoning: "Flush draw call" }
      }
      return null
    }
    if (context.street === "turn") {
      if (drawAggression === "aggressive") {
        const size = Math.max(1, Math.round(pot * 0.58))
        if (context.toCall > 0) {
          return { action: "raise", amount: Math.max(context.toCall * 2, size), reasoning: "Flush draw aggressive turn barrel" }
        }
        return { action: "bet", amount: size, reasoning: "Flush draw aggressive turn barrel" }
      }
      // standard: check-call
      if (context.toCall > 0 && context.equity >= context.potOdds) {
        return { action: "call", amount: context.toCall, reasoning: "Flush draw check-call turn" }
      }
      return null
    }
    if (context.street === "river") {
      // Missed flush draw on river
      if (context.toCall > 0) {
        return { action: "fold", reasoning: "Missed flush draw on river" }
      }
      return { action: "check", reasoning: "Missed flush draw on river" }
    }
  }

  // OESD (8 outs)
  if (draws.openEndedStraightDraw) {
    if (context.inPosition && context.street === "flop") {
      const size = Math.max(1, Math.round(pot * 0.55))
      if (context.toCall > 0) {
        if (drawAggression === "aggressive") {
          return { action: "raise", amount: Math.max(context.toCall * 2, size), reasoning: "OESD semibluff IP" }
        }
        if (context.equity >= context.potOdds) {
          return { action: "call", amount: context.toCall, reasoning: "OESD call IP" }
        }
      } else {
        return { action: "bet", amount: size, reasoning: "OESD semibluff IP" }
      }
    }
    // OOP: check-call if odds justify
    if (context.toCall > 0 && context.equity >= context.potOdds) {
      return { action: "call", amount: context.toCall, reasoning: "OESD check-call OOP" }
    }
    return null
  }

  // Gutshot (4 outs)
  if (draws.gutshot || draws.doubleGutshot) {
    const impliedOdds = context.toCall / Math.max(pot, 1)
    if (impliedOdds < 0.18 && context.toCall > 0) {
      return { action: "call", amount: context.toCall, reasoning: "Gutshot with pot odds" }
    }
    return null
  }

  return null
}

// ---------------------------------------------------------------------------
// Helper 3: cbetDecision
// ---------------------------------------------------------------------------
export function cbetDecision(
  texture: BoardTexture | null,
  draws: DrawAnalysis | null,
  context: {
    equity: number
    potSize: number
    inPosition: boolean
    isAggressor: boolean
    street: string
  },
  cbetFreq: number,
  rng: PRNG,
): { action: string; amount?: number; reasoning?: string } | null {
  if (!context.isAggressor || texture === null) return null
  if (context.street === "preflop") return null

  const wetness = texture.wetness ?? 0
  const hasComboDraws = draws !== null && draws.totalOuts >= 12

  let shouldCbet = false

  if (wetness <= 3) {
    // Dry board: higher c-bet frequency
    shouldCbet = rng.next() < Math.min(cbetFreq * 1.2, 0.95)
  } else if (wetness <= 6) {
    // Medium board: require some equity
    shouldCbet = context.equity > 0.38 && rng.next() < cbetFreq
  } else {
    // Wet board: need strong equity or combo draws
    shouldCbet = (context.equity > 0.50 || hasComboDraws) && rng.next() < cbetFreq
  }

  if (!shouldCbet) return null

  const isBluff = context.equity < 0.50
  const amount = sizingForTexture(texture, context.equity, context.potSize, isBluff)

  return { action: "bet", amount, reasoning: "C-bet" }
}

// ---------------------------------------------------------------------------
// Helper 4: SPR zone helpers
// ---------------------------------------------------------------------------
export function sprZone(spr: number): "committed" | "shallow" | "medium" | "deep" {
  if (spr < 3) return "committed"
  if (spr <= 7) return "shallow"
  if (spr <= 15) return "medium"
  return "deep"
}

export function sprAdjustedDecision(
  spr: number,
  equity: number,
  toCall: number,
  effectiveStack: number,
  potSize: number,
): { action: string; amount?: number; reasoning?: string } | null {
  if (spr < 3) {
    if (equity >= 0.40) {
      return { action: "all-in", reasoning: "Committed zone jam" }
    }
    if (toCall > 0) {
      return { action: "fold", reasoning: "Committed zone fold" }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Helper 5: PROFILE_PARAMS
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Helper 6: turnBarrelDecision
// ---------------------------------------------------------------------------
export function turnBarrelDecision(
  texture: BoardTexture | null,
  draws: DrawAnalysis | null,
  context: {
    equity: number
    potSize: number
    toCall: number
    inPosition: boolean
    isAggressor: boolean
    street: string
    spr: number
  },
  params: ProfileParams,
  rng: PRNG,
): { action: string; amount?: number; reasoning?: string } | null {
  if (context.street !== "turn") return null
  if (!context.isAggressor) return null
  if (context.toCall > 0) return null

  const wetness = texture?.wetness ?? 5
  const hasDraws = draws !== null && draws.totalOuts >= 4

  let barrelFreq = params.turnBarrelFreq

  // Texture adjustments
  if (wetness >= 7 && !hasDraws) {
    barrelFreq *= 0.80 // reduce by 20% on wet boards without draws
  } else if (wetness <= 3) {
    barrelFreq = Math.min(barrelFreq + 0.15, 1.0) // increase by 15% on dry boards
  }

  const isBluff = context.equity < 0.50

  if (context.equity > 0.60) {
    // Always barrel for value
    const amount = sizingForTexture(texture, context.equity, context.potSize, false)
    return { action: "bet", amount, reasoning: "Turn value barrel" }
  }

  if (context.equity >= 0.45) {
    // Barrel with probability turnBarrelFreq
    if (rng.next() < barrelFreq) {
      const amount = sizingForTexture(texture, context.equity, context.potSize, false)
      return { action: "bet", amount, reasoning: "Turn barrel medium equity" }
    }
    return null
  }

  // equity < 0.45: bluff barrel
  if (rng.next() < barrelFreq * params.bluffToValueRatio) {
    const amount = sizingForTexture(texture, context.equity, context.potSize, true)
    return { action: "bet", amount, reasoning: "Turn bluff barrel" }
  }

  return null
}

// ---------------------------------------------------------------------------
// Helper 7: riverDecision
// ---------------------------------------------------------------------------
export function riverDecision(
  texture: BoardTexture | null,
  context: {
    equity: number
    potOdds: number
    potSize: number
    toCall: number
    inPosition: boolean
    isAggressor: boolean
    checkedTo: boolean
    facingBet: boolean
    facingRaise: boolean
    facingThreeBet: boolean
    spr: number
  },
  params: ProfileParams,
  rng: PRNG,
  villainProfile?: VillainProfile | null,
): { action: string; amount?: number; reasoning?: string } | null {
  // When facing a bet
  if (context.toCall > 0) {
    let callingThreshold = context.facingRaise
      ? context.potOdds + 0.05 + 0.08
      : context.potOdds + 0.05

    // Villain profile adjustments on river
    if (villainProfile?.isPassive && context.facingBet) {
      callingThreshold += 0.08 // passive villain betting river = they have it
    } else if (villainProfile?.isAggressive && context.facingBet) {
      callingThreshold -= 0.05 // aggressive villain betting river = could be bluffing
    }

    if (context.equity >= 0.65) {
      const amount = Math.max(context.toCall * 2.5, context.potSize * 0.8)
      return { action: "raise", amount: Math.round(amount), reasoning: "River value raise" }
    }

    if (context.equity >= callingThreshold) {
      return { action: "call", amount: context.toCall, reasoning: "River call with equity edge" }
    }

    if (context.equity < context.potOdds) {
      // Hero-call frequency
      if (rng.next() < params.floatFreq * 0.3) {
        return { action: "call", amount: context.toCall, reasoning: "River hero call" }
      }
      return { action: "fold", reasoning: "River fold - insufficient equity" }
    }

    // equity between potOdds and callingThreshold
    return { action: "call", amount: context.toCall, reasoning: "River marginal call" }
  }

  // Checked to (no bet to face)
  if (context.equity > 0.55) {
    const amount = sizingForTexture(texture, context.equity, context.potSize, false)
    return { action: "bet", amount, reasoning: "River value bet" }
  }

  if (context.equity < 0.35 && context.inPosition) {
    if (rng.next() < params.riverBluffFreq) {
      const fraction = 0.55 + rng.next() * 0.15 // 55-70% pot
      const amount = Math.max(1, Math.round(context.potSize * fraction))
      return { action: "bet", amount, reasoning: "River bluff" }
    }
  }

  // Showdown value - check back
  return { action: "check", reasoning: "River check showdown value" }
}

// ---------------------------------------------------------------------------
// Helper 8: floatDecision
// ---------------------------------------------------------------------------
export function floatDecision(
  context: {
    equity: number
    potOdds: number
    potSize: number
    toCall: number
    inPosition: boolean
    street: string
    facingBet: boolean
    spr: number
  },
  params: ProfileParams,
  rng: PRNG,
): { action: string; amount?: number; reasoning?: string } | null {
  if (!context.inPosition) return null
  if (!context.facingBet) return null
  if (context.street === "river") return null
  if (context.street === "preflop") return null
  if (context.spr <= 4) return null

  // Only float when equity is below normal calling threshold but not too far below
  const normalCallThreshold = context.potOdds + 0.05
  if (context.equity >= normalCallThreshold) return null // would call normally
  if (context.equity < context.potOdds - 0.10) return null // too weak to float

  if (rng.next() < params.floatFreq) {
    return { action: "call", amount: context.toCall, reasoning: "Float in position" }
  }

  return null
}

// ---------------------------------------------------------------------------
// Helper 9: checkRaiseDecision
// ---------------------------------------------------------------------------
export function checkRaiseDecision(
  context: {
    equity: number
    potSize: number
    toCall: number
    inPosition: boolean
    facingBet: boolean
    street: string
    spr: number
    raiseCount: number
  },
  params: ProfileParams,
  rng: PRNG,
): { action: string; amount?: number; reasoning?: string } | null {
  if (context.inPosition) return null
  if (context.toCall <= 0) return null
  if (context.street === "preflop") return null

  const amount = Math.round(Math.max(context.toCall * 2.8, context.potSize * 0.85))

  // Re-raise when already facing a raise with very strong hand
  if (context.raiseCount >= 1 && context.equity >= 0.75) {
    return { action: "raise", amount, reasoning: "Check-re-raise with strong hand" }
  }

  // Value check-raise
  if (context.equity >= 0.70) {
    let xrFreq: number
    switch (params.aggression) {
      case "passive": xrFreq = 0.10; break
      case "standard": xrFreq = 0.20; break
      case "aggressive": xrFreq = 0.35; break
      case "hyper": xrFreq = 0.50; break
      default: xrFreq = 0.20
    }

    if (rng.next() < xrFreq) {
      return { action: "raise", amount, reasoning: "Check-raise for value" }
    }
  }

  // Flop bluff check-raise
  if (context.street === "flop" && context.equity >= 0.30 && context.equity <= 0.40) {
    const isAggressivePlus = params.aggression === "aggressive" || params.aggression === "hyper"
    const isStandardPlus = isAggressivePlus || params.aggression === "standard"
    const bluffXrFreq = isAggressivePlus ? 0.15 : isStandardPlus ? 0.08 : 0

    if (bluffXrFreq > 0 && rng.next() < bluffXrFreq) {
      return { action: "raise", amount, reasoning: "Check-raise bluff on flop" }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Helper 10: threeBetResponse
// ---------------------------------------------------------------------------
export function threeBetResponse(
  context: {
    equity: number
    potOdds: number
    potSize: number
    toCall: number
    effectiveStack: number
    facingThreeBet: boolean
    raiseCount: number
    spr: number
  },
  params: ProfileParams,
  rng: PRNG,
): { action: string; amount?: number; reasoning?: string } | null {
  if (!context.facingThreeBet || context.raiseCount < 2) return null

  const passiveAdj = params.aggression === "passive" ? 0.05 : 0
  const isAggressivePlus = params.aggression === "aggressive" || params.aggression === "hyper"

  // Facing 4-bet (raiseCount >= 3)
  if (context.raiseCount >= 3) {
    if (context.equity >= 0.62) {
      return { action: "all-in", reasoning: "Jam vs 4-bet with premium" }
    }
    if (context.equity >= context.potOdds + 0.10 + passiveAdj) {
      return { action: "call", amount: context.toCall, reasoning: "Reluctant call vs 4-bet" }
    }
    return { action: "fold", reasoning: "Fold to 4-bet" }
  }

  // Facing 3-bet (raiseCount === 2)
  if (context.equity >= 0.58) {
    if (context.spr < 5) {
      return { action: "all-in", reasoning: "All-in vs 3-bet (shallow)" }
    }
    const amount = Math.round(context.toCall * 2.2)
    return { action: "raise", amount, reasoning: "4-bet for value" }
  }

  // Aggressive/hyper: 4-bet bluff frequency
  if (context.equity < context.potOdds + 0.08 + passiveAdj) {
    const bluffFreq = params.threeBetBluffFreq
    if (rng.next() < bluffFreq) {
      if (context.spr < 5) {
        return { action: "all-in", reasoning: "4-bet bluff jam" }
      }
      const amount = Math.round(context.toCall * 2.2)
      return { action: "raise", amount, reasoning: "4-bet bluff" }
    }
  }

  if (context.equity >= context.potOdds + 0.08 + passiveAdj) {
    return { action: "call", amount: context.toCall, reasoning: "Call 3-bet" }
  }

  return { action: "fold", reasoning: "Fold to 3-bet" }
}

// ---------------------------------------------------------------------------
// PROFILE_PARAMS
// ---------------------------------------------------------------------------
export const PROFILE_PARAMS: Record<string, ProfileParams> = {
  nit: {
    aggression: "passive",
    cbetFreq: 0.40,
    bluffToValueRatio: 0.20,
    floatFreq: 0.05,
    turnBarrelFreq: 0.30,
    riverBluffFreq: 0.05,
    drawAggression: "passive",
    threeBetBluffFreq: 0.0,
  },
  tag: {
    aggression: "standard",
    cbetFreq: 0.65,
    bluffToValueRatio: 0.33,
    floatFreq: 0.12,
    turnBarrelFreq: 0.55,
    riverBluffFreq: 0.18,
    drawAggression: "standard",
    threeBetBluffFreq: 0.05,
  },
  "tight-aggressive": {
    aggression: "standard",
    cbetFreq: 0.65,
    bluffToValueRatio: 0.33,
    floatFreq: 0.12,
    turnBarrelFreq: 0.55,
    riverBluffFreq: 0.18,
    drawAggression: "standard",
    threeBetBluffFreq: 0.05,
  },
  balanced: {
    aggression: "standard",
    cbetFreq: 0.60,
    bluffToValueRatio: 0.50,
    floatFreq: 0.18,
    turnBarrelFreq: 0.50,
    riverBluffFreq: 0.25,
    drawAggression: "standard",
    threeBetBluffFreq: 0.08,
  },
  tricky: {
    aggression: "standard",
    cbetFreq: 0.50,
    bluffToValueRatio: 0.50,
    floatFreq: 0.25,
    turnBarrelFreq: 0.40,
    riverBluffFreq: 0.20,
    drawAggression: "standard",
    threeBetBluffFreq: 0.10,
  },
  pressure: {
    aggression: "aggressive",
    cbetFreq: 0.75,
    bluffToValueRatio: 0.67,
    floatFreq: 0.15,
    turnBarrelFreq: 0.65,
    riverBluffFreq: 0.35,
    drawAggression: "aggressive",
    threeBetBluffFreq: 0.12,
  },
  lag: {
    aggression: "aggressive",
    cbetFreq: 0.70,
    bluffToValueRatio: 0.67,
    floatFreq: 0.20,
    turnBarrelFreq: 0.60,
    riverBluffFreq: 0.30,
    drawAggression: "aggressive",
    threeBetBluffFreq: 0.15,
  },
  maniac: {
    aggression: "hyper",
    cbetFreq: 0.85,
    bluffToValueRatio: 1.0,
    floatFreq: 0.30,
    turnBarrelFreq: 0.75,
    riverBluffFreq: 0.45,
    drawAggression: "hyper",
    threeBetBluffFreq: 0.25,
  },
  "short-stack": {
    aggression: "standard",
    cbetFreq: 0.55,
    bluffToValueRatio: 0.50,
    floatFreq: 0.08,
    turnBarrelFreq: 0.50,
    riverBluffFreq: 0.15,
    drawAggression: "aggressive",
    threeBetBluffFreq: 0.08,
  },
  "calling-station": {
    aggression: "passive",
    cbetFreq: 0.30,
    bluffToValueRatio: 0.10,
    floatFreq: 0.40,
    turnBarrelFreq: 0.20,
    riverBluffFreq: 0.05,
    drawAggression: "passive",
    threeBetBluffFreq: 0.02,
  },
  "loose-passive": {
    aggression: "passive",
    cbetFreq: 0.30,
    bluffToValueRatio: 0.10,
    floatFreq: 0.40,
    turnBarrelFreq: 0.20,
    riverBluffFreq: 0.05,
    drawAggression: "passive",
    threeBetBluffFreq: 0.02,
  },
  random: {
    aggression: "standard",
    cbetFreq: 0.50,
    bluffToValueRatio: 0.50,
    floatFreq: 0.15,
    turnBarrelFreq: 0.50,
    riverBluffFreq: 0.25,
    drawAggression: "standard",
    threeBetBluffFreq: 0.10,
  },
}
