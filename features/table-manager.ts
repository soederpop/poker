import { z } from "zod"
import { Feature, features, FeatureOptionsSchema, FeatureStateSchema } from "@soederpop/luca"

export type TableStatus = "waiting" | "active" | "paused" | "closed"

export type TablePlayer = {
  botId: string
  name: string
  seat: number
  stack: number
  connected: boolean
  isHouseBot: boolean
  profile?: string
  joinedAt: number
  updatedAt: number
}

export type PokerTable = {
  id: string
  name: string
  smallBlind: number
  bigBlind: number
  startingStack: number
  maxPlayers: number
  actionTimeout: number
  preferredHouseActor?: string
  status: TableStatus
  players: TablePlayer[]
  createdAt: number
  updatedAt: number
}

export type TableSummary = {
  id: string
  name: string
  blinds: string
  startingStack: number
  players: number
  maxPlayers: number
  status: TableStatus
}

declare module "@soederpop/luca" {
  interface AvailableFeatures {
    tableManager: typeof TableManager
  }
}

export const TableManagerStateSchema = FeatureStateSchema.extend({
  tables: z.array(z.any()).default([]),
})

export type TableManagerState = z.infer<typeof TableManagerStateSchema>

export const TableManagerOptionsSchema = FeatureOptionsSchema.extend({
  defaultStartingStack: z.number().default(100),
  defaultMaxPlayers: z.number().int().min(2).max(9).default(9),
  defaultActionTimeout: z.number().int().min(5).default(30),
})

export type TableManagerOptions = z.infer<typeof TableManagerOptionsSchema>

function toBlindsLabel(smallBlind: number, bigBlind: number): string {
  return `${smallBlind}/${bigBlind}`
}

export class TableManager extends Feature<TableManagerState, TableManagerOptions> {
  static override shortcut = "features.tableManager" as const
  static override description = "Poker table registry and seat manager for multiplayer lobby state."
  static override stateSchema = TableManagerStateSchema
  static override optionsSchema = TableManagerOptionsSchema

  override get initialState(): TableManagerState {
    return {
      ...super.initialState,
      tables: [],
    }
  }

  get tables(): PokerTable[] {
    return [...((this.state.get("tables") as PokerTable[] | undefined) || [])]
  }

  listTables(): TableSummary[] {
    return this.tables.map((table) => ({
      id: table.id,
      name: table.name,
      blinds: toBlindsLabel(table.smallBlind, table.bigBlind),
      startingStack: table.startingStack,
      players: table.players.length,
      maxPlayers: table.maxPlayers,
      status: table.status,
    }))
  }

  ensureDefaultTables(): PokerTable[] {
    const existing = this.tables
    const hasOneTwo = existing.some((table) => table.smallBlind === 1 && table.bigBlind === 2)
    const hasFiveTen = existing.some((table) => table.smallBlind === 5 && table.bigBlind === 10)

    const created: PokerTable[] = []

    if (!hasOneTwo) {
      created.push(this.createTable({
        name: "Cash 1/2",
        blinds: [1, 2],
        startingStack: 100,
        maxPlayers: 9,
      }))
    }

    if (!hasFiveTen) {
      created.push(this.createTable({
        name: "Cash 5/10",
        blinds: [5, 10],
        startingStack: 500,
        maxPlayers: 9,
      }))
    }

    return created
  }

  createTable(options: {
    name?: string
    blinds: [number, number]
    startingStack?: number
    maxPlayers?: number
    actionTimeout?: number
    preferredHouseActor?: string
  }): PokerTable {
    const [smallBlind, bigBlind] = options.blinds
    const now = Date.now()

    const table: PokerTable = {
      id: this.container.utils.uuid(),
      name: options.name || `Table ${toBlindsLabel(smallBlind, bigBlind)}`,
      smallBlind,
      bigBlind,
      startingStack: options.startingStack ?? this.options.defaultStartingStack,
      maxPlayers: options.maxPlayers ?? this.options.defaultMaxPlayers,
      actionTimeout: options.actionTimeout ?? this.options.defaultActionTimeout,
      ...(options.preferredHouseActor ? { preferredHouseActor: options.preferredHouseActor } : {}),
      status: "waiting",
      players: [],
      createdAt: now,
      updatedAt: now,
    }

    this.state.set("tables", [...this.tables, table])
    this.emit("tableCreated", table)
    return table
  }

  table(tableId: string): PokerTable | undefined {
    return this.tables.find((entry) => entry.id === tableId)
  }

  tableForBot(botId: string): PokerTable | undefined {
    return this.tables.find((table) => table.players.some((player) => player.botId === botId))
  }

  chooseJoinableTable(): PokerTable | undefined {
    const open = this.tables.filter((table) => table.status !== "closed")
    return open.find((table) => table.players.length < table.maxPlayers)
  }

  markDisconnected(botId: string): PokerTable | null {
    const table = this.tableForBot(botId)
    if (!table) {
      return null
    }

    return this.updateTable(table.id, (next) => {
      next.players = next.players.map((player) => player.botId === botId
        ? { ...player, connected: false, updatedAt: Date.now() }
        : player)
      next.status = next.players.length >= 2 ? "active" : "paused"
      return next
    })
  }

  markConnected(botId: string): PokerTable | null {
    const table = this.tableForBot(botId)
    if (!table) {
      return null
    }

    return this.updateTable(table.id, (next) => {
      next.players = next.players.map((player) => player.botId === botId
        ? { ...player, connected: true, updatedAt: Date.now() }
        : player)
      next.status = next.players.length >= 2 ? "active" : "waiting"
      return next
    })
  }

  joinTable(options: {
    tableId: string
    botId: string
    name: string
    seatPreference?: number
    stack?: number
    isHouseBot?: boolean
    profile?: string
  }): { table: PokerTable; player: TablePlayer; wasAlreadySeated: boolean } {
    const table = this.table(options.tableId)
    if (!table) {
      throw new Error(`Table not found: ${options.tableId}`)
    }

    if (table.status === "closed") {
      throw new Error(`Table is closed: ${options.tableId}`)
    }

    const existing = table.players.find((player) => player.botId === options.botId)
    if (existing) {
      const updated = this.markConnected(options.botId) || table
      const refreshed = updated.players.find((player) => player.botId === options.botId) || existing
      return { table: updated, player: refreshed, wasAlreadySeated: true }
    }

    if (table.players.length >= table.maxPlayers) {
      throw new Error(`Table is full: ${table.name}`)
    }

    const occupiedSeats = new Set(table.players.map((player) => player.seat))
    let seat = options.seatPreference

    if (seat !== undefined) {
      if (seat < 1 || seat > table.maxPlayers) {
        throw new Error(`Seat preference out of range: ${seat}`)
      }
      if (occupiedSeats.has(seat)) {
        throw new Error(`Seat is already occupied: ${seat}`)
      }
    } else {
      for (let candidate = 1; candidate <= table.maxPlayers; candidate += 1) {
        if (!occupiedSeats.has(candidate)) {
          seat = candidate
          break
        }
      }
    }

    if (!seat) {
      throw new Error(`No seats available at table: ${table.name}`)
    }

    const now = Date.now()
    const newPlayer: TablePlayer = {
      botId: options.botId,
      name: options.name,
      seat,
      stack: options.stack ?? table.startingStack,
      connected: true,
      isHouseBot: options.isHouseBot === true,
      ...(options.profile ? { profile: options.profile } : {}),
      joinedAt: now,
      updatedAt: now,
    }

    const updated = this.updateTable(table.id, (next) => {
      next.players = [...next.players, newPlayer]
      next.status = next.players.length >= 2 ? "active" : "waiting"
      return next
    })

    this.emit("tableJoined", { table: updated, player: newPlayer })
    return { table: updated, player: newPlayer, wasAlreadySeated: false }
  }

  leaveTable(tableId: string, botId: string): { table: PokerTable; player: TablePlayer | null } {
    const table = this.table(tableId)
    if (!table) {
      throw new Error(`Table not found: ${tableId}`)
    }

    const existing = table.players.find((player) => player.botId === botId) || null
    const updated = this.updateTable(tableId, (next) => {
      next.players = next.players.filter((player) => player.botId !== botId)
      next.status = next.players.length >= 2 ? "active" : "paused"
      return next
    })

    this.emit("tableLeft", { table: updated, player: existing })
    return { table: updated, player: existing }
  }

  setTableStatus(tableId: string, status: TableStatus): PokerTable {
    return this.updateTable(tableId, (next) => ({
      ...next,
      status,
    }))
  }

  setPlayerStack(tableId: string, botId: string, stack: number): PokerTable {
    return this.updateTable(tableId, (next) => {
      next.players = next.players.map((player) => player.botId === botId
        ? { ...player, stack: Math.max(0, stack), updatedAt: Date.now() }
        : player)
      return next
    })
  }

  setPlayerConnected(tableId: string, botId: string, connected: boolean): PokerTable {
    return this.updateTable(tableId, (next) => {
      next.players = next.players.map((player) => player.botId === botId
        ? { ...player, connected, updatedAt: Date.now() }
        : player)
      return next
    })
  }

  tablePlayers(tableId: string): TablePlayer[] {
    return this.table(tableId)?.players || []
  }

  private updateTable(tableId: string, updater: (table: PokerTable) => PokerTable): PokerTable {
    const tables = this.tables
    const idx = tables.findIndex((table) => table.id === tableId)

    if (idx < 0) {
      throw new Error(`Table not found: ${tableId}`)
    }

    const current = tables[idx]!
    const updated = updater({
      ...current,
      players: [...current.players],
      updatedAt: Date.now(),
    })

    const next = [...tables]
    next[idx] = {
      ...updated,
      updatedAt: Date.now(),
    }
    this.state.set("tables", next)
    return next[idx]!
  }
}

export default features.register("tableManager", TableManager)
