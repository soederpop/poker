import { createGame } from '../runtime'

describe('Playing with known board cards', function() {
  it('lets you specify the board', function() {
    const game = createGame('texas-holdem', {
      board: [{ rank: 'A', suit: 'h' }, { rank: 'K', suit: 'h' }, { rank: 'Q', suit: 'h' }],
      players: 9,
      startingStack: 1000,
      cards: {
        P1: [{ rank: '2', suit: 'c' }, { rank: '3', suit: 'c' }]
      },
    })    

    game.initializeDeck()
    game.boardPresets.should.be.an('array').that.has.property('length', 3)
    game.cardPresets.P1.should.be.an('array').that.has.property('length', 2)
    game.board.should.be.empty
    game.playerCards.P1.should.be.empty
    game.stage.should.equal('preflop')
    game.deal()
    game.stage.should.equal('preflop')
    game.playerCardDescriptions.P1.join('').should.equal('2c3c')
    game.deal()
    game.boardDescription.should.equal('Ah Kh Qh')
  })

  it('recognizes a tie', function() {
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

    const game = createGame('texas-holdem', {
      board,
      cards,
      players: 9,
      startingStack: 1000,
      autoDeal: false 
    })    

    game.deal()
    game.stage.should.equal('preflop')

    game.currentActor.act({ action: 'fold' })
    game.currentActor.act({ action: 'fold' })
    game.currentActor.act({ action: 'fold' })
    game.currentActor.act({ action: 'fold' })
    game.currentActor.act({ action: 'fold' })
    game.currentActor.act({ action: 'fold' })
    game.currentActor.act({ action: 'fold' })
    game.currentActor.act({ action: 'call', amount: 10 })
    game.currentActor.act({ action: 'check' })
    
    game.deal()
    game.stage.should.equal('flop')
    game.currentActor.act({ action: 'check' })
    game.currentActor.act({ action: 'check' })
    game.isActionClosed.should.equal(true)
    game.isPotGood.should.equal(true)

    game.deal()
    game.stage.should.equal('turn')
    game.currentActor.act({ action: 'check' })
    game.currentActor.act({ action: 'check' })
    game.isActionClosed.should.equal(true)
    game.isPotGood.should.equal(true)
    
    game.deal() 
    game.stage.should.equal('river')
    game.currentActor.act({ action: 'check' })
    game.currentActor.act({ action: 'check' })

    game.isActionClosed.should.equal(true)
    game.isPotGood.should.equal(true)
    game.isHandFinished.should.equal(true)
    game.isTie.should.equal(true)
    game.hasPotBeenAwarded.should.equal(true)

    game.playerChips.P2.should.equal(1000)
    game.playerChips.P3.should.equal(1000)
    game.playersInHand.should.not.have.property('P1')
    game.playersInHand.should.have.property('P2')
    game.playersInHand.should.have.property('P3')
  })
})
