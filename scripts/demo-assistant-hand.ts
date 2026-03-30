#!/usr/bin/env bun

import { AGIContainer } from "@soederpop/luca/agi"

import { bootPokerContainer } from "../container"
import PokerServerRuntime from "../servers/poker-server"

const PROJECT_CWD = process.cwd()

async function main() {
  const container = new AGIContainer({ cwd: PROJECT_CWD })
  await bootPokerContainer(container as any, { logBackend: false })

  const networking = container.feature("networking", { enable: true }) as any
  const base = 35000 + Math.floor(Math.random() * 1000)
  const port = await networking.findOpenPort(base)
  const wsPort = await networking.findOpenPort(port + 1)
  const spectatorPort = await networking.findOpenPort(wsPort + 1)

  const runtime = new PokerServerRuntime(container as any, {
    host: "127.0.0.1",
    port,
    wsPort,
    spectatorPort,
    seedLobby: false,
    defaultTable: false,
    actionTimeout: 2,
    reconnectGraceMs: 5_000,
    timeBankStartSeconds: 2,
    timeBankCapSeconds: 2,
    timeBankAccrualSeconds: 1,
    showdownRevealMs: 2_000,
    nonShowdownRevealMs: 800,
    botThinkDelayMinMs: 80,
    botThinkDelayMaxMs: 180,
  })

  await runtime.start()
  console.log(`[demo] server started http://127.0.0.1:${port} ws://127.0.0.1:${wsPort} spectator=ws://127.0.0.1:${spectatorPort}`)

  const spectator = new WebSocket(`ws://127.0.0.1:${spectatorPort}`)
  await new Promise<void>((resolve, reject) => {
    spectator.onopen = () => resolve()
    spectator.onerror = () => reject(new Error("spectator websocket failed to open"))
  })

  const table = (runtime as any).tableManager.createTable({
    name: "Showcase Bots AI Demo",
    blinds: [1, 2],
    startingStack: 120,
    maxPlayers: 6,
    actionTimeout: 2,
    preferredHouseActor: "ai-player",
  })

  const tableRuntime = (runtime as any).ensureRuntime(table)

  for (let i = 0; i < 6; i += 1) {
    const ok = (runtime as any).addHouseBotToTable(table, tableRuntime)
    if (!ok) {
      throw new Error(`failed to seat house bot ${i + 1}`)
    }
  }

  console.log(`[demo] created table ${table.id} with 6 ai-player bots`)

  spectator.send(JSON.stringify({ type: "spectate", payload: { tableId: table.id } }))

  const handDone = new Promise<void>((resolve) => {
    spectator.onmessage = (event) => {
      let msg: any
      try {
        msg = JSON.parse(String(event.data || "{}"))
      } catch {
        return
      }

      if (msg?.type === "action_taken") {
        const p = msg.payload || {}
        const amount = p.amount !== undefined ? ` ${p.amount}` : ""
        console.log(`[event] ${p.playerName} -> ${p.action}${amount} (${p.reason || ""})`)
      }

      if (msg?.type === "hand_result") {
        const p = msg.payload || {}
        console.log(`[event] hand_result #${p.handNumber} winners=${JSON.stringify(p.winners || [])}`)
        resolve()
      }
    }
  })

  await (runtime as any).startHandIfReady(table.id, "demo-script")
  console.log("[demo] hand started; waiting for hand_result ...")

  await handDone

  console.log("[demo] done. stopping server.")
  spectator.close()
  await runtime.stop()
}

main().catch((error) => {
  console.error("[demo] failed", error)
  process.exit(1)
})
