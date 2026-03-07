import type { FeedItem } from "../../types"

export function EventFeed(props: {
  variant: "light" | "dark"
  items: FeedItem[]
}) {
  if (props.variant === "light") {
    return (
      <div className="feed">
        {props.items.map((item) => (
          <div
            key={item.id}
            className="event fade-up"
            onClick={item.onClick}
            style={item.onClick ? { cursor: "pointer" } : undefined}
          >
            {item.timeLabel}  {item.text}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="feed">
      {props.items.map((item) => (
        <div
          key={item.id}
          className={`feed-event${item.tone === "error" ? " error" : ""}${item.active ? " active" : ""}`}
          onClick={item.onClick}
        >
          <div className="feed-time">{item.timeLabel}</div>
          <div className="feed-text">{item.text}</div>
        </div>
      ))}
    </div>
  )
}
