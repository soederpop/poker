export function deal(options = {}) {
  const { playerIds, round } = this

  let board = this.state.get('boardPresets') || []
  let assignedCards = this.state.get('cardPresets') || this.chain.get('players').mapValues(v => []);

  if (round === 0) {
    !this.deck && this.initializeDeck()
    board = this.state.get('boardPresets') || []
    assignedCards = this.state.get('cardPresets') || this.chain.get('players').mapValues(v => []);
    const smallBlind = this.seat(this.smallBlindSeat);
    const bigBlind = this.seat(this.bigBlindSeat);

    this.state.set('pot', 0)
    this.state.set('actions', [])

    this.recordAction({
      playerId: smallBlind.playerId,
      action: "post",
      amount: this.smallBlindAmount
    });

    this.recordAction({
      playerId: bigBlind.playerId,
      action: "post",
      amount: this.bigBlindAmount
    });

    playerIds.forEach((playerId) => {
      if (this.anteAmount > 0) {
        this.recordAction({ playerId, action: "post", amount: this.anteAmount })
      }

      const playerCards = assignedCards[playerId] || []

      this.updatePlayer(playerId, {
        inHand: true,
        cards: playerCards.length 
          ? playerCards 
          : [this.createCard({ label: playerId }), this.createCard({ label: playerId })]
      })
    })

    this.readyForAction()

  } else if (round === 1) {
    this.state.set('stage', 'flop')

    this.updateBoard({
      flop: board.length >= 3 ? board.slice(0, 3) : [
        this.createCard({ label: "board" }), 
        this.createCard({ label: "board" }), 
        this.createCard({ label: "board" })
      ]
    })

    this.readyForAction(true, { action: this.firstToActSeat })
    
  } else if (round === 2) {
    this.state.set('stage', 'turn')
    this.updateBoard({
      turn: board.length >= 4 ? [board[3]] : [this.createCard({ label: "board" })]
    })
    this.readyForAction(true, { action: this.firstToActSeat })
  } else if (round === 3) {
    this.state.set('stage', 'river')
    this.updateBoard({
      river: board.length >= 5 ? [board[4]] : [this.createCard({ label: "board" })]
    })
    this.readyForAction(true, { action: this.firstToActSeat })
  }
}