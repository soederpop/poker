require('babel-plugin-require-context-hook/register')()
require('@babel/register')()
require('@babel/polyfill/noConflict')

const runtime = require('../runtime')

module.exports = async function main(input, callback) {
  const hand = new runtime.HandEquity(input)
  
  hand.run({ 
    batchId: input.batchId,
    players: input.players || 6  
  })

  callback(null, {
    fileId: hand.seed,
    config: input,
    results: hand.report,
  })
}