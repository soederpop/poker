import { NavLinks, type NavLinkItem } from "./NavLinks"

export function Header(props: {
  brand: string
  meta: string
  links: NavLinkItem[]
  activePath: string
}) {
  return (
    <header className="header">
      <div>
        <div className="brand">{props.brand}</div>
        <div className="subtle">{props.meta}</div>
      </div>
      <NavLinks links={props.links} activePath={props.activePath} variant="light" />
    </header>
  )
}
