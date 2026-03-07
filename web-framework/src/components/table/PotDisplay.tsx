import { formatCurrency } from "../../lib/format"

export function PotDisplay(props: { pot: number }) {
  return (
    <div className="pot-chip">
      <img src="./assets/red-chip.png" alt="Pot chip" />
      <span>{formatCurrency(props.pot)}</span>
    </div>
  )
}
