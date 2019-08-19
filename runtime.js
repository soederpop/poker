const runtime = require('@skypager/node')

const loadSource = process.env.NODE_ENV !== 'production'

if (loadSource) {
  require('@babel/register')()
  require('babel-plugin-require-context-hook/register')()
} else {
  console.log(process.argv)
  process.exit(0)
}

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
  return runtime.game(gameType, options)
}

const gameRuntime = runtime.use(framework)

gameRuntime.createGame = gameFactory

module.exports = gameRuntime
