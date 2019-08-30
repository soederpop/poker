const script = [ 
  { action: 'raise', playerId: 'P4', amount: 50 },
  { action: 'raise', playerId: 'P5', amount: 3000 },
  { action: 'fold', playerId: 'P6', amount: 0 },
  { action: 'call', playerId: 'P7', amount: 3000 },
  { action: 'call', playerId: 'P8', amount: 3000 },
  { action: 'fold', playerId: 'P9', amount: 0 },
  { action: 'raise', playerId: 'P1', amount: 3000 },
  { action: 'call', playerId: 'P2', amount: 2995 },
  { action: 'fold', playerId: 'P3', amount: 0 },
  { action: 'fold', playerId: 'P4', amount: 0 } 
]

export function create(createGame, options = {}) {
  const game = createGame('texas-holdem', {
    players: 9,
    startingStack: 3000,
    blinds: [5, 10],
    dealer: 1,
    autoDeal: false,
    ...options,
  })

  !options.autoDeal && game.deal()

  script.forEach(action => game.recordAction(action))
  
  return game
}

