export type PokerPosition = "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB"

export type StrategyProfile = {
  name: string
  description: string
  openRanges: Partial<Record<PokerPosition, string>>
  llmFallback?: boolean
}

export const STRATEGY_PROFILES: Record<string, StrategyProfile> = {
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
  balanced: {
    name: "balanced",
    description: "Solid all-around baseline with sensible opens, moderate aggression, and enough mixing to be hard to exploit quickly.",
    openRanges: {
      UTG: "TT+,AQs+,AKo,KQs,AJs",
      MP: "88+,ATs+,KJs+,QJs,AJo+,KQo",
      CO: "66+,A7s+,K9s+,QTs+,JTs,T9s,A9o+,KJo+,QJo",
      BTN: "44+,A2s+,K7s+,Q9s+,J9s+,T8s+,98s,87s,A7o+,K9o+,QTo+,JTo",
      SB: "55+,A2s+,K8s+,Q9s+,J9s+,T8s+,98s,A8o+,KTo+,QTo+,JTo",
      BB: "44+,A2s+,K7s+,Q8s+,J8s+,T8s+,97s+,87s,76s,A8o+,K9o+,QTo+,JTo",
    },
    llmFallback: false,
  },
  tricky: {
    name: "tricky",
    description: "Mixes between pressure and deception, flats more often in position and springs delayed aggression later in the hand.",
    openRanges: {
      UTG: "99+,AJs+,KQs,AQo+",
      MP: "77+,ATs+,KTs+,QJs,JTs,AJo+,KQo",
      CO: "55+,A5s+,K8s+,Q9s+,J9s+,T9s,98s,87s,A9o+,KTo+,QTo+,JTo",
      BTN: "33+,A2s+,K6s+,Q8s+,J8s+,T8s+,97s+,86s+,76s,65s,A5o+,K9o+,Q9o+,J9o+,T9o",
      SB: "44+,A2s+,K7s+,Q8s+,J8s+,T8s+,97s+,87s,76s,A7o+,KTo+,QTo+,JTo",
      BB: "33+,A2s+,K5s+,Q7s+,J8s+,T7s+,97s+,86s+,76s,65s,A5o+,K9o+,Q9o+,J9o+,T9o",
    },
    llmFallback: false,
  },
  pressure: {
    name: "pressure",
    description: "Aggressive baseline that attacks capped ranges, semibluffs often enough, and forces your bot to defend honestly.",
    openRanges: {
      UTG: "88+,ATs+,KJs+,QJs,JTs,AJo+,KQo",
      MP: "66+,A8s+,KTs+,QTs+,JTs,T9s,A9o+,KJo+,QJo",
      CO: "44+,A5s+,K8s+,Q9s+,J9s+,T8s+,98s,87s,A8o+,KTo+,QTo+,JTo",
      BTN: "22+,A2s+,K5s+,Q8s+,J8s+,T7s+,97s+,86s+,76s,65s,54s,A5o+,K8o+,Q9o+,J9o+,T9o",
      SB: "22+,A2s+,K6s+,Q8s+,J8s+,T8s+,97s+,87s,76s,65s,A5o+,K9o+,Q9o+,J9o+,T9o",
      BB: "22+,A2s+,K4s+,Q7s+,J7s+,T7s+,96s+,86s+,76s,65s,54s,A4o+,K8o+,Q9o+,J9o+,T8o+",
    },
    llmFallback: false,
  },
  "short-stack": {
    name: "short-stack",
    description: "Simplified tournament-style pressure baseline that pushes thin edges when stacks are shallow and punishes passive opens.",
    openRanges: {
      UTG: "88+,ATs+,AQo+,KQs",
      MP: "77+,A9s+,AJo+,KQs,KJs,QJs",
      CO: "55+,A7s+,ATo+,KTs+,QTs+,JTs,T9s",
      BTN: "33+,A2s+,A7o+,K8s+,KTo+,Q9s+,QTo+,J9s+,JTo,T8s+,98s",
      SB: "33+,A2s+,A8o+,K8s+,KTo+,Q9s+,QTo+,J9s+,JTo,T8s+,98s",
      BB: "22+,A2s+,A7o+,K7s+,K9o+,Q8s+,QTo+,J8s+,JTo,T8s+,97s+",
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

export function listStrategyProfileNames(): string[] {
  return Object.keys(STRATEGY_PROFILES).sort()
}
