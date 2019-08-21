import runtime from "@skypager/web"
import feathers from '@feathersjs/client' 
import io from 'socket.io-client'

const baseURL = runtime.get(
  "settings.client.baseURL",
  runtime.get("argv.baseUrl", `http://localhost:3000/api`)
)

export const FLOP_FILTERS = {
  maxRank: "cardRank",
  name: "string",
  minRank: "cardRank",
  uniqSuits: "number",
  ranks: "array",
  uniqRanks: "number",
  flushPossible: "boolean",
  flushDraw: "boolean",
  rainbow: "boolean",
  sameRank: "boolean",
  paired: "boolean",
  trips: "boolean",
  hasAce: "boolean",
  hasKing: "boolean",
  hasQueen: "boolean",
  hasJack: "boolean",
  hasTen: "boolean",
  numberOfBroadwayCards: "number",
  threeMediumCards: "boolean",
  threeSmallCards: "boolean",
  gaps: "array",
  openEnded: "boolean",
  possibleStraights: "boolean"
}

const realTime = feathers()

const client = {
  getRealTime: () => realTime,

  connect: () => {
    const socket = io()
    realTime.configure(feathers.socketio(socket))
    return Promise.resolve(this)
  },

  service: (...args) => {
    return realTime.service(...args)
  },

  getGamesService() {
    return realTime.service('gamesService')
  },
  /**
   * View information about a Range of hands
   *
   * @name viewRange
   * @function
   * @param {String} range a common range notation e.g. 99+,AJs+,KQs+
   * @param {Array<String>} deadCards
   */
  viewRange(range, deadCards = []) {
    return this.client({
      url: `${baseURL}/ranges/view`,
      params: { range, deadCards }
    })
      .then(r => r.data)
      .catch(e => e.response)
  },

  /**
   * Get the hand combinations which make up a range in a range chart grid
   * format 13 x 13, of the normalized hand combos.
   *
   * @name showRangeGrid
   * @function
   * @param {Object} options
   */
  showRangeGrid(options = {}) {
    return this.client
      .get(`${baseURL}/ranges/grid`)
      .then(r => r.data)
      .catch(e => e.response)
  },

  /**
   * Start a new texas holdem game
   *
   * @name createGame
   * @function
   * @param {Object} options
   * @param {Number} [options.players=9]
   * @param {Number} [options.startingStack=3000]
   * @param {Array<Number>} [options.blinds=[10,20]]
   */
  createGame({ gameId, players = 9, startingStack = 3000, blinds = [10, 20] } = {}) {
    return this.client
      .post(`${baseURL}/games`, {
        players,
        startingStack,
        blinds,
        gameId
      })
      .then(r => r.data)
  },

  /**
   * List the current games
   *
   * @name listGames
   * @function
   * @param {Object} options
   */

  listGames(options = {}) {
    return this.client
      .get(`${baseURL}/games`)
      .then(r => r.data)
      .catch(e => e.response)
  },

  /**
   * Show information about a game
   *
   * @name showGame
   * @function
   * @param {String} gameId the unique id of the game
   */
  showGame(gameId) {
    return this.client
      .get(`${baseURL}/games/${gameId}`)
      .then(r => r.data)
      .then(data => {
        runtime.setState({ [`game_${gameId}`]: data })
        return data
      })
      .catch(e => e.response)
  },
  /**
   * Record an action by a player in a game.
   *
   * @name action
   * @function
   * @param {String} gameId
   * @param {Object} action
   * @param {String} action.type
   * @param {Number} action.amount
   * @param {String} action.playerId
   */
  action(gameId, action = {}) {
    return this.client
      .post(`${baseURL}/games/${gameId}`, { action })
      .then(r => r.data)
      .then(data => {
        runtime.setState({ [`game_${gameId}`]: data })
        return data
      })
      .catch(e => e.response)
  },

  /**
   * Search all possible flop combinations based on various features / textures
   *
   * @name searchFlops
   * @function
   * @param {FlopsFilters} filters
   * @param {Number} [filters.sample] get a random sample of size n 
   * @param {Number} [filters.page=1] which page
   * @param {Number} [filters.limit=500] how many results per page?
   */
  searchFlops(filters = {}) {
    return this.client({ url: `${baseURL}/ranges/flops`, params: filters })
      .then(r => r.data)
      .catch(e => e.response)
  }
}

runtime.clients.register("game-api", () => ({
  interfaceMethods: Object.keys(client),
  ...client
}))

/**
 * @typedef {Object} GameAPIClient
 * @property {viewRange} viewRange
 * @property {showRangeGrid} showRangeGrid
 * @property {listGames} listGames
 * @property {showGame} showGame
 * @property {action} action
 * @property {searchFlops} searchFlops
 */

/**
 * @type {GameAPIClient}
 */
const gameAPIClient = runtime.client("game-api")

runtime.api = gameAPIClient

export default gameAPIClient
