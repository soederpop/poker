import { useEffect, useMemo, useRef, useState } from "react"

import { formatCurrency, formatStage } from "../../lib/format"
import type { SpectatorPlayerSnapshot, SpectatorSnapshot } from "../../types"
import { BoardCards } from "./BoardCards"
import { DealerButton } from "./DealerButton"
import { HudPills } from "./HudPills"
import { PotDisplay } from "./PotDisplay"
import { SeatLayout } from "./SeatLayout"

type BetPulse = {
  amount: number
  expiresAt: number
}

export function TableCanvas(props: {
  snapshot: SpectatorSnapshot | null
  tableLabel: string
  handLabel: string
  tableValue?: string | number
  handValue?: string | number
  holeCardsResolver: (player: SpectatorPlayerSnapshot, snapshot: SpectatorSnapshot) => string[]
  pulseDurationMs?: number
  seatLayoutEditMode?: boolean
}) {
  const pulseDurationMs = props.pulseDurationMs ?? 2200
  const pulseMapRef = useRef<Map<string, BetPulse>>(new Map())
  const [pulseTick, setPulseTick] = useState(0)

  useEffect(() => {
    const snapshot = props.snapshot
    if (!snapshot) {
      pulseMapRef.current.clear()
      return
    }

    if (snapshot.stage === "waiting") {
      if (pulseMapRef.current.size > 0) {
        pulseMapRef.current.clear()
        setPulseTick((value) => value + 1)
      }
      return
    }

    const now = Date.now()
    let dirty = false

    for (const player of snapshot.players || []) {
      const committed = Math.round(Number(player.committed || 0))
      if (committed > 0) {
        const playerId = String(player.botId || player.name || player.seat || "")
        pulseMapRef.current.set(playerId, {
          amount: committed,
          expiresAt: now + pulseDurationMs,
        })
        dirty = true
      }
    }

    for (const [playerId, pulse] of pulseMapRef.current.entries()) {
      if (now > Number(pulse.expiresAt || 0)) {
        pulseMapRef.current.delete(playerId)
        dirty = true
      }
    }

    if (dirty) {
      setPulseTick((value) => value + 1)
    }

    if (pulseMapRef.current.size <= 0) {
      return
    }

    const nearest = Math.min(...[...pulseMapRef.current.values()].map((pulse) => pulse.expiresAt))
    const timeoutMs = Math.max(120, nearest - now + 20)
    const timer = window.setTimeout(() => {
      setPulseTick((value) => value + 1)
    }, timeoutMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [props.snapshot, pulseDurationMs])

  const betAmountResolver = useMemo(() => {
    return (player: SpectatorPlayerSnapshot) => {
      void pulseTick

      const playerId = String(player.botId || player.name || player.seat || "")
      const committed = Math.round(Number(player.committed || 0))
      const pulseAmount = Math.round(Number(pulseMapRef.current.get(playerId)?.amount || 0))
      const totalCommitted = Math.round(Number(player.totalCommitted || 0))

      const amount = committed > 0 ? committed : (pulseAmount > 0 ? pulseAmount : totalCommitted)
      return amount > 0 ? amount : 0
    }
  }, [pulseTick])

  const snapshot = props.snapshot
  const tableValue = props.tableValue ?? snapshot?.tableName ?? snapshot?.tableId ?? "-"
  const handValue = props.handValue ?? snapshot?.handNumber ?? "-"
  const stage = formatStage(snapshot?.stage || "waiting")
  const pot = Number(snapshot?.pot || 0)

  return (
    <article className="table-shell">
      <div className="table-canvas">
        <div className="felt-overlay"></div>

        <HudPills
          items={[
            { label: props.tableLabel, value: tableValue },
            { label: props.handLabel, value: handValue },
            { label: "Stage", value: stage },
            { label: "Pot", value: formatCurrency(pot) },
          ]}
        />

        <div className="board-area">
          <BoardCards cards={snapshot?.board || []} />
          <PotDisplay pot={pot} />
        </div>

        <DealerButton dealerSeat={Number(snapshot?.dealerSeat || 0)} />

        {snapshot ? (
          <SeatLayout
            snapshot={snapshot}
            holeCardsResolver={props.holeCardsResolver}
            betAmountResolver={betAmountResolver}
            layoutEditMode={props.seatLayoutEditMode}
          />
        ) : (
          <div className="seats-layer"></div>
        )}
      </div>
    </article>
  )
}
