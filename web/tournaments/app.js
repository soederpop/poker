async function loadTournaments() {
  const rows = document.getElementById("rows")
  const meta = document.getElementById("meta")

  const response = await fetch("/api/v1/tournaments/live")
  const payload = await response.json()

  meta.textContent = `Server ${payload.serverId || ""} | Spectator WS ${payload.spectatorWsUrl || "disabled"}`
  rows.innerHTML = ""

  for (const tournament of payload.tournaments || []) {
    const tr = document.createElement("tr")
    tr.className = "fade-up"
    const statusClass = String(tournament.status || "").toLowerCase()
    tr.innerHTML = `
      <td>${tournament.id}</td>
      <td>${tournament.buyIn}</td>
      <td>${tournament.registered}/${tournament.maxPlayers}</td>
      <td><span class="pill ${statusClass}">${tournament.status}</span></td>
      <td><a href="../spectator/?tableId=${encodeURIComponent(tournament.tableId)}">Spectate</a></td>
    `
    rows.appendChild(tr)
  }
}

loadTournaments().catch((error) => {
  const meta = document.getElementById("meta")
  meta.textContent = `Failed to load tournaments: ${error?.message || error}`
})
