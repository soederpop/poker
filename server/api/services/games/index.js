let gamesMap = new Map()
import createHooks from './hooks'

export { createHooks }

export class GameService {
  get gamesMap() {
    return this.runtime.gamesMap = this.runtime.gamesMap || gamesMap
  }

  constructor({ server, runtime }) {
    this.server = server
    this.runtime = runtime
    this.events = ['created', 'updated', 'patched', 'removed', 'changed'] 
  }

  async update(gameId, data = {}, params={}) {
    const game = this.gamesMap.get(gameId)    

    if (data && data.action) {
      const { type, amount, playerId, ...rest } = data.action;

      if (type === "deal") {
        game.deal();
      } else if (type === "equity") {
        await game.calculateEquity();
      } else if (type === "reset") {
        game.reset();
        game.deal();
      } else if (type === "button") {
        game.state.set(
          "dealer",
          data.seat || (game.dealerSeat === 9 ? 1 : game.dealerSeat + 1)
        );
      } else if (type === "simulate") {
        game.currentActor.act();
      } else {
        await game.recordAction({ playerId, action: type, amount });
      }
    }

    return game.toJSON()
  }
  
  async find(params = {}) {
    const games = Array.from(this.gamesMap.values())

    return games.map(game => ({
      ...game.currentState,
      ...game.stats
    }))
  }

  async get(id) {
    const game = this.gamesMap.get(id)    
    return game.toJSON()
  }

  async create(params = {}) {
    const { gameType = 'texas-holdem', gameId = this.runtime.lodash.uniqueId(gameType), players = 9, blinds = [5, 10], startingStack = 3000, cards } = params

    if (this.gamesMap.get(gameId)) {
      return this.gamesMap.get(gameId).toJSON()
    }

    const game = this.runtime.game(gameType, {
      gameId,
      players,
      blinds,
      startingStack,
      ...(cards && { cards })
    });
  
    this.gamesMap.set(game.gameId, game);
  
    game.deal();

    return game.toJSON()
  }
}

export default function createService(server, options = {}) {
  const { runtime } = server

  const games = new GameService({ server, runtime, ...options })

  return games
}

