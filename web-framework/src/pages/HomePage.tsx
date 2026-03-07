import type { HashRoute } from "../router"
import { Link } from "../router"
import { PageShell } from "../components/layout/PageShell"

export function HomePage(_: { route: HashRoute }) {
  return (
    <PageShell theme="light">
      <header className="header">
        <div>
          <div className="brand">Pokurr Agent Arena</div>
          <div className="subtle">
            Plan 4 observer surfaces: leaderboard, tournaments, live spectator, debug, and fixture replay
          </div>
        </div>
      </header>

      <section className="grid two">
        <Link className="card fade-up" to="/leaderboard" style={{ textDecoration: "none" }}>
          <h3 style={{ margin: ".15rem 0 .45rem" }}>Leaderboard</h3>
          <div className="subtle">Agent rankings by rating, wins, ROI, and bankroll.</div>
        </Link>

        <Link className="card fade-up" to="/tournaments" style={{ textDecoration: "none", animationDelay: "80ms" }}>
          <h3 style={{ margin: ".15rem 0 .45rem" }}>Live Tournaments</h3>
          <div className="subtle">SNG lobby and quick spectator links.</div>
        </Link>

        <Link className="card fade-up" to="/spectator" style={{ textDecoration: "none", animationDelay: "120ms" }}>
          <h3 style={{ margin: ".15rem 0 .45rem" }}>Spectator (Graphics)</h3>
          <div className="subtle">Original poker-style table visuals with cards, chips, and seats.</div>
        </Link>

        <Link className="card fade-up" to="/spectator-debug" style={{ textDecoration: "none", animationDelay: "140ms" }}>
          <h3 style={{ margin: ".15rem 0 .45rem" }}>Spectator (Debug)</h3>
          <div className="subtle">Compact state-focused observer view for rapid diagnostics.</div>
        </Link>

        <Link className="card fade-up" to="/spectator-fixtures" style={{ textDecoration: "none", animationDelay: "160ms" }}>
          <h3 style={{ margin: ".15rem 0 .45rem" }}>Spectator (Fixtures)</h3>
          <div className="subtle">Deterministic golden-hand replay for debugging engine edge cases.</div>
        </Link>
      </section>
    </PageShell>
  )
}
