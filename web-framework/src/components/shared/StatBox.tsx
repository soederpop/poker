export function StatBox(props: {
  label: string
  value: string | number
}) {
  return (
    <div className="stat">
      <div className="label">{props.label}</div>
      <div className="value">{props.value}</div>
    </div>
  )
}
