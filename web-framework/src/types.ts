export type RoutePath =
  | "/"
  | "/leaderboard"
  | "/tournaments"
  | "/agent"
  | "/spectator"
  | "/spectator-debug"
  | "/spectator-fixtures"

export interface ApiHealthResponse {
  ok: boolean
  serverId: string
  httpUrl: string
  wsUrl: string
  spectatorWsUrl?: string
}

export interface TablePlayerSummary {
  botId: string
  name: string
  seat: number
  stack: number
  isHouseBot?: boolean
  connected?: boolean
  profile?: string
}

export interface TableSummary {
  id: string
  name: string
  blinds: string
  smallBlind: number
  bigBlind: number
  startingStack: number
  maxPlayers: number
  actionTimeout: number
  status: string
  handActive?: boolean
  players: TablePlayerSummary[]
}

export interface TablesResponse {
  serverId: string
  tables: TableSummary[]
}

export interface LeaderboardEntry {
  rank: number
  botId: string
  name: string
  rating: number
  wins: number
  splitWins: number
  losses: number
  totalHands: number
  winRate: number
  balance: number
  roi: number
  totalEarnings: number
}

export interface LeaderboardResponse {
  serverId: string
  generatedAt: string
  entries: LeaderboardEntry[]
}

export interface TournamentSummary {
  id: string
  tableId: string
  type: "sng"
  buyIn: number
  blindStructure: string
  registered: number
  maxPlayers: number
  status: "registration" | "starting" | "running"
  spectateUrl?: string
}

export interface LiveTournamentsResponse {
  serverId: string
  spectatorWsUrl: string | null
  tournaments: TournamentSummary[]
}

export interface AgentRecentHand {
  tableId: string
  handNumber: number
  timestamp: number
  won: boolean
  amount: number
  board: string[]
}

export interface AgentProfile {
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
  recentHands: AgentRecentHand[]
}

export interface GoldenFixtureSummary {
  id: string
  players: number
  events: number
  blinds: {
    small: number
    big: number
    ante: number
  }
}

export interface GoldenFixtureListResponse {
  total: number
  fixtures: GoldenFixtureSummary[]
}

export interface GoldenFixtureReplayFrame {
  index: number
  label: string
  eventType: string
  event?: Record<string, unknown>
  snapshot: SpectatorSnapshot
}

export interface GoldenFixtureReplay {
  fixtureId: string
  tableId: string
  tableName: string
  maxPlayers: number
  setup: {
    smallBlind: number
    bigBlind: number
    ante: number
    players: Array<{ id: string; seat: number; stack: number }>
    dealer?: number
  }
  expected: {
    pots: Array<{ amount: number; eligible: string[] }>
    winners: Array<{ playerId: string; amount: number }>
  }
  frames: GoldenFixtureReplayFrame[]
}

export interface SpectatorPlayerSnapshot {
  botId: string
  name: string
  seat: number
  stack: number
  connected?: boolean
  isHouseBot?: boolean
  inHand: boolean
  folded: boolean
  allIn: boolean
  committed: number
  totalCommitted: number
  holeCards?: string[]
}

export interface SpectatorSnapshot {
  reason?: string
  tableId: string
  tableName: string
  maxPlayers: number
  handNumber: number
  handId?: string
  stage: string
  board: string[]
  pot: number
  players: SpectatorPlayerSnapshot[]
  currentActor: string | null
  dealerSeat: number
  cardPolicy: string
}

export interface ActionTakenPayload {
  tableId?: string
  seat: number
  playerName: string
  action: string
  amount?: number
  auto?: boolean
  reason?: string
  decisionReasoning?: string
}

export interface HandResultWinner {
  playerId: string
  amount: number
  hand?: string
}

export interface HandResultShowdown {
  playerId: string
  seat: number
  cards: [string, string]
}

export interface HandResultPayload {
  tableId: string
  handNumber: number
  winners: HandResultWinner[]
  pot: number
  board: string[]
  stacks: Array<{ playerId: string; seat: number; stack: number }>
  reason?: string
  showdown?: HandResultShowdown[]
}

export interface SpectatorChatPayload {
  tableId?: string
  from: string
  message: string
}

export interface SocketErrorPayload {
  code?: string
  message: string
}

export interface SocketEnvelope<TPayload = Record<string, unknown>> {
  type: string
  seq: number
  payload: TPayload
}

export type SpectatorMessagePayload =
  | SpectatorSnapshot
  | ActionTakenPayload
  | HandResultPayload
  | SpectatorChatPayload
  | SocketErrorPayload
  | Record<string, unknown>

export interface SpectatorMessage extends SocketEnvelope<SpectatorMessagePayload> {}

export type FeedTone = "default" | "error"

export interface FeedItem {
  id: string
  timeLabel: string
  text: string
  tone?: FeedTone
  active?: boolean
  onClick?: () => void
}
