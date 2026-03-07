export function PageShell(props: {
  theme: "light" | "dark"
  className?: string
  children: JSX.Element | JSX.Element[]
}) {
  const baseClass = props.theme === "dark" ? "spectator-page" : "page"
  const className = props.className ? `${baseClass} ${props.className}` : baseClass

  return <main className={className}>{props.children}</main>
}
