import { useCallback, useEffect, useMemo, useState } from "react"

import type { HashRoute } from "../router"
import { useFixtureReplay } from "../hooks/useFixtureReplay"
import { usePokerApi } from "../hooks/usePokerApi"
import type {
  FeedItem,
  GoldenFixtureReplay,
  GoldenFixtureSummary,
  SpectatorPlayerSnapshot,
  SpectatorSnapshot,
} from "../types"
import { PageShell } from "../components/layout/PageShell"
import { TopBar } from "../components/layout/TopBar"
import { EventFeed } from "../components/shared/EventFeed"
import { TableCanvas } from "../components/table/TableCanvas"

const NAV_LINKS = [
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/spectator", label: "Live" },
  { to: "/spectator-debug", label: "Debug" },
  { to: "/spectator-fixtures", label: "Fixtures" },
]

function describeFrameEvent(frame: { eventType: string; event?: Record<string, unknown> }) {
  if (!frame.event || typeof frame.event !== "object") {
    return frame.eventType
  }

  const action = String(frame.event.action || "")
  const playerId = String(frame.event.playerId || frame.event.bigBlindPlayerId || frame.event.smallBlindPlayerId || "")
  const amount = Number(frame.event.amount || 0)

  if (action || playerId) {
    return `${frame.eventType}${playerId ? ` · ${playerId}` : ""}${action ? ` · ${action}` : ""}${amount > 0 ? ` ${amount}` : ""}`
  }

  return frame.eventType
}

function fixtureHoleCards(player: SpectatorPlayerSnapshot, snapshot: SpectatorSnapshot): string[] {
  if (snapshot.stage === "waiting") {
    return []
  }

  const cards = Array.isArray(player.holeCards)
    ? player.holeCards.map((card) => String(card || "").toLowerCase()).filter(Boolean)
    : []

  if (cards.length === 2) {
    return cards
  }

  if (player.inHand && !player.folded) {
    return ["back", "back"]
  }

  return []
}

export function SpectatorFixturesPage({ route }: { route: HashRoute }) {
  const api = usePokerApi()
  const fixtureQuery = String(route.query.get("fixture") || "").trim()

  const [fixtures, setFixtures] = useState<GoldenFixtureSummary[]>([])
  const [selectedFixtureId, setSelectedFixtureId] = useState("")
  const [replay, setReplay] = useState<GoldenFixtureReplay | null>(null)
  const [meta, setMeta] = useState("Loading fixtures...")

  useEffect(() => {
    let disposed = false

    void api.listGoldenFixtures()
      .then((payload) => {
        if (disposed) {
          return
        }

        const rows = payload.fixtures || []
        setFixtures(rows)

        if (rows.length <= 0) {
          setMeta("No fixtures available")
          return
        }

        const initial = rows.find((row) => row.id === fixtureQuery)?.id || rows[0].id
        setSelectedFixtureId(initial)
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        const message = error instanceof Error ? error.message : String(error)
        setMeta(`Failed to load fixture spectator: ${message}`)
      })

    return () => {
      disposed = true
    }
  }, [api, fixtureQuery])

  useEffect(() => {
    if (!selectedFixtureId) {
      return
    }

    let disposed = false
    setMeta(`Loading replay: ${selectedFixtureId}`)

    void api.getGoldenFixtureReplay(selectedFixtureId)
      .then((nextReplay) => {
        if (disposed) {
          return
        }

        setReplay(nextReplay)
        setMeta(`Loaded fixture ${nextReplay.fixtureId} (${nextReplay.frames.length} frames)`)
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        const message = error instanceof Error ? error.message : String(error)
        setMeta(`Failed to load replay: ${message}`)
      })

    return () => {
      disposed = true
    }
  }, [api, selectedFixtureId])

  const playback = useFixtureReplay(replay?.frames || [])

  const feedItems = useMemo(() => {
    const frames = replay?.frames || []
    return [...frames]
      .reverse()
      .map((frame): FeedItem => ({
        id: `${frame.index}`,
        timeLabel: frame.label,
        text: describeFrameEvent(frame),
        active: frame.index === playback.frameIndex,
        onClick: () => {
          playback.stop()
          playback.goToFrame(frame.index)
        },
      }))
  }, [playback, replay?.frames, replay?.frames?.length])

  const currentSnapshot = playback.currentFrame?.snapshot || null
  const expectedWinners = replay?.expected?.winners?.length
    ? replay.expected.winners.map((winner) => `${winner.playerId}+${winner.amount}`).join(", ")
    : "none"
  const expectedPots = replay?.expected?.pots?.length
    ? replay.expected.pots.map((pot) => `${pot.amount} (${(pot.eligible || []).join("/")})`).join(" | ")
    : "none"

  const onFixtureChange = useCallback((value: string) => {
    playback.stop()
    playback.goToFrame(0)
    setSelectedFixtureId(value)
  }, [playback])

  return (
    <PageShell theme="dark" className="fixtures-page">
      <TopBar
        brand="Pokurr Fixtures Spectator"
        status={meta}
        links={NAV_LINKS}
        activePath={route.path}
      />

      <section className="spectator-layout">
        <TableCanvas
          snapshot={currentSnapshot}
          tableLabel="Fixture"
          handLabel="Frame"
          tableValue={replay?.fixtureId || "-"}
          handValue={`${playback.frameIndex} / ${playback.maxFrame}`}
          holeCardsResolver={fixtureHoleCards}
          pulseDurationMs={2600}
        />

        <aside className="event-panel">
          <h2>Fixture Replay</h2>

          <div className="fixture-controls">
            <label htmlFor="fixtureSelect">Fixture</label>
            <select
              id="fixtureSelect"
              value={selectedFixtureId}
              onChange={(event) => onFixtureChange(event.target.value)}
            >
              {fixtures.map((fixture) => (
                <option key={fixture.id} value={fixture.id}>
                  {fixture.id} ({fixture.players}p / {fixture.events}e)
                </option>
              ))}
            </select>

            <div className="playback-row">
              <button
                id="prevBtn"
                type="button"
                onClick={() => {
                  playback.stop()
                  playback.prevFrame()
                }}
              >
                Prev
              </button>
              <button
                id="playBtn"
                type="button"
                onClick={playback.togglePlay}
              >
                {playback.isPlaying ? "Pause" : "Play"}
              </button>
              <button
                id="nextBtn"
                type="button"
                onClick={() => {
                  playback.stop()
                  playback.nextFrame()
                }}
              >
                Next
              </button>
            </div>

            <label htmlFor="speedRange">Speed <span>{playback.speed.toFixed(1)}x</span></label>
            <input
              id="speedRange"
              type="range"
              min="0.5"
              max="4"
              step="0.5"
              value={playback.speed}
              onChange={(event) => {
                const value = Number(event.target.value || 1)
                playback.setSpeed(Number.isFinite(value) ? value : 1)
              }}
            />

            <label htmlFor="frameRange">Frame <span>{playback.frameIndex} / {playback.maxFrame}</span></label>
            <input
              id="frameRange"
              type="range"
              min="0"
              max={String(playback.maxFrame)}
              step="1"
              value={playback.frameIndex}
              onChange={(event) => {
                playback.stop()
                playback.goToFrame(Number(event.target.value || 0))
              }}
            />

            <div className="expected">
              <strong>Expected Winners:</strong> {expectedWinners}
              <br />
              <strong>Expected Pots:</strong> {expectedPots}
            </div>
          </div>

          <EventFeed variant="dark" items={feedItems} />
        </aside>
      </section>
    </PageShell>
  )
}
