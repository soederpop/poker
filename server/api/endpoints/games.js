let gamesMap = new Map()

class GameService {
  static setupChannels(app) {
    app.service('gamesService').publish('updated', (data = {}, context = {}) => {
      console.log('updated event', data)  
      return null
    })
  }

  constructor({ server, runtime }) {
    this.server = server
    this.runtime = runtime
    this.events = ['created', 'updated', 'patched', 'removed', 'changed'] 
  }

  async update(gameId, data = {}, params={}) {
    const game = gamesMap.get(gameId)    

    console.log('Updating', gameId)
    if (data && data.action) {
      const { type, amount, playerId, ...rest } = data.action;
      
      console.log({ type, amount, playerId })

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
        console.log('Recording Action')
        await game.recordAction({ playerId, action: type, amount });
      }
    }

    const gameJson = game.toJSON()

    const resp = this.runtime.lodash.cloneDeep(gameJson)

    console.log(resp)
    return resp
  }
  
  async find(params = {}) {
    const games = Array.from(gamesMap.values())

    return games.map(game => ({
      ...game.currentState,
      ...game.stats
    }))
  }

  async get(id) {
    const game = gamesMap.get(id)    
    return game.toJSON()
  }

  async create(params = {}) {
    const { gameType = 'texas-holdem', gameId = this.runtime.lodash.uniqueId(gameType), players = 9, blinds = [5, 10], startingStack = 3000, cards } = params

    const game = this.runtime.game(gameType, {
      gameId,
      players,
      blinds,
      startingStack,
      ...(cards && { cards })
    });
  
    gamesMap.set(game.gameId, game);
  
    game.deal();
  
    this.runtime.emit("gameWasCreated", game);
  
    game.state.observe(() => {
      this.runtime.info(`Game State Change`, game.chain.pick('stage','pot','gameId', 'actionSeat').value())
      this.publish('changed', game.toJSON())
    });    

    return this.runtime.lodash.cloneDeep(game.toJSON())
  }
}

export default async function setupGamesEndpoints(app) {
  gamesMap = this.runtime.gamesMap = this.runtime.gamesMap || gamesMap
  
  const gamesService = new GameService({ server: this, runtime: this.runtime });
  app.use('gamesService', gamesService)
  GameService.setupChannels(app)
  
  app.on('connection', (connection) => {
    app.channel('observers').join(connection)
  })

  app
    .route('/api/games')
    .all(gamesRequestHandler.bind(this))
    .get(listGames.bind(this))
    .post(createGame.bind(this))

  app
    .route('/api/games/:gameId')
    .all(gameRequestHandler.bind(this))
    .get(getGame.bind(this))
    .post(sendGameAction.bind(this))

  return app
}

export async function listGames(req, res) {
  const games = Array.from( gamesMap.entries() )

  res.json(
    games.map(([gameId, game]) => ({
      id: gameId,
      stage: game.stage,
      playerIds: game.playerIds
    }))  
  )
}

export async function createGame(req, res) {
  const { gameId, gameType = 'texas-holdem', players, blinds = [10, 20], startingStack, cards } = req.body

  if (!gameId || Array.from(gamesMap.values()).find((game) => game.gameId === gameId)) {
    res.status(400).json({ error: 'Invalid game id.' })
    return
  }

  const game = this.runtime.game(gameType, { gameId, players, blinds, startingStack, ... cards && { cards } })

  gamesMap.set(game.gameId, game)

  game.deal()

  this.runtime.emit('gameWasCreated', game)

  game.state.observe(() => {
    this.runtime.log('Game State Did Change', game.gameId)
  })

  res.status(200).json({ id: game.gameId })
}

export async function gamesRequestHandler(req, res, next) {
  next()
}

export async function gameRequestHandler(req, res, next) {
  const game = gamesMap.get(req.params.gameId)

  if (game) {
    req.game = game
    next()
  } else {
    res.status(404).json({ error: 'not found '})
  }
}

export async function getGame(req, res) {
  const { game } = req

  try {
    res.status(200).json(game.toJSON());  
  } catch(error) {
    this.runtime.error(`Error serving game info`, error)
    res.status(500).json({ error: error.message })
  }
}

export async function sendGameAction(req, res) {
  const { game } = req
  const { action = {} } = req.body
  const { type, amount, playerId, ...data } = action
  
  if (type === 'deal') {
    game.deal()
  } else if(type === 'equity') {    
    await game.calculateEquity()
  } else if(type === 'reset') {    
    game.reset()
    game.deal()
  } else if(type === 'button') {    
    game.state.set('dealer', data.seat || (game.dealerSeat === 9 ? 1 : game.dealerSeat + 1))
  } else if(type === 'simulate') {    
    game.currentActor.act()    
  } else {
    await game.recordAction({ playerId, action: type, amount, ...data })
  }

  try {
    const gameJson = game.toJSON();
    res.status(200).json(runtime.lodash.cloneDeep(gameJson));
  } catch (error) {
    this.runtime.error(`Error serving game info`, error);
    res.status(500).json({ error: error.message });
  }  
}