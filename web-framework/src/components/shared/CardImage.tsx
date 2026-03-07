import { cardSrc } from "../../lib/card-helpers"

export function CardImage(props: {
  card: string
  className: string
  hiddenBack?: boolean
}) {
  const isBack = props.hiddenBack === true

  return (
    <img
      className={props.className}
      src={isBack ? "./assets/back.svg" : cardSrc(props.card)}
      alt={isBack ? "Hidden card" : String(props.card).toUpperCase()}
    />
  )
}
