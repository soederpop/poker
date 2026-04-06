import type { HashRoute } from "../router"
import { useSpectatorSocket } from "../hooks/useSpectatorSocket"
import { Header } from "../components/layout/Header"
import { PageShell } from "../components/layout/PageShell"
import { EventFeed } from "../components/shared/EventFeed"
import { StatBox } from "../components/shared/StatBox"

const NAV_LINKS = [
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/spectator", label: "Graphics" },
  { to: "/spectator-debug", label: "Debug" },
  { to: "/spectator-fixtures", label: "Fixtures" },
]

export function SpectatorDebugPage({ route }: { route: HashRoute }) {
  const tableId = route.query.get("tableId")
  const wsUrl = route.query.get("ws")

  const spectator = useSpectatorSocket({ tableId, wsUrl })

  const snapshot = spectator.snapshot
  const players = (snapshot?.players || []).slice().sort((left, right) => left.seat - right.seat)

  return (
    <PageShell theme="light">
      <Header
        brand="Spectator Table (Debug)"
        meta={spectator.meta}
        links={NAV_LINKS}
        activePath={route.path}
      />

      <section className="grid two">
        <article className="card">
          <div className="stats" style={{ marginBottom: ".7rem" }}>
            <StatBox label="Table" value={snapshot?.tableId || "-"} />
            <StatBox label="Hand" value={snapshot?.handNumber || "-"} />
            <StatBox label="Stage" value={String(snapshot?.stage || "-").toUpperCase()} />
            <StatBox label="Pot" value={snapshot?.pot || 0} />
          </div>

          <div className="subtle" style={{ marginBottom: ".35rem" }}>Board</div>
          <div className="board">
            {(snapshot?.board || []).map((card) => (
              <div key={card} className="card-chip">{card}</div>
            ))}
            {(snapshot?.board || []).length === 0 ? (
              <div className="subtle">Waiting for board cards</div>
            ) : null}
          </div>

          <div className="subtle" style={{ margin: ".9rem 0 .35rem" }}>Seats</div>
          <div className="seats">
            {players.map((player) => {
              const tags = [
                player.inHand === false ? "out" : "",
                player.folded ? "folded" : "",
                player.allIn ? "all-in" : "",
              ].filter(Boolean).join(" · ")

              return (
                <div key={`${player.botId}-${player.seat}`} className="seat fade-up">
                  <div style={{ fontWeight: 700 }}>{player.name}</div>
                  <div className="meta">
                    <span>Seat {player.seat}</span>
                    <span>Stack {player.stack}</span>
                  </div>
                  <div className="subtle" style={{ marginTop: ".25rem" }}>{tags || "active"}</div>
                </div>
              )
            })}
          </div>
        </article>

        <aside className="card">
          <h3 style={{ margin: ".1rem 0 .7rem" }}>Action Feed</h3>
          <EventFeed variant="light" items={spectator.feedItems} />
        </aside>
      </section>
    </PageShell>
  )
}
