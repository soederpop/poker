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

  if (runtime.argv.interactive) {
    await runtime.repl('interactive').launch({ game: runtime.gamesMap.get('chicago'), runtime, Range, HandEquity })
  }
}