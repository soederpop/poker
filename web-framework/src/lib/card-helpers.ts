import type { SpectatorPlayerSnapshot } from "../types"

const ASSET_ROOT = "./assets"

function avatarHash(player: Pick<SpectatorPlayerSnapshot, "botId" | "name" | "seat">) {
  const key = String(player.botId || player.name || player.seat || "")
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export function cardSrc(cardCode: string) {
  return `${ASSET_ROOT}/cards/${String(cardCode || "").trim().toLowerCase()}.svg`
}

export function avatarSrc(player: Pick<SpectatorPlayerSnapshot, "botId" | "name" | "seat">) {
  const id = (avatarHash(player) % 28) + 1
  return `${ASSET_ROOT}/avatars/${id}.png`
}

export function avatarObjectPosition(player: Pick<SpectatorPlayerSnapshot, "botId" | "name" | "seat">) {
  // Avatar images are 2-up horizontal sprites; pick one half deterministically.
  return (avatarHash(player) % 2) === 0 ? "left center" : "right center"
}

export function playerTags(player: SpectatorPlayerSnapshot) {
  const tags: string[] = []
  if (player.isHouseBot) tags.push("house")
  if (player.connected === false) tags.push("offline")
  if (player.folded) tags.push("folded")
  if (player.allIn) tags.push("all-in")
  if (!player.inHand && !player.folded) tags.push("out")
  return tags.length > 0 ? tags.join(" · ") : "active"
}
