export function StatusPill(props: { status: string }) {
  const cls = String(props.status || "").toLowerCase()
  return <span className={`pill ${cls}`}>{props.status}</span>
}
