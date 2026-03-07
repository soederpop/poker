import { CardImage } from "../shared/CardImage"

export function BoardCards(props: { cards: string[] }) {
  return (
    <div className="board-cards">
      {(props.cards || []).map((card, index) => (
        <CardImage key={`${card}-${index}`} className="board-card" card={card} />
      ))}
    </div>
  )
}
