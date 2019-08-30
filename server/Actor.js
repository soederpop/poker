import { Helper } from '@skypager/runtime'
import Range, { SYMBOLS } from './Range'
import RangeEquity from './RangeEquity'

/** 
 * The Actor class represents a player at a table, and is intended to make actions
 * in various situations based on the assigned strategy parameters for the actor
*/
export class Actor extends Helper {
  static isCacheable = true 
  static isObservable = true
  static attach = attach

  static observables() {
    return {
      ranges: ["shallowMap", {}],
      defineRange: ["action", this.defineRange]
    }  
  }

  static didCreateHelper(runtime, actor) {
    actor.setup()
    return actor
  }

  /** 
   * The purpose of the actor, of course, is to act.  Calling this method will give the actor
   * an opportunity to use all of the situational and environmental information available to
   * make a decision from one of the available options presented by the game. 
   * 
   * An actor uses its generateDecision method to come up with the object to send to the game.
  */
  async act(options = {}) {
    if (!this.inHand) {
      return false
    }

    if (options.action) {
      const action = { ...options, playerId: this.playerId }
      this.game.recordAction(action)
      return action
    }

    const result = await this.generateDecision(options)
    // TODO: Add validation of the action and amount

    this.game.recordAction(result)

    return result
  }

  /** 
   * Generate a decision that can be sent to the game. 
   * 
   * @private 
  */
  async generateDecision(options = {}) {
    const makeDecision = this.tryGet('makeDecision')  

    const { action, amount } = await makeDecision.call(this, options, this.context)

    const result = { playerId: this.playerId, action, amount };
    
    return result
  }

  /** 
   * Setup calls the hooks for an Actor implementation module to define the parameters
   * for an actors automatic decision making process.  You can define ranges for each position,
   * and each stage.  Generally this is the most useful for defining preflop hand selection
   * and strategy (e.g. open raise, 3bet, 4bet, steal, squeeze play, etc)
   * 
   * Post-flop decision making will need to be more dynamic, so you can control this through
   * the findRange hook
  */
  setup() {
    this.tryResult('defineRanges')
    return this
  }

  /** 
   * Will attempt to use the findRange hook to find the Range that governs the actors
   * hand selection choice for the current stage and position.  If there is no hook,
   * or a Range is not returned, it will attempt to check for defined ranges that make sense
   * (e.g. in an open pot, preflop, your opening range will determine if you're going to raise.) 
   * 
   * If you don't have an opening range defined, but a calling range, this would be your limping range.
  */
  findRangeForSituation() {
    if (this.tryGet('findRange')) {
      const found = this.tryResult('findRange')
      
      if (found) {
        return this.toRange(found)
      }
    }    

    const { isPotRaised, isPotOpen, stage } = this.game
    const { activeOpenRange, activeCallingRange } = this

    if (stage ===  'preflop' && isPotOpen && activeOpenRange) {
      return activeOpenRange
    } else if (isPotRaised && activeCallingRange) {
      return activeCallingRange
    }
  }

  /** 
   * Returns a tree of stages, positions, and actions,
   * and the ranges of hands that are in each.
  */
  get rangeSettings() {
    const { keyBy, groupBy, mapValues } = this.lodash
    const ranges = this.ranges.values()

    return mapValues(
      groupBy(ranges, 'stage'), 
      (rangesAtStage) => 
        mapValues(groupBy(rangesAtStage, 'position'), (actions) => keyBy(actions, 'action')))
  }

  /** 
   * Returns a single range that for that situation
  */
  get activeRange() {
    const activeRange = this.findRangeForSituation()
    return activeRange && this.toRange(activeRange)
  }

  get activeCallingRange() {
    if (this.activeRanges.call) {
      return this.toRange(this.activeRanges.call, this.deadCards, this.playersLeftInHand) 
    }
    
    const callingRange = this.tryResult('callingRange')
    return callingRange && this.toRange(callingRange)
  }

  get activeOpenRange() {
    if (this.activeRanges.open) {
      return this.toRange(this.activeRanges.open, this.deadCards, this.playersLeftInHand) 
    }
    
    const openRange = this.tryResult('openRange')

    return openRange && this.toRange(openRange)
  }

  get currentRanges() {
    return this.get(['rangeSettings', this.game.stage, this.position], {})
  }

  get activeRanges() {
    const { availableOptions } = this
    const { pick } = this.lodash
    return pick(this.currentRanges, availableOptions)
  }

  get continueRanges() {
    const { omit } = this.lodash
    return omit(this.activeRanges, 'fold')
  }

  toRange(input) {
    if (typeof input === 'string') {
      return new Range(input, this.deadCards, this.numberOfPlayersInHand)
    } else if (typeof input === 'object' && !input.combos && typeof input.range === 'string') {
      return new Range(input.range, this.deadCards, this.numberOfPlayersInHand)
    } else if (typeof input === 'object' && input.combos) {
      return input
    }
  }

  defineRange(options = {}) {
    const { isEmpty } = this.lodash
    const { stage = this.stage, position = this.position, actions = {}, action, range = ''} = options
    
    if (isEmpty(action) && !isEmpty(actions)) {
      return Object.keys(actions).map(action => 
        this.defineRange({ action, stage, position, action, range: actions[action] })
      )
    }

    const key = `${stage}:${action}:${position}`

    this.ranges.set(key, {
      range,
      action,
      position,
      stage,
    })

    return this.ranges.get(key)
  }

  get handInRange() {
    return this.activeRange && this.activeRange.includes(this.holding)  
  }

  get handInCallingRange() {
    return this.activeCallingRange && this.activeCallingRange.includes(this.holding)  
  }

  get handInOpeningRange() {
    return this.activeOpenRange && this.activeOpenRange.includes(this.holding)  
  }

  /** 
   * Which actions have already taken place from the perspective of the actor
  */
  get previousActions() {
    return this.game.stageActions
  }

  get toGo() {
    return this.game.toGo - this.amountInvestedThisRound  
  }

  get toGoAsPercentOfStack() {
    return (this.toGo / this.chips) * 100
  }

  get effectiveStackSize() {
    return this.game.effectiveStackSize
  }

  get potOdds() {
    return parseFloat((this.game.pot / this.toGo).toFixed(2))
  }

  get amountInvested() {
    return this
      .game.chain
        .get('actions')
        .filter({ playerId: this.playerId })
        .map(a => a.amount || 0)
        .sum()
        .value()
  }

  get deadCards() {
    return this.game.board.map(card => card.name)
  }

  get bigBlindsLeft() {
    return Math.floor(this.chips / this.game.bigBlindAmount)
  }

  get isLastToAct() {
    return this.game.actionOrder.indexOf(this.seat) === this.game.actionOrder.length - 1
  }

  get availableOptions() {
    const { uniq } = this.lodash
    const availableOptions = this.game.availableOptions

    if (this.toGo === 0) {
      return uniq(['check', ...availableOptions])
    } 

    return availableOptions
  }

  get amountInvestedThisRound() {
    return this
      .game.chain
        .get('stageActions')
        .filter({ playerId: this.playerId })
        .map(a => a.amount || 0)
        .sum()
        .value()
  }

  get allIn() {
    return !!this.playerData.allIn
  }
  
  get inHand() {
    return !!this.playerData.inHand
  }

  get chips() {
    return this.playerData.chips
  }

  get cards() {
    return this.playerData.cards
  }

  get seat() {
    return this.playerData.seat
  }

  get preflopPosition() {
    const { seat, game } = this
    const { dealerSeat, actionOrder = [] } = game

    if (seat === dealerSeat) {
      return 'BTN'
    }

    const dealerPos = actionOrder.indexOf(dealerSeat)
    const pos = actionOrder.indexOf(seat)  

    if (pos === 1) {
      return 'BB'
    } else if (pos === 0) {
      return 'SB'
    } else if (pos === dealerPos - 1) {
      return 'CO'
    } else if (pos === dealerPos - 2) {
      return 'HJ'
    } else if (pos === 2) {
      return 'UTG'
    } else if (pos === 3) {
      return 'UTG+1'
    } else if (pos === 4) {
      return 'MP'
    } else if (pos === 5) {
      return 'MP+1'
    } else if (pos === 6) {
      return 'MP+2'
    } else if (pos === 7) {
      return 'MP+3'
    }
  }

  get position() {
    if (this.game.stage === 'preflop') {
      return this.preflopPosition
    }  

    return this.game.actionOrder.length - this.game.actionOrder.indexOf(this.seat)
  }

  get holding() {
    const { sortBy } = this.lodash
    const { cards } = this
    if (!cards.length) return 

    return sortBy(this.cards, 'rank', 'suit').reverse().map(c => c.name).join("")
  }

  get playersBehind() {
    const { seat } = this

    if (!this.inHand) {
      return -1
    }

    const { actionOrderInHand } = this.game
    const index = actionOrderInHand.indexOf(seat)
    return actionOrderInHand.slice(index).length
  }

  get playersLeftInHand() {
    return this.game.numberOfPlayersInHand
  }

  get combo() {
    return Range.combosMap.get(this.holding) || Range.combos.find(c => c.name === this.holding)
  }

  get actualHandRange() {
    return new Range(this.combo.normalized, this.deadCards, this.playersLeftInHand)
  }

  get actualHandRangeStrength() {
    return this.actualHandRange.strength
  }
  
  get preflopStrength() {
    return this.game.playerPreflopStrength[this.playerId]    
  }

  get profile() {
    return this.name
  }

  get playerId() {
    return this.tryGet('playerId')
  }

  get game() {
    return this.tryGet('game')
  }

  get playerData() {
    return this.game.playerData.get(this.playerId)
  }

}

export default Actor

export function attach(runtime) {
  Helper.registerHelper("actor", () => Actor);
  Helper.attach(runtime, Actor, {
    registry: Helper.createContextRegistry("actors", {
      context: Helper.createMockContext({})
    }),
    lookupProp: "actor",
    registryProp: "actors"
  });
}