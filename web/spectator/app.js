const STATE = {
  tableId: "",
  latestSnapshot: null,
  showdownHandNumber: null,
  showdownCardsByPlayer: new Map(),
  betPulseByPlayer: new Map(),
  lastHandNumber: null,
}

const SEAT_LAYOUT = {
  1: { x: 14, y: 52, align: "left", dealer: { x: 22, y: 42 }, chip: { x: 23, y: 37 }, chipAlign: "left" },
  2: { x: 26, y: 25, align: "left", dealer: { x: 34, y: 25 }, chip: { x: 31, y: 29 }, chipAlign: "left" },
  3: { x: 49, y: 16, align: "left", dealer: { x: 58, y: 20 }, chip: { x: 49, y: 30 }, chipAlign: "left" },
  4: { x: 74, y: 25, align: "right", dealer: { x: 67, y: 25 }, chip: { x: 65, y: 29 }, chipAlign: "right" },
  5: { x: 86, y: 52, align: "right", dealer: { x: 78, y: 42 }, chip: { x: 74, y: 43 }, chipAlign: "right" },
  6: { x: 75, y: 79, align: "right", dealer: { x: 67, y: 69 }, chip: { x: 67, y: 55 }, chipAlign: "right" },
  7: { x: 56, y: 88, align: "right", dealer: { x: 56, y: 76 }, chip: { x: 53, y: 59 }, chipAlign: "right" },
  8: { x: 34, y: 88, align: "left", dealer: { x: 44, y: 76 }, chip: { x: 35, y: 59 }, chipAlign: "left" },
  9: { x: 17, y: 74, align: "left", dealer: { x: 25, y: 64 }, chip: { x: 23, y: 47 }, chipAlign: "left" },
}

function addFeed(text, type = "") {
  const feed = document.getElementById("feed")
  const item = document.createElement("div")
  item.className = `feed-event${type ? ` ${type}` : ""}`

  const time = document.createElement("div")
  time.className = "feed-time"
  time.textContent = new Date().toLocaleTimeString()

  const body = document.createElement("div")
  body.className = "feed-text"
  body.textContent = text

  item.appendChild(time)
  item.appendChild(body)
  feed.prepend(item)
  while (feed.children.length > 100) {
    feed.removeChild(feed.lastChild)
  }
}

function cardSrc(cardCode) {
  return `./assets/cards/${String(cardCode || "").trim().toLowerCase()}.svg`
}

function avatarSrc(player) {
  const key = String(player.botId || player.name || player.seat || "")
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  const id = (Math.abs(hash) % 28) + 1
  return `./assets/avatars/${id}.png`
}

function renderBoard(boardCards) {
  const board = document.getElementById("board")
  board.innerHTML = ""

  for (const card of boardCards || []) {
    const img = document.createElement("img")
    img.className = "board-card"
    img.src = cardSrc(card)
    img.alt = String(card)
    board.appendChild(img)
  }
}

function renderDealerButton(snapshot) {
  const dealerButton = document.getElementById("dealerButton")
  const dealerSeat = Number(snapshot?.dealerSeat)
  const layout = SEAT_LAYOUT[dealerSeat]

  if (!layout) {
    dealerButton.classList.add("hidden")
    return
  }

  dealerButton.classList.remove("hidden")
  dealerButton.style.left = `${layout.dealer.x}%`
  dealerButton.style.top = `${layout.dealer.y}%`
}

function playerTags(player) {
  const tags = []
  if (player.isHouseBot) tags.push("house")
  if (player.connected === false) tags.push("offline")
  if (player.folded) tags.push("folded")
  if (player.allIn) tags.push("all-in")
  if (!player.inHand && !player.folded) tags.push("out")
  return tags.length ? tags.join(" · ") : "active"
}

function liveHoleCardsForPlayer(player, snapshot) {
  if (STATE.showdownHandNumber === snapshot.handNumber) {
    const showdown = STATE.showdownCardsByPlayer.get(String(player.botId || ""))
    if (Array.isArray(showdown) && showdown.length === 2) {
      return showdown.map((card) => String(card).toLowerCase())
    }
  }

  if (snapshot.stage !== "waiting" && player.inHand && !player.folded) {
    return ["back", "back"]
  }

  return []
}

function renderBetChip(player, layout, seatsLayer, snapshot) {
  if (!layout?.chip) {
    return
  }

  if (snapshot.stage === "waiting") {
    STATE.betPulseByPlayer.clear()
    return
  }

  const playerId = String(player.botId || player.name || player.seat || "")
  const committed = Math.round(Number(player.committed || 0))
  const now = Date.now()
  if (committed > 0) {
    STATE.betPulseByPlayer.set(playerId, { amount: committed, expiresAt: now + 2200 })
  }

  const pulse = STATE.betPulseByPlayer.get(playerId)
  if (pulse && now > Number(pulse.expiresAt || 0)) {
    STATE.betPulseByPlayer.delete(playerId)
  }

  const pulseAmount = pulse ? Math.round(Number(pulse.amount || 0)) : 0
  const totalCommitted = Math.round(Number(player.totalCommitted || 0))
  const amount = committed > 0 ? committed : (pulseAmount > 0 ? pulseAmount : totalCommitted)
  if (amount <= 0) {
    return
  }

  const chip = document.createElement("div")
  chip.className = `bet-chip${layout.chipAlign === "right" ? " right" : ""}`
  chip.style.left = `${layout.chip.x}%`
  chip.style.top = `${layout.chip.y}%`
  chip.innerHTML = `
    <img src="./assets/blue-chip.png" alt="Bet chip" />
    <span>$${amount}</span>
  `
  seatsLayer.appendChild(chip)
}

function renderSeats(snapshot) {
  const seats = document.getElementById("seats")
  seats.innerHTML = ""
  const players = (snapshot.players || []).slice().sort((a, b) => Number(a.seat) - Number(b.seat))

  for (const player of players) {
    const seat = Number(player.seat)
    const layout = SEAT_LAYOUT[seat] || { x: 50, y: 50, align: "left" }
    const isActing = String(snapshot.currentActor || "") === String(player.botId || "")
    const holeCards = liveHoleCardsForPlayer(player, snapshot)
    const isOut = !player.inHand || player.folded || Number(player.stack || 0) <= 0

    const root = document.createElement("div")
    root.className = `seat ${layout.align === "right" ? "right" : ""}${isOut ? " out" : ""}`
    root.style.left = `${layout.x}%`
    root.style.top = `${layout.y}%`

    const avatar = document.createElement("div")
    avatar.className = `avatar${isActing ? " acting" : ""}`
    const avatarImg = document.createElement("img")
    avatarImg.src = avatarSrc(player)
    avatarImg.alt = String(player.name || player.botId || `Seat ${seat}`)
    avatar.appendChild(avatarImg)

    const info = document.createElement("div")
    info.className = "seat-info"

    const name = document.createElement("div")
    name.className = "seat-name"
    name.textContent = `${player.name || player.botId || `Seat ${seat}`}`

    const stack = document.createElement("div")
    stack.className = "seat-stack"
    stack.textContent = `Seat ${seat} · $${Math.round(Number(player.stack || 0))}`

    const tags = document.createElement("div")
    tags.className = "seat-tags"
    tags.textContent = playerTags(player)

    info.appendChild(name)
    info.appendChild(stack)
    info.appendChild(tags)

    const cards = document.createElement("div")
    cards.className = "hole-cards"
    for (const card of holeCards) {
      const cardImg = document.createElement("img")
      cardImg.className = "hole-card"
      cardImg.src = card === "back" ? "./assets/back.svg" : cardSrc(card)
      cardImg.alt = card === "back" ? "Hidden card" : String(card).toUpperCase()
      cards.appendChild(cardImg)
    }

    root.appendChild(avatar)
    root.appendChild(info)
    root.appendChild(cards)
    seats.appendChild(root)
    renderBetChip(player, layout, seats, snapshot)
  }
}

function renderSnapshot(snapshot) {
  const nextHandNumber = Number(snapshot.handNumber || 0)
  if (STATE.lastHandNumber !== null && STATE.lastHandNumber !== nextHandNumber) {
    STATE.betPulseByPlayer.clear()
  }
  STATE.lastHandNumber = nextHandNumber
  STATE.latestSnapshot = snapshot

  document.getElementById("table").textContent = snapshot.tableName || snapshot.tableId || "-"
  document.getElementById("hand").textContent = String(snapshot.handNumber || "-")
  document.getElementById("stage").textContent = String(snapshot.stage || "waiting").toUpperCase()
  document.getElementById("pot").textContent = `$${Math.round(Number(snapshot.pot || 0))}`
  document.getElementById("potValue").textContent = `$${Math.round(Number(snapshot.pot || 0))}`

  renderBoard(snapshot.board || [])
  renderSeats(snapshot)
  renderDealerButton(snapshot)
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
          const players = Array.isArray(table.players)
            ? table.players.length
            : Number(table.players || 0)
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
  const { wsUrl, tableId } = await resolveSocketAndTable()
  STATE.tableId = tableId

  meta.textContent = `Connecting ${wsUrl} | table ${tableId}`
  const ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    addFeed("Connected to spectator websocket")
    ws.send(JSON.stringify({ type: "spectate", payload: { tableId } }))
  }

  ws.onmessage = (event) => {
    let message = null
    try {
      message = JSON.parse(String(event.data || "{}"))
    } catch {
      return
    }

    const payload = message.payload || {}

    if (message.type === "spectator_state") {
      const nextHand = Number(payload.handNumber || 0)
      if (STATE.showdownHandNumber !== null && STATE.showdownHandNumber !== nextHand) {
        STATE.showdownHandNumber = null
        STATE.showdownCardsByPlayer.clear()
      }
      renderSnapshot(payload)
      return
    }

    if (message.type === "action_taken") {
      addFeed(`${payload.playerName || `Seat ${payload.seat || "?"}`} ${payload.action}${payload.amount ? ` ${payload.amount}` : ""}`)
      return
    }

    if (message.type === "hand_result") {
      const winners = Array.isArray(payload.winners)
        ? payload.winners.map((winner) => `${winner.playerId} +${winner.amount}`).join(", ")
        : "none"
      addFeed(`Hand ${payload.handNumber || "?"} complete | Winners: ${winners}`)

      STATE.showdownCardsByPlayer.clear()
      if (Array.isArray(payload.showdown)) {
        for (const row of payload.showdown) {
          const playerId = String(row?.playerId || "")
          const cards = Array.isArray(row?.cards) ? row.cards.map((card) => String(card).toLowerCase()) : []
          if (playerId && cards.length === 2) {
            STATE.showdownCardsByPlayer.set(playerId, cards)
          }
        }
      }
      STATE.showdownHandNumber = Number(payload.handNumber || 0)
      if (STATE.latestSnapshot && Number(STATE.latestSnapshot.handNumber || 0) === STATE.showdownHandNumber) {
        renderSeats(STATE.latestSnapshot)
      }
      return
    }

    if (message.type === "chat") {
      addFeed(`Chat ${payload.from || "table"}: ${payload.message || ""}`)
      return
    }

    if (message.type === "error") {
      addFeed(`Error: ${payload.message || "Unknown error"}`, "error")
      return
    }
  }

  ws.onclose = () => {
    addFeed("Spectator websocket closed", "error")
    meta.textContent = "Disconnected"
  }
}

boot().catch((error) => {
  const meta = document.getElementById("meta")
  meta.textContent = `Failed to start spectator: ${error?.message || error}`
  addFeed(`Failed to start spectator: ${error?.message || error}`, "error")
})
