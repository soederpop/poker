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

  setup() {
    this.tryResult('defineRanges')
    return this
  }

  useStandardRanges() {
    const { ultraStrong, strong, medium, loose } = Range.sklansky 

    this.defineRange({ stage: 'preflop', position: 'UTG', range: ultraStrong.input, action: 'open' })
    this.defineRange({ stage: 'preflop', position: 'UTG+1', range: ultraStrong.input, action: 'open' })
    this.defineRange({ stage: 'preflop', position: 'MP', range: strong.input, action: 'open' })
    this.defineRange({ stage: 'preflop', position: 'MP+1', range: strong.input, action: 'open' })
    this.defineRange({ stage: 'preflop', position: 'HJ', range: strong.input, action: 'open' })
    this.defineRange({ stage: 'preflop', position: 'CO', range: medium.input, action: 'open' })
    this.defineRange({ stage: 'preflop', position: 'BTN', range: medium.input, action: 'open' })
    this.defineRange({ stage: 'preflop', position: 'SB', range: strong.input, action: 'open' })
    this.defineRange({ stage: 'preflop', position: 'BB', range: strong.input, action: 'open' })
  }

  async act(options = {}) {
    if (!this.inHand) {
      return false
    }

    if (options.action) {
      const action = { ...options, playerId: this.playerId }
      this.game.recordAction(action)
      return action
    }

    const makeDecision = this.tryGet('makeDecision')  

    const { action, amount } = await makeDecision.call(this, options, this.context)

    const result = { playerId: this.playerId, action, amount };
    
    // TODO: Add validation of the action and amount

    this.game.recordAction(result)

    return result
  }

  get rangeSettings() {
    const { keyBy, groupBy, mapValues } = this.lodash
    const ranges = this.ranges.values()

    return mapValues(
      groupBy(ranges, 'stage'), 
      (rangesAtStage) => 
        mapValues(groupBy(rangesAtStage, 'position'), (actions) => keyBy(actions, 'action')))
  }

  defineRange({ stage, action, position, range = ''}) {
    const key = `${stage}:${action}:${position}`
    this.ranges.set(key, {
      range: new Range(range),
      action,
      position,
      stage,
    })

    return this.ranges.get(key)
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

  get bigBlindsLeft() {
    return Math.floor(this.chips / this.game.bigBlindAmount)
  }

  get isLastToAct() {
    return this.game.actionOrder.indexOf(this.seat) === this.game.actionOrder.length - 1
  }

  get availableOptions() {
    const availableOptions = this.game.availableOptions

    if (this.toGo === 0) {
      return ['check', ...availableOptions]
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

    return this.cards.map(c => c.name).join("")
  }

  get combo() {
    return Range.combosMap.get(this.holding)  
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