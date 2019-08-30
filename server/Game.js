import runtime, { Helper } from '@skypager/node'
import * as holdem from 'tx-holdem'
import * as pokerTools from 'poker-tools'
import Range from './Range'

/**
 * The Game class represents a game of poker (e.g. Texas Holdem) and is intended to represent
 * how a particular game of poker is played, given a set of players who have an amount of chips.
 *
 * A Game has rules about bets, antes, and hand rankings, and provides the format for a "hand" that is
 * dealt and played through by the players.
 */
export class Game extends Helper {
  static isCacheable = false
  static isObservable = true
  static attach = attach

  initialState = {
    round: 0,
    stage: 'preflop',
    dealer: 1,
    // small blind, big blind
    action: 0,
    actions: [],
    pot: 0,
    iteration: 0,
  }

  get gameId() {
    return this.tryGet('gameId', this.uuid)
  }

  get uniqueId() {
    const { uniq } = this.lodash
    const gameId = this.tryGet('gameId', this.uuid)
    return uniq([gameId, this.iteration, this.uuid]).join(':')
  }

  async saveLog() {
    this.runtime.debug(`Saving game log: ${this.uniqueId}`)

    await this.runtime.fileDb.load()

    const record = {
      _id: this.uniqueId,
      ...this.toJSON(),
      stageEquities: this.stageEquities.entries(),
    }

    const response = await this.runtime.fileDb.insert(record)

    this.runtime.debug('Saved Game log to DB', { dbFile: this.runtime.fileDb.db.filename, response, _id: this.uniqueId })

    return record
  }

  get iteration() {
    return this.state.get('iteration')
  }

  ready() {
    this.observe()
    return this
  }

  readyForAction(ready) {
    this.setState({
      waitingForAction: ready,
    })

    return this
  }

  get firstToActSeat() {
    const { stage } = this
    if (stage === 'preflop') {
      return this.actionOrder[2]
    } else {
      return this.actionOrder[0]
    }
  }

  get currentPlayer() {
    return this.chain
      .get('players')
      .values()
      .find(({ seat }) => seat === this.actionSeat)
      .value()
  }

  get currentActor() {
    return this.actorInSeat(this.actionSeat)
  }

  get actionSeat() {
    const { previousActionSeat } = this

    if (!previousActionSeat) {
      return this.actionOrder.find(seat => this.seat(seat).inHand)
    }

    const nextSeat = this.remainingActionOrder.find(
      seat => this.seat(seat) && this.seat(seat).inHand && !this.seat(seat).allIn
    )

    if (nextSeat) return nextSeat

    return (
      this.remainingPlayers[0] &&
      this.players[this.remainingPlayers[0]] &&
      this.players[this.remainingPlayers[0]].seat
    )
  }

  /**
   * Which seat is the dealer in?
   */
  get dealerSeat() {
    return this.state.get('dealer') || 1
  }

  /**
   * If the dealer folds, then we go to the dealers right
   */
  get lastToActSeat() {
    return this.actionOrderInHand[ this.actionOrderInHand.length - 1]
  }

  get potOdds() {
    return 1 / (1 / parseFloat((this.pot / this.toGo).toFixed(2)))
  }

  get effectiveStackSize() {
    const { min } = this.lodash
    const actors = this.remainingActors

    return min(actors.map(a => a.chips))
  }

  get stackToPotRatio() {
    return parseFloat((1 * (this.effectiveStackSize / this.pot)).toFixed(2))
  }

  get toGo() {
    const { max } = this.lodash
    const { stageActions } = this
    return max(stageActions.map(({ amount = 0 }) => amount)) || 0
  }

  get amountsInvestedByPlayerThisStage() {
    const { mapValues } = this.lodash
    const base = this.chain
      .get('playersInHand')
      .mapValues(v => 0)
      .value()

    const amounts = this.chain
      .get('stageActions')
      .groupBy('playerId')
      .mapValues(actions => this.lodash.sumBy(actions, 'invested'))
      .value()

    return mapValues({ ...base, ...amounts }, v => v || 0)
  }

  get amountsInvestedByPlayer() {
    return this.chain
      .get('actions')
      .groupBy('playerId')
      .mapValues(actions => this.lodash.sumBy(actions, 'amount'))
      .value()
  }

  get currentPlayerAmountInvestedTotal() {
    if (!this.currentPlayer) {
      return 0
    }

    return this.chain
      .get('actions')
      .filter({ playerId: this.currentPlayer.playerId })
      .map(a => a.amount || 0)
      .sum()
      .value()
  }

  get currentPlayerAmountInvested() {
    if (!this.currentPlayer) {
      return 0
    }

    return this.chain
      .get('actions')
      .filter({ playerId: this.currentPlayer.playerId, stage: this.stage })
      .map(a => a.amount || 0)
      .sum()
      .value()
  }

  get availableOptions() {
    const facingAmount = this.toGo - this.currentPlayerAmountInvested

    if (facingAmount > 0) {
      return ['call', 'raise', 'fold']
    }

    return ['check', 'raise', 'fold']
  }

  get smallBlindAmount() {
    if (this.blindLevel === 0) {
      return 5
    } else {
      return 5 * (this.blindLevel + 1)
    }
  }

  get bigBlindAmount() {
    return this.smallBlindAmount * 2
  }

  get anteAmount() {
    return 0
  }

  get pot() {
    return this.chain.get('actions').sumBy('invested').value()
  }

  get blindLevel() {
    return this.state.get('level') || 0
  }

  get smallBlindSeat() {
    return this.actionOrder[0]
  }

  get bigBlindSeat() {
    return this.actionOrder[1]
  }

  get actions() {
    return this.state.get('actions') || []
  }

  get actionsChain() {
    return this.chain.get('actions')
  }

  get actionsScript() {
    const { pick } = this.lodash
    return this.actionsChain.map(action => pick(action, 'playerId', 'action', 'amount', 'stage')).value()
  }

  get stageActionsChain() {
    return this.chain
      .get('actions')
      .filter({ stage: this.stage })
  }

  get stageActions() {
    return this.stageActionsChain.value()
  }

  get isPotOpen() {
    return !this.stageActions.find(({ action }) => action === 'bet' || action === 'raise')
  }

  recordAction({ playerId, action, amount }) {
    const { min, max } = this.lodash
    const { stage } = this

    let { actions = [] } = this
    const order = actions.length

    const player = this.playerData.get(playerId)

    if (player.chips === 0 && !player.allIn) {
      throw new Error(`Player ${playerId} has no chips`)
    }

    if (this.actionIsClosed || this.handIsFinished) {
      return this
    }

    if (this.toGo === 0 && action === 'raise') {
      action = 'bet'
    }

    if ((action === 'bet' || action === 'raise') && !amount) {
      amount = 2 * this.toGo
    }

    if (action === 'bet' || action === 'raise') {
      if (this.numberOfRaises > 0) {
        action = 'raise'
      }

      amount 
    }

    if (action === 'call') {
      amount = this.toGo
    }

    if (action === 'fold' || action === 'check') {
      amount = 0
    } else if (action === 'call' || action === 'bet' || action === 'raise') {
      if (amount < this.toGo && player.chips < this.toGo) {
        amount = player.chips
      } else if (amount < this.toGo && player.chips >= this.toGo) {
        amount = this.toGo
      }
    }

    this.runtime.debug(`Recording Action`, { playerId, action, amount })

    const { amountsInvestedByPlayerThisStage } = this

    const invested = amount > 0 ? amount - (amountsInvestedByPlayerThisStage[playerId] || 0) : 0

    const actionRecord = {
      stage,
      seat: player.seat,
      ...action === 'raise' && { raiseNumber: this.numberOfRaises + 1 }, 
      ...(stage === 'preflop' && this.isPotOpen && { open: true }),
      timestamp: Math.floor(+new Date()) / 1000,
      playerId,
      action,
      amount: this.allowDecimals ? amount : Math.floor(amount),
      invested, 
      previousHash: this.hash,
      order
    }

    actions = actions.concat([actionRecord])

    switch (action) {
      case 'post':
      case 'bet':
      case 'raise':
      case 'call':
        // this.state.set('pot', this.pot + amount)
        const nextStackSize = max([player.chips - invested, 0])
        const allIn = nextStackSize <= 0

        if (allIn) {
          actionRecord.allIn = true
        }

        this.updatePlayer(playerId, {
          chips: nextStackSize,
          allIn,
        })
        break
      case 'check':
        break
      case 'fold':
        this.updatePlayer(playerId, {
          inHand: false,
        })
        break
      case 'result':
        break
    }

    if (action === 'bet' || action === 'raise') {
      this.state.set('lastBetSeat', player.seat)
      this.state.set('finalActionSeat', this.getFinalActionSeat())
    }

    this.state.set('actions', actions)

    // these are the only actions that can close off the action
    if (action === 'check' || action === 'call' || action === 'fold') {
      if (this.isActionClosed && this.isPotGood) {
        this.runtime.debug('Trying to finalize round')
        this.finalizeRound()
        return this
      }
    }


    return this
  }

  finalizeRound() {
    const { round, playersInHand, pot } = this

    if (!round) {
      this.runtime.debug('finalizing round failed', { round })
      return
    }

    const playerIdsInHand = Object.keys(playersInHand)

    this.runtime.debug('Finalizing Round', {
      stage: this.stage,
      isActionClosed: this.isActionClosed,
      autoDeal: this.autoDeal,
      playerIds: playerIdsInHand
    })

    if (this.isActionClosed && playerIdsInHand.length === 1) {
      this.runtime.debug(`Awarding pot to remaining winner`)
      this.awardPotToWinners()
    } else if (this.stage !== 'river' && this.isActionClosed) {

      if (this.autoDeal) {
        this.runtime.debug(`Action is closed, stage is not river. Auto-dealing.`, {
          stage: this.stage,
          playersLeftToAct: this.playersLeftToAct,
          isActionClosed: this.isActionClosed,
        })
  
        this.deal()
      } else {
        this.runtime.debug('Ready to deal')
      }
      
    } else if (this.stage === 'river' && this.isActionClosed) {
      this.runtime.debug('Hand is finished, awarding pot to winner(s)')
      this.awardPotToWinners()
    }

    return this
  }

  get everybodyAllIn() {
    return this.remainingPlayers.filter(({ allIn }) => !allIn).length === 0
  }

  get playersLeftToAct() {
    return this.remainingPlayers.filter(({ allIn }) => !allIn).length
  }

  playThrough() {
    if (this.state.get('playingThrough')) {
      this.runtime.debug('Already playing through')
      return  
    }

    this.runtime.debug('Playing Through', {
      everybodyAllIn: this.everybodyAllIn,  
      playersInHand: Object.keys(this.playersInHand),
      actionOrder: this.actionOrderInHand,
      stage: this.stage,
      actionSeat: this.actionSeat,
      lastToActSeat: this.lastToActSeat,
      finalActionSeat: this.finalActionSeat,
      numberOfPlayersInHand: this.numberOfPlayersInHand
    })

    this.state.set('playingThrough', true)
    this.checkDown()

    this.state.set('playingThrough', false)

    if (this.stage !== 'river') {
      this.deal()      
    }
  }

  checkDown() {
    if (this.stageActions.length === 0) {
      const { actionOrderInHand } = this
      actionOrderInHand.map(seat => {
        const { playerId } = this.seat(seat)
        this.recordAction({ action: 'check', playerId })
      })
    } else {
      throw new Error('Can only call this method when no actions have been recorded in the stage')
    }
  }

  awardPotToWinners() {
    const { playersInHand, pot } = this
    const playerIds = Object.keys(playersInHand)
    const numberOfPlayers = playerIds.length

    this.runtime.debug('Awarding pot to winners', {
      board: this.boardDescription,
      players: this.playerCardDescriptions
    })

    if (this.isTie) {
      const amount = (pot / numberOfPlayers).toFixed(2)
      
      const amounts = []

      if (amount.endsWith('.00')) {
        amounts.push( ...Array.from(new Array(numberOfPlayers)).map(i => parseInt(amount.split('.')[0], 10)) )
      } else {
        amounts.push( ...Array.from(new Array(numberOfPlayers)).map(i => parseInt(amount.split('.')[0], 10)) )
        amounts[ amounts.length - 1 ] = amounts[ amounts.length - 1 ] + 1
      }

      this.runtime.debug('Awarding Tie', { amounts })

      amounts.forEach((amount, index) => {
        const playerId = playerIds[index]
        this.updatePlayer(playerId, {
          chips: this.playerChips[playerId] + parseInt(amount, 10)  
        })
      })

    } else if (Object.values(playersInHand).length === 1) {
      const winningPlayerId = Object.keys(playersInHand)[0]
      this.runtime.debug(`Only one player remains`, { winningPlayerId })
      this.updatePlayer(winningPlayerId, {
        chips: parseInt(this.players[winningPlayerId].chips, 10) + parseInt(pot, 10),
      })
    } else {
      const { currentWinner } = this

      this.runtime.debug('Calculating winner to award amount to', {
        currentWinner: currentWinner && currentWinner.player
      }) 

      if (currentWinner && currentWinner.player) {
        const winningPlayerId = currentWinner.player.playerId || currentWinner.player.id
        this.updatePlayer(winningPlayerId, {
          chips: this.players[winningPlayerId].chips + pot,
        })
      }
    }

    this.state.set('potAwarded', pot)

    return this
  }

  get hasPotBeenAwarded() {
    return typeof this.state.get('potAwarded') !== 'undefined'
  }

  async finishHand() {
    this.emit('finishedHand', this.toJSON())
    const saved = await this.saveLog()
    this.emit('savedLog', saved._id)

    this.state.set('dealer', this.dealerSeat === 9 ? 1 : this.dealerSeat + 1)
    this.reset()

    return saved
  }

  get isPotRaised() {
    return !!this.stageActions.find(({ action }) => action === 'bet' || action === 'raise')
  }

  get lastBetSeat() {
    return this.state.get('lastBetSeat') || this.previousBetSeat
  }

  get initialBet() {
    return this.previousRaises[0]
  }

  get previousBet() {
    return this.previousRaises[ this.previousRaises.length - 1]
  }

  get previousRaises() {
    return this.stageActionsChain.filter(a => a.action === 'bet' || a.action === 'raise').value()
  }

  get numberOfRaises() {
    // the big blind counts as the first bet
    if (this.stage === 'preflop') {
      return this.previousRaises.length + 1
    }
    
    return this.previousRaises.length + 1
  }

  get isThreeBet() {
    return this.numberOfRaises === 3
  }

  get isFourBet() {
    return this.numberOfRaises === 4
  }

  get isFiveBet() {
    return this.numberOfRaises === 5
  }

  get numberOfBetCallers() {
    if (!this.isPotRaised || !this.initialBet) {
      return this.stageActionsChain.filter({ action: 'call' }).size().value() 
    } else {
      const { initialBet, stageActions } = this
      return stageActions.filter(action => action.order > initialBet.order && action.action === 'call').length
    }
  } 

  get initialBetSeat() {
    return this.chain
      .get('stageActions')
      .filter(({ action }) => action === 'bet' || action === 'raise')
      .first()
      .get('seat')
      .value()
  }

  get previousBetSeat() {
    return this.chain
      .get('stageActions')
      .filter(({ action }) => action === 'bet' || action === 'raise')
      .last()
      .get('seat')
      .value()
  }

  get finalActionSeat() {
    return this.state.get('finalActionSeat') || this.getFinalActionSeat()
  }

  getFinalActionSeat() {
    if (this.stage === 'preflop' && !this.isPotRaised) {
      return this.bigBlindSeat
    }

    if (!this.isPotRaised) {
      return this.lastToActSeat
    }

    if (this.stageActions.length === 0) {
      return this.lastToActSeat
    }

    const order = this.getActionOrder(this.lastBetSeat).filter(i => i !== this.lastBetSeat)

    const last = order[order.length - 1]

    if (this.seat(last).inHand) {
      return last
    } else {
      return order.find(i => this.seat(i).inHand)
    }
  }

  get hash() {
    return this.runtime.hashObject({
      actions: this.actions,
      uuid: this.uuid,
      iteration: this.state.get('iteration'),
      round: this.state.get('round'),
    })
  }

  get actionIsClosed() {
    return this.isActionClosed
  }

  get isActionClosed() {
    if (!this.lastAction) {
      return false
    }

    if (this.lastAction && this.lastAction.action === 'post') {
      return false
    }

    if (this.isPotRaised && this.isPotGood) {
      if (this.finalActionSeat === this.previousActionSeat) {
        return true
      }

      if (this.actionSeat === this.lastBetSeat) {
        return true
      }
    } else if (!this.isPotRaised && this.isPotGood) {
      if (this.previousActionSeat === this.finalActionSeat) {
        return true
      }
    }

    if (this.stage === 'flop' || this.stage === 'turn' || this.stage === 'river') {
      if (
        this.chain
          .get('stageActions')
          .map('action')
          .filter(i => i === 'check')
          .uniq()
          .size()
          .value() === this.numberOfPlayersInHand
      ) {
        return true
      }
    }

    return false
  }

  get actionOrder() {
    return this.getActionOrder()
  }

  get actionOrderInHand() {
    return this.actionOrder.filter(seat => !!this.seat(seat) && this.seat(seat).inHand)
  }

  get remainingActionOrder() {
    return this.getActionOrder(this.previousActionSeat).filter(i => i !== this.previousActionSeat)
  }

  getActionOrder(fromSeat = this.dealerSeat) {
    const { partition, sortBy } = this.lodash

    const players = sortBy(this.playerData.values(), 'seat').filter(
      ({ startingChips }) => startingChips > 0
    )

    const seats = players.map(p => p.seat)

    const [b, a] = partition(seats, seat => seat > fromSeat)

    return [...b, ...a]
  }

  actorInSeat(seatNumber = this.actionSeat) {
    const { playerId } = this.seat(seatNumber)
    const player = this.playerData.get(playerId)
    return this.actor(player)
  }

  get defaultActorProfile() {
    return this.tryGet('actorProfile', 'standard')
  }

  actor(data) {
    const { playerId, profile = this.defaultActorProfile } = data
    return this.runtime.actor(profile, { playerId, game: this })
  }

  get previousActor() {
    return this.actorInSeat(this.previousActionSeat)
  }

  get lastAction() {
    return this.chain
      .get('stageActions')
      .last()
      .value()
  }

  get previousActionSeat() {
    return this.chain
      .get('stageActions')
      .last()
      .get('seat')
      .value()
  }

  /**
   * Returns all the remaining actors who have a claim to the current pot in this round
   */
  get remainingActors() {
    return this.allActors.filter(actor => actor.playerData.inHand)
  }

  get foldedPlayers() {
    return this.chain
      .get('actions')
      .filter({ action: 'fold' })
      .map('playerId')
      .value()
  }

  get remainingPlayers() {
    const folded = this.foldedPlayers
    return this.remainingActionOrder
      .map(seat => this.seat(seat))
      .filter(p => folded.indexOf(p.playerId) === -1)
  }

  get potInvestments() {
    const { omit } = this.lodash
    const { amountsInvestedByPlayerThisStage } = this

    return omit(amountsInvestedByPlayerThisStage, this.foldedPlayers)
  }

  get potIsGood() {
    return this.isPotGood
  }

  get isPotGood() {
    const { toGo } = this
    return Object.values(this.potInvestments).every(amount => amount === toGo)
  }

  get isHandFinished() {
    return (
      (this.stage === 'river' && this.isActionClosed) ||
      Object.keys(this.playersInHand).length === 1
    )
  }

  get numberOfPlayersInHand() {
    return Object.keys(this.playersInHand).length
  }

  get eligiblePlayers() {
    return this.chain
      .invoke('playerData.values')
      .filter(({ chips }) => chips > 0)
      .value()
  }

  /**
   * Returns the all of the actors in their action order
   */
  get allActors() {
    return this.actionOrder.map(this.actorInSeat.bind(this))
  }

  get actors() {
    const { mapValues } = this.lodash
    return mapValues(this.players, data => this.actor(data))
  }

  observe() {
    if (this.disposer) {
      this.disposer()
    }

    return (this.disposer = this.state.observe(({ name, object, newValue }) => {
      this.emit('stateChange', name, newValue, object)
      if (name === 'round') {
        if (newValue === 0) {
          this.reset()
        }
        this.emit('round', newValue)
      }
    }))
  }

  reset({ autoDeal } = { autoDeal: this.autoDeal }) {
    this.runtime.debug('Resetting Game', { autoDeal })

    this.initializeDeck()

    this.updateAllPlayers(({ chips }) => ({
      startingChips: chips,
      allIn: false,
      cards: [],
    }))

    this.state.delete('potAwarded')
    this.state.delete('cardPresets')
    this.state.delete('boardPresets')

    this.state.delete('playerEquities')
    this.stageEquities.clear()
    this.setState({
      iteration: this.state.get('iteration') + 1,
      round: 0,
      stage: 'preflop',
      actions: [],
      pot: 0,
    })

    if (autoDeal) {
      this.runtime.debug('Auto-dealing after reset')
      this.deal()
    }
  }

  initializeDeck() {
    this.runtime.debug('Initializing New Deck', {
      iteration: this.iteration,
      round: this.round
    })

    this.deck = new holdem.Pack()  
    this.boardData.clear()
    this.prefillCards()
    return this.deck
  }

  get cardsLeftInDeck() {
    return this.deck 
      ? this.deck._availableCards.length
      : null 
  }

  prefillCards() {
    this.runtime.debug('Prefilling Cards', {
      board: this.tryGet('board', []),
      cards: this.tryGet('cards', {}),
      cardsLeftInDeck: this.cardsLeftInDeck,
      has: this.deck.has('hearts', 'ace')
    })

    const board = this.tryGet('board', []).map((i) => this.createCard(i, { label: 'board' }))
    const cards = this.chain
      .get('players')
      .mapValues(v => [])
      .merge(this.tryGet('cards', {}))
      .mapValues((cards, playerId) => cards.map(card => this.createCard(card, { label: playerId })))
      .value()    
    
    this.runtime.debug('Prefilling Cards', { board, cards })
    this.setState({ boardPresets: board, cardPresets: cards })
  }

  get holdemLib() {
    return holdem
  }

  get pokerTools() {
    return pokerTools
  }

  static observables() {
    const { isNumber, fromPairs } = this.lodash
    let { startingStack = 3000, players = {} } = this.options

    if (isNumber(players)) {
      players = fromPairs(
        Array.from(new Array(players)).map((j, i) => [
          `P${i + 1}`,
          {
            chips: startingStack,
            startingChips: startingStack,
            cards: [],
            inHand: true,
            seat: i + 1,
            playerId: `P${i + 1}`,
          },
        ])
      )
    }

    return {
      boardData: ['shallowMap', {}],
      playerData: ['shallowMap', players],
      advance: ['action', this.advance],
      round: ['computed', () => this.state.get('round')],
      updatePlayer: ['action', this.updatePlayer],
      updateAllPlayers: ['action', this.updateAllPlayers],
      finishHand: ['action', this.finishHand ],
      updateBoard: ['action', this.updateBoard],
      dealFlop: ['action', this.dealFlop],
      dealTurn: ['action', this.dealTurn],
      dealRiver: ['action', this.dealRiver],
      ranked: ['computed', this.rankPlayerHands],
      equities: ['computed', () => this.state.get('playerEquities')],
      stageEquities: ['shallowMap', {}],
    }
  }

  seat(seatNumber) {
    return this.playerData.values().find(({ seat }) => seat === seatNumber)
  }

  setState(update) {
    if (typeof update === 'function') {
      const val = update(this.currentState)
      this.state.merge(val)
    } else {
      this.state.merge(update)
    }
  }

  get currentState() {
    return this.state.toJSON()
  }

  get aliasTable() {
    const overrides = {
      ace: 'A',
      diamonds: 'd',
      spades: 's',
      clubs: 'c',
      hearts: 'h',
      jack: 'J',
      king: 'K',
      queen: 'Q',
      '10': 'T',
    }

    return this.chain
      .get('holdemLib.Card.RANK_TO_ALIAS')
      .mapKeys((v, k) => parseInt(k, 10))
      .mapValues(v => overrides[v] || v)
      .value()
  }

  get cardsTable() {
    return this.chain.get('aliasTable').invert().mapValues(v => parseInt(v, 10)).value()
  }

  get board() {
    return this.chain
      .invoke('boardData.values')
      .flatten()
      .value()
  }

  get boardDescription() {
    return this.board.map(this.describeCard).join(' ')
  }

  rankPlayerHands() {
    return this.playerHandCollection.hands.map(hand => {
      const cards = hand.cards
      const ownerCard = cards.find(card => card.owner !== 'board')
      const owner = ownerCard ? ownerCard.owner : 'board'

      return {
        owner,
        comboName: hand._combination.name,
        comboCards: hand._combination._cards,
        comboRank: hand._combination.rank,
      }
    })
  }

  get isTie() {
    const winningCombinationCards = this.get('currentWinner.winningCombination.cards', [])
    return winningCombinationCards.filter(o => o.owner === 'board').length === 5
  }

  get currentWinner() {
    try {
      const winningCombination = this.playerHandCollection.highestCombination
      const winningHandName = this.playerHandCollection.highestCombination.name
      const playerId = this.describeWinner().playerId

      return {
        player: this.players[playerId],
        winningCombination,
        winningHandName,
        toJSON: () => {
          return {
            playerId,
            winningHandName,
            winningCombination: {
              name: winningCombination.name,
              cards: winningCombination.cards,
            },
          }
        },
      }
    } catch (error) {
      return {
        toJSON: () => ({}),
      }
    }
  }

  describeWinner() {
    const { uniq } = this.lodash
    const collection = this.playerHandCollection
    const { highestHand, highestCombination } = collection

    const owners = uniq(highestCombination._hand.cards.map(c => c.owner))

    const winner = owners.find(o => o !== 'board')

    return {
      playerId: winner,
      hand: !winner ? new holdem.Combination(this.board) : this.playerHands[winner],
    }
  }

  get equityWinners() {
    return this.chain
      .get('playerEquities')
      .pickBy(({ equity, tiePercentage }) => equity === 100 || tiePercentage === 100)
      .mapValues((v, playerId) => {
        const playerHand = this.playerHands[playerId]
        return {
          ...v,
          cards: playerHand.cards,
          hand: playerHand.combination.name,
          playerId,
        }
      })
      .values()
      .value()
  }

  get boardHand() {
    return new holdem.Combination(this.board)
  }

  describeCard = ({ suit, rank } = {}) => {
    return `${this.aliasTable[String(rank)]}${this.aliasTable[String(suit)]}`
  }
  
  createCard(val, options = {}) {
    if (typeof val === 'object') {
      const asString = [val.rank, val.suit].join('')

      const resent = this.createCard(asString, {
        ...val,
        ...options
      })

      return resent
    }

    const { pure = false } = options
    const { cardsTable } = this

    let card, name
    let [rank, suit] = val.split('')

    if (val.length === 2) {
      rank = rank.toUpperCase()
      suit = suit.toLowerCase()
      name = [rank, suit].join('')
    } else {
      card = this.safeCreateCard() 
      name = card.name = this.describeCard(card)
      card.owner = options.owner || options.label
      return card
    }

    if (pure) {
      return { holdemRank: holdemRanks[rank], holdemSuit: holdemSuits[suit], rank: cardsTable[rank], suit: cardsTable[suit], name }
    } else {
      this.runtime.debug('Safely Generating Card', { suit, rank })
      card = this.safeCreateCard(holdemSuits[suit], holdemRanks[rank])
      
      if (!card) {
        throw new Error(`Card has already been pulled from the deck: ${name}`)
      }

      card.owner = options.owner || options.label
      card.name = name
      return card
    }
  }

  safeCreateCard(...args) {
    const { times } = this.lodash
    const availableCards = this.deck._availableCards.length
    let count = 1
    let card

    while(!card) {
      card = this.deck.createCard(...args)

      if (count > availableCards && !card) {
        throw new Error(`Could not safely created card: ${JSON.stringify(args)}`)
      }

      count = count + 1
    }

    return card
  }

  getCardValues(description) {
    const parts = description.split('')
    const suit = parts.pop()
    const rank = parts.join('')
    const aliases = this.lodash.invert(this.aliasTable)
    let lookupTable = {
      ...aliases,
      h: aliases.h,
      c: aliases.c,
      s: aliases.s,
      d: aliases.d,
    }

    lookupTable = this.lodash.mapValues(lookupTable, v => parseInt(v, 10))

    return {
      suit: lookupTable[suit],
      rank: lookupTable[rank],
    }
  }

  get playerHandsDescription() {
    const { board = [] } = this

    return this.chain
      .get('playerCards')
      .mapValues(cards => [...cards, ...board].map(this.describeCard))
      .value()
  }

  get handsCollection() {
    const allHands = Object.entries(this.playerHands).map(([owner, hand]) => ({
      ...hand,
      owner,
    }))

    return new holdem.HandsCollection(allHands)
  }

  get playerDrawCombinations() {
    return this.chain
      .get('playerHands')
      .mapValues(hand => new holdem.DrawCombination(hand))
      .value()
  }

  get playerCardGroups() {
    const players = Object.entries(this.playerCardDescriptions).map(v => [
      v[0],
      this.pokerTools.CardGroup.fromString(v[1].join()),
    ])

    return this.lodash.fromPairs(players)
  }

  get favorite() {
    return this.chain
      .get('playerEquities', {})
      .omit('hash')
      .entries()
      .sortBy('1.equity')
      .last()
      .thru(v => v && `${v[0]} ${v[1].equity}%`)
      .value()
  }

  async calculateEquity() {
    const cacheKey = runtime.hashObject({
      p: this.playerCardDescriptions,
      b: this.boardDescription,
    })

    const exists = await runtime.fileManager.cache.get.info(cacheKey)

    if (exists) {
      const data = await runtime.fileManager.cache
        .get(cacheKey)
        .then(r => JSON.parse(String(r.data)))
      return data
    } else {
      const data = this.calculatePlayerEquities()
      await runtime.fileManager.cache.put(cacheKey, JSON.stringify(data))

      return data
    }
  }

  calculatePlayerEquities() {
    const { omit } = this.lodash

    if (this.hash === this.get(`playerEquities.hash`)) {
      return omit(this.playerEquities, 'hash')
    }

    const board = this.pokerTools.CardGroup.fromString(this.boardDescription.replace(/\s/g, ''))

    const players = Object.entries(this.playerCardDescriptions).map(v => [
      v[0],
      this.pokerTools.CardGroup.fromString(v[1].join()),
    ])

    const results = this.pokerTools.OddsCalculator.calculateEquity(players.map(p => p[1]), board)

    const data = players.reduce((memo, player, i) => {
      const playerId = player[0]
      return {
        ...memo,
        [playerId]: {
          cards: this.players[playerId].cards.map(c => this.describeCard(c)).join(','),
          equity: results.equities[i].getEquity(),
          tie: results.equities[i].getTiePercentage(),
        },
      }
    }, {})

    this.state.set('playerEquities', {
      ...data,
      hash: this.hash,
    })

    const result = {
      ...data,
      hash: this.hash,
    }

    this.stageEquities.set(this.stage, result)

    return result
  }

  get playerHandStatus() {
    return this.chain
      .get('playerHands')
      .mapValues((combo, id) => ({
        holding: this.playerCards[id].map(this.describeCard),
        played: combo.cards.map(this.describeCard),
        board: this.board.map(this.describeCard),
        name: combo.name,
      }))
      .value()
  }

  get playerHandCollection() {
    return new holdem.HandsCollection(Object.values(this.playerHands))
  }

  get playerHandCombos() {
    const { board = [] } = this

    return this.chain
      .get('playerCards')
      .mapValues(cards =>
        holdem.HandsCollection.createCombinations(new holdem.Hand(board), new holdem.Hand(cards))
      )
      .value()
  }

  get playerOuts() {
    try {
      return this.chain
        .get('playerHands')
        .mapValues('drawCombination.outs')
        .value()
    } catch(error) {
      const { mapValues } = this.lodash
      return mapValues(this.players, v => 0)
    }
  }

  get playerHandSummaries() {
    try {

    return this.chain
      .get('playerHands')
      .mapValues(h => {
        const isRoyalFlush = h.isRoyalFlush()
        const isStraightFlush = h.isStraightFlush()
        const isFourOfKind = h.isFourOfKind()
        const isFullHouse = h.isFullHouse()
        const isFlush = h.isFlush()
        const isStraight = h.isStraight()
        const isThreeOfKind = h.isThreeOfKind()
        const isTwoPairs = h.isTwoPairs()
        const isPair = h.isPair()
        const isKicker = h.isKicker()
        const hand = h.cards.map(this.describeCard).join('')

        let title = ''
        if (isRoyalFlush) {
          title = 'Royal Flush'
        } else if (isStraightFlush) {
          title = 'Straight Flush'
        } else if (isFourOfKind) {
          title = 'Four of a kind'
        } else if (isFullHouse) {
          title = 'Full House'
        } else if (isFlush) {
          title = 'Flush'
        } else if (isStraight) {
          title = 'Straight'
        } else if (isThreeOfKind) {
          title = 'Three of a kind'
        } else if (isTwoPairs) {
          title = 'Two pairs'
        } else if (isPair) {
          title = 'Pair'
        } else if (isKicker) {
          title = 'High Card'
        }

        return `${title}: ${hand}`
      })
      .value()
    } catch(error) {
      this.runtime.error(`Error calculating hand summaries`, { error: error.message, board: this.board, cards: this.playerCards })
      this.runtime.error(error.stack)
      const { mapValues } = this.lodash
      return mapValues(this.players, (v) => '')
    }
  }

  get playersInHand() {
    return this.chain
      .get('players')
      .pickBy('inHand')
      .value()
  }

  get playersInRange() {
    return this.chain
      .get('playerCombos')
      .mapValues(
        (myCombo, playerId) =>
          !!this.playerRanges[playerId].combos.find(c => c.name === myCombo.name)
      )
      .value()
  }

  get playerRanges() {
    return this.chain
      .get('actors')
      .mapValues('preflopRange')
      .value()
  }

  async compareRanges(a, b, options = {}) {
    const r1 = this.playerRanges[a]
    const r2 = this.playerRanges[b]
    const result = await r1.compare(r2, { ...options, board: this.board.map(b => b.name).join('') })

    if (options.full) {
      return result
    } else {
      const { ours, theirs, tie } = result
      return { [a]: ours, [b]: theirs, tie }
    }
  }

  get playerPreflopStrength() {
    return this.chain
      .get('playerCombos')
      .mapValues(v => v ? v.strengthVsOpponents[this.numberOfPlayers - 2] : 0)
      .value()
  }

  get playerPreflopReality() {
    return this.chain
      .get('playerPreflopStrength')
      .mapValues((average, playerId) => ({
        average,
        current: this.get(['playerEquities', playerId, 'equity']),
        holding: this.get(['playerCombos', playerId, 'name']),
      }))
      .value()
  }

  get playerCombos() {
    return this.chain
      .get('playerCards')
      .mapValues(cards => {
        const i = cards.map(c => c.name).join('')
        const j = cards
          .map(c => c.name)
          .reverse()
          .join('')
        return Range.combosMap.get(i) || Range.combosMap.get(j)
      })
      .value()
  }

  get playerChips() {
    return this.chain.invoke('playerData.toJSON').mapValues(v => parseInt(v.chips, 10)).value()
  }
  
  get playerStacks() {
    const numPlayers = Object.values(this.eligiblePlayers).length

    return this.chain.invoke('playerData.toJSON').mapValues(({ chips }) => ({
      chips: parseInt(chips, 10),
      bbs: Math.round(chips / this.bigBlindAmount),
      m: Math.round(
        chips / (this.bigBlindAmount + this.smallBlindAmount + this.anteAmount * numPlayers)
      ),
    })).value()
  }

  get playerHands() {
    const { board = [] } = this

    return this.chain
      .get('playerCards')
      .mapValues(cards =>
        holdem.HandsCollection.createCombinations(new holdem.Hand(board), new holdem.Hand(cards))
      )
      .mapValues('highestHand')
      .value()
  }

  get allPlayerCards() {
    return this.chain
      .get('players')
      .mapValues('cards')
      .value()
  }

  get allPlayerCards() {
    return this.chain.get('playerCards').values().flatten().value()
  }

  get allPlayerCardDescriptions() {
    return this.chain.get('playerCards').values().flatten().map(this.describeCard).value()
  }

  get playerCards() {
    return this.chain
      .get('players')
      .pickBy('inHand')
      .mapValues('cards')
      .value()
  }

  get playerCardDescriptions() {
    return this.chain
      .get('playerCards')
      .mapValues(cards => cards.map(this.describeCard))
      .value()
  }

  get playerIds() {
    return this.playerData.keys()
  }

  get numberOfPlayers() {
    return this.playerIds.length
  }

  get players() {
    return this.playerData.toJSON()
  }

  updateBoard(attributes = {}) {
    this.boardData.merge(attributes)
    return this
  }

  updatePlayer(playerId, attributes = {}) {
    const player = this.playerData.get(playerId)

    if (!player) {
      throw new Error(`Invalid Player ID: ${playerId}`)
    }

    this.playerData.set(playerId, {
      playerId,
      ...player,
      ...attributes,
    })

    return this
  }

  updateAllPlayers(attributes = {}) {
    const playerIds = this.playerData.keys()

    for (let playerId of playerIds) {
      this.updatePlayer(
        playerId,
        typeof attributes === 'function' ? attributes(this.playerData.get(playerId)) : attributes
      )
    }

    return this
  }

  get playerEquities() {
    return this.state.get('playerEquities')
  }

  get stage() {
    return this.state.get('stage') || 'preflop'
  }

  get round() {
    return this.state.get('round')
  }

  advance() {
    this.state.set('round', this.state.get('round') + 1)
    return this
  }

  get autoDeal() {
    if (!this.state.has('autoDeal')) {
      this.state.set('autoDeal', this.tryGet('autoDeal', true) !== false)
    }

    return this.state.get('autoDeal')
  }

  toggleAutoDeal() {
    return this.state.set('autoDeal', !this.autoDeal)
  }

  /**
   * Deal a starting hand to each of the players.
   */
  deal(options = {}) {
    const dealer = this.tryGet('deal')
    this.emit('willDeal')

    if (!this.deck) {
      this.runtime.debug('Dealing without deck being initialized')
      this.initializeDeck()
    }

    try {
      dealer.call(this, options)
    } catch (error) {
      console.error(error)
    }

    this.advance()

    this.emit('didDeal')

    if (this.everybodyAllIn) {
      this.runtime.debug('Everybody is all in', {
        stage: this.stage,
        round: this.round
      })  
      this.state.set('finalActionSeat', this.lastToActSeat)
      this.playThrough()
    }

    return this
  }

  get boardPresets() {
    return this.state.get('boardPresets') || []
  }

  get cardPresets() {
    return this.state.get('cardPresets') || this.chain.get('players').mapValues(v => []).value()
  }

  dealFlop() {
    const board = this.state.get('boardPresets') || []
    this.stage.set('flop')
    this.updateBoard({
      flop: board.length >= 3 ? board.slice(0, 3) : [
        this.createCard({ label: "board" }), 
        this.createCard({ label: "board" }), 
        this.createCard({ label: "board" })
      ]
    })
    this.readyForAction(true, { action: this.actionSeat })
    return this
  }

  dealTurn() {
    const board = this.state.get('boardPresets') || []
    this.state.set('stage', 'turn')
    this.updateBoard({
      turn: board.length >= 4 ? [board[3]] : [this.createCard({ label: 'board' })],
    })    
    this.readyForAction(true, { action: this.actionSeat })
    return this
  }

  dealRiver() {
    const board = this.state.get('boardPresets') || []
    this.state.set('stage', 'river')
    this.updateBoard({
      river: board.length >= 5 ? [board[4]] : [this.createCard({ label: 'board' })],
    })    
    this.readyForAction(true, { action: this.actionSeat })
    return this
  }

  get stats() {
    return {
      potOdds: this.potOdds,
      stackToPotRatio: this.stackToPotRatio,
      effectiveStackSize: this.effectiveStackSize,
      availableOptions: this.availableOptions,
      toGo: this.toGo,
      isActionClosed: this.isActionClosed,
      isPotOpen: this.isPotOpen,
      isPotRaised: this.isPotRaised,
    }
  }

  toJSON(options = {}) {
    return this.chain
      .invoke('asJSON')
      .cloneDeep()
      .value()
  }

  asJSON(options = {}) {
    return {
      id: this.tryGet('gameId', this.uuid),
      smallBlindAmount: this.smallBlindAmount,
      bigBlindAmount: this.bigBlindAmount,
      anteAmount: this.anteAmount,
      uuid: this.uuid,
      availableOptions: this.availableOptions,
      lastBetSeat: this.lastBetSeat,
      previousActionSeat: this.previousActionSeat,
      lastActionSeat: this.previousActionSeat,
      finalActionSeat: this.finalActionSeat,
      currentPlayerAmountInvested: this.currentPlayerAmountInvested,
      amountsInvestedByPlayer: this.amountsInvestedByPlayer,
      currentPlayer: this.currentPlayer && this.currentPlayer.playerId,
      isActionClosed: this.isActionClosed,
      isPotRaised: this.isPotRaised,
      isPotGood: this.isPotGood,
      isHandFinished: this.isHandFinished,
      toGo: this.toGo,
      stage: this.stage,
      board: this.board,
      boardDescription: this.boardDescription,
      cardDescriptions: this.playerCardDescriptions,
      round: this.round,
      actions: this.actions,
      pot: this.pot,
      actionSeat: this.actionSeat,
      dealerSeat: this.dealerSeat,
      smallBlindSeat: this.smallBlindSeat,
      players: this.players,
      favorite: this.favorite,
      equityWinners: this.equityWinners,
      isPotOpen: this.isPotOpen,
      hash: this.hash,
      actionOrder: this.actionOrder,
      remainingActionOrder: this.remainingActionOrder,
      lastAction: this.lastAction,
      remainingPlayers: this.remainingPlayers.map(p => p.playerId),
      bigBlindSeat: this.bigBlindSeat,
      ...((this.round > 0 ||
        this.stage === 'flop' ||
        this.stage === 'river' ||
        this.stage === 'turn') && {
        preflopStrength: this.playerPreflopStrength,
        equity: this.playerEquities,
        reality: this.playerPreflopReality,
        outs: this.playerOuts,
        summary: this.playerHandSummaries,
      }),
      ...((this.stage === 'river' || this.remainingPlayers.length === 1) && {
        currentWinner: this.currentWinner.toJSON(),
      }),
    }
  }
}

export function attach(runtime) {
  Helper.registerHelper('game', () => Game)
  Helper.attach(runtime, Game, {
    registry: Helper.createContextRegistry('games', {
      context: Helper.createMockContext({}),
    }),
    lookupProp: 'game',
    registryProp: 'games',
  })
}

export default Game


export const holdemRanks = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  T: 10,
  t: 10,
  k: 'king',
  K: 'king',
  a: 'ace',
  A: 'ace',
  q: 'queen',
  Q: 'queen',
  j: 'jack',
  J: 'jack',
}

export const holdemSuits = {
  h: 'hearts',
  c: 'clubs',
  d: 'diamonds',
  s: 'spades',
}

