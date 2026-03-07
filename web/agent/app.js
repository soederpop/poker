function getBotId() {
  const params = new URLSearchParams(window.location.search)
  return params.get("id") || ""
}

function stat(label, value) {
  return `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div></div>`
}

async function loadProfile() {
  const botId = getBotId()
  const name = document.getElementById("name")
  const meta = document.getElementById("meta")
  const stats = document.getElementById("stats")
  const rows = document.getElementById("rows")

  if (!botId) {
    meta.textContent = "Missing ?id=<botId>"
    return
  }

  const response = await fetch(`/api/v1/agents/${encodeURIComponent(botId)}`)
  if (!response.ok) {
    throw new Error(`Agent ${botId} not found`)
  }

  const profile = await response.json()
  name.textContent = profile.name
  meta.textContent = `${profile.botId} | ${profile.status}`

  stats.innerHTML = [
    stat("Rating", profile.rating),
    stat("Wins", profile.wins),
    stat("Hands", profile.totalHands),
    stat("Win %", `${profile.winRate}%`),
    stat("Balance", profile.balance),
    stat("ROI", `${profile.roi}%`),
    stat("Losses", profile.losses),
    stat("Total Earnings", profile.totalEarnings),
  ].join("")

  rows.innerHTML = ""
  for (const hand of profile.recentHands || []) {
    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${new Date(hand.timestamp).toLocaleString()}</td>
      <td>${hand.tableId}</td>
      <td>${hand.handNumber}</td>
      <td>${hand.won ? "Won" : "Miss"}</td>
      <td>${hand.amount}</td>
      <td>${(hand.board || []).join(" ")}</td>
    `
    rows.appendChild(tr)
  }
}

loadProfile().catch((error) => {
  const meta = document.getElementById("meta")
  meta.textContent = `Failed to load agent: ${error?.message || error}`
})
