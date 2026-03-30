import { z } from "zod"

type AnyAssistant = {
  state?: any
  ask: (question: string, options?: any) => Promise<any>
}

let containerRef: any = null
const assistantByBotId = new Map<string, AnyAssistant>()

const decisionSchema = z.object({
  action: z.enum(["fold", "check", "call", "bet", "raise", "all-in"]),
  amount: z.number().optional(),
  reason: z.string().optional(),
})

async function getAssistantForBot(botId: string): Promise<AnyAssistant> {
  if (!containerRef) {
    throw new Error("ai-player not initialized (missing container)")
  }

  const cached = assistantByBotId.get(botId)
  if (cached) {
    return cached
  }

  const folder = containerRef.paths.resolve("assistants", "player")
  const assistant = containerRef.feature("assistant", {
    folder,
    historyMode: "lifecycle",
  }) as AnyAssistant

  assistantByBotId.set(botId, assistant)
  return assistant
}

const actor = {
  id: "ai-player",
  displayName: "House AI Player",
  description: "LLM-based poker player using Luca assistant + tools.",
  profileName: "balanced",

  init(container: any) {
    containerRef = container
  },

  async decide(context: any) {
    const legalActions = Array.isArray(context?.legalActions)
      ? context.legalActions.map((entry: unknown) => String(entry))
      : []

    const assistant = await getAssistantForBot(String(context.botId))

    const gameContext = {
      heroCards: Array.isArray(context?.heroCards) ? context.heroCards : [],
      board: Array.isArray(context?.board) ? context.board : [],
      street: String(context?.stage || "preflop"),
      position: String(context?.position || "UTG"),
      inPosition: ["BTN", "CO"].includes(String(context?.position || "")),
      toCall: Number(context?.toCall || 0),
      potSize: Number(context?.potSize || 0),
      stack: Number(context?.stack || 0),
      legalActions,
      playersInHand: Number(context?.playersInHand || 2),
    }

    if (assistant?.state && typeof assistant.state.set === "function") {
      assistant.state.set("gameContext", gameContext)
    } else {
      assistant.state = {
        ...(assistant.state || {}),
        gameContext,
      }
    }

    const prompt = [
      "It is your turn to act in a No-Limit Hold'em hand.",
      `heroCards: ${JSON.stringify(context?.heroCards || [])}`,
      `board: ${JSON.stringify(context?.board || [])}`,
      `street: ${String(context?.stage || "preflop")}`,
      `position: ${String(context?.position || "UTG")}`,
      `toCall: ${Number(context?.toCall || 0)}`,
      `potSize: ${Number(context?.potSize || 0)}`,
      `stack: ${Number(context?.stack || 0)}`,
      `legalActions: ${JSON.stringify(legalActions)}`,
      "Use README first if needed, and runScript for quick computations.",
      "Return your decision in the required schema.",
    ].join("\n")

    console.log(`[ai-player ${context?.botId}] context`, {
      stage: context?.stage,
      position: context?.position,
      heroCards: context?.heroCards,
      board: context?.board,
      toCall: context?.toCall,
      potSize: context?.potSize,
      stack: context?.stack,
      legalActions,
    })

    let decision: any
    try {
      decision = await assistant.ask(prompt, { schema: decisionSchema })
    } catch (error: any) {
      const fallback = legalActions.includes("check") ? "check" : (legalActions.includes("fold") ? "fold" : legalActions[0] || "fold")
      console.log(`[ai-player ${context?.botId}] ask failed -> fallback`, {
        fallback,
        error: String(error?.message || error),
      })
      return { action: fallback }
    }

    const action = String(decision?.action || "").trim()
    if (!legalActions.includes(action)) {
      const fallback = legalActions.includes("check") ? "check" : (legalActions.includes("fold") ? "fold" : legalActions[0] || "fold")
      return { action: fallback }
    }

    const rawAmount = Number(decision?.amount)
    const amount = Number.isFinite(rawAmount) ? Math.max(0, Math.round(rawAmount)) : undefined

    if (action === "bet" || action === "raise") {
      const out = {
        action,
        ...(typeof amount === "number" && amount > 0 ? { amount } : {}),
        ...(typeof decision?.reason === "string" ? { reasoning: decision.reason } : {}),
      }
      console.log(`[ai-player ${context?.botId}] decision`, out)
      return out
    }

    const out = {
      action,
      ...(typeof decision?.reason === "string" ? { reasoning: decision.reason } : {}),
    }
    console.log(`[ai-player ${context?.botId}] decision`, out)
    return out
  },
}

export default actor
