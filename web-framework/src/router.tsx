import { useEffect, useMemo, useState, type AnchorHTMLAttributes } from "react"

import type { RoutePath } from "./types"

export interface HashRoute {
  path: RoutePath | string
  query: URLSearchParams
  href: string
}

function normalizePath(rawPath: string): string {
  const cleaned = rawPath.trim()
  if (!cleaned || cleaned === "#" || cleaned === "/") {
    return "/"
  }

  if (cleaned.startsWith("/")) {
    return cleaned
  }

  return `/${cleaned}`
}

export function parseHashRoute(hash: string): HashRoute {
  const source = hash.startsWith("#") ? hash.slice(1) : hash
  const raw = source || "/"
  const [pathPart, searchPart = ""] = raw.split("?")
  const path = normalizePath(pathPart)
  const query = new URLSearchParams(searchPart)

  return {
    path,
    query,
    href: `#${path}${searchPart ? `?${searchPart}` : ""}`,
  }
}

export function useHashRoute(): HashRoute {
  const [hash, setHash] = useState(() => window.location.hash || "#/")

  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash || "#/")
    }

    window.addEventListener("hashchange", onChange)
    window.addEventListener("popstate", onChange)

    return () => {
      window.removeEventListener("hashchange", onChange)
      window.removeEventListener("popstate", onChange)
    }
  }, [])

  return useMemo(() => parseHashRoute(hash), [hash])
}

export function toHashHref(to: string): string {
  if (to.startsWith("#")) {
    return to
  }

  const path = to.startsWith("/") ? to : `/${to}`
  return `#${path}`
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  const href = toHashHref(to)
  if (options.replace) {
    window.history.replaceState(null, "", href)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
    return
  }

  window.location.hash = href
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string
}

export function Link({ to, ...rest }: LinkProps) {
  return <a href={toHashHref(to)} {...rest} />
}
