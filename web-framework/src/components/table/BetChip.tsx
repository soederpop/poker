import type { SeatLayoutPoint } from "../../lib/seat-layout"
import { formatCurrency } from "../../lib/format"

export function BetChip(props: {
  amount: number
  layout: SeatLayoutPoint
}) {
  return (
    <div
      className={`bet-chip${props.layout.chipAlign === "right" ? " right" : ""}`}
      style={{
        left: `${props.layout.chip.x}%`,
        top: `${props.layout.chip.y}%`,
      }}
    >
      <img src="./assets/blue-chip.png" alt="Bet chip" />
      <span>{formatCurrency(props.amount)}</span>
    </div>
  )
}
