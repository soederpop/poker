import { useEffect, useState } from "react"

import type { HashRoute } from "../router"
import { usePokerApi } from "../hooks/usePokerApi"
import type { AgentProfile } from "../types"
import { formatDateTime } from "../lib/format"
import { Header } from "../components/layout/Header"
import { PageShell } from "../components/layout/PageShell"
import { StatBox } from "../components/shared/StatBox"

const NAV_LINKS = [
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/spectator", label: "Spectator" },
]

export function AgentPage({ route }: { route: HashRoute }) {
  const api = usePokerApi()
  const botId = String(route.query.get("id") || "").trim()

  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [meta, setMeta] = useState("Loading profile...")

  useEffect(() => {
    if (!botId) {
      setProfile(null)
      setMeta("Missing ?id=<botId>")
      return
    }

    let disposed = false
    setMeta("Loading profile...")

    void api.getAgentProfile(botId)
      .then((row) => {
        if (disposed) {
          return
        }

        setProfile(row)
        setMeta(`${row.botId} | ${row.status}`)
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        const message = error instanceof Error ? error.message : String(error)
        setProfile(null)
        setMeta(`Failed to load agent: ${message}`)
      })

    return () => {
      disposed = true
    }
  }, [api, botId])

  return (
    <PageShell theme="light">
      <Header
        brand={profile?.name || "Agent"}
        meta={meta}
        links={NAV_LINKS}
        activePath="/agent"
      />

      <section className="card" style={{ marginBottom: "1rem" }}>
        <div className="stats">
          <StatBox label="Rating" value={profile?.rating ?? "-"} />
          <StatBox label="Wins" value={profile?.wins ?? "-"} />
          <StatBox label="Hands" value={profile?.totalHands ?? "-"} />
          <StatBox label="Win %" value={profile ? `${profile.winRate}%` : "-"} />
          <StatBox label="Balance" value={profile?.balance ?? "-"} />
          <StatBox label="ROI" value={profile ? `${profile.roi}%` : "-"} />
          <StatBox label="Losses" value={profile?.losses ?? "-"} />
          <StatBox label="Total Earnings" value={profile?.totalEarnings ?? "-"} />
        </div>
      </section>

      <section className="card">
        <h3 style={{ margin: ".1rem 0 .8rem" }}>Recent Hands</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Table</th>
              <th>Hand</th>
              <th>Result</th>
              <th>Amount</th>
              <th>Board</th>
            </tr>
          </thead>
          <tbody>
            {(profile?.recentHands || []).map((hand) => (
              <tr key={`${hand.tableId}:${hand.handNumber}:${hand.timestamp}`}>
                <td>{formatDateTime(hand.timestamp)}</td>
                <td>{hand.tableId}</td>
                <td>{hand.handNumber}</td>
                <td>{hand.won ? "Won" : "Miss"}</td>
                <td>{hand.amount}</td>
                <td>{(hand.board || []).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageShell>
  )
}
