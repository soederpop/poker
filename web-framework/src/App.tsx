import { useEffect } from "react"

import { useHashRoute } from "./router"
import type { RoutePath } from "./types"
import { AgentPage } from "./pages/AgentPage"
import { HomePage } from "./pages/HomePage"
import { LeaderboardPage } from "./pages/LeaderboardPage"
import { SpectatorDebugPage } from "./pages/SpectatorDebugPage"
import { SpectatorFixturesPage } from "./pages/SpectatorFixturesPage"
import { SpectatorPage } from "./pages/SpectatorPage"
import { TournamentsPage } from "./pages/TournamentsPage"

const DARK_ROUTES = new Set<RoutePath | string>(["/spectator", "/spectator-fixtures"])

export function App() {
  const route = useHashRoute()
  const isDark = DARK_ROUTES.has(route.path)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")
  }, [isDark])

  let page: JSX.Element
  switch (route.path) {
    case "/leaderboard":
      page = <LeaderboardPage route={route} />
      break
    case "/tournaments":
      page = <TournamentsPage route={route} />
      break
    case "/agent":
      page = <AgentPage route={route} />
      break
    case "/spectator":
      page = <SpectatorPage route={route} />
      break
    case "/spectator-debug":
      page = <SpectatorDebugPage route={route} />
      break
    case "/spectator-fixtures":
      page = <SpectatorFixturesPage route={route} />
      break
    case "/":
    default:
      page = <HomePage route={route} />
      break
  }

  return <div className={isDark ? "theme-dark" : "theme-light"}>{page}</div>
}
