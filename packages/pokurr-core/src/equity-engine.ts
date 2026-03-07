import { evaluateHand, type HandRank } from "./cards"
import { compareRanges, equity, type PokerToolsEquity } from "./equity"
import { evaluateHandWasm, hasWasmEquity, equityWasm, rangeEquityWasm } from "./equity-wasm"
import { Range } from "./range"

export type RangeEquityResult = {
  us: string
  them: string
  ours: number
  theirs: number
  tie: number
  numbers?: number[][][]
}

export type EquityBackendName = "js" | "wasm"
export type EquityBackendPreference = EquityBackendName | "auto"

function toRange(range: Range | string): Range {
  return typeof range === "string" ? new Range(range) : range
}

function toRangeInput(range: Range | string): string {
  return typeof range === "string" ? range : range.input
}

export async function hasWasmBackend(): Promise<boolean> {
  return hasWasmEquity()
}

export async function activeEquityBackend(): Promise<EquityBackendName> {
  return (await hasWasmBackend()) ? "wasm" : "js"
}

export function evaluateHandJs(cards: string[]): HandRank {
  return evaluateHand(cards)
}

export async function evaluateHandAuto(cards: string[]): Promise<HandRank> {
  if (await hasWasmBackend()) {
    return evaluateHandWasm(cards)
  }

  return evaluateHandJs(cards)
}

export async function evaluateHandWithBackend(
  backend: EquityBackendPreference,
  cards: string[],
): Promise<HandRank> {
  if (backend === "auto") {
    return evaluateHandAuto(cards)
  }

  if (backend === "js") {
    return evaluateHandJs(cards)
  }

  if (!(await hasWasmBackend())) {
    throw new Error("WASM backend was requested but no wasm artifacts are available")
  }

  return evaluateHandWasm(cards)
}

export async function equityAuto(hands: string[][], board: string[] = [], iterations = 20_000): Promise<PokerToolsEquity[]> {
  if (await hasWasmBackend()) {
    return equityWasm(hands, board, iterations)
  }

  return equity(hands, board, iterations)
}

export async function equityWithBackend(
  backend: EquityBackendPreference,
  hands: string[][],
  board: string[] = [],
  iterations = 20_000,
): Promise<PokerToolsEquity[]> {
  if (backend === "auto") {
    return equityAuto(hands, board, iterations)
  }

  if (backend === "js") {
    return equity(hands, board, iterations)
  }

  if (!(await hasWasmBackend())) {
    throw new Error("WASM backend was requested but no wasm artifacts are available")
  }

  return equityWasm(hands, board, iterations)
}

export async function rangeEquity(
  range1: Range | string,
  range2: Range | string,
  options: { board?: string; iterations?: number; full?: boolean } = {},
): Promise<RangeEquityResult> {
  const board = options.board ?? ""
  const iterations = options.iterations ?? 20_000

  if ((await hasWasmBackend()) && !options.full) {
    return rangeEquityWasm(toRangeInput(range1), toRangeInput(range2), board, iterations)
  }

  return compareRanges(toRange(range1), toRange(range2), options)
}

export async function rangeEquityWithBackend(
  backend: EquityBackendPreference,
  range1: Range | string,
  range2: Range | string,
  options: { board?: string; iterations?: number; full?: boolean } = {},
): Promise<RangeEquityResult> {
  if (backend === "auto") {
    return rangeEquity(range1, range2, options)
  }

  const board = options.board ?? ""
  const iterations = options.iterations ?? 20_000

  if (backend === "js") {
    return compareRanges(toRange(range1), toRange(range2), options)
  }

  if (!(await hasWasmBackend())) {
    throw new Error("WASM backend was requested but no wasm artifacts are available")
  }

  if (options.full) {
    return compareRanges(toRange(range1), toRange(range2), options)
  }

  return rangeEquityWasm(toRangeInput(range1), toRangeInput(range2), board, iterations)
}

export const equityEngine = {
  activeBackend: activeEquityBackend,
  hasWasmBackend,
  evaluateHand: evaluateHandAuto,
  evaluateHandWithBackend,
  evaluateHandJs,
  equity: equityAuto,
  equityWithBackend,
  rangeEquity,
  rangeEquityWithBackend,
}
