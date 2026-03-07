import { describe, expect, it } from "bun:test"
import { equity } from "../src/equity"
import { compareRanges } from "../src/equity"
import { Range } from "../src/range"
import { hasWasmEquity, equityWasm, rangeEquityWasm } from "../src/equity-wasm"

function winPct(best: number, possible: number): number {
  return (best / Math.max(possible, 1)) * 100
}

describe("wasm bindings", () => {
  it("build artifacts exist for both node and bundler targets", async () => {
    const nodeWasm = Bun.file(new URL("../../pokurr-equity/pkg-node/pokurr_equity_bg.wasm", import.meta.url))
    const bundlerWasm = Bun.file(new URL("../../pokurr-equity/pkg/pokurr_equity_bg.wasm", import.meta.url))

    expect(await nodeWasm.exists()).toBeTrue()
    expect(await bundlerWasm.exists()).toBeTrue()
  })

  it("loads wasm module", async () => {
    expect(await hasWasmEquity()).toBeTrue()
  })

  it("matches JS equity within variance", async () => {
    const hands = [
      ["Ah", "Ad"],
      ["Kh", "Kd"],
    ]

    const iterations = 100_000
    const js = equity(hands, [], iterations)
    const wasm = await equityWasm(hands, [], iterations)

    const jsAa = winPct(js[0].bestHandCount || 0, js[0].possibleHandsCount || 1)
    const wasmAa = winPct(wasm[0].bestHandCount || 0, wasm[0].possibleHandsCount || 1)

    expect(Math.abs(jsAa - wasmAa)).toBeLessThanOrEqual(1.0)
  })

  it("matches JS range equity within variance", async () => {
    const ours = "AA"
    const theirs = "KK"
    const iterations = 8_000

    const js = await compareRanges(new Range(ours), new Range(theirs), { iterations })
    const wasm = await rangeEquityWasm(ours, theirs, "", iterations)

    expect(Math.abs(js.ours - wasm.ours)).toBeLessThanOrEqual(2.0)
    expect(Math.abs(js.theirs - wasm.theirs)).toBeLessThanOrEqual(2.0)
    expect(Math.abs(js.tie - wasm.tie)).toBeLessThanOrEqual(2.0)
  })
})
