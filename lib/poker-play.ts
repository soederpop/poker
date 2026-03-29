import type { AGIContainer } from "@soederpop/luca/agi"

import PokerClient from "../clients/poker-client"
import type { PokerPosition } from "../features/strategy"

function parsePosition(value?: string): PokerPosition {
  const normalized = String(value || "").trim().toUpperCase()
  if (["UTG", "MP", "CO", "BTN", "SB", "BB"].includes(normalized)) {
    return normalized as PokerPosition
  }
  return "BTN"
}

async function registerParticipant(container: AGIContainer & any, serverBaseUrl: string, name: string) {
  const rest = container.client("rest", { baseURL: serverBaseUrl, json: true })
  const response = await rest.post("/api/v1/bots/register", {
    name,
    agentVersion: "luca-poker/play-mode",
  })

  if (!response || typeof response !== "object" || !("token" in response) || !("wsUrl" in response)) {
    throw new Error(`Registration failed against ${serverBaseUrl}`)
  }

  return response as Record<string, unknown>
}

type SeatSnapshot = {
  botId?: string
  name: string
  stack: number
  profile?: string
  isHouseBot?: boolean
  isHero?: boolean
}

type ActionPreset = {
  label: string
  amount: number
}

type PlayState = {
  tableId: string
  heroName: string
  heroCards: string[]
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
  handNumber: number
  villain: SeatSnapshot
  villainCards: string[]
  revealOpponentHolecards: boolean
  pendingAction: boolean
  selectedPreset: number
  status: string
  feed: string[]
  heroWins: number
  villainWins: number
  handsCompleted: number
  lastPot: number
}

function appendFeed(state: PlayState, line: string) {
  state.feed.unshift(line)
  if (state.feed.length > 24) state.feed.length = 24
}

function prettyCard(card: string): string {
  const suit = card.slice(-1)
  const rank = card.slice(0, -1)
  const symbol = suit === "h" ? "♥" : suit === "d" ? "♦" : suit === "c" ? "♣" : suit === "s" ? "♠" : suit
  return `${rank}${symbol}`
}

function prettyCards(cards: string[]): string {
  return cards.length ? cards.map(prettyCard).join(" ") : "—"
}

function streetLabel(stage: string): string {
  return String(stage || "waiting").toUpperCase()
}

function buildPresets(state: PlayState): ActionPreset[] {
  const pot = Math.max(1, state.pot)
  const stack = Math.max(1, state.stack)
  const toCall = Math.max(0, state.toCall)
  const minRaise = Math.max(toCall * 2, Math.round(Math.max(2, pot * 0.75)))
  return [
    { label: "1/3", amount: Math.min(stack, Math.max(1, Math.round(pot * 0.33))) },
    { label: "1/2", amount: Math.min(stack, Math.max(1, Math.round(pot * 0.5))) },
    { label: "2/3", amount: Math.min(stack, Math.max(1, Math.round(pot * 0.66))) },
    { label: "pot", amount: Math.min(stack, Math.max(1, Math.round(pot))) },
    { label: "raise", amount: Math.min(stack, minRaise) },
    { label: "jam", amount: stack },
  ]
}

function actionHint(state: PlayState): string {
  if (!state.pendingAction) return "Waiting for next decision..."
  const primary = state.toCall > 0 ? "x/c/enter=call" : "x/c/enter=check"
  return `${primary}  f=fold  b=bet  r=raise  a=all-in  [ ]=size  q=quit`
}

async function sendAction(client: PokerClient, state: PlayState, action: string, amount?: number) {
  if (!state.pendingAction) return
  try {
    await client.send("action", amount !== undefined ? { action, amount } : { action })
    state.pendingAction = false
    state.status = `Sent ${action}${amount !== undefined ? ` ${amount}` : ""}`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "unknown error")
    state.status = `Action failed: ${message}`
    appendFeed(state, `✗ ${state.status}`)
  }
}

function syncTablePlayers(state: PlayState, payload: any, heroBotId: string) {
  const players = Array.isArray(payload?.players) ? payload.players as Array<any> : []
  const villain = players.find((entry) => String(entry?.botId || "") !== heroBotId)
  if (!villain) return
  state.villain = {
    botId: String(villain.botId || state.villain.botId || "").trim() || undefined,
    name: String(villain.name || state.villain.name || "Opponent"),
    stack: Number(villain.stack || state.villain.stack || 0),
    profile: typeof villain.profile === "string" ? villain.profile : state.villain.profile,
    isHouseBot: Boolean(villain.isHouseBot),
  }
}

function extractVillainCards(payload: any, heroBotId: string, knownVillainBotId?: string): string[] {
  const showdown = Array.isArray(payload?.showdown) ? payload.showdown as Array<any> : []
  const revealed = showdown.find((entry) => {
    const playerId = String(entry?.playerId || "").trim()
    if (!playerId || playerId === heroBotId) return false
    if (knownVillainBotId) return playerId === knownVillainBotId
    return true
  })
  return Array.isArray(revealed?.cards) ? revealed.cards.map(String) : []
}

function playerLabel(playerId: string, heroBotId: string, state: PlayState): string {
  if (playerId === heroBotId) return state.heroName
  if (playerId && state.villain.botId && playerId === state.villain.botId) return state.villain.name
  return playerId ? `Player ${playerId.slice(0, 6)}` : "Unknown"
}

function normalizeDecision(available: string[], toCall: number, pot: number, candidate: { action?: string; amount?: number }) {
  let action = String(candidate.action || "").trim().toLowerCase()
  let amount = Number(candidate.amount)
  const can = (name: string) => available.includes(name)

  if (!can(action)) {
    action = toCall > 0 ? (can("call") ? "call" : "fold") : (can("check") ? "check" : "bet")
  }

  if ((action === "bet" || action === "raise") && !Number.isFinite(amount)) {
    amount = action === "raise"
      ? Math.max(toCall * 2, Math.round(Math.max(2, pot * 0.75)))
      : Math.max(1, Math.round(Math.max(1, pot * 0.5)))
  }

  return Number.isFinite(amount) ? { action, amount } : { action }
}

function createBotAutoplayer(
  container: AGIContainer & any,
  client: PokerClient,
  profileName: string,
  heroCardsFallback: [string, string] = ["Ah", "As"],
) {
  const strategyFeature = container.feature("strategy", { enable: true }) as any
  const live = {
    heroCards: heroCardsFallback,
    board: [] as string[],
    stage: "preflop",
    position: "BTN" as PokerPosition,
    stack: 0,
    pot: 0,
    toCall: 0,
    playersInHand: 2,
  }

  return client.onMessage((message) => {
    if (message.type === "deal") {
      const cards = Array.isArray(message.payload?.holeCards) && message.payload!.holeCards.length === 2
        ? [String(message.payload!.holeCards[0]), String(message.payload!.holeCards[1])] as [string, string]
        : heroCardsFallback
      live.heroCards = cards
      live.board = []
      live.stage = "preflop"
      live.position = parsePosition(String(message.payload?.position || live.position))
      return
    }

    if (message.type === "state") {
      live.board = Array.isArray(message.payload?.board) ? message.payload!.board.map(String) : live.board
      live.stage = String(message.payload?.stage || live.stage)
      live.position = parsePosition(String(message.payload?.position || live.position))
      live.stack = Number(message.payload?.stack || live.stack || 0)
      live.pot = Number(message.payload?.pot || live.pot || 0)
      live.toCall = Number(message.payload?.toCall || 0)
      live.playersInHand = Number(message.payload?.playersInHand || live.playersInHand || 2)
      return
    }

    if (message.type !== "action_on_you") return

    const available = Array.isArray(message.payload?.availableActions) ? message.payload!.availableActions.map(String) : []
    const toCall = Number(message.payload?.toCall ?? live.toCall ?? 0)
    const pot = Number(message.payload?.pot ?? live.pot ?? 0)
    const stack = Number(message.payload?.stack ?? live.stack ?? 0)
    const street = ["flop", "turn", "river"].includes(String(message.payload?.stage || live.stage))
      ? String(message.payload?.stage || live.stage)
      : "preflop"
    const position = parsePosition(String(message.payload?.position || live.position))
    const inPosition = ["BTN", "CO"].includes(position)

    void (async () => {
      try {
        const decision = await strategyFeature.decide(profileName, {
          heroCards: live.heroCards,
          board: live.board,
          street,
          position,
          inPosition,
          checkedTo: toCall <= 0,
          potSize: pot,
          toCall,
          effectiveStack: stack,
          playersInHand: Number(message.payload?.playersInHand || live.playersInHand || 2),
          playersLeftToAct: Math.max(0, Number(message.payload?.playersInHand || live.playersInHand || 2) - 1),
          facingBet: toCall > 0,
          facingRaise: toCall > 0,
          facingThreeBet: false,
        })
        const selected = normalizeDecision(available, toCall, pot, decision || {})
        await client.send("action", selected)
      } catch {
        const fallback = toCall > 0 ? (available.includes("call") ? { action: "call" } : { action: "fold" }) : { action: "check" }
        await client.send("action", fallback)
      }
    })()
  })
}

export async function runPlayMode(
  container: AGIContainer & any,
  options: { serverBaseUrl: string; opponent: string; name?: string; actionTimeout?: number; viewOpponentHolecards?: boolean },
) {
  const serverBaseUrl = String(options.serverBaseUrl).trim()
  const opponent = String(options.opponent || "balanced").trim() || "balanced"
  const heroName = String(options.name || "Human").trim() || "Human"

  const heroRegistration = await registerParticipant(container, serverBaseUrl, heroName)
  const heroWsUrl = String(heroRegistration.wsUrl || "").trim()
  const heroToken = String(heroRegistration.token || "").trim()
  const heroBotId = String(heroRegistration.botId || "").trim()
  if (!heroWsUrl || !heroToken || !heroBotId) {
    throw new Error("Hero registration did not return wsUrl/token/botId")
  }

  const villainRegistration = await registerParticipant(container, serverBaseUrl, `Bot ${opponent}`)
  const villainWsUrl = String(villainRegistration.wsUrl || "").trim()
  const villainToken = String(villainRegistration.token || "").trim()
  if (!villainWsUrl || !villainToken) {
    throw new Error("Villain registration did not return wsUrl/token")
  }

  const heroClient = new PokerClient(container, { wsUrl: heroWsUrl, reconnect: true })
  const villainClient = new PokerClient(container, { wsUrl: villainWsUrl, reconnect: true })

  await heroClient.connect()
  await heroClient.authenticate(heroToken)
  await villainClient.connect()
  await villainClient.authenticate(villainToken)

  await heroClient.send("create_table", {
    name: `Play vs ${opponent}`,
    blinds: [1, 2],
    startingStack: 120,
    maxPlayers: 2,
    actionTimeout: Math.max(8, Number(options.actionTimeout || 20)),
  })
  const created = await heroClient.waitFor("table_created", 10_000)
  const tableId = String(created.payload?.id || "")
  if (!tableId) throw new Error("Failed to create play table")

  await heroClient.joinTable(tableId)
  await villainClient.joinTable(tableId)
  const stopVillainAutoplay = createBotAutoplayer(container, villainClient, opponent)

  const ink = container.feature("ink", { enable: true, patchConsole: true })
  await ink.loadModules()
  const React = ink.React
  const h = React.createElement
  const { useEffect, useState } = React
  const { Box, Text } = ink.components
  const { useApp, useInput, useStdout } = ink.hooks

  const state: PlayState = {
    tableId,
    heroName,
    heroCards: [],
    board: [],
    stage: "waiting",
    position: "BTN",
    pot: 0,
    toCall: 0,
    stack: 0,
    playersInHand: 2,
    availableActions: [],
    timeRemaining: 0,
    timeBankRemaining: 0,
    handNumber: 0,
    villain: {
      name: `Bot ${opponent}`,
      stack: 0,
      profile: opponent,
      isHouseBot: false,
    },
    villainCards: [],
    revealOpponentHolecards: options.viewOpponentHolecards === true,
    pendingAction: false,
    selectedPreset: 1,
    status: `Table ${tableId} ready`,
    feed: [],
    heroWins: 0,
    villainWins: 0,
    handsCompleted: 0,
    lastPot: 0,
  }

  function cleanup() {
    stopVillainAutoplay()
    return Promise.allSettled([
      heroClient.disconnect(),
      villainClient.disconnect(),
    ])
  }

  function App() {
    const { exit } = useApp()
    const { stdout } = useStdout()
    const [tick, setTick] = useState(0)

    useEffect(() => {
      const unsubscribe = heroClient.onMessage((message) => {
        if (message.type === "deal") {
          const cards = Array.isArray(message.payload?.holeCards) ? message.payload!.holeCards.map(String) : []
          state.heroCards = cards
          state.board = []
          state.stage = "preflop"
          state.toCall = 0
          state.timeRemaining = 0
          state.villainCards = []
          state.pendingAction = false
          state.availableActions = []
          state.position = parsePosition(String(message.payload?.position || state.position))
          state.handNumber += 1
          state.status = `Hand #${state.handNumber}`
          appendFeed(state, `♠ Hand ${state.handNumber} dealt: ${prettyCards(cards)}`)
        }

        if (message.type === "table_joined") {
          syncTablePlayers(state, message.payload, heroBotId)
          appendFeed(state, `Joined table ${String(message.payload?.tableId || state.tableId)}`)
        }

        if (message.type === "state") {
          state.stage = String(message.payload?.stage || state.stage)
          state.board = Array.isArray(message.payload?.board) ? message.payload!.board.map(String) : state.board
          state.pot = Number(message.payload?.pot || state.pot || 0)
          state.toCall = Number(message.payload?.toCall || 0)
          state.stack = Number(message.payload?.stack || state.stack || 0)
          state.playersInHand = Number(message.payload?.playersInHand || state.playersInHand || 2)
          state.availableActions = Array.isArray(message.payload?.availableActions) ? message.payload!.availableActions.map(String) : state.availableActions
          state.position = parsePosition(String(message.payload?.position || state.position))
          syncTablePlayers(state, message.payload, heroBotId)
        }

        if (message.type === "action_taken") {
          const actor = String(message.payload?.playerName || "player")
          const action = String(message.payload?.action || "")
          const amount = message.payload?.amount !== undefined ? ` ${String(message.payload.amount)}` : ""
          appendFeed(state, `♦ ${actor}: ${action}${amount}`)
        }

        if (message.type === "timebank_state") {
          state.timeBankRemaining = Number(message.payload?.timeBankRemaining || state.timeBankRemaining || 0)
        }

        if (message.type === "action_on_you") {
          state.pendingAction = true
          state.availableActions = Array.isArray(message.payload?.availableActions) ? message.payload!.availableActions.map(String) : state.availableActions
          state.toCall = Number(message.payload?.toCall ?? state.toCall ?? 0)
          state.pot = Number(message.payload?.pot ?? state.pot ?? 0)
          state.stack = Number(message.payload?.stack ?? state.stack ?? 0)
          state.timeRemaining = Number(message.payload?.timeRemaining ?? state.timeRemaining ?? 0)
          state.timeBankRemaining = Number(message.payload?.timeBankRemaining ?? state.timeBankRemaining ?? 0)
          state.status = "Your action"
          appendFeed(state, `♥ Decision on you: ${state.availableActions.join(", ")}`)
        }

        if (message.type === "hand_result") {
          state.pendingAction = false
          state.availableActions = []
          state.handsCompleted += 1
          state.lastPot = Number(message.payload?.pot || 0)
          state.board = Array.isArray(message.payload?.board) ? message.payload!.board.map(String) : state.board
          const stacks = Array.isArray(message.payload?.stacks) ? message.payload!.stacks as Array<any> : []
          const heroStack = stacks.find((entry) => String(entry?.playerId || "") === heroBotId)
          const villainStack = stacks.find((entry) => String(entry?.playerId || "") !== heroBotId)
          if (heroStack) state.stack = Number(heroStack.stack || state.stack || 0)
          if (villainStack) state.villain.stack = Number(villainStack.stack || state.villain.stack || 0)
          const revealedVillainCards = extractVillainCards(message.payload, heroBotId, state.villain.botId)
          if (revealedVillainCards.length > 0) {
            state.villainCards = revealedVillainCards
          }
          const winners = Array.isArray(message.payload?.winners) ? message.payload!.winners as Array<any> : []
          const heroWon = winners.some((entry) => String(entry?.playerId || "") === heroBotId)
          if (heroWon) state.heroWins += 1
          else state.villainWins += 1
          const winnerNames = winners
            .map((entry) => playerLabel(String(entry?.playerId || ""), heroBotId, state))
            .filter(Boolean)
          const showdownNote = state.villainCards.length > 0 ? ` | ${state.villain.name} showed ${prettyCards(state.villainCards)}` : ""
          state.status = heroWon ? "You won the hand" : "Opponent won the hand"
          appendFeed(state, `${heroWon ? "🏆" : "☠"} Pot ${state.lastPot}${winnerNames.length ? ` | Winner ${winnerNames.join(", ")}` : ""}${showdownNote}`)
        }

        if (message.type === "error") {
          state.status = String(message.payload?.message || "error")
          appendFeed(state, `✗ ${state.status}`)
        }

        setTick((value) => value + 1)
      })

      return () => unsubscribe()
    }, [])

    useInput((input: string, key: any) => {
      const presets = buildPresets(state)
      const currentPreset = presets[state.selectedPreset] || presets[1] || presets[0]
      const can = (action: string) => state.availableActions.includes(action)

      if (input === "q" || (key.ctrl && input === "c")) {
        void cleanup().finally(() => exit())
        return
      }

      if (key.leftArrow || input === "[") {
        state.selectedPreset = Math.max(0, state.selectedPreset - 1)
        setTick((value) => value + 1)
        return
      }
      if (key.rightArrow || input === "]") {
        state.selectedPreset = Math.min(presets.length - 1, state.selectedPreset + 1)
        setTick((value) => value + 1)
        return
      }

      if (!state.pendingAction) return

      if ((input === "x" || input === "c" || key.return) && can(state.toCall > 0 ? "call" : "check")) {
        void sendAction(heroClient, state, state.toCall > 0 ? "call" : "check")
        setTick((value) => value + 1)
        return
      }
      if (input === "f" && can("fold")) {
        void sendAction(heroClient, state, "fold")
        setTick((value) => value + 1)
        return
      }
      if (input === "b" && can("bet")) {
        void sendAction(heroClient, state, "bet", currentPreset.amount)
        setTick((value) => value + 1)
        return
      }
      if (input === "r" && can("raise")) {
        void sendAction(heroClient, state, "raise", currentPreset.amount)
        setTick((value) => value + 1)
        return
      }
      if (input === "a" && can("all-in")) {
        void sendAction(heroClient, state, "all-in")
        setTick((value) => value + 1)
      }
    })

    const cols = stdout.columns || 110
    const leftWidth = Math.max(42, Math.floor(cols * 0.46))
    const rightWidth = Math.max(46, cols - leftWidth - 3)
    const presets = buildPresets(state)
    const preset = presets[state.selectedPreset] || presets[1] || presets[0]
    const actionBar = presets.map((entry, index) => index === state.selectedPreset ? `[${entry.label}:${entry.amount}]` : `${entry.label}:${entry.amount}`).join("  ")
    const opponentCardsText = state.villainCards.length > 0 ? prettyCards(state.villainCards) : "hidden"
    const feedLines = state.feed.length ? state.feed : ["Waiting for game events..."]

    return h(
      Box,
      { flexDirection: "column", width: cols, paddingX: 1 },
      h(
        Box,
        { justifyContent: "space-between", marginBottom: 1 },
        h(Text, { bold: true, color: "cyan" }, `POKURR PLAY  ${state.heroName} vs ${state.villain.name}`),
        h(Text, { color: state.pendingAction ? "magenta" : "green" }, state.status),
      ),
      h(
        Box,
        { flexDirection: "row" },
        h(
          Box,
          { width: leftWidth, flexDirection: "column", borderStyle: "round", borderColor: "cyan", paddingX: 1 },
          h(Text, { bold: true }, `Table ${state.tableId}`),
          h(Text, null, `Street ${streetLabel(state.stage)}   Hand ${state.handNumber}   Position ${state.position}`),
          h(Text, null, `Pot ${state.pot}   To call ${state.toCall}   Stack ${state.stack}`),
          h(Text, null, `Clock ${state.timeRemaining}s   Time bank ${state.timeBankRemaining}s   Players ${state.playersInHand}`),
          h(Text, null, ""),
          h(Text, { color: "green", bold: true }, `You: ${prettyCards(state.heroCards)}`),
          h(Text, { color: "yellow", bold: true }, `Board: ${prettyCards(state.board)}`),
          h(Text, null, ""),
          h(Text, { color: "magenta" }, `Opponent: ${state.villain.name}${state.villain.profile ? ` (${state.villain.profile})` : ""}`),
          h(Text, null, `Opponent stack: ${state.villain.stack}`),
          h(Text, null, `Opponent cards: ${opponentCardsText}`),
          h(Text, null, ""),
          h(Text, { color: state.pendingAction ? "magenta" : "gray" }, `Legal: ${state.availableActions.join(", ") || "waiting"}`),
          h(Text, { color: "green" }, `Sizing: ${actionBar}`),
          h(Text, { dimColor: true }, actionHint(state)),
          h(Text, null, ""),
          h(Text, { bold: true }, `Score  You ${state.heroWins}  Opponent ${state.villainWins}  Completed ${state.handsCompleted}`),
          h(Text, { dimColor: true }, `Last pot: ${state.lastPot}`),
        ),
        h(Box, { width: 1 }, h(Text, null, " ")),
        h(
          Box,
          { width: rightWidth, flexDirection: "column", borderStyle: "round", borderColor: "magenta", paddingX: 1 },
          h(Text, { bold: true }, "Hand feed"),
          ...feedLines.map((line, index) => h(Text, { key: `${tick}-${index}`, wrap: "truncate-end" }, line)),
          h(Text, null, ""),
          h(Text, { color: "green" }, `Selected size: ${preset.label} = ${preset.amount}`),
        ),
      ),
    )
  }

  await ink.render(h(App))
  await ink.waitUntilExit()
  await cleanup()
}
