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

type FeedEntry = {
  text: string
  color?: string
  bold?: boolean
  dim?: boolean
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
  feed: FeedEntry[]
  heroWins: number
  villainWins: number
  handsCompleted: number
  lastPot: number
  dealerIsHero: boolean
  betInputMode: boolean
  customBetInput: string
  lastLoggedStage: string
}

function appendFeed(state: PlayState, entry: FeedEntry) {
  state.feed.unshift(entry)
  if (state.feed.length > 40) state.feed.length = 40
}

function suitColor(suit: string): string {
  if (suit === "h" || suit === "d") return "red"
  if (suit === "s") return "white"
  return "green"
}

function suitSymbol(suit: string): string {
  return suit === "h" ? "♥" : suit === "d" ? "♦" : suit === "c" ? "♣" : suit === "s" ? "♠" : suit
}

function prettyCard(card: string): string {
  const suit = card.slice(-1)
  const rank = card.slice(0, -1)
  return `${rank}${suitSymbol(suit)}`
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

  const heroClient = new PokerClient(container, { wsUrl: heroWsUrl, reconnect: true })

  await heroClient.connect()
  await heroClient.authenticate(heroToken)

  await heroClient.send("create_table", {
    name: `Play vs ${opponent}`,
    blinds: [1, 2],
    startingStack: 120,
    maxPlayers: 2,
    actionTimeout: Math.max(8, Number(options.actionTimeout || 20)),
    preferredHouseActor: opponent,
  })
  const created = await heroClient.waitFor("table_created", 10_000)
  const tableId = String(created.payload?.id || "")
  if (!tableId) throw new Error("Failed to create play table")

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
    dealerIsHero: true,
    betInputMode: false,
    customBetInput: "",
    lastLoggedStage: "",
  }

  // Rerender function — gets wired once Ink instance is created
  let rerender: (() => void) | null = null
  let renderTick = 0

  function handleMessage(message: { type: string; payload?: Record<string, unknown> }) {
    renderTick += 1

    if (message.type === "deal") {
      const cards = Array.isArray(message.payload?.holeCards) ? message.payload!.holeCards.map(String) : []
      state.heroCards = cards
      state.board = []
      state.stage = "preflop"
      state.lastLoggedStage = "preflop"
      state.toCall = 0
      state.timeRemaining = 0
      state.villainCards = []
      state.pendingAction = false
      state.availableActions = []
      state.position = parsePosition(String(message.payload?.position || state.position))
      state.dealerIsHero = state.position === "BTN" || state.position === "SB"
      state.handNumber += 1
      state.status = `Hand #${state.handNumber}`
      appendFeed(state, { text: `── Hand #${state.handNumber} ─────────────────`, color: "gray", dim: true })
      appendFeed(state, { text: `PREFLOP  You: ${prettyCards(cards)}`, color: "white", bold: true })
    }

    if (message.type === "table_joined") {
      syncTablePlayers(state, message.payload, heroBotId)
    }

    if (message.type === "state") {
      const newStage = String(message.payload?.stage || state.stage)
      state.board = Array.isArray(message.payload?.board) ? message.payload!.board.map(String) : state.board
      state.pot = Number(message.payload?.pot || state.pot || 0)
      state.toCall = Number(message.payload?.toCall || 0)
      state.stack = Number(message.payload?.stack || state.stack || 0)
      state.playersInHand = Number(message.payload?.playersInHand || state.playersInHand || 2)
      state.availableActions = Array.isArray(message.payload?.availableActions) ? message.payload!.availableActions.map(String) : state.availableActions
      state.position = parsePosition(String(message.payload?.position || state.position))
      state.dealerIsHero = state.position === "BTN" || state.position === "SB"
      syncTablePlayers(state, message.payload, heroBotId)

      // Log street transitions
      if (newStage !== state.lastLoggedStage && ["flop", "turn", "river"].includes(newStage)) {
        state.lastLoggedStage = newStage
        const boardStr = state.board.length > 0 ? `  ${prettyCards(state.board)}` : ""
        appendFeed(state, { text: `${newStage.toUpperCase()}${boardStr}`, color: "green", bold: true })
      }
      state.stage = newStage
    }

    if (message.type === "action_taken") {
      const playerName = String(message.payload?.playerName || message.payload?.playerId || "")
      const action = String(message.payload?.action || "")
      const rawAmount = message.payload?.amount
      const amountStr = rawAmount !== undefined && Number(rawAmount) > 0 ? ` $${rawAmount}` : ""
      const isHero = playerName === state.heroName || String(message.payload?.playerId || "") === heroBotId
      const label = isHero ? "You" : (playerName || state.villain.name)
      appendFeed(state, {
        text: `${label}: ${action}${amountStr}`,
        color: isHero ? "cyan" : "white",
      })
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
      // Not logged to feed — already shown in status bar
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
      state.status = heroWon ? "You won the hand" : "Opponent won the hand"
      if (state.villainCards.length > 0) {
        appendFeed(state, { text: `${state.villain.name} showed ${prettyCards(state.villainCards)}`, color: "gray" })
      }
      appendFeed(state, {
        text: heroWon ? `WIN  +$${state.lastPot}` : `LOSE  $${state.lastPot} to ${state.villain.name}`,
        color: heroWon ? "green" : "red",
        bold: true,
      })
    }

    if (message.type === "error") {
      state.status = String(message.payload?.message || "error")
      appendFeed(state, { text: `! ${state.status}`, color: "red" })
    }

    if (rerender) rerender()
  }

  // Register listener BEFORE joining so we catch the deal event
  const stopListening = heroClient.onMessage(handleMessage)
  await heroClient.joinTable(tableId)

  const ink = container.feature("ink", { enable: true, patchConsole: true })
  await ink.loadModules()
  const React = ink.React
  const h = React.createElement
  const { Box, Text } = ink.components
  const { useApp, useInput, useStdout } = ink.hooks

  function cleanup() {
    stopListening()
    return heroClient.disconnect()
  }

  function App() {
    const { exit } = useApp()
    const { stdout } = useStdout()
    const tick = renderTick

    useInput((input: string, key: any) => {
      const presets = buildPresets(state)
      const currentPreset = presets[state.selectedPreset] || presets[1] || presets[0]
      const can = (action: string) => state.availableActions.includes(action)

      if (input === "q" || (key.ctrl && input === "c")) {
        void cleanup().finally(() => exit())
        return
      }

      // Custom bet input mode: digits build amount, backspace removes, enter submits, escape cancels
      if (state.betInputMode) {
        if (key.escape) {
          state.betInputMode = false
          state.customBetInput = ""
          if (rerender) rerender()
          return
        }
        if (key.backspace || key.delete) {
          state.customBetInput = state.customBetInput.slice(0, -1)
          if (state.customBetInput === "") state.betInputMode = false
          if (rerender) rerender()
          return
        }
        if (/^\d$/.test(input)) {
          state.customBetInput += input
          if (rerender) rerender()
          return
        }
        if (key.return && state.pendingAction) {
          const amount = parseInt(state.customBetInput, 10)
          if (!isNaN(amount) && amount > 0) {
            if (can("bet")) void sendAction(heroClient, state, "bet", amount)
            else if (can("raise")) void sendAction(heroClient, state, "raise", amount)
          }
          state.betInputMode = false
          state.customBetInput = ""
          if (rerender) rerender()
          return
        }
        return
      }

      // Digit key starts custom bet input mode (when action is pending)
      if (state.pendingAction && /^\d$/.test(input) && (can("bet") || can("raise"))) {
        state.betInputMode = true
        state.customBetInput = input
        if (rerender) rerender()
        return
      }

      if (key.leftArrow || input === "[") {
        state.selectedPreset = Math.max(0, state.selectedPreset - 1)
        state.betInputMode = false
        state.customBetInput = ""
        if (rerender) rerender()
        return
      }
      if (key.rightArrow || input === "]") {
        state.selectedPreset = Math.min(presets.length - 1, state.selectedPreset + 1)
        state.betInputMode = false
        state.customBetInput = ""
        if (rerender) rerender()
        return
      }

      if (!state.pendingAction) return

      if ((input === "x" || input === "c" || key.return) && can(state.toCall > 0 ? "call" : "check")) {
        void sendAction(heroClient, state, state.toCall > 0 ? "call" : "check")
        if (rerender) rerender()
        return
      }
      if (input === "f" && can("fold")) {
        void sendAction(heroClient, state, "fold")
        if (rerender) rerender()
        return
      }
      if (input === "b" && can("bet")) {
        const amount = state.customBetInput ? parseInt(state.customBetInput, 10) : currentPreset.amount
        void sendAction(heroClient, state, "bet", amount)
        state.betInputMode = false
        state.customBetInput = ""
        if (rerender) rerender()
        return
      }
      if (input === "r" && can("raise")) {
        const amount = state.customBetInput ? parseInt(state.customBetInput, 10) : currentPreset.amount
        void sendAction(heroClient, state, "raise", amount)
        state.betInputMode = false
        state.customBetInput = ""
        if (rerender) rerender()
        return
      }
      if (input === "a" && can("all-in")) {
        void sendAction(heroClient, state, "all-in")
        if (rerender) rerender()
      }
    })

    const cols = stdout.columns || 120
    const rows = stdout.rows || 40
    const LOG_WIDTH = 34
    const mainWidth = cols - LOG_WIDTH - 1

    const presets = buildPresets(state)
    const can = (a: string) => state.availableActions.includes(a)

    // -- Dealer button chip --
    function DealerBtn() {
      return h(Box, { borderStyle: "round", borderColor: "white", paddingX: 1, marginLeft: 1 },
        h(Text, { color: "white", bold: true }, "D"))
    }

    // -- helper: render a single card as a mini box --
    function Card(props: { card: string; faceDown?: boolean }) {
      if (props.faceDown) {
        return h(Box, { borderStyle: "round", borderColor: "gray", paddingX: 1 },
          h(Text, { color: "gray" }, "??"))
      }
      const suit = props.card.slice(-1)
      const rank = props.card.slice(0, -1)
      const color = suitColor(suit)
      return h(Box, { borderStyle: "round", borderColor: color, paddingX: 1 },
        h(Text, { color, bold: true }, `${rank}${suitSymbol(suit)}`))
    }

    // -- helper: action button --
    function Btn(props: { label: string; hotkey: string; active: boolean; selected?: boolean; color?: string }) {
      const borderColor = props.selected ? "yellow" : props.active ? (props.color || "green") : "gray"
      const textColor = props.selected ? "yellow" : props.active ? "white" : "gray"
      return h(Box, { borderStyle: "round", borderColor, paddingX: 1, marginRight: 1 },
        h(Text, { color: textColor, bold: props.active }, `${props.hotkey.toUpperCase()}) ${props.label}`))
    }

    // -- helper: sizing chip --
    function Chip(props: { label: string; amount: number; selected: boolean }) {
      return h(Box, {
        borderStyle: props.selected ? "bold" : "round",
        borderColor: props.selected ? "yellow" : "gray",
        paddingX: 1,
        marginRight: 1,
      },
        h(Text, { color: props.selected ? "yellow" : "gray", bold: props.selected }, `${props.label} ${props.amount}`))
    }

    // -- opponent cards --
    const villainCardEls = state.villainCards.length > 0
      ? state.villainCards.map((c, i) => h(Card, { key: `vc${i}`, card: c }))
      : [h(Card, { key: "vc0", faceDown: true }), h(Card, { key: "vc1", faceDown: true })]

    // -- hero cards --
    const heroCardEls = state.heroCards.length > 0
      ? state.heroCards.map((c, i) => h(Card, { key: `hc${i}`, card: c }))
      : [h(Card, { key: "hc0", faceDown: true }), h(Card, { key: "hc1", faceDown: true })]

    // -- board cards --
    const boardCardEls = state.board.length > 0
      ? state.board.map((c, i) => h(Card, { key: `bc${i}`, card: c }))
      : []

    // -- derive bet amount label --
    const betAmountLabel = state.betInputMode
      ? `$${state.customBetInput}_`
      : `$${presets[state.selectedPreset]?.amount || 0}`

    return h(Box, { flexDirection: "row", width: cols },

      // ── LEFT: main play area ──
      h(Box, { flexDirection: "column", width: mainWidth, paddingX: 1 },

        // title bar
        h(Box, { justifyContent: "space-between", marginBottom: 0 },
          h(Text, { bold: true, color: "green" }, `POKURR`),
          h(Text, { dimColor: true }, `Hand #${state.handNumber}  ${streetLabel(state.stage)}`),
          h(Text, { color: state.pendingAction ? "yellow" : "green", bold: true }, state.status),
        ),

        // ── villain seat (OUTSIDE the felt) ──
        h(Box, { flexDirection: "row", justifyContent: "center", alignItems: "center", marginY: 1 },
          h(Box, { flexDirection: "row", alignItems: "center" },
            h(Box, { flexDirection: "column", alignItems: "center" },
              h(Box, { flexDirection: "row", gap: 1, alignItems: "center" },
                h(Text, { color: "red", bold: true }, state.villain.name),
                h(Text, { dimColor: true }, state.villain.profile ? `(${state.villain.profile})` : ""),
                h(Text, { color: "white" }, `$${state.villain.stack}`),
                !state.dealerIsHero ? h(DealerBtn, {}) : null,
              ),
              h(Box, { flexDirection: "row", marginTop: 0 }, ...villainCardEls),
            ),
          ),
        ),

        // ── green table felt (board + pot only) ──
        h(Box, {
          flexDirection: "column",
          borderStyle: "round",
          borderColor: "green",
          paddingX: 4,
          paddingY: 1,
          alignItems: "center",
          marginX: 4,
        },
          h(Box, { flexDirection: "row", gap: 1 }, ...boardCardEls),
          boardCardEls.length === 0
            ? h(Text, { dimColor: true }, "— waiting for cards —")
            : null,
          h(Box, { marginTop: 1, flexDirection: "row", gap: 2 },
            h(Text, { color: "yellow", bold: true }, `POT $${state.pot}`),
            state.toCall > 0
              ? h(Text, { color: "red" }, `to call: $${state.toCall}`)
              : null,
          ),
        ),

        // ── hero seat (OUTSIDE the felt) ──
        h(Box, { flexDirection: "row", justifyContent: "center", alignItems: "center", marginY: 1 },
          h(Box, { flexDirection: "column", alignItems: "center" },
            h(Box, { flexDirection: "row", marginBottom: 0 }, ...heroCardEls),
            h(Box, { flexDirection: "row", gap: 1, marginTop: 0, alignItems: "center" },
              h(Text, { color: "cyan", bold: true }, state.heroName),
              h(Text, { color: "white" }, `$${state.stack}`),
              h(Text, { dimColor: true }, `(${state.position})`),
              state.dealerIsHero ? h(DealerBtn, {}) : null,
            ),
          ),
        ),

        // ── action area ──
        state.pendingAction
          ? h(Box, { flexDirection: "column", marginTop: 0, alignItems: "center" },
              // main action buttons
              h(Box, { flexDirection: "row", justifyContent: "center" },
                state.toCall > 0
                  ? h(Btn, { label: "FOLD", hotkey: "f", active: can("fold"), color: "red" })
                  : null,
                state.toCall > 0
                  ? h(Btn, { label: `CALL $${state.toCall}`, hotkey: "c", active: can("call") })
                  : h(Btn, { label: "CHECK", hotkey: "c", active: can("check") }),
                can("bet")
                  ? h(Btn, { label: `BET ${betAmountLabel}`, hotkey: "b", active: true, color: state.betInputMode ? "yellow" : "cyan" })
                  : null,
                can("raise")
                  ? h(Btn, { label: `RAISE ${betAmountLabel}`, hotkey: "r", active: true, color: state.betInputMode ? "yellow" : "cyan" })
                  : null,
                h(Btn, { label: "ALL-IN", hotkey: "a", active: can("all-in"), color: "magenta" }),
              ),
              // sizing chips
              (can("bet") || can("raise"))
                ? h(Box, { flexDirection: "column", alignItems: "center", marginTop: 0 },
                    h(Box, { flexDirection: "row", justifyContent: "center" },
                      ...presets.map((p, i) => h(Chip, { key: `p${i}`, label: p.label, amount: p.amount, selected: !state.betInputMode && i === state.selectedPreset })),
                    ),
                    state.betInputMode
                      ? h(Box, { flexDirection: "row", marginTop: 0, gap: 1 },
                          h(Text, { color: "yellow" }, "Custom: "),
                          h(Box, { borderStyle: "round", borderColor: "yellow", paddingX: 1 },
                            h(Text, { color: "yellow", bold: true }, `$${state.customBetInput}_`)),
                          h(Text, { dimColor: true }, "ENTER=confirm  ESC=cancel"),
                        )
                      : h(Text, { dimColor: true }, "type digits for custom amount  [ ] to cycle presets"),
                  )
                : null,
              h(Text, { dimColor: true }, "ENTER=call/check  f c b r a  q=quit"),
            )
          : h(Box, { marginTop: 1, justifyContent: "center" },
              h(Box, { flexDirection: "row", gap: 2 },
                h(Text, { color: "green", bold: true }, `W ${state.heroWins}`),
                h(Text, { color: "red", bold: true }, `L ${state.villainWins}`),
                h(Text, { dimColor: true }, `${state.handsCompleted} hands`),
                h(Text, { dimColor: true }, "Waiting for your turn...  q=quit"),
              ),
            ),
      ),

      // ── RIGHT: activity log drawer ──
      h(Box, {
        flexDirection: "column",
        width: LOG_WIDTH,
        borderStyle: "single",
        borderColor: "gray",
        paddingX: 1,
      },
        h(Box, { marginBottom: 1, justifyContent: "space-between" },
          h(Text, { bold: true, color: "white" }, "ACTIVITY"),
          h(Box, { flexDirection: "row", gap: 2 },
            h(Text, { color: "green", bold: true }, `W${state.heroWins}`),
            h(Text, { color: "red", bold: true }, `L${state.villainWins}`),
          ),
        ),
        ...state.feed.map((entry, index) =>
          h(Text, {
            key: `f${tick}-${index}`,
            wrap: "wrap",
            color: entry.color,
            bold: entry.bold,
            dimColor: entry.dim || (!entry.color && !entry.bold && index > 0),
          }, entry.text)),
      ),
    )
  }

  // Clear the terminal before rendering
  process.stdout.write('\x1B[2J\x1B[H')

  await ink.render(h(App))
  rerender = () => ink.rerender(h(App))
  // Catch any messages received before rerender was wired
  if (renderTick > 0) rerender()
  await ink.waitUntilExit()
  await cleanup()
}
