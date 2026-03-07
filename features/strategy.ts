import { z } from "zod"
import { FeatureStateSchema, FeatureOptionsSchema } from "@soederpop/luca"
import { Feature, features } from "@soederpop/luca"
import type { ContainerContext } from "@soederpop/luca"
import { Range, equityEngine } from "@pokurr/core"

import { PRNG } from "../lib/prng"
import { parseExactHand } from "../lib/cards"

export type PokerAction = "fold" | "check" | "call" | "bet" | "raise" | "all-in"
export type PokerPosition = "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB"
export type EquityBackendPreference = "wasm"

export type DecisionContext = {
  heroCards: [string, string]
  board: string[]
  street: "preflop" | "flop" | "turn" | "river"
  position: PokerPosition
  inPosition: boolean
  checkedTo: boolean
  potSize: number
  toCall: number
  effectiveStack: number
  playersInHand: number
  playersLeftToAct: number
  facingBet: boolean
  facingRaise: boolean
  facingThreeBet: boolean
  villainCards?: [string, string]
  villainRange?: string
  estimatedEquity: number
  potOdds: number
}

export type StrategyDecision = {
  action: PokerAction
  amount?: number
  source: "rules" | "fallback" | "llm"
  reasoning?: string
}

type StrategyProfile = {
  name: string
  description: string
  openRanges: Partial<Record<PokerPosition, string>>
  llmFallback?: boolean
}

declare module "@soederpop/luca" {
  interface AvailableFeatures {
    strategy: typeof Strategy
  }
}

export const StrategyStateSchema = FeatureStateSchema.extend({
  strategies: z.array(z.string()).default([]),
})

export type StrategyState = z.infer<typeof StrategyStateSchema>

export const StrategyOptionsSchema = FeatureOptionsSchema.extend({
  defaultProfile: z.string().default("tight-aggressive"),
  llmModel: z.string().default("gpt-4.1-mini"),
})

export type StrategyOptions = z.infer<typeof StrategyOptionsSchema>

const PROFILE_DEFS: Record<string, StrategyProfile> = {
  "tight-aggressive": {
    name: "tight-aggressive",
    description: "Disciplined ranges with high aggression when equity edge is strong.",
    openRanges: {
      UTG: "QQ+,AKs,AKo,AQs",
      MP: "TT+,AQs+,AKo,KQs",
      CO: "88+,ATs+,KJs+,QJs,AJo+,KQo",
      BTN: "66+,A8s+,K9s+,QTs+,JTs,ATo+,KJo+,QJo",
      SB: "77+,A8s+,KTs+,QTs+,JTs,AJo+,KQo",
      BB: "55+,A5s+,KTs+,QTs+,JTs,AJo+,KQo",
    },
  },
  "loose-passive": {
    name: "loose-passive",
    description: "Plays too many hands and leans toward checking and calling.",
    openRanges: {
      UTG: "99+,AJs+,KQs,AQo+",
      MP: "77+,ATs+,KTs+,QTs+,AJo+,KQo",
      CO: "55+,A5s+,K9s+,Q9s+,J9s+,T9s,A9o+,KTo+,QTo+,JTo",
      BTN: "22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,86s+,75s+,65s,A2o+,K8o+,Q9o+,J9o+,T9o",
      SB: "22+,A2s+,K8s+,Q9s+,J9s+,T9s,98s,87s,76s,A8o+,KTo+,QTo+,JTo",
      BB: "22+,A2s+,K2s+,Q5s+,J7s+,T7s+,97s+,87s,76s,65s,A2o+,K8o+,Q9o+,J9o+,T9o",
    },
  },
  random: {
    name: "random",
    description: "Mostly random legal actions with lightweight weighting.",
    openRanges: {
      UTG: "22+,A2s+,K2s+,Q2s+,J2s+,T2s+,92s+,82s+,72s+,62s+,52s+,42s+,32s+,A2o+,K2o+,Q2o+,J2o+,T2o+,92o+,82o+,72o+,62o+,52o+,42o+,32o+",
      MP: "22+,A2s+,K2s+,Q2s+,J2s+,T2s+,92s+,82s+,72s+,62s+,52s+,42s+,32s+,A2o+,K2o+,Q2o+,J2o+,T2o+,92o+,82o+,72o+,62o+,52o+,42o+,32o+",
      CO: "22+,A2s+,K2s+,Q2s+,J2s+,T2s+,92s+,82s+,72s+,62s+,52s+,42s+,32s+,A2o+,K2o+,Q2o+,J2o+,T2o+,92o+,82o+,72o+,62o+,52o+,42o+,32o+",
      BTN: "22+,A2s+,K2s+,Q2s+,J2s+,T2s+,92s+,82s+,72s+,62s+,52s+,42s+,32s+,A2o+,K2o+,Q2o+,J2o+,T2o+,92o+,82o+,72o+,62o+,52o+,42o+,32o+",
      SB: "22+,A2s+,K2s+,Q2s+,J2s+,T2s+,92s+,82s+,72s+,62s+,52s+,42s+,32s+,A2o+,K2o+,Q2o+,J2o+,T2o+,92o+,82o+,72o+,62o+,52o+,42o+,32o+",
      BB: "22+,A2s+,K2s+,Q2s+,J2s+,T2s+,92s+,82s+,72s+,62s+,52s+,42s+,32s+,A2o+,K2o+,Q2o+,J2o+,T2o+,92o+,82o+,72o+,62o+,52o+,42o+,32o+",
    },
    llmFallback: false,
  },
  nit: {
    name: "nit",
    description: "Ultra-tight, only plays premium holdings. Folds most hands, rarely bluffs.",
    openRanges: {
      UTG: "QQ+,AKs",
      MP: "JJ+,AKs,AKo",
      CO: "TT+,AKs,AKo,AQs",
      BTN: "99+,AQs+,AKo",
      SB: "TT+,AKs,AKo,AQs",
      BB: "99+,AQs+,AKo",
    },
    llmFallback: false,
  },
  tag: {
    name: "tag",
    description: "Tight-aggressive: disciplined hand selection with strong aggression on made hands.",
    openRanges: {
      UTG: "QQ+,AKs,AKo,AQs",
      MP: "TT+,AQs+,AKo,KQs",
      CO: "88+,ATs+,KJs+,QJs,AJo+,KQo",
      BTN: "66+,A8s+,K9s+,QTs+,JTs,ATo+,KJo+,QJo",
      SB: "77+,A8s+,KTs+,QTs+,JTs,AJo+,KQo",
      BB: "55+,A5s+,KTs+,QTs+,JTs,AJo+,KQo",
    },
    llmFallback: false,
  },
  lag: {
    name: "lag",
    description: "Loose-aggressive: wide range selection with frequent bets, raises, and bluffs.",
    openRanges: {
      UTG: "77+,ATs+,KJs+,QJs,JTs,AJo+,KQo",
      MP: "55+,A8s+,K9s+,QTs+,JTs,T9s,ATo+,KJo+,QJo",
      CO: "33+,A5s+,K7s+,Q9s+,J9s+,T8s+,98s,87s,A8o+,KTo+,QTo+,JTo",
      BTN: "22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,86s+,76s,65s,A5o+,K9o+,Q9o+,J9o+,T9o",
      SB: "22+,A2s+,K8s+,Q9s+,J9s+,T9s,98s,87s,76s,A7o+,KTo+,QTo+,JTo",
      BB: "22+,A2s+,K5s+,Q7s+,J8s+,T7s+,97s+,87s,76s,65s,A5o+,K9o+,Q9o+,J9o+,T9o",
    },
    llmFallback: false,
  },
  "calling-station": {
    name: "calling-station",
    description: "Plays too many hands, rarely raises or folds when facing action. Calls with marginal holdings.",
    openRanges: {
      UTG: "99+,AJs+,KQs,AQo+",
      MP: "77+,ATs+,KTs+,QTs+,AJo+,KQo",
      CO: "55+,A5s+,K9s+,Q9s+,J9s+,T9s,A9o+,KTo+,QTo+,JTo",
      BTN: "22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,86s+,75s+,65s,A2o+,K8o+,Q9o+,J9o+,T9o",
      SB: "22+,A2s+,K8s+,Q9s+,J9s+,T9s,98s,87s,76s,A8o+,KTo+,QTo+,JTo",
      BB: "22+,A2s+,K2s+,Q5s+,J7s+,T7s+,97s+,87s,76s,65s,A2o+,K8o+,Q9o+,J9o+,T9o",
    },
    llmFallback: false,
  },
  maniac: {
    name: "maniac",
    description: "Hyper-aggressive: bets and raises at every opportunity, wide open ranges, loves action.",
    openRanges: {
      UTG: "55+,A5s+,K9s+,QTs+,JTs,T9s,ATo+,KJo+,QJo",
      MP: "33+,A3s+,K7s+,Q9s+,J9s+,T8s+,98s,87s,A8o+,KTo+,QTo+,JTo",
      CO: "22+,A2s+,K5s+,Q8s+,J8s+,T7s+,97s+,86s+,76s,65s,A5o+,K9o+,Q9o+,J9o+,T9o",
      BTN: "22+,A2s+,K2s+,Q5s+,J7s+,T7s+,97s+,86s+,75s+,65s,54s,A2o+,K5o+,Q8o+,J8o+,T8o+,98o",
      SB: "22+,A2s+,K2s+,Q7s+,J8s+,T7s+,97s+,86s+,76s,65s,A2o+,K8o+,Q9o+,J9o+,T9o",
      BB: "22+,A2s+,K2s+,Q5s+,J7s+,T7s+,97s+,86s+,76s,65s,54s,A2o+,K5o+,Q8o+,J8o+,T8o+,98o",
    },
    llmFallback: false,
  },
}

export class Strategy extends Feature<StrategyState, StrategyOptions> {
  static override shortcut = "features.strategy" as const
  static override stateSchema = StrategyStateSchema
  static override optionsSchema = StrategyOptionsSchema
  static override description = "Poker strategy profiles, action selection, and deterministic range sampling."

  override get initialState(): StrategyState {
    return {
      ...super.initialState,
      strategies: Object.keys(PROFILE_DEFS),
    }
  }

  listProfiles(): string[] {
    return [...(this.state.get("strategies") || [])]
  }

  profile(name?: string): StrategyProfile {
    const key = name || this.options.defaultProfile
    return PROFILE_DEFS[key] || PROFILE_DEFS[this.options.defaultProfile] || PROFILE_DEFS["tight-aggressive"]
  }

  rangeForProfile(name: string, position: PokerPosition = "BTN"): string {
    const profile = this.profile(name)
    return profile.openRanges[position] || profile.openRanges.BTN || ""
  }

  sampleRangeHand(
    name: string,
    deadCards: string[],
    rng: PRNG,
    position: PokerPosition = "BTN",
  ): [string, string] {
    const fromRange = this.rangeForProfile(name, position)

    let combos = fromRange ? new Range(fromRange, deadCards).combos : []
    if (combos.length === 0) {
      combos = Range.combos.filter((combo) => !deadCards.some((deadCard) => combo.name.includes(deadCard)))
    }

    if (combos.length === 0) {
      throw new Error("No valid combos left after excluding dead cards")
    }

    const selected = rng.pick(combos)
    return parseExactHand(selected.name)
  }

  async estimateEquity(context: Omit<DecisionContext, "estimatedEquity" | "potOdds">): Promise<number> {
    if (context.villainCards) {
      const result = await equityEngine.equityWithBackend(
        "wasm",
        [context.heroCards, context.villainCards],
        context.board,
        3000,
      )

      const hero = result[0]
      return (hero.bestHandCount / Math.max(hero.possibleHandsCount, 1))
    }

    if (context.villainRange) {
      const result = await equityEngine.rangeEquityWithBackend(
        "wasm",
        context.heroCards.join(""),
        context.villainRange,
        { board: context.board.join(""), iterations: 4000 },
      )

      return result.ours / 100
    }

    return 0.5
  }

  async decide(
    profileName: string,
    contextInput: Omit<DecisionContext, "estimatedEquity" | "potOdds">,
    options: {
      rng?: PRNG
    } = {},
  ): Promise<StrategyDecision> {
    const rng = options.rng || new PRNG(Date.now())
    const estimatedEquity = await this.estimateEquity(contextInput)
    const potOdds = contextInput.toCall > 0
      ? contextInput.toCall / Math.max(contextInput.potSize + contextInput.toCall, 1)
      : 0

    const context: DecisionContext = {
      ...contextInput,
      estimatedEquity,
      potOdds,
    }

    if (profileName === "random") {
      return this.randomDecision(context, rng)
    }

    if (profileName === "loose-passive" || profileName === "calling-station") {
      return this.loosePassiveDecision(context, rng)
    }

    if (profileName === "tight-aggressive" || profileName === "tag") {
      return this.tightAggressiveDecision(context, rng)
    }

    if (profileName === "nit") {
      return this.nitDecision(context, rng)
    }

    if (profileName === "lag") {
      return this.lagDecision(context, rng)
    }

    if (profileName === "maniac") {
      return this.maniacDecision(context, rng)
    }

    const llm = await this.askLlm(profileName, context)
    if (llm) {
      return llm
    }

    return context.toCall > 0
      ? { action: "fold", source: "fallback", reasoning: "Unknown profile fallback" }
      : { action: "check", source: "fallback", reasoning: "Unknown profile fallback" }
  }

  private randomDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      const roll = rng.next()
      if (roll < 0.45) {
        return { action: "fold", source: "rules" }
      }
      if (roll < 0.85) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }
      const raiseTo = Math.max(context.toCall * 2, Math.round(context.potSize * 0.66))
      return { action: "raise", amount: raiseTo, source: "rules" }
    }

    const roll = rng.next()
    if (roll < 0.55) {
      return { action: "check", source: "rules" }
    }

    return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.5)), source: "rules" }
  }

  private tightAggressiveDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      if (context.estimatedEquity >= Math.max(context.potOdds + 0.12, 0.58)) {
        const raiseTo = Math.max(context.toCall * 2, Math.round(context.potSize * 0.75))
        return { action: "raise", amount: raiseTo, source: "rules" }
      }

      if (context.estimatedEquity >= Math.max(context.potOdds, 0.36)) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      return { action: "fold", source: "rules" }
    }

    if (context.estimatedEquity > 0.6) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.66)), source: "rules" }
    }

    if (context.inPosition && context.checkedTo && context.estimatedEquity > 0.45 && rng.next() < 0.4) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.5)), source: "rules" }
    }

    return { action: "check", source: "rules" }
  }

  private loosePassiveDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      if (context.estimatedEquity >= context.potOdds - 0.03) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      if (rng.next() < 0.12) {
        return { action: "call", amount: context.toCall, source: "rules", reasoning: "Loose over-call frequency" }
      }

      return { action: "fold", source: "rules" }
    }

    if (rng.next() < 0.15 && context.estimatedEquity > 0.5) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.4)), source: "rules" }
    }

    return { action: "check", source: "rules" }
  }

  private nitDecision(context: DecisionContext, _rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      // Only continue with strong equity advantage
      if (context.estimatedEquity >= Math.max(context.potOdds + 0.20, 0.65)) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      // Very strong hands: slow-raise
      if (context.estimatedEquity >= 0.80) {
        const raiseTo = Math.max(context.toCall * 2, Math.round(context.potSize * 0.75))
        return { action: "raise", amount: raiseTo, source: "rules" }
      }

      return { action: "fold", source: "rules" }
    }

    // Only bet with very strong hands
    if (context.estimatedEquity > 0.72) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.6)), source: "rules" }
    }

    return { action: "check", source: "rules" }
  }

  private lagDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      // Raise with decent equity or as a bluff
      if (context.estimatedEquity >= Math.max(context.potOdds + 0.05, 0.42)) {
        const raiseTo = Math.max(context.toCall * 2, Math.round(context.potSize * 0.75))
        return { action: "raise", amount: raiseTo, source: "rules" }
      }

      // Float call with marginal hands in position
      if (context.inPosition && context.estimatedEquity >= context.potOdds - 0.05) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      // Bluff raise sometimes
      if (rng.next() < 0.18 && context.toCall < context.effectiveStack * 0.15) {
        const raiseTo = Math.max(context.toCall * 2.5, Math.round(context.potSize * 0.8))
        return { action: "raise", amount: raiseTo, source: "rules", reasoning: "LAG bluff raise" }
      }

      if (context.estimatedEquity >= context.potOdds) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      return { action: "fold", source: "rules" }
    }

    // Bet frequently as aggressor
    if (context.estimatedEquity > 0.45 || rng.next() < 0.35) {
      const size = context.estimatedEquity > 0.6
        ? Math.round(context.potSize * 0.75)
        : Math.round(context.potSize * 0.5)
      return { action: "bet", amount: Math.max(1, size), source: "rules" }
    }

    return { action: "check", source: "rules" }
  }

  private maniacDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      // Raise most of the time
      if (rng.next() < 0.55 && context.toCall < context.effectiveStack * 0.4) {
        const raiseTo = Math.max(context.toCall * 2.5, Math.round(context.potSize * 0.9))
        return { action: "raise", amount: raiseTo, source: "rules" }
      }

      // All-in with short-ish stacks or big equity
      if (context.estimatedEquity >= 0.55 || context.effectiveStack <= context.toCall * 2.5) {
        return { action: "all-in", source: "rules" }
      }

      // Still calls light
      if (context.estimatedEquity >= context.potOdds - 0.10) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      // Even folds occasionally
      return rng.next() < 0.30 ? { action: "fold", source: "rules" } : { action: "call", amount: context.toCall, source: "rules" }
    }

    // Bet almost always when checked to
    if (rng.next() < 0.80) {
      const size = Math.round(Math.max(context.potSize * 0.8, 1))
      return { action: "bet", amount: size, source: "rules" }
    }

    return { action: "check", source: "rules" }
  }

  private async askLlm(profileName: string, context: DecisionContext): Promise<StrategyDecision | null> {
    const profile = this.profile(profileName)

    if (!profile.llmFallback) {
      return null
    }

    try {
      const conversation = await (this.container as any).conversation({
        model: this.options.llmModel,
        systemPrompt: "You are a poker decision engine. Respond with JSON only.",
      })

      const reply = await conversation.ask(`
Profile: ${profile.name}
Description: ${profile.description}
Street: ${context.street}
HeroCards: ${context.heroCards.join("")}
Board: ${context.board.join("")}
PotSize: ${context.potSize}
ToCall: ${context.toCall}
EquityEstimate: ${(context.estimatedEquity * 100).toFixed(2)}%
PotOdds: ${(context.potOdds * 100).toFixed(2)}%
Position: ${context.position}
InPosition: ${context.inPosition}

Return one JSON object like:
{"action":"fold|check|call|bet|raise|all-in","amount":number,"reasoning":"short reason"}
      `.trim())

      const parsed = JSON.parse(reply)
      const action = String(parsed?.action || "").toLowerCase() as PokerAction
      if (!["fold", "check", "call", "bet", "raise", "all-in"].includes(action)) {
        return null
      }

      const amount = parsed?.amount !== undefined ? Number(parsed.amount) : undefined
      return {
        action,
        ...(Number.isFinite(amount) ? { amount } : {}),
        source: "llm",
        reasoning: typeof parsed?.reasoning === "string" ? parsed.reasoning : undefined,
      }
    } catch {
      return null
    }
  }
}

export default features.register("strategy", Strategy)
