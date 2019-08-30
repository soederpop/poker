export function create(createGame, options = {}) {
  const game = createGame('texas-holdem', {
    players: 9,
    startingStack: 1000,
    blinds: [5, 10],
    dealer: 1,
    autoDeal: true,
    ...options
  })
  
  game.deal()

  game.recordAction({ action: 'fold', playerId: 'P4' })
  game.recordAction({ action: 'fold', playerId: 'P5' })
  game.recordAction({ action: 'fold', playerId: 'P6' })
  game.recordAction({ action: 'fold', playerId: 'P7' })
  game.recordAction({ action: 'fold', playerId: 'P8' })
  game.recordAction({ action: 'fold', playerId: 'P9' })
  game.recordAction({ action: 'fold', playerId: 'P1' })

  return game
}

