import { useEffect, useMemo } from "react"
import { useContainerState, useFeature } from "@soederpop/luca/react"

import type { FeedItem, SpectatorSnapshot } from "../types"
import type { SpectatorRuntime, SpectatorRuntimeState } from "../framework/features/spectator-runtime"

export function useSpectatorSocket(input: { wsUrl?: string | null; tableId?: string | null }) {
  const runtime = useFeature("spectatorRuntime" as any) as SpectatorRuntime
  const state = useContainerState<SpectatorRuntimeState>(runtime)

  useEffect(() => {
    void runtime.start({
      wsUrl: input.wsUrl,
      tableId: input.tableId,
    })

    return () => {
      void runtime.stop()
    }
  }, [runtime, input.wsUrl, input.tableId])

  const showdownCardsByPlayer = useMemo(() => {
    const map = new Map<string, string[]>()
    const record = state.showdownCardsByPlayer || {}
    for (const [playerId, cards] of Object.entries(record)) {
      if (Array.isArray(cards)) {
        map.set(playerId, cards.map((card) => String(card)))
      }
    }
    return map
  }, [state.showdownCardsByPlayer])

  return {
    status: state.status,
    meta: state.meta,
    tableId: state.tableId,
    wsUrl: state.wsUrl,
    snapshot: (state.snapshot || null) as SpectatorSnapshot | null,
    showdownHandNumber: state.showdownHandNumber,
    showdownCardsByPlayer,
    feedItems: (state.feedItems || []) as FeedItem[],
  }
}
