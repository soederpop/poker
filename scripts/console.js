require('babel-plugin-require-context-hook/register')()

const runtime = require('../runtime')

async function main() {

  const game = runtime.game('texas-holdem', {
    players: 9,
    startingStack: 3000,
    blinds: [10, 20],
    cards: {
      P1: [{ suit: 'h', rank: 'A' }, { suit: 'h', rank: 'K' }]
    }
  })

  game.deal()
  const hand = new runtime.HandEquity({
    runs: runtime.argv.runs ? parseInt(runtime.argv.runs, 10) : 1000,
    cards: {
      P1: [{ suit: "h", rank: "A" }, { suit: "h", rank: "K" }]
    }
  });

  const api = runtime.client('game-api')
  const cards = {
    P2: [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }],
    P3: [{ rank: "A", suit: "c" }, { rank: "K", suit: "c" }],
  }
  const board = [
    { rank: "A", suit: "d" },
    { rank: "K", suit: "d" },
    { rank: "Q", suit: "d" },
    { rank: "J", suit: "d" },
    { rank: "T", suit: "d" },
  ]

  const game2 = runtime.game('texas-holdem', {
    board,
    cards,
    players: 9,
    startingStack: 1000,
    autoDeal: false 
  })    

  await runtime.repl('interactive').launch({
    runtime,
    game,
    game2,
    g2: game2,
    hand,
    Range: runtime.Range,
    HandEquity: runtime.HandEquity,
    r1: new runtime.Range('22-AA,ATs+,KTs+'),
    r2: new runtime.Range('JJ+,AQs,AKs'),
    r3: new runtime.Range('65s,87s,98s,JTs,22-99'),
    s1: runtime.Range.sklansky(1),
    s2: runtime.Range.sklansky(2),
    s3: runtime.Range.sklansky(3),
    s4: runtime.Range.sklansky(4),
    s5: runtime.Range.sklansky(5),
    l: runtime.lodash,
    api,
  })
}

main()
