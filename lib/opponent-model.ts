export type VillainProfile = {
  // Per-session aggregate stats (across hands)
  vpip: number              // Voluntarily Put money In Pot (0-1). Called or raised preflop (not counting BB check)
  pfr: number               // Preflop Raise frequency (0-1). Raised preflop
  af: number                // Aggression Factor. (bets+raises) / calls. Infinity if no calls.
  aggressionFreq: number    // (bets+raises) / total non-blind actions (0-1)

  // Flags derived from stats
  isPassive: boolean         // af < 1.0 OR aggressionFreq < 0.25
  isAggressive: boolean      // af > 2.0 OR aggressionFreq > 0.50
  isLoose: boolean           // vpip > 0.40
  isTight: boolean           // vpip < 0.22

  // Per-hand stats (current hand only)
  calledBetCount: number
  raisedCount: number
  preflopAction: "fold" | "call" | "raise" | "unknown"

  // Confidence
  handsObserved: number      // how many completed hands we have data on
  totalActions: number       // total non-blind actions across all hands
}

export function buildVillainProfile(
  currentHandActions: Array<{ playerId: string; action: string; amount?: number; street?: string }>,
  villainId: string,
  historicalHands?: Array<{
    players: Array<{ id: string }>
    actions: Array<{ playerId: string; action: string; amount?: number; street: string }>
  }>,
): VillainProfile {
  // ── Current-hand stats (per-hand fields) ──
  const villainActions = currentHandActions.filter(
    a => a.playerId === villainId && a.action !== "small-blind" && a.action !== "big-blind"
  )

  let currentBets = 0
  let currentRaises = 0
  let currentCalls = 0
  let currentChecks = 0
  let currentFolds = 0

  for (const a of villainActions) {
    switch (a.action) {
      case "bet":
        currentBets++
        break
      case "raise":
      case "all-in":
        currentRaises++
        break
      case "call":
        currentCalls++
        break
      case "check":
        currentChecks++
        break
      case "fold":
        currentFolds++
        break
    }
  }

  // Find preflop action (first non-blind action on preflop street)
  let preflopAction: "fold" | "call" | "raise" | "unknown" = "unknown"
  const preflopVillainAction = villainActions.find(a => a.street === "preflop")
  if (preflopVillainAction) {
    const act = preflopVillainAction.action
    if (act === "fold") preflopAction = "fold"
    else if (act === "call") preflopAction = "call"
    else if (act === "raise" || act === "bet" || act === "all-in") preflopAction = "raise"
  }

  // ── Cross-hand aggregate stats ──
  const hands = historicalHands?.filter(h => h.players.some(p => p.id === villainId)) ?? []
  const handsObserved = hands.length

  if (handsObserved === 0) {
    // Fall back to current-hand-only stats (backward compatible)
    const totalActions = currentBets + currentRaises + currentCalls + currentChecks + currentFolds
    const aggressionFreq = (currentBets + currentRaises) / Math.max(totalActions, 1)

    return {
      vpip: 0,
      pfr: 0,
      af: 0,
      aggressionFreq,
      isPassive: aggressionFreq < 0.25 && totalActions >= 2,
      isAggressive: aggressionFreq > 0.50 && totalActions >= 2,
      isLoose: false,
      isTight: false,
      calledBetCount: currentCalls,
      raisedCount: currentRaises + currentBets,
      preflopAction,
      handsObserved: 0,
      totalActions,
    }
  }

  // Aggregate across all historical hands
  let vpipHands = 0
  let pfrHands = 0
  let totalBets = 0
  let totalRaises = 0
  let totalCalls = 0
  let totalChecks = 0
  let totalFolds = 0

  for (const hand of hands) {
    const vActions = hand.actions.filter(a => a.playerId === villainId)
    const nonBlindActions = vActions.filter(a => a.action !== "small-blind" && a.action !== "big-blind")

    // VPIP: Did villain call or raise preflop? (BB check doesn't count)
    const preflopActions = nonBlindActions.filter(a => a.street === "preflop")
    let didVpip = false
    let didPfr = false

    for (const a of preflopActions) {
      if (a.action === "call" || a.action === "raise" || a.action === "bet" || a.action === "all-in") {
        didVpip = true
      }
      if (a.action === "raise" || a.action === "bet" || a.action === "all-in") {
        didPfr = true
      }
    }

    if (didVpip) vpipHands++
    if (didPfr) pfrHands++

    // Count all non-blind actions
    for (const a of nonBlindActions) {
      switch (a.action) {
        case "bet":
          totalBets++
          break
        case "raise":
        case "all-in":
          totalRaises++
          break
        case "call":
          totalCalls++
          break
        case "check":
          totalChecks++
          break
        case "fold":
          totalFolds++
          break
      }
    }
  }

  const vpip = vpipHands / Math.max(handsObserved, 1)
  const pfr = pfrHands / Math.max(handsObserved, 1)
  const af = (totalBets + totalRaises) / Math.max(totalCalls, 1)
  const totalActions = totalBets + totalRaises + totalCalls + totalChecks + totalFolds
  const aggressionFreq = (totalBets + totalRaises) / Math.max(totalActions, 1)

  const isLoose = vpip > 0.40
  const isTight = vpip < 0.22
  const isPassive = handsObserved >= 5 ? (af < 1.0 || aggressionFreq < 0.25) : false
  const isAggressive = handsObserved >= 5 ? (af > 2.0 || aggressionFreq > 0.50) : false

  return {
    vpip,
    pfr,
    af,
    aggressionFreq,
    isPassive,
    isAggressive,
    isLoose,
    isTight,
    calledBetCount: currentCalls,
    raisedCount: currentRaises + currentBets,
    preflopAction,
    handsObserved,
    totalActions,
  }
}

// Early positions
const EARLY_POSITIONS = new Set(["UTG", "MP"])
// Late positions
const LATE_POSITIONS = new Set(["CO", "BTN", "SB"])

export function narrowVillainRange(
  villainProfile: VillainProfile,
  position: string,
  street: string,
  raiseCount: number,
): string | undefined {
  const isEarly = EARLY_POSITIONS.has(position)
  const isLate = LATE_POSITIONS.has(position)

  // 3-bet range (premium)
  if (street === "preflop" && raiseCount >= 2) {
    if (villainProfile.isTight) {
      return "KK+,AKs" // tight 3-bet = ultra premium
    }
    if (villainProfile.isPassive) {
      return "KK+,AKs" // passive 3-bet = ultra premium
    }
    if (villainProfile.isLoose) {
      return "TT+,AQs+,AKo,AJs" // loose 3-bet = wider
    }
    if (villainProfile.isAggressive) {
      return "TT+,AQs+,AKo" // aggressive 3-bet = wider
    }
    return "QQ+,AKs,AKo"
  }

  // Preflop raise ranges by position
  if (villainProfile.preflopAction === "raise") {
    if (isEarly) {
      if (villainProfile.isTight) return "TT+,AQs+,AKo" // tighter EP for tight
      if (villainProfile.isPassive) return "TT+,AQs+,AKo" // tighter EP for passive
      if (villainProfile.isLoose) return "22+,A2s+,K9s+,Q9s+,J9s+,T9s,A8o+,KTo+,QJo" // wider EP for loose
      if (villainProfile.isAggressive) return "66+,A8s+,KTs+,QJs,ATo+,KJo+" // wider EP for aggressive
      return "88+,ATs+,KQs,AJo+"
    }
    if (isLate) {
      if (villainProfile.isTight) return "77+,ATs+,KQs,AJo+" // tighter LP for tight
      if (villainProfile.isPassive) return "77+,ATs+,KQs,AJo+" // tighter LP for passive
      if (villainProfile.isLoose) return "22+,A2s+,K2s+,Q5s+,J7s+,T8s+,97s+,86s+,A2o+,K8o+,Q9o+,J9o+,T9o" // wider LP for loose
      if (villainProfile.isAggressive) return "22+,A2s+,K7s+,Q9s+,J9s+,T9s,A8o+,KTo+,QJo" // wider LP for aggressive
      return "55+,A7s+,K9s+,QTs+,JTs,ATo+,KJo+"
    }
    // Default (BB or unknown)
    return "55+,A7s+,K9s+,QTs+,JTs,ATo+,KJo+"
  }

  // Postflop actions
  if (street === "flop") {
    if (villainProfile.raisedCount > 0 && raiseCount >= 1) {
      if (villainProfile.isPassive) return "QQ+,AKs" // passive raise on flop = monster
      if (villainProfile.isAggressive) return "88+,ATs+,KQs,AJo+" // aggressive raise = wider
      return "TT+,AQs+,AKo"
    }
    // Villain called a flop bet — keep preflop range (return undefined to use default)
    return undefined
  }

  if (street === "turn") {
    if (villainProfile.raisedCount > 0 && raiseCount >= 1) {
      if (villainProfile.isPassive) return "QQ+,AKs" // passive turn raise = nuts
      if (villainProfile.isAggressive) return "TT+,AQs+,AKo" // aggressive turn raise = wider
      return "JJ+,AKs"
    }
    return undefined
  }

  if (street === "river") {
    // Villain bet on the river
    if (villainProfile.raisedCount > 0 || villainProfile.calledBetCount === 0) {
      if (villainProfile.isPassive) return "KK+,AKs" // passive river bet = total nuts
      if (villainProfile.isAggressive) return "TT+,AQs+,AKo" // aggressive river bet = could be bluffing
      return "QQ+,AKs"
    }
    return undefined
  }

  return undefined
}

export function villainAdjustedThresholds(
  villainProfile: VillainProfile | null,
  baseRaiseThreshold: number,
  baseCallThreshold: number,
  baseFoldThreshold: number,
): { raiseThreshold: number; callThreshold: number; foldThreshold: number } {
  if (!villainProfile) {
    return {
      raiseThreshold: baseRaiseThreshold,
      callThreshold: baseCallThreshold,
      foldThreshold: baseFoldThreshold,
    }
  }

  if (villainProfile.isPassive) {
    return {
      raiseThreshold: baseRaiseThreshold + 0.05,
      callThreshold: baseCallThreshold + 0.05,
      foldThreshold: baseFoldThreshold,
    }
  }

  if (villainProfile.isAggressive) {
    return {
      raiseThreshold: baseRaiseThreshold - 0.03,
      callThreshold: baseCallThreshold - 0.05,
      foldThreshold: baseFoldThreshold + 0.03,
    }
  }

  return {
    raiseThreshold: baseRaiseThreshold,
    callThreshold: baseCallThreshold,
    foldThreshold: baseFoldThreshold,
  }
}
