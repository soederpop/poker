import { useCallback } from "react"

import type { HashRoute } from "../router"
import { Link } from "../router"
import { useApiResource } from "../hooks/usePokerApi"
import { Header } from "../components/layout/Header"
import { PageShell } from "../components/layout/PageShell"
import { StatusPill } from "../components/shared/StatusPill"

const NAV_LINKS = [
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/spectator", label: "Spectator" },
  { to: "/spectator-fixtures", label: "Fixtures" },
]

export function TournamentsPage({ route }: { route: HashRoute }) {
  const loadTournaments = useCallback((api: { getLiveTournaments: () => Promise<any> }) => {
    return api.getLiveTournaments()
  }, [])

  const tournaments = useApiResource(loadTournaments, [])

  const meta = tournaments.error
    ? `Failed to load tournaments: ${tournaments.error}`
    : tournaments.data
      ? `Server ${tournaments.data.serverId || ""} | Spectator WS ${tournaments.data.spectatorWsUrl || "disabled"}`
      : "Loading tournament lobby..."

  return (
    <PageShell theme="light">
      <Header
        brand="Live Tournaments"
        meta={meta}
        links={NAV_LINKS}
        activePath={route.path}
      />

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>Tournament</th>
              <th>Buy-In</th>
              <th>Registered</th>
              <th>Status</th>
              <th>Watch</th>
            </tr>
          </thead>
          <tbody>
            {(tournaments.data?.tournaments || []).map((tournament) => (
              <tr key={tournament.id} className="fade-up">
                <td>{tournament.id}</td>
                <td>{tournament.buyIn}</td>
                <td>{tournament.registered}/{tournament.maxPlayers}</td>
                <td><StatusPill status={tournament.status} /></td>
                <td>
                  <Link to={`/spectator?tableId=${encodeURIComponent(tournament.tableId)}`}>Spectate</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageShell>
  )
}
