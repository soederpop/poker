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
    iteration: 0
  }

  get gameId() {
    return this.tryGet('gameId', this.uuid)
  }
  
  get uniqueId() {
    const gameId = this.tryGet("gameId", this.uuid);
    return [gameId, this.iteration, this.uuid].join(':')
  }

  async saveLog() {
    this.runtime.debug(`Saving game log: ${this.uniqueId}`)

    await this.runtime.fileDb.load()
    await this.runtime.fileDb.insert({
      _id: this.uniqueId,
      ...this.toJSON(),
      stageEquities: this.stageEquities.entries(),
    })
    return this
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
      .values().find(({ seat }) => seat === this.actionSeat)
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

    const nextSeat = this.remainingActionOrder.find(seat => this.seat(seat) && this.seat(seat).inHand && !this.seat(seat).allIn)

    if (nextSeat) return nextSeat

    return this.remainingPlayers[0] && this.players[this.remainingPlayers[0]] && this.players[this.remainingPlayers[0]].seat
  }

  /** 
   * Which seat is the dealer in?
  */
  get dealerSeat () {
    return this.state.get('dealer') || 1
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

  get amountsInvestedByPlayer() {
    return this.chain.get('actions').groupBy('playerId').mapValues((actions) => this.lodash.sumBy(actions, 'amount')).value()
  }

  get currentPlayerAmountInvestedTotal() {
    if (!this.currentPlayer) { return 0 }

    return this.chain
      .get('actions')
      .filter({ playerId: this.currentPlayer.playerId })
      .map(a => a.amount || 0)
      .sum()
      .value()
  }
  
  get currentPlayerAmountInvested() {
    if (!this.currentPlayer) { return 0 }

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
    return this.state.get('pot') || 0
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

  get stageActions() {
    return this.chain
      .get('actions')
      .filter({ stage: this.stage })
      .value()
  }

  get isPotOpen() {
    return !this.stageActions.find(({ action }) => action === 'bet' || action === 'raise')
  }

  recordAction({ playerId, action, amount }) {
    
    const { min, max } = this.lodash
    const { stage } = this

    let { actions = [] } = this

    const player = this.playerData.get(playerId)

    if (player.chips === 0) {
      throw new Error(`Player ${playerId} has no chips`)
    }

    if (this.toGo === 0 && action === 'raise') {
      action = 'bet' 
    }

    if ((action === "bet" || action === "raise") && !amount) {
      amount = 2 * this.toGo;
    }

    if (action === 'call') {

    }
    if (action === 'fold') {
      amount = 0
    } else if (action === 'call' || action === 'bet' || action === 'raise' || action === 'post') {
      if (amount > player.chips) {
        amount = player.chips 
      } else if (!amount) {
        amount = this.actors[playerId].toGo
      }
    }

    this.runtime.debug(`Recording Action`, { playerId, action, amount })

    const actionRecord = {
      stage,
      seat: player.seat,
      ...(stage === "preflop" && this.isPotOpen && { open: true }),
      timestamp: Math.floor(+new Date()) / 1000,
      playerId,
      action,
      amount,
      previousHash: this.hash,
      order: actions.length
    };

    actions = actions.concat([actionRecord])

    switch(action) {
      case 'post':
      case 'bet':
      case 'raise':
      case 'call':
        this.state.set('pot', this.pot + amount)
        const nextStackSize = max([player.chips - amount, 0])
        const allIn = nextStackSize <= 0 

        if (allIn) {
          actionRecord.allIn = true
        }

        this.updatePlayer(playerId, {
          chips: nextStackSize,
          allIn
        })
        break
      case 'check':
        break
      case 'fold':
        this.updatePlayer(playerId, {
          inHand: false
        })
        break
      case 'result':
        break
    }

    if (action === 'bet' || action === 'raise') {
      this.state.set('lastBetSeat', player.seat)
    }

    // these are the only actions that can close off the action
    if (action === 'check' || action === 'call' || action === 'fold') {
      this.runtime.debug('Checking if we can close the betting round', {
        action,
        finalActionSeat: this.finalActionSeat,
        previousActionSeat: this.previousActionSeat,
        actionIsClosed: this.actionIsClosed
      })

      if (this.isActionClosed && this.potIsGood) {
        this.finalizeRound()      
      }
    }

    this.state.set('actions', actions)

    return this
  }

  finalizeRound() {
    const { round, remainingPlayers = [], pot } = this        

    if (!round) {
      return
    }

    this.runtime.debug('Finalizing Round', {
      stage: this.stage,
      isActionClosed: this.isActionClosed,
      remainingPlayers: this.remainingPlayers
    })

    if (this.isActionClosed && remainingPlayers.length === 1) {
      this.runtime.debug(`Awarding pot to remaining winner`)
      this.awardPotToWinners()

      Promise.resolve(this.saveLog()).then(() => {
        this.reset()
        this.state.set('dealer', this.dealerSeat === 9 ? 1 : this.dealerSeat + 1)
      })
    } else if (this.stage !== 'river' && (this.playersLeftToAct === 0 || this.actionIsClosed)) {
      this.runtime.debug(`Action is closed, stage is not river. Auto-dealing.`, {
        stage: this.stage,
        playersLeftToAct: this.playersLeftToAct,
        actionIsClosed: this.actionIsClosed
      })
      this.deal()
    }

    return this
  }

  get playersLeftToAct() {
    return this.remainingPlayers.filter(({ allIn }) => !allIn).length
  }
  
  awardPotToWinners() {
    const { remainingPlayers = [], pot } = this

    if (remainingPlayers.length === 1) {
      const winningPlayerId = this.remainingPlayers[0].playerId;
      this.updatePlayer(winningPlayerId, {
        chips: this.players[winningPlayerId].chips + pot
      });
    }
  }

  get isPotRaised() {
    return !!this.stageActions.find(({ action }) => action === 'bet' || action === 'raise')
  }

  get lastBetSeat() {
    return this.chain.get('stageActions')
      .filter(({ action }) => action === 'bet' || action === 'raise')
      .last()
      .get('seat')
      .value()
  }

  get finalActionSeat() {
    if (this.stage === 'preflop' && !this.isPotRaised) {
      return this.bigBlindSeat 
    }

    if (!this.isPotRaised) {
      return this.dealerSeat
    }

    const order = this.getActionOrder(this.lastBetSeat).filter(i => i !== this.lastBetSeat)
    
    const last = order[ order.length - 1 ]

    if (this.seat(last).inHand) {
      return last 
    } else {
      return order.reverse().find(i => this.seat(i).inHand)
    }
  }

  get hash() {
    return this.runtime.hashObject({
      actions: this.actions,
      uuid: this.uuid,
      iteration: this.state.get('iteration'),
      round: this.state.get('round')
    })
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
    }

    if (this.stage === 'flop' || this.stage === 'turn' || this.stage === 'river') {
      if (this.chain.get('stageActions').map('action').filter(i => i === 'check').uniq().size().value() === this.eligiblePlayers.length) {
        return true
      }
    }

    return false
  }

  get actionOrder() {
    return this.getActionOrder()
  }

  get remainingActionOrder() {
    return this.getActionOrder(this.previousActionSeat).filter(i => i !== this.previousActionSeat)
  }

  getActionOrder(fromSeat = this.dealerSeat) {
    const { partition, sortBy } = this.lodash

    const players = sortBy(this.playerData.values(), 'seat')
      .filter(({ startingChips }) => startingChips > 0)

    const seats = players.map(p => p.seat)

    const [b,a] = partition(seats, (seat) => seat > fromSeat)

    return [...b, ...a]
  }

  actorInSeat(seatNumber = this.actionSeat) {
    const { playerId } = this.seat(seatNumber)
    const player = this.playerData.get(playerId)
    return this.actor(player)
  }

  get defaultActorProfile() {
    return this.tryGet('actorProfile', "random")
  }

  actor(data) {
    const { playerId, profile = this.defaultActorProfile  } = data
    return this.runtime.actor(profile, { playerId, game: this })
  }

  get previousActor() {
    return this.actorInSeat(this.previousActionSeat)
  }

  get lastAction() {
    return this.chain.get('stageActions').last().value()
  }

  get previousActionSeat() {
    return this.chain.get('stageActions').last().get('seat').value()
  }

  /** 
   * Returns all the remaining actors who have a claim to the current pot in this round
  */
  get remainingActors() {
    return this.allActors
      .filter(actor => actor.playerData.inHand)
  }

  get remainingPlayers() {
    const folded = this.chain.get('actions').filter({ action: 'fold' }).map('playerId').value()
    return this.remainingActionOrder.map(seat => this.seat(seat)).filter(p => folded.indexOf(p.playerId) === -1)
  }

  get isPotGood() {
    return !this.allActors.find(actor => actor.toGo > 0)
  } 

  get eligiblePlayers() {
    return this
      .chain
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
    return mapValues(this.players, (data) => this.actor(data))
  }

  finishHand() {
    this.readyForAction(false)
      .emit('handFinished', this.players, this.board, this.playerHands)    
  }

  observe() {
    if (this.disposer) {
      this.disposer()
    }

    return this.disposer = this.state.observe(({ name, object, newValue }) => {
      this.emit('stateChange', name, newValue, object)
      if (name === 'round') {
        if (newValue === 0) {
          this.reset()
        }
        this.emit('round', newValue)
      }
    })
  }  

  reset() {
    this.deck = new holdem.Pack()
    this.boardData.clear()    

    this.updateAllPlayers(({ chips }) => ({
      startingChips: chips,
      allIn: false,
      cards: []
    }))

    this.state.delete('playerEquities')
    this.stageEquities.clear()
    this.setState({ 
        iteration: this.state.get('iteration') + 1, 
        round: 0, 
        stage: 'preflop', 
        actions: [],
        pot: 0 
    })
  }

  get holdemLib() {
    return holdem
  }

  get pokerTools() {
    return pokerTools
  }

  static observables() {
    const { isNumber, fromPairs } = this.lodash
    let { board = {}, startingStack = 3000, players = {} } = this.options

    if (isNumber(players)) {
      players = fromPairs(Array.from(new Array(players)).map((j,i) => [`P${i + 1}`, { 
        chips: startingStack,
        startingChips: startingStack,
        cards: [],
        inHand: true,
        seat: i + 1,
        playerId: `P${i + 1}`
      }]))
    }

    return {
      boardData: ["shallowMap", board],
      playerData: ["shallowMap", players],
      advance: ["action", this.advance],
      round: ["computed", () => this.state.get('round')],
      updatePlayer: ["action", this.updatePlayer],
      updateAllPlayers: ["action", this.updateAllPlayers],
      updateBoard: ["action", this.updateBoard],
      ranked: ["computed", this.rankPlayerHands],
      equities: ["computed", () => this.state.get('playerEquities')],
      stageEquities: ["shallowMap", {}]
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
      .mapKeys((v,k) => parseInt(k, 10))
      .mapValues(v => overrides[v] || v)
      .value()
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
    return this.playerHandCollection.hands.map((hand) => {
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

  get currentWinner() {
    try {
      const winningCombination = this.playerHandCollection.highestCombination;
      const winningHandName = this.playerHandCollection.highestCombination
        .name;
      const playerId = this.describeWinner().playerId;
  
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
              cards: winningCombination.cards
            }
          } 
        }
      }
    } catch(error) {
      return { 
        toJSON: () => ({ })
      }
    }
  }

  describeWinner() {
    const { uniq } = this.lodash
    const collection = this.playerHandCollection
    const { highestHand, highestCombination } = collection

    const owners = uniq(highestCombination._hand
      .cards
      .map(c => c.owner))
      
    const winner = owners.find(o => o !== 'board')

    return {
      playerId: winner,
      hand: !winner ? new holdem.Combination(this.board) : this.playerHands[winner]
    }
  }

  get equityWinners() {
    return this.chain
      .get('playerEquities')
      .pickBy(({ equity, tiePercentage }) => equity === 100 || tiePercentage === 100)
      .mapValues((v,playerId) => ({
        ...v,
        cards: this.players[playerId].cards,
        hand: this.playerHands[playerId],
        playerId
      }))
      .values()
      .value()
  }

  get boardHand() {
    return new holdem.Combination(this.board)
  }
 

  describeCard = ({ suit, rank }) => {
    return `${this.aliasTable[String(rank)]}${this.aliasTable[String(suit)]}`;
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

    lookupTable = this.lodash.mapValues(lookupTable, (v) => parseInt(v, 10))

    return {
      suit: lookupTable[suit],
      rank: lookupTable[rank]
    }
  }

  get playerHandsDescription() {
    const { board = [] } = this

    return this.chain.get('playerCards')
      .mapValues((cards) => [...cards, ...board].map(this.describeCard))
      .value()
  }

  get handsCollection() {
    const allHands = Object.entries(this.playerHands).map(([owner,hand]) => ({
      ...hand,
      owner
    }))

    return new holdem.HandsCollection(allHands)
  }

  get playerDrawCombinations() {
    return this.chain
      .get('playerHands')
      .mapValues((hand) => new holdem.DrawCombination(hand))
      .value()
  }

  get playerCardGroups() {
    const players = Object.entries(this.playerCardDescriptions).map(v => 
      [v[0], this.pokerTools.CardGroup.fromString(v[1].join())]
    )

    return this.lodash.fromPairs(players)
  }

  get favorite() {
    return this.chain
      .get('playerEquities', {})
      .omit('hash')
      .entries()
      .sortBy('1.equity')
      .last()
      .thru(v => v && `${v[0]} ${v[1].equity}%`).value()
  }

  async calculateEquity() {
    const cacheKey = runtime.hashObject({
      p: this.playerCardDescriptions,
      b: this.boardDescription
    })

    const exists = await runtime.fileManager.cache.get.info(cacheKey)

    if (exists) {
      const data = await runtime.fileManager.cache
        .get(cacheKey)
        .then(r => JSON.parse(String(r.data)))
      return data
    } else {
      const data = this.calculatePlayerEquities() 
      await runtime.fileManager.cache
        .put(cacheKey, JSON.stringify(data))

      return data
    }
  }

  calculatePlayerEquities() {
    const { omit } = this.lodash

    if (this.hash === this.get(`playerEquities.hash`)) {
      return omit(this.playerEquities, 'hash')
    }

    const board = this.pokerTools.CardGroup.fromString(this.boardDescription.replace(/\s/g, ''))

    const players = Object.entries(this.playerCardDescriptions).map(v => 
      [v[0], this.pokerTools.CardGroup.fromString(v[1].join())]
    )

    const results = this.pokerTools.OddsCalculator.calculateEquity(players.map(p => p[1]), board)

    const data = players.reduce((memo, player, i) => {
      const playerId = player[0]
      return {
        ...memo,
        [playerId]: {
          cards: this.players[playerId].cards.map(c => this.describeCard(c)).join(','), 
          equity: results.equities[i].getEquity(),
          tie: results.equities[i].getTiePercentage()
        }
      }
    }, {})

    this.state.set('playerEquities', {
      ...data,
      hash: this.hash
    })

    const result = {
      ...data,
      hash: this.hash
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
        name: combo.name
      })).value()
  }

  get playerHandCollection() {
    return new holdem.HandsCollection(Object.values(this.playerHands))
  }

  get playerHandCombos() {
    const { board = [] } = this

    return this.chain
      .get('playerCards')
      .mapValues((cards) => holdem.HandsCollection.createCombinations(
        new holdem.Hand(board),
        new holdem.Hand(cards)
      ))
      .value()
  }
  
  get playerOuts() {
    return this.chain
      .get('playerHands')
      .mapValues('drawCombination.outs')
      .value()
  }

  get playerHandSummaries() {
    return this.chain  
      .get('playerHands')
      .mapValues((h) => {
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
        const hand = h.cards.map(this.describeCard).join("")

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
  }

  get playersInRange() {
    return this.chain
      .get('playerCombos')
      .mapValues((myCombo,playerId) => !!this.playerRanges[playerId].combos.find(c => c.name === myCombo.name))
      .value()
  }

  get playerRanges() {
    return this.chain.get('actors')
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
    return this.chain.get('playerCombos')
    .mapValues(v => v.strengthVsOpponents[ this.numberOfPlayers - 2])
    .value()
  }

  get playerPreflopReality() {
    return this.chain.get('playerPreflopStrength')
    .mapValues((average, playerId) => ({
      average,
      current: this.get(['playerEquities', playerId, 'equity']),
      holding: this.get(['playerCombos', playerId, 'name']),
    }))
    .value()
  }

  get playerCombos() {
    return this.chain
      .get("playerCards")
      .mapValues(cards => {
        const i = cards.map(c => c.name).join('')
        const j = cards.map(c => c.name).reverse().join('')
        return Range.combosMap.get(i) || Range.combosMap.get(j)
      })
      .value()
  }

  get playerStacks() {
    const numPlayers = Object.values(this.eligiblePlayers).length

    return this.chain.get('players')
      .mapValues(({ chips }) => ({
        chips,
        bbs: Math.round(chips / this.bigBlindAmount),
        m: Math.round(chips / (this.bigBlindAmount + this.smallBlindAmount + (this.anteAmount * numPlayers)))
      }))
  }

  get playerHands() {
    const { board = [] } = this

    return this.chain
      .get('playerCards')
      .mapValues((cards) => holdem.HandsCollection.createCombinations(
        new holdem.Hand(board),
        new holdem.Hand(cards)
      ))
      .mapValues('highestHand')
      .value()
  }

  get allPlayerCards() {
    return this.chain
      .get('players')  
      .mapValues('cards')
      .value()
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
      .mapValues((cards) => cards.map(this.describeCard))
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
      ...attributes
    })

    return this
  }

  updateAllPlayers(attributes = {}) {
    const playerIds = this.playerData.keys()
    
    for(let playerId of playerIds) {
      this.updatePlayer(playerId, typeof attributes === 'function' ? attributes(this.playerData.get(playerId)) : attributes)
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

  /** 
   * Deal a starting hand to each of the players.
  */
  deal(options = {}) {
    const dealer = this.tryGet('deal')
    this.emit('willDeal')

    if (!this.deck) {
      this.deck = new holdem.Pack()
    }

    try {
      dealer.call(this, options)
    } catch(error) {
      console.error(error)
    }

    this.advance()
    this.emit('didDeal')

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
    };
  }

  toJSON(options = {}) {
    return this.chain.invoke('asJSON').cloneDeep().value()
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
        this.stage === "flop" ||
        this.stage === "river" ||
        this.stage === "turn") && {
        preflopStrength: this.playerPreflopStrength,
        equity: this.playerEquities,
        reality: this.playerPreflopReality,
        outs: this.playerOuts,
        summary: this.playerHandSummaries
      }),
      ...(this.stage === 'river' || this.remainingPlayers.length === 1) && { currentWinner: this.currentWinner.toJSON() }
    };
  }
}

export function attach(runtime) {
  Helper.registerHelper('game', () => Game)
  Helper.attach(runtime, Game, {
    registry: Helper.createContextRegistry('games',{
      context: Helper.createMockContext({}),
    }),
    lookupProp: 'game',
    registryProp: 'games'    
  })
}

export default Game