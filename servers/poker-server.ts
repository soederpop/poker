import type { AGIContainer } from "@soederpop/luca/agi"
import {
  applyEvent,
  createInitialGameState,
  playersInHand,
  toCallForPlayer,
  type GameEvent,
  type GameState,
  type PlayerActionType,
} from "../features/game-engine"
import type { PokerTable } from "../features/table-manager"

type WalletLedgerType =
  | "register_credit"
  | "cash_buy_in"
  | "cash_cashout"
  | "tournament_buy_in"
  | "tournament_payout"
  | "reup_credit"
  | "admin_adjustment"
  | "house_buy_in"
  | "house_cashout"

type WalletEntry = {
  id: string
  botId: string
  type: WalletLedgerType
  amount: number
  balanceAfter: number
  timestamp: number
  metadata?: Record<string, unknown>
}

type WalletState = {
  botId: string
  balance: number
  currency: "PLAY"
  updatedAt: number
  ledger: WalletEntry[]
}

type BotIdentity = {
  botId: string
  name: string
  serverId: string
  agentVersion?: string
  metadata?: Record<string, unknown>
  createdAt: number
}

type PersistedIdentityState = {
  bots: Record<string, BotIdentity>
  accessTokens: Record<string, string>
  refreshTokens: Record<string, string>
  wallets: Record<string, WalletState>
}

type ClientSession = {
  connectedAt: number
  lastSeenAt: number
  authenticated: boolean
  botId?: string
  tableId?: string
}

type SpectatorSession = {
  connectedAt: number
  lastSeenAt: number
  tableId?: string
}

type TableRuntime = {
  tableId: string
  engineContainer: AGIContainer & any
  gameEngine: any
  handNumber: number
  dealerSeat: number
  handActive: boolean
  showdownReveal?: {
    handNumber: number
    handId?: string
    stage: "showdown" | "complete"
    board: string[]
    pot: number
    currentActor: string | null
    dealerSeat: number
    expiresAt: number
    players: Array<{
      id: string
      inHand: boolean
      folded: boolean
      allIn: boolean
      committed: number
      totalCommitted: number
    }>
  }
  nextHandTimer?: ReturnType<typeof setTimeout>
  actionClock?: {
    actorId: string
    phase: "base" | "timebank"
    startedAt: number
    baseDeadlineAt: number
    baseTimeoutMs: number
    timeBankBudgetSeconds: number
    timeBankStartedAt?: number
    deadlineAt: number
    baseTimer?: ReturnType<typeof setTimeout>
    warningTimer?: ReturnType<typeof setTimeout>
    foldTimer?: ReturnType<typeof setTimeout>
  }
  timeBanks: Map<string, number>
  reconnectTimers: Map<string, ReturnType<typeof setTimeout>>
  pendingKick: Set<string>
}

type HandHistoryRecord = {
  id?: string
  tableId: string
  tournamentId?: string
  handNumber: number
  players: Array<{
    id: string
    seat: number
    stack: number
    cards?: [string, string] | []
  }>
  actions: Array<{
    seq: number
    playerId: string
    action: string
    amount?: number
    street: string
  }>
  board: string[]
  pot: number
  winners: Array<{ playerId: string; amount: number; hand?: string }>
  timestamp: number
}

type IndexedHandHistoryRecord = HandHistoryRecord & {
  id: string
}

type LeaderboardInvalidationState = {
  hands: string[]
  tables: string[]
  tournaments: string[]
  updatedAt: number
}

type LeaderboardResetState = {
  resetAt: number
  updatedAt: number
}

type LeaderboardTimeWindow = "all" | "7d" | "30d" | "season"

type ApplyActionMeta = {
  auto?: boolean
  reason?: string
  decisionReasoning?: string
}

type GoldenFixture = {
  id: string
  setup: {
    smallBlind: number
    bigBlind: number
    ante: number
    players: Array<{ id: string; seat: number; stack: number }>
    dealer?: number
  }
  events: GameEvent[]
  expected: {
    pots: Array<{ amount: number; eligible: string[] }>
    winners: Array<{ playerId: string; amount: number }>
  }
}

type GoldenFixtureReplayFrame = {
  index: number
  label: string
  eventType: string
  event?: Record<string, unknown>
  snapshot: Record<string, unknown>
}

type GoldenFixtureReplay = {
  fixtureId: string
  tableId: string
  tableName: string
  maxPlayers: number
  setup: GoldenFixture["setup"]
  expected: GoldenFixture["expected"]
  frames: GoldenFixtureReplayFrame[]
}

type PlayerAction = Exclude<PlayerActionType, "small-blind" | "big-blind">

const PLAYER_ACTIONS: PlayerAction[] = ["fold", "check", "call", "bet", "raise", "all-in"]

export type PokerServerOptions = {
  host?: string
  port?: number
  wsPort?: number
  spectatorPort?: number
  defaultTable?: boolean
  seedLobby?: boolean
  initialBalance?: number
  reupAmount?: number
  reconnectGraceMs?: number
  actionTimeout?: number
  timeBankStartSeconds?: number
  timeBankCapSeconds?: number
  timeBankAccrualSeconds?: number
  showdownRevealMs?: number
  nonShowdownRevealMs?: number
}

const SPECTATOR_CARD_POLICY = "reveal-on-showdown"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asNumber(input: unknown, fallback: number): number {
  const n = Number(input)
  return Number.isFinite(n) ? n : fallback
}

function asBoolean(input: unknown, fallback: boolean): boolean {
  if (typeof input === "boolean") {
    return input
  }
  if (typeof input === "string") {
    const lowered = input.trim().toLowerCase()
    if (lowered === "true") return true
    if (lowered === "false") return false
  }
  return fallback
}

function tokenFromHeader(value: unknown): string | null {
  const raw = String(value || "")
  if (!raw.toLowerCase().startsWith("bearer ")) {
    return null
  }

  const token = raw.slice(7).trim()
  return token.length > 0 ? token : null
}

function toPayload(data: unknown): Record<string, unknown> {
  if (isRecord(data)) {
    return data
  }
  return {}
}

function messageText(raw: unknown): string {
  if (typeof raw === "string") {
    return raw
  }

  if (raw instanceof Uint8Array) {
    return new TextDecoder().decode(raw)
  }

  if (raw instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(raw))
  }

  return String(raw || "")
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function nowTs() {
  return Date.now()
}

function parseTimestamp(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null
  }

  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric)
  }

  const parsed = Date.parse(String(value))
  if (Number.isFinite(parsed)) {
    return Math.floor(parsed)
  }

  return null
}

function startOfCurrentYearUtcTs(now: number): number {
  const date = new Date(now)
  return Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0)
}

function tablePositionName(seat: number, table: PokerTable): string {
  const players = [...table.players].sort((a, b) => a.seat - b.seat)
  const idx = players.findIndex((entry) => entry.seat === seat)
  if (idx < 0) {
    return "BTN"
  }

  if (players.length <= 2) {
    return idx === 0 ? "BTN" : "BB"
  }

  const labels: string[] = ["BTN", "SB", "BB"]
  const remaining = Math.max(0, players.length - labels.length)
  for (let i = 0; i < remaining; i += 1) {
    if (i === 0) {
      labels.push("UTG")
    } else if (i === remaining - 1) {
      labels.push("CO")
    } else {
      labels.push("MP")
    }
  }

  return labels[idx] || "MP"
}

export class PokerServerRuntime {
  readonly container: AGIContainer & any
  readonly options: PokerServerOptions

  private _express?: any
  private _ws?: any
  private _spectatorWs?: any
  private _serverId?: string
  private _started = false
  private _stopping = false
  private _startedAt = 0
  private _lastHeartbeatAt = 0
  private _heartbeat?: ReturnType<typeof setInterval>
  private _adminIpc?: any
  private _adminSocketPath?: string

  private readonly sessions = new Map<any, ClientSession>()
  private readonly socketSeq = new Map<any, number>()
  private readonly socketsByBot = new Map<string, any>()
  private readonly spectatorSessions = new Map<any, SpectatorSession>()
  private readonly spectatorSocketSeq = new Map<any, number>()

  private readonly bots = new Map<string, BotIdentity>()
  private readonly accessTokens = new Map<string, string>()
  private readonly refreshTokens = new Map<string, string>()
  private readonly wallets = new Map<string, WalletState>()
  private readonly runtimes = new Map<string, TableRuntime>()
  private goldenFixturesCache: GoldenFixture[] | null = null
  private readonly goldenFixtureReplayCache = new Map<string, GoldenFixtureReplay>()

  private readonly sngPresets = [100, 250, 500]

  constructor(container: AGIContainer & any, options: PokerServerOptions = {}) {
    this.container = container
    this.options = options
  }

  get host(): string {
    return this.options.host || "0.0.0.0"
  }

  get port(): number {
    return this.options.port || 3000
  }

  get wsPort(): number {
    return this.options.wsPort || (this.port + 1)
  }

  get spectatorPort(): number | null {
    if (!Number.isFinite(Number(this.options.spectatorPort))) {
      return null
    }
    return Math.max(1, Number(this.options.spectatorPort))
  }

  get initialBalance(): number {
    return this.options.initialBalance ?? 100000
  }

  get reupAmount(): number {
    return this.options.reupAmount ?? 100000
  }

  get reconnectGraceMs(): number {
    return this.options.reconnectGraceMs ?? 45000
  }

  get defaultActionTimeout(): number {
    return this.options.actionTimeout ?? 30
  }

  get timeBankStartSeconds(): number {
    return Math.max(0, Math.floor(this.options.timeBankStartSeconds ?? 120))
  }

  get timeBankCapSeconds(): number {
    return Math.max(0, Math.floor(this.options.timeBankCapSeconds ?? 120))
  }

  get timeBankAccrualSeconds(): number {
    return Math.max(0, Math.floor(this.options.timeBankAccrualSeconds ?? 5))
  }

  get showdownRevealMs(): number {
    return Math.max(4000, Math.floor(this.options.showdownRevealMs ?? 4000))
  }

  get nonShowdownRevealMs(): number {
    return Math.max(250, Math.floor(this.options.nonShowdownRevealMs ?? 1200))
  }

  get serverId(): string {
    if (!this._serverId) {
      const signature = this.container.utils.hashObject({
        cwd: this.container.cwd,
        port: this.port,
        wsPort: this.wsPort,
      })
      this._serverId = `poker-${String(signature).slice(0, 12)}`
    }
    return this._serverId
  }

  get diskCache(): any {
    return this.container.feature("diskCache", {
      enable: true,
      path: this.container.paths.resolve("tmp", "poker-cache"),
    })
  }

  get tableManager(): any {
    return this.container.feature("tableManager", { enable: true })
  }

  get express(): any {
    if (!this._express) {
      this._express = this.container.server("express", {
        port: this.port,
        host: this.host,
        cors: true,
      })
    }
    return this._express
  }

  get ws(): any {
    if (!this._ws) {
      this._ws = this.container.server("websocket", {
        port: this.wsPort,
      })
    }
    return this._ws
  }

  get spectatorWs(): any | null {
    if (!this.spectatorPort) {
      return null
    }

    if (!this._spectatorWs) {
      this._spectatorWs = this.container.server("websocket", {
        port: this.spectatorPort,
      })
    }

    return this._spectatorWs
  }

  private async resolveWorkspacePath(pathLike: string): Promise<string> {
    const fs = this.container.feature("fs", { enable: true })
    const target = String(pathLike || "").trim()
    const direct = this.container.paths.resolve(target)
    if (await fs.existsAsync(direct)) {
      return direct
    }

    const projectScoped = this.container.paths.resolve("playground", "luca-poker", target)
    if (await fs.existsAsync(projectScoped)) {
      return projectScoped
    }

    return direct
  }

  private houseStatusSnapshot() {
    const status = this._started && !this._stopping ? "up" : "down"
    const now = nowTs()
    const tables = this.tableManager.tables as PokerTable[]

    return {
      status,
      ready: status === "up",
      serverId: this.serverId,
      startedAt: this._startedAt > 0 ? new Date(this._startedAt).toISOString() : null,
      uptimeMs: this._startedAt > 0 ? Math.max(0, now - this._startedAt) : 0,
      endpoints: {
        http: `http://localhost:${this.port}`,
        ws: `ws://localhost:${this.wsPort}`,
        spectatorWs: this.spectatorPort ? `ws://localhost:${this.spectatorPort}` : null,
      },
      connections: {
        authenticatedAgents: [...this.sessions.values()].filter((session) => session.authenticated).length,
        spectators: this.spectatorSessions.size,
      },
      tables: {
        total: tables.length,
        active: tables.filter((table) => table.status === "active").length,
        waiting: tables.filter((table) => table.status === "waiting").length,
        paused: tables.filter((table) => table.status === "paused").length,
      },
      heartbeat: {
        intervalMs: 15000,
        lastAt: this._lastHeartbeatAt > 0 ? new Date(this._lastHeartbeatAt).toISOString() : null,
      },
    }
  }

  private get leaderboardInvalidationKey(): string {
    return `poker:server:${this.serverId}:leaderboard:invalidations`
  }

  private get leaderboardResetStateKey(): string {
    return `poker:server:${this.serverId}:leaderboard:reset-state`
  }

  private async loadLeaderboardInvalidations(): Promise<LeaderboardInvalidationState> {
    const fallback: LeaderboardInvalidationState = {
      hands: [],
      tables: [],
      tournaments: [],
      updatedAt: 0,
    }

    const exists = await this.diskCache.has(this.leaderboardInvalidationKey)
    if (!exists) {
      return fallback
    }

    const raw = await this.diskCache.get(this.leaderboardInvalidationKey, true).catch(() => null)
    if (!isRecord(raw)) {
      return fallback
    }

    const toStrings = (value: unknown): string[] => {
      if (!Array.isArray(value)) {
        return []
      }
      return value.map((entry) => String(entry || "").trim()).filter(Boolean)
    }

    return {
      hands: toStrings(raw.hands),
      tables: toStrings(raw.tables),
      tournaments: toStrings(raw.tournaments),
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : 0,
    }
  }

  private async saveLeaderboardInvalidations(state: LeaderboardInvalidationState): Promise<void> {
    const payload: LeaderboardInvalidationState = {
      hands: [...new Set(state.hands)].sort(),
      tables: [...new Set(state.tables)].sort(),
      tournaments: [...new Set(state.tournaments)].sort(),
      updatedAt: nowTs(),
    }
    await this.diskCache.set(this.leaderboardInvalidationKey, payload)
  }

  private async loadLeaderboardResetState(): Promise<LeaderboardResetState> {
    const fallback: LeaderboardResetState = {
      resetAt: 0,
      updatedAt: 0,
    }

    const exists = await this.diskCache.has(this.leaderboardResetStateKey)
    if (!exists) {
      return fallback
    }

    const raw = await this.diskCache.get(this.leaderboardResetStateKey, true).catch(() => null)
    if (!isRecord(raw)) {
      return fallback
    }

    return {
      resetAt: Number.isFinite(Number(raw.resetAt)) ? Number(raw.resetAt) : 0,
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : 0,
    }
  }

  private async saveLeaderboardResetState(state: LeaderboardResetState): Promise<void> {
    const payload: LeaderboardResetState = {
      resetAt: Number.isFinite(Number(state.resetAt)) ? Number(state.resetAt) : 0,
      updatedAt: nowTs(),
    }
    await this.diskCache.set(this.leaderboardResetStateKey, payload)
  }

  private resolveLeaderboardWindowRange(options: {
    window: unknown
    since?: unknown
    until?: unknown
    seasonStart?: unknown
    seasonEnd?: unknown
  }): {
    window: LeaderboardTimeWindow
    sinceTs: number | null
    untilTs: number | null
  } {
    const normalizedWindow = String(options.window || "all").trim().toLowerCase()
    const window: LeaderboardTimeWindow = normalizedWindow === "7d"
      ? "7d"
      : normalizedWindow === "30d"
        ? "30d"
        : normalizedWindow === "season"
          ? "season"
          : "all"

    const now = nowTs()
    let sinceTs = parseTimestamp(options.since)
    let untilTs = parseTimestamp(options.until)

    if (window === "7d" && sinceTs === null) {
      sinceTs = now - (7 * 24 * 60 * 60 * 1000)
    } else if (window === "30d" && sinceTs === null) {
      sinceTs = now - (30 * 24 * 60 * 60 * 1000)
    } else if (window === "season") {
      if (sinceTs === null) {
        sinceTs = parseTimestamp(options.seasonStart)
      }
      if (untilTs === null) {
        untilTs = parseTimestamp(options.seasonEnd)
      }
      if (sinceTs === null) {
        sinceTs = startOfCurrentYearUtcTs(now)
      }
      if (untilTs === null) {
        untilTs = now
      }
    }

    if (sinceTs !== null && untilTs !== null && sinceTs > untilTs) {
      const swapped = sinceTs
      sinceTs = untilTs
      untilTs = swapped
    }

    return {
      window,
      sinceTs,
      untilTs,
    }
  }

  private tournamentIdForTableId(tableId: string): string | undefined {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    if (!table) {
      return undefined
    }
    return this.tableTournamentId(table) || undefined
  }

  private async loadIndexedHandHistory(options: {
    tableId?: string
    playerId?: string
    limit?: number
    sort?: "asc" | "desc"
    includeInvalidated?: boolean
    sinceTs?: number | null
    untilTs?: number | null
  } = {}): Promise<IndexedHandHistoryRecord[]> {
    const keys = await this.diskCache.keys()
    const handKeys = keys
      .filter((key: string) => key.startsWith("hand:"))
      .sort((a: string, b: string) => a.localeCompare(b))

    const invalidations = options.includeInvalidated === true
      ? {
        hands: new Set<string>(),
        tables: new Set<string>(),
        tournaments: new Set<string>(),
      }
      : await this.loadLeaderboardInvalidations().then((state) => ({
        hands: new Set(state.hands),
        tables: new Set(state.tables),
        tournaments: new Set(state.tournaments),
      }))

    const records = await Promise.all(
      handKeys.map(async (key: string) => ({
        key,
        value: await this.diskCache.get(key, true).catch(() => null),
      })),
    )

    const filtered = records
      .filter((entry): entry is { key: string; value: Record<string, unknown> } => isRecord(entry.value))
      .map((entry) => {
        const record = entry.value as HandHistoryRecord
        const tournamentId = record.tournamentId || this.tournamentIdForTableId(String(record.tableId || "")) || undefined
        return {
          ...record,
          id: entry.key,
          ...(tournamentId ? { tournamentId } : {}),
        } as IndexedHandHistoryRecord
      })
      .filter((record) => {
        const tableId = String(record.tableId || "")
        const tournamentId = record.tournamentId ? String(record.tournamentId) : null

        if (options.includeInvalidated !== true) {
          if (invalidations.hands.has(record.id)) {
            return false
          }
          if (invalidations.tables.has(tableId)) {
            return false
          }
          if (tournamentId && invalidations.tournaments.has(tournamentId)) {
            return false
          }
        }

        if (options.tableId && tableId !== options.tableId) {
          return false
        }

        if (options.playerId) {
          const byPlayers = Array.isArray(record.players)
            ? record.players.some((entry) => isRecord(entry) && String(entry.id || "") === options.playerId)
            : false
          const byWinners = Array.isArray(record.winners)
            ? record.winners.some((entry) => isRecord(entry) && String(entry.playerId || "") === options.playerId)
            : false
          if (!byPlayers && !byWinners) {
            return false
          }
        }

        const ts = Number(record.timestamp || 0)
        if (options.sinceTs !== null && options.sinceTs !== undefined && ts < options.sinceTs) {
          return false
        }
        if (options.untilTs !== null && options.untilTs !== undefined && ts > options.untilTs) {
          return false
        }

        return true
      })

    const sorted = options.sort === "desc"
      ? filtered.slice().sort((left, right) => right.id.localeCompare(left.id))
      : filtered.slice().sort((left, right) => left.id.localeCompare(right.id))

    if (Number.isFinite(Number(options.limit))) {
      const max = Math.max(1, Math.floor(Number(options.limit)))
      return sorted.slice(0, max)
    }

    return sorted
  }

  private get identityCacheKey(): string {
    return `poker:server:${this.serverId}:identity`
  }

  get adminSocketPath(): string {
    if (!this._adminSocketPath) {
      this._adminSocketPath = this.container.paths.resolve("tmp", `pokurr-admin-${this.port}.sock`)
    }
    return this._adminSocketPath
  }

  private async setupAdminSocket(): Promise<void> {
    const ipc = this.container.feature("ipcSocket")
    this._adminIpc = ipc

    await ipc.listen(this.adminSocketPath, true)

    ipc.on("message", (msg: any) => {
      const data = msg?.data || msg
      try {
        const result = this.handleAdminCommand(data)
        ipc.broadcast(result)
      } catch (err: any) {
        ipc.broadcast({ ok: false, error: String(err?.message || err) })
      }
    })

    console.log(`[poker-server] admin socket: ${this.adminSocketPath}`)
  }

  private handleAdminCommand(msg: { action: string; payload?: any }): any {
    const action = String(msg.action || "")
    const payload = msg.payload && typeof msg.payload === "object" ? msg.payload : {}

    if (action === "create_table") {
      const blindsInput = payload.blinds
      let smallBlind = 1
      let bigBlind = 2

      if (Array.isArray(blindsInput) && blindsInput.length >= 2) {
        smallBlind = asNumber(blindsInput[0], 1)
        bigBlind = asNumber(blindsInput[1], 2)
      } else if (isRecord(blindsInput)) {
        smallBlind = asNumber(blindsInput.smallBlind, 1)
        bigBlind = asNumber(blindsInput.bigBlind, 2)
      } else if (typeof blindsInput === "string" && blindsInput.includes("/")) {
        const [small, big] = blindsInput.split("/")
        smallBlind = asNumber(small, 1)
        bigBlind = asNumber(big, 2)
      }

      const table = this.tableManager.createTable({
        name: payload.name ? String(payload.name) : undefined,
        blinds: [smallBlind, bigBlind],
        startingStack: asNumber(payload.startingStack, 100),
        maxPlayers: Math.max(2, Math.min(9, Math.floor(asNumber(payload.maxPlayers, 9)))),
        actionTimeout: Math.max(1, Math.floor(asNumber(payload.actionTimeout, this.defaultActionTimeout))),
      }) as PokerTable

      this.broadcastTables()
      return { ok: true, table: this.serializeTable(table) }
    }

    if (action === "list_tables") {
      const tables = (this.tableManager.tables as PokerTable[]).map((table) => ({
        ...this.serializeTable(table),
        handActive: Boolean(this.runtimes.get(table.id)?.handActive),
      }))
      return { ok: true, tables }
    }

    if (action === "server_status") {
      return {
        ok: true,
        serverId: this.serverId,
        uptime: nowTs() - this._startedAt,
        tables: (this.tableManager.tables as PokerTable[]).length,
        connections: this.sessions.size,
        bots: this.bots.size,
      }
    }

    return { ok: false, error: `Unknown admin action: ${action}` }
  }

  private async stopAdminSocket(): Promise<void> {
    if (this._adminIpc) {
      await this._adminIpc.stopServer()
      this._adminIpc = undefined
    }
  }

  async start(): Promise<this> {
    if (this._started) {
      return this
    }

    await this.loadIdentityState()
    this.setupHttpEndpoints()
    this.setupWebsocketHandlers()
    this.setupSpectatorWebsocketHandlers()
    await this.setupAdminSocket()

    await this.express.start({
      host: this.host,
      port: this.port,
    })
    await this.ws.start()
    if (this.spectatorWs) {
      await this.spectatorWs.start()
    }

    if (this.options.defaultTable !== false) {
      await this.ensureLobbyTables()
    }

    this._startedAt = nowTs()
    this._lastHeartbeatAt = this._startedAt
    this._heartbeat = setInterval(() => {
      this._lastHeartbeatAt = nowTs()
      for (const socket of this.sessions.keys()) {
        this.send(socket, "ping", { now: nowTs() })
      }

      for (const socket of this.spectatorSessions.keys()) {
        this.sendSpectator(socket, "ping", { now: nowTs() })
      }
    }, 15000)

    console.log(`[poker-server] serverId: ${this.serverId}`)
    console.log(`[poker-server] http: http://localhost:${this.port}`)
    console.log(`[poker-server] ws: ws://localhost:${this.wsPort}`)
    if (this.spectatorPort) {
      console.log(`[poker-server] spectator ws: ws://localhost:${this.spectatorPort}`)
      console.log(`[poker-server] spectator card policy: ${SPECTATOR_CARD_POLICY}`)
    }
    console.log("[poker-server] equity backend: wasm")
    this.printLobbyInventory()

    this._started = true
    return this
  }

  async stop(): Promise<this> {
    if (this._stopping) {
      return this
    }

    this._stopping = true

    if (this._heartbeat) {
      clearInterval(this._heartbeat)
      this._heartbeat = undefined
    }

    const runtimeList = [...this.runtimes.values()]

    for (const runtime of runtimeList) {
      this.clearActionClock(runtime, { consumeTimeBank: false })
      if (runtime.nextHandTimer) {
        clearTimeout(runtime.nextHandTimer)
        runtime.nextHandTimer = undefined
      }

      for (const timer of runtime.reconnectTimers.values()) {
        clearTimeout(timer)
      }
      runtime.reconnectTimers.clear()
    }

    for (const runtime of runtimeList) {
      if (runtime.handActive) {
        await this.finalizeHand(runtime.tableId, "shutdown")
      }
    }

    try {
      await this.ws.stop()
    } catch {}
    if (this.spectatorWs) {
      try {
        await this.spectatorWs.stop()
      } catch {}
    }
    try {
      await this.express.stop()
    } catch {}
    await this.stopAdminSocket()
    this.sessions.clear()
    this.socketSeq.clear()
    this.socketsByBot.clear()
    this.spectatorSessions.clear()
    this.spectatorSocketSeq.clear()

    this._started = false
    return this
  }

  private printLobbyInventory() {
    const tables = this.tableManager.listTables() as Array<any>
    if (!tables.length) {
      console.log("[poker-server] lobby empty")
      return
    }

    console.log("[poker-server] lobby tables:")
    for (const table of tables) {
      console.log(`  - ${table.name} (${table.blinds}) players=${table.players}/${table.maxPlayers}`)
    }

    console.log(`[poker-server] sng presets: ${this.sngPresets.join(", ")}`)
  }

  private async ensureLobbyTables() {
    this.tableManager.ensureDefaultTables()

    if (!asBoolean(this.options.seedLobby, true)) {
      return
    }

    const existing = this.tableManager.listTables() as Array<any>

    const ensureSng = (name: string, smallBlind: number, bigBlind: number, stack: number) => {
      const has = existing.some((table) => String(table.name || "") === name)
      if (!has) {
        this.tableManager.createTable({
          name,
          blinds: [smallBlind, bigBlind],
          startingStack: stack,
          maxPlayers: 6,
          actionTimeout: this.defaultActionTimeout,
        })
      }
    }

    ensureSng("SNG 100", 1, 2, 100)
    ensureSng("SNG 250", 2, 5, 250)
    ensureSng("SNG 500", 5, 10, 500)
  }

  private setupHttpEndpoints() {
    const app = this.express.app
    const appRoot = this.container.paths.resolve("web-framework", "public")

    app.use("/app", this.express.express.static(appRoot))

    const hashRedirect = (path: string, query: Record<string, unknown> = {}) => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) {
          continue
        }

        if (Array.isArray(value)) {
          for (const entry of value) {
            params.append(key, String(entry))
          }
          continue
        }

        params.append(key, String(value))
      }

      const search = params.toString()
      return `/app/#${path}${search ? `?${search}` : ""}`
    }

    app.get("/app", (_req: any, res: any) => {
      res.redirect("/app/")
    })
    app.get("/app/leaderboard", (req: any, res: any) => {
      res.redirect(hashRedirect("/leaderboard", req.query))
    })
    app.get("/app/tournaments", (req: any, res: any) => {
      res.redirect(hashRedirect("/tournaments", req.query))
    })
    app.get("/app/agent", (req: any, res: any) => {
      res.redirect(hashRedirect("/agent", req.query))
    })
    app.get("/app/spectator", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator", req.query))
    })
    app.get("/app/spectator-debug", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator-debug", req.query))
    })
    app.get("/app/spectator-fixtures", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator-fixtures", req.query))
    })

    app.get("/", (_req: any, res: any) => {
      res.redirect("/app/")
    })
    app.get("/leaderboard", (req: any, res: any) => {
      res.redirect(hashRedirect("/leaderboard", req.query))
    })
    app.get("/tournaments", (req: any, res: any) => {
      res.redirect(hashRedirect("/tournaments", req.query))
    })
    app.get("/agent", (req: any, res: any) => {
      res.redirect(hashRedirect("/agent", req.query))
    })
    app.get("/spectator", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator", req.query))
    })
    app.get("/spectator-debug", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator-debug", req.query))
    })
    app.get("/spectator/debug", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator-debug", req.query))
    })
    app.get("/spectator-fixtures", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator-fixtures", req.query))
    })
    app.get("/spectator/fixtures", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator-fixtures", req.query))
    })

    app.get("/web", (_req: any, res: any) => {
      res.redirect("/app/")
    })
    app.get("/web/", (_req: any, res: any) => {
      res.redirect("/app/")
    })
    app.get("/web/leaderboard", (req: any, res: any) => {
      res.redirect(hashRedirect("/leaderboard", req.query))
    })
    app.get("/web/tournaments", (req: any, res: any) => {
      res.redirect(hashRedirect("/tournaments", req.query))
    })
    app.get("/web/agent", (req: any, res: any) => {
      res.redirect(hashRedirect("/agent", req.query))
    })
    app.get("/web/spectator", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator", req.query))
    })
    app.get("/web/spectator-debug", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator-debug", req.query))
    })
    app.get("/web/spectator-fixtures", (req: any, res: any) => {
      res.redirect(hashRedirect("/spectator-fixtures", req.query))
    })
    app.get("/web/*", (_req: any, res: any) => {
      res.redirect("/app/")
    })

    app.get("/health/live", (_req: any, res: any) => {
      res.json({
        ok: true,
        status: this._started && !this._stopping ? "up" : "down",
        serverId: this.serverId,
        at: new Date().toISOString(),
      })
    })

    app.get("/health/ready", (_req: any, res: any) => {
      const snapshot = this.houseStatusSnapshot()
      const ready = snapshot.status === "up"
      res.status(ready ? 200 : 503).json({
        ok: ready,
        ready,
        serverId: this.serverId,
        at: new Date().toISOString(),
      })
    })

    app.get("/api/v1/health", (_req: any, res: any) => {
      const snapshot = this.houseStatusSnapshot()
      res.json({
        ok: snapshot.status === "up",
        serverId: this.serverId,
        status: snapshot.status,
        httpUrl: snapshot.endpoints.http,
        wsUrl: snapshot.endpoints.ws,
        ...(snapshot.endpoints.spectatorWs ? { spectatorWsUrl: snapshot.endpoints.spectatorWs } : {}),
        uptimeMs: snapshot.uptimeMs,
      })
    })

    app.get("/api/v1/fixtures/golden", async (_req: any, res: any) => {
      try {
        const fixtures = await this.loadGoldenFixtures()
        res.json({
          total: fixtures.length,
          fixtures: fixtures.map((fixture) => ({
            id: fixture.id,
            players: fixture.setup.players.length,
            events: fixture.events.length,
            blinds: {
              small: fixture.setup.smallBlind,
              big: fixture.setup.bigBlind,
              ante: fixture.setup.ante,
            },
          })),
        })
      } catch (error: any) {
        res.status(500).json({ error: String(error?.message || error) })
      }
    })

    app.get("/api/v1/fixtures/golden/:fixtureId/replay", async (req: any, res: any) => {
      try {
        const fixtureId = String(req.params?.fixtureId || "").trim()
        if (!fixtureId) {
          res.status(400).json({ error: "fixtureId is required" })
          return
        }

        const replay = await this.buildGoldenFixtureReplay(fixtureId)
        if (!replay) {
          res.status(404).json({ error: `Unknown fixture: ${fixtureId}` })
          return
        }

        res.json(replay)
      } catch (error: any) {
        res.status(500).json({ error: String(error?.message || error) })
      }
    })

    app.post("/api/v1/bots/register", async (req: any, res: any) => {
      try {
        const payload = toPayload(req.body)
        const name = String(payload.name || "").trim()

        if (!name) {
          res.status(400).json({ error: "name is required" })
          return
        }

        const metadata = isRecord(payload.metadata) ? payload.metadata : undefined
        const { bot, token, refreshToken } = await this.registerBot({
          name,
          agentVersion: payload.agentVersion ? String(payload.agentVersion) : undefined,
          metadata,
        })

        res.json({
          botId: bot.botId,
          token,
          refreshToken,
          wsUrl: `ws://localhost:${this.wsPort}`,
          serverId: this.serverId,
          initialBalance: this.initialBalance,
          ...(this.spectatorPort ? { spectatorWsUrl: `ws://localhost:${this.spectatorPort}` } : {}),
        })
      } catch (error: any) {
        res.status(500).json({ error: String(error?.message || error) })
      }
    })

    app.post("/api/v1/bots/associate", async (req: any, res: any) => {
      const payload = toPayload(req.body)
      const token = String(payload.token || "").trim()
      const botId = this.accessTokens.get(token)

      if (!botId) {
        res.status(401).json({ error: "invalid token" })
        return
      }

      res.json({
        botId,
        serverId: this.serverId,
        wsUrl: `ws://localhost:${this.wsPort}`,
        ...(this.spectatorPort ? { spectatorWsUrl: `ws://localhost:${this.spectatorPort}` } : {}),
      })
    })

    app.post("/api/v1/bots/token/refresh", async (req: any, res: any) => {
      try {
        const payload = toPayload(req.body)
        const refreshToken = String(payload.refreshToken || "").trim()
        const botId = this.refreshTokens.get(refreshToken)

        if (!botId) {
          res.status(401).json({ error: "invalid refresh token" })
          return
        }

        const token = this.issueAccessToken(botId)
        await this.persistIdentityState()

        res.json({
          botId,
          token,
          serverId: this.serverId,
          wsUrl: `ws://localhost:${this.wsPort}`,
          ...(this.spectatorPort ? { spectatorWsUrl: `ws://localhost:${this.spectatorPort}` } : {}),
        })
      } catch (error: any) {
        res.status(500).json({ error: String(error?.message || error) })
      }
    })

    app.get("/api/v1/wallet", async (req: any, res: any) => {
      const botId = this.resolveBotIdFromHttpRequest(req)
      if (!botId) {
        res.status(401).json({ error: "missing or invalid bearer token" })
        return
      }

      const wallet = this.ensureWallet(botId)
      res.json(this.walletSnapshot(wallet))
    })

    app.post("/api/v1/wallet/reup", async (req: any, res: any) => {
      try {
        const botId = this.resolveBotIdFromHttpRequest(req)
        if (!botId) {
          res.status(401).json({ error: "missing or invalid bearer token" })
          return
        }

        const payload = toPayload(req.body)
        const amount = Math.max(1, Math.floor(asNumber(payload.amount, this.reupAmount)))
        const entry = await this.applyWalletEntry(botId, "reup_credit", amount, { source: "http" })
        const wallet = this.ensureWallet(botId)

        res.json({
          ok: true,
          entryId: entry.id,
          ...this.walletSnapshot(wallet),
        })
      } catch (error: any) {
        res.status(400).json({ error: String(error?.message || error) })
      }
    })

    app.get("/api/v1/wallet/history", async (req: any, res: any) => {
      const botId = this.resolveBotIdFromHttpRequest(req)
      if (!botId) {
        res.status(401).json({ error: "missing or invalid bearer token" })
        return
      }

      const wallet = this.ensureWallet(botId)
      const page = Math.max(1, Math.floor(asNumber(req.query?.page, 1)))
      const pageSize = Math.min(200, Math.max(1, Math.floor(asNumber(req.query?.pageSize, 50))))
      const ordered = [...wallet.ledger].reverse()
      const start = (page - 1) * pageSize
      const entries = ordered.slice(start, start + pageSize)

      res.json({
        page,
        pageSize,
        total: wallet.ledger.length,
        entries,
      })
    })

    app.get("/api/v1/hands", async (req: any, res: any) => {
      try {
        const tableId = req.query?.tableId ? String(req.query.tableId) : undefined
        const playerId = req.query?.playerId ? String(req.query.playerId) : undefined
        const limit = Math.min(500, Math.max(1, Math.floor(asNumber(req.query?.limit, 100))))

        const hands = await this.queryHandHistory({ tableId, playerId, limit })
        res.json({ total: hands.length, hands })
      } catch (error: any) {
        res.status(500).json({ error: String(error?.message || error) })
      }
    })

    app.get("/api/v1/hands/export", async (req: any, res: any) => {
      try {
        const tableId = req.query?.tableId ? String(req.query.tableId) : undefined
        const playerId = req.query?.playerId ? String(req.query.playerId) : undefined
        const limit = Math.min(500, Math.max(1, Math.floor(asNumber(req.query?.limit, 50))))

        const hands = await this.queryHandHistory({ tableId, playerId, limit })
        const body = hands.map((hand) => this.toHandHistoryText(hand)).join("\n\n")

        res.setHeader("content-type", "text/plain; charset=utf-8")
        res.send(body)
      } catch (error: any) {
        res.status(500).json({ error: String(error?.message || error) })
      }
    })

    app.get("/api/v1/tournaments/live", (_req: any, res: any) => {
      const tournaments = this.listTournamentSummaries().map((entry) => ({
        ...entry,
        ...(this.spectatorPort
          ? { spectateUrl: hashRedirect("/spectator", { tableId: entry.tableId }) }
          : {}),
      }))
      res.json({
        serverId: this.serverId,
        spectatorWsUrl: this.spectatorPort ? `ws://localhost:${this.spectatorPort}` : null,
        tournaments,
      })
    })

    app.get("/api/v1/tables", (_req: any, res: any) => {
      const tables = (this.tableManager.tables as PokerTable[]).map((table) => ({
        ...this.serializeTable(table),
        handActive: Boolean(this.runtimes.get(table.id)?.handActive),
      }))
      res.json({
        serverId: this.serverId,
        tables,
      })
    })

    app.get("/api/v1/tables/:tableId/state", (req: any, res: any) => {
      const tableId = String(req.params?.tableId || "").trim()
      if (!tableId) {
        res.status(400).json({ error: "tableId is required" })
        return
      }

      const snapshot = this.spectatorSnapshot(tableId)
      if (!snapshot) {
        res.status(404).json({ error: `Table not found: ${tableId}` })
        return
      }

      const runtime = this.runtimes.get(tableId)
      res.json({
        serverId: this.serverId,
        handActive: Boolean(runtime?.handActive),
        ...snapshot,
      })
    })

    app.get("/api/v1/leaderboard", async (req: any, res: any) => {
      try {
        const limit = Math.min(200, Math.max(1, Math.floor(asNumber(req.query?.limit, 100))))
        const sortBy = String(req.query?.sort || "net_profit")
        const range = this.resolveLeaderboardWindowRange({
          window: req.query?.window,
          since: req.query?.since,
          until: req.query?.until,
          seasonStart: req.query?.seasonStart,
          seasonEnd: req.query?.seasonEnd,
        })
        const resetState = await this.loadLeaderboardResetState()
        const invalidations = await this.loadLeaderboardInvalidations()
        const entries = await this.computeLeaderboard({
          limit,
          sortByRaw: sortBy,
          sinceTs: range.sinceTs,
          untilTs: range.untilTs,
        })
        res.json({
          serverId: this.serverId,
          generatedAt: new Date().toISOString(),
          sortBy,
          source: "canonical-hand-history",
          window: range.window,
          ...(range.sinceTs !== null ? { since: new Date(range.sinceTs).toISOString() } : {}),
          ...(range.untilTs !== null ? { until: new Date(range.untilTs).toISOString() } : {}),
          resetAt: resetState.resetAt > 0 ? new Date(resetState.resetAt).toISOString() : null,
          invalidations: {
            hands: invalidations.hands.length,
            tables: invalidations.tables.length,
            tournaments: invalidations.tournaments.length,
            updatedAt: invalidations.updatedAt > 0 ? new Date(invalidations.updatedAt).toISOString() : null,
          },
          entries,
        })
      } catch (error: any) {
        res.status(500).json({ error: String(error?.message || error) })
      }
    })

    app.get("/api/v1/leaderboard/status", async (_req: any, res: any) => {
      const resetState = await this.loadLeaderboardResetState()
      const invalidations = await this.loadLeaderboardInvalidations()
      res.json({
        serverId: this.serverId,
        resetAt: resetState.resetAt > 0 ? new Date(resetState.resetAt).toISOString() : null,
        invalidations: {
          hands: invalidations.hands.length,
          tables: invalidations.tables.length,
          tournaments: invalidations.tournaments.length,
          updatedAt: invalidations.updatedAt > 0 ? new Date(invalidations.updatedAt).toISOString() : null,
        },
      })
    })

    app.get("/api/v1/house/status", (_req: any, res: any) => {
      res.json(this.houseStatusSnapshot())
    })

    app.get("/api/v1/agents/:botId", async (req: any, res: any) => {
      try {
        const botId = String(req.params?.botId || "").trim()
        if (!botId) {
          res.status(400).json({ error: "botId is required" })
          return
        }

        const profile = await this.computeAgentProfile(botId)
        if (!profile) {
          res.status(404).json({ error: `Unknown agent: ${botId}` })
          return
        }

        res.json(profile)
      } catch (error: any) {
        res.status(500).json({ error: String(error?.message || error) })
      }
    })
  }

  private async queryHandHistory(filters: {
    tableId?: string
    playerId?: string
    limit: number
  }): Promise<IndexedHandHistoryRecord[]> {
    return this.loadIndexedHandHistory({
      tableId: filters.tableId,
      playerId: filters.playerId,
      limit: filters.limit,
      sort: "desc",
      includeInvalidated: false,
    })
  }

  private async loadGoldenFixtures(): Promise<GoldenFixture[]> {
    if (this.goldenFixturesCache) {
      return this.goldenFixturesCache
    }

    const fs = this.container.feature("fs", { enable: true })
    const fixturePath = await this.resolveWorkspacePath("test/fixtures/golden-hands.json")
    const raw = await fs.readFileAsync(fixturePath)
    const parsed = JSON.parse(raw || "[]")

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid golden fixtures payload: expected array")
    }

    const fixtures = parsed.filter((entry) => isRecord(entry) && typeof entry.id === "string") as GoldenFixture[]
    this.goldenFixturesCache = fixtures
    return fixtures
  }

  private async buildGoldenFixtureReplay(fixtureId: string): Promise<GoldenFixtureReplay | null> {
    const cached = this.goldenFixtureReplayCache.get(fixtureId)
    if (cached) {
      return cached
    }

    const fixtures = await this.loadGoldenFixtures()
    const fixture = fixtures.find((entry) => entry.id === fixtureId)
    if (!fixture) {
      return null
    }

    let state = createInitialGameState({
      smallBlind: fixture.setup.smallBlind,
      bigBlind: fixture.setup.bigBlind,
      ante: fixture.setup.ante,
      tableId: `fixture:${fixture.id}`,
    })

    state.handId = fixture.id
    if (Number.isFinite(Number(fixture.setup.dealer)) && Number(fixture.setup.dealer) > 0) {
      state.dealer = Number(fixture.setup.dealer)
    }

    const seededPlayers = fixture.setup.players
      .slice()
      .sort((a, b) => a.seat - b.seat)

    for (const player of seededPlayers) {
      state = applyEvent(state, {
        type: "SeatPlayer",
        playerId: player.id,
        seat: player.seat,
        stack: player.stack,
      })
    }

    const frames: GoldenFixtureReplayFrame[] = [
      {
        index: 0,
        label: "Setup",
        eventType: "setup",
        snapshot: this.toGoldenFixtureSnapshot(fixture, state),
      },
    ]

    for (let index = 0; index < fixture.events.length; index += 1) {
      const event = fixture.events[index] as GameEvent
      state = applyEvent(state, event)
      const eventType = isRecord(event) ? String(event.type || "event") : "event"

      frames.push({
        index: index + 1,
        label: `${index + 1}. ${eventType}`,
        eventType,
        ...(isRecord(event) ? { event: event as Record<string, unknown> } : {}),
        snapshot: this.toGoldenFixtureSnapshot(fixture, state),
      })
    }

    const replay: GoldenFixtureReplay = {
      fixtureId: fixture.id,
      tableId: `fixture:${fixture.id}`,
      tableName: `Golden ${fixture.id}`,
      maxPlayers: fixture.setup.players.length,
      setup: fixture.setup,
      expected: fixture.expected,
      frames,
    }

    this.goldenFixtureReplayCache.set(fixtureId, replay)
    return replay
  }

  private toGoldenFixtureSnapshot(fixture: GoldenFixture, state: GameState): Record<string, unknown> {
    const players = state.players
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .map((player) => ({
        botId: player.id,
        name: `Fixture ${String(player.id).toUpperCase()}`,
        seat: player.seat,
        stack: player.stack,
        connected: true,
        inHand: player.inHand && !player.folded,
        folded: player.folded,
        allIn: player.allIn,
        committed: Number(player.committed || 0),
        totalCommitted: Number(player.totalCommitted || 0),
        holeCards: Array.isArray(player.holeCards) ? player.holeCards : [],
      }))

    return {
      tableId: `fixture:${fixture.id}`,
      tableName: `Golden ${fixture.id}`,
      maxPlayers: fixture.setup.players.length,
      handNumber: 1,
      handId: fixture.id,
      stage: state.stage,
      board: [...state.board],
      pot: state.pot,
      players,
      currentActor: state.currentActor,
      dealerSeat: state.dealer || fixture.setup.dealer || players[0]?.seat || 1,
      cardPolicy: "fixture-open",
    }
  }

  private toHandHistoryText(hand: HandHistoryRecord): string {
    const winners = hand.winners.length
      ? hand.winners.map((winner) => `${winner.playerId} +${winner.amount}${winner.hand ? ` (${winner.hand})` : ""}`).join(", ")
      : "none"

    const actions = hand.actions.map((action) => {
      const amount = action.amount !== undefined ? ` ${action.amount}` : ""
      return `${action.seq}. [${action.street}] ${action.playerId} ${action.action}${amount}`
    }).join("\n")

    const board = hand.board.join(" ")

    return [
      `Table ${hand.tableId} | Hand ${hand.handNumber} | ${new Date(hand.timestamp).toISOString()}`,
      `Board: ${board}`,
      `Pot: ${hand.pot}`,
      `Winners: ${winners}`,
      `Actions:\n${actions}`,
    ].join("\n")
  }

  private botDisplayName(botId: string): string {
    return this.bots.get(botId)?.name || botId
  }

  private defaultBlindSchedule() {
    return [
      { level: 1, smallBlind: 10, bigBlind: 20 },
      { level: 2, smallBlind: 15, bigBlind: 30 },
      { level: 3, smallBlind: 20, bigBlind: 40 },
      { level: 4, smallBlind: 30, bigBlind: 60 },
      { level: 5, smallBlind: 40, bigBlind: 80 },
      { level: 6, smallBlind: 50, bigBlind: 100 },
      { level: 7, smallBlind: 75, bigBlind: 150 },
      { level: 8, smallBlind: 100, bigBlind: 200 },
      { level: 9, smallBlind: 150, bigBlind: 300 },
      { level: 10, smallBlind: 200, bigBlind: 400 },
    ]
  }

  private tableTournamentId(table: PokerTable): string | null {
    const match = table.name.match(/^sng\s+(\d+)/i)
    if (!match) {
      return null
    }
    return `sng-${match[1]}`
  }

  private listTournamentSummaries(): Array<{
    id: string
    tableId: string
    type: "sng"
    buyIn: number
    blindStructure: string
    registered: number
    maxPlayers: number
    status: "registration" | "starting" | "running"
  }> {
    const tables = this.tableManager.tables as PokerTable[]
    const rows: Array<{
      id: string
      tableId: string
      type: "sng"
      buyIn: number
      blindStructure: string
      registered: number
      maxPlayers: number
      status: "registration" | "starting" | "running"
    }> = []

    for (const table of tables) {
      const tournamentId = this.tableTournamentId(table)
      if (!tournamentId) {
        continue
      }

      const buyIn = asNumber(tournamentId.replace("sng-", ""), table.startingStack)
      const runtime = this.runtimes.get(table.id)
      const registered = table.players.length
      const status: "registration" | "starting" | "running" = runtime?.handActive
        ? "running"
        : (registered >= 2 ? "starting" : "registration")

      rows.push({
        id: tournamentId,
        tableId: table.id,
        type: "sng",
        buyIn,
        blindStructure: "standard",
        registered,
        maxPlayers: table.maxPlayers,
        status,
      })
    }

    return rows.sort((left, right) => left.buyIn - right.buyIn)
  }

  private lookupTournament(tournamentId: string): { id: string; tableId: string } | null {
    const found = this.listTournamentSummaries().find((entry) => entry.id === tournamentId)
    if (!found) {
      return null
    }
    return {
      id: found.id,
      tableId: found.tableId,
    }
  }

  private async computeLeaderboard(options: {
    limit?: number
    sortByRaw?: string
    sinceTs?: number | null
    untilTs?: number | null
  } = {}): Promise<Array<{
    rank: number
    botId: string
    name: string
    rating: number
    wins: number
    splitWins: number
    losses: number
    totalHands: number
    volume: number
    itmHands: number
    itmPct: number
    winRate: number
    balance: number
    totalInvested: number
    totalPayout: number
    netProfit: number
    roi: number
    totalEarnings: number
    metricComponents: {
      totalInvested: number
      totalPayout: number
      netProfit: number
      roi: number
      wins: number
      splitWins: number
      losses: number
      totalHands: number
      volume: number
      itmHands: number
      itmPct: number
      winRate: number
    }
  }>> {
    const limit = Math.min(500, Math.max(1, Math.floor(Number(options.limit ?? 100))))
    const sortBy = String(options.sortByRaw || "net_profit").trim().toLowerCase()
    const resetState = await this.loadLeaderboardResetState()
    const effectiveSinceTs = Number(resetState.resetAt || 0) > 0
      ? (
        options.sinceTs !== null && options.sinceTs !== undefined
          ? Math.max(Number(options.sinceTs), Number(resetState.resetAt))
          : Number(resetState.resetAt)
      )
      : (options.sinceTs ?? null)

    const stats = new Map<string, {
      botId: string
      name: string
      wins: number
      splitWins: number
      losses: number
      totalHands: number
      itmHands: number
      totalInvested: number
      totalPayout: number
      totalNet: number
    }>()

    const ensure = (botId: string) => {
      const existing = stats.get(botId)
      if (existing) {
        return existing
      }

      const entry = {
        botId,
        name: this.botDisplayName(botId),
        wins: 0,
        splitWins: 0,
        losses: 0,
        totalHands: 0,
        itmHands: 0,
        totalInvested: 0,
        totalPayout: 0,
        totalNet: 0,
      }
      stats.set(botId, entry)
      return entry
    }

    for (const botId of new Set([...this.bots.keys(), ...this.wallets.keys()])) {
      ensure(botId)
    }

    const hands = await this.loadIndexedHandHistory({
      sort: "asc",
      includeInvalidated: false,
      sinceTs: effectiveSinceTs,
      untilTs: options.untilTs ?? null,
    })

    for (const hand of hands) {
      const participants = new Set(
        hand.players
          .map((player) => String(player.id || ""))
          .filter((botId) => botId.length > 0),
      )

      const contributions = new Map<string, number>()
      for (const action of hand.actions) {
        const botId = String(action.playerId || "")
        if (!botId) {
          continue
        }
        const amount = Number(action.amount || 0)
        if (!Number.isFinite(amount) || amount <= 0) {
          continue
        }
        contributions.set(botId, Number((contributions.get(botId) || 0) + amount))
      }

      const payouts = new Map<string, number>()
      for (const winner of hand.winners) {
        const botId = String(winner.playerId || "")
        if (!botId) {
          continue
        }
        const amount = Number(winner.amount || 0)
        if (!Number.isFinite(amount) || amount <= 0) {
          continue
        }
        payouts.set(botId, Number((payouts.get(botId) || 0) + amount))
      }

      for (const botId of participants) {
        const entry = ensure(botId)
        if (entry) {
          entry.totalHands += 1
          const invested = Number(contributions.get(botId) || 0)
          const payout = Number(payouts.get(botId) || 0)
          entry.totalInvested += invested
          entry.totalPayout += payout
          entry.totalNet += (payout - invested)
          if (payout > 0) {
            entry.itmHands += 1
          }
        }
      }

      const winners = [...payouts.entries()]
        .map(([botId, amount]) => ({
          botId: String(botId || ""),
          amount: Number(amount || 0),
        }))
        .filter((winner) => winner.botId.length > 0)

      if (winners.length <= 0) {
        continue
      }

      const bestAmount = Math.max(...winners.map((winner) => winner.amount))
      const topWinners = winners.filter((winner) => winner.amount === bestAmount)
      const topSet = new Set(topWinners.map((winner) => winner.botId))

      for (const winner of winners) {
        const entry = ensure(winner.botId)
        if (!entry) {
          continue
        }
        if (topSet.has(winner.botId)) {
          if (topSet.size === 1) {
            entry.wins += 1
          } else {
            entry.splitWins += 1
          }
        }
      }

      for (const participant of participants) {
        if (topSet.has(participant)) {
          continue
        }
        const entry = ensure(participant)
        if (entry) {
          entry.losses += 1
        }
      }
    }

    const entries = [...stats.values()]
      .map((entry) => {
        const netProfit = Number(entry.totalNet.toFixed(2))
        const totalInvested = Number(entry.totalInvested.toFixed(2))
        const totalPayout = Number(entry.totalPayout.toFixed(2))
        const balance = Number((this.initialBalance + netProfit).toFixed(2))
        const itmPct = Number(((entry.itmHands / Math.max(entry.totalHands, 1)) * 100).toFixed(2))
        const decisions = Math.max(1, entry.wins + entry.losses + entry.splitWins)
        const rating = Math.round(1000 + (entry.wins * 14) + (entry.splitWins * 6) - (entry.losses * 4))
        const winRate = Number((((entry.wins + (entry.splitWins * 0.5)) / decisions) * 100).toFixed(2))
        const roi = Number(((netProfit / Math.max(totalInvested, 1)) * 100).toFixed(2))

        return {
          botId: entry.botId,
          name: entry.name,
          rating,
          wins: entry.wins,
          splitWins: entry.splitWins,
          losses: entry.losses,
          totalHands: entry.totalHands,
          volume: entry.totalHands,
          itmHands: entry.itmHands,
          itmPct,
          winRate,
          balance,
          totalInvested,
          totalPayout,
          netProfit,
          roi,
          totalEarnings: totalPayout,
          metricComponents: {
            totalInvested,
            totalPayout,
            netProfit,
            roi,
            wins: entry.wins,
            splitWins: entry.splitWins,
            losses: entry.losses,
            totalHands: entry.totalHands,
            volume: entry.totalHands,
            itmHands: entry.itmHands,
            itmPct,
            winRate,
          },
        }
      })
      .sort((left, right) => {
        const metric = (entry: typeof left) => {
          if (sortBy === "roi") return entry.roi
          if (sortBy === "itm" || sortBy === "itm_pct") return entry.itmPct
          if (sortBy === "total_earnings" || sortBy === "payout") return entry.totalEarnings
          if (sortBy === "win_rate") return entry.winRate
          if (sortBy === "wins") return entry.wins
          if (sortBy === "volume" || sortBy === "hands") return entry.totalHands
          if (sortBy === "rating") return entry.rating
          return entry.netProfit
        }

        const metricDelta = metric(right) - metric(left)
        if (metricDelta !== 0) {
          return metricDelta
        }

        return right.rating - left.rating
          || right.wins - left.wins
          || right.totalHands - left.totalHands
          || right.balance - left.balance
          || left.botId.localeCompare(right.botId)
      })
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }))

    return entries
  }

  private async computeAgentProfile(botId: string): Promise<{
    botId: string
    name: string
    status: "active" | "offline"
    rating: number
    wins: number
    splitWins: number
    losses: number
    totalHands: number
    winRate: number
    balance: number
    roi: number
    totalEarnings: number
    recentHands: Array<{
      tableId: string
      handNumber: number
      timestamp: number
      won: boolean
      amount: number
      board: string[]
    }>
  } | null> {
    const leaderboard = await this.computeLeaderboard({ limit: 500 })
    const row = leaderboard.find((entry) => entry.botId === botId)
    if (!row) {
      const bot = this.bots.get(botId)
      if (!bot) {
        return null
      }
    }

    const hands = await this.queryHandHistory({ playerId: botId, limit: 50 })
    const recentHands = hands.map((hand) => {
      const winning = hand.winners.find((winner) => String(winner.playerId || "") === botId)
      return {
        tableId: hand.tableId,
        handNumber: hand.handNumber,
        timestamp: hand.timestamp,
        won: Boolean(winning),
        amount: Number(winning?.amount || 0),
        board: [...hand.board],
      }
    })

    const active = Boolean(this.socketsByBot.get(botId))
    const base = row || {
      rank: 0,
      botId,
      name: this.botDisplayName(botId),
      rating: 1000,
      wins: 0,
      splitWins: 0,
      losses: 0,
      totalHands: 0,
      winRate: 0,
      balance: this.wallets.get(botId)?.balance ?? this.initialBalance,
      roi: 0,
      totalEarnings: 0,
    }

    return {
      botId: base.botId,
      name: base.name,
      status: active ? "active" : "offline",
      rating: base.rating,
      wins: base.wins,
      splitWins: base.splitWins,
      losses: base.losses,
      totalHands: base.totalHands,
      winRate: base.winRate,
      balance: base.balance,
      roi: base.roi,
      totalEarnings: base.totalEarnings,
      recentHands,
    }
  }

  private setupWebsocketHandlers() {
    this.ws.on("connection", (socket: any) => {
      this.sessions.set(socket, {
        connectedAt: nowTs(),
        lastSeenAt: nowTs(),
        authenticated: false,
      })
      this.socketSeq.set(socket, 0)

      socket.on("close", () => {
        this.handleSocketClose(socket)
      })
    })

    this.ws.on("message", (raw: unknown, socket: any) => {
      void this.handleSocketMessage(socket, raw)
    })
  }

  private setupSpectatorWebsocketHandlers() {
    if (!this.spectatorWs) {
      return
    }

    this.spectatorWs.on("connection", (socket: any) => {
      this.spectatorSessions.set(socket, {
        connectedAt: nowTs(),
        lastSeenAt: nowTs(),
      })
      this.spectatorSocketSeq.set(socket, 0)

      this.sendSpectator(socket, "spectator_ready", {
        serverId: this.serverId,
        cardPolicy: SPECTATOR_CARD_POLICY,
      })
      this.sendSpectatorTables(socket)

      socket.on("close", () => {
        this.handleSpectatorSocketClose(socket)
      })
    })

    this.spectatorWs.on("message", (raw: unknown, socket: any) => {
      void this.handleSpectatorSocketMessage(socket, raw)
    })
  }

  private handleSpectatorSocketClose(socket: any) {
    this.spectatorSessions.delete(socket)
    this.spectatorSocketSeq.delete(socket)
  }

  private async handleSpectatorSocketMessage(socket: any, raw: unknown): Promise<void> {
    const incoming = this.parseSocketMessage(raw)
    if (!incoming) {
      this.sendSpectatorError(socket, "bad_message", "Expected JSON object { type, payload }")
      return
    }

    const session = this.spectatorSessions.get(socket)
    if (session) {
      session.lastSeenAt = nowTs()
      this.spectatorSessions.set(socket, session)
    }

    if (incoming.type === "pong") {
      return
    }

    if (incoming.type === "list_tables") {
      this.sendSpectatorTables(socket)
      return
    }

    if (incoming.type === "spectate") {
      const tableId = String(incoming.payload.tableId || "").trim()
      const table = this.tableManager.table(tableId) as PokerTable | undefined
      if (!table) {
        this.sendSpectatorError(socket, "table_missing", `Table not found: ${tableId}`)
        return
      }

      const nextSession = session || {
        connectedAt: nowTs(),
        lastSeenAt: nowTs(),
      }
      nextSession.tableId = table.id
      this.spectatorSessions.set(socket, nextSession)

      this.sendSpectator(socket, "spectator_joined", {
        tableId: table.id,
        table: this.serializeTable(table),
        cardPolicy: SPECTATOR_CARD_POLICY,
      })
      this.sendSpectatorState(table.id, socket, "spectate_join")
      return
    }

    if (incoming.type === "unspectate" || incoming.type === "leave_table") {
      const nextSession = session || {
        connectedAt: nowTs(),
        lastSeenAt: nowTs(),
      }
      const previousTableId = nextSession.tableId
      nextSession.tableId = undefined
      this.spectatorSessions.set(socket, nextSession)
      this.sendSpectator(socket, "spectator_left", {
        ...(previousTableId ? { tableId: previousTableId } : {}),
      })
      return
    }

    this.sendSpectatorError(socket, "unsupported_type", `Unsupported spectator message type: ${incoming.type}`)
  }

  private parseSocketMessage(raw: unknown): { type: string; payload: Record<string, unknown> } | null {
    let parsed: unknown

    try {
      parsed = JSON.parse(messageText(raw))
    } catch {
      return null
    }

    if (!isRecord(parsed)) {
      return null
    }

    const type = String(parsed.type || "").trim()
    if (!type) {
      return null
    }

    const payload = isRecord(parsed.payload)
      ? parsed.payload
      : Object.fromEntries(Object.entries(parsed).filter(([key]) => key !== "type"))

    return { type, payload }
  }

  private async handleSocketMessage(socket: any, raw: unknown): Promise<void> {
    const incoming = this.parseSocketMessage(raw)
    if (!incoming) {
      this.sendError(socket, "bad_message", "Expected JSON object { type, payload }")
      return
    }

    const session = this.sessions.get(socket)
    if (session) {
      session.lastSeenAt = nowTs()
      this.sessions.set(socket, session)
    }

    if (incoming.type === "pong") {
      return
    }

    if (incoming.type === "auth") {
      await this.handleAuthMessage(socket, incoming.payload)
      return
    }

    const active = this.sessions.get(socket)
    if (!active || !active.authenticated || !active.botId) {
      this.sendError(socket, "unauthorized", "Authenticate first with { type: 'auth', payload: { token } }")
      return
    }

    if (incoming.type === "wallet") {
      const wallet = this.ensureWallet(active.botId)
      this.send(socket, "wallet_state", this.walletSnapshot(wallet))
      return
    }

    if (incoming.type === "reup") {
      const amount = Math.max(1, Math.floor(asNumber(incoming.payload.amount, this.reupAmount)))
      try {
        const entry = await this.applyWalletEntry(active.botId, "reup_credit", amount, { source: "ws" })
        const wallet = this.ensureWallet(active.botId)
        this.send(socket, "reup_ok", { entryId: entry.id, ...this.walletSnapshot(wallet) })
      } catch (error: any) {
        this.send(socket, "reup_rejected", { message: String(error?.message || error) })
      }
      return
    }

    if (incoming.type === "list_tables") {
      this.sendTables(socket)
      return
    }

    if (incoming.type === "list_tournaments") {
      this.send(socket, "tournaments", {
        tournaments: this.listTournamentSummaries(),
        serverId: this.serverId,
      })
      return
    }

    if (incoming.type === "register_tournament") {
      const tournamentId = String(incoming.payload.tournamentId || "").trim()
      const tournament = this.lookupTournament(tournamentId)
      if (!tournament) {
        this.sendError(socket, "tournament_missing", `Unknown tournament: ${tournamentId}`)
        return
      }

      await this.handleJoinTable(socket, { tableId: tournament.tableId }, active)

      const table = this.tableManager.table(tournament.tableId) as PokerTable | undefined
      const seat = table?.players.find((entry) => entry.playerId === active.botId)?.seat

      this.send(socket, "tournament_start", {
        tournamentId,
        tableId: tournament.tableId,
        seat,
        players: (table?.players || []).map((player) => ({
          botId: player.playerId,
          name: player.name,
          seat: player.seat,
          stack: player.stack,
        })),
        blindSchedule: this.defaultBlindSchedule(),
        status: table?.status || "registration",
      })
      return
    }

    if (incoming.type === "create_table") {
      const blindsInput = incoming.payload.blinds
      let smallBlind = 1
      let bigBlind = 2

      if (Array.isArray(blindsInput) && blindsInput.length >= 2) {
        smallBlind = asNumber(blindsInput[0], 1)
        bigBlind = asNumber(blindsInput[1], 2)
      } else if (isRecord(blindsInput)) {
        smallBlind = asNumber(blindsInput.smallBlind, 1)
        bigBlind = asNumber(blindsInput.bigBlind, 2)
      } else if (typeof blindsInput === "string" && blindsInput.includes("/")) {
        const [small, big] = blindsInput.split("/")
        smallBlind = asNumber(small, 1)
        bigBlind = asNumber(big, 2)
      }

      const table = this.tableManager.createTable({
        name: incoming.payload.name ? String(incoming.payload.name) : undefined,
        blinds: [smallBlind, bigBlind],
        startingStack: asNumber(incoming.payload.startingStack, 100),
        maxPlayers: Math.max(2, Math.min(9, Math.floor(asNumber(incoming.payload.maxPlayers, 9)))),
        actionTimeout: Math.max(1, Math.floor(asNumber(incoming.payload.actionTimeout, this.defaultActionTimeout))),
      }) as PokerTable

      this.send(socket, "table_created", this.serializeTable(table))
      this.broadcastTables()
      return
    }

    if (incoming.type === "join_table") {
      await this.handleJoinTable(socket, incoming.payload, active)
      return
    }

    if (incoming.type === "leave_table") {
      await this.handleLeaveTable(socket, active)
      return
    }

    if (incoming.type === "action") {
      if (!active.tableId) {
        this.sendError(socket, "not_at_table", "Join a table before sending actions")
        return
      }

      const action = String(incoming.payload.action || "").trim().toLowerCase()
      const amount = Number.isFinite(Number(incoming.payload.amount))
        ? Number(incoming.payload.amount)
        : undefined

      const ok = await this.applyAction(active.tableId, active.botId, action, amount)
      if (!ok) {
        this.sendError(socket, "invalid_action", "Action rejected")
      }
      return
    }

    if (incoming.type === "chat") {
      if (!active.tableId) {
        this.sendError(socket, "not_at_table", "Join a table before chatting")
        return
      }

      const table = this.tableManager.table(active.tableId) as PokerTable | undefined
      if (!table) {
        this.sendError(socket, "table_missing", "Current table no longer exists")
        return
      }

      const player = table.players.find((entry) => entry.playerId === active.botId)
      if (!player) {
        this.sendError(socket, "not_seated", "You are not seated at this table")
        return
      }

      const message = String(incoming.payload.message || "").trim()
      if (!message) {
        this.sendError(socket, "empty_chat", "message is required")
        return
      }

      this.broadcastToTable(table.id, "chat", {
        from: player.name,
        message,
      })
      this.broadcastToSpectators(table.id, "chat", {
        tableId: table.id,
        from: player.name,
        message,
      })
      return
    }

    this.sendError(socket, "unsupported_type", `Unsupported message type: ${incoming.type}`)
  }

  private async handleAuthMessage(socket: any, payload: Record<string, unknown>): Promise<void> {
    const token = String(payload.token || "").trim()
    const botId = this.accessTokens.get(token)

    if (!botId) {
      this.sendError(socket, "auth_failed", "Invalid bearer token")
      return
    }

    const bot = this.bots.get(botId)
    if (!bot) {
      this.sendError(socket, "auth_failed", "Bot record missing for token")
      return
    }

    const table = this.tableManager.tableForPlayer(botId) as PokerTable | undefined

    this.sessions.set(socket, {
      connectedAt: nowTs(),
      lastSeenAt: nowTs(),
      authenticated: true,
      botId,
      tableId: table?.id,
    })
    this.socketsByBot.set(botId, socket)

    if (table) {
      this.tableManager.setPlayerConnected(table.id, botId, true)
      const runtime = this.ensureRuntime(table)
      this.clearReconnectExpiry(runtime, botId)
      this.ensureTimeBank(runtime, botId)
    }

    this.send(socket, "auth_ok", {
      botId,
      playerId: botId,
      serverId: this.serverId,
    })

    const wallet = this.ensureWallet(botId)
    this.send(socket, "wallet_state", this.walletSnapshot(wallet))
    this.sendTables(socket)

    if (table) {
      this.send(socket, "table_joined", {
        tableId: table.id,
        seat: table.players.find((entry) => entry.playerId === botId)?.seat,
        players: table.players.map((player) => ({
          botId: player.playerId,
          name: player.name,
          seat: player.seat,
          stack: player.stack,
          connected: player.connected,
        })),
      })

      await this.sendPlayerSnapshot(table.id, botId)

      const runtime = this.runtimes.get(table.id)
      if (runtime) {
        this.sendTimeBankState(table.id, runtime, botId, "reconnected")
      }
    }
  }

  private async handleJoinTable(socket: any, payload: Record<string, unknown>, session: ClientSession): Promise<void> {
    if (!session.botId) {
      this.sendError(socket, "unauthorized", "Authenticate before joining a table")
      return
    }

    if (session.tableId && String(payload.tableId || "") !== "" && session.tableId !== String(payload.tableId)) {
      await this.handleLeaveTable(socket, session)
    }

    const requestedTableId = String(payload.tableId || "").trim()
    let target = requestedTableId
      ? (this.tableManager.table(requestedTableId) as PokerTable | undefined)
      : (this.tableManager.chooseJoinableTable() as PokerTable | undefined)

    if (!target) {
      this.sendError(socket, "no_table", "No joinable table is available")
      return
    }

    const existingInTarget = target.players.some((player) => player.playerId === session.botId)
    if (!existingInTarget) {
      const wallet = this.ensureWallet(session.botId)
      if (wallet.balance < target.startingStack) {
        this.sendError(socket, "insufficient_balance", `Need ${target.startingStack} to buy in`)
        return
      }
    }

    let joined: { table: PokerTable; player: any; wasAlreadySeated: boolean }
    try {
      joined = this.tableManager.joinTable({
        tableId: target.id,
        playerId: session.botId,
        name: this.bots.get(session.botId)?.name || session.botId,
        seatPreference: Number.isFinite(Number(payload.seatPreference))
          ? Number(payload.seatPreference)
          : undefined,
        stack: target.startingStack,
      })
    } catch (error: any) {
      this.sendError(socket, "join_failed", String(error?.message || error))
      return
    }

    if (!joined.wasAlreadySeated) {
      await this.applyWalletEntry(session.botId, "cash_buy_in", -joined.player.stack, {
        tableId: target.id,
      })
    }

    target = joined.table
    const runtime = this.ensureRuntime(target)
    this.clearReconnectExpiry(runtime, session.botId)
    this.ensureTimeBank(runtime, session.botId)

    session.tableId = target.id
    this.sessions.set(socket, session)

    this.send(socket, "table_joined", {
      tableId: target.id,
      seat: joined.player.seat,
      players: target.players.map((player: any) => ({
        botId: player.playerId,
        name: player.name,
        seat: player.seat,
        stack: player.stack,
        connected: player.connected,
      })),
    })

    this.send(socket, "state", {
      stage: "waiting",
      board: [],
      pot: 0,
      toCall: 0,
      stack: joined.player.stack,
      position: tablePositionName(joined.player.seat, target),
      playersInHand: target.players.length,
      availableActions: ["check", "bet", "raise", "call", "fold", "all-in"],
    })

    this.sendTimeBankState(target.id, runtime, session.botId, "table_joined")

    this.broadcastTables()
    this.broadcastSpectatorState(target.id, "table_joined")
    await this.startHandIfReady(target.id, "join")
  }

  private async handleLeaveTable(socket: any, session: ClientSession): Promise<void> {
    if (!session.botId || !session.tableId) {
      this.sendError(socket, "not_at_table", "You are not seated at a table")
      return
    }

    const tableId = session.tableId
    const runtime = this.runtimes.get(tableId)

    if (runtime?.handActive) {
      runtime.pendingKick.add(session.botId)
      this.tableManager.setPlayerConnected(tableId, session.botId, false)
      session.tableId = undefined
      this.sessions.set(socket, session)
      this.broadcastSpectatorState(tableId, "pending_leave")
      this.send(socket, "table_left", {
        tableId: runtime.tableId,
        pending: true,
        message: "Will cash out after current hand completes",
      })
      return
    }

    await this.forceLeaveBotFromTable(session.botId, tableId, "leave")
    session.tableId = undefined
    this.sessions.set(socket, session)

    this.send(socket, "table_left", { tableId: runtime?.tableId || tableId })
    this.broadcastTables()
    this.broadcastSpectatorState(tableId, "table_left")
  }

  private handleSocketClose(socket: any) {
    const session = this.sessions.get(socket)
    this.sessions.delete(socket)
    this.socketSeq.delete(socket)

    if (!session?.botId) {
      return
    }

    const active = this.socketsByBot.get(session.botId)
    if (active === socket) {
      this.socketsByBot.delete(session.botId)
    }

    if (!session.tableId) {
      return
    }

    const table = this.tableManager.table(session.tableId) as PokerTable | undefined
    if (!table) {
      return
    }

    this.tableManager.setPlayerConnected(table.id, session.botId, false)
    this.broadcastSpectatorState(table.id, "disconnect")

    const runtime = this.ensureRuntime(table)
    this.scheduleReconnectExpiry(runtime, session.botId)
  }

  private ensureRuntime(table: PokerTable): TableRuntime {
    const existing = this.runtimes.get(table.id)
    if (existing) {
      return existing
    }

    const engineContainer = this.container.subcontainer({ cwd: this.container.cwd }) as AGIContainer & any
    const gameEngine = engineContainer.feature("gameEngine", {
      enable: true,
      tableId: table.id,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      ante: 0,
      maxPlayers: table.maxPlayers,
      startingStack: table.startingStack,
      autoDeal: false,
    })

    const runtime: TableRuntime = {
      tableId: table.id,
      engineContainer,
      gameEngine,
      handNumber: 0,
      dealerSeat: 0,
      handActive: false,
      timeBanks: new Map(),
      reconnectTimers: new Map(),
      pendingKick: new Set(),
    }

    this.runtimes.set(table.id, runtime)
    return runtime
  }

  private clearReconnectExpiry(runtime: TableRuntime, botId: string) {
    const timer = runtime.reconnectTimers.get(botId)
    if (timer) {
      clearTimeout(timer)
      runtime.reconnectTimers.delete(botId)
    }
  }

  private scheduleReconnectExpiry(runtime: TableRuntime, botId: string) {
    this.clearReconnectExpiry(runtime, botId)

    const timer = setTimeout(() => {
      runtime.reconnectTimers.delete(botId)
      void this.handleReconnectTimeout(runtime.tableId, botId)
    }, this.reconnectGraceMs)

    runtime.reconnectTimers.set(botId, timer)
  }

  private async handleReconnectTimeout(tableId: string, botId: string) {
    const runtime = this.runtimes.get(tableId)
    if (!runtime) {
      return
    }

    const table = this.tableManager.table(tableId) as PokerTable | undefined
    if (!table) {
      return
    }

    const player = table.players.find((entry) => entry.playerId === botId)
    if (!player || player.connected) {
      return
    }

    if (runtime.handActive) {
      runtime.pendingKick.add(botId)
      const game = runtime.gameEngine.game as GameState
      if (game.currentActor === botId) {
        await this.applyAction(tableId, botId, "fold", undefined, {
          auto: true,
          reason: "reconnect-timeout",
        })
      }
      return
    }

    await this.forceLeaveBotFromTable(botId, tableId, "reconnect-timeout")
    this.broadcastTables()
  }

  private ensureTimeBank(runtime: TableRuntime, botId: string): number {
    const existing = runtime.timeBanks.get(botId)
    if (Number.isFinite(existing)) {
      return Math.max(0, Number(existing))
    }

    const initial = Math.min(this.timeBankStartSeconds, this.timeBankCapSeconds)
    runtime.timeBanks.set(botId, initial)
    return initial
  }

  private timeBankRemaining(runtime: TableRuntime, botId: string): number {
    return this.ensureTimeBank(runtime, botId)
  }

  private sendTimeBankState(
    tableId: string,
    runtime: TableRuntime,
    botId: string,
    reason: string,
    details: {
      delta?: number
      consumedSeconds?: number
      accruedSeconds?: number
    } = {},
  ) {
    const socket = this.socketsByBot.get(botId)
    if (!socket) {
      return
    }

    this.send(socket, "timebank_state", {
      tableId,
      botId,
      reason,
      remaining: this.timeBankRemaining(runtime, botId),
      timeBankRemaining: this.timeBankRemaining(runtime, botId),
      cap: this.timeBankCapSeconds,
      ...(details.delta !== undefined ? { delta: details.delta } : {}),
      ...(details.consumedSeconds !== undefined ? { consumedSeconds: details.consumedSeconds } : {}),
      ...(details.accruedSeconds !== undefined ? { accruedSeconds: details.accruedSeconds } : {}),
    })
  }

  private consumeTimeBank(tableId: string, runtime: TableRuntime, botId: string, seconds: number, reason: string): number {
    const remaining = this.timeBankRemaining(runtime, botId)
    const consumed = clamp(Math.ceil(seconds), 0, remaining)
    if (consumed <= 0) {
      return 0
    }

    runtime.timeBanks.set(botId, remaining - consumed)
    this.sendTimeBankState(tableId, runtime, botId, reason, {
      delta: -consumed,
      consumedSeconds: consumed,
    })
    return consumed
  }

  private accrueTimeBanks(tableId: string, runtime: TableRuntime, table: PokerTable) {
    if (this.timeBankAccrualSeconds <= 0 || this.timeBankCapSeconds <= 0) {
      return
    }

    for (const player of table.players) {
      if (player.stack <= 0) {
        continue
      }

      const previous = this.timeBankRemaining(runtime, player.playerId)
      const next = Math.min(this.timeBankCapSeconds, previous + this.timeBankAccrualSeconds)
      runtime.timeBanks.set(player.playerId, next)

      if (next !== previous) {
        this.sendTimeBankState(tableId, runtime, player.playerId, "hand_accrual", {
          delta: next - previous,
          accruedSeconds: next - previous,
        })
      }
    }
  }

  private legalActionsFor(game: GameState, botId: string): PlayerAction[] {
    const player = game.players.find((entry) => entry.id === botId)
    if (!player || player.folded || player.allIn || !player.inHand) {
      return []
    }

    const toCall = toCallForPlayer(game, botId)
    if (toCall > 0) {
      return ["fold", "call", "raise", "all-in"]
    }

    return ["check", "bet", "all-in"]
  }

  private normalizeAction(action: string): PlayerAction | null {
    const normalized = action.trim().toLowerCase()
    return (PLAYER_ACTIONS.includes(normalized as PlayerAction) ? normalized : null) as PlayerAction | null
  }

  private buildContributionAmount(
    action: PlayerAction,
    amount: number | undefined,
    game: GameState,
    table: PokerTable,
    botId: string,
  ): number | undefined {
    const player = game.players.find((entry) => entry.id === botId)
    if (!player) {
      return undefined
    }

    const toCall = toCallForPlayer(game, botId)

    if (action === "raise") {
      const lastRaise = game.lastRaiseSize ?? table.bigBlind
      const minContribution = toCall + lastRaise
      const target = Number.isFinite(Number(amount)) ? Number(amount) : Math.round(Math.max(minContribution, game.pot * 0.75))
      return clamp(Math.max(minContribution, target), minContribution, player.stack)
    }

    if (action === "bet") {
      const minBet = table.bigBlind
      const target = Number.isFinite(Number(amount)) ? Number(amount) : Math.round(Math.max(minBet, game.pot * 0.5))
      return clamp(Math.max(minBet, target), minBet, player.stack)
    }

    return amount
  }

  private shouldFinalize(game: GameState): boolean {
    const remaining = playersInHand(game)
    if (remaining.length <= 1) {
      return true
    }

    const actorsRemaining = remaining.filter((player) => !player.allIn)
    if (actorsRemaining.length === 0) {
      return true
    }

    return game.stage === "showdown" || game.stage === "complete"
  }

  private clearActionClock(
    runtime: TableRuntime,
    options: { tableId?: string; reason?: string; consumeTimeBank?: boolean } = {},
  ) {
    const clock = runtime.actionClock
    if (!clock) {
      return
    }

    if (clock.baseTimer) {
      clearTimeout(clock.baseTimer)
    }
    if (clock.warningTimer) {
      clearTimeout(clock.warningTimer)
    }
    if (clock.foldTimer) {
      clearTimeout(clock.foldTimer)
    }

    if (options.consumeTimeBank !== false && clock.phase === "timebank") {
      const startedAt = clock.timeBankStartedAt || clock.baseDeadlineAt
      const elapsedMs = Math.max(0, nowTs() - startedAt)
      const usedSeconds = Math.min(clock.timeBankBudgetSeconds, Math.ceil(elapsedMs / 1000))
      if (usedSeconds > 0) {
        this.consumeTimeBank(
          options.tableId || runtime.tableId,
          runtime,
          clock.actorId,
          usedSeconds,
          options.reason || "timebank_consumed",
        )
      }
    }

    runtime.actionClock = undefined
  }

  private async promptCurrentActor(tableId: string): Promise<void> {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    const runtime = this.runtimes.get(tableId)

    if (!table || !runtime || !runtime.handActive) {
      return
    }

    const game = runtime.gameEngine.game as GameState
    const actorId = game.currentActor

    if (!actorId) {
      if (this.shouldFinalize(game)) {
        const reason = playersInHand(game).some((player) => !player.allIn)
          ? "no-actor"
          : "all-in-runout"
        await this.finalizeHand(tableId, reason)
      }
      return
    }

    const actor = table.players.find((entry) => entry.playerId === actorId)
    if (!actor) {
      if (this.shouldFinalize(game)) {
        await this.finalizeHand(tableId, "missing-actor")
      }
      return
    }

    this.startActionClock(table, runtime, actorId)
    this.sendTimeBankState(table.id, runtime, actorId, "turn_start")

    const socket = this.socketsByBot.get(actorId)
    if (!socket) {
      return
    }

    this.sendActionPrompt(table, runtime, actorId, {
      timeRemaining: table.actionTimeout,
    })
  }

  private sendActionPrompt(
    table: PokerTable,
    runtime: TableRuntime,
    actorId: string,
    options: {
      timeRemaining: number
      warning?: boolean
      resumed?: boolean
      overtime?: boolean
    },
  ) {
    const socket = this.socketsByBot.get(actorId)
    if (!socket) {
      return
    }

    const game = runtime.gameEngine.game as GameState
    const gamePlayer = game.players.find((entry) => entry.id === actorId)
    this.send(socket, "action_on_you", {
      tableId: table.id,
      availableActions: this.legalActionsFor(game, actorId),
      toCall: toCallForPlayer(game, actorId),
      pot: game.pot,
      ...(gamePlayer ? { stack: gamePlayer.stack } : {}),
      timeRemaining: Math.max(1, Math.ceil(options.timeRemaining)),
      timeBankRemaining: this.timeBankRemaining(runtime, actorId),
      stage: game.stage,
      board: game.board,
      ...(options.warning ? { warning: true } : {}),
      ...(options.resumed ? { resumed: true } : {}),
      ...(options.overtime ? { overtime: true } : {}),
    })
  }

  private async beginTimeBank(table: PokerTable, runtime: TableRuntime, actorId: string) {
    const clock = runtime.actionClock
    const game = runtime.gameEngine.game as GameState
    if (!clock || !runtime.handActive || game.currentActor !== actorId || clock.actorId !== actorId) {
      return
    }

    const remaining = this.timeBankRemaining(runtime, actorId)
    if (remaining <= 0) {
      this.sendTimeBankState(table.id, runtime, actorId, "timebank_empty")
      void this.applyAction(table.id, actorId, "fold", undefined, {
        auto: true,
        reason: "timeout-bank-depleted",
      })
      return
    }

    clock.phase = "timebank"
    clock.timeBankBudgetSeconds = remaining
    clock.timeBankStartedAt = nowTs()
    clock.deadlineAt = clock.timeBankStartedAt + (remaining * 1000)

    if (clock.warningTimer) {
      clearTimeout(clock.warningTimer)
      clock.warningTimer = undefined
    }

    if (remaining > 10) {
      clock.warningTimer = setTimeout(() => {
        const current = runtime.gameEngine.game as GameState
        if (!runtime.handActive || current.currentActor !== actorId) {
          return
        }

        this.sendActionPrompt(table, runtime, actorId, {
          timeRemaining: 10,
          warning: true,
          overtime: true,
        })
      }, (remaining * 1000) - 10000)
    }

    clock.foldTimer = setTimeout(() => {
      const current = runtime.gameEngine.game as GameState
      if (!runtime.handActive || current.currentActor !== actorId) {
        return
      }

      void this.applyAction(table.id, actorId, "fold", undefined, {
        auto: true,
        reason: "timeout-bank-depleted",
      })
    }, remaining * 1000)

    this.sendTimeBankState(table.id, runtime, actorId, "timebank_started")
    this.sendActionPrompt(table, runtime, actorId, {
      timeRemaining: remaining,
      warning: true,
      overtime: true,
    })
  }

  private startActionClock(table: PokerTable, runtime: TableRuntime, actorId: string) {
    this.clearActionClock(runtime, {
      tableId: table.id,
      consumeTimeBank: false,
    })

    const startedAt = nowTs()
    const timeoutMs = Math.max(1000, table.actionTimeout * 1000)
    const deadlineAt = startedAt + timeoutMs

    const warningDelay = timeoutMs - 10000
    const warningTimer = warningDelay > 0
      ? setTimeout(() => {
        const current = runtime.gameEngine.game as GameState
        if (!runtime.handActive || current.currentActor !== actorId) {
          return
        }

        this.sendActionPrompt(table, runtime, actorId, {
          timeRemaining: 10,
          warning: true,
        })
      }, warningDelay)
      : undefined

    const baseTimer = setTimeout(() => {
      void this.beginTimeBank(table, runtime, actorId)
    }, timeoutMs)

    runtime.actionClock = {
      actorId,
      phase: "base",
      startedAt,
      baseDeadlineAt: deadlineAt,
      baseTimeoutMs: timeoutMs,
      timeBankBudgetSeconds: 0,
      deadlineAt,
      baseTimer,
      ...(warningTimer ? { warningTimer } : {}),
    }
  }

  private async applyAction(
    tableId: string,
    botId: string,
    actionInput: string,
    amountInput?: number,
    meta: ApplyActionMeta = {},
  ): Promise<boolean> {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    const runtime = this.runtimes.get(tableId)
    if (!table || !runtime || !runtime.handActive) {
      return false
    }

    const game = runtime.gameEngine.game as GameState
    if (game.currentActor !== botId) {
      return false
    }

    const player = table.players.find((entry) => entry.playerId === botId)
    if (!player) {
      return false
    }

    const normalized = this.normalizeAction(actionInput)
    if (!normalized) {
      return false
    }

    const legal = this.legalActionsFor(game, botId)
    let action: PlayerAction = normalized
    let amount = this.buildContributionAmount(normalized, amountInput, game, table, botId)

    if (!legal.includes(action)) {
      action = toCallForPlayer(game, botId) > 0 ? "fold" : "check"
      amount = undefined
    }

    const attempt = async (chosenAction: PlayerAction, chosenAmount?: number): Promise<boolean> => {
      try {
        if (chosenAction === "raise" || chosenAction === "bet") {
          runtime.gameEngine.recordAction(botId, chosenAction, chosenAmount)
        } else {
          runtime.gameEngine.recordAction(botId, chosenAction)
        }
        return true
      } catch {
        return false
      }
    }

    let applied = await attempt(action, amount)
    if (!applied) {
      const fallback = toCallForPlayer(game, botId) > 0 ? "fold" : "check"
      applied = await attempt(fallback)
      if (!applied) {
        return false
      }
      action = fallback
      amount = undefined
    }

    this.clearActionClock(runtime, {
      tableId,
      reason: meta.reason || "turn_complete",
    })

    const after = runtime.gameEngine.game as GameState
    const lastAction = after.actionHistory[after.actionHistory.length - 1]

    this.broadcastToTable(tableId, "action_taken", {
      seat: player.seat,
      playerName: player.name,
      action: lastAction?.action || action,
      ...(lastAction?.amount !== undefined ? { amount: lastAction.amount } : {}),
      auto: meta.auto === true,
      ...(meta.reason ? { reason: meta.reason } : {}),
      ...(meta.decisionReasoning ? { decisionReasoning: meta.decisionReasoning } : {}),
    })
    this.broadcastToSpectators(tableId, "action_taken", {
      tableId,
      seat: player.seat,
      playerName: player.name,
      action: lastAction?.action || action,
      ...(lastAction?.amount !== undefined ? { amount: lastAction.amount } : {}),
      auto: meta.auto === true,
      ...(meta.reason ? { reason: meta.reason } : {}),
      ...(meta.decisionReasoning ? { decisionReasoning: meta.decisionReasoning } : {}),
    })

    if (this.shouldFinalize(after)) {
      await this.finalizeHand(tableId, meta.reason || "hand-complete")
      return true
    }

    this.broadcastState(tableId)
    await this.promptCurrentActor(tableId)
    return true
  }

  private async startHandIfReady(tableId: string, reason: string): Promise<void> {
    if (this._stopping) {
      return
    }

    const table = this.tableManager.table(tableId) as PokerTable | undefined
    if (!table) {
      return
    }

    const runtime = this.ensureRuntime(table)
    if (runtime.handActive) {
      return
    }

    const eligible = table.players.filter((entry) => entry.stack > 0)
    if (eligible.length < 2) {
      this.tableManager.setTableStatus(table.id, table.players.length >= 2 ? "paused" : "waiting")
      this.broadcastSpectatorState(table.id, "waiting")
      return
    }

    for (const player of eligible) {
      this.ensureTimeBank(runtime, player.playerId)
    }

    runtime.handNumber += 1
    runtime.showdownReveal = undefined

    const base = createInitialGameState({
      seed: nowTs(),
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      ante: 0,
      tableId: table.id,
    })

    base.round = runtime.handNumber - 1
    base.dealer = runtime.dealerSeat
    base.players = eligible
      .sort((a, b) => a.seat - b.seat)
      .map((entry) => ({
        id: entry.playerId,
        seat: entry.seat,
        stack: entry.stack,
        holeCards: [],
        inHand: entry.stack > 0,
        folded: false,
        allIn: false,
        committed: 0,
        totalCommitted: 0,
        hasActed: false,
      }))

    runtime.gameEngine.setGameState(base)

    try {
      runtime.gameEngine.deal(nowTs())
    } catch (error) {
      runtime.handNumber -= 1
      console.error(`[poker-server] failed to deal table ${table.id} (${reason}):`, error)
      return
    }

    runtime.handActive = true
    runtime.dealerSeat = (runtime.gameEngine.game as GameState).dealer
    runtime.pendingKick.clear()
    this.tableManager.setTableStatus(table.id, "active")

    this.broadcastDeal(table.id)
    this.broadcastState(table.id)
    await this.promptCurrentActor(table.id)
  }

  private broadcastDeal(tableId: string) {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    const runtime = this.runtimes.get(tableId)

    if (!table || !runtime) {
      return
    }

    const game = runtime.gameEngine.game as GameState
    for (const player of table.players) {
      const socket = this.socketsByBot.get(player.playerId)
      if (!socket) {
        continue
      }

      const gamePlayer = game.players.find((entry) => entry.id === player.playerId)
      if (!gamePlayer || gamePlayer.holeCards.length !== 2) {
        continue
      }

      this.send(socket, "deal", {
        tableId,
        handId: game.handId,
        handNumber: runtime.handNumber,
        holeCards: gamePlayer.holeCards,
        position: tablePositionName(player.seat, table),
        dealer: game.dealer,
        blinds: {
          small: table.smallBlind,
          big: table.bigBlind,
        },
      })
    }
  }

  private broadcastState(tableId: string) {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    const runtime = this.runtimes.get(tableId)

    if (!table || !runtime) {
      return
    }

    const game = runtime.gameEngine.game as GameState
    const activeCount = playersInHand(game).length

    for (const player of table.players) {
      const socket = this.socketsByBot.get(player.playerId)
      if (!socket) {
        continue
      }

      const gamePlayer = game.players.find((entry) => entry.id === player.playerId)
      if (!gamePlayer) {
        continue
      }

      this.send(socket, "state", {
        tableId,
        handId: game.handId,
        stage: game.stage,
        board: game.board,
        pot: game.pot,
        toCall: toCallForPlayer(game, player.playerId),
        stack: gamePlayer.stack,
        position: tablePositionName(player.seat, table),
        playersInHand: activeCount,
        availableActions: this.legalActionsFor(game, player.playerId),
        players: table.players.map((p) => {
          const gp = game.players.find((entry) => entry.id === p.playerId)
          return {
            botId: p.playerId,
            name: p.name,
            seat: p.seat,
            stack: gp?.stack ?? p.stack,
            connected: p.connected,
          }
        }),
      })
    }

    this.broadcastSpectatorState(tableId, "state")
  }

  private async sendPlayerSnapshot(tableId: string, botId: string): Promise<void> {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    const runtime = this.runtimes.get(tableId)
    const socket = this.socketsByBot.get(botId)

    if (!table || !runtime || !socket) {
      return
    }

    const game = runtime.gameEngine.game as GameState
    const player = table.players.find((entry) => entry.playerId === botId)
    const gamePlayer = game.players.find((entry) => entry.id === botId)

    if (!player) {
      return
    }

    if (!gamePlayer) {
      this.send(socket, "state", {
        tableId,
        stage: "waiting",
        board: [],
        pot: 0,
        toCall: 0,
        stack: player.stack,
        position: tablePositionName(player.seat, table),
        playersInHand: table.players.filter((entry) => entry.stack > 0).length,
        availableActions: [],
      })
      this.sendTimeBankState(tableId, runtime, botId, "snapshot")
      return
    }

    if (runtime.handActive && gamePlayer.holeCards.length === 2) {
      this.send(socket, "deal", {
        tableId,
        handId: game.handId,
        handNumber: runtime.handNumber,
        holeCards: gamePlayer.holeCards,
        position: tablePositionName(player.seat, table),
        dealer: game.dealer,
        blinds: {
          small: table.smallBlind,
          big: table.bigBlind,
        },
      })
    }

    this.send(socket, "state", {
      tableId,
      handId: game.handId,
      stage: game.stage,
      board: game.board,
      pot: game.pot,
      toCall: toCallForPlayer(game, botId),
      stack: gamePlayer.stack,
      position: tablePositionName(player.seat, table),
      playersInHand: playersInHand(game).length,
      availableActions: this.legalActionsFor(game, botId),
    })
    this.sendTimeBankState(tableId, runtime, botId, "snapshot")

    if (runtime.actionClock?.actorId === botId && runtime.handActive) {
      const remainingMs = Math.max(0, runtime.actionClock.deadlineAt - nowTs())
      this.sendActionPrompt(table, runtime, botId, {
        timeRemaining: Math.max(1, Math.ceil(remainingMs / 1000)),
        ...(runtime.actionClock.phase === "timebank" ? { overtime: true } : {}),
        resumed: true,
      })
    }
  }

  private async finalizeHand(tableId: string, reason: string): Promise<void> {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    const runtime = this.runtimes.get(tableId)

    if (!table || !runtime || !runtime.handActive) {
      return
    }

    this.clearActionClock(runtime, {
      tableId,
      reason: "hand_complete",
    })

    const winners = await runtime.gameEngine.finalizeRound("wasm")
    runtime.handActive = false

    const game = runtime.gameEngine.game as GameState
    for (const gamePlayer of game.players) {
      this.tableManager.setPlayerStack(table.id, gamePlayer.id, gamePlayer.stack)
    }

    const handRecord: HandHistoryRecord = {
      tableId,
      ...(this.tableTournamentId(table) ? { tournamentId: this.tableTournamentId(table) || undefined } : {}),
      handNumber: runtime.handNumber,
      players: game.players.map((entry) => ({
        id: entry.id,
        seat: entry.seat,
        stack: entry.stack,
        cards: entry.holeCards,
      })),
      actions: game.actionHistory.map((entry) => ({
        seq: entry.seq,
        playerId: entry.playerId,
        action: entry.action,
        ...(entry.amount !== undefined ? { amount: entry.amount } : {}),
        street: entry.street,
      })),
      board: [...game.board],
      pot: winners.reduce((memo: number, winner: any) => memo + Number(winner.amount || 0), 0),
      winners: winners.map((winner: any) => ({
        playerId: winner.playerId,
        amount: winner.amount,
        ...(winner.hand ? { hand: winner.hand } : {}),
      })),
      timestamp: game.completedAt || nowTs(),
    }

    const handKey = `hand:${tableId}:${String(runtime.handNumber).padStart(6, "0")}`
    await this.diskCache.set(handKey, handRecord)

    const showdownContenders = game.players.filter((entry) => entry.inHand && !entry.folded && entry.holeCards.length === 2)
    const hasShowdown = showdownContenders.length >= 2
    const revealDelayMs = hasShowdown
      ? this.showdownRevealMs
      : this.nonShowdownRevealMs

    runtime.showdownReveal = {
      handNumber: runtime.handNumber,
      handId: game.handId || undefined,
      stage: hasShowdown ? "showdown" : "complete",
      board: [...handRecord.board],
      pot: handRecord.pot,
      currentActor: null,
      dealerSeat: game.dealer || runtime.dealerSeat,
      expiresAt: nowTs() + revealDelayMs,
      players: game.players.map((entry) => ({
        id: entry.id,
        inHand: entry.inHand,
        folded: entry.folded,
        allIn: entry.allIn,
        committed: Number(entry.committed || 0),
        totalCommitted: Number(entry.totalCommitted || 0),
      })),
    }

    const showdownPlayers = showdownContenders
      .map((player) => ({
        playerId: player.id,
        seat: player.seat,
        cards: player.holeCards as [string, string],
      }))
    const stackSnapshot = handRecord.players.map((player) => ({
      playerId: player.id,
      seat: player.seat,
      stack: player.stack,
    }))

    this.broadcastToTable(tableId, "hand_result", {
      tableId,
      handNumber: runtime.handNumber,
      winners: handRecord.winners,
      pot: handRecord.pot,
      board: handRecord.board,
      stacks: stackSnapshot,
      reason,
      ...(showdownPlayers.length >= 2 ? { showdown: showdownPlayers } : {}),
    })
    this.broadcastToSpectators(tableId, "hand_result", {
      tableId,
      handNumber: runtime.handNumber,
      winners: handRecord.winners,
      pot: handRecord.pot,
      board: handRecord.board,
      stacks: stackSnapshot,
      reason,
      ...(showdownPlayers.length >= 2 ? { showdown: showdownPlayers } : {}),
    })

    for (const botId of [...runtime.pendingKick]) {
      await this.forceLeaveBotFromTable(botId, tableId, "post-hand-kick")
      runtime.pendingKick.delete(botId)
    }

    const refreshed = this.tableManager.table(tableId) as PokerTable | undefined
    if (refreshed) {
      this.accrueTimeBanks(tableId, runtime, refreshed)
      const playable = refreshed.players.filter((entry) => entry.stack > 0)
      this.tableManager.setTableStatus(refreshed.id, playable.length >= 2 ? "active" : (refreshed.players.length >= 2 ? "paused" : "waiting"))
      this.broadcastSpectatorState(tableId, "hand_complete")
    }

    this.broadcastTables()

    if (this._stopping) {
      return
    }

    runtime.nextHandTimer = setTimeout(() => {
      runtime.nextHandTimer = undefined
      void this.startHandIfReady(tableId, "next-hand")
    }, revealDelayMs)
  }

  private async forceLeaveBotFromTable(botId: string, tableId: string, reason: string): Promise<void> {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    if (!table) {
      return
    }

    const leaving = table.players.find((entry) => entry.playerId === botId)
    if (!leaving) {
      return
    }

    const result = this.tableManager.leaveTable(tableId, botId)

    for (const [socket, session] of this.sessions.entries()) {
      if (session.botId === botId) {
        session.tableId = undefined
        this.sessions.set(socket, session)
        this.send(socket, "table_left", {
          tableId,
          reason,
        })
      }
    }

    const playerStack = result.player?.stack ?? 0
    if (playerStack > 0) {
      await this.applyWalletEntry(botId, "cash_cashout", playerStack, {
        tableId,
        reason,
      })
    }

    const socket = this.socketsByBot.get(botId)
    if (socket) {
      const wallet = this.ensureWallet(botId)
      this.send(socket, "wallet_state", this.walletSnapshot(wallet))
    }

    const runtime = this.runtimes.get(tableId)
    if (runtime) {
      this.clearReconnectExpiry(runtime, botId)
      runtime.pendingKick.delete(botId)
      runtime.timeBanks.delete(botId)
    }

    this.broadcastSpectatorState(tableId, "forced_leave")
  }

  private resolveBotIdFromHttpRequest(req: any): string | null {
    const headerToken = tokenFromHeader(req.headers?.authorization)
    const bodyToken = req.body?.token ? String(req.body.token) : null
    const queryToken = req.query?.token ? String(req.query.token) : null
    const token = headerToken || bodyToken || queryToken

    if (!token) {
      return null
    }

    return this.accessTokens.get(token) || null
  }

  private send(socket: any, type: string, payload: Record<string, unknown>) {
    const next = (this.socketSeq.get(socket) || 0) + 1
    this.socketSeq.set(socket, next)
    socket.send(JSON.stringify({ type, seq: next, payload }))
  }

  private sendError(socket: any, code: string, message: string) {
    this.send(socket, "error", { code, message })
  }

  private sendSpectator(socket: any, type: string, payload: Record<string, unknown>) {
    const next = (this.spectatorSocketSeq.get(socket) || 0) + 1
    this.spectatorSocketSeq.set(socket, next)
    socket.send(JSON.stringify({ type, seq: next, payload }))
  }

  private sendSpectatorError(socket: any, code: string, message: string) {
    this.sendSpectator(socket, "error", { code, message })
  }

  private sendTables(socket: any) {
    this.send(socket, "tables", {
      tables: this.tableManager.listTables(),
      sngPresets: this.sngPresets,
      tournaments: this.listTournamentSummaries(),
      serverId: this.serverId,
    })
  }

  private sendSpectatorTables(socket: any) {
    this.sendSpectator(socket, "tables", {
      tables: this.tableManager.listTables(),
      sngPresets: this.sngPresets,
      tournaments: this.listTournamentSummaries(),
      serverId: this.serverId,
      cardPolicy: SPECTATOR_CARD_POLICY,
    })
  }

  private spectatorSnapshot(tableId: string) {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    const runtime = this.runtimes.get(tableId)
    if (!table || !runtime) {
      return null
    }

    const game = runtime.gameEngine.game as GameState
    const now = nowTs()
    const reveal = runtime.showdownReveal
    const revealActive = Boolean(!runtime.handActive && reveal && now < reveal.expiresAt)
    if (reveal && !revealActive && now >= reveal.expiresAt) {
      runtime.showdownReveal = undefined
    }
    const isWaiting = !runtime.handActive || !game.handId

    // Spectator policy: no live hole-card leakage. Cards are only revealed post-hand in hand_result showdown payload.
    const revealByPlayerId = new Map((reveal?.players || []).map((entry) => [entry.id, entry]))
    const players = table.players
      .slice()
      .sort((left, right) => left.seat - right.seat)
      .map((player) => {
        const gamePlayer = game.players.find((entry) => entry.id === player.playerId)
        const revealPlayer = revealByPlayerId.get(player.playerId)
        return {
          botId: player.playerId,
          name: player.name,
          seat: player.seat,
          stack: player.stack,
          connected: player.connected,
          inHand: revealActive
            ? Boolean(revealPlayer?.inHand && !revealPlayer?.folded)
            : (gamePlayer ? (gamePlayer.inHand && !gamePlayer.folded) : false),
          folded: revealActive
            ? Boolean(revealPlayer?.folded)
            : (gamePlayer ? gamePlayer.folded : false),
          allIn: revealActive
            ? Boolean(revealPlayer?.allIn)
            : (gamePlayer ? gamePlayer.allIn : false),
          committed: revealActive
            ? Number(revealPlayer?.committed || 0)
            : (gamePlayer ? Number(gamePlayer.committed || 0) : 0),
          totalCommitted: revealActive
            ? Number(revealPlayer?.totalCommitted || 0)
            : (gamePlayer ? Number(gamePlayer.totalCommitted || 0) : 0),
        }
      })

    if (revealActive && reveal) {
      return {
        tableId,
        tableName: table.name,
        maxPlayers: table.maxPlayers,
        handNumber: reveal.handNumber,
        handId: reveal.handId,
        stage: reveal.stage,
        board: [...reveal.board],
        pot: reveal.pot,
        players,
        currentActor: reveal.currentActor,
        dealerSeat: reveal.dealerSeat || game.dealer || runtime.dealerSeat,
        cardPolicy: SPECTATOR_CARD_POLICY,
      }
    }

    return {
      tableId,
      tableName: table.name,
      maxPlayers: table.maxPlayers,
      handNumber: runtime.handNumber,
      handId: isWaiting ? undefined : game.handId,
      stage: isWaiting ? "waiting" : game.stage,
      board: isWaiting ? [] : game.board,
      pot: isWaiting ? 0 : game.pot,
      players,
      currentActor: isWaiting ? null : game.currentActor,
      dealerSeat: game.dealer || runtime.dealerSeat,
      cardPolicy: SPECTATOR_CARD_POLICY,
    }
  }

  private sendSpectatorState(tableId: string, socket: any, reason: string) {
    const snapshot = this.spectatorSnapshot(tableId)
    if (!snapshot) {
      return
    }

    this.sendSpectator(socket, "spectator_state", {
      reason,
      ...snapshot,
    })
  }

  private broadcastSpectatorState(tableId: string, reason: string) {
    for (const [socket, session] of this.spectatorSessions.entries()) {
      if (session.tableId === tableId) {
        this.sendSpectatorState(tableId, socket, reason)
      }
    }
  }

  private broadcastToSpectators(tableId: string, type: string, payload: Record<string, unknown>) {
    for (const [socket, session] of this.spectatorSessions.entries()) {
      if (session.tableId === tableId) {
        this.sendSpectator(socket, type, payload)
      }
    }
  }

  private broadcastTables() {
    for (const socket of this.sessions.keys()) {
      this.sendTables(socket)
    }
    for (const socket of this.spectatorSessions.keys()) {
      this.sendSpectatorTables(socket)
    }
  }

  private broadcastToTable(tableId: string, type: string, payload: Record<string, unknown>) {
    const table = this.tableManager.table(tableId) as PokerTable | undefined
    if (!table) {
      return
    }

    for (const player of table.players) {
      const socket = this.socketsByBot.get(player.playerId)
      if (socket) {
        this.send(socket, type, payload)
      }
    }
  }

  private serializeTable(table: PokerTable) {
    return {
      id: table.id,
      name: table.name,
      blinds: `${table.smallBlind}/${table.bigBlind}`,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      startingStack: table.startingStack,
      maxPlayers: table.maxPlayers,
      actionTimeout: table.actionTimeout,
      status: table.status,
      players: table.players.map((player) => ({
        botId: player.playerId,
        name: player.name,
        seat: player.seat,
        stack: player.stack,
        connected: player.connected,
      })),
    }
  }

  private ensureWallet(botId: string): WalletState {
    const existing = this.wallets.get(botId)
    if (existing) {
      return existing
    }

    const wallet: WalletState = {
      botId,
      balance: 0,
      currency: "PLAY",
      updatedAt: nowTs(),
      ledger: [],
    }
    this.wallets.set(botId, wallet)
    return wallet
  }

  private walletSnapshot(wallet: WalletState) {
    return {
      balance: wallet.balance,
      currency: wallet.currency,
      lastUpdatedAt: wallet.updatedAt,
      ledgerCount: wallet.ledger.length,
    }
  }

  private async registerBot(options: {
    name: string
    agentVersion?: string
    metadata?: Record<string, unknown>
  }): Promise<{ bot: BotIdentity; token: string; refreshToken: string }> {
    const botId = `bot_${this.container.utils.uuid().replace(/-/g, "").slice(0, 12)}`
    const bot: BotIdentity = {
      botId,
      name: options.name,
      serverId: this.serverId,
      ...(options.agentVersion ? { agentVersion: options.agentVersion } : {}),
      ...(options.metadata ? { metadata: options.metadata } : {}),
      createdAt: nowTs(),
    }

    this.bots.set(botId, bot)
    this.ensureWallet(botId)
    await this.applyWalletEntry(botId, "register_credit", this.initialBalance)

    const token = this.issueAccessToken(botId)
    const refreshToken = this.issueRefreshToken(botId)
    await this.persistIdentityState()

    return { bot, token, refreshToken }
  }

  private issueAccessToken(botId: string): string {
    const token = `tok_${this.container.utils.uuid().replace(/-/g, "")}`
    this.accessTokens.set(token, botId)
    return token
  }

  private issueRefreshToken(botId: string): string {
    const token = `rtok_${this.container.utils.uuid().replace(/-/g, "")}`
    this.refreshTokens.set(token, botId)
    return token
  }

  private async applyWalletEntry(
    botId: string,
    type: WalletLedgerType,
    amount: number,
    metadata?: Record<string, unknown>,
  ): Promise<WalletEntry> {
    if (!Number.isFinite(amount) || amount === 0) {
      throw new Error("Wallet mutation amount must be a non-zero number")
    }

    const wallet = this.ensureWallet(botId)
    const nextBalance = wallet.balance + amount
    if (nextBalance < 0) {
      throw new Error("Insufficient wallet balance")
    }

    const entry: WalletEntry = {
      id: this.container.utils.uuid(),
      botId,
      type,
      amount,
      balanceAfter: nextBalance,
      timestamp: nowTs(),
      ...(metadata ? { metadata } : {}),
    }

    wallet.balance = nextBalance
    wallet.updatedAt = entry.timestamp
    wallet.ledger.push(entry)
    this.wallets.set(botId, wallet)
    await this.persistIdentityState()

    return entry
  }

  private async loadIdentityState(): Promise<void> {
    if (!(await this.diskCache.has(this.identityCacheKey))) {
      return
    }

    const payload = await this.diskCache.get(this.identityCacheKey, true)
    if (!isRecord(payload)) {
      return
    }

    const bots = isRecord(payload.bots) ? payload.bots : {}
    const accessTokens = isRecord(payload.accessTokens) ? payload.accessTokens : {}
    const refreshTokens = isRecord(payload.refreshTokens) ? payload.refreshTokens : {}
    const wallets = isRecord(payload.wallets) ? payload.wallets : {}

    this.bots.clear()
    this.accessTokens.clear()
    this.refreshTokens.clear()
    this.wallets.clear()

    for (const [botId, value] of Object.entries(bots)) {
      if (isRecord(value)) {
        const bot: BotIdentity = {
          botId,
          name: String(value.name || botId),
          serverId: String(value.serverId || this.serverId),
          ...(value.agentVersion ? { agentVersion: String(value.agentVersion) } : {}),
          ...(isRecord(value.metadata) ? { metadata: value.metadata } : {}),
          createdAt: asNumber(value.createdAt, nowTs()),
        }
        this.bots.set(botId, bot)
      }
    }

    for (const [token, botId] of Object.entries(accessTokens)) {
      this.accessTokens.set(token, String(botId))
    }

    for (const [token, botId] of Object.entries(refreshTokens)) {
      this.refreshTokens.set(token, String(botId))
    }

    for (const [botId, value] of Object.entries(wallets)) {
      if (!isRecord(value)) {
        continue
      }

      const ledgerInput = Array.isArray(value.ledger) ? value.ledger : []
      const ledger: WalletEntry[] = ledgerInput
        .filter((entry) => isRecord(entry))
        .map((entry) => ({
          id: String(entry.id || this.container.utils.uuid()),
          botId: String(entry.botId || botId),
          type: String(entry.type || "admin_adjustment") as WalletLedgerType,
          amount: asNumber(entry.amount, 0),
          balanceAfter: asNumber(entry.balanceAfter, 0),
          timestamp: asNumber(entry.timestamp, nowTs()),
          ...(isRecord(entry.metadata) ? { metadata: entry.metadata } : {}),
        }))

      this.wallets.set(botId, {
        botId,
        balance: asNumber(value.balance, 0),
        currency: "PLAY",
        updatedAt: asNumber(value.updatedAt, nowTs()),
        ledger,
      })
    }
  }

  private async persistIdentityState(): Promise<void> {
    const payload: PersistedIdentityState = {
      bots: Object.fromEntries(this.bots.entries()),
      accessTokens: Object.fromEntries(this.accessTokens.entries()),
      refreshTokens: Object.fromEntries(this.refreshTokens.entries()),
      wallets: Object.fromEntries(this.wallets.entries()),
    }

    await this.diskCache.set(this.identityCacheKey, payload)
  }
}

export default PokerServerRuntime
