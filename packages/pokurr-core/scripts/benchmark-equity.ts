import { equity } from "../src/equity"
import { equityEngine } from "../src/equity-engine"
import { hasWasmEquity, wasmVersion } from "../src/equity-wasm"

function pct(best: number, possible: number): number {
  return (best / Math.max(1, possible)) * 100
}

async function run(): Promise<void> {
  const iterations = 200_000
  const rounds = 2

  const wasmAvailable = await hasWasmEquity()
  console.log(`WASM available: ${wasmAvailable}`)
  if (wasmAvailable) {
    console.log(`WASM version: ${await wasmVersion()}`)
  }

  const scenario = [
    ["Ah", "Ad"],
    ["Kh", "Kd"],
    ["Qs", "Qd"],
    ["Jc", "Jh"],
  ]

  let jsTotal = 0
  let wasmTotal = 0

  for (let i = 0; i < rounds; i += 1) {
    const jsStart = performance.now()
    const jsResult = equity(scenario, [], iterations)
    jsTotal += performance.now() - jsStart

    const jsAa = pct(jsResult[0].bestHandCount || 0, jsResult[0].possibleHandsCount || 1)
    const jsKk = pct(jsResult[1].bestHandCount || 0, jsResult[1].possibleHandsCount || 1)

    console.log(`round ${i + 1} JS:   AA=${jsAa.toFixed(2)} KK=${jsKk.toFixed(2)}`)

    if (wasmAvailable) {
      const wasmStart = performance.now()
      const wasmResult = await equityEngine.equity(scenario, [], iterations)
      wasmTotal += performance.now() - wasmStart

      const wasmAa = pct(wasmResult[0].bestHandCount || 0, wasmResult[0].possibleHandsCount || 1)
      const wasmKk = pct(wasmResult[1].bestHandCount || 0, wasmResult[1].possibleHandsCount || 1)

      console.log(`round ${i + 1} WASM: AA=${wasmAa.toFixed(2)} KK=${wasmKk.toFixed(2)}`)
    }
  }

  console.log(`\nAverage JS runtime:   ${(jsTotal / rounds).toFixed(2)}ms`)

  if (wasmAvailable) {
    console.log(`Average WASM runtime: ${(wasmTotal / rounds).toFixed(2)}ms`)
    const speedup = jsTotal / Math.max(1, wasmTotal)
    console.log(`WASM speedup vs JS:   ${speedup.toFixed(2)}x`)
  }
}

await run()
