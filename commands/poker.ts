import { z } from "zod"
import type { ContainerContext } from "@soederpop/luca"
import type { AGIContainer } from "@soederpop/luca/agi"
import { CommandOptionsSchema } from "@soederpop/luca/schemas"
import { equityEngine, Range } from "@pokurr/core"

import { bootPokerContainer } from "../container"
import { buildDeckStrings, parseExactHand, splitCards, withoutDeadCards } from "../lib/cards"
import { PRNG } from "../lib/prng"
import { loadSituation } from "../lib/situations"
import type { PokerPosition } from "../features/strategy"
import { Actor } from "../features/actor"
import { createInitialGameState, type GameState } from "../features/game-engine"
import PokerServerRuntime from "../servers/poker-server"
import PokerClient from "../clients/poker-client"

export const description = "Poker command suite (analyze, sim, serve, seed, join, watch, new-agent)"

const StrategyOptionSchema = z.union([z.string(), z.array(z.string())]).optional()
const booleanOption = (fallback: boolean) => z.preprocess((input) => {
  if (typeof input === "boolean") {
    return input
  }

  if (typeof input === "string") {
    const lowered = input.trim().toLowerCase()
    if (["true", "1", "yes", "y", "on"].includes(lowered)) {
      return true
    }
    if (["false", "0", "no", "n", "off"].includes(lowered)) {
      return false
    }
  }

  return input
}, z.boolean()).default(fallback)

export const argsSchema = CommandOptionsSchema.extend({
  iterations: z.coerce.number().int().min(1).default(10_000).describe("Iteration count"),
  board: z.string().optional().describe("Board cards, e.g. Kh7d2h"),
  vs: z.string().optional().describe("Range opponent for analyze range/hand mode"),
  situation: z.string().optional().describe("Situation doc id/path"),
  strategy: StrategyOptionSchema.describe("Seat/profile mappings, e.g. hero=tight-aggressive villain=loose-passive"),
  seed: z.coerce.number().int().optional().describe("Deterministic simulation seed"),
  potSize: z.coerce.number().optional().describe("Pot size hint for analyze hand mode"),
  toCall: z.coerce.number().optional().describe("To-call hint for analyze hand mode"),
  host: z.string().default("0.0.0.0").describe("Server bind host for serve mode"),
  port: z.coerce.number().int().min(1).max(65535).default(3000).describe("HTTP server port"),
  wsPort: z.coerce.number().int().min(1).max(65535).optional().describe("Deprecated: ws port is derived as --port + 1"),
  spectatorPort: z.coerce.number().int().min(1).max(65535).optional().describe("Deprecated: spectator ws port is derived as --port + 2"),
  defaultTable: booleanOption(true).describe("Serve mode: create default cash tables on startup"),
  seedLobby: booleanOption(true).describe("Serve mode: seed SNG presets + house bots"),
  actionTimeout: z.coerce.number().int().min(1).default(30).describe("Serve mode: default action clock seconds"),
  timeBankStartSeconds: z.coerce.number().int().min(0).default(120).describe("Serve mode: starting time bank per player"),
  timeBankCapSeconds: z.coerce.number().int().min(0).default(120).describe("Serve mode: max time bank"),
  timeBankAccrualSeconds: z.coerce.number().int().min(0).default(5).describe("Serve mode: time-bank accrual after each hand"),
  botThinkDelayMinMs: z.coerce.number().int().min(0).default(1200).describe("Serve mode: house-bot minimum think delay (ms)"),
  botThinkDelayMaxMs: z.coerce.number().int().min(0).default(2600).describe("Serve mode: house-bot maximum think delay (ms)"),
  reconnectGraceMs: z.coerce.number().int().min(1000).default(45_000).describe("Serve mode: reconnect window in ms"),
  houseActorsPath: z.string().default("house/actors").describe("Serve mode: relative path to disk-backed house actor modules"),
  token: z.string().optional().describe("Bearer token for join mode"),
  name: z.string().optional().describe("Bot name for register/auto-register"),
  server: z.string().optional().describe("HTTP server base URL, e.g. http://localhost:3000"),
  seedCount: z.coerce.number().int().min(1).max(200).default(4).describe("Seed mode: number of bots to register"),
  seedPrefix: z.string().default("seed-bot").describe("Seed mode: bot name prefix"),
  table: z.string().optional().describe("Target tableId for join mode"),
  autoRegister: booleanOption(false).describe("Join mode: register over HTTP when no token is available"),
  manual: booleanOption(false).describe("Join mode: prompt for human action overrides each turn"),
  anyPort: booleanOption(false).describe("Serve mode: find first open HTTP/WS/spectator triplet starting at --port"),
  force: booleanOption(false).describe("Bypass confirmation prompts for destructive operations"),
})

type PokerOptions = z.infer<typeof argsSchema>

const SUIT_STYLES: Record<string, { symbol: string; emoji: string; color: "redBright" | "blueBright" | "gray" }> = {
  h: { symbol: "♥", emoji: "♥️", color: "redBright" },
  d: { symbol: "♦", emoji: "♦️", color: "redBright" },
  s: { symbol: "♠", emoji: "♠️", color: "blueBright" },
  c: { symbol: "♣", emoji: "♣️", color: "gray" },
}

function prettyCard(card: string, colors: any): string {
  const rank = card.slice(0, -1).toUpperCase()
  const suit = card.slice(-1).toLowerCase()
  const style = SUIT_STYLES[suit]

  if (!style) {
    return card
  }

  const painter = colors[style.color] || ((value: string) => value)
  return painter(`${rank}${style.emoji}`)
}

function prettyCards(cards: string[], colors: any): string {
  if (cards.length === 0) {
    return colors.gray("(none)")
  }
  return cards.map((card) => prettyCard(card, colors)).join(" ")
}

function printSection(container: AGIContainer & any, title: string) {
  const ui = container.feature("ui")
  console.log("")
  console.log(ui.colors.bold.cyan(`🂡 ${title}`))
}

function normalizeStrategyAssignments(value: PokerOptions["strategy"]): Record<string, string> {
  const entries = [value].flat().filter(Boolean) as string[]
  const mapping: Record<string, string> = {}

  for (const entry of entries.flatMap((token) => token.split(/[ ,]+/g)).filter(Boolean)) {
    const [left, right] = entry.split("=").map((part) => part.trim())

    if (left && right) {
      mapping[left.toLowerCase()] = right
    }
  }

  return mapping
}

function pct(bestHandCount: number, possibleHandsCount: number): number {
  return Number(((bestHandCount / Math.max(possibleHandsCount, 1)) * 100).toFixed(2))
}

function parsePosition(value?: string): PokerPosition {
  const normalized = String(value || "").trim().toUpperCase()
  if (["UTG", "MP", "CO", "BTN", "SB", "BB"].includes(normalized)) {
    return normalized as PokerPosition
  }
  return "BTN"
}

function printUsage() {
  console.log("Usage:")
  console.log("  luca poker analyze equity AhKd QsQc [--board Kh7d2h]")
  console.log("  luca poker analyze range \"ATs+,AJo+\" --vs \"QQ+,AKs\" [--board Kh7d2h]")
  console.log("  luca poker analyze hand AhKd --board Kh7d2h5s [--potSize 30 --toCall 10]")
  console.log("  luca poker sim --situation situations/turned-flush-draw --iterations 1000 --strategy hero=tight-aggressive villain=loose-passive --seed 42")
  console.log("  luca poker serve --port 3000 [--anyPort true] [--force true] --seedLobby true --houseActorsPath house/actors --botThinkDelayMinMs 1200 --botThinkDelayMaxMs 2600")
  console.log("  luca poker seed [http://localhost:3000] [--seedCount 4] [--seedPrefix seed-bot]")
  console.log("  luca poker new-agent my-bot [tag]")
  console.log("  luca poker register http://localhost:3000 --name my-bot")
  console.log("  luca poker join ws://localhost:3001 --token <token> [--manual]")
  console.log("  luca poker watch ws://localhost:3002 [--table <tableId>]")
  console.log("  luca poker house status [http://localhost:3000] [--server http://localhost:3000]")
  console.log("  luca poker leaderboard reset [http://localhost:3000] [--server http://localhost:3000] [--force]")
}

function normalizeAgentSlug(rawInput: string): string {
  const trimmed = rawInput.trim().toLowerCase()
  if (!trimmed) {
    throw new Error("Agent name is required. Example: luca poker new-agent my-bot")
  }

  if (trimmed.includes("/") || trimmed.includes("\\")) {
    throw new Error("Agent name must not include path separators.")
  }

  const slug = trimmed
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")

  if (!slug) {
    throw new Error("Agent name must include at least one letter or number.")
  }

  return slug
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ")
}

function newAgentReadmeContent(options: { slug: string; displayName: string; actorTemplate: string | null }): string {
  const templateLine = options.actorTemplate
    ? `- Starter baseline: \`${options.actorTemplate}\` actor style`
    : "- Starter baseline: built-in TAG-style strategy"

  return `# ${options.displayName}

Scaffold generated by \`luca poker new-agent\`.

## What you get

- \`strategy.ts\`: edit this first
- \`container.ts\`: local container bootstrap
- \`docs/situations/\`: notes and hand-review workspace
${templateLine}

## Quick start

1. Start the house server in another terminal:
   \`luca poker serve --seedLobby true\`
2. Register your bot:
   \`luca poker register http://127.0.0.1:3000 --name ${options.slug}\`
3. Join the table with your token:
   \`luca poker join ws://127.0.0.1:3001 --token <token>\`

Use \`strategy.ts\` as your local source of truth for decision logic and iterate quickly.
`
}

function newAgentContainerContent(): string {
  return `import { AGIContainer } from "@soederpop/luca/agi"

export function createAgentContainer(cwd = process.cwd()) {
  return new AGIContainer({ cwd })
}
`
}

function newAgentSituationNotesContent(displayName: string): string {
  return `# ${displayName} Notes

- Track difficult spots and replay IDs here.
- Keep a short hypothesis for every change you make to strategy logic.
`
}

function newAgentStrategyContent(options: { actorTemplate: string | null }): string {
  const templateNote = options.actorTemplate
    ? `\n// Seeded from house actor style: ${options.actorTemplate}\n`
    : "\n// Seeded from TAG baseline.\n"

  return `export type PokerAction = "fold" | "check" | "call" | "bet" | "raise" | "all-in"

export type DecisionContext = {
  street: "preflop" | "flop" | "turn" | "river"
  position: "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB"
  toCall: number
  potSize: number
  stack: number
  legalActions: PokerAction[]
  playersInHand: number
}

export type StrategyDecision = {
  action: PokerAction
  amount?: number
  reason?: string
}
${templateNote}
function can(action: PokerAction, context: DecisionContext): boolean {
  return context.legalActions.includes(action)
}

export function decide(context: DecisionContext): StrategyDecision {
  const deepStack = context.stack > context.potSize * 6
  const multiway = context.playersInHand >= 4

  if (context.toCall <= 0) {
    if (deepStack && !multiway && can("bet", context)) {
      return { action: "bet", amount: Math.max(1, Math.floor(context.potSize * 0.5)), reason: "tag-cbet" }
    }
    if (can("check", context)) {
      return { action: "check", reason: "free-check" }
    }
  }

  if (context.toCall > 0) {
    const potOdds = context.toCall / Math.max(context.potSize + context.toCall, 1)
    if (potOdds <= 0.25 && can("call", context)) {
      return { action: "call", reason: "pot-odds-call" }
    }
    if (can("fold", context)) {
      return { action: "fold", reason: "discipline-fold" }
    }
  }

  if (can("check", context)) {
    return { action: "check", reason: "fallback-check" }
  }
  if (can("call", context)) {
    return { action: "call", reason: "fallback-call" }
  }
  return { action: "fold", reason: "fallback-fold" }
}
`
}

async function resolveHouseActorTemplate(container: AGIContainer & any, options: PokerOptions, actorIdInput: string): Promise<string | null> {
  const actorId = String(actorIdInput || "").trim().toLowerCase()
  if (!actorId) {
    return null
  }

  const fs = container.feature("fs", { enable: true })
  const relative = String(options.houseActorsPath || "house/actors").trim() || "house/actors"
  const candidates = [
    container.paths.resolve(relative, `${actorId}.ts`),
    container.paths.resolve("playground", "luca-poker", relative, `${actorId}.ts`),
  ]

  for (const candidate of candidates) {
    if (await fs.existsAsync(candidate)) {
      return actorId
    }
  }

  throw new Error(`Unknown house actor template '${actorId}'. Expected file: ${relative}/${actorId}.ts`)
}

async function runNewAgent(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const slug = normalizeAgentSlug(String(args[0] || options.name || ""))
  const displayName = titleFromSlug(slug)
  const actorTemplate = await resolveHouseActorTemplate(container, options, String(args[1] || ""))
  const fs = container.feature("fs", { enable: true })
  const ui = container.feature("ui")

  const rootDir = container.paths.resolve(slug)
  if (await fs.existsAsync(rootDir)) {
    throw new Error(`Target directory already exists: ${rootDir}`)
  }

  fs.ensureFolder(rootDir)
  fs.ensureFolder(container.paths.resolve(rootDir, "docs"))
  fs.ensureFolder(container.paths.resolve(rootDir, "docs", "situations"))

  await fs.writeFileAsync(container.paths.resolve(rootDir, "README.md"), newAgentReadmeContent({ slug, displayName, actorTemplate }))
  await fs.writeFileAsync(container.paths.resolve(rootDir, "container.ts"), newAgentContainerContent())
  await fs.writeFileAsync(container.paths.resolve(rootDir, "strategy.ts"), newAgentStrategyContent({ actorTemplate }))
  await fs.writeFileAsync(
    container.paths.resolve(rootDir, "docs", "situations", "README.md"),
    newAgentSituationNotesContent(displayName),
  )

  printSection(container, "New Agent Scaffold")
  console.log(`Created: ${ui.colors.cyan(rootDir)}`)
  console.log(`Agent: ${ui.colors.bold(displayName)} (${slug})`)
  console.log(`Template: ${actorTemplate ? ui.colors.green(actorTemplate) : ui.colors.gray("tag")}`)
  console.log(ui.colors.gray("Files: README.md, container.ts, strategy.ts, docs/situations/README.md"))
}

async function runAnalyze(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const mode = args[0]
  const backend = "wasm" as const

  if (mode === "equity") {
    const heroInput = args[1]
    const villainInput = args[2]

    if (!heroInput || !villainInput) {
      throw new Error("Analyze equity requires two hands, e.g. luca poker analyze equity AhKd QsQc")
    }

    const hero = parseExactHand(heroInput)
    const villain = parseExactHand(villainInput)
    const board = options.board ? splitCards(options.board) : []

    const equities = await equityEngine.equityWithBackend(backend, [hero, villain], board, options.iterations)

    const heroPct = pct(equities[0]!.bestHandCount || 0, equities[0]!.possibleHandsCount || 1)
    const villainPct = pct(equities[1]!.bestHandCount || 0, equities[1]!.possibleHandsCount || 1)
    const tiePct = Number((((equities[0]!.tieHandCount || 0) / Math.max(equities[0]!.possibleHandsCount || 1, 1)) * 100).toFixed(2))

    const ui = container.feature("ui")
    printSection(container, "Equity Analysis")
    console.log(ui.colors.gray(`Backend: ${backend}`))
    console.log(`Hero (${prettyCards(hero, ui.colors)}): ${ui.colors.green(`${heroPct}%`)}`)
    console.log(`Villain (${prettyCards(villain, ui.colors)}): ${ui.colors.yellow(`${villainPct}%`)}`)
    console.log(`Split/Tie: ${ui.colors.magenta(`${tiePct}%`)}`)
    return
  }

  if (mode === "range") {
    const ours = args[1]
    const theirs = options.vs || args[2]

    if (!ours || !theirs) {
      throw new Error("Analyze range requires an input range and --vs range")
    }

    const result = await equityEngine.rangeEquityWithBackend(backend, ours, theirs, {
      board: options.board || "",
      iterations: options.iterations,
    })

    const ui = container.feature("ui")
    printSection(container, "Range Analysis")
    console.log(ui.colors.gray(`Backend: ${backend}`))
    console.log(`Us (${ui.colors.white(result.us)}): ${ui.colors.green(`${result.ours}%`)}`)
    console.log(`Them (${ui.colors.white(result.them)}): ${ui.colors.yellow(`${result.theirs}%`)}`)
    console.log(`Split/Tie: ${ui.colors.magenta(`${result.tie}%`)}`)
    return
  }

  if (mode === "hand") {
    const handInput = args[1]
    if (!handInput) {
      throw new Error("Analyze hand requires a two-card hand, e.g. luca poker analyze hand AhKd")
    }

    const hero = parseExactHand(handInput)
    const board = options.board ? splitCards(options.board) : []
    const rank = await equityEngine.evaluateHandWithBackend(backend, [...hero, ...board])

    const ui = container.feature("ui")
    printSection(container, "Hand Analysis")
    console.log(ui.colors.gray(`Backend: ${backend}`))
    console.log(`Hand: ${prettyCards(hero, ui.colors)} | Board: ${prettyCards(board, ui.colors)}`)
    console.log(`Rank: ${ui.colors.bold(rank.label)}`)

    if (Number.isFinite(options.potSize) && Number.isFinite(options.toCall)) {
      const opponentRange = options.vs || "22+,A2s+,K2s+,Q2s+,J2s+,T2s+,92s+,82s+,72s+,62s+,52s+,42s+,32s+,A2o+,K2o+,Q2o+,J2o+,T2o+,92o+,82o+,72o+,62o+,52o+,42o+,32o+"
      const exactHeroRange = new Range("", board).include(hero.join(""))
      const filteredVillainRange = new Range(opponentRange, [...hero, ...board])

      const equityVsRange = await equityEngine.rangeEquityWithBackend(
        backend,
        exactHeroRange,
        filteredVillainRange,
        { board: board.join(""), iterations: options.iterations, full: true },
      )

      const potOdds = Number(options.toCall) / Math.max(Number(options.potSize) + Number(options.toCall), 1)
      const threshold = (potOdds * 100).toFixed(2)
      const heroEq = equityVsRange.ours
      const recommendation = heroEq >= potOdds * 100 ? "continue (call/raise mix)" : "fold"

      console.log(`Equity vs range: ${ui.colors.green(`${heroEq.toFixed(2)}%`)}`)
      console.log(`Pot odds threshold: ${ui.colors.yellow(`${threshold}%`)}`)
      const recommendationColor = recommendation.startsWith("continue") ? ui.colors.green : ui.colors.red
      console.log(`Recommendation: ${recommendationColor(recommendation)}`)
    }

    return
  }

  throw new Error(`Unknown analyze mode: ${mode}`)
}

async function runSimulation(container: AGIContainer & any, options: PokerOptions) {
  await bootPokerContainer(container, { logBackend: false })
  const gameEngine = container.feature("gameEngine", { enable: true })
  const strategyFeature = container.feature("strategy", { enable: true })

  if (!options.situation) {
    throw new Error("Simulation requires --situation <doc-id-or-path>")
  }

  const situation = await loadSituation(container, options.situation)
  const assignments = normalizeStrategyAssignments(options.strategy)

  const heroProfile = assignments.hero || "tight-aggressive"
  const villainProfile = assignments.villain || situation.villain || "random"

  const seed = Number.isFinite(options.seed) ? Number(options.seed) : Date.now()
  const rng = new PRNG(seed)

  let heroWins = 0
  let villainWins = 0
  let ties = 0

  let heroEv = 0
  let villainEv = 0
  let totalPot = 0

  const heroActions: Record<string, number> = {}
  const villainActions: Record<string, number> = {}

  const position = parsePosition(situation.positions[0])
  const villainPosition: PokerPosition = position === "BTN" ? "BB" : "BTN"

  for (let i = 0; i < options.iterations; i += 1) {
    const deadCards = [...situation.heroCards, ...situation.board]
    const villainCards = strategyFeature.sampleRangeHand(villainProfile, deadCards, rng, villainPosition)

    const startingStacks = situation.stacks.length >= 2 ? situation.stacks : [100, 100]
    const heroSeat = position === "BTN" ? 1 : 2
    const villainSeat = heroSeat === 1 ? 2 : 1
    const dealerSeat = position === "BTN" ? heroSeat : villainSeat

    const initialDeck = rng.shuffle(withoutDeadCards(buildDeckStrings(), [...deadCards, ...villainCards]))

    const state: GameState = {
      ...createInitialGameState({
        seed: seed + i,
        smallBlind: 1,
        bigBlind: 2,
        ante: 0,
      }),
      handId: `sim-${seed}-${i}`,
      stage: situation.stage,
      dealer: dealerSeat,
      board: [...situation.board],
      pot: situation.potSize,
      currentBet: Math.max(situation.toCall, 0),
      currentActor: "hero",
      deck: initialDeck,
      players: [
        {
          id: "hero",
          seat: heroSeat,
          stack: startingStacks[0] as number,
          holeCards: situation.heroCards,
          inHand: true,
          folded: false,
          allIn: false,
          committed: 0,
          totalCommitted: 0,
          hasActed: false,
        },
        {
          id: "villain",
          seat: villainSeat,
          stack: startingStacks[1] as number,
          holeCards: villainCards,
          inHand: true,
          folded: false,
          allIn: false,
          committed: situation.toCall > 0 ? situation.toCall : 0,
          totalCommitted: situation.toCall > 0 ? situation.toCall : 0,
          hasActed: situation.toCall > 0,
        },
      ],
    }

    gameEngine.setGameState(state)

    const heroActor = new Actor({
      game: gameEngine,
      strategy: strategyFeature,
      playerId: "hero",
    })
    const villainActor = new Actor({
      game: gameEngine,
      strategy: strategyFeature,
      playerId: "villain",
    })

    const villainRange = strategyFeature.rangeForProfile(villainProfile, villainPosition)

    const heroDecision = await heroActor.act({
      profileName: heroProfile,
      villainCards,
      villainRange,
      inPosition: ["BTN", "CO"].includes(position),
    })

    const heroActionKey = heroDecision.action
    heroActions[heroActionKey] = (heroActions[heroActionKey] || 0) + 1

    if (gameEngine.game.currentActor === "villain" && !gameEngine.game.players.find((player: any) => player.id === "villain")?.folded) {
      const villainDecision = await villainActor.act({
        profileName: villainProfile,
        villainCards: situation.heroCards,
        villainRange: strategyFeature.rangeForProfile(heroProfile, position),
        inPosition: false,
      })

      const villainActionKey = villainDecision.action
      villainActions[villainActionKey] = (villainActions[villainActionKey] || 0) + 1
    }

    await gameEngine.finalizeRound("wasm")

    const after = gameEngine.game
    totalPot += after.winners.reduce((memo: number, winner: any) => memo + winner.amount, 0)

    const heroStackEnd = after.players.find((player: any) => player.id === "hero")?.stack ?? startingStacks[0]
    const villainStackEnd = after.players.find((player: any) => player.id === "villain")?.stack ?? startingStacks[1]

    heroEv += heroStackEnd - (startingStacks[0] as number)
    villainEv += villainStackEnd - (startingStacks[1] as number)

    const heroPaid = after.winners.find((winner: any) => winner.playerId === "hero")?.amount || 0
    const villainPaid = after.winners.find((winner: any) => winner.playerId === "villain")?.amount || 0

    if (heroPaid > villainPaid) {
      heroWins += 1
    } else if (villainPaid > heroPaid) {
      villainWins += 1
    } else {
      ties += 1
    }
  }

  const result = {
    situation: situation.id,
    seed,
    backend: "wasm",
    iterations: options.iterations,
    strategy: {
      hero: heroProfile,
      villain: villainProfile,
    },
    winRates: {
      hero: Number(((heroWins / options.iterations) * 100).toFixed(2)),
      villain: Number(((villainWins / options.iterations) * 100).toFixed(2)),
      tie: Number(((ties / options.iterations) * 100).toFixed(2)),
    },
    averagePot: Number((totalPot / options.iterations).toFixed(2)),
    actionFrequency: {
      hero: Object.fromEntries(Object.entries(heroActions).map(([action, count]) => [action, Number((count / options.iterations).toFixed(4))])),
      villain: Object.fromEntries(Object.entries(villainActions).map(([action, count]) => [action, Number((count / options.iterations).toFixed(4))])),
    },
    evPerSeat: {
      hero: Number((heroEv / options.iterations).toFixed(4)),
      villain: Number((villainEv / options.iterations).toFixed(4)),
    },
  }

  const simHash = container.utils.hashObject({
    situation: result.situation,
    seed: result.seed,
    backend: "wasm",
    iterations: result.iterations,
    strategy: result.strategy,
  })

  const cacheKey = `poker:sim:${simHash}`
  const diskCache = container.feature("diskCache", {
    enable: true,
    path: container.paths.resolve("tmp", "poker-cache"),
  })

  await diskCache.set(cacheKey, result)

  const ui = container.feature("ui")
  printSection(container, "Simulation Results")
  console.log(ui.colors.gray(`Situation: ${result.situation}`))
  console.log(ui.colors.gray(`Seed: ${seed} | Backend: wasm | Iterations: ${options.iterations}`))
  console.log(`Hero strategy: ${ui.colors.cyan(heroProfile)} | Villain strategy: ${ui.colors.cyan(villainProfile)}`)
  console.log(`Hero win rate: ${ui.colors.green(`${result.winRates.hero}%`)}`)
  console.log(`Villain win rate: ${ui.colors.yellow(`${result.winRates.villain}%`)}`)
  console.log(`Tie rate: ${ui.colors.magenta(`${result.winRates.tie}%`)}`)
  console.log(`Average pot: ${ui.colors.bold(`${result.averagePot}`)}`)
  console.log(`EV/hand hero: ${ui.colors.green(`${result.evPerSeat.hero}`)}`)
  console.log(`EV/hand villain: ${ui.colors.yellow(`${result.evPerSeat.villain}`)}`)
  console.log(ui.colors.gray(`Saved to diskCache key: ${cacheKey}`))

}

function inferHttpBaseFromWs(wsUrl: string): string | null {
  try {
    const parsed = new URL(wsUrl)
    const protocol = parsed.protocol === "wss:" ? "https:" : "http:"
    const explicitPort = parsed.port ? Number(parsed.port) : undefined
    const derivedPort = explicitPort && Number.isFinite(explicitPort) ? Math.max(1, explicitPort - 1) : undefined
    const host = derivedPort ? `${parsed.hostname}:${derivedPort}` : parsed.host
    return `${protocol}//${host}`
  } catch {
    return null
  }
}

function resolveServerIdentityForLeaderboardReset(
  container: AGIContainer & any,
  options: PokerOptions,
  explicitServerBaseUrl?: string,
): {
  serverBaseUrl: string
  port: number
  wsPort: number
  serverId: string
} {
  const fallbackPort = Math.max(1, Number(options.port || 3000))
  const serverBaseUrl = String(explicitServerBaseUrl || options.server || "").trim() || `http://127.0.0.1:${fallbackPort}`

  let port = fallbackPort
  try {
    const parsed = new URL(serverBaseUrl)
    if (parsed.port) {
      port = Math.max(1, Number(parsed.port))
    }
  } catch {}

  const wsPort = Number.isFinite(Number(options.wsPort))
    ? Math.max(1, Number(options.wsPort))
    : port + 1

  const signature = container.utils.hashObject({
    cwd: container.cwd,
    port,
    wsPort,
  })

  return {
    serverBaseUrl,
    port,
    wsPort,
    serverId: `poker-${String(signature).slice(0, 12)}`,
  }
}

function clientDiskCache(container: AGIContainer & any): any {
  return container.feature("diskCache", {
    enable: true,
    path: container.paths.resolve("tmp", "poker-cache"),
  })
}

const BOT_ENV_BLOCK_START = "# >>> luca-poker bots >>>"
const BOT_ENV_BLOCK_END = "# <<< luca-poker bots <<<"

function envQuote(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
  return `"${escaped}"`
}

function envUnquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length >= 2) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed.slice(1, -1)
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function botEnvPrefix(botId: string): string {
  const safe = String(botId || "")
    .trim()
    .replace(/^bot_/i, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
  return safe ? `POKER_BOT_${safe}` : "POKER_BOT_UNKNOWN"
}

async function resolvePokerProjectRoot(container: AGIContainer & any): Promise<string> {
  const fs = container.feature("fs", { enable: true })
  const cwdRoot = String(container.cwd || "")
  const cwdCommandPath = container.paths.resolve(cwdRoot, "commands", "poker.ts")
  const cwdPackagePath = container.paths.resolve(cwdRoot, "package.json")

  if (await fs.existsAsync(cwdCommandPath) && await fs.existsAsync(cwdPackagePath)) {
    return cwdRoot
  }

  const workspaceRoot = container.paths.resolve("playground", "luca-poker")
  const workspaceCommandPath = container.paths.resolve(workspaceRoot, "commands", "poker.ts")
  const workspacePackagePath = container.paths.resolve(workspaceRoot, "package.json")
  if (await fs.existsAsync(workspaceCommandPath) && await fs.existsAsync(workspacePackagePath)) {
    return workspaceRoot
  }

  return cwdRoot
}

type BotEnvState = {
  envPath: string
  fullContent: string
  vars: Record<string, string>
}

async function readBotEnvState(container: AGIContainer & any): Promise<BotEnvState> {
  const fs = container.feature("fs", { enable: true })
  const rootDir = await resolvePokerProjectRoot(container)
  const envPath = container.paths.resolve(rootDir, ".env")
  const exists = await fs.existsAsync(envPath)
  const fullContent = exists ? String(await fs.readFileAsync(envPath)) : ""

  const vars: Record<string, string> = {}
  const startIndex = fullContent.indexOf(BOT_ENV_BLOCK_START)
  const endIndex = fullContent.indexOf(BOT_ENV_BLOCK_END)
  if (startIndex >= 0 && endIndex > startIndex) {
    const blockStart = startIndex + BOT_ENV_BLOCK_START.length
    const blockBody = fullContent.slice(blockStart, endIndex)
    const lines = blockBody.split(/\r?\n/g)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) {
        continue
      }
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex <= 0) {
        continue
      }
      const key = trimmed.slice(0, eqIndex).trim()
      const value = envUnquote(trimmed.slice(eqIndex + 1))
      if (!key) {
        continue
      }
      vars[key] = value
    }
  }

  return { envPath, fullContent, vars }
}

async function writeBotEnvState(container: AGIContainer & any, updates: Record<string, string>): Promise<void> {
  const fs = container.feature("fs", { enable: true })
  const state = await readBotEnvState(container)
  const merged: Record<string, string> = {
    ...state.vars,
    ...updates,
  }

  const keys = Object.keys(merged).sort((a, b) => a.localeCompare(b))
  const blockLines = [
    BOT_ENV_BLOCK_START,
    "# Auto-managed local bot credentials.",
    ...keys.map((key) => `${key}=${envQuote(String(merged[key] || ""))}`),
    BOT_ENV_BLOCK_END,
  ]
  const block = `${blockLines.join("\n")}\n`

  const startIndex = state.fullContent.indexOf(BOT_ENV_BLOCK_START)
  const endIndex = state.fullContent.indexOf(BOT_ENV_BLOCK_END)
  let nextContent = state.fullContent

  if (startIndex >= 0 && endIndex > startIndex) {
    const replaceEnd = endIndex + BOT_ENV_BLOCK_END.length
    nextContent = `${state.fullContent.slice(0, startIndex)}${block}${state.fullContent.slice(replaceEnd)}`
  } else if (state.fullContent.trim().length <= 0) {
    nextContent = block
  } else {
    const suffix = state.fullContent.endsWith("\n") ? "" : "\n"
    nextContent = `${state.fullContent}${suffix}\n${block}`
  }

  await fs.writeFileAsync(state.envPath, nextContent)
}

async function loadLatestClientAuthFromEnv(container: AGIContainer & any): Promise<Record<string, unknown> | null> {
  const { vars } = await readBotEnvState(container)
  const activeBotId = String(vars.POKER_ACTIVE_BOT_ID || "").trim()
  const activePrefix = activeBotId ? botEnvPrefix(activeBotId) : ""

  const token = String(
    vars.POKER_ACTIVE_TOKEN
    || (activePrefix ? vars[`${activePrefix}_TOKEN`] : "")
    || "",
  ).trim()

  if (!token) {
    return null
  }

  return {
    botId: activeBotId || String((activePrefix ? vars[`${activePrefix}_BOT_ID`] : "") || "").trim(),
    name: String(vars.POKER_ACTIVE_BOT_NAME || (activePrefix ? vars[`${activePrefix}_NAME`] : "") || "").trim(),
    token,
    refreshToken: String(
      vars.POKER_ACTIVE_REFRESH_TOKEN
      || (activePrefix ? vars[`${activePrefix}_REFRESH_TOKEN`] : "")
      || "",
    ).trim(),
    serverId: String(
      vars.POKER_ACTIVE_SERVER_ID
      || (activePrefix ? vars[`${activePrefix}_SERVER_ID`] : "")
      || "",
    ).trim(),
    serverBaseUrl: String(
      vars.POKER_ACTIVE_SERVER_BASE_URL
      || (activePrefix ? vars[`${activePrefix}_SERVER_BASE_URL`] : "")
      || "",
    ).trim(),
    wsUrl: String(
      vars.POKER_ACTIVE_WS_URL
      || (activePrefix ? vars[`${activePrefix}_WS_URL`] : "")
      || "",
    ).trim(),
    spectatorWsUrl: String(
      vars.POKER_ACTIVE_SPECTATOR_WS_URL
      || (activePrefix ? vars[`${activePrefix}_SPECTATOR_WS_URL`] : "")
      || "",
    ).trim(),
    savedAt: Date.now(),
  }
}

async function saveClientAuth(container: AGIContainer & any, payload: Record<string, unknown>): Promise<void> {
  const diskCache = clientDiskCache(container)
  const saved = {
    ...payload,
    savedAt: Date.now(),
  }

  const latestKey = "poker:client:auth:latest"
  await diskCache.set(latestKey, saved)

  const serverId = String(saved.serverId || "unknown")
  const botId = String(saved.botId || "unknown")
  await diskCache.set(`poker:client:auth:${serverId}:${botId}`, saved)

  const normalizedBotId = String(saved.botId || "").trim()
  const prefix = botEnvPrefix(normalizedBotId)
  await writeBotEnvState(container, {
    POKER_ACTIVE_BOT_ID: normalizedBotId,
    POKER_ACTIVE_BOT_NAME: String(saved.name || "").trim(),
    POKER_ACTIVE_TOKEN: String(saved.token || "").trim(),
    POKER_ACTIVE_REFRESH_TOKEN: String(saved.refreshToken || "").trim(),
    POKER_ACTIVE_SERVER_ID: String(saved.serverId || "").trim(),
    POKER_ACTIVE_SERVER_BASE_URL: String(saved.serverBaseUrl || "").trim(),
    POKER_ACTIVE_WS_URL: String(saved.wsUrl || "").trim(),
    POKER_ACTIVE_SPECTATOR_WS_URL: String(saved.spectatorWsUrl || "").trim(),
    [`${prefix}_BOT_ID`]: normalizedBotId,
    [`${prefix}_NAME`]: String(saved.name || "").trim(),
    [`${prefix}_TOKEN`]: String(saved.token || "").trim(),
    [`${prefix}_REFRESH_TOKEN`]: String(saved.refreshToken || "").trim(),
    [`${prefix}_SERVER_ID`]: String(saved.serverId || "").trim(),
    [`${prefix}_SERVER_BASE_URL`]: String(saved.serverBaseUrl || "").trim(),
    [`${prefix}_WS_URL`]: String(saved.wsUrl || "").trim(),
    [`${prefix}_SPECTATOR_WS_URL`]: String(saved.spectatorWsUrl || "").trim(),
  })
}

async function loadLatestClientAuth(container: AGIContainer & any): Promise<Record<string, unknown> | null> {
  const diskCache = clientDiskCache(container)
  const key = "poker:client:auth:latest"
  if (!(await diskCache.has(key))) {
    return loadLatestClientAuthFromEnv(container)
  }

  const value = await diskCache.get(key, true)
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return loadLatestClientAuthFromEnv(container)
  }

  return value || loadLatestClientAuthFromEnv(container)
}

async function registerBotViaHttp(
  container: AGIContainer & any,
  serverBaseUrl: string,
  name: string,
): Promise<Record<string, unknown>> {
  const rest = container.client("rest", {
    baseURL: serverBaseUrl,
    json: true,
  })

  const response = await rest.post("/api/v1/bots/register", {
    name,
    agentVersion: "luca-poker/plan3",
  })

  if (!response || typeof response !== "object" || !("token" in response)) {
    throw new Error(`Registration failed against ${serverBaseUrl}`)
  }

  const payload = response as Record<string, unknown>
  await saveClientAuth(container, {
    ...payload,
    serverBaseUrl,
    name,
  })

  return payload
}

type JoinDecision = {
  action: string
  amount?: number
}

function normalizeJoinDecision(
  available: string[],
  toCall: number,
  pot: number,
  candidate: JoinDecision,
): JoinDecision {
  let action = String(candidate.action || "").trim().toLowerCase()
  let amount = candidate.amount

  if (!available.includes(action)) {
    if (toCall > 0) {
      action = available.includes("call") ? "call" : "fold"
      amount = undefined
    } else {
      action = available.includes("check") ? "check" : "bet"
      amount = action === "bet" ? Math.max(1, Math.round(Math.max(1, pot * 0.5))) : undefined
    }
  }

  if ((action === "bet" || action === "raise") && !Number.isFinite(Number(amount))) {
    amount = action === "raise"
      ? Math.max(toCall * 2, Math.round(Math.max(2, pot * 0.75)))
      : Math.max(1, Math.round(Math.max(1, pot * 0.5)))
  }

  return {
    action,
    ...(amount !== undefined ? { amount } : {}),
  }
}

async function promptManualDecision(
  ui: any,
  info: {
    stage: string
    board: string[]
    heroCards: string[]
    available: string[]
    toCall: number
    pot: number
    stack: number
    timeRemaining: number
    timeBankRemaining: number
  },
  fallback: JoinDecision,
): Promise<JoinDecision> {
  const boardText = info.board.length ? info.board.join(" ") : "(no board yet)"
  const cardsText = info.heroCards.length ? info.heroCards.join(" ") : "(hidden)"
  console.log(ui.colors.gray(`[manual] stage=${info.stage} cards=${cardsText} board=${boardText} pot=${info.pot} toCall=${info.toCall} stack=${info.stack} t=${info.timeRemaining}s bank=${info.timeBankRemaining}s`))

  const actionChoices = [
    ...info.available.map((value) => ({ name: value, value })),
    { name: "bot decide", value: "__bot__" },
  ]

  const answers = await ui.wizard([{
    type: "list",
    name: "action",
    message: "Choose action",
    choices: actionChoices,
  }])

  const picked = String(answers.action || "__bot__")
  if (picked === "__bot__") {
    return fallback
  }

  if (picked === "bet" || picked === "raise") {
    const amountFallback = Number.isFinite(Number(fallback.amount))
      ? Number(fallback.amount)
      : (picked === "raise" ? Math.max(info.toCall * 2, 2) : Math.max(1, Math.round(Math.max(1, info.pot * 0.5))))
    const amountAnswer = await ui.wizard([{
      type: "input",
      name: "amount",
      message: `Amount for ${picked}`,
      default: String(amountFallback),
      validate: (value: string) => {
        const numeric = Number(value)
        return Number.isFinite(numeric) && numeric > 0 ? true : "Enter a positive number"
      },
    }])
    return {
      action: picked,
      amount: Number(amountAnswer.amount),
    }
  }

  return { action: picked }
}

function portTriplet(basePort: number): { port: number; wsPort: number; spectatorPort: number } {
  const port = Math.max(1, Math.floor(basePort))
  const wsPort = port + 1
  const spectatorPort = port + 2
  if (spectatorPort > 65535) {
    throw new Error(`Port triplet exceeds range: http=${port} ws=${wsPort} spectator=${spectatorPort}`)
  }
  return { port, wsPort, spectatorPort }
}

async function listBusyPorts(networking: any, ports: number[]): Promise<number[]> {
  const checks = await Promise.all(ports.map(async (port) => ({
    port,
    isFree: await networking.isPortOpen(port),
  })))
  return checks.filter((row) => !row.isFree).map((row) => row.port)
}

async function resolveServePorts(container: AGIContainer & any, options: PokerOptions): Promise<{ port: number; wsPort: number; spectatorPort: number }> {
  const networking = container.feature("networking", { enable: true })
  const proc = container.feature("proc", { enable: true })

  const requestedBasePort = Math.max(1, Number(options.port || 3000))

  if (options.anyPort) {
    for (let candidate = requestedBasePort; candidate <= 65533; candidate += 1) {
      const triplet = portTriplet(candidate)
      const busy = await listBusyPorts(networking, [triplet.port, triplet.wsPort, triplet.spectatorPort])
      if (busy.length === 0) {
        return triplet
      }
    }
    throw new Error(`No available contiguous port triplet found from ${requestedBasePort} upward.`)
  }

  const triplet = portTriplet(requestedBasePort)
  const allPorts = [triplet.port, triplet.wsPort, triplet.spectatorPort]
  const busyPorts = await listBusyPorts(networking, allPorts)
  if (busyPorts.length === 0) {
    return triplet
  }

  if (!options.force) {
    throw new Error(`Port(s) in use: ${busyPorts.join(", ")}. Re-run with --force true or --anyPort true.`)
  }

  const pidSet = new Set<number>()
  for (const port of allPorts) {
    const pids = proc.findPidsByPort(port) as number[]
    for (const pid of pids || []) {
      if (Number.isFinite(Number(pid)) && Number(pid) > 0) {
        pidSet.add(Number(pid))
      }
    }
  }

  if (pidSet.size === 0) {
    throw new Error(`Port(s) in use (${busyPorts.join(", ")}), but no PID could be discovered for termination.`)
  }

  for (const pid of pidSet) {
    proc.kill(pid)
  }

  let freed = false
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const stillBusy = await listBusyPorts(networking, allPorts)
    if (stillBusy.length === 0) {
      freed = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  if (!freed) {
    const stillBusy = await listBusyPorts(networking, allPorts)
    throw new Error(`Failed to free port triplet http=${triplet.port} ws=${triplet.wsPort} spectator=${triplet.spectatorPort}. Still busy: ${stillBusy.join(", ")}`)
  }

  return triplet
}

async function runServe(container: AGIContainer & any, options: PokerOptions) {
  const ports = await resolveServePorts(container, options)
  if (Number.isFinite(Number(options.wsPort)) || Number.isFinite(Number(options.spectatorPort))) {
    console.log(`[poker-server] using derived ports from base ${ports.port}: ws=${ports.wsPort}, spectator=${ports.spectatorPort} (explicit --wsPort/--spectatorPort ignored)`)
  }

  const runtime = new PokerServerRuntime(container, {
    host: options.host,
    port: ports.port,
    wsPort: ports.wsPort,
    spectatorPort: ports.spectatorPort,
    defaultTable: options.defaultTable,
    seedLobby: options.seedLobby,
    actionTimeout: options.actionTimeout,
    timeBankStartSeconds: options.timeBankStartSeconds,
    timeBankCapSeconds: options.timeBankCapSeconds,
    timeBankAccrualSeconds: options.timeBankAccrualSeconds,
    botThinkDelayMinMs: options.botThinkDelayMinMs,
    botThinkDelayMaxMs: options.botThinkDelayMaxMs,
    reconnectGraceMs: options.reconnectGraceMs,
    houseActorsPath: options.houseActorsPath,
  })

  await runtime.start()

  await new Promise<void>((resolve) => {
    let done = false

    const shutdown = async (signal: string) => {
      if (done) {
        return
      }
      done = true
      console.log(`[poker-server] ${signal} received, finishing active hands and shutting down...`)
      await Promise.race([
        runtime.stop(),
        new Promise((resolve) => setTimeout(resolve, 7000)),
      ])
      resolve()
      process.exit(0)
    }

    process.once("SIGINT", () => { void shutdown("SIGINT") })
    process.once("SIGTERM", () => { void shutdown("SIGTERM") })
  })
}

async function runRegister(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const serverBaseUrl = String(args[0] || options.server || "").trim()
  if (!serverBaseUrl) {
    throw new Error("Usage: luca poker register http://host:port --name my-bot")
  }

  const name = String(options.name || `bot-${container.utils.uuid().slice(0, 6)}`)
  const result = await registerBotViaHttp(container, serverBaseUrl, name)

  const ui = container.feature("ui")
  printSection(container, "Bot Registration")
  console.log(`Server: ${ui.colors.cyan(serverBaseUrl)}`)
  console.log(`Bot: ${ui.colors.bold(String(result.botId || "unknown"))} (${name})`)
  console.log(`Token: ${ui.colors.green(String(result.token || ""))}`)
  console.log(`Refresh: ${ui.colors.gray(String(result.refreshToken || ""))}`)
  console.log(`WS URL: ${ui.colors.yellow(String(result.wsUrl || ""))}`)
  if (result.spectatorWsUrl) {
    console.log(`Spectator WS: ${ui.colors.cyan(String(result.spectatorWsUrl))}`)
  }
  console.log(ui.colors.gray("Saved token to diskCache (poker:client:auth:latest) and .env bot block."))
}

function normalizeSeedPrefix(raw: string): string {
  const normalized = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized || "seed-bot"
}

function parseSeedArgs(options: PokerOptions, args: string[]): {
  serverBaseUrl: string
  count: number
  prefix: string
} {
  let serverBaseUrl = String(options.server || "").trim() || `http://127.0.0.1:${options.port}`
  const count = Math.max(1, Math.min(200, Number(options.seedCount || 4)))
  let prefix = normalizeSeedPrefix(String(options.seedPrefix || "seed-bot"))

  for (const token of args.map((entry) => String(entry || "").trim()).filter(Boolean)) {
    if (/^https?:\/\//i.test(token)) {
      serverBaseUrl = token
      continue
    }

    prefix = normalizeSeedPrefix(token)
  }

  return {
    serverBaseUrl,
    count,
    prefix,
  }
}

async function runSeed(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const ui = container.feature("ui")
  const { serverBaseUrl, count, prefix } = parseSeedArgs(options, args)
  const created: Array<{
    name: string
    botId: string
    token: string
    refreshToken: string
    wsUrl: string
    serverId: string
  }> = []

  printSection(container, "Bot Seeding")
  console.log(`Server: ${ui.colors.cyan(serverBaseUrl)}`)
  console.log(`Count: ${ui.colors.bold(String(count))}`)
  console.log(`Prefix: ${ui.colors.gray(prefix)}`)

  for (let i = 0; i < count; i += 1) {
    const name = `${prefix}-${String(i + 1).padStart(2, "0")}`
    const result = await registerBotViaHttp(container, serverBaseUrl, name)
    const botId = String(result.botId || "")
    const token = String(result.token || "")
    const refreshToken = String(result.refreshToken || "")
    const wsUrl = String(result.wsUrl || "")
    const serverId = String(result.serverId || "")

    created.push({
      name,
      botId,
      token,
      refreshToken,
      wsUrl,
      serverId,
    })

    console.log(`${ui.colors.green(`+ ${name}`)} ${ui.colors.gray(botId)}`)
  }

  const last = created[created.length - 1]
  if (last) {
    await writeBotEnvState(container, {
      POKER_SEED_LAST_COUNT: String(count),
      POKER_SEED_LAST_PREFIX: prefix,
      POKER_SEED_LAST_SERVER_BASE_URL: serverBaseUrl,
      POKER_SEED_LAST_SERVER_ID: String(last.serverId || ""),
      POKER_SEED_LAST_WS_URL: String(last.wsUrl || ""),
      POKER_SEED_LAST_BOT_IDS: created.map((entry) => entry.botId).join(","),
      POKER_SEED_LAST_BOT_NAMES: created.map((entry) => entry.name).join(","),
      POKER_SEED_LAST_RUN_AT: new Date().toISOString(),
    })
  }

  console.log("")
  console.log(ui.colors.bold("Seed Summary"))
  console.log(`Created: ${created.length}`)
  console.log(`Active bot in .env: ${ui.colors.gray(String(last?.botId || "(none)"))}`)
  console.log(ui.colors.gray("Credentials saved into .env managed bot block."))
}

async function runJoin(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const wsUrl = String(args[0] || "").trim()
  if (!wsUrl) {
    throw new Error("Usage: luca poker join ws://host:port [--token ...]")
  }

  let token = options.token ? String(options.token) : ""
  const explicitServer = options.server ? String(options.server).trim() : ""
  const inferredServer = inferHttpBaseFromWs(wsUrl) || ""
  const serverBaseUrl = explicitServer || inferredServer

  if (!token) {
    const latest = await loadLatestClientAuth(container)
    token = latest?.token ? String(latest.token) : ""
  }

  if (!token && (options.autoRegister || options.name)) {
    if (!serverBaseUrl) {
      throw new Error("Auto-register requires --server http://host:port (or a ws URL where host/port inference works)")
    }

    const name = String(options.name || `bot-${container.utils.uuid().slice(0, 6)}`)
    const registration = await registerBotViaHttp(container, serverBaseUrl, name)
    token = String(registration.token || "")
  }

  if (!token) {
    throw new Error("No token provided. Use --token, run `luca poker register ...`, or pass --autoRegister --name.")
  }

  const ui = container.feature("ui")
  const client = new PokerClient(container, { wsUrl, reconnect: true })
  const strategyFeature = container.feature("strategy", { enable: true }) as any
  const strategyMap = normalizeStrategyAssignments(options.strategy)
  const preferredProfile = strategyMap.hero
    || strategyMap.player
    || (typeof options.strategy === "string" ? options.strategy.trim() : "")
    || "tight-aggressive"
  const manualEnabled = options.manual === true && Boolean(process.stdin?.isTTY)

  const liveState: {
    heroCards: [string, string] | []
    board: string[]
    stage: string
    position: PokerPosition
    pot: number
    toCall: number
    stack: number
    playersInHand: number
    availableActions: string[]
    timeRemaining: number
    timeBankRemaining: number
  } = {
    heroCards: [],
    board: [],
    stage: "preflop",
    position: "BTN",
    pot: 0,
    toCall: 0,
    stack: 0,
    playersInHand: 2,
    availableActions: [],
    timeRemaining: 0,
    timeBankRemaining: 0,
  }

  const stats = {
    botId: "",
    hands: 0,
    wins: 0,
    biggestPot: 0,
    actions: 0,
  }

  let deciding = false

  client.onMessage((message) => {
    if (message.type === "error") {
      console.log(ui.colors.red(`[error] ${String(message.payload?.message || "unknown")}`))
      return
    }

    if (message.type === "chat") {
      console.log(ui.colors.gray(`[chat] ${String(message.payload?.from || "table")}: ${String(message.payload?.message || "")}`))
      return
    }

    if (message.type === "action_taken") {
      const actor = String(message.payload?.playerName || message.payload?.seat || "player")
      const action = String(message.payload?.action || "")
      const amount = message.payload?.amount !== undefined ? ` ${String(message.payload.amount)}` : ""
      console.log(ui.colors.yellow(`[action] ${actor}: ${action}${amount}`))
      return
    }

    if (message.type === "wallet_state") {
      const balance = String(message.payload?.balance ?? "")
      console.log(ui.colors.green(`[wallet] balance=${balance}`))
      return
    }

    if (message.type === "timebank_state") {
      const remaining = Number(message.payload?.timeBankRemaining ?? message.payload?.remaining ?? liveState.timeBankRemaining ?? 0)
      liveState.timeBankRemaining = Number.isFinite(remaining) ? remaining : liveState.timeBankRemaining
      const reason = String(message.payload?.reason || "update")
      console.log(ui.colors.gray(`[timebank] ${reason} remaining=${liveState.timeBankRemaining}s`))
      return
    }

    if (message.type === "auth_ok") {
      stats.botId = String(message.payload?.botId || "")
      return
    }

    if (message.type === "deal") {
      const cards = message.payload?.holeCards
      if (Array.isArray(cards) && cards.length === 2) {
        liveState.heroCards = [String(cards[0]), String(cards[1])]
      }
      liveState.stage = "preflop"
      liveState.board = []
      liveState.position = parsePosition(String(message.payload?.position || "BTN"))
      stats.hands += 1
      console.log(ui.colors.cyan(`[hand] #${stats.hands} cards=${prettyCards(liveState.heroCards, ui.colors)}`))
      return
    }

    if (message.type === "state") {
      liveState.stage = String(message.payload?.stage || liveState.stage)
      liveState.board = Array.isArray(message.payload?.board)
        ? message.payload!.board.map((entry: unknown) => String(entry))
        : liveState.board
      liveState.pot = Number(message.payload?.pot || liveState.pot || 0)
      liveState.toCall = Number(message.payload?.toCall || 0)
      liveState.stack = Number(message.payload?.stack || liveState.stack || 0)
      liveState.playersInHand = Number(message.payload?.playersInHand || liveState.playersInHand || 2)
      liveState.availableActions = Array.isArray(message.payload?.availableActions)
        ? message.payload!.availableActions.map((entry: unknown) => String(entry))
        : liveState.availableActions
      if (message.payload?.position) {
        liveState.position = parsePosition(String(message.payload.position))
      }
      return
    }

    if (message.type === "hand_result") {
      const pot = Number(message.payload?.pot || 0)
      stats.biggestPot = Math.max(stats.biggestPot, pot)
      const winners = Array.isArray(message.payload?.winners) ? message.payload!.winners : []
      const heroWon = winners.some((entry: any) => entry && String(entry.playerId || "") === stats.botId)
      if (heroWon) {
        stats.wins += 1
      }
      const outcome = heroWon ? ui.colors.green("won") : ui.colors.gray("lost")
      console.log(`${ui.colors.cyan("[result]")} ${outcome} pot=${pot}`)
      return
    }

    if (message.type === "action_on_you") {
      if (deciding) {
        return
      }

      deciding = true
      ;(async () => {
        try {
          const available = Array.isArray(message.payload?.availableActions)
            ? message.payload!.availableActions.map((entry: unknown) => String(entry))
            : liveState.availableActions
          const toCall = Number(message.payload?.toCall ?? liveState.toCall ?? 0)
          const pot = Number(message.payload?.pot ?? liveState.pot ?? 0)
          const stack = Number(message.payload?.stack ?? liveState.stack ?? 0)
          const stage = String(message.payload?.stage || liveState.stage || "preflop")
          const timeRemaining = Number(message.payload?.timeRemaining ?? liveState.timeRemaining ?? 0)
          const timeBankRemaining = Number(message.payload?.timeBankRemaining ?? liveState.timeBankRemaining ?? 0)

          liveState.stage = stage
          liveState.pot = pot
          liveState.toCall = toCall
          liveState.stack = stack
          liveState.availableActions = available
          liveState.timeRemaining = Number.isFinite(timeRemaining) ? timeRemaining : liveState.timeRemaining
          liveState.timeBankRemaining = Number.isFinite(timeBankRemaining) ? timeBankRemaining : liveState.timeBankRemaining

          const street = ["flop", "turn", "river"].includes(stage) ? stage as "flop" | "turn" | "river" : "preflop"
          const heroCards = liveState.heroCards.length === 2 ? liveState.heroCards : ["Ah", "As"]
          const inPosition = ["BTN", "CO"].includes(liveState.position)

          const strategyDecision = await strategyFeature.decide(preferredProfile, {
            heroCards,
            board: liveState.board,
            street,
            position: liveState.position,
            inPosition,
            checkedTo: toCall <= 0,
            potSize: pot,
            toCall,
            effectiveStack: stack,
            playersInHand: liveState.playersInHand,
            playersLeftToAct: Math.max(0, liveState.playersInHand - 1),
            facingBet: toCall > 0,
            facingRaise: toCall > 0,
            facingThreeBet: false,
          })
          const botDecision = normalizeJoinDecision(available, toCall, pot, {
            action: String(strategyDecision.action || ""),
            ...(strategyDecision.amount !== undefined ? { amount: Number(strategyDecision.amount) } : {}),
          })

          const selectedDecision = manualEnabled
            ? normalizeJoinDecision(
              available,
              toCall,
              pot,
              await promptManualDecision(
                ui,
                {
                  stage,
                  board: liveState.board,
                  heroCards: [...heroCards],
                  available,
                  toCall,
                  pot,
                  stack,
                  timeRemaining,
                  timeBankRemaining,
                },
                botDecision,
              ),
            )
            : botDecision

          stats.actions += 1
          await client.send("action", {
            action: selectedDecision.action,
            ...(selectedDecision.amount !== undefined ? { amount: selectedDecision.amount } : {}),
          })

          const amountText = selectedDecision.amount !== undefined ? ` ${selectedDecision.amount}` : ""
          console.log(ui.colors.magenta(`[you] ${selectedDecision.action}${amountText}`))
        } catch (error: any) {
          console.log(ui.colors.red(`[decide-error] ${String(error?.message || error)}`))
        } finally {
          deciding = false
        }
      })()
    }
  })

  await client.connect()
  const auth = await client.authenticate(token)
  stats.botId = String(auth.payload?.botId || "")

  printSection(container, "Agent Join")
  console.log(`Connected: ${ui.colors.cyan(wsUrl)}`)
  console.log(ui.colors.gray(`Authenticated as ${stats.botId || "bot"}. Strategy: ${preferredProfile}`))
  if (options.manual && !manualEnabled) {
    console.log(ui.colors.yellow("Manual mode requested, but stdin is not interactive. Falling back to bot decisions."))
  } else if (manualEnabled) {
    console.log(ui.colors.gray("Manual override enabled: each `action_on_you` prompt lets you pick or delegate to the bot."))
  }

  const tablesMessage = await client.requestTables()
  const payload = (tablesMessage.payload && typeof tablesMessage.payload === "object") ? tablesMessage.payload : {}
  const rows = Array.isArray(payload.tables) ? payload.tables as Array<any> : []
  const requestedTable = options.table ? String(options.table) : ""
  const chosen = requestedTable
    ? rows.find((entry) => entry && typeof entry === "object" && String(entry.id) === requestedTable)
    : rows[0]

  if (chosen && chosen.id) {
    const joined = await client.joinTable(String(chosen.id))
    const joinedPayload = joined.payload && typeof joined.payload === "object" ? joined.payload : {}
    console.log(`Joined table: ${ui.colors.bold(String(joinedPayload.tableId || chosen.id))}`)
    console.log(`Seat: ${ui.colors.cyan(String(joinedPayload.seat || "?"))}`)
  } else {
    console.log(ui.colors.yellow("No available table to join yet."))
  }

  await client.requestWallet()
  console.log(ui.colors.gray("Listening for table events. Press Ctrl+C to exit."))

  await new Promise<void>((resolve) => {
    let done = false

    const stop = async (signal: string) => {
      if (done) {
        return
      }
      done = true
      console.log(ui.colors.gray(`\\n${signal} received. Disconnecting...`))
      await client.disconnect()
      console.log(ui.colors.cyan(`Hands: ${stats.hands} | Wins: ${stats.wins} | Actions: ${stats.actions} | Biggest pot: ${stats.biggestPot}`))
      resolve()
    }

    process.once("SIGINT", () => { void stop("SIGINT") })
    process.once("SIGTERM", () => { void stop("SIGTERM") })
  })
}

async function runWatch(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const wsUrl = String(args[0] || "").trim()
  if (!wsUrl) {
    throw new Error("Usage: luca poker watch ws://host:port [--table <tableId>]")
  }

  const ui = container.feature("ui")
  const client = new PokerClient(container, { wsUrl, reconnect: true })

  const live = {
    tableId: "",
    handNumber: 0,
    stage: "waiting",
    pot: 0,
    board: [] as string[],
    players: [] as Array<{ name: string; seat: number; stack: number; inHand?: boolean; folded?: boolean; allIn?: boolean }>,
  }

  const renderTable = () => {
    if (!live.tableId) {
      return
    }
    console.log("")
    console.log(ui.colors.bold.cyan(`Table ${live.tableId} | Hand ${live.handNumber} | ${String(live.stage).toUpperCase()} | Pot ${live.pot}`))
    const boardText = live.board.length ? live.board.join(" ") : "(no board)"
    console.log(ui.colors.gray(`Board: ${boardText}`))
    const players = [...live.players].sort((left, right) => left.seat - right.seat)
    for (const player of players) {
      const flags = [
        player.inHand === false ? "out" : "",
        player.folded ? "folded" : "",
        player.allIn ? "all-in" : "",
      ].filter(Boolean).join(", ")
      console.log(`${String(player.seat).padStart(2, " ")}. ${player.name.padEnd(18, " ")} stack=${String(player.stack).padStart(5, " ")}${flags ? ` (${flags})` : ""}`)
    }
  }

  client.onMessage((message) => {
    if (message.type === "error") {
      console.log(ui.colors.red(`[error] ${String(message.payload?.message || "unknown")}`))
      return
    }

    if (message.type === "chat") {
      console.log(ui.colors.gray(`[chat] ${String(message.payload?.from || "table")}: ${String(message.payload?.message || "")}`))
      return
    }

    if (message.type === "spectator_state") {
      live.tableId = String(message.payload?.tableId || live.tableId)
      live.handNumber = Number(message.payload?.handNumber || live.handNumber || 0)
      live.stage = String(message.payload?.stage || live.stage || "waiting")
      live.pot = Number(message.payload?.pot || live.pot || 0)
      live.board = Array.isArray(message.payload?.board)
        ? message.payload!.board.map((entry: unknown) => String(entry))
        : live.board
      live.players = Array.isArray(message.payload?.players)
        ? message.payload!.players.map((entry: any) => ({
          name: String(entry?.name || entry?.botId || "player"),
          seat: Number(entry?.seat || 0),
          stack: Number(entry?.stack || 0),
          inHand: Boolean(entry?.inHand),
          folded: Boolean(entry?.folded),
          allIn: Boolean(entry?.allIn),
        }))
        : live.players
      renderTable()
      return
    }

    if (message.type === "action_taken") {
      const actor = String(message.payload?.playerName || message.payload?.seat || "player")
      const action = String(message.payload?.action || "")
      const amount = message.payload?.amount !== undefined ? ` ${String(message.payload.amount)}` : ""
      console.log(ui.colors.yellow(`[action] ${actor}: ${action}${amount}`))
      return
    }

    if (message.type === "hand_result") {
      const winners = Array.isArray(message.payload?.winners) ? message.payload!.winners as Array<any> : []
      const summary = winners
        .map((winner) => `${String(winner.playerId || "")} +${String(winner.amount || 0)}`)
        .join(", ")
      console.log(ui.colors.green(`[result] pot=${String(message.payload?.pot || 0)} winners=${summary || "none"}`))
      return
    }
  })

  await client.connect()
  await client.send("list_tables", {})
  const tablesMessage = await client.waitFor("tables", 10_000)
  const payload = (tablesMessage.payload && typeof tablesMessage.payload === "object") ? tablesMessage.payload : {}
  const rows = Array.isArray(payload.tables) ? payload.tables as Array<any> : []

  const requestedTable = options.table ? String(options.table) : ""
  const chosen = requestedTable
    ? rows.find((entry) => entry && typeof entry === "object" && (String(entry.id) === requestedTable || String(entry.name || "") === requestedTable))
    : rows[0]

  if (!chosen || !chosen.id) {
    throw new Error("No table available to spectate. Pass --table once a table exists.")
  }

  await client.send("spectate", { tableId: String(chosen.id) })
  await client.waitFor("spectator_joined", 10_000)

  printSection(container, "Spectator Watch")
  console.log(`Connected: ${ui.colors.cyan(wsUrl)}`)
  console.log(`Watching table: ${ui.colors.bold(String(chosen.id))}`)
  console.log(ui.colors.gray("Listening for spectator events. Press Ctrl+C to exit."))

  await new Promise<void>((resolve) => {
    let done = false

    const stop = async (signal: string) => {
      if (done) {
        return
      }
      done = true
      console.log(ui.colors.gray(`\\n${signal} received. Disconnecting spectator...`))
      await client.disconnect()
      resolve()
    }

    process.once("SIGINT", () => { void stop("SIGINT") })
    process.once("SIGTERM", () => { void stop("SIGTERM") })
  })
}

async function runHouseStatus(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const explicit = String(args[0] || options.server || "").trim()
  const serverBaseUrl = explicit || `http://127.0.0.1:${options.port}`

  const rest = container.client("rest", {
    baseURL: serverBaseUrl,
    json: true,
  })

  const payload = await rest.get("/api/v1/house/status") as Record<string, any>
  const ui = container.feature("ui")
  const endpoints = payload?.endpoints && typeof payload.endpoints === "object" ? payload.endpoints : {}
  const actorRegistry = payload?.actorRegistry && typeof payload.actorRegistry === "object" ? payload.actorRegistry : {}
  const tables = payload?.tables && typeof payload.tables === "object" ? payload.tables : {}
  const houseBots = payload?.houseBots && typeof payload.houseBots === "object" ? payload.houseBots : {}
  const connections = payload?.connections && typeof payload.connections === "object" ? payload.connections : {}

  printSection(container, "House Status")
  console.log(`Server: ${ui.colors.cyan(serverBaseUrl)}`)
  console.log(`Status: ${String(payload?.status || "unknown") === "up" ? ui.colors.green("up") : ui.colors.red(String(payload?.status || "down"))}`)
  console.log(`Ready: ${payload?.ready ? ui.colors.green("yes") : ui.colors.yellow("no")}`)
  console.log(`Uptime: ${ui.colors.gray(`${Number(payload?.uptimeMs || 0)} ms`)}`)
  console.log(`HTTP: ${ui.colors.gray(String(endpoints.http || ""))}`)
  console.log(`WS: ${ui.colors.gray(String(endpoints.ws || ""))}`)
  if (endpoints.spectatorWs) {
    console.log(`Spectator WS: ${ui.colors.gray(String(endpoints.spectatorWs))}`)
  }
  console.log("")
  console.log(ui.colors.bold("Actor Registry"))
  console.log(`Path: ${String(actorRegistry.path || "(unknown)")}`)
  console.log(`Loaded: ${String(actorRegistry.loaded || 0)}`)
  const actorIds = Array.isArray(actorRegistry.actorIds) ? actorRegistry.actorIds.map((entry) => String(entry)) : []
  console.log(`Actors: ${actorIds.join(", ") || "(none)"}`)
  const loadErrors = Array.isArray(actorRegistry.loadErrors) ? actorRegistry.loadErrors : []
  if (loadErrors.length > 0) {
    console.log(ui.colors.yellow(`Load errors: ${loadErrors.length}`))
    for (const entry of loadErrors.slice(0, 5)) {
      const path = String((entry && entry.path) || "")
      const error = String((entry && entry.error) || "unknown")
      console.log(ui.colors.yellow(`- ${path}: ${error}`))
    }
  }
  console.log("")
  console.log(ui.colors.bold("Runtime"))
  console.log(`Tables: total=${Number(tables.total || 0)} active=${Number(tables.active || 0)} waiting=${Number(tables.waiting || 0)} paused=${Number(tables.paused || 0)}`)
  console.log(`House bots: registered=${Number(houseBots.registered || 0)} seated=${Number(houseBots.seated || 0)}`)
  console.log(`Connections: agents=${Number(connections.authenticatedAgents || 0)} spectators=${Number(connections.spectators || 0)}`)
}

async function runHouse(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const houseSubcommand = String(args[0] || "status").toLowerCase()

  if (houseSubcommand === "status") {
    await runHouseStatus(container, options, args.slice(1))
    return
  }

  throw new Error(`Unknown house subcommand: ${houseSubcommand}`)
}

async function runLeaderboardReset(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const explicit = String(args[0] || options.server || "").trim()
  const identity = resolveServerIdentityForLeaderboardReset(container, options, explicit)
  const ui = container.feature("ui")

  if (!options.force) {
    if (!process.stdin?.isTTY) {
      throw new Error("Leaderboard reset requires confirmation. Re-run with --force in non-interactive mode.")
    }

    const answer = await ui.wizard([{
      type: "confirm",
      name: "confirmed",
      message: `Reset leaderboard for ${identity.serverBaseUrl}? This keeps hand history but ignores all prior hands for rankings.`,
      default: false,
    }])

    if (!answer?.confirmed) {
      console.log(ui.colors.yellow("Leaderboard reset cancelled."))
      return
    }
  }

  const diskCache = container.feature("diskCache", {
    enable: true,
    path: container.paths.resolve("tmp", "poker-cache"),
  })

  const resetKey = `poker:server:${identity.serverId}:leaderboard:reset-state`
  const invalidationsKey = `poker:server:${identity.serverId}:leaderboard:invalidations`
  const previous = await diskCache.get(resetKey, true).catch(() => null) as Record<string, unknown> | null
  const now = Date.now()

  await diskCache.set(resetKey, {
    resetAt: now,
    updatedAt: now,
  })
  await diskCache.set(invalidationsKey, {
    hands: [],
    tables: [],
    tournaments: [],
    updatedAt: now,
  })

  printSection(container, "Leaderboard Reset")
  console.log(`Server: ${ui.colors.cyan(identity.serverBaseUrl)}`)
  console.log(`Server ID: ${ui.colors.gray(identity.serverId)}`)
  console.log(`Ports: http=${identity.port} ws=${identity.wsPort}`)
  console.log(`Reset at: ${ui.colors.green(new Date(now).toISOString())}`)
  if (previous && Number(previous.resetAt || 0) > 0) {
    console.log(`Previous reset: ${ui.colors.gray(new Date(Number(previous.resetAt)).toISOString())}`)
  }
  console.log(ui.colors.gray("Leaderboard baseline reset complete (local diskCache mutation)."))
}

async function runLeaderboard(container: AGIContainer & any, options: PokerOptions, args: string[]) {
  const leaderboardSubcommand = String(args[0] || "").trim().toLowerCase()
  if (leaderboardSubcommand === "reset") {
    await runLeaderboardReset(container, options, args.slice(1))
    return
  }

  throw new Error(`Unknown leaderboard subcommand: ${leaderboardSubcommand || "(missing)"}`)
}

export async function handler(options: PokerOptions, context: ContainerContext) {
  const container = context.container as AGIContainer & any
  const args = container.argv._ as string[]

  await bootPokerContainer(container, { logBackend: false })

  const subcommand = args[1]

  if (!subcommand) {
    printUsage()
    return
  }

  if (subcommand === "analyze") {
    await runAnalyze(container, options, args.slice(2))
    return
  }

  if (subcommand === "sim") {
    await runSimulation(container, options)
    return
  }

  if (subcommand === "serve") {
    await runServe(container, options)
    return
  }

  if (subcommand === "seed") {
    await runSeed(container, options, args.slice(2))
    return
  }

  if (subcommand === "new-agent") {
    await runNewAgent(container, options, args.slice(2))
    return
  }

  if (subcommand === "register") {
    await runRegister(container, options, args.slice(2))
    return
  }

  if (subcommand === "join") {
    await runJoin(container, options, args.slice(2))
    return
  }

  if (subcommand === "watch") {
    await runWatch(container, options, args.slice(2))
    return
  }

  if (subcommand === "house") {
    await runHouse(container, options, args.slice(2))
    return
  }

  if (subcommand === "leaderboard") {
    await runLeaderboard(container, options, args.slice(2))
    return
  }

  printUsage()
}
