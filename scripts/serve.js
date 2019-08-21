if(process.env.NODE_ENV === 'development') {
  require('@babel/register')()
  require('babel-plugin-require-context-hook/register')()
}

const runtime = require('../runtime')

main()

async function main() {
  const server = runtime.server('game-api')

  await server.start()

  await runtime.api.createGame({
    gameId: "chicago",
    players: 9,
    startingStack: 3000,
    blinds: [5, 10]
  })

  const { HandEquity, Range } = runtime

  if (runtime.argv.interactive) {
    await runtime.repl('interactive').launch({ server, api: runtime.api, game: runtime.gamesMap.get('chicago'), runtime, Range, HandEquity })
  }
}