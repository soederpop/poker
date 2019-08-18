require('babel-plugin-require-context-hook/register')()

const runtime = require('../runtime')
const { clear } = runtime.cli
const { render } = require('../server/app')

async function main() {
  clear()

  render({ 
    appName: 'HandStrengthVisualizer', 
    input: '22+,AJs+,KQs,87s,56s'
  }, { exitOnCtrlC: false })

  const int = setInterval(() => { }, 1000)

  process.on('SIGINT', () =>
    clearInterval(int)
  )
}

main()