import create from './scenarios'

describe('Pre-flop Scenarios', function() {
  describe('Multiway All In', function() {
    it('should play through to the end', function() {
      const game = create('preflop/all-in', {
        autoDeal: false 
      })
      game.deal()
      game.stage.should.equal('river')
      game.toGo.should.equal(0)
      game.numberOfPlayersInHand.should.equal(5)
      game.isPotRaised.should.equal(false, 'pot should not be raised')
      game.isPotGood.should.equal(true, 'pot should be good')
      game.isActionClosed.should.equal(true, 'action should be closed')
      game.isHandFinished.should.equal(true, 'hand should be finished')
      game.hasPotBeenAwarded.should.equal(true, 'the pot should have been awarded')
      Object.values(game.playerChips).should.include(15060)
      game.stage.should.equal('river')
    })
  })
})