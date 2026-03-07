const actor = {
  id: "tag",
  displayName: "House TAG",
  description: "Tight-aggressive baseline with selective pressure.",
  profileName: "tag",
  decide(context: any) {
    const legal = Array.isArray(context?.legalActions) ? context.legalActions.map((entry: unknown) => String(entry)) : []
    const toCall = Number(context?.toCall || 0)
    const pot = Number(context?.potSize || 0)
    const bigBlind = Math.max(1, Number(context?.bigBlind || 2))

    const can = (action: string) => legal.includes(action)
    const roll = Math.random()

    if (toCall > 0) {
      if (roll < 0.30 && can("raise")) return { action: "raise", amount: Math.max(toCall * 2, Math.round(Math.max(bigBlind * 3, pot * 0.7))) }
      if (roll < 0.82 && can("call")) return { action: "call", amount: toCall }
      return { action: can("fold") ? "fold" : "call", amount: toCall > 0 ? toCall : undefined }
    }

    if (roll < 0.42 && can("bet")) return { action: "bet", amount: Math.max(bigBlind, Math.round(Math.max(bigBlind, pot * 0.6))) }
    return { action: can("check") ? "check" : "bet", amount: Math.max(bigBlind, Math.round(Math.max(bigBlind, pot * 0.6))) }
  },
}

export default actor
