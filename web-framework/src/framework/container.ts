import container from "@soederpop/luca/web"

import "./clients/poker-spectator-ws"
import "./features/seat-layout-editor"
import "./features/spectator-runtime"

const layoutFeature = container.feature("seatLayoutEditor" as any, { enable: true }) as any
const runtimeFeature = container.feature("spectatorRuntime" as any, { enable: true }) as any

function parseHashQuery() {
  const hash = String(window.location.hash || "")
  const source = hash.startsWith("#") ? hash.slice(1) : hash
  const [, searchPart = ""] = source.split("?")
  return new URLSearchParams(searchPart)
}

async function connectContainerLink(hostUrl: string) {
  const link = container.feature("containerLink" as any, {
    enable: true,
    hostUrl,
  }) as any
  await link.connect()
  return link
}

try {
  const query = parseHashQuery()
  const hostUrl = String(query.get("containerLinkWs") || query.get("containerLink") || "").trim()
  if (hostUrl) {
    void connectContainerLink(hostUrl)
  }
} catch {
  // Ignore invalid URL/hash parsing.
}

;(window as any).pokurr = {
  container,
  layout: layoutFeature,
  spectator: runtimeFeature,
  connectContainerLink,
}

export default container
