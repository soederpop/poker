require('babel-plugin-require-context-hook/register')()

const runtime = require('../runtime')
const { clear } = runtime.cli
const { render } = require('../server/app')

async function main() {
  const game = runtime
    .game('texas-holdem', {
      players: runtime.argv.players || 9,
      startingStack: 3000,
      blinds: [10, 20],
    }).ready()

  clear()

  render({ game }, { exitOnCtrlC: false })

  const int = setInterval(() => { }, 1000)

  process.on('SIGINT', () =>
    clearInterval(int)
  )
}

main()