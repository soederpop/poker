import type { AGIContainer } from "@soederpop/luca/agi"
import { equityEngine } from "@pokurr/core"

import "./features/game-engine"
import "./features/strategy"
import "./features/table-manager"

export type PokerContainerServices = {
  diskCache: any
  gameEngine: any
  strategy: any
  tableManager: any
}

export function configurePokerContainer(container: AGIContainer): PokerContainerServices {
  container.docs = container.feature("contentDb", {
    rootPath: container.paths.resolve("docs"),
  })

  const diskCache = container.feature("diskCache", {
    enable: true,
    path: container.paths.resolve("tmp", "poker-cache"),
  })

  const gameEngine = container.feature("gameEngine", { enable: true })
  const strategy = container.feature("strategy", { enable: true })
  const tableManager = container.feature("tableManager", { enable: true })

  return {
    diskCache,
    gameEngine,
    strategy,
    tableManager,
  }
}

export async function bootPokerContainer(
  container: AGIContainer,
  options: { logBackend?: boolean } = {},
): Promise<{ backend: "wasm" }> {
  await container.helpers.discoverAll()
  configurePokerContainer(container)

  const alreadyBooted = Boolean(container.state.get("pokerBooted" as any))
  const hasWasm = await equityEngine.hasWasmBackend()
  if (!hasWasm) {
    throw new Error("WASM backend is required for luca-poker but is not available. Run `bun run build:wasm` in playground/luca-poker.")
  }

  const backend = "wasm" as const

  if (!alreadyBooted) {
    await container.helpers.discoverAll()
    container.state.set("pokerBooted" as any, true)

    if (options.logBackend !== false) {
      console.log(`[luca-poker] equity backend: ${backend}`)
    }
  }

  return { backend }
}
