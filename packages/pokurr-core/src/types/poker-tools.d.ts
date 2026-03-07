declare module "poker-tools" {
  export const CardGroup: {
    fromString(input: string): unknown
  }

  export const OddsCalculator: {
    calculateEquity(cardGroups: unknown[], board?: unknown, iterations?: number): {
      equities: Array<{
        bestHandCount: number
        tieHandCount: number
        possibleHandsCount: number
        winPercentage?: number
        tiePercentage?: number
      }>
    }
  }
}
