if(process.env.NODE_ENV === 'development') {
  require('@babel/register')()
  require('babel-plugin-require-context-hook/register')()
}

const runtime = require('../runtime')

main()

async function main() {
  const server = runtime.server('game-api')

  await server.start()

  const { HandEquity, Range } = runtime

  const games = server.app.service('/games')

  await games.create({
    gameId: 'chicago',
    players: 9,
    startingStack: 3000,
    blinds: [5, 10]  
  })

  if (runtime.argv.interactive) {
    await runtime.repl('interactive').launch({ server, api: runtime.api, game: runtime.gamesMap.get('chicago'), runtime, Range, HandEquity })
  }
}