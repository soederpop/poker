import { describe, expect, it } from "bun:test"
import { HandEquity, equity } from "../src/equity"
import { equityEngine } from "../src/equity-engine"
import { Range } from "../src/range"

describe("equity", () => {
  it("reads precomputed hand strength", () => {
    const hand = new HandEquity("AKo", { players: 2 })
    expect(hand.averageWinPercent).toBe(48)
  })

  it("AA is favored over KK preflop", () => {
    const equities = equity(
      [
        ["Ah", "Ad"],
        ["Kh", "Kd"],
      ],
      [],
      5000,
    )

    const aaWin = ((equities[0].bestHandCount || 0) / (equities[0].possibleHandsCount || 1)) * 100
    const kkWin = ((equities[1].bestHandCount || 0) / (equities[1].possibleHandsCount || 1)) * 100

    expect(aaWin).toBeGreaterThan(75)
    expect(kkWin).toBeLessThan(25)
  })

  it("AKs vs QQ is in expected range", () => {
    const equities = equity(
      [
        ["Ah", "Kh"],
        ["Qs", "Qd"],
      ],
      [],
      20_000,
    )

    const aksWin = ((equities[0].bestHandCount || 0) / (equities[0].possibleHandsCount || 1)) * 100
    const qqWin = ((equities[1].bestHandCount || 0) / (equities[1].possibleHandsCount || 1)) * 100

    expect(aksWin).toBeGreaterThan(43)
    expect(aksWin).toBeLessThan(49)
    expect(qqWin).toBeGreaterThan(49)
    expect(qqWin).toBeLessThan(57)
  })

  it("uses unified backend API without requiring rust knowledge", async () => {
    const backend = await equityEngine.activeBackend()
    expect(["js", "wasm"]).toContain(backend)

    const ours = new Range("QQ+,AKs")
    const theirs = new Range("TT+,AQs+,AKo")
    const result = await equityEngine.rangeEquity(ours, theirs, { iterations: 1000 })

    expect(result.ours).toBeGreaterThan(result.theirs)
  })

  it("supports explicit backend preference through equityEngine", async () => {
    const jsRank = await equityEngine.evaluateHandWithBackend("js", [
      "Ah",
      "Kh",
      "Qh",
      "Jh",
      "Th",
      "2c",
      "3d",
    ])

    expect(jsRank.label).toBe("straight-flush")

    const jsEquity = await equityEngine.equityWithBackend(
      "js",
      [
        ["Ah", "Ad"],
        ["Kh", "Kd"],
      ],
      [],
      2000,
    )

    expect(jsEquity.length).toBe(2)

    if (await equityEngine.hasWasmBackend()) {
      const wasmEquity = await equityEngine.equityWithBackend(
        "wasm",
        [
          ["Ah", "Ad"],
          ["Kh", "Kd"],
        ],
        [],
        2000,
      )
      expect(wasmEquity.length).toBe(2)
    }
  })
})
