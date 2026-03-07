const actor = {
  id: "maniac",
  displayName: "House Maniac",
  description: "High-volatility baseline that pushes aggression whenever legal.",
  profileName: "maniac",
  decide(context: any) {
    const legal = Array.isArray(context?.legalActions) ? context.legalActions.map((entry: unknown) => String(entry)) : []
    const toCall = Number(context?.toCall || 0)
    const pot = Number(context?.potSize || 0)
    const bigBlind = Math.max(1, Number(context?.bigBlind || 2))
    const stack = Math.max(0, Number(context?.stack || 0))

    const can = (action: string) => legal.includes(action)
    const roll = Math.random()

    if (toCall > 0) {
      if (roll < 0.62 && can("raise")) return { action: "raise", amount: Math.max(toCall * 2, Math.round(Math.max(bigBlind * 4, pot * 1.1))) }
      if (roll < 0.90 && can("call")) return { action: "call", amount: toCall }
      if (can("all-in") && stack > 0) return { action: "all-in" }
      return { action: can("fold") ? "fold" : "call", amount: toCall > 0 ? toCall : undefined }
    }

    if (roll < 0.82 && can("bet")) return { action: "bet", amount: Math.max(bigBlind, Math.round(Math.max(bigBlind * 2, pot * 0.95))) }
    return { action: can("check") ? "check" : "bet", amount: Math.max(bigBlind, Math.round(Math.max(bigBlind * 2, pot * 0.95))) }
  },
}

export default actor
