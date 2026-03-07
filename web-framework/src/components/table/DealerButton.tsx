import { SEAT_LAYOUT } from "../../lib/seat-layout"

export function DealerButton(props: { dealerSeat: number }) {
  const layout = SEAT_LAYOUT[Number(props.dealerSeat)]

  if (!layout) {
    return <img className="dealer-button hidden" src="./assets/dealer-button.png" alt="Dealer" />
  }

  return (
    <img
      className="dealer-button"
      src="./assets/dealer-button.png"
      alt="Dealer"
      style={{
        left: `${layout.dealer.x}%`,
        top: `${layout.dealer.y}%`,
      }}
    />
  )
}
