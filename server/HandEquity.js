import * as pokerTools from 'poker-tools'
import Range from './Range'
import * as combinatorics from 'js-combinatorics'

export class HandEquity {
  constructor(hand, options = {}) {
    const { players = 6 } = options
    this.players = 6
    this.hand = hand
  }

  get combo() {
    const { hand } = this
    return Range.combos.find((combo) => combo.name === hand || combo.normalized === hand)
  }

  get averageWinPercent() {
    return this.combo.strengthVsOpponents[ this.players - 1]
  } 

  get possibleFlops() {
    return require('./info/flops').filter(flop => flop.indexOf(this.combo[0].name) === -1 && flop.indexOf(this.combo[1].name) === -1)
  }
}

export default HandEquity
