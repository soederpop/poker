function addFeed(text) {
  const feed = document.getElementById("feed")
  const div = document.createElement("div")
  div.className = "event fade-up"
  div.textContent = `${new Date().toLocaleTimeString()}  ${text}`
  feed.prepend(div)
  while (feed.children.length > 80) {
    feed.removeChild(feed.lastChild)
  }
}

function drawBoard(cards) {
  const board = document.getElementById("board")
  board.innerHTML = ""
  for (const card of cards || []) {
    const div = document.createElement("div")
    div.className = "card-chip"
    div.textContent = card
    board.appendChild(div)
  }
  if (!cards || cards.length === 0) {
    const empty = document.createElement("div")
    empty.className = "subtle"
    empty.textContent = "Waiting for board cards"
    board.appendChild(empty)
  }
}

function drawSeats(players) {
  const seats = document.getElementById("seats")
  seats.innerHTML = ""
  for (const player of (players || []).slice().sort((a, b) => a.seat - b.seat)) {
    const div = document.createElement("div")
    div.className = "seat fade-up"
    const tags = [
      player.inHand === false ? "out" : "",
      player.folded ? "folded" : "",
      player.allIn ? "all-in" : "",
      player.isHouseBot ? "house" : "",
    ].filter(Boolean).join(" · ")

    div.innerHTML = `
      <div style="font-weight:700;">${player.name}</div>
      <div class="meta">
        <span>Seat ${player.seat}</span>
        <span>Stack ${player.stack}</span>
      </div>
      <div class="subtle" style="margin-top:.25rem;">${tags || "active"}</div>
    `
    seats.appendChild(div)
  }
}

async function resolveSocketAndTable() {
  const params = new URLSearchParams(window.location.search)
  const explicitWs = params.get("ws")
  const explicitTable = params.get("tableId")

  const health = await fetch("/api/v1/health").then((res) => res.json())
  const wsUrl = explicitWs || health.spectatorWsUrl
  if (!wsUrl) {
    throw new Error("Server does not expose spectator websocket. Start with --spectatorPort.")
  }

  let tableId = explicitTable
  if (!tableId) {
    try {
      const tablesPayload = await fetch("/api/v1/tables").then((res) => res.json())
      const tables = Array.isArray(tablesPayload.tables) ? tablesPayload.tables : []
      const ranked = tables
        .filter((table) => table && table.id)
        .map((table) => {
          const name = String(table.name || "").toLowerCase()
          const players = Array.isArray(table.players) ? table.players.length : Number(table.players || 0)
          const status = String(table.status || "")
          const handActive = table.handActive === true

          let score = 0
          if (name.startsWith("showcase bots")) score += 100
          if (status === "active") score += 50
          if (handActive) score += 30
          if (players >= 2) score += 20
          score += Math.min(10, players)
          if (status === "closed") score -= 100
          return { id: String(table.id), score }
        })
        .sort((left, right) => right.score - left.score)

      tableId = ranked[0]?.id || ""
    } catch {}
  }

  if (!tableId) {
    const tournamentsPayload = await fetch("/api/v1/tournaments/live").then((res) => res.json())
    tableId = tournamentsPayload.tournaments?.[0]?.tableId || ""
  }

  if (!tableId) {
    throw new Error("No tableId available. Pass ?tableId=<id> in URL.")
  }

  return { wsUrl, tableId }
}

async function boot() {
  const meta = document.getElementById("meta")
  const tableEl = document.getElementById("table")

  const { wsUrl, tableId } = await resolveSocketAndTable()
  tableEl.textContent = tableId
  meta.textContent = `Connecting ${wsUrl} | table ${tableId}`

  const ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    addFeed("connected to spectator websocket")
    ws.send(JSON.stringify({ type: "spectate", payload: { tableId } }))
  }

  ws.onmessage = (event) => {
    let message = null
    try {
      message = JSON.parse(String(event.data || "{}"))
    } catch {
      return
    }

    if (message.type === "spectator_state") {
      const payload = message.payload || {}
      document.getElementById("table").textContent = payload.tableId || "-"
      document.getElementById("hand").textContent = String(payload.handNumber || "-")
      document.getElementById("stage").textContent = String(payload.stage || "waiting").toUpperCase()
      document.getElementById("pot").textContent = String(payload.pot || 0)
      drawBoard(payload.board || [])
      drawSeats(payload.players || [])
      return
    }

    if (message.type === "action_taken") {
      const payload = message.payload || {}
      addFeed(`${payload.playerName || payload.seat || "player"} ${payload.action}${payload.amount ? ` ${payload.amount}` : ""}`)
      return
    }

    if (message.type === "hand_result") {
      const payload = message.payload || {}
      const winners = Array.isArray(payload.winners)
        ? payload.winners.map((winner) => `${winner.playerId} +${winner.amount}`).join(", ")
        : "none"
      addFeed(`hand ${payload.handNumber || "?"} complete | winners: ${winners}`)
      return
    }

    if (message.type === "chat") {
      const payload = message.payload || {}
      addFeed(`chat ${payload.from || "table"}: ${payload.message || ""}`)
      return
    }

    if (message.type === "error") {
      addFeed(`error: ${message.payload?.message || "unknown"}`)
      return
    }
  }

  ws.onclose = () => {
    addFeed("spectator websocket closed")
    meta.textContent = "Disconnected"
  }
}

boot().catch((error) => {
  const meta = document.getElementById("meta")
  meta.textContent = `Failed to start spectator: ${error?.message || error}`
})
