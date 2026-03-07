import type {
  AgentProfile,
  ApiHealthResponse,
  GoldenFixtureListResponse,
  GoldenFixtureReplay,
  LeaderboardResponse,
  LiveTournamentsResponse,
  TablesResponse,
} from "../types"

export class PokerApiClient {
  constructor(private readonly basePath = "/api/v1") {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.basePath}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      const details = body ? `: ${body}` : ""
      throw new Error(`HTTP ${response.status} ${response.statusText}${details}`)
    }

    return response.json() as Promise<T>
  }

  getHealth() {
    return this.request<ApiHealthResponse>("/health")
  }

  listTables() {
    return this.request<TablesResponse>("/tables")
  }

  getLeaderboard(limit = 100) {
    return this.request<LeaderboardResponse>(`/leaderboard?limit=${Math.max(1, Math.floor(limit))}`)
  }

  getLiveTournaments() {
    return this.request<LiveTournamentsResponse>("/tournaments/live")
  }

  getAgentProfile(botId: string) {
    return this.request<AgentProfile>(`/agents/${encodeURIComponent(botId)}`)
  }

  listGoldenFixtures() {
    return this.request<GoldenFixtureListResponse>("/fixtures/golden")
  }

  getGoldenFixtureReplay(fixtureId: string) {
    return this.request<GoldenFixtureReplay>(`/fixtures/golden/${encodeURIComponent(fixtureId)}/replay`)
  }

  async resolveSpectatorTarget(input: {
    wsUrl?: string | null
    tableId?: string | null
  }): Promise<{ wsUrl: string; tableId: string }> {
    const health = await this.getHealth()
    const wsUrl = String(input.wsUrl || health.spectatorWsUrl || "").trim()
    if (!wsUrl) {
      throw new Error("Server does not expose spectator websocket. Start with --spectatorPort.")
    }

    const explicitTableId = String(input.tableId || "").trim()
    if (explicitTableId) {
      return { wsUrl, tableId: explicitTableId }
    }

    try {
      const tablesPayload = await this.listTables()
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

    const tournamentsPayload = await this.getLiveTournaments()
    const firstTournamentTable = String(tournamentsPayload.tournaments?.[0]?.tableId || "").trim()
    if (firstTournamentTable) {
      return { wsUrl, tableId: firstTournamentTable }
    }

    throw new Error("No tableId available. Pass ?tableId=<id> in URL.")
  }
}
