const STATE = {
  replay: null,
  frames: [],
  frameIndex: 0,
  timer: null,
  speed: 1,
  betPulseByPlayer: new Map(),
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

function cardSrc(cardCode) {
  return `../spectator/assets/cards/${String(cardCode || "").trim().toLowerCase()}.svg`
}

function avatarSrc(player) {
  const key = String(player.botId || player.name || player.seat || "")
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  const id = (Math.abs(hash) % 28) + 1
  return `../spectator/assets/avatars/${id}.png`
}

function playerTags(player) {
  const tags = []
  if (player.folded) tags.push("folded")
  if (player.allIn) tags.push("all-in")
  if (!player.inHand && !player.folded) tags.push("out")
  return tags.length ? tags.join(" · ") : "active"
}

function holeCardsForFixture(player, snapshot) {
  if (snapshot.stage === "waiting") {
    return []
  }

  const cards = Array.isArray(player.holeCards)
    ? player.holeCards.map((card) => String(card || "").toLowerCase()).filter(Boolean)
    : []

  if (cards.length === 2) {
    return cards
  }

  if (player.inHand && !player.folded) {
    return ["back", "back"]
  }

  return []
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
    STATE.betPulseByPlayer.set(playerId, { amount: committed, expiresAt: now + 2600 })
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
    <img src="../spectator/assets/blue-chip.png" alt="Bet chip" />
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
    const holeCards = holeCardsForFixture(player, snapshot)
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
      cardImg.src = card === "back" ? "../spectator/assets/back.svg" : cardSrc(card)
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

function renderFrame(frame) {
  const snapshot = frame?.snapshot || {}

  document.getElementById("table").textContent = STATE.replay?.fixtureId || "-"
  document.getElementById("hand").textContent = `${frame.index} / ${Math.max(0, STATE.frames.length - 1)}`
  document.getElementById("stage").textContent = String(snapshot.stage || "waiting").toUpperCase()
  document.getElementById("pot").textContent = `$${Math.round(Number(snapshot.pot || 0))}`
  document.getElementById("potValue").textContent = `$${Math.round(Number(snapshot.pot || 0))}`
  document.getElementById("frameLabel").textContent = `${frame.index} / ${Math.max(0, STATE.frames.length - 1)}`

  renderBoard(snapshot.board || [])
  renderSeats(snapshot)
  renderDealerButton(snapshot)
  renderFeed()

  const scrub = document.getElementById("frameRange")
  scrub.max = String(Math.max(0, STATE.frames.length - 1))
  scrub.value = String(STATE.frameIndex)
}

function renderFeed() {
  const feed = document.getElementById("feed")
  feed.innerHTML = ""

  const rows = [...STATE.frames].reverse()
  for (const frame of rows) {
    const item = document.createElement("div")
    item.className = `feed-event${frame.index === STATE.frameIndex ? " active" : ""}`
    item.onclick = () => {
      stopPlayback()
      goToFrame(frame.index)
    }

    const title = document.createElement("div")
    title.className = "feed-time"
    title.textContent = frame.label

    const body = document.createElement("div")
    body.className = "feed-text"
    if (frame.event && typeof frame.event === "object") {
      const event = frame.event
      const action = String(event.action || "")
      const playerId = String(event.playerId || event.bigBlindPlayerId || event.smallBlindPlayerId || "")
      const amount = Number(event.amount || 0)
      if (action || playerId) {
        body.textContent = `${frame.eventType}${playerId ? ` · ${playerId}` : ""}${action ? ` · ${action}` : ""}${amount > 0 ? ` ${amount}` : ""}`
      } else {
        body.textContent = frame.eventType
      }
    } else {
      body.textContent = frame.eventType
    }

    item.appendChild(title)
    item.appendChild(body)
    feed.appendChild(item)
  }
}

function renderExpected(expected) {
  const target = document.getElementById("expected")
  const winners = Array.isArray(expected?.winners)
    ? expected.winners.map((winner) => `${winner.playerId}+${winner.amount}`).join(", ")
    : "none"
  const pots = Array.isArray(expected?.pots)
    ? expected.pots.map((pot) => `${pot.amount} (${(pot.eligible || []).join("/")})`).join(" | ")
    : "none"

  target.innerHTML = `
    <strong>Expected Winners:</strong> ${winners}<br />
    <strong>Expected Pots:</strong> ${pots}
  `
}

function goToFrame(index) {
  if (!STATE.frames.length) {
    return
  }

  STATE.frameIndex = Math.max(0, Math.min(STATE.frames.length - 1, Math.floor(index)))
  const frame = STATE.frames[STATE.frameIndex]
  if (!frame) {
    return
  }

  renderFrame(frame)
}

function stopPlayback() {
  if (STATE.timer) {
    clearInterval(STATE.timer)
    STATE.timer = null
  }
  document.getElementById("playBtn").textContent = "Play"
}

function startPlayback() {
  if (STATE.timer || STATE.frames.length <= 1) {
    return
  }

  const delay = Math.max(140, Math.round(900 / Math.max(0.5, STATE.speed)))
  STATE.timer = setInterval(() => {
    if (STATE.frameIndex >= STATE.frames.length - 1) {
      stopPlayback()
      return
    }
    goToFrame(STATE.frameIndex + 1)
  }, delay)

  document.getElementById("playBtn").textContent = "Pause"
}

async function loadReplay(fixtureId) {
  stopPlayback()
  const meta = document.getElementById("meta")
  meta.textContent = `Loading replay: ${fixtureId}`

  const response = await fetch(`/api/v1/fixtures/golden/${encodeURIComponent(fixtureId)}/replay`)
  if (!response.ok) {
    throw new Error(`Failed to load fixture replay (${response.status})`)
  }

  const replay = await response.json()
  STATE.replay = replay
  STATE.frames = Array.isArray(replay.frames) ? replay.frames : []
  STATE.frameIndex = 0
  STATE.betPulseByPlayer.clear()

  renderExpected(replay.expected || {})
  goToFrame(0)

  meta.textContent = `Loaded fixture ${replay.fixtureId} (${STATE.frames.length} frames)`
}

async function boot() {
  const meta = document.getElementById("meta")
  const fixtureSelect = document.getElementById("fixtureSelect")

  const listResponse = await fetch("/api/v1/fixtures/golden")
  if (!listResponse.ok) {
    throw new Error(`Failed to list fixtures (${listResponse.status})`)
  }

  const payload = await listResponse.json()
  const fixtures = Array.isArray(payload.fixtures) ? payload.fixtures : []

  if (!fixtures.length) {
    throw new Error("No fixtures available")
  }

  const fixtureParam = new URLSearchParams(window.location.search).get("fixture")
  let selectedFixtureId = ""

  for (const fixture of fixtures) {
    const option = document.createElement("option")
    option.value = String(fixture.id)
    option.textContent = `${fixture.id} (${fixture.players}p / ${fixture.events}e)`
    fixtureSelect.appendChild(option)

    if (!selectedFixtureId) {
      selectedFixtureId = option.value
    }
    if (fixtureParam && fixtureParam === option.value) {
      selectedFixtureId = option.value
    }
  }

  fixtureSelect.value = selectedFixtureId
  fixtureSelect.onchange = () => {
    loadReplay(fixtureSelect.value).catch((error) => {
      meta.textContent = `Failed to load replay: ${error?.message || error}`
    })
  }

  document.getElementById("prevBtn").onclick = () => {
    stopPlayback()
    goToFrame(STATE.frameIndex - 1)
  }

  document.getElementById("nextBtn").onclick = () => {
    stopPlayback()
    goToFrame(STATE.frameIndex + 1)
  }

  document.getElementById("playBtn").onclick = () => {
    if (STATE.timer) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }

  document.getElementById("speedRange").oninput = (event) => {
    const value = Number(event.target.value || 1)
    STATE.speed = Number.isFinite(value) ? value : 1
    document.getElementById("speedLabel").textContent = `${STATE.speed.toFixed(1)}x`
    if (STATE.timer) {
      stopPlayback()
      startPlayback()
    }
  }

  document.getElementById("frameRange").oninput = (event) => {
    stopPlayback()
    goToFrame(Number(event.target.value || 0))
  }

  await loadReplay(selectedFixtureId)
}

boot().catch((error) => {
  const meta = document.getElementById("meta")
  meta.textContent = `Failed to load fixture spectator: ${error?.message || error}`
})
