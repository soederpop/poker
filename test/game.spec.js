const { createGame } = require('../runtime')
import create from './scenarios'

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
    let game

    it('tracks the button, and blind seats', function() {
      game = createGame('texas-holdem', {
        players: 9,
        startingStack: 1000,
        blinds: [5, 10],
        dealer: 1,
      })
  
      game.deal()
          
      game.dealerSeat.should.equal(1)
      game.smallBlindSeat.should.equal(2)
      game.bigBlindSeat.should.equal(3)
    })

    it('starts off the action preflop with the under the gun player', function() {
      game.actionSeat.should.equal(4)
    })
  })

  describe('Preflop Play', function() {
    let game

    it('folds around to the blinds', function() {
      game = createGame('texas-holdem', {
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

      game.actionSeat.should.equal(2)
      game.isPotGood.should.equal(false)
      game.currentActor.toGo.should.equal(5)
    })

    it('lets the small blind call', function() {
      game.recordAction({ action: 'call', amount: 10, playerId: 'P2' })

      game.actionSeat.should.equal(3, 'action seat should be 3')
      game.currentActor.toGo.should.equal(0, 'current actor should be good')
      game.isPotGood.should.equal(true, 'pot should be good')
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

  describe('Small-blind Raises', function() {
    let game

    it('lets the small blind raise', function() {
      game = create('preflop/blindVsBlind', {
        autoDeal: false,
      })
      game.autoDeal.should.equal(false)
      game.currentActor.preflopPosition.should.equal('SB', 'action should be on the small blind')
      game.currentActor.act({ action: 'raise', amount: 45 })
      game.toGo.should.equal(45, 'it should be 45 to go')
      game.isActionClosed.should.equal(false, 'action should remain open')
    })

    it('gives the big blind an option to call', function() {
      game.currentActor.preflopPosition.should.equal('BB')
      game.currentActor.toGo.should.equal(35)
      game.availableOptions.join(",").should.equal("call,raise,fold")      
      game.currentActor.act({ action: 'call', amount: 45 })
      game.isPotGood.should.equal(true)
      game.isActionClosed.should.equal(true)
      game.deal()
    })

    it('deals the flop', function() {
      game.pot.should.equal(90)
      game.stage.should.equal('flop')
      game.board.should.have.property('length', 3)
    })
  })

  describe('Full Hand Scenario 1', function() {
    let game

    it('can deal the scenario', function() {
      game = createGame('texas-holdem', {
        players: 9,
        startingStack: 1000,
        blinds: [5, 10],
        dealer: 1,
        autoDeal: false,
        cards: {
          P3: [{ rank: 'A', suit: 'h' }, { rank: 'A', suit: 'd' }],
          P2: [{ rank: 'K', suit: 'h' }, { rank: 'K', suit: 'd' }],
          P4: [{ rank: 'K', suit: 'c' }, { rank: 'K', suit: 's' }],
        },
        board: [{ rank: 'A', suit: 's' }, { rank: 'A', suit: 'c' }, { rank: 'J', suit: 'h' }],
      })
  
      game.autoDeal.should.equal(false)
  
      game.deal()
      game.recordAction({ action: 'fold', playerId: 'P4' })
      game.recordAction({ action: 'fold', playerId: 'P5' })
      game.recordAction({ action: 'fold', playerId: 'P6' })
      game.recordAction({ action: 'fold', playerId: 'P7' })
      game.recordAction({ action: 'fold', playerId: 'P8' })
      game.recordAction({ action: 'fold', playerId: 'P9' })
      game.recordAction({ action: 'fold', playerId: 'P1' })
      game.recordAction({ action: 'call', amount: 10, playerId: 'P2' })
      game.recordAction({ action: 'check', playerId: 'P3' })
  
    })
    it('should be good to deal the flop', function() {
      game.isActionClosed.should.equal(true, 'the action should be closed')
      game.isPotGood.should.equal(true, 'the pot should be good')
      game.isHandFinished.should.equal(false, 'the hand is not finished')
      game.deal()
    })

    it('should have a flop', function() {
      game.stage.should.equal('flop')
      game.board.should.be.an('array').that.has.property('length', 3)
      game.pot.should.equal(20, 'pot should have two big blinds')
    })

    it('lets players check the flop', function() {
      game.toGo.should.equal(0, 'Should be free to play')

      game.recordAction({ action: 'check', playerId: 'P2' })
      game.recordAction({ action: 'check', playerId: 'P3' })
      game.isActionClosed.should.equal(true, 'the action should be closed')
      game.isPotGood.should.equal(true, 'the pot should be good')
      game.isHandFinished.should.equal(false, 'the hand is not finished')     

      game.deal()
      game.stage.should.equal('turn')
      game.board.should.be.an('array').that.has.property('length', 4)
    })

    it('lets players check the turn', function() {
      game.recordAction({ action: 'check', playerId: 'P2' })
      game.recordAction({ action: 'check', playerId: 'P3' })
      game.deal()
      game.stage.should.equal('river')
      game.board.should.be.an('array').that.has.property('length', 5)
    })

    it('lets players check the river', function() {
      game.recordAction({ action: 'check', playerId: 'P2' })
      game.recordAction({ action: 'check', playerId: 'P3' })
      game.isActionClosed.should.equal(true, 'Action should be closed')
      game.isHandFinished.should.equal(true, 'Hand should be finished')
    })

    it('has a winner', function() {
      if (!game.isTie) {
        try {
          game.should.have.property('currentWinner')
          game.currentWinner.should.have.property('player')
          game.currentState.should.have.property('potAwarded', 20)
        } catch(error) {
          console.log(game.boardDescription)
          console.log(game.playerCardDescriptions)
          throw error
        }
      }
    })

    it('can advance to the next hand', function() {
      game.isHandFinished.should.equal(true)
      game.hasPotBeenAwarded.should.equal(true)
    })

    it('can finish the hand, award the pot, and advance', async function() {
      const saved = await game.finishHand()

      saved.should.be.an('object')
        .with.property('uuid')

      game.stage.should.equal('preflop', 'Should be back at preflop')
      game.round.should.equal(0, 'should be in the zero round, no cards dealt')
      game.playerCardDescriptions.should.not.have.property('P1')

      saved.pot.should.equal(20)
      game.pot.should.equal(0)
      game.iteration.should.not.equal(saved.iteration)
      game.bigBlindSeat.should.equal(4)
      game.smallBlindSeat.should.equal(3)
      game.dealerSeat.should.equal(2)

      const stacks = game.playerChips

      stacks.P2.should.not.equal(1000, 'player2 stack should have changed')
      stacks.P3.should.not.equal(1000, `player3 stack should have changed. Check ${saved._id} for details`)
      stacks.P2.should.not.equal(stacks.P3, 'involved players should have different amount of chips')

      stacks.P1.should.equal(1000)
      stacks.P4.should.equal(1000)
      stacks.P5.should.equal(1000)
      stacks.P6.should.equal(1000)
      stacks.P7.should.equal(1000)
      stacks.P8.should.equal(1000)
      stacks.P9.should.equal(1000)

      try {
        game.deal()
        game.playerChips.P4.should.equal(1000 - game.bigBlindAmount)
        game.playerChips.P3.should.equal(saved.players.P3.chips - game.smallBlindAmount)
      } catch(error) {

      }
    })
  })
})