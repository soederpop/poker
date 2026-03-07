import { NavLinks, type NavLinkItem } from "./NavLinks"

export function TopBar(props: {
  brand: string
  status: string
  links: NavLinkItem[]
  activePath: string
}) {
  return (
    <header className="topbar">
      <div className="topbar-meta">
        <div className="brand">{props.brand}</div>
        <div className="status">{props.status}</div>
      </div>
      <NavLinks links={props.links} activePath={props.activePath} variant="dark" />
    </header>
  )
}
