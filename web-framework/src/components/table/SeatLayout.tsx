import { useEffect, useMemo, useRef, useState } from "react"
import { useContainerState, useFeature } from "@soederpop/luca/react"

import { SEAT_LAYOUT } from "../../lib/seat-layout"
import type { SpectatorPlayerSnapshot, SpectatorSnapshot } from "../../types"
import type { SeatLayoutEditor, SeatLayoutEditorState } from "../../framework/features/seat-layout-editor"
import { BetChip } from "./BetChip"
import { Seat } from "./Seat"

const VISIBLE_SEATS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function clampPercent(value: number) {
  return Math.max(4, Math.min(96, value))
}

export function SeatLayout(props: {
  snapshot: SpectatorSnapshot
  holeCardsResolver: (player: SpectatorPlayerSnapshot, snapshot: SpectatorSnapshot) => string[]
  betAmountResolver: (player: SpectatorPlayerSnapshot) => number
  layoutEditMode?: boolean
}) {
  const editor = useFeature("seatLayoutEditor" as any) as SeatLayoutEditor
  const editorState = useContainerState<SeatLayoutEditorState>(editor)

  const layoutEditMode = typeof props.layoutEditMode === "boolean"
    ? props.layoutEditMode
    : Boolean(editorState.enabled)

  useEffect(() => {
    if (editor.enabled !== layoutEditMode) {
      editor.setEnabled(layoutEditMode)
    }
  }, [editor, layoutEditMode])

  const overrides = editorState.overrides || {}
  const [dragSeat, setDragSeat] = useState<number | null>(null)
  const [editorNote, setEditorNote] = useState("")
  const layerRef = useRef<HTMLDivElement | null>(null)

  const moveSeatToPointer = (seat: number, clientX: number, clientY: number) => {
    const layer = layerRef.current
    if (!layer) {
      return
    }

    const rect = layer.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }

    const x = clampPercent(((clientX - rect.left) / rect.width) * 100)
    const y = clampPercent(((clientY - rect.top) / rect.height) * 100)
    editor.setSeatPosition(seat, x, y)
  }

  useEffect(() => {
    if (!layoutEditMode || dragSeat === null) {
      return
    }

    const onMove = (event: PointerEvent) => {
      moveSeatToPointer(dragSeat, event.clientX, event.clientY)
    }

    const onUp = () => {
      setDragSeat(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [dragSeat, layoutEditMode])

  const onSeatPointerDown = (seat: number, event: any) => {
    if (!layoutEditMode) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    setDragSeat(seat)
    moveSeatToPointer(seat, Number(event.clientX || 0), Number(event.clientY || 0))
  }

  const exportableLayout = useMemo(() => {
    const snapshot: Record<string, { x: number; y: number }> = {}
    for (const seat of VISIBLE_SEATS) {
      const base = SEAT_LAYOUT[seat]
      if (!base) {
        continue
      }
      const override = overrides[seat]
      snapshot[String(seat)] = {
        x: Math.round(Number(override?.x ?? base.x) * 10) / 10,
        y: Math.round(Number(override?.y ?? base.y) * 10) / 10,
      }
    }
    return snapshot
  }, [overrides])

  const copyLayout = async () => {
    const text = JSON.stringify(exportableLayout, null, 2)
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      }
      setEditorNote("Layout JSON copied")
    } catch {
      setEditorNote("Clipboard blocked - read window.__pokurrSeatLayout")
    }
  }

  const resetLayout = () => {
    editor.resetOverrides()
    setEditorNote("Layout reset")
  }

  const playersBySeat = new Map<number, SpectatorPlayerSnapshot>()
  for (const player of props.snapshot.players || []) {
    playersBySeat.set(Number(player.seat), player)
  }

  return (
    <div className="seats-layer" ref={layerRef}>
      {layoutEditMode ? (
        <div className="layout-editor-panel">
          <div className="layout-editor-title">Layout Edit Mode</div>
          <div className="layout-editor-hint">Drag any seat avatar circle.</div>
          <div className="layout-editor-actions">
            <button type="button" onClick={() => { void copyLayout() }}>Copy JSON</button>
            <button type="button" onClick={resetLayout}>Reset</button>
          </div>
          {editorNote ? <div className="layout-editor-note">{editorNote}</div> : null}
        </div>
      ) : null}

      {VISIBLE_SEATS.map((seat) => {
        const baseLayout = SEAT_LAYOUT[seat] || {
          x: 50,
          y: 50,
          align: "left" as const,
          dealer: { x: 50, y: 50 },
          chip: { x: 50, y: 50 },
          chipAlign: "left" as const,
        }
        const layout = {
          ...baseLayout,
          ...(overrides[seat] || {}),
        }
        const player = playersBySeat.get(seat)

        if (!player) {
          return (
            <div
              key={`open-seat-${seat}`}
              className={`seat ${layout.align === "right" ? "right" : ""} empty${layoutEditMode ? " layout-editable" : ""}`}
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
              }}
              data-seat={seat}
              onPointerDown={(event) => onSeatPointerDown(seat, event)}
            >
              <div className="avatar">
                <span className="empty-seat-label">{seat}</span>
              </div>
            </div>
          )
        }

        const isActing = String(props.snapshot.currentActor || "") === String(player.botId || "")
        const isOut = !player.inHand || player.folded || Number(player.stack || 0) <= 0
        const amount = props.betAmountResolver(player)

        return (
          <div key={`${player.botId}-${player.seat}`}>
            <Seat
              player={player}
              layout={layout}
              isActing={isActing}
              isOut={isOut}
              holeCards={props.holeCardsResolver(player, props.snapshot)}
              layoutEditMode={layoutEditMode}
              onPointerDown={(event) => onSeatPointerDown(seat, event)}
            />
            {amount > 0 ? <BetChip amount={amount} layout={layout} /> : null}
          </div>
        )
      })}
    </div>
  )
}
