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

  describe('Preflop Scenario 1', function() {
    const game = createGame('texas-holdem', {
      players: 9,
      startingStack: 1000,
      blinds: [5, 10],
      dealer: 1,
    })

    game.deal()
    
    it('folds around to the blinds', function() {
      game.recordAction({ action: 'fold', playerId: 'P4' })
      game.recordAction({ action: 'fold', playerId: 'P5' })
      game.recordAction({ action: 'fold', playerId: 'P6' })
      game.recordAction({ action: 'fold', playerId: 'P7' })
      game.recordAction({ action: 'fold', playerId: 'P8' })
      game.recordAction({ action: 'fold', playerId: 'P9' })
      game.recordAction({ action: 'fold', playerId: 'P1' })

      game.actionSeat.should.equal(2)
      game.isPotGood.should.equal(false)
      game.currentActor.toGo.should.equal(5)
    })

    it('lets the small blind call', function() {
      game.recordAction({ action: 'call', amount: 5, playerId: 'P2' })

      game.actionSeat.should.equal(3)
      game.currentActor.toGo.should.equal(0)
      game.isPotGood.should.equal(true)
    })

    it('lets the big blind have the option of closing the action', function() {
      game.isActionClosed.should.equal(false)
      game.stage.should.equal('preflop')
      game.recordAction({ action: 'check', playerId: 'P3' })
    })

    it('auto deals the flop when the big blind closes the preflop betting round', function() {
      game.stage.should.equal('flop')
      game.actionSeat.should.equal(2)
    })
  })

  describe('Flop Scenario 1', function() {
    const game = createGame('texas-holdem', {
      players: 9,
      startingStack: 1000,
      blinds: [5, 10],
      dealer: 1,
    })

    game.deal()    
    game.recordAction({ action: 'fold', playerId: 'P4' })
    game.recordAction({ action: 'fold', playerId: 'P5' })
    game.recordAction({ action: 'fold', playerId: 'P6' })
    game.recordAction({ action: 'fold', playerId: 'P7' })
    game.recordAction({ action: 'fold', playerId: 'P8' })
    game.recordAction({ action: 'fold', playerId: 'P9' })
    game.recordAction({ action: 'fold', playerId: 'P1' })
    game.recordAction({ action: 'call', amount: 5, playerId: 'P2' })
    game.recordAction({ action: 'check', playerId: 'P3' })

    it('should have a flop', function() {
      game.stage.should.equal('flop')
      game.board.should.be.an('array').that.has.property('length', 3)
    })

    it('lets players check the flop', function() {
      game.toGo.should.equal(0, 'Should be free to play')

      game.recordAction({ action: 'check', playerId: 'P2' })
      game.recordAction({ action: 'check', playerId: 'P3' })

      game.stage.should.equal('turn')
      game.board.should.be.an('array').that.has.property('length', 4)
    })
  })
})