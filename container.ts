import type { AGIContainer } from "@soederpop/luca/agi"
import { equityEngine } from "@pokurr/core"
import { join } from "path"
import { mkdirSync, existsSync } from "fs"

import "./features/game-engine"
import "./features/strategy"
import "./features/table-manager"

export type BootMode = "project" | "standalone"

export type PokerContainerServices = {
  diskCache: any
  gameEngine: any
  strategy: any
  tableManager: any
}

function pokurrHomeDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "~"
  return join(home, ".pokurr")
}

function ensurePokurrHome(): string {
  const dir = pokurrHomeDir()
  const cacheDir = join(dir, "cache")

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true })
  }

  return dir
}

export function isStandaloneMode(container: AGIContainer): boolean {
  return container.state.get("pokurrBootMode" as any) === "standalone"
}

export function configurePokerContainer(container: AGIContainer, mode: BootMode = "project"): PokerContainerServices {
  const standalone = mode === "standalone"

  if (!standalone) {
    container.docs = container.feature("contentDb", {
      rootPath: container.paths.resolve("docs"),
    })
  }

  const cachePath = standalone
    ? join(pokurrHomeDir(), "cache")
    : container.paths.resolve("tmp", "poker-cache")

  const diskCache = container.feature("diskCache", {
    enable: true,
    path: cachePath,
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
  options: { logBackend?: boolean; mode?: BootMode } = {},
): Promise<{ backend: "wasm" }> {
  const mode = options.mode || "project"

  await container.helpers.discoverAll()
  configurePokerContainer(container, mode)

  if (mode === "standalone") {
    ensurePokurrHome()
  }

  container.state.set("pokurrBootMode" as any, mode)

  const alreadyBooted = Boolean(container.state.get("pokerBooted" as any))
  const hasWasm = await equityEngine.hasWasmBackend()
  if (!hasWasm) {
    throw new Error("WASM backend is required for luca-poker but is not available. Run `bun run build:wasm` from the project root.")
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
