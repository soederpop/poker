import { z } from "zod"
import { FeatureStateSchema, FeatureOptionsSchema } from "@soederpop/luca"
import { Feature, features } from "@soederpop/luca"
import { Range, equityEngine } from "@pokurr/core"

import { PRNG } from "../lib/prng"
import { parseExactHand } from "../lib/cards"
import { STRATEGY_PROFILES, type PokerPosition as StrategyPokerPosition, type StrategyProfile } from "../lib/strategy-profiles"

export type PokerAction = "fold" | "check" | "call" | "bet" | "raise" | "all-in"
export type PokerPosition = StrategyPokerPosition
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

const PROFILE_DEFS = STRATEGY_PROFILES

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

    if (profileName === "balanced") {
      return this.balancedDecision(context, rng)
    }

    if (profileName === "tricky") {
      return this.trickyDecision(context, rng)
    }

    if (profileName === "pressure") {
      return this.pressureDecision(context, rng)
    }

    if (profileName === "short-stack") {
      return this.shortStackDecision(context, rng)
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

  private balancedDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      if (context.estimatedEquity >= Math.max(context.potOdds + 0.08, 0.52)) {
        const raiseTo = Math.max(context.toCall * 2.1, Math.round(context.potSize * 0.72))
        return { action: "raise", amount: raiseTo, source: "rules" }
      }

      if (context.inPosition && context.estimatedEquity >= context.potOdds - 0.03 && rng.next() < 0.18) {
        return { action: "call", amount: context.toCall, source: "rules", reasoning: "Balanced float continue" }
      }

      if (context.estimatedEquity >= Math.max(context.potOdds, 0.31)) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      return { action: "fold", source: "rules" }
    }

    if (context.estimatedEquity > 0.64) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.7)), source: "rules" }
    }

    if (context.checkedTo && (context.estimatedEquity > 0.5 || (context.inPosition && rng.next() < 0.28))) {
      const size = context.estimatedEquity > 0.57 ? 0.58 : 0.45
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * size)), source: "rules" }
    }

    return { action: "check", source: "rules" }
  }

  private trickyDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      if (context.estimatedEquity >= 0.72) {
        if (rng.next() < 0.45) {
          const raiseTo = Math.max(context.toCall * 2, Math.round(context.potSize * 0.68))
          return { action: "raise", amount: raiseTo, source: "rules", reasoning: "Trap then spring raise" }
        }
        return { action: "call", amount: context.toCall, source: "rules", reasoning: "Disguised strong continue" }
      }

      if (context.inPosition && context.estimatedEquity >= context.potOdds - 0.02) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      if (context.facingRaise && context.estimatedEquity >= Math.max(context.potOdds + 0.1, 0.5)) {
        return { action: "call", amount: context.toCall, source: "rules", reasoning: "Tricky defend versus raise" }
      }

      if (rng.next() < 0.08 && context.toCall < context.effectiveStack * 0.12) {
        const raiseTo = Math.max(context.toCall * 2.3, Math.round(context.potSize * 0.75))
        return { action: "raise", amount: raiseTo, source: "rules", reasoning: "Low-frequency tricky bluff raise" }
      }

      if (context.estimatedEquity >= context.potOdds) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      return { action: "fold", source: "rules" }
    }

    if (context.estimatedEquity > 0.68 && rng.next() < 0.55) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.72)), source: "rules" }
    }

    if (context.inPosition && context.checkedTo && context.estimatedEquity > 0.47 && rng.next() < 0.33) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.5)), source: "rules" }
    }

    if (!context.inPosition && context.checkedTo && context.estimatedEquity > 0.58 && rng.next() < 0.2) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.55)), source: "rules" }
    }

    return { action: "check", source: "rules" }
  }

  private pressureDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      if (context.estimatedEquity >= Math.max(context.potOdds + 0.04, 0.44)) {
        const raiseTo = Math.max(context.toCall * 2.2, Math.round(context.potSize * 0.82))
        return { action: "raise", amount: raiseTo, source: "rules" }
      }

      if (context.inPosition && context.estimatedEquity >= context.potOdds - 0.03) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      if (rng.next() < 0.12 && context.toCall < context.effectiveStack * 0.15) {
        const raiseTo = Math.max(context.toCall * 2.5, Math.round(context.potSize * 0.9))
        return { action: "raise", amount: raiseTo, source: "rules", reasoning: "Pressure bluff raise" }
      }

      if (context.estimatedEquity >= context.potOdds) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      return { action: "fold", source: "rules" }
    }

    if (context.checkedTo && (context.estimatedEquity > 0.4 || rng.next() < 0.38)) {
      const size = context.estimatedEquity > 0.6 ? 0.8 : 0.55
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * size)), source: "rules" }
    }

    if (context.estimatedEquity > 0.58) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.68)), source: "rules" }
    }

    return { action: "check", source: "rules" }
  }

  private shortStackDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    const shallowPressure = context.effectiveStack <= Math.max(context.potSize * 2.5, context.toCall * 5)

    if (context.toCall > 0) {
      if (shallowPressure && context.estimatedEquity >= Math.max(context.potOdds, 0.42)) {
        return { action: "all-in", source: "rules", reasoning: "Short-stack leverage jam" }
      }

      if (context.estimatedEquity >= Math.max(context.potOdds + 0.07, 0.56)) {
        return { action: "all-in", source: "rules" }
      }

      if (context.estimatedEquity >= Math.max(context.potOdds, 0.35)) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      return { action: "fold", source: "rules" }
    }

    if (shallowPressure && (context.estimatedEquity > 0.54 || rng.next() < 0.18)) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.62)), source: "rules" }
    }

    if (context.checkedTo && context.estimatedEquity > 0.48 && rng.next() < 0.28) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.45)), source: "rules" }
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
      if (context.estimatedEquity >= Math.max(context.potOdds + 0.20, 0.65)) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      if (context.estimatedEquity >= 0.80) {
        const raiseTo = Math.max(context.toCall * 2, Math.round(context.potSize * 0.75))
        return { action: "raise", amount: raiseTo, source: "rules" }
      }

      return { action: "fold", source: "rules" }
    }

    if (context.estimatedEquity > 0.72) {
      return { action: "bet", amount: Math.max(1, Math.round(context.potSize * 0.6)), source: "rules" }
    }

    return { action: "check", source: "rules" }
  }

  private lagDecision(context: DecisionContext, rng: PRNG): StrategyDecision {
    if (context.toCall > 0) {
      if (context.estimatedEquity >= Math.max(context.potOdds + 0.05, 0.42)) {
        const raiseTo = Math.max(context.toCall * 2, Math.round(context.potSize * 0.75))
        return { action: "raise", amount: raiseTo, source: "rules" }
      }

      if (context.inPosition && context.estimatedEquity >= context.potOdds - 0.05) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      if (rng.next() < 0.18 && context.toCall < context.effectiveStack * 0.15) {
        const raiseTo = Math.max(context.toCall * 2.5, Math.round(context.potSize * 0.8))
        return { action: "raise", amount: raiseTo, source: "rules", reasoning: "LAG bluff raise" }
      }

      if (context.estimatedEquity >= context.potOdds) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      return { action: "fold", source: "rules" }
    }

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
      if (rng.next() < 0.55 && context.toCall < context.effectiveStack * 0.4) {
        const raiseTo = Math.max(context.toCall * 2.5, Math.round(context.potSize * 0.9))
        return { action: "raise", amount: raiseTo, source: "rules" }
      }

      if (context.estimatedEquity >= 0.55 || context.effectiveStack <= context.toCall * 2.5) {
        return { action: "all-in", source: "rules" }
      }

      if (context.estimatedEquity >= context.potOdds - 0.10) {
        return { action: "call", amount: context.toCall, source: "rules" }
      }

      return rng.next() < 0.30 ? { action: "fold", source: "rules" } : { action: "call", amount: context.toCall, source: "rules" }
    }

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
