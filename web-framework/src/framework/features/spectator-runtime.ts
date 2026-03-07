import { Feature, features } from "@soederpop/luca/feature"

import type {
  ActionTakenPayload,
  FeedItem,
  HandResultPayload,
  SocketErrorPayload,
  SpectatorChatPayload,
  SpectatorSnapshot,
  TablesResponse,
  LiveTournamentsResponse,
  ApiHealthResponse,
} from "../../types"

function nowLabel() {
  return new Date().toLocaleTimeString()
}

function nextFeedId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

type SpectatorStatus = "idle" | "connecting" | "connected" | "disconnected" | "error"

type SpectatorEnvelope = {
  type: string
  seq?: number
  payload?: Record<string, unknown>
}

export type SpectatorRuntimeState = {
  status: SpectatorStatus
  meta: string
  tableId: string
  wsUrl: string
  snapshot: SpectatorSnapshot | null
  showdownHandNumber: number | null
  showdownCardsByPlayer: Record<string, string[]>
  feedItems: FeedItem[]
}

export type SpectatorRuntimeOptions = {
  feedLimit?: number
}

declare module "@soederpop/luca/feature" {
  interface AvailableFeatures {
    spectatorRuntime: typeof SpectatorRuntime
  }
}

export class SpectatorRuntime extends Feature<SpectatorRuntimeState, SpectatorRuntimeOptions> {
  static override shortcut = "features.spectatorRuntime" as const
  static override description = "Live spectator state manager powered by Luca clients."

  private runToken = 0
  private socket: any = null
  private socketListeners: Array<{ event: string; listener: (...args: any[]) => void }> = []

  override get initialState(): SpectatorRuntimeState {
    return {
      status: "idle",
      meta: "Connecting to spectator stream...",
      tableId: "",
      wsUrl: "",
      snapshot: null,
      showdownHandNumber: null,
      showdownCardsByPlayer: {},
      feedItems: [],
    }
  }

  get feedLimit() {
    return Math.max(10, Number(this.options.feedLimit || 100))
  }

  appendFeed(text: string, tone: "default" | "error" = "default") {
    const next: FeedItem = {
      id: nextFeedId(),
      timeLabel: nowLabel(),
      text,
      tone,
    }

    const items = this.state.get("feedItems") || []
    this.state.set("feedItems", [next, ...items].slice(0, this.feedLimit))
    return this
  }

  async start(input: { wsUrl?: string | null; tableId?: string | null }) {
    const token = ++this.runToken
    await this.stop({ bumpToken: false })

    this.state.setState({
      status: "connecting",
      meta: "Resolving spectator endpoint...",
      snapshot: null,
      tableId: "",
      wsUrl: "",
      showdownHandNumber: null,
      showdownCardsByPlayer: {},
      feedItems: [],
    })

    try {
      const target = await this.resolveSpectatorTarget(input)
      if (token !== this.runToken) {
        return this
      }

      this.state.setState({
        status: "connecting",
        tableId: target.tableId,
        wsUrl: target.wsUrl,
        meta: `Connecting ${target.wsUrl} | table ${target.tableId}`,
      })

      const socket = this.container.client("pokerSpectatorWs" as any, {
        baseURL: target.wsUrl,
        reconnect: true,
        reconnectInterval: 1200,
        maxReconnectAttempts: 250,
        _cacheKey: `spectator-${target.wsUrl}-${Date.now()}-${Math.random()}`,
      }) as any

      this.socket = socket
      this.attachSocketListeners(socket, target.tableId, token)
      await socket.connect()
    } catch (error: unknown) {
      if (token !== this.runToken) {
        return this
      }

      const message = error instanceof Error ? error.message : String(error)
      this.state.set("status", "error")
      this.state.set("meta", `Failed to start spectator: ${message}`)
      this.appendFeed(`Failed to start spectator: ${message}`, "error")
    }

    return this
  }

  async stop(options: { bumpToken?: boolean } = {}) {
    if (options.bumpToken !== false) {
      this.runToken += 1
    }

    if (this.socket) {
      for (const row of this.socketListeners) {
        this.socket.off(row.event as any, row.listener as any)
      }
      this.socketListeners = []

      try {
        await this.socket.disconnect()
      } catch {
        // Ignore disconnect errors.
      }

      this.socket = null
    }

    return this
  }

  private attachSocketListeners(socket: any, tableId: string, token: number) {
    const onOpen = () => {
      if (token !== this.runToken) {
        return
      }

      this.state.set("status", "connected")
      this.state.set("meta", `Connected ${this.state.get("wsUrl")} | table ${tableId}`)
      this.appendFeed("Connected to spectator websocket")
      void socket.send({ type: "spectate", payload: { tableId } })
    }

    const onReconnect = () => {
      if (token !== this.runToken) {
        return
      }
      this.state.set("status", "connecting")
      this.state.set("meta", "Reconnecting spectator websocket...")
    }

    const onClose = () => {
      if (token !== this.runToken) {
        return
      }

      this.state.set("status", "disconnected")
      this.state.set("meta", "Disconnected")
      this.appendFeed("Spectator websocket closed", "error")
    }

    const onError = () => {
      if (token !== this.runToken) {
        return
      }
      this.state.set("status", "error")
      this.appendFeed("Spectator websocket error", "error")
    }

    const onMessage = (raw: unknown) => {
      if (token !== this.runToken) {
        return
      }

      const message = this.normalizeMessage(raw)
      if (!message) {
        return
      }

      this.handleMessage(message)
    }

    this.socketListeners = [
      { event: "open", listener: onOpen },
      { event: "reconnecting", listener: onReconnect },
      { event: "close", listener: onClose },
      { event: "error", listener: onError },
      { event: "message", listener: onMessage },
    ]

    for (const row of this.socketListeners) {
      socket.on(row.event as any, row.listener as any)
    }
  }

  private normalizeMessage(raw: unknown): SpectatorEnvelope | null {
    if (!raw) {
      return null
    }

    const objectCandidate = (raw && typeof raw === "object")
      ? raw as Record<string, unknown>
      : null

    const nested = objectCandidate?.data && typeof objectCandidate.data === "object"
      ? objectCandidate.data as Record<string, unknown>
      : null
    const row = nested || objectCandidate
    if (!row) {
      return null
    }

    const type = String(row.type || "").trim()
    if (!type) {
      return null
    }

    return {
      type,
      seq: Number(row.seq || 0),
      payload: row.payload && typeof row.payload === "object"
        ? row.payload as Record<string, unknown>
        : {},
    }
  }

  private handleMessage(message: SpectatorEnvelope) {
    const payload = message.payload || {}

    if (message.type === "spectator_state") {
      const statePayload = payload as unknown as SpectatorSnapshot
      const nextHand = Number(statePayload.handNumber || 0)
      const previous = this.state.get("showdownHandNumber")

      if (previous !== null && previous !== nextHand) {
        this.state.set("showdownCardsByPlayer", {})
        this.state.set("showdownHandNumber", null)
      }

      this.state.set("snapshot", statePayload)
      return
    }

    if (message.type === "action_taken") {
      const actionPayload = payload as unknown as ActionTakenPayload
      const playerName = actionPayload.playerName || `Seat ${actionPayload.seat || "?"}`
      this.appendFeed(`${playerName} ${actionPayload.action}${actionPayload.amount ? ` ${actionPayload.amount}` : ""}`)
      return
    }

    if (message.type === "hand_result") {
      const result = payload as unknown as HandResultPayload
      const winners = Array.isArray(result.winners)
        ? result.winners.map((winner) => `${winner.playerId} +${winner.amount}`).join(", ")
        : "none"
      this.appendFeed(`Hand ${result.handNumber || "?"} complete | Winners: ${winners}`)

      const showdownCardsByPlayer: Record<string, string[]> = {}
      if (Array.isArray(result.showdown)) {
        for (const row of result.showdown) {
          const player = String(row.playerId || "")
          const cards = Array.isArray(row.cards)
            ? row.cards.map((card) => String(card).toLowerCase())
            : []
          if (player && cards.length === 2) {
            showdownCardsByPlayer[player] = cards
          }
        }
      }

      this.state.set("showdownCardsByPlayer", showdownCardsByPlayer)
      this.state.set("showdownHandNumber", Number(result.handNumber || 0))
      return
    }

    if (message.type === "chat") {
      const chat = payload as unknown as SpectatorChatPayload
      this.appendFeed(`Chat ${chat.from || "table"}: ${chat.message || ""}`)
      return
    }

    if (message.type === "error") {
      const err = payload as unknown as SocketErrorPayload
      this.appendFeed(`Error: ${err.message || "Unknown error"}`, "error")
    }
  }

  private async resolveSpectatorTarget(input: {
    wsUrl?: string | null
    tableId?: string | null
  }): Promise<{ wsUrl: string; tableId: string }> {
    const rest = this.container.client("rest", {
      baseURL: "/api/v1",
      json: true,
      _cacheKey: "spectator-runtime-rest",
    }) as any

    const health = await rest.get("/health") as ApiHealthResponse
    const wsUrl = String(input.wsUrl || health.spectatorWsUrl || "").trim()
    if (!wsUrl) {
      throw new Error("Server does not expose spectator websocket. Start with --spectatorPort.")
    }

    const explicitTableId = String(input.tableId || "").trim()
    if (explicitTableId) {
      return { wsUrl, tableId: explicitTableId }
    }

    try {
      const tablesPayload = await rest.get("/tables") as TablesResponse
      const ranked = (tablesPayload.tables || [])
        .filter((table) => table && table.id)
        .map((table) => {
          const name = String(table.name || "").toLowerCase()
          const players = Array.isArray(table.players) ? table.players.length : 0
          const status = String(table.status || "")
          const handActive = table.handActive === true

          let score = 0
          if (name.startsWith("showcase bots")) score += 100
          if (status === "active") score += 50
          if (handActive) score += 30
          if (players >= 2) score += 20
          score += Math.min(10, players)
          if (status === "closed") score -= 100

          return { tableId: String(table.id), score }
        })
        .sort((left, right) => right.score - left.score)

      const topTable = ranked[0]?.tableId
      if (topTable) {
        return { wsUrl, tableId: topTable }
      }
    } catch {
      // fallback below
    }

    const tournamentsPayload = await rest.get("/tournaments/live") as LiveTournamentsResponse
    const firstTournamentTable = String(tournamentsPayload.tournaments?.[0]?.tableId || "").trim()
    if (firstTournamentTable) {
      return { wsUrl, tableId: firstTournamentTable }
    }

    throw new Error("No tableId available. Pass ?tableId=<id> in URL.")
  }
}

export default features.register("spectatorRuntime", SpectatorRuntime)
