import { useCallback } from "react"

import type { HashRoute } from "../router"
import { Link } from "../router"
import { useApiResource } from "../hooks/usePokerApi"
import { formatDateTime } from "../lib/format"
import { Header } from "../components/layout/Header"
import { PageShell } from "../components/layout/PageShell"

const NAV_LINKS = [
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/spectator", label: "Spectator" },
  { to: "/spectator-fixtures", label: "Fixtures" },
]

export function LeaderboardPage({ route }: { route: HashRoute }) {
  const loadLeaderboard = useCallback((api: { getLeaderboard: (limit: number) => Promise<any> }) => {
    return api.getLeaderboard(100)
  }, [])

  const leaderboard = useApiResource(loadLeaderboard, [])

  const meta = leaderboard.error
    ? `Failed to load leaderboard: ${leaderboard.error}`
    : leaderboard.data
      ? `Server ${leaderboard.data.serverId || ""} | Updated ${formatDateTime(leaderboard.data.generatedAt || Date.now())}`
      : "Loading ranking feed..."

  return (
    <PageShell theme="light">
      <Header
        brand="Leaderboard"
        meta={meta}
        links={NAV_LINKS}
        activePath={route.path}
      />

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th>Rating</th>
              <th>Wins</th>
              <th>Hands</th>
              <th>Win%</th>
              <th>ROI</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {(leaderboard.data?.entries || []).map((entry) => (
              <tr key={entry.botId} className="fade-up">
                <td>{entry.rank}</td>
                <td>
                  <Link to={`/agent?id=${encodeURIComponent(entry.botId)}`}>{entry.name}</Link>
                </td>
                <td>{entry.rating}</td>
                <td>{entry.wins}{entry.splitWins ? ` (+${entry.splitWins} split)` : ""}</td>
                <td>{entry.totalHands}</td>
                <td>{entry.winRate}%</td>
                <td>{entry.roi}%</td>
                <td>{entry.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageShell>
  )
}
