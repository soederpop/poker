import { defineModel, z } from "contentbase"

export const Situation = defineModel("Situation", {
  prefix: "situations",
  meta: z.object({
    stage: z.enum(["preflop", "flop", "turn", "river"]).describe("Street where this spot starts"),
    heroCards: z.string().describe("Hero hole cards, e.g. AhKd"),
    board: z.string().default("").describe("Community cards, e.g. Kh7d2h5s"),
    potSize: z.number().describe("Pot size before hero acts"),
    toCall: z.number().describe("Amount hero must call"),
    stacks: z.string().default("").describe("Comma-separated stack sizes"),
    positions: z.string().default("").describe("Comma-separated positions, hero first"),
    actionHistory: z.string().optional().describe("Optional prior action sequence"),
    villain: z.string().optional().describe("Villain profile hint"),
    stakes: z.string().optional().describe("Stakes label"),
  }),
})
