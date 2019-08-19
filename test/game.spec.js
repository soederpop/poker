const { createGame } = require('../runtime')

describe('Game Simulator', function() {
  it('can create instance of a game', function() {
    const game = createGame('texas-holdem', {
      players: 9,
      startingStack: 1000,
      blinds: [5, 10]
    })

    game.should.be.an('object')
  })

  it('has different stages', function() {
    const game = createGame('texas-holdem', {
      players: 9,
      startingStack: 1000,
      blinds: [5, 10]
    })
    
    game.deal()
    game.stage.should === 'preflop'
    game.deal()
    game.stage.should === 'flop'
    game.deal()
    game.stage.should === 'turn'
    game.deal()
    game.stage.should === 'river'
  })

  describe('Action Order', function() {
    const game = createGame("texas-holdem", {
      players: 9,
      startingStack: 1000,
      blinds: [5, 10],
      dealer: 1
    });

    game.deal()
  
    it('tracks the button, and blind seats', function() {
      game.dealerSeat.should.equal(1)
      game.smallBlindSeat.should.equal(2)
      game.bigBlindSeat.should.equal(3)
    })

    it('starts off the action preflop with the under the gun player', function() {
      game.actionSeat.should.equal(4)
    })
  })

})