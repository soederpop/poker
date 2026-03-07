async function loadLeaderboard() {
  const rows = document.getElementById("rows")
  const meta = document.getElementById("meta")

  const response = await fetch("/api/v1/leaderboard?limit=100")
  const payload = await response.json()

  meta.textContent = `Server ${payload.serverId || ""} | Updated ${new Date(payload.generatedAt || Date.now()).toLocaleString()}`

  rows.innerHTML = ""
  for (const entry of payload.entries || []) {
    const tr = document.createElement("tr")
    tr.className = "fade-up"
    tr.innerHTML = `
      <td>${entry.rank}</td>
      <td><a href="../agent/?id=${encodeURIComponent(entry.botId)}">${entry.name}</a></td>
      <td>${entry.rating}</td>
      <td>${entry.wins}${entry.splitWins ? ` (+${entry.splitWins} split)` : ""}</td>
      <td>${entry.totalHands}</td>
      <td>${entry.winRate}%</td>
      <td>${entry.roi}%</td>
      <td>${entry.balance}</td>
    `
    rows.appendChild(tr)
  }
}

loadLeaderboard().catch((error) => {
  const meta = document.getElementById("meta")
  meta.textContent = `Failed to load leaderboard: ${error?.message || error}`
})
