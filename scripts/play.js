require('babel-plugin-require-context-hook/register')()

const runtime = require('../runtime')
const { clear } = runtime.cli
const { render } = require('../server/app')

async function main() {
  const server = runtime.server('game-api', {
    displayBanner: false,
    disableLogging: true,
    history: true,
    webpack: false,
    serveStatic: runtime.resolve('lib')
  })

  await server.start()

  const games = server.app.service('/games')

  await games.create({
    gameId: 'chicago',
    players: 9,
    startingStack: 3000,
    blinds: [5, 10]  
  })

  const game = runtime.gamesMap.get('chicago') 

  clear()

  render({ game }, { exitOnCtrlC: false })

  const int = setInterval(() => { }, 1000)

  process.on('SIGINT', () =>
    clearInterval(int)
  )
}

main()