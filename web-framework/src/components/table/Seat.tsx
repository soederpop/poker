import type { SeatLayoutPoint } from "../../lib/seat-layout"
import type { SpectatorPlayerSnapshot } from "../../types"
import { playerTags } from "../../lib/card-helpers"
import { formatCurrency } from "../../lib/format"
import { AvatarImage } from "../shared/AvatarImage"
import { CardImage } from "../shared/CardImage"

export function Seat(props: {
  player: SpectatorPlayerSnapshot
  layout: SeatLayoutPoint
  isActing: boolean
  isOut: boolean
  holeCards: string[]
  layoutEditMode?: boolean
  onPointerDown?: (event: any) => void
}) {
  const seat = Number(props.player.seat)
  const sideClass = props.layout.align === "right" ? "side-right" : "side-left"
  const verticalClass = props.layout.y <= 34
    ? "top"
    : (props.layout.y >= 64 ? "bottom" : "middle")

  return (
    <div
      className={`seat ${props.layout.align === "right" ? "right" : ""} ${sideClass} ${verticalClass}${props.isOut ? " out" : ""}${props.layoutEditMode ? " layout-editable" : ""}`}
      style={{
        left: `${props.layout.x}%`,
        top: `${props.layout.y}%`,
      }}
      data-seat={seat}
      onPointerDown={props.onPointerDown}
    >
      <div className={`avatar${props.isActing ? " acting" : ""}`}>
        <AvatarImage player={props.player} />
      </div>

      <div className="seat-info">
        <div className="seat-name">{props.player.name || props.player.botId || `Seat ${seat}`}</div>
        <div className="seat-stack">Seat {seat} · {formatCurrency(props.player.stack)}</div>
        <div className="seat-tags">{playerTags(props.player)}</div>
      </div>

      <div className="hole-cards">
        {props.holeCards.map((card, index) => (
          <CardImage
            key={`${props.player.botId}-${card}-${index}`}
            className="hole-card"
            card={card}
            hiddenBack={card === "back"}
          />
        ))}
      </div>
    </div>
  )
}
