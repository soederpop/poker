import { afterEach, describe, expect, it } from "bun:test"
import { AGIContainer } from "@soederpop/luca/agi"

import { bootPokerContainer } from "../../container"
import PokerServerRuntime from "../../servers/poker-server"
import PokerClient from "../../clients/poker-client"

const PROJECT_CWD = process.cwd()

type WaitPredicate = (message: any) => boolean

function createInbox(subscribe: (listener: (message: any) => void) => () => void) {
  const messages: any[] = []
  const waiters: Array<{
    type: string
    predicate: WaitPredicate
    resolve: (message: any) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }> = []

  const unsubscribe = subscribe((message) => {
    messages.push(message)

    for (const waiter of [...waiters]) {
      if (message?.type !== waiter.type || !waiter.predicate(message)) {
        continue
      }

      clearTimeout(waiter.timer)
      waiters.splice(waiters.indexOf(waiter), 1)
      waiter.resolve(message)
    }
  })

  const waitFor = (type: string, predicate: WaitPredicate = () => true, timeoutMs = 10_000): Promise<any> => {
    const existingIndex = messages.findIndex((message) => message?.type === type && predicate(message))
    if (existingIndex >= 0) {
      return Promise.resolve(messages.splice(existingIndex, 1)[0])
    }

    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = waiters.findIndex((entry) => entry.resolve === resolve)
        if (index >= 0) {
          waiters.splice(index, 1)
        }
        reject(new Error(`Timed out waiting for message '${type}'`))
      }, timeoutMs)

      waiters.push({
        type,
        predicate,
        resolve,
        reject,
        timer,
      })
    })
  }

  const stop = () => {
    unsubscribe()
    for (const waiter of waiters) {
      clearTimeout(waiter.timer)
      waiter.reject(new Error("Inbox stopped"))
    }
    waiters.length = 0
  }

  return { messages, waitFor, stop }
}

type PlayerHarness = {
  container: AGIContainer
  client: PokerClient
  inbox: ReturnType<typeof createInbox>
  close: () => Promise<void>
}

async function registerBot(httpUrl: string, name: string): Promise<{ botId: string; token: string; wsUrl: string }> {
  const response = await fetch(`${httpUrl}/api/v1/bots/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, agentVersion: "integration-test" }),
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(`register failed (${response.status}): ${JSON.stringify(payload)}`)
  }

  return payload as { botId: string; token: string; wsUrl: string }
}

async function connectPlayer(wsUrl: string, token: string): Promise<PlayerHarness> {
  const container = new AGIContainer({ cwd: PROJECT_CWD })
  const client = new PokerClient(container as any, { wsUrl, reconnect: false })
  const inbox = createInbox((listener) => client.onMessage(listener))

  await client.connect()
  await client.authenticate(token)

  return {
    container,
    client,
    inbox,
    close: async () => {
      inbox.stop()
      await client.disconnect()
    },
  }
}

function installAutoPlayer(player: PlayerHarness) {
  const unsubscribe = player.client.onMessage((message) => {
    if (message.type !== "action_on_you") {
      return
    }

    const available = Array.isArray(message.payload?.availableActions)
      ? message.payload.availableActions.map((entry: unknown) => String(entry))
      : []
    const action = available.includes("check")
      ? "check"
      : (available.includes("call") ? "call" : "fold")
    void player.client.send("action", { action })
  })

  return unsubscribe
}

function installAutoFolder(player: PlayerHarness) {
  const unsubscribe = player.client.onMessage((message) => {
    if (message.type !== "action_on_you") {
      return
    }

    const available = Array.isArray(message.payload?.availableActions)
      ? message.payload.availableActions.map((entry: unknown) => String(entry))
      : []
    const action = available.includes("fold")
      ? "fold"
      : (available.includes("check") ? "check" : (available.includes("call") ? "call" : "fold"))
    void player.client.send("action", { action })
  })

  return unsubscribe
}

async function createTable(player: PlayerHarness, name: string, overrides: Record<string, unknown> = {}) {
  await player.client.send("create_table", {
    name,
    blinds: [1, 2],
    startingStack: 120,
    maxPlayers: 2,
    actionTimeout: 1,
    ...overrides,
  })
  const created = await player.inbox.waitFor("table_created")
  return String(created.payload?.id)
}

async function joinTable(player: PlayerHarness, tableId: string) {
  await player.client.send("join_table", { tableId })
  await player.inbox.waitFor("table_joined", (message) => String(message.payload?.tableId || "") === tableId)
}

type SpectatorHarness = {
  ws: WebSocket
  inbox: ReturnType<typeof createInbox>
  close: () => Promise<void>
}

async function connectSpectator(wsUrl: string): Promise<SpectatorHarness> {
  const ws = new WebSocket(wsUrl)

  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = () => reject(new Error(`failed to open spectator websocket: ${wsUrl}`))
  })

  const inbox = createInbox((listener) => {
    ws.onmessage = (event) => {
      let parsed: any = null
      try {
        parsed = JSON.parse(String(event.data || "{}"))
      } catch {
        return
      }
      listener(parsed)
    }

    return () => {
      ws.onmessage = null
    }
  })

  return {
    ws,
    inbox,
    close: async () => {
      inbox.stop()
      ws.close()
      await new Promise((resolve) => setTimeout(resolve, 20))
    },
  }
}

type RuntimeHarness = {
  container: AGIContainer
  runtime: PokerServerRuntime
  httpUrl: string
  wsUrl: string
  spectatorWsUrl?: string
}

async function startRuntime(options: {
  spectator?: boolean
  seedLobby?: boolean
  reconnectGraceMs?: number
  actionTimeout?: number
  timeBankStartSeconds?: number
  timeBankCapSeconds?: number
  timeBankAccrualSeconds?: number
  showdownRevealMs?: number
  nonShowdownRevealMs?: number
  botThinkDelayMinMs?: number
  botThinkDelayMaxMs?: number
} = {}): Promise<RuntimeHarness> {
  const container = new AGIContainer({ cwd: PROJECT_CWD })
  await bootPokerContainer(container as any, { logBackend: false })

  const networking = container.feature("networking", { enable: true }) as any
  const baseSeed = 32000 + Math.floor(Math.random() * 10000)
  const port = await networking.findOpenPort(baseSeed)
  const wsPort = await networking.findOpenPort(port + 1)
  const spectatorPort = options.spectator ? await networking.findOpenPort(wsPort + 1) : undefined

  const runtime = new PokerServerRuntime(container as any, {
    host: "127.0.0.1",
    port,
    wsPort,
    spectatorPort,
    defaultTable: options.seedLobby === true,
    seedLobby: options.seedLobby === true,
    actionTimeout: options.actionTimeout ?? 1,
    reconnectGraceMs: options.reconnectGraceMs ?? 5000,
    timeBankStartSeconds: options.timeBankStartSeconds ?? 2,
    timeBankCapSeconds: options.timeBankCapSeconds ?? 2,
    timeBankAccrualSeconds: options.timeBankAccrualSeconds ?? 1,
    showdownRevealMs: options.showdownRevealMs ?? 4000,
    nonShowdownRevealMs: options.nonShowdownRevealMs ?? 1200,
    botThinkDelayMinMs: options.botThinkDelayMinMs ?? 1200,
    botThinkDelayMaxMs: options.botThinkDelayMaxMs ?? 2600,
  })

  await runtime.start()

  return {
    container,
    runtime,
    httpUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${wsPort}`,
    ...(spectatorPort ? { spectatorWsUrl: `ws://127.0.0.1:${spectatorPort}` } : {}),
  }
}

async function fetchTableState(httpUrl: string, tableId: string): Promise<any> {
  const response = await fetch(`${httpUrl}/api/v1/tables/${encodeURIComponent(tableId)}/state`)
  expect(response.ok).toBeTrue()
  return response.json()
}

async function waitForHandNumberAtLeast(httpUrl: string, tableId: string, handNumber: number, timeoutMs = 15_000): Promise<{ state: any; elapsedMs: number }> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const state = await fetchTableState(httpUrl, tableId)
    if (Number(state.handNumber || 0) >= handNumber) {
      return { state, elapsedMs: Date.now() - startedAt }
    }
    await Bun.sleep(120)
  }
  throw new Error(`Timed out waiting for table ${tableId} to reach hand ${handNumber}`)
}

const runtimeCleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  while (runtimeCleanup.length > 0) {
    const next = runtimeCleanup.pop()
    if (!next) {
      continue
    }
    await next()
  }
})

describe("poker runtime integration", () => {
  it("supports HTTP register then WS auth handshake", async () => {
    const harness = await startRuntime()
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const registration = await registerBot(harness.httpUrl, "handshake-bot")
    expect(registration.botId).toStartWith("bot_")
    expect(registration.token).toStartWith("tok_")

    const player = await connectPlayer(harness.wsUrl, registration.token)
    runtimeCleanup.push(() => player.close())

    const wallet = await player.inbox.waitFor("wallet_state")
    expect(Number(wallet.payload?.balance)).toBeGreaterThan(0)
  }, 25_000)

  it("runs a complete hand lifecycle from deal to hand_result", async () => {
    const harness = await startRuntime()
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const one = await registerBot(harness.httpUrl, "lifecycle-1")
    const two = await registerBot(harness.httpUrl, "lifecycle-2")
    const p1 = await connectPlayer(harness.wsUrl, one.token)
    const p2 = await connectPlayer(harness.wsUrl, two.token)
    runtimeCleanup.push(() => p1.close())
    runtimeCleanup.push(() => p2.close())

    const stopAutoOne = installAutoPlayer(p1)
    const stopAutoTwo = installAutoPlayer(p2)
    runtimeCleanup.push(async () => { stopAutoOne(); stopAutoTwo() })

    const tableId = await createTable(p1, "lifecycle-table")
    await joinTable(p1, tableId)
    await joinTable(p2, tableId)

    await p1.inbox.waitFor("deal", (message) => String(message.payload?.tableId || "") === tableId, 15_000)
    await p1.inbox.waitFor("action_taken", () => true, 15_000)
    const result = await p1.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableId, 20_000)
    expect(Array.isArray(result.payload?.winners)).toBeTrue()
  }, 35_000)

  it("consumes time bank after base timeout and accrues after hand", async () => {
    const harness = await startRuntime({
      timeBankStartSeconds: 2,
      timeBankCapSeconds: 2,
      timeBankAccrualSeconds: 1,
    })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const one = await registerBot(harness.httpUrl, "clock-1")
    const two = await registerBot(harness.httpUrl, "clock-2")
    const p1 = await connectPlayer(harness.wsUrl, one.token)
    const p2 = await connectPlayer(harness.wsUrl, two.token)
    runtimeCleanup.push(() => p1.close())
    runtimeCleanup.push(() => p2.close())

    const stopAutoTwo = installAutoPlayer(p2)
    runtimeCleanup.push(async () => { stopAutoTwo() })

    const tableId = await createTable(p1, "clock-table")
    await joinTable(p1, tableId)
    await joinTable(p2, tableId)

    await p1.inbox.waitFor("timebank_state", (message) => String(message.payload?.reason || "") === "turn_start", 20_000)
    await p2.inbox.waitFor("action_taken", (message) => String(message.payload?.reason || "") === "timeout-bank-depleted", 20_000)

    const consumed = await p1.inbox.waitFor("timebank_state", (message) => String(message.payload?.reason || "") === "timeout-bank-depleted", 20_000)
    expect(Number(consumed.payload?.consumedSeconds || 0)).toBeGreaterThan(0)

    await p1.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableId, 20_000)
    const accrual = await p1.inbox.waitFor("timebank_state", (message) => String(message.payload?.reason || "") === "hand_accrual", 20_000)
    expect(Number(accrual.payload?.timeBankRemaining || 0)).toBeGreaterThan(0)
  }, 45_000)

  it("allows reconnect resume within grace window", async () => {
    const harness = await startRuntime({
      reconnectGraceMs: 6000,
      timeBankStartSeconds: 4,
      timeBankCapSeconds: 4,
      timeBankAccrualSeconds: 0,
    })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const one = await registerBot(harness.httpUrl, "reconnect-1")
    const two = await registerBot(harness.httpUrl, "reconnect-2")
    const p1 = await connectPlayer(harness.wsUrl, one.token)
    const p2 = await connectPlayer(harness.wsUrl, two.token)
    runtimeCleanup.push(() => p1.close())
    runtimeCleanup.push(() => p2.close())

    const stopAutoTwo = installAutoPlayer(p2)
    runtimeCleanup.push(async () => { stopAutoTwo() })

    const tableId = await createTable(p1, "reconnect-table")
    await joinTable(p1, tableId)
    await joinTable(p2, tableId)

    await p1.inbox.waitFor("action_on_you", (message) => String(message.payload?.tableId || "") === tableId, 20_000)
    await p1.close()

    const p1Reconnected = await connectPlayer(harness.wsUrl, one.token)
    runtimeCleanup.push(() => p1Reconnected.close())

    const resumed = await p1Reconnected.inbox.waitFor(
      "action_on_you",
      (message) => message.payload?.resumed === true && String(message.payload?.tableId || "") === tableId,
      20_000,
    )
    expect(resumed.payload?.resumed).toBeTrue()

    const available = Array.isArray(resumed.payload?.availableActions)
      ? resumed.payload.availableActions.map((entry: unknown) => String(entry))
      : []
    const action = available.includes("check")
      ? "check"
      : (available.includes("call") ? "call" : "fold")
    await p1Reconnected.client.send("action", { action })

    await p2.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableId, 20_000)
  }, 45_000)

  it("runs multiple tables concurrently with independent hands", async () => {
    const harness = await startRuntime()
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const bots = await Promise.all([
      registerBot(harness.httpUrl, "multi-1"),
      registerBot(harness.httpUrl, "multi-2"),
      registerBot(harness.httpUrl, "multi-3"),
      registerBot(harness.httpUrl, "multi-4"),
    ])

    const players = await Promise.all(bots.map((bot) => connectPlayer(harness.wsUrl, bot.token)))
    for (const player of players) {
      runtimeCleanup.push(() => player.close())
    }

    const stops = players.map((player) => installAutoPlayer(player))
    runtimeCleanup.push(async () => {
      for (const stop of stops) {
        stop()
      }
    })

    const tableOneId = await createTable(players[0]!, "multi-table-one")
    const tableTwoId = await createTable(players[2]!, "multi-table-two")

    await joinTable(players[0]!, tableOneId)
    await joinTable(players[1]!, tableOneId)
    await joinTable(players[2]!, tableTwoId)
    await joinTable(players[3]!, tableTwoId)

    const handOne = await players[0]!.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableOneId, 20_000)
    const handTwo = await players[2]!.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableTwoId, 20_000)

    expect(String(handOne.payload?.tableId || "")).toBe(tableOneId)
    expect(String(handTwo.payload?.tableId || "")).toBe(tableTwoId)
    expect(tableOneId).not.toBe(tableTwoId)
  }, 45_000)

  it("streams table state/events over dedicated spectator port", async () => {
    const harness = await startRuntime({ spectator: true })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const one = await registerBot(harness.httpUrl, "spectator-1")
    const two = await registerBot(harness.httpUrl, "spectator-2")
    const p1 = await connectPlayer(harness.wsUrl, one.token)
    const p2 = await connectPlayer(harness.wsUrl, two.token)
    runtimeCleanup.push(() => p1.close())
    runtimeCleanup.push(() => p2.close())

    const stopAutoOne = installAutoPlayer(p1)
    const stopAutoTwo = installAutoPlayer(p2)
    runtimeCleanup.push(async () => {
      stopAutoOne()
      stopAutoTwo()
    })

    const tableId = await createTable(p1, "spectator-table")
    await joinTable(p1, tableId)
    await joinTable(p2, tableId)

    const spectatorUrl = String(harness.spectatorWsUrl || "")
    expect(spectatorUrl.length > 0).toBeTrue()

    const spectator = await connectSpectator(spectatorUrl)
    runtimeCleanup.push(() => spectator.close())

    await spectator.inbox.waitFor("spectator_ready", () => true, 10_000)
    spectator.ws.send(JSON.stringify({
      type: "spectate",
      payload: { tableId },
    }))

    await spectator.inbox.waitFor("spectator_joined", (message) => String(message.payload?.tableId || "") === tableId, 10_000)
    const state = await spectator.inbox.waitFor("spectator_state", (message) => String(message.payload?.tableId || "") === tableId, 20_000)
    expect(Array.isArray(state.payload?.players)).toBeTrue()
    expect(state.payload?.players?.[0]?.cards).toBeUndefined()

    const action = await spectator.inbox.waitFor("action_taken", (message) => String(message.payload?.tableId || "") === tableId, 20_000)
    expect(String(action.payload?.tableId || "")).toBe(tableId)

    const hand = await spectator.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableId, 20_000)
    expect(Number(hand.payload?.pot || 0)).toBeGreaterThan(0)
    expect(Array.isArray(hand.payload?.board)).toBeTrue()
  }, 45_000)

  it("exposes leaderboard and agent profile APIs", async () => {
    const harness = await startRuntime()
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const one = await registerBot(harness.httpUrl, "leaderboard-1")
    const two = await registerBot(harness.httpUrl, "leaderboard-2")
    const p1 = await connectPlayer(harness.wsUrl, one.token)
    const p2 = await connectPlayer(harness.wsUrl, two.token)
    runtimeCleanup.push(() => p1.close())
    runtimeCleanup.push(() => p2.close())

    const stopAutoOne = installAutoPlayer(p1)
    const stopAutoTwo = installAutoPlayer(p2)
    runtimeCleanup.push(async () => {
      stopAutoOne()
      stopAutoTwo()
    })

    const tableId = await createTable(p1, "leaderboard-table")
    await joinTable(p1, tableId)
    await joinTable(p2, tableId)
    await p1.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableId, 20_000)

    const leaderboardResponse = await fetch(`${harness.httpUrl}/api/v1/leaderboard?limit=20`)
    expect(leaderboardResponse.ok).toBeTrue()
    const leaderboard = await leaderboardResponse.json()
    expect(Array.isArray(leaderboard.entries)).toBeTrue()
    expect(leaderboard.entries.length).toBeGreaterThan(0)
    expect(Number.isFinite(Number(leaderboard.entries[0]?.netProfit || 0))).toBeTrue()

    const leaderboardByWinsResponse = await fetch(`${harness.httpUrl}/api/v1/leaderboard?limit=20&sort=wins`)
    expect(leaderboardByWinsResponse.ok).toBeTrue()
    const leaderboardByWins = await leaderboardByWinsResponse.json()
    expect(String(leaderboardByWins.sortBy || "")).toBe("wins")

    const profileResponse = await fetch(`${harness.httpUrl}/api/v1/agents/${encodeURIComponent(one.botId)}`)
    expect(profileResponse.ok).toBeTrue()
    const profile = await profileResponse.json()
    expect(profile.botId).toBe(one.botId)
    expect(Array.isArray(profile.recentHands)).toBeTrue()
  }, 45_000)

  it("resets leaderboard baseline from local server state", async () => {
    const harness = await startRuntime()
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const one = await registerBot(harness.httpUrl, "reset-1")
    const two = await registerBot(harness.httpUrl, "reset-2")
    const p1 = await connectPlayer(harness.wsUrl, one.token)
    const p2 = await connectPlayer(harness.wsUrl, two.token)
    runtimeCleanup.push(() => p1.close())
    runtimeCleanup.push(() => p2.close())

    const stopAutoOne = installAutoPlayer(p1)
    const stopAutoTwo = installAutoPlayer(p2)
    runtimeCleanup.push(async () => {
      stopAutoOne()
      stopAutoTwo()
    })

    const tableId = await createTable(p1, "reset-table")
    await joinTable(p1, tableId)
    await joinTable(p2, tableId)
    await p1.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableId, 20_000)

    const beforeResponse = await fetch(`${harness.httpUrl}/api/v1/leaderboard?limit=20`)
    expect(beforeResponse.ok).toBeTrue()
    const beforePayload = await beforeResponse.json()
    expect(Array.isArray(beforePayload.entries)).toBeTrue()
    expect(Number(beforePayload.entries[0]?.totalHands || 0)).toBeGreaterThan(0)

    const resetAt = Date.now()
    const resetKey = `poker:server:${harness.runtime.serverId}:leaderboard:reset-state`
    const invalidationsKey = `poker:server:${harness.runtime.serverId}:leaderboard:invalidations`
    await harness.runtime.diskCache.set(resetKey, { resetAt, updatedAt: resetAt })
    await harness.runtime.diskCache.set(invalidationsKey, { hands: [], tables: [], tournaments: [], updatedAt: resetAt })

    const statusResponse = await fetch(`${harness.httpUrl}/api/v1/leaderboard/status`)
    expect(statusResponse.ok).toBeTrue()
    const statusPayload = await statusResponse.json()
    expect(String(statusPayload.resetAt || "").length).toBeGreaterThan(0)

    const afterResponse = await fetch(`${harness.httpUrl}/api/v1/leaderboard?limit=20`)
    expect(afterResponse.ok).toBeTrue()
    const afterPayload = await afterResponse.json()
    expect(Array.isArray(afterPayload.entries)).toBeTrue()
    expect(Number(afterPayload.entries[0]?.totalHands || 0)).toBe(0)
  }, 45_000)

  it("reports house liveness, readiness, and actor registry status", async () => {
    const harness = await startRuntime({ seedLobby: true })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const liveResponse = await fetch(`${harness.httpUrl}/health/live`)
    expect(liveResponse.ok).toBeTrue()
    const livePayload = await liveResponse.json()
    expect(String(livePayload.status || "")).toBe("up")

    const readyResponse = await fetch(`${harness.httpUrl}/health/ready`)
    expect(readyResponse.ok).toBeTrue()
    const readyPayload = await readyResponse.json()
    expect(readyPayload.ready).toBeTrue()
    expect(Array.isArray(readyPayload.actorRegistry?.actorIds)).toBeTrue()
    expect(readyPayload.actorRegistry.actorIds.includes("nit")).toBeTrue()

    const statusResponse = await fetch(`${harness.httpUrl}/api/v1/house/status`)
    expect(statusResponse.ok).toBeTrue()
    const statusPayload = await statusResponse.json()
    expect(String(statusPayload.status || "")).toBe("up")
    expect(Number(statusPayload.actorRegistry?.loaded || 0)).toBeGreaterThan(0)
    expect(Number(statusPayload.houseBots?.seated || 0)).toBeGreaterThanOrEqual(2)
  }, 45_000)

  it("uses Luca frontend routes as canonical web surface", async () => {
    const harness = await startRuntime({ spectator: true, seedLobby: true })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const rootResponse = await fetch(`${harness.httpUrl}/`, { redirect: "manual" })
    expect(rootResponse.status).toBe(302)
    expect(rootResponse.headers.get("location")).toBe("/app/")

    const spectatorResponse = await fetch(`${harness.httpUrl}/spectator?tableId=table_123`, { redirect: "manual" })
    expect(spectatorResponse.status).toBe(302)
    expect(spectatorResponse.headers.get("location")).toBe("/app/#/spectator?tableId=table_123")

    const legacyResponse = await fetch(`${harness.httpUrl}/web/spectator?tableId=table_123`, { redirect: "manual" })
    expect(legacyResponse.status).toBe(302)
    expect(legacyResponse.headers.get("location")).toBe("/app/#/spectator?tableId=table_123")

    const tournamentsResponse = await fetch(`${harness.httpUrl}/api/v1/tournaments/live`)
    expect(tournamentsResponse.ok).toBeTrue()
    const tournamentsPayload = await tournamentsResponse.json()
    const tournaments = Array.isArray(tournamentsPayload.tournaments) ? tournamentsPayload.tournaments as Array<any> : []
    expect(tournaments.length).toBeGreaterThan(0)
    expect(String(tournaments[0]?.spectateUrl || "")).toStartWith("/app/#/spectator?tableId=")
  }, 45_000)

  it("supports tournament list and registration protocol", async () => {
    const harness = await startRuntime({ seedLobby: true })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const registration = await registerBot(harness.httpUrl, "tournament-joiner")
    const player = await connectPlayer(harness.wsUrl, registration.token)
    runtimeCleanup.push(() => player.close())

    await player.client.send("list_tournaments", {})
    const tournaments = await player.inbox.waitFor("tournaments", () => true, 10_000)
    const rows = Array.isArray(tournaments.payload?.tournaments) ? tournaments.payload.tournaments as Array<any> : []
    expect(rows.length).toBeGreaterThan(0)

    const sng = rows.find((entry) => String(entry.id || "").startsWith("sng-"))
    expect(Boolean(sng)).toBeTrue()

    await player.client.send("register_tournament", { tournamentId: String(sng.id) })
    const start = await player.inbox.waitFor("tournament_start", (message) => String(message.payload?.tournamentId || "") === String(sng.id), 15_000)
    expect(String(start.payload?.tableId || "")).toBe(String(sng.tableId || ""))
  }, 45_000)

  it("seeds an active showcase table for spectators when lobby seeding is enabled", async () => {
    const harness = await startRuntime({ seedLobby: true })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const response = await fetch(`${harness.httpUrl}/api/v1/tables`)
    expect(response.ok).toBeTrue()
    const payload = await response.json()
    const tables = Array.isArray(payload.tables) ? payload.tables as Array<any> : []

    const showcase = tables.find((entry) => String(entry.name || "").toLowerCase().startsWith("showcase bots"))
    expect(Boolean(showcase)).toBeTrue()
    expect(String(showcase.status || "")).toBe("active")

    const players = Array.isArray(showcase.players) ? showcase.players as Array<any> : []
    expect(players.length).toBeGreaterThanOrEqual(2)
    expect(players.every((player) => player?.isHouseBot === true)).toBeTrue()
    expect(showcase.handActive).toBeTrue()
  }, 45_000)

  it("auto-finalizes all-in runouts so showcase hands do not stall", async () => {
    const harness = await startRuntime({ spectator: true, seedLobby: true })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const tablesResponse = await fetch(`${harness.httpUrl}/api/v1/tables`)
    expect(tablesResponse.ok).toBeTrue()
    const tablesPayload = await tablesResponse.json()
    const tables = Array.isArray(tablesPayload.tables) ? tablesPayload.tables as Array<any> : []
    const showcase = tables.find((entry) => String(entry?.name || "").toLowerCase().startsWith("showcase bots"))
    expect(Boolean(showcase)).toBeTrue()

    const tableId = String(showcase?.id || "")
    expect(tableId.length > 0).toBeTrue()

    const spectatorUrl = String(harness.spectatorWsUrl || "")
    expect(spectatorUrl.length > 0).toBeTrue()

    const spectator = await connectSpectator(spectatorUrl)
    runtimeCleanup.push(() => spectator.close())

    await spectator.inbox.waitFor("spectator_ready", () => true, 10_000)
    spectator.ws.send(JSON.stringify({
      type: "spectate",
      payload: { tableId },
    }))

    await spectator.inbox.waitFor("spectator_joined", (message) => String(message.payload?.tableId || "") === tableId, 10_000)
    const handResult = await spectator.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableId, 35_000)
    expect(Number(handResult.payload?.pot || 0)).toBeGreaterThan(0)
    expect(Number(handResult.payload?.handNumber || 0)).toBeGreaterThanOrEqual(1)

    const handsResponse = await fetch(`${harness.httpUrl}/api/v1/hands?tableId=${encodeURIComponent(tableId)}&limit=5`)
    expect(handsResponse.ok).toBeTrue()
    const handsPayload = await handsResponse.json()
    expect(Number(handsPayload.total || 0)).toBeGreaterThan(0)
  }, 50_000)

  it("keeps showdown visible for at least four seconds before next hand starts", async () => {
    const harness = await startRuntime({
      showdownRevealMs: 4000,
    })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const one = await registerBot(harness.httpUrl, "showdown-delay-1")
    const two = await registerBot(harness.httpUrl, "showdown-delay-2")
    const p1 = await connectPlayer(harness.wsUrl, one.token)
    const p2 = await connectPlayer(harness.wsUrl, two.token)
    runtimeCleanup.push(() => p1.close())
    runtimeCleanup.push(() => p2.close())

    const stopAutoOne = installAutoPlayer(p1)
    const stopAutoTwo = installAutoPlayer(p2)
    runtimeCleanup.push(async () => {
      stopAutoOne()
      stopAutoTwo()
    })

    const tableId = await createTable(p1, "showdown-delay-table")
    await joinTable(p1, tableId)
    await joinTable(p2, tableId)

    const handResult = await p1.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableId, 25_000)
    const completedHand = Number(handResult.payload?.handNumber || 0)
    expect(completedHand).toBeGreaterThan(0)
    expect(Array.isArray(handResult.payload?.showdown)).toBeTrue()
    expect((handResult.payload?.showdown || []).length).toBeGreaterThanOrEqual(2)

    const revealState = await fetchTableState(harness.httpUrl, tableId)
    expect(Number(revealState.handNumber || 0)).toBe(completedHand)
    expect(String(revealState.stage || "")).not.toBe("waiting")
    expect(Array.isArray(revealState.board)).toBeTrue()
    expect((revealState.board || []).length).toBe(5)

    const progress = await waitForHandNumberAtLeast(harness.httpUrl, tableId, completedHand + 1, 20_000)
    expect(progress.elapsedMs).toBeGreaterThanOrEqual(3600)
  }, 45_000)

  it("does not enforce four-second hold when a hand ends without showdown", async () => {
    const harness = await startRuntime({
      showdownRevealMs: 4000,
      nonShowdownRevealMs: 1200,
    })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const one = await registerBot(harness.httpUrl, "nonsd-delay-1")
    const two = await registerBot(harness.httpUrl, "nonsd-delay-2")
    const p1 = await connectPlayer(harness.wsUrl, one.token)
    const p2 = await connectPlayer(harness.wsUrl, two.token)
    runtimeCleanup.push(() => p1.close())
    runtimeCleanup.push(() => p2.close())

    const stopAutoOne = installAutoPlayer(p1)
    const stopAutoTwo = installAutoFolder(p2)
    runtimeCleanup.push(async () => {
      stopAutoOne()
      stopAutoTwo()
    })

    const tableId = await createTable(p1, "nonsd-delay-table")
    await joinTable(p1, tableId)
    await joinTable(p2, tableId)

    const handResult = await p1.inbox.waitFor("hand_result", (message) => String(message.payload?.tableId || "") === tableId, 25_000)
    const completedHand = Number(handResult.payload?.handNumber || 0)
    expect(completedHand).toBeGreaterThan(0)
    expect(Array.isArray(handResult.payload?.showdown)).toBeFalse()

    const progress = await waitForHandNumberAtLeast(harness.httpUrl, tableId, completedHand + 1, 12_000)
    expect(progress.elapsedMs).toBeLessThan(3500)
  }, 45_000)

  it("showcase runtime progresses through consecutive hands with payout invariants", async () => {
    const harness = await startRuntime({
      spectator: true,
      seedLobby: true,
      actionTimeout: 1,
      timeBankStartSeconds: 1,
      timeBankCapSeconds: 1,
      timeBankAccrualSeconds: 0,
      showdownRevealMs: 4000,
      nonShowdownRevealMs: 1200,
      botThinkDelayMinMs: 10,
      botThinkDelayMaxMs: 40,
    })
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const tablesResponse = await fetch(`${harness.httpUrl}/api/v1/tables`)
    expect(tablesResponse.ok).toBeTrue()
    const tablesPayload = await tablesResponse.json()
    const tables = Array.isArray(tablesPayload.tables) ? tablesPayload.tables as Array<any> : []
    const showcase = tables.find((entry) => String(entry?.name || "").toLowerCase().startsWith("showcase bots"))
    expect(Boolean(showcase)).toBeTrue()

    const tableId = String(showcase?.id || "")
    expect(tableId.length > 0).toBeTrue()

    const spectatorUrl = String(harness.spectatorWsUrl || "")
    expect(spectatorUrl.length > 0).toBeTrue()

    const spectator = await connectSpectator(spectatorUrl)
    runtimeCleanup.push(() => spectator.close())

    await spectator.inbox.waitFor("spectator_ready", () => true, 10_000)
    spectator.ws.send(JSON.stringify({
      type: "spectate",
      payload: { tableId },
    }))
    await spectator.inbox.waitFor("spectator_joined", (message) => String(message.payload?.tableId || "") === tableId, 10_000)

    const completedHands: number[] = []
    let minHandNumber = 1
    for (let index = 0; index < 3; index += 1) {
      const handResult = await spectator.inbox.waitFor(
        "hand_result",
        (message) => {
          if (String(message.payload?.tableId || "") !== tableId) {
            return false
          }
          return Number(message.payload?.handNumber || 0) >= minHandNumber
        },
        45_000,
      )

      const handNumber = Number(handResult.payload?.handNumber || 0)
      expect(handNumber).toBeGreaterThan(0)
      completedHands.push(handNumber)
      minHandNumber = handNumber + 1

      const winners = Array.isArray(handResult.payload?.winners) ? handResult.payload.winners as Array<any> : []
      expect(winners.length).toBeGreaterThan(0)
      const payoutTotal = winners.reduce((sum, winner) => sum + Number(winner?.amount || 0), 0)
      expect(payoutTotal).toBe(Number(handResult.payload?.pot || 0))

      const state = await fetchTableState(harness.httpUrl, tableId)
      expect(Number(state.handNumber || 0)).toBe(handNumber)
      expect(Array.isArray(state.board)).toBeTrue()
      expect((state.board || []).length).toBe(5)
    }

    expect(completedHands[1]).toBe(completedHands[0]! + 1)
    expect(completedHands[2]).toBe(completedHands[1]! + 1)

    const handsResponse = await fetch(`${harness.httpUrl}/api/v1/hands?tableId=${encodeURIComponent(tableId)}&limit=10`)
    expect(handsResponse.ok).toBeTrue()
    const handsPayload = await handsResponse.json()
    expect(Number(handsPayload.total || 0)).toBeGreaterThanOrEqual(3)
  }, 95_000)

  it("serves deterministic golden fixture replay API with all-in coverage", async () => {
    const harness = await startRuntime()
    runtimeCleanup.push(() => harness.runtime.stop().then(() => undefined))

    const listResponse = await fetch(`${harness.httpUrl}/api/v1/fixtures/golden`)
    expect(listResponse.ok).toBeTrue()

    const listPayload = await listResponse.json()
    const fixtures = Array.isArray(listPayload.fixtures) ? listPayload.fixtures as Array<any> : []
    expect(fixtures.length).toBeGreaterThan(0)
    expect(fixtures.some((entry) => String(entry.id || "").includes("allin"))).toBeTrue()

    const targetFixtureId = String(fixtures[0]?.id || "")
    expect(targetFixtureId.length > 0).toBeTrue()

    const replayResponse = await fetch(`${harness.httpUrl}/api/v1/fixtures/golden/${encodeURIComponent(targetFixtureId)}/replay`)
    expect(replayResponse.ok).toBeTrue()

    const replay = await replayResponse.json()
    expect(String(replay.fixtureId || "")).toBe(targetFixtureId)
    expect(Array.isArray(replay.frames)).toBeTrue()
    expect(replay.frames.length).toBeGreaterThan(1)
    expect(String(replay.frames[1]?.eventType || "")).toBe("PostBlinds")
  }, 45_000)
})
