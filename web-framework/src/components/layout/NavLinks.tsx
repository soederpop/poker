import { Link } from "../../router"

export interface NavLinkItem {
  to: string
  label: string
}

export function NavLinks(props: {
  links: NavLinkItem[]
  activePath: string
  variant: "light" | "dark"
}) {
  const className = props.variant === "dark" ? "topbar-nav" : "nav"

  return (
    <nav className={className}>
      {props.links.map((item) => {
        const isActive = props.activePath === item.to
        return (
          <Link
            key={item.to}
            to={item.to}
            className={isActive ? "active" : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
