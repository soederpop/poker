const actor = {
  id: "nit",
  displayName: "House Nit",
  description: "Ultra-tight baseline that avoids marginal spots and big variance.",
  profileName: "nit",
  decide(context: any) {
    const legal = Array.isArray(context?.legalActions) ? context.legalActions.map((entry: unknown) => String(entry)) : []
    const toCall = Number(context?.toCall || 0)
    const pot = Number(context?.potSize || 0)
    const bigBlind = Math.max(1, Number(context?.bigBlind || 2))

    const can = (action: string) => legal.includes(action)
    const roll = Math.random()

    if (toCall > 0) {
      if (roll < 0.72 && can("fold")) return { action: "fold" }
      if (roll < 0.93 && can("call")) return { action: "call", amount: toCall }
      if (can("raise")) return { action: "raise", amount: Math.max(toCall * 2, bigBlind * 4) }
      return { action: can("call") ? "call" : "fold", amount: toCall > 0 ? toCall : undefined }
    }

    if (roll < 0.22 && can("bet")) return { action: "bet", amount: Math.max(bigBlind, Math.round(Math.max(1, pot * 0.45))) }
    return { action: can("check") ? "check" : "bet", amount: Math.max(bigBlind, Math.round(Math.max(1, pot * 0.45))) }
  },
}

export default actor
