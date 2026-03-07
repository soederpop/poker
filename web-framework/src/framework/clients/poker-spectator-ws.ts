import { WebSocketClient, clients } from "@soederpop/luca/client"

declare module "@soederpop/luca/client" {
  interface AvailableClients {
    pokerSpectatorWs: typeof PokerSpectatorWsClient
  }
}

export class PokerSpectatorWsClient extends WebSocketClient {
  static override shortcut = "clients.pokerSpectatorWs" as const

  static override attach() {
    clients.register("pokerSpectatorWs", PokerSpectatorWsClient)
  }
}

export default clients.register("pokerSpectatorWs", PokerSpectatorWsClient)
