#!/usr/bin/env bun

import { AGIContainer } from "@soederpop/luca/agi"

import { bootPokerContainer } from "../container"
import PokerServerRuntime from "../servers/poker-server"

const PROJECT_CWD = process.cwd()

async function registerBot(httpUrl: string, name: string): Promise<{ token: string; wsUrl: string }> {
  const res = await fetch(`${httpUrl}/api/v1/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`Failed to register ${name}: ${res.status}`)
  const payload = await res.json() as any
  return { token: String(payload.token || ""), wsUrl: String(payload.wsUrl || "") }
}

async function connectAutoPlayer(wsUrl: string, token: string, tableId: string): Promise<WebSocket> {
  const ws = new WebSocket(wsUrl)

  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = () => reject(new Error("websocket failed to open"))
  })

  ws.send(JSON.stringify({ type: "auth", payload: { token } }))

  ws.onmessage = (event) => {
    let msg: any
    try { msg = JSON.parse(String(event.data || "{}")) } catch { return }

    if (msg?.type === "authenticated") {
      ws.send(JSON.stringify({ type: "join_table", payload: { tableId } }))
    }

    if (msg?.type === "action_on_you") {
      const actions: string[] = Array.isArray(msg.payload?.availableActions) ? msg.payload.availableActions : ["fold"]
      const action = actions.includes("check") ? "check" : actions.includes("call") ? "call" : "fold"
      ws.send(JSON.stringify({ type: "action", payload: { action } }))
    }
  }

  return ws
}

async function main() {
  const container = new AGIContainer({ cwd: PROJECT_CWD })
  await bootPokerContainer(container as any, { logBackend: false })

  const networking = container.feature("networking", { enable: true }) as any
  const base = 35000 + Math.floor(Math.random() * 1000)
  const port = await networking.findOpenPort(base)
  const wsPort = await networking.findOpenPort(port + 1)
  const spectatorPort = await networking.findOpenPort(wsPort + 1)

  const httpUrl = `http://127.0.0.1:${port}`
  const wsUrl = `ws://127.0.0.1:${wsPort}`

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
  })

  await runtime.start()
  console.log(`[demo] server started ${httpUrl} ws ${wsUrl} spectator ws://127.0.0.1:${spectatorPort}`)

  // Create a table
  const table = (runtime as any).tableManager.createTable({
    name: "Demo Table",
    blinds: [1, 2],
    startingStack: 120,
    maxPlayers: 6,
    actionTimeout: 2,
  })
  console.log(`[demo] created table ${table.id}`)

  // Connect spectator
  const spectator = new WebSocket(`ws://127.0.0.1:${spectatorPort}`)
  await new Promise<void>((resolve, reject) => {
    spectator.onopen = () => resolve()
    spectator.onerror = () => reject(new Error("spectator websocket failed to open"))
  })
  spectator.send(JSON.stringify({ type: "spectate", payload: { tableId: table.id } }))

  // Register and connect 4 bot clients
  const clients: WebSocket[] = []
  for (let i = 1; i <= 4; i += 1) {
    const { token } = await registerBot(httpUrl, `demo-bot-${i}`)
    const ws = await connectAutoPlayer(wsUrl, token, table.id)
    clients.push(ws)
  }
  console.log("[demo] 4 bots seated; waiting for hand_result ...")

  const handDone = new Promise<void>((resolve) => {
    spectator.onmessage = (event) => {
      let msg: any
      try { msg = JSON.parse(String(event.data || "{}")) } catch { return }

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

  await handDone

  console.log("[demo] done. stopping server.")
  spectator.close()
  for (const ws of clients) ws.close()
  await runtime.stop()
}

main().catch((error) => {
  console.error("[demo] failed", error)
  process.exit(1)
})
