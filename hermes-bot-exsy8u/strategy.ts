/// <reference path="./types/pokurr.d.ts" />
// Types and globals provided by pokurr — see types/pokurr.d.ts for full API.
// Regenerate types with: pokurr types

// Seeded from house actor style: tag

import type { PokerAction, DecisionContext, StrategyDecision } from "./types/pokurr"

function can(action: PokerAction, context: DecisionContext): boolean {
  return context.legalActions.includes(action)
}

export function decide(context: DecisionContext): StrategyDecision {
  const combo = normalizeCombo(context.heroCards)
  const potOdds = context.toCall / Math.max(context.potSize + context.toCall, 1)

  // Example: use Range to check if we're in a premium range
  const premiums = new Range("QQ+,AKs")
  const opens = new Range("22+,A2s+,K9s+,Q9s+,J9s+,T9s,A9o+,KTo+,QTo+,JTo")

  if (context.toCall <= 0) {
    if (premiums.includes(combo) && can("raise", context)) {
      return { action: "raise", amount: Math.floor(context.potSize * 0.75), reason: "premium-raise" }
    }
    if (opens.includes(combo) && can("bet", context)) {
      return { action: "bet", amount: Math.floor(context.potSize * 0.5), reason: "open-bet" }
    }
    if (can("check", context)) {
      return { action: "check", reason: "check-back" }
    }
  }

  if (context.toCall > 0) {
    if (premiums.includes(combo) && can("raise", context)) {
      return { action: "raise", amount: context.toCall * 3, reason: "premium-3bet" }
    }
    if (potOdds <= 0.25 && opens.includes(combo) && can("call", context)) {
      return { action: "call", reason: "pot-odds-call" }
    }
    if (can("fold", context)) {
      return { action: "fold", reason: "discipline-fold" }
    }
  }

  if (can("check", context)) {
    return { action: "check", reason: "fallback-check" }
  }
  return { action: "fold", reason: "fallback-fold" }
}
