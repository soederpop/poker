import { createGame, createScenario } from '../runtime'

describe('Players', function() {
  describe('Actor Model', function() {
    let game
    this.beforeAll(function() {
      game = createScenario('preflop/blindVsBlind')
    })

    it('can check down a hand', async function() {
      const game = createScenario('preflop/blindVsBlind')     

      await game.currentActor.act({ action: 'call', amount: 10 })
      await game.currentActor.act({ action: 'check' })

      game.stage.should.equal('flop')

      await game.currentActor.act({ action: 'check' })
      await game.currentActor.act({ action: 'check' })

      game.stage.should.equal('turn')
      
      await game.currentActor.act({ action: 'check' })
      await game.currentActor.act({ action: 'check' })

      game.stage.should.equal('river')

      await game.currentActor.act({ action: 'check' })
      await game.currentActor.act({ action: 'check' })

      game.isHandFinished.should.equal(true, 'hand should be finished')
      game.hasPotBeenAwarded.should.equal(true, 'pot should have been awarded')
      game.stage.should.equal('river')

      await game.finishHand()
      game.round.should.equal(1)
      game.stage.should.equal('preflop')
      game.allPlayerCards.should.not.be.empty
    })

    it('can automatically check down a hand', function() {
      const game = createScenario('preflop/blindVsBlind')     

      game.recordAction({ playerId: 'P2', action: 'call', amount: 10 })
      game.recordAction({ playerId: 'P3', action: 'check' })

      while(!game.isHandFinished && game.actions.length < 20) {
        game.recordAction({ playerId: game.currentActor.playerId, action: 'check' })
      }

      game.isHandFinished.should.equal(true)
    })

    async function play({ abortCount, finishCount }) {
      const game = createGame('texas-holdem', {
        players: 9,
        startingStack: 5000,
        blinds: [25, 50],
        dealer: 1
      })     
      
      while(!game.isHandFinished && game.actions.length < 150 && !game.abort) {
        if (!game.actionSeat) {
          game.reset({ autoDeal: true })
        } 
      
        try {
          if (!game.everybodyAllIn) {
            await game.currentActor.act()
          }
        } catch(e) {
          game.abort = true
          abortCount = abortCount + 1
        }
      }

      if (game.isHandFinished) {
        finishCount = finishCount + 1
      }

      return { abortCount, finishCount }
    }    

    xit('can automatically finish hands', async function() {
      const queue = Array.from(new Array(10))

      let abortCount = 0
      let finishCount = 0

      for(let run of queue) {
        await play({ abortCount, finishCount })        
      }

      finishCount.should.be.greaterThan(80)
    })

    it('points to the current actor', function() {
      game.should.have.property('currentActor')
        .that.is.an('object')
        .that.has.property('act')
        .that.is.a('function')

      game.currentActor.should.have.property('preflopPosition', 'SB')
    })

    it('gives the current actor options', function() {
      game.currentActor.availableOptions.should.be.an('array')
    })

    it('tracks how much the current actor has to put into the pot to proceed', function() {
      game.currentActor.toGo.should.equal(5)
    })

    it('gives the actor facts', function() {
      const actor = game.currentActor
      actor.should.have.property('position')
      actor.should.have.property('preflopPosition', 'SB')
      actor.should.have.property('effectiveStackSize', 990)
      actor.should.have.property('potOdds', 3)
      actor.should.have.property('amountInvested', 5)
      actor.should.have.property('bigBlindsLeft', 99)
    })

    it('lets the actor make decisions', async function() {
      const decision = await game.currentActor.generateDecision() 

      decision.should.be.an('object')
        .with.property('action')
        .that.is.a('string')
    })
  })

  describe('Situational Info', function() {
    it('gives us information about the hands', function() {
      const game = createScenario('preflop/all-in')
      game.should.have.property('playerHands')
        .that.is.an('object')
        .that.has.property('P1')     
        .that.has.property('cards')
        .that.is.an('array')
      
      game.playerHands.P1.should.have.property('combination')
      
      game.should.have.property('playerCards')
        .that.is.an('object')
        .that.has.property('P1')
        .that.is.an('array')
     
      game.should.have.property('playerCardDescriptions')
        .that.is.an('object')
        .that.has.property('P1')
        .that.is.an('array')     
    })    

    it('has information about the average preflop equity', function() {
      const game = createScenario('preflop/all-in')
      game.should.have.property('playerPreflopStrength')
        .that.is.an('object')
        .that.has.property('P1')     
        .that.is.a('number')
    })

    it('can calculate the actual equity for a player', async function() {
      const game = createScenario('preflop/blindVsBlind')
      game.deal()
      await game.calculateEquity()
      game.should.have.property('playerEquities')
        .that.is.an('object')
        .that.has.property('P2')     
        .that.is.an('object')
        .that.has.property('equity')
        .that.is.a('number')
    })

    it('has information about the player combos', function() {
      const game = createScenario('preflop/all-in')

      game.should.have.property('playerCombos')
        .that.is.an('object')
        .that.has.property('P1')
        .that.is.an('array')

      game.playerCombos.P1.should.have.property('toJSON').that.is.a('function')
    })
  })
})