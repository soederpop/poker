let gamesMap = new Map()

class GameService {
  constructor({ server, runtime }) {
    this.server = server
    this.runtime = runtime
    this.events = ['created', 'updated', 'patched', 'removed', 'changed'] 
  }

  async get(id) {
    const game = gamesMap.get(id)    
    return game.toJSON()
  }
}

export default async function setupGamesEndpoints(app) {
  gamesMap = this.runtime.gamesMap = this.runtime.gamesMap || gamesMap
  
  app.use('gamesService', new GameService({ server: this, runtime: this.runtime }))
  
  this.runtime.on('gameWasCreated', connectGameToService.bind(this, app))

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
    res.status(200).json(game.toJSON());
  } catch (error) {
    this.runtime.error(`Error serving game info`, error);
    res.status(500).json({ error: error.message });
  }  
}

export async function connectGameToService(app, game) {
  game.state.observe(() => {
    Promise.resolve(app.service('gamesService').publish('changed', {
      gameId: game.gameId
    })).then(() => {
      this.runtime.info('Published change change event', game.gameId)
    })    
  })
}