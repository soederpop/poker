import Range, { groups } from './Range'
import { combination } from 'js-combinatorics'
import * as pokerTools from 'poker-tools'

/** 
 * The RangeEquity class calculates the showdown equity
 * of multiple hand ranges.
*/
export class RangeEquity {
  constructor(ranges = []) {
    this.ranges = ranges.map(not => new Range(not))
  }

  get equityCalculators() {
    return this.matchups.map((matchup) => () => {
      try {
        const oddsCalculator = pokerTools.OddsCalculator.calculateEquity(
          matchup.map(i => pokerTools.CardGroup.fromString(i.name))
        )
  
        return {
          matchup,
          equities: oddsCalculator.equities
        }
      } catch(error) {
        throw new Error(`Error with matchup: ${matchup.join(',')}`)
      }

    })
  }

  get matchups() {
    const r1 = this.ranges[0].chain.get('combos').uniqBy('name').value()
    const r2 = this.ranges[1].chain.get('combos').uniqBy('name').value()

    const matchups = []

    r1.forEach((h1) => {
      r2.filter(h2 => !!h1.map(i => i.rank).find(i => h2.map(h => h.rank).indexOf(i) === -1)).forEach(h2 => {
        const matchup = [h1,h2] 
        matchups.push(matchup)
      })
    })

    return matchups
  }
}

export default RangeEquity
