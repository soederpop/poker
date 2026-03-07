import type { AGIContainer } from "@soederpop/luca/agi"

type IncomingMessage = {
  type: string
  seq?: number
  payload?: Record<string, unknown>
}

type PokerClientOptions = {
  wsUrl: string
  reconnect?: boolean
}

type MessageHandler = (message: IncomingMessage) => void

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toIncomingMessage(data: unknown): IncomingMessage | null {
  if (!isRecord(data)) {
    return null
  }

  const type = String(data.type || "").trim()
  if (!type) {
    return null
  }

  return {
    type,
    ...(Number.isFinite(Number(data.seq)) ? { seq: Number(data.seq) } : {}),
    ...(isRecord(data.payload) ? { payload: data.payload } : {}),
  }
}

export class PokerClient {
  readonly container: AGIContainer & any
  readonly options: PokerClientOptions

  private _ws?: any
  private readonly pending = new Map<string, Array<(message: IncomingMessage) => void>>()
  private readonly listeners = new Set<MessageHandler>()

  constructor(container: AGIContainer & any, options: PokerClientOptions) {
    this.container = container
    this.options = options
  }

  get wsUrl(): string {
    return this.options.wsUrl
  }

  get ws(): any {
    if (!this._ws) {
      this._ws = this.container.client("websocket", {
        baseURL: this.wsUrl,
        reconnect: this.options.reconnect !== false,
        reconnectInterval: 500,
        maxReconnectAttempts: 100,
      })
    }
    return this._ws
  }

  async connect(): Promise<this> {
    this.ws.on("message", (data: unknown) => {
      this.handleIncoming(data)
    })
    await this.ws.connect()
    return this
  }

  async disconnect(): Promise<this> {
    if (this._ws) {
      await this._ws.disconnect()
    }
    return this
  }

  onMessage(handler: MessageHandler): () => void {
    this.listeners.add(handler)
    return () => {
      this.listeners.delete(handler)
    }
  }

  async send(type: string, payload: Record<string, unknown> = {}): Promise<void> {
    await this.ws.send({ type, payload })
  }

  async waitFor(type: string, timeoutMs = 8000): Promise<IncomingMessage> {
    return new Promise<IncomingMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for '${type}'`))
      }, timeoutMs)

      const queue = this.pending.get(type) || []
      queue.push((message) => {
        clearTimeout(timeout)
        resolve(message)
      })
      this.pending.set(type, queue)
    })
  }

  async authenticate(token: string): Promise<IncomingMessage> {
    await this.send("auth", { token })
    return this.waitFor("auth_ok", 10000)
  }

  async requestTables(): Promise<IncomingMessage> {
    await this.send("list_tables", {})
    return this.waitFor("tables")
  }

  async joinTable(tableId?: string): Promise<IncomingMessage> {
    await this.send("join_table", tableId ? { tableId } : {})
    return this.waitFor("table_joined")
  }

  async requestWallet(): Promise<IncomingMessage> {
    await this.send("wallet", {})
    return this.waitFor("wallet_state")
  }

  private handleIncoming(data: unknown) {
    const message = toIncomingMessage(data)
    if (!message) {
      return
    }

    if (message.type === "ping") {
      void this.send("pong", { now: Date.now() })
    }

    const queue = this.pending.get(message.type)
    if (queue && queue.length > 0) {
      const next = queue.shift()
      if (next) {
        next(message)
      }

      if (queue.length === 0) {
        this.pending.delete(message.type)
      } else {
        this.pending.set(message.type, queue)
      }
    }

    for (const listener of this.listeners) {
      listener(message)
    }
  }
}

export default PokerClient
