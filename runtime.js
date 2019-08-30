const runtime = require('@skypager/node')

const loadSource = process.env.NODE_ENV !== 'production'

if (loadSource) {
  require('@babel/register')()
}

require('babel-plugin-require-context-hook/register')()

const framework = loadSource
  ? require('./server')
  : require('./lib')

/** 
 * @param {String} gameType
 * @param {Object} options 
 * @param {Number|Object} players 
 * @param {Number} startingStack
 * @param {Array<Number>} blinds
 * @param {Object<String,Array<Card>} cards
*/
function gameFactory(gameType, options = {}) {
  return runtime.game(gameType, {
    players: 9,
    blinds: [5, 10],
    startingStack: 1000,
    ...options,
    cacheHelper: false,
  })
}

const gameRuntime = runtime.use(framework)

gameRuntime.createGame = gameFactory
gameRuntime.createScenario = (...args) =>
  require('./test/scenarios').default(...args)

module.exports = gameRuntime
