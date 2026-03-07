import { compareRanges, equity } from "../src/equity"
import { equityEngine } from "../src/equity-engine"
import { hasWasmEquity, wasmVersion } from "../src/equity-wasm"
import { Range } from "../src/range"

type EquityScenario = {
  kind: "equity"
  name: string
  hands: string[][]
  board?: string[]
  iterations: number
  rounds: number
  driftThresholdPct: number
}

type RangeScenario = {
  kind: "range"
  name: string
  range1: string
  range2: string
  board?: string
  iterations: number
  rounds: number
  driftThresholdPct: number
}

type Scenario = EquityScenario | RangeScenario

type ScenarioSummary = {
  name: string
  kind: Scenario["kind"]
  rounds: number
  iterations: number
  jsMs: number
  wasmMs: number
  speedup: number
  driftPct: number
  driftThresholdPct: number
  driftPass: boolean
}

function pct(best: number, possible: number): number {
  return (best / Math.max(1, possible)) * 100
}

function avg(items: number[]): number {
  if (items.length === 0) {
    return 0
  }

  return items.reduce((memo, value) => memo + value, 0) / items.length
}

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits)
}

function maxAbsDelta(left: number[], right: number[]): number {
  let max = 0
  const len = Math.max(left.length, right.length)
  for (let i = 0; i < len; i += 1) {
    const delta = Math.abs((left[i] ?? 0) - (right[i] ?? 0))
    if (delta > max) {
      max = delta
    }
  }
  return max
}

function printTable(rows: ScenarioSummary[]): void {
  const header = [
    "scenario".padEnd(28),
    "type".padEnd(6),
    "iters".padStart(7),
    "rounds".padStart(7),
    "js(ms)".padStart(10),
    "wasm(ms)".padStart(10),
    "speedup".padStart(9),
    "drift%".padStart(8),
    "pass".padStart(6),
  ].join(" | ")

  console.log(header)
  console.log("-".repeat(header.length))

  for (const row of rows) {
    console.log(
      [
        row.name.padEnd(28),
        row.kind.padEnd(6),
        String(row.iterations).padStart(7),
        String(row.rounds).padStart(7),
        fmt(row.jsMs).padStart(10),
        fmt(row.wasmMs).padStart(10),
        `${fmt(row.speedup)}x`.padStart(9),
        fmt(row.driftPct).padStart(8),
        (row.driftPass ? "yes" : "no").padStart(6),
      ].join(" | "),
    )
  }
}

const scenarios: Scenario[] = [
  {
    kind: "equity",
    name: "hu-preflop-aa-vs-kk",
    hands: [
      ["Ah", "Ad"],
      ["Kh", "Kd"],
    ],
    iterations: 200_000,
    rounds: 2,
    driftThresholdPct: 1.0,
  },
  {
    kind: "equity",
    name: "4way-pairs",
    hands: [
      ["Ah", "Ad"],
      ["Kh", "Kd"],
      ["Qs", "Qd"],
      ["Jc", "Jh"],
    ],
    iterations: 200_000,
    rounds: 2,
    driftThresholdPct: 1.0,
  },
  {
    kind: "equity",
    name: "6way-mixed",
    hands: [
      ["As", "Kd"],
      ["Qh", "Qs"],
      ["Jc", "Tc"],
      ["9h", "9d"],
      ["8s", "7s"],
      ["6c", "6d"],
    ],
    iterations: 200_000,
    rounds: 2,
    driftThresholdPct: 1.2,
  },
  {
    kind: "equity",
    name: "3way-flop-board",
    hands: [
      ["Ah", "Kh"],
      ["Qs", "Qc"],
      ["Jd", "Td"],
    ],
    board: ["2h", "7h", "9c"],
    iterations: 250_000,
    rounds: 2,
    driftThresholdPct: 1.0,
  },
  {
    kind: "range",
    name: "range-tight-vs-tight",
    range1: "QQ+,AKs",
    range2: "TT+,AQs+,AKo",
    iterations: 1_000,
    rounds: 1,
    driftThresholdPct: 2.0,
  },
  {
    kind: "range",
    name: "range-wide-vs-wide",
    range1: "99+,AQs+,AKo",
    range2: "77+,AJs+,KQs,AKo",
    iterations: 900,
    rounds: 1,
    driftThresholdPct: 3.5,
  },
]

async function runEquityScenario(scenario: EquityScenario): Promise<ScenarioSummary> {
  const jsTimes: number[] = []
  const wasmTimes: number[] = []
  const drift: number[] = []
  const board = scenario.board ?? []

  for (let round = 0; round < scenario.rounds; round += 1) {
    const jsStart = performance.now()
    const jsResult = equity(scenario.hands, board, scenario.iterations)
    jsTimes.push(performance.now() - jsStart)

    const wasmStart = performance.now()
    const wasmResult = await equityEngine.equity(scenario.hands, board, scenario.iterations)
    wasmTimes.push(performance.now() - wasmStart)

    const jsPct = jsResult.map((item) => pct(item.bestHandCount || 0, item.possibleHandsCount || 1))
    const wasmPct = wasmResult.map((item) => pct(item.bestHandCount || 0, item.possibleHandsCount || 1))
    drift.push(maxAbsDelta(jsPct, wasmPct))
  }

  const jsMs = avg(jsTimes)
  const wasmMs = avg(wasmTimes)
  const driftPct = avg(drift)
  const speedup = jsMs / Math.max(1, wasmMs)

  return {
    name: scenario.name,
    kind: scenario.kind,
    rounds: scenario.rounds,
    iterations: scenario.iterations,
    jsMs,
    wasmMs,
    speedup,
    driftPct,
    driftThresholdPct: scenario.driftThresholdPct,
    driftPass: driftPct <= scenario.driftThresholdPct,
  }
}

async function runRangeScenario(scenario: RangeScenario): Promise<ScenarioSummary> {
  const jsTimes: number[] = []
  const wasmTimes: number[] = []
  const drift: number[] = []
  const ours = new Range(scenario.range1)
  const theirs = new Range(scenario.range2)
  const board = scenario.board ?? ""

  for (let round = 0; round < scenario.rounds; round += 1) {
    const jsStart = performance.now()
    const jsResult = await compareRanges(ours, theirs, { board, iterations: scenario.iterations })
    jsTimes.push(performance.now() - jsStart)

    const wasmStart = performance.now()
    const wasmResult = await equityEngine.rangeEquity(scenario.range1, scenario.range2, {
      board,
      iterations: scenario.iterations,
    })
    wasmTimes.push(performance.now() - wasmStart)

    const jsVector = [jsResult.ours, jsResult.theirs, jsResult.tie]
    const wasmVector = [wasmResult.ours, wasmResult.theirs, wasmResult.tie]
    drift.push(maxAbsDelta(jsVector, wasmVector))
  }

  const jsMs = avg(jsTimes)
  const wasmMs = avg(wasmTimes)
  const driftPct = avg(drift)
  const speedup = jsMs / Math.max(1, wasmMs)

  return {
    name: scenario.name,
    kind: scenario.kind,
    rounds: scenario.rounds,
    iterations: scenario.iterations,
    jsMs,
    wasmMs,
    speedup,
    driftPct,
    driftThresholdPct: scenario.driftThresholdPct,
    driftPass: driftPct <= scenario.driftThresholdPct,
  }
}

async function main(): Promise<void> {
  const wasmAvailable = await hasWasmEquity()
  console.log(`WASM available: ${wasmAvailable}`)
  if (!wasmAvailable) {
    console.log("Cannot run perf suite without WASM backend.")
    process.exit(1)
  }

  const version = await wasmVersion()
  console.log(`WASM version: ${version ?? "unknown"}`)
  console.log("")

  const rows: ScenarioSummary[] = []
  for (const scenario of scenarios) {
    if (scenario.kind === "equity") {
      rows.push(await runEquityScenario(scenario))
    } else {
      rows.push(await runRangeScenario(scenario))
    }
  }

  printTable(rows)

  const totalJs = rows.reduce((memo, row) => memo + row.jsMs, 0)
  const totalWasm = rows.reduce((memo, row) => memo + row.wasmMs, 0)
  const weightedSpeedup = totalJs / Math.max(1, totalWasm)
  const minSpeedup = Math.min(...rows.map((row) => row.speedup))
  const maxDrift = Math.max(...rows.map((row) => row.driftPct))
  const passCount = rows.filter((row) => row.driftPass).length

  console.log("")
  console.log(`Weighted speedup: ${fmt(weightedSpeedup)}x`)
  console.log(`Minimum speedup:  ${fmt(minSpeedup)}x`)
  console.log(`Max drift:        ${fmt(maxDrift)}%`)
  console.log(`Drift checks:     ${passCount}/${rows.length} passing`)
}

await main()
