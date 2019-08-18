export function deal(options = {}) {
  const { round, playerIds = [] } = this

  const ranks = {
    T: 10,
    t: 10,
    k: 'king',
    a: 'ace',
    q: 'queen',
    j: 'jack',
  } 

  const suits = {
    h: 'hearts',
    c: 'clubs',
    d: 'diamonds',
    s: 'spades'
  }

  const createCard = ({ retry = 0, suit = undefined, rank = undefined, label }) => {
    const args = []

    if (suit && rank) {
      args.push( 
        suits[ String(suit).toLowerCase() ] || suit, 
        ranks[ String(rank).toLowerCase() ] || rank
      )
    }

    try {
      const card = this.chain
      .invoke("deck.createCard", ...args)
      .thru(card => {
        card.owner = label;
        card.name = this.describeCard(card)
        return card;
      })
      .value();

      return card
    } catch(error) {
      if (retry < 3) {
        return createCard({ suit, rank, label, retry: retry + 1 })
      }

      throw new Error(`Invalid Card: ${error} ${suit} ${rank} `)
    }

  }

  if (round === 0) {
    const smallBlind = this.seat(this.smallBlindSeat);
    const bigBlind = this.seat(this.bigBlindSeat);

    this.state.set('pot', 0)

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

      const cards = this.tryGet('cards', {})
      const assignedCards = cards[playerId] || []

      this.updatePlayer(playerId, {
        inHand: true,
        cards: assignedCards.length 
          ? assignedCards.map(({ suit, rank }) => createCard({ suit, rank, label: playerId }))
          : [createCard({ label: playerId }), createCard({ label: playerId })]
      })
    })

    this.readyForAction()

  } else if (round === 1) {
    this.state.set('stage', 'flop')
    this.updateBoard({
      flop: [
        createCard({ label: "board" }), 
        createCard({ label: "board" }), 
        createCard({ label: "board" })
      ]
    })
    this.readyForAction(true, { action: this.firstToActSeat })
    
  } else if (round === 2) {
    this.state.set('stage', 'turn')
    this.updateBoard({
      turn: [createCard({ label: "board" })]
    })
    this.readyForAction(true, { action: this.firstToActSeat })
  } else if (round === 3) {
    this.state.set('stage', 'river')
    this.updateBoard({
      river: [createCard({ label: "board" })]
    })
    this.readyForAction(true, { action: this.firstToActSeat })
  }
}