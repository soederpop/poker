export function HudPills(props: {
  items: Array<{ label: string; value: string | number }>
}) {
  return (
    <div className="table-hud">
      {props.items.map((item) => (
        <div key={item.label} className="hud-pill">
          {item.label} <span>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
