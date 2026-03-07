import { Feature, features } from "@soederpop/luca/feature"

export type SeatLayoutOverride = { x: number; y: number }
export type SeatLayoutOverrides = Record<number, SeatLayoutOverride>

const DEFAULT_STORAGE_KEY = "pokurr.spectator.seatLayout.v1"
const DEFAULT_ENABLED_KEY = "pokurr.spectator.layoutEdit.enabled"
const VISIBLE_SEATS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function clampPercent(value: number) {
  return Math.max(4, Math.min(96, value))
}

function normalizeOverrides(input: unknown): SeatLayoutOverrides {
  const next: SeatLayoutOverrides = {}
  if (!input || typeof input !== "object") {
    return next
  }

  for (const seat of VISIBLE_SEATS) {
    const raw = (input as Record<string, unknown>)[String(seat)]
    if (!raw || typeof raw !== "object") {
      continue
    }

    const x = Number((raw as Record<string, unknown>).x)
    const y = Number((raw as Record<string, unknown>).y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue
    }

    next[seat] = {
      x: clampPercent(Math.round(x * 10) / 10),
      y: clampPercent(Math.round(y * 10) / 10),
    }
  }

  return next
}

export type SeatLayoutEditorState = {
  enabled: boolean
  overrides: SeatLayoutOverrides
}

export type SeatLayoutEditorOptions = {
  storageKey?: string
  enabledStorageKey?: string
}

declare module "@soederpop/luca/feature" {
  interface AvailableFeatures {
    seatLayoutEditor: typeof SeatLayoutEditor
  }
}

export class SeatLayoutEditor extends Feature<SeatLayoutEditorState, SeatLayoutEditorOptions> {
  static override shortcut = "features.seatLayoutEditor" as const
  static override description = "Editable spectator seat layout state with local persistence."

  override get initialState(): SeatLayoutEditorState {
    return {
      enabled: false,
      overrides: {},
    }
  }

  override afterInitialize() {
    this.loadFromStorage()
    this.syncWindowExport()
    this.state.observe(() => {
      this.persistToStorage()
      this.syncWindowExport()
    })
  }

  private get storageKey() {
    return String(this.options.storageKey || DEFAULT_STORAGE_KEY)
  }

  private get enabledStorageKey() {
    return String(this.options.enabledStorageKey || DEFAULT_ENABLED_KEY)
  }

  get enabled() {
    return this.state.get("enabled") === true
  }

  get overrides() {
    return (this.state.get("overrides") as SeatLayoutOverrides | undefined) || {}
  }

  setEnabled(enabled: boolean) {
    this.state.set("enabled", Boolean(enabled))
    this.emit("enabledChanged", this.enabled)
    return this
  }

  toggleEnabled() {
    return this.setEnabled(!this.enabled)
  }

  setSeatPosition(seat: number, x: number, y: number) {
    if (!VISIBLE_SEATS.includes(Number(seat))) {
      return this
    }

    const nextSeat: SeatLayoutOverride = {
      x: clampPercent(Math.round(Number(x) * 10) / 10),
      y: clampPercent(Math.round(Number(y) * 10) / 10),
    }
    const next = {
      ...this.overrides,
      [Number(seat)]: nextSeat,
    }
    this.state.set("overrides", next)
    this.emit("layoutChanged", next)
    return this
  }

  resetOverrides() {
    this.state.set("overrides", {})
    this.emit("layoutChanged", {})
    return this
  }

  private loadFromStorage() {
    if (typeof window === "undefined") {
      return
    }

    try {
      const rawEnabled = window.localStorage.getItem(this.enabledStorageKey)
      if (rawEnabled !== null) {
        this.state.set("enabled", rawEnabled === "1")
      }
    } catch {
      // Ignore storage errors.
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey)
      if (!raw) {
        return
      }
      this.state.set("overrides", normalizeOverrides(JSON.parse(raw)))
    } catch {
      // Ignore malformed layout JSON.
    }
  }

  private persistToStorage() {
    if (typeof window === "undefined") {
      return
    }

    try {
      window.localStorage.setItem(this.enabledStorageKey, this.enabled ? "1" : "0")
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.overrides))
    } catch {
      // Ignore storage errors.
    }
  }

  private syncWindowExport() {
    if (typeof window === "undefined") {
      return
    }
    ;(window as any).__pokurrSeatLayout = this.overrides
  }
}

export default features.register("seatLayoutEditor", SeatLayoutEditor)
