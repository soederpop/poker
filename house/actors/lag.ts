const actor = {
  id: "lag",
  displayName: "House LAG",
  description: "Loose-aggressive style with frequent pressure and wider ranges.",
  profileName: "lag",
  decide(context: any) {
    const legal = Array.isArray(context?.legalActions) ? context.legalActions.map((entry: unknown) => String(entry)) : []
    const toCall = Number(context?.toCall || 0)
    const pot = Number(context?.potSize || 0)
    const bigBlind = Math.max(1, Number(context?.bigBlind || 2))

    const can = (action: string) => legal.includes(action)
    const roll = Math.random()

    if (toCall > 0) {
      if (roll < 0.45 && can("raise")) return { action: "raise", amount: Math.max(toCall * 2, Math.round(Math.max(bigBlind * 3, pot * 0.8))) }
      if (roll < 0.85 && can("call")) return { action: "call", amount: toCall }
      return { action: can("fold") ? "fold" : "call", amount: toCall > 0 ? toCall : undefined }
    }

    if (roll < 0.58 && can("bet")) return { action: "bet", amount: Math.max(bigBlind, Math.round(Math.max(bigBlind, pot * 0.75))) }
    return { action: can("check") ? "check" : "bet", amount: Math.max(bigBlind, Math.round(Math.max(bigBlind, pot * 0.75))) }
  },
}

export default actor
