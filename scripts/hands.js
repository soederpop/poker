require('babel-plugin-require-context-hook/register')()
require('@babel/register')()
require('@babel/polyfill/noConflict')

const runtime = require('../runtime')
const { Range } = runtime

const { players = 9 } = runtime.argv

async function main() {
  const uniqueHands = Range.chain
    .get("combos")
    .uniqBy("normalized")
    .sortBy("rank,kicker")
    .value();
  
  const games = uniqueHands.map(hand => 
    runtime.game('texas-holdem', { players, cards: { P1: hand.map(card => card.name) } })
  ) 
    
  await Promise.all( games.map((game) => {
      game.deal()  
      return game.calculateEquity()
    })
  )
}

main()