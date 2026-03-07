import type { SpectatorPlayerSnapshot } from "../../types"
import { avatarObjectPosition, avatarSrc } from "../../lib/card-helpers"

export function AvatarImage(props: {
  player: Pick<SpectatorPlayerSnapshot, "botId" | "name" | "seat">
  className?: string
}) {
  return (
    <img
      className={props.className}
      src={avatarSrc(props.player)}
      alt={String(props.player.name || props.player.botId || `Seat ${props.player.seat}`)}
      style={{
        objectPosition: avatarObjectPosition(props.player),
      }}
    />
  )
}
