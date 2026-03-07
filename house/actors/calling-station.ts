const actor = {
  id: "calling-station",
  displayName: "House Calling Station",
  description: "Sticky baseline that prefers calling and avoids aggression.",
  profileName: "calling-station",
  decide(context: any) {
    const legal = Array.isArray(context?.legalActions) ? context.legalActions.map((entry: unknown) => String(entry)) : []
    const toCall = Number(context?.toCall || 0)
    const pot = Number(context?.potSize || 0)
    const bigBlind = Math.max(1, Number(context?.bigBlind || 2))

    const can = (action: string) => legal.includes(action)
    const roll = Math.random()

    if (toCall > 0) {
      if (roll < 0.80 && can("call")) return { action: "call", amount: toCall }
      if (roll < 0.90 && can("fold")) return { action: "fold" }
      if (can("raise")) return { action: "raise", amount: Math.max(toCall * 2, Math.round(Math.max(bigBlind * 2, pot * 0.6))) }
      return { action: can("call") ? "call" : "fold", amount: toCall > 0 ? toCall : undefined }
    }

    if (roll < 0.18 && can("bet")) return { action: "bet", amount: Math.max(bigBlind, Math.round(Math.max(bigBlind, pot * 0.5))) }
    return { action: can("check") ? "check" : "bet", amount: Math.max(bigBlind, Math.round(Math.max(bigBlind, pot * 0.5))) }
  },
}

export default actor
