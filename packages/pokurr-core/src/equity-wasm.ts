import { type HandRank, stringToCard } from "./cards"
import { type PokerToolsEquity } from "./equity"
import type { RangeEquityResult } from "./equity-engine"

type WasmModule = {
  evaluateHand: (cards: string[]) => {
    category: number
    label: string
    value: number[]
  }
  equity: (hands: string[][], board?: string[], iterations?: number) => PokerToolsEquity[]
  rangeEquity: (range1: string, range2: string, board?: string | null, iterations?: number) => RangeEquityResult
  version?: () => string
}

let cachedModulePromise: Promise<WasmModule | null> | undefined

function normalizeModule(candidate: unknown): WasmModule | null {
  if (!candidate || typeof candidate !== "object") {
    return null
  }

  const value = candidate as Record<string, unknown>
  if (
    typeof value.evaluateHand === "function" &&
    typeof value.equity === "function" &&
    typeof value.rangeEquity === "function"
  ) {
    return value as unknown as WasmModule
  }

  return null
}

async function importWasmModule(): Promise<WasmModule | null> {
  try {
    const nodeImport = (await import("@pokurr/equity/node")) as Record<string, unknown>
    return normalizeModule(nodeImport.default ?? nodeImport)
  } catch {
    // Ignore node-target load failures and try bundler target.
  }

  try {
    const bundlerImport = (await import("@pokurr/equity/bundler")) as Record<string, unknown>
    return normalizeModule(bundlerImport.default ?? bundlerImport)
  } catch {
    return null
  }
}

export async function loadWasmEquityModule(): Promise<WasmModule | null> {
  if (!cachedModulePromise) {
    cachedModulePromise = importWasmModule()
  }

  return cachedModulePromise
}

export async function hasWasmEquity(): Promise<boolean> {
  return (await loadWasmEquityModule()) !== null
}

export async function wasmVersion(): Promise<string | null> {
  const module = await loadWasmEquityModule()
  return module?.version ? module.version() : null
}

export async function evaluateHandWasm(cards: string[]): Promise<HandRank> {
  const module = await loadWasmEquityModule()
  if (!module) {
    throw new Error("WASM equity module is not available")
  }

  const result = module.evaluateHand(cards)

  return {
    category: result.category as HandRank["category"],
    label: result.label,
    value: result.value,
    cards: cards.slice(0, 5).map((card) => stringToCard(card)),
  }
}

export async function equityWasm(
  hands: string[][],
  board: string[] = [],
  iterations = 20_000,
): Promise<PokerToolsEquity[]> {
  const module = await loadWasmEquityModule()
  if (!module) {
    throw new Error("WASM equity module is not available")
  }

  return module.equity(hands, board, iterations)
}

export async function rangeEquityWasm(
  range1: string,
  range2: string,
  board = "",
  iterations = 20_000,
): Promise<RangeEquityResult> {
  const module = await loadWasmEquityModule()
  if (!module) {
    throw new Error("WASM equity module is not available")
  }

  return module.rangeEquity(range1, range2, board, iterations)
}
