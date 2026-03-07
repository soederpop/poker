import { useEffect, useMemo } from "react"
import { useContainerState, useFeature } from "@soederpop/luca/react"

import type { HashRoute } from "../router"
import type { SpectatorPlayerSnapshot, SpectatorSnapshot } from "../types"
import { useSpectatorSocket } from "../hooks/useSpectatorSocket"
import { PageShell } from "../components/layout/PageShell"
import { TopBar } from "../components/layout/TopBar"
import { EventFeed } from "../components/shared/EventFeed"
import { TableCanvas } from "../components/table/TableCanvas"
import type { SeatLayoutEditor, SeatLayoutEditorState } from "../framework/features/seat-layout-editor"

const NAV_LINKS = [
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/spectator", label: "Spectator" },
  { to: "/spectator-debug", label: "Debug" },
  { to: "/spectator-fixtures", label: "Fixtures" },
]

function isTruthy(raw: string | null): boolean {
  const value = String(raw || "").toLowerCase()
  return value === "1" || value === "true" || value === "yes" || value === "on"
}

function liveHoleCardsResolver(
  player: SpectatorPlayerSnapshot,
  snapshot: SpectatorSnapshot,
  showdownHandNumber: number | null,
  showdownCardsByPlayer: Map<string, string[]>,
): string[] {
  if (showdownHandNumber === Number(snapshot.handNumber || 0)) {
    const showdown = showdownCardsByPlayer.get(String(player.botId || ""))
    if (Array.isArray(showdown) && showdown.length === 2) {
      return showdown.map((card) => String(card).toLowerCase())
    }
  }

  if (snapshot.stage !== "waiting" && player.inHand && !player.folded) {
    return ["back", "back"]
  }

  return []
}

export function SpectatorPage({ route }: { route: HashRoute }) {
  const tableId = route.query.get("tableId")
  const wsUrl = route.query.get("ws")
  const layoutFeature = useFeature("seatLayoutEditor" as any) as SeatLayoutEditor
  const layoutState = useContainerState<SeatLayoutEditorState>(layoutFeature)
  const seatLayoutEditMode = Boolean(layoutState.enabled)

  useEffect(() => {
    const explicit = route.query.get("layoutEdit")
    if (explicit === null) {
      return
    }
    layoutFeature.setEnabled(isTruthy(explicit))
  }, [layoutFeature, route.href])

  const spectator = useSpectatorSocket({ tableId, wsUrl })

  const holeCards = useMemo(() => {
    return (player: SpectatorPlayerSnapshot, snapshot: SpectatorSnapshot) => {
      return liveHoleCardsResolver(
        player,
        snapshot,
        spectator.showdownHandNumber,
        spectator.showdownCardsByPlayer,
      )
    }
  }, [spectator.showdownCardsByPlayer, spectator.showdownHandNumber])

  return (
    <PageShell theme="dark">
      <TopBar
        brand="Pokurr Spectator"
        status={spectator.meta}
        links={NAV_LINKS}
        activePath={route.path}
      />
      <div className="layout-feature-toggle">
        <button type="button" onClick={() => layoutFeature.toggleEnabled()}>
          {seatLayoutEditMode ? "Disable Layout Editor" : "Enable Layout Editor"}
        </button>
      </div>

      <section className="spectator-layout">
        <TableCanvas
          snapshot={spectator.snapshot}
          tableLabel="Table"
          handLabel="Hand"
          holeCardsResolver={holeCards}
          pulseDurationMs={2200}
          seatLayoutEditMode={seatLayoutEditMode}
        />

        <aside className="event-panel">
          <h2>Action Feed</h2>
          <EventFeed variant="dark" items={spectator.feedItems} />
        </aside>
      </section>
    </PageShell>
  )
}
