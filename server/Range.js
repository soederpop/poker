import lodash from 'lodash'
import { bigCombination, combination } from 'js-combinatorics'
import { cardToString, SUITS, RANKS, SYMBOLS, ALIASES } from './cards'
import runtime from '@skypager/runtime'
import { CardGroup, OddsCalculator } from 'poker-tools'
import HAND_STRENGTHS from './info/hand-strength.json'

const [ TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, JACK, QUEEN, KING, ACE ] = RANKS;
const { chunk, meanBy, groupBy, uniq, map, mapValues, uniqBy, isString, isArray, isFunction, isObject, sortBy, min, max, flatten } = lodash

export const combosMap = new Map()
export const flopsMap = new Map()
export const turnsMap = new Map()
export const riversMap = new Map()

export const SKLANKSY_RANGES = { 
  '1': 'AA,KK,QQ,JJ,AKs',
  '2': 'TT,AQs,AJs,KQs,AKo',
  '3': '99,JTs,QJs,ATs,AQo',
  '4': 'T9s,KQo,88,QTs,98s,J9s,AJo,KTs',
  '5': '77,87s,Q9s,T8s,KJo,QJo,JTo,76s,97s,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,65s',
  '6': '66,ATo,55,86s,KTo,QTo,54s,K9s,J8s,75s',
  '7': '44,J9o,64s,T9o,53s,33,98o,43s,22,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s',
  '8': '87,A9o,Q9o,76o,42s,32s,96s,85s,J8o,J7s,65o,54o,74s,K9o,T8o' 
}
/** 
 * @typedef {Object} ComboFilter
 * @property {String} item the individual hand component of a range notation that we're filtering for
 * @property {Number} rank the rank value of the highest card of the two cards
 * @property {Number} kicker the rank value of the lower card of the two cards
 * @property {Boolean} pair both ranks match (e.g. AA)
 * @property {Boolean} suited whether both suits match (e.g. 87s)
 * @property {Boolean} offsuit whether both suits are different (e.g 87)
 * @property {Boolean} connected when the rank and kicker are connected, (e.g. 87o,87s) 
 * @property {Boolean} oneGap when the rank and kicker are one apart, (e.g. 86o,86s) 
 * @property {Boolean} twoGap when the rank and kicker are two apart, (e.g. 85o,85s) 
 * @property {Boolean} threeGap the rank and kicker are three apart, (e.g. 84o,84s) 
 * @property {Boolean} greater whether the range is meant to include all ranks above it 
 * @property {Boolean} weaker whether range is meant to include all ranks below it 
 * @property {Boolean} ranged if the filter is meant to be inclusive of hands within a range (e.g 22-JJ)
 * @property {ComboFilter} top in a ranged combo filter, represents the top of the range
 * @property {ComboFilter} bottom in a ranged combo filter, represents the bottom of the range
*/

/** 
 * @typedef {Object} Card
 * @property {Number} suit
 * @property {Number} rank 
*/

/** 
 * @typedef {String} CardName two character representation of a card e.g. Ah (ace of hearts)
*/

/** 
 * @typedef {String} ComboName four character representation of a card combo e.g. AhKh (ace of hearts, king of hearts)
*/

/** 
 * @typedef {String} NormalizedComboName normalized representation of a card combo e.g. AhKh (ace of hearts, king of hearts) becomes AKs (Ace King suited)
*/

/** 
 * @typedef {Array<Card>} StartingHandCombination 
 * @property {String} name the two cards in the combination, highest rank first (e.g AhKd) 
 * @property {String} normalized the normalized representation (e.g AKo)
 * @property {Number} rank the value of the highest card
 * @property {Number} kicker the rank value of the lower card of the two cards
 * @property {Boolean} pair both ranks match (e.g. AA)
 * @property {Boolean} suited whether both suits match (e.g. 87s)
 * @property {Boolean} offsuit whether both suits are different (e.g 87)
 * @property {Boolean} connected when the rank and kicker are connected, (e.g. 87o,87s) 
 * @property {Boolean} oneGap when the rank and kicker are one apart, (e.g. 86o,86s) 
 * @property {Boolean} twoGap when the rank and kicker are two apart, (e.g. 85o,85s) 
 * @property {Boolean} threeGap the rank and kicker are three apart, (e.g. 84o,84s) * 
 * @property {Function} has whether the combo contains the selected card name
 * @property {Function} toJSON conver the combo to a serialized object
 * @property {Function} cardGroup returns a card group object suitable for use with poker-tools OddsCalculator 
 * @property {Array<Number>} strengthVsOpponents an array of probabilities this combo is the best hand vs a number of opponents, starting with one up to 8 (for a 9 handed game)
 * @property {Number} vsOnePlayer the strength vs one opponent
 * @property {Number} vsThreePlayers the strength vs two opponents
 * @property {Number} vsTwoPlayers the strength vs three opponents
 * @property {Number} showdown a numerical representation of the hands strength if it never improves. 
*/

/** 
 * @typedef {Object} RangeInfo
 * @property {String} input
 * @property {Number} minShowdown 
 * @property {Number} maxShowdown 
 * @property {Number} strength 
 * @property {Number} percentile 
 * @property {Array<StartingHandCombination>} combos
 * @property {Object<Number,Number>} strengthDistribution
*/

/** 
 * @typedef {Object} RangeComparisonResults
 * @property {String} us our range's input
 * @property {String} them the range's input we are comparing against
 * @property {Number} ourWins how many times our range wins
 * @property {Number} theirWins how many times their range wins
 * @property {Number} tie how often they tie
 * @property {Object} numbers the numbers of each matchup that were used in the averages
*/

/** 
 * @typedef {Array<Array<StartingHandCombination>} EquityMatchup
*/

/** 
 * @typedef {Object} EquityCalculator
 * @property {String} board
 * @property {Array<Range>} ranges
 * @property {Array<String>} hashes 
 * @property {Array<EquityMatchup} matchups
 * @property {Function} run
*/

/** 
 * The Range class represents a selection of starting poker hands,
 * which are combinations of two cards with different ranks and suits.
*/
export default class Range {

  /** 
   * @param {String} rangeInput the written hand range notation
   * @param {Array<CardName>} [deadCards=[]] cards which are known to be dead, so not to be included in the range. 
  */
  constructor(rangeInput = '', deadCards = []) {
    this.deadCards = deadCards 
    this.input = rangeInput
  }

  /** 
   * View the range as a serializable object.
   * @returns {RangeInfo}
  */
  toJSON() {
    return {
      input: this.input,
      maxShowdown: this.maxShowdown,
      minShowdown: this.minShowdown,
      percentile: this.percentile,
      strength: this.strength,
      size: this.size,
      strengthDistribution: this.strengthDistribution,
      combos: this.combos.map(combo => combo.toJSON()),
    }
  }

  /** 
   * A distribution of the starting hands showdown value.
   * @type {Object<Number,Number>}
  */
  get strengthDistribution() {
    const { groupBy, mapValues } = lodash
    return mapValues(groupBy(this.combos, 'showdown'), 'length')
  }

  /** 
   * the maximum showdown value in the range of combinations 
   * @type {Number}
  */
  get maxShowdown() {
    return max(this.combos.map(c => c.showdown))
  }

  /** 
   * the maximum showdown value in the range of combinations 
   * @type {Number}
  */
  get minShowdown() {
    return min(this.combos.map(c => c.showdown))
  }

  /** 
   * Which percent of the total possible hands are represented in this range
   * @type {Number}
  */
  get percentile() {
    return (this.size / this.constructor.combos.length) * 100
  }

  /** 
   * Which percent of the total possible hands are represented in this range
   * @type {Number}
  */
  get strength() {
    return (this.size / this.constructor.combos.length) * 100
  }

  /** 
   * How many combinations of starting hands are in this range?
   * 
   * There are 4 ways of making any suited combination (AKs)
   * There are 16 ways of making any combination of two cards
   * There are 6 ways of making a pair
   * 
   * So given 22-33, there would be a total of 18 combinations out of the possible 1326
   * 
  */
  get size() {
    return this.combos.length
  }

  /** 
   * The indiviaul combinations that make up this hand range.
   * 
   * @type {Array<StartingHandCombination>}
  */
  get combos() {
    const notDead = (comboName) => !this.deadCards.find(card => comboName.indexOf(card) >= 0)
    return Range.filterCombos(this.input).filter(combo => notDead(combo.name))
  }

  /** 
   * @type {Object<CardName, Card>}
  */
  static get cardsMap() {
    return Range.chain.get('cards').keyBy('name').value()
  }

  /** 
   * @type {Object<CardName, Card>}
  */ 
  get cardsMap() {
    return Range.chain.get('cards').keyBy('name').value()
  }

  /** 
   * @type {Array<ComboName>}
  */
  get comboNames() {
    return this.combos.map(c => c.name)
  }

  /** 
   * Returns all of the combinations grouped by their normalized representation.
   * 
   * @type {Object<NormalizedComboName, Array<StartingHandCombination>}
  */
  get normalizedCombos() {
    return this.chain.get('combos')
      .groupBy('normalized')
      .value()
  }

  /** 
   * @type {Array<NormalizedComboName>}
  */
  get normalizedComboNames() {
    return Object.keys(this.normalizedCombos)
  }

  /** 
   * An md5 hash of all the combos in this range.
   * 
   * @type {String}
  */
  get hash() {
    return runtime.hashObject(this.comboNames)
  }

  /** 
   * Compare one range vs another using an expensive, montecarlo simulation of possible matchups between the two ranges.
   * This method will be cached using a file system based cache so that once we compare one range vs another, the result will
   * be remembered for future calculations.
   * 
   * @param {Range} range the range we want to compare our equity to
   * @param {Object} options options that get passed to createCalculators
   * @return {Promise<RangeComparisonResults>}
  */
  async compare(range, options) {
    const results = await this.createCalculators(range, options).run()

    const numbers = results
      .map(({ matchup, equities }) => {
        return matchup.map((m,i) => {
          const e = equities[i]
          const d = e.possibleHandsCount;
          const w = e.bestHandCount
          const t = e.tieHandCount
          const advantage =
            Range.combosMap.get(m).vsOnePlayer -
            Range.combosMap.get(matchup[i === 0 ? 1 : 0]).vsOnePlayer;
          return [m, parseFloat(((w / d) * 100).toFixed(2)), parseFloat(((t/d) * 100).toFixed(2)), advantage, advantage > 0]
        })
      })
      .map((results) => {
        if (results[0][4] && results[0][1] < results[1][1]) {
          results[0].push(true)
          results[1].push(false)
        } else {
          results[0].push(false)
          results[1].push(true)
        }
        return results
      })

    const ourWins = meanBy(numbers, i => i[0][1])
    const theirWins = meanBy(numbers, i => i[1][1])

    return {
      us: this.input,
      them: range.input,
      ours: ourWins,
      theirs: theirWins,
      tie: meanBy(numbers, i => i[0][2]),
      ...options.full && { numbers }
    } 
  }
  
  /** 
   * Creates equity calculators for comparing one range to another.
   * 
   * In order to avoid wasteful comparisons between duplicate matchups, we select only the distinct matchups. 
   * AhKh vs QcQs is going to be the same as AsKs vs QdQc, so there's no need to waste all the time figuring that out.
   * 
   * We also cache the results of the comparison by using the unique hash of each range, and any dead cards on board. 
   * 
   * For example, comparing all of the sklansky ranges to one another can be cached  so that subsequent comparisons can
   * happen much more quickly.
   * 
   * @param {Range} anotherRange
   * @param {Object} options
   * @param {Boolean} [reduce=true] only use the distinct matchups
   * @param {String} [board=''] cards already on the board
   * @param {Number} [iterations=50000] how many iterations to go through? higher iterations = more precision but more time
  */
  createCalculators(anotherRange, { reduce = true, board = '', iterations = 50000 } = {}) {
    // need to exclude cards which are on the board
    const matchups = Object.values(this.generateMatchups(anotherRange, { reduce, board }))
      .flat()

    const cardGroups = matchups.map((matchup) => matchup.map(i => CardGroup.fromString(i)))

    const base = {
      board,
      ranges: [this.input, anotherRange.input],
      hashes: [this.hash, anotherRange.hash]
    }; 

    const cacheKey = runtime.hashObject({
      h: base.hashes.join(':'),
      iterations,
      board
    })

    const output = () => cardGroups.map((cg,i) => {
      const matchup = matchups[i]
      const results = OddsCalculator.calculateEquity(cg, board && board.length ? CardGroup.fromString(board) : board, iterations)
      return { ...base, matchup, ...results }
    }) 

    return {
      ...base,
      matchups,
      run: async () => {
        const exists = await runtime.fileManager.cache.get.info(cacheKey)

        if (exists) {
          const data = await runtime.fileManager.cache
            .get(cacheKey)
            .then(r => JSON.parse(String(r.data)))
          return data
        } else {
          const data = output()
          await runtime.fileManager.cache
            .put(cacheKey, JSON.stringify(data))
          return data
        }
      }
    }
  }

  /** 
   * Given another range, generate all of the possible combinations of match ups between 
   * the hands in that range and the hands in our range.  You can include certain cards
   * on the board.
   * 
   * @param {Range} anotherRange
   * @param {Object} options
   * @param {Boolean} [reduce=true] only use the distinct matchups
   * @param {String} [board=''] cards already on the board
   * @param {Number} [iterations=50000] how many iterations to go through? higher iterations = more precision but more time
   * @returns {EquityMatchup} 
  */
  generateMatchups(anotherRange, { reduce = true, board = '' } = {}) {
    const { combos } = this
    const boardCards = chunk(board.split(''), 2).map(i => i.join(''))
    const entries = combos.map((combo) => {
      const dead = combo.map(x => x.name).concat(boardCards)
      return [ 
        combo.normalized,  
        Object.values(anotherRange.normalizedCombosExcluding(dead.concat(combo.map(i => i.name)))).flat()
      ]
    })
    
    const normalized = this.normalizedCombos

    const hasCard = (combo) =>
      !!chunk(combo.split(''), 2).map(i => i.join('')).find(comboCard => boardCards.indexOf(comboCard) > -1)

    const matchups = entries
      .map(([src, combos]) => combos.map(c => {
        const available = normalized[src]
        const candidate = available.find(i => i.name !== c)
        const id = candidate ? candidate.name : src;
        return [id, c]
      }))
      .flat()
      .filter(matchup => !isBlocked(matchup[0], matchup[1]) && !hasCard(matchup[0]) && !hasCard(matchup[1]))
    
    const grouped = groupBy(matchups, (i) => i[0])

    if (!reduce) { 
      return grouped 
    }

    return mapValues(grouped, (matches) => {
      const seen = {}
      return matches.filter(m => {
        const combo = Range.combosMap.get(m[1])

        if (seen[combo.normalized]) {
          return false
        }

        seen[combo.normalized] = true

        return true
      })
    })
  }

  /** 
   * Gets all of the combinations grouped by their normalized name (e.g. AKs = 4 combos) 
   * excluding any combinations which are not possible due to any "dead cards" 
   * 
   * @param {Array<CardName>} [deadCards=[]]
   * @returns {Object<NormalizedComboName,Array<Combination>>}
  */
  normalizedCombosExcluding(deadCards = []) {
    return this.chain
      .get('normalizedCombos')
      .mapValues((combos) => combos.filter((combo) => !deadCards.find(card => combo.name.indexOf(card) >= 0)))
      .mapValues(combos => uniq(map(combos, 'name')))
      .value()
  }

  get sample() {
    const { combos } = this  

    const pairs = uniqBy(combos.filter(c => c.pair), 'rank')
    const offsuit = uniqBy(combos.filter(c => !c.pair && c.offsuit), (i) => [i[0].suit,i.rank,i.kicker].join(':'))
    const suited = uniqBy(combos.filter(c => !c.pair && c.suited), (i) => [i[0].suit,i.rank,i.kicker].join(':'))

    return uniqBy([
      ...pairs,
      ...offsuit,
      ...suited,
    ], (c) => c.toString())
  }

  static get chain() {
    return lodash.chain(this)
  }

  /** 
   * Provides access to lodash chains for doing easy map / filter / reduce / sum / group / avg etc
   * starting with any of the combos, flops, turns, or river data.
  */
  static get chains() {
    return {
      combos: Range.chain.get('combos'),
      cards: Range.chain.get('cards'),
      flops: Range.chain.get('flops'),
      rivers: Range.chain.get('rivers'),
      turns: Range.chain.get('turns')
    }
  }

  get chain() {
    return lodash.chain(this)
  }

  static get cards() {
    return flatten(
      RANKS.map((rank) => SUITS.map((suit) => ({ suit, rank, name: cardToString({ suit, rank }) })))
    )
  }

  /** 
   * The names of all the combinations of hands.
   * @type {Array<ComboName>}
  */
  static get all() {
    return Array
      .from(this.combosMap.keys())
  }

  /** 
   * The data representation of every hand combination.
   * e.g. { name: "AhKh", normalized: "AKs", suited: true, rank: 12, kicker: 11, connected: true }
   * @type {Array<Combination>}
  */
  static get combos() {
    const c = Array.from(this.combosMap.values())
    return sortBy(c, 'showdown') 
  }

  /** 
   * Get every combination of hands where both suits are equal.
  */
  static get suited() {
    return this.combos
      .filter(i => i[0].suit === i[1].suit)
  }

  /** 
   * Get every combination of hands where both suits are equal, and their hand ranks
   * are next to each other.
   * @type {Array<Combination>}
  */
  static get suitedConnectors() {
    return this.suited
      .filter(i => Math.abs(i[1].rank - i[0].rank) === 1)
  }

  /** 
   * Get every combination of hands where both suits are equal, and their hand ranks
   * are one away from each other.
   * @type {Array<Combination>}
  */
  static get suitedOneGap() {
    return this.suited
      .filter(i => Math.abs(i[1].rank - i[0].rank) === 2)
  }

  /** 
   * Get every combination of hands where both suits are equal, and their hand ranks
   * are two away from each other.
   * @type {Array<Combination>}
  */
  static get suitedTwoGap() {
    return this.suited
      .filter(i => Math.abs(i[1].rank - i[0].rank) === 3)
  } 

  /** 
   * Get every combination of hands where both suits are equal, and their hand ranks
   * are three away from each other.
   * @type {Array<Combination>}
  */
  static get suitedThreeGap() {
    return this.suited
      .filter(i => Math.abs(i[1].rank - i[0].rank) === 4)
  } 

  /** 
   * Get all of the combinations of paired hands.
   * @type {Array<Combination>}
  */
  static get pocketPairs() {
    return this.combos
      .filter(i => i[0].rank === i[1].rank)
  }

  /** 
   * @type {Array<CardName>}
  */
  static get cardNames() {
    return this.cards.map(c => c.name)
  }

  /** 
   * @type {Array<ComboName>}
  */
  static get comboNames() {
    return this.combos.map(c => c.name)
  } 

  /** 
   * Returns every normalized combo name in a 13x13 array grid, sorted by card rank 
  */
  static asGrid() {
    const ranks = [ACE, KING, QUEEN, JACK, TEN, NINE, EIGHT, SEVEN, SIX, FIVE, FOUR, THREE, TWO]  

    const grid = ranks.map(row => {
      const down = ranks.map(column => {
        const isOffsuit = row < column
        const isPair = row === column
        const marker = isPair ? '' : (isOffsuit ? 'o' : 's')

        const cards = sortBy([
          Range.cards.find(card => card.rank === row),
          Range.cards.find(card => card.rank === column)
        ], 'rank').reverse()

        return cards.map(c => c.name.split('')[0]).concat([marker]).join('')
      })

      return down
    })

    return grid 
  } 

  /** 
   * Each of the possible starting hand combinations have been run through PokerStove
   * and published as a matrix showing each starting hand combination and its equity against
   * a certain number of opponents.  This data is cached in this project, along with each combo.
   * 
   * We can query the hand combinations to rank them based on how well they do given any number of opponents
   * 
   * @returns {Array<ComboName>}
  */
  static strongestHands(percent, numberOfOpponents = 9) {
    const limit = Math.floor(169 * (percent / 100))

    return this.chains.combos
      .sortBy(`strengthVsOpponents.${numberOfOpponents}`)
      .reverse()
      .uniqBy("normalized")    
      .slice(0, limit)
      .map('normalized')
      .value()
  }

  /** 
   * Returns info about the hand combinations grouped by their normalized name.
   * @returns {Array<ComboName>}
  */
  static get normalizedComboInfo() {
    return this.chains.combos
    .groupBy('normalized')
      .mapValues((combos, name) => ({
        name,
        count: combos.length,
        rank: combos[0].rank,
        kicker: combos[0].kicker,
        suited: combos[0].suited,
        oddsVsPlayers: combos[0].strengthVsOpponents.reduce((memo,val,i) => ({
          ...memo,
          [i + 1]: val,
        }),{})
      }))    
      .value()
  }

  /** 
   * Displays just the average equity vs a number of opponents for each
   * normalized combo (e.g. { "AKs" => [x,y,z]})
  */
  static get strengthChart() {
    return this.chains
      .combos
      .keyBy('normalized')
      .mapValues('strengthVsOpponents')
      .value()
  }

  /** 
   * Perform the enumeration that generates every possible combination of 2 cards.
   * 
   * This output gets memoized so calling it a 2nd time is "free"
   * 
   * @private
  */
  static get combosMap() {
    const cards = this.cards

    if (Array.from(combosMap.values()).length) {
      return combosMap
    }

    cards.forEach((c1) => {
      cards.forEach(c2 => {
        if (c1.name !== c2.name) {
          let combo = sortBy([c1, c2], 'rank', 'suit').reverse()
          const maxRank = max([c1.rank, c2.rank])
          const minRank = min([c1.rank, c2.rank])

          Object.assign(combo, {
            toJSON() {
              return {
                name: combo.name,
                normalized: combo.normalized,
                showdown: combo.showdown,
                averageEquity: combo.strengthVsOpponents,
                strengthVsOpponents: combo.strengthVsOpponents,
                pair: combo.pair,
                offsuit: combo.offsuit,
                kicker: combo.kicker,
                rank: combo.rank,
                suited: combo.suited,
                gap: combo.gap
              }
            },
            toString() {
              return combo.map(v => v.name).join(',')
            },
            has(...names) {
              return !!combo.find(i => names.indexOf(i.name) > -1 || names.find(x => i.name.match(String(x))))
            },
            cardGroup() {
              return CardGroup.fromString(this.name) 
            },
            get name() {
              return combo.map(v => v.name).join('')  
            },
            get csv() {
              return combo.map(v => v.name).join(',')  
            },
            get normalized() {
              if (this.pair) {
                return [SYMBOLS[this.rank], SYMBOLS[this.rank]].join("")
              } else if (this.suited) {
                return combo.map(c => SYMBOLS[c.rank]).join("") + "s" 
              } else if (this.offsuit) {
                return combo.map(c => SYMBOLS[c.rank]).join("") + "o" 
              }
            },
            get showdown() {
              if (this.pair) {
                return (12 ** 5) + (this.rank + 1 * (12 ** 3))
              } else {
                return (this.rank + 1 * (12 ** 3)) + (this.kicker + 1 * (12 ** 2)) 
              }
            },
            get strengthVsOpponents() {
              return HAND_STRENGTHS[this.normalized] 
            },
            get vsOnePlayer() {
              return HAND_STRENGTHS[this.normalized][0]
            },
            get vsTwoPlayers() {
              return HAND_STRENGTHS[this.normalized][1]
            },
            get vsThreePlayers() {
              return HAND_STRENGTHS[this.normalized][2]
            },           
            get averageEquity() {
              return HAND_STRENGTHS[this.normalized] 
            },
            get pair() {
              return c1.rank === c2.rank
            },
            get offsuit() {
              return c1.suit !== c2.suit && (c1.rank !== c2.rank)
            },
            get suited() {
              return c1.suit === c2.suit
            },
            get gap() {
              return Math.abs(c1.rank - c2.rank)  
            },
            get rank() {
              return maxRank
            },
            get kicker() {
              return minRank  
            }
          })
        
          combosMap.set(
            combo.map(c => c.name).join(''),
            combo
          )          
        }
      }) 
    })

    return combosMap 
  }

  static get flops() {
    return Array.from(this.flopsMap.values())
  }

  static get turns() {
    return Array.from(this.turnsMap.values())
  }

  static get rivers() {
    return Array.from(this.riversMap.values())
  }

  /** 
   * Perform the enumeration that generates every possible combination of 3 cards.
   * 
   * This output gets memoized so calling it a 2nd time is "free"
   * 
   * @private
  */
  static get flopsMap() {
    const cards = this.cards

    if (Array.from(flopsMap.values()).length) {
      return flopsMap
    }

    cards.forEach((c1) => {
      cards.forEach(c2 => {
        cards.forEach(c3 => {
          if (uniq([c1.name, c2.name, c3.name]).length === 3) {
            let combo = sortBy([c1, c2, c3], "rank", "suit").reverse();
            const maxRank = max([c1.rank, c2.rank, c3.rank]);
            const minRank = min([c1.rank, c2.rank, c3.rank]);
  
            Object.assign(combo, {
              toJSON() {
                return Object.getOwnPropertyNames(combo)
                  .filter(key => key !== 'textureHash' && key !== 'toJSON' && key !== 'has' && key !== 'cardGroup')
                  .reduce((memo,name) => ({
                    ...memo,
                    [name]: this[name]
                  }), {
                    cards: combo.map(c => c)
                  })
              },
              get baseTexture() {
                return runtime.hashObject(['maxRank', 'minRank', 'uniqSuits', 'uniqRanks', 'numberOfBroadwayCards', 'threeMediumCards', 'threeSmallCards', 'gaps'].reduce((memo,key) => ({
                  [key]: this[key],
                  ...memo  
                }), {}))
              },
              get maxRank() {
                return maxRank;
              },
              get name() {
                return sortBy(combo, "rank")
                  .map(c => c.name)
                  .join("");
              },
              has(...names) {
                return !!combo.find(
                  i =>
                    names.indexOf(i.name) > -1 ||
                    names.find(x => i.name.match(String(x)))
                );
              },
              get minRank() {
                return minRank;
              },
              get uniqSuits() {
                return uniq(combo.map(c => c.suit)).length;
              },
              get ranks() {
                return sortBy(combo, "rank").map(c => c.rank);
              },
              get uniqRanks() {
                return uniq(combo.map(c => c.rank)).length;
              },
              get flushPossible() {
                return combo.uniqSuits === 1;
              },
              get flushDraw() {
                return combo.uniqSuits === 2;
              },
              get rainbow() {
                return combo.uniqSuits >= 3;
              },
              get sameRank() {
                return combo.uniqRanks === 1;
              },
              get paired() {
                return combo.uniqRanks === 2;
              },
              get trips() {
                return combo.uniqRanks === 1;
              },
              get hasAce() {
                return !!combo.find(c => c.name.startsWith("A"));
              },
              get hasKing() {
                return !!combo.find(c => c.name.startsWith("K"));
              },
              get hasQueen() {
                return !!combo.find(c => c.name.startsWith("Q"));
              },
              get hasJack() {
                return !!combo.find(c => c.name.startsWith("J"));
              },
              get hasTen() {
                return !!combo.find(c => c.name.startsWith("T"));
              },
              get numberOfBroadwayCards() {
                return combo.filter(c => c.name.match(/^[AKQJT]/i))
                  .length;
              },
              get threeMediumCards() {
                return (
                  combo.filter(c => c.name.match(/^[789T]/i))
                    .length === 3
                );
              },
              cardGroup() {
                return CardGroup.fromString(this.name);
              },
              get threeSmallCards() {
                return (
                  combo.filter(c => c.name.match(/^[23456]/i))
                    .length === 3
                );
              },
              get gaps() {
                const ranks = this.ranks.map(i => i + 1);

                let values;

                if (ranks[2] === 13 && ranks[1] < 9) {
                  values = [0, ranks[0], ranks[1]];
                } else {
                  values = ranks;
                }

                return [
                  values[1] - values[0] - 1,
                  values[2] - values[1] - 1
                ];
              },
              get openEnded() {
                return this.gaps[0] === 0 && this.gaps[1] === 0;
              },
              get possibleStraights() {
                return (
                  this.openEnded ||
                  !!this.gaps.find(i => i >= 0 && i <= 2)
                );
              }
            });
  
            flopsMap.set(combo.map(c => c.name).join(""), combo);
          }          
        })
      }) 
    })

    return flopsMap 
  }

  /** 
   * Perform the very expensive, enumeration that generates every possible combination of 4 cards.
   * 
   * This output gets memoized so calling it a 2nd time is "free"
   * 
   * @private
  */
  static get turnsMap() {
    const cards = this.cards

    if (Array.from(turnsMap.values()).length) {
      return turnsMap
    }

    cards.forEach((c1) => {
      cards.forEach(c2 => {
        cards.forEach(c3 => {
          cards.forEach(c4 => {
            if (uniq([c1.name, c2.name, c3.name, c4.name]).length === 4) {
              let combo = sortBy([c1, c2, c3, c4], "rank", "suit").reverse();
              const maxRank = max([c1.rank, c2.rank, c3.rank, c4.rank]);
              const minRank = min([c1.rank, c2.rank, c3.rank, c4.rank]);
    
              Object.assign(combo, {
                get maxRank() {
                  return maxRank;
                },
                get minRank() {
                  return minRank;
                },
                get name() {
                  return combo.map(c => c.name).join("");
                },
                has(...names) {
                  return !!combo.find(
                    i =>
                      names.indexOf(i.name) > -1 ||
                      names.find(x => i.name.match(String(x)))
                  );
                }
              });
    
              turnsMap.set(combo.map(c => c.name).join(""), combo);
            }          
          })
        })
      }) 
    })

    return turnsMap 
  }

  /** 
   * Perform the very expensive, enumeration that generates every possible combination of 5 cards.
   * 
   * This output gets memoized so calling it a 2nd time is "free".  This takes up a lot of memory.
   * 
   * @private
  */
  static get riversMap() {
    const cards = this.cards

    if (Array.from(riversMap.values()).length) {
      return riversMap
    }

    cards.forEach((c1) => {
      cards.forEach(c2 => {
        cards.forEach(c3 => {
          cards.forEach(c4 => {
            cards.forEach(c5 => {
              if (uniq([c1.name, c2.name, c3.name, c4.name, c5.name]).length === 5) {
                let combo = sortBy([c1, c2, c3, c4, c5], "rank", "suit").reverse();
                const maxRank = max([c1.rank, c2.rank, c3.rank, c4.rank, c5.rank]);
                const minRank = min([c1.rank, c2.rank, c3.rank, c4.rank, c5.rank]);
      
                Object.assign(combo, {
                  get maxRank() {
                    return maxRank;
                  },
                  get minRank() {
                    return minRank;
                  },
                  has(...names) {
                    return !!combo.find(
                      i =>
                        names.indexOf(i.name) > -1 ||
                        names.find(x => i.name.match(String(x)))
                    );
                  }
                });
      
                riversMap.set(combo.map(c => c.name).join(""), combo);
              }                        
            })
          })
        })
      }) 
    })

    return riversMap 
  }  

  /** 
   * Filter the possible starting hand notations. 
   * 
   * @param {Function|String|Array<ComboFilter>|ComboFilter} filters a single ComboFilter, an array of ComboFilters, or a string to be turned into one or more ComboFilter
   * @returns {Array<StartingHandCombination>}
  */
  static filterCombos(filters) {
    if (isFunction(filters)) {
      return Range.chain.get('combos').filter(filters).value()
    } else if (isString(filters)) {
      return Range.filterCombos(Range.parseRange(filters))
    } else if (isArray(filters)) {
      return flatten(
        filters.map(Range.filterCombos)
      )
    } else if (isObject(filters)) {
      return Range.combos.filter((combo) => filterCombo(combo, filters))
    }
  }

  /** 
   * @param {String} input a written hand range notation, as found in popular poker literature. (e.g. 22+,ATs+,KJs+,JQs+) 
   * @returns {Range}
  */
  static fromString(input = '') {
    const filters = this.parseRange(input)
    const results = this.filterCombos(filters)
    return results
  }
  

  static enforceRankOrder(str) {
    const parts = str.split("");
    const [rankOne, rankTwo, ...modifiers] = parts;
    const modifier = modifiers.join("");
    const rankValues = [ALIASES[rankOne], ALIASES[rankTwo]]
      .sort()

    return { rankOne, rankTwo, rankValues, modifier }
  }

  /** 
   * Given a single range value (e.g one in a comma separated list AKo,AJs+)
   * turn it into a CombinationFilter which can be used to match the combination.
   * 
   * @param {String} str a single hand range component
   * @returns {ComboFilter}
  */
  static expandHand(str) {
    const { rankOne, rankTwo, rankValues, modifier } = this.enforceRankOrder(str)

    return {
      item: str,
      pair: rankOne === rankTwo,
      modifier,
  
      connected:
        rankValues[0] === ACE
          ? rankValues[1] === TWO || rankValues[1] === KING
          : rankValues[0] - rankValues[1] === 1,
  
      oneGap:
        rankValues[0] === ACE
          ? rankValues[1] === THREE || rankValues[1] === QUEEN
          : rankValues[0] - rankValues[1] === 2,
  
      twoGap:
        rankValues[0] === ACE
          ? rankValues[1] === FOUR || rankValues[1] === JACK
          : rankValues[0] - rankValues[1] === 3,
  
      threeGap:
        rankValues[0] === ACE
          ? rankValues[1] === FOUR || rankValues[1] === JACK
          : rankValues[0] - rankValues[1] === 4,
  
      suited: modifier.toLowerCase().startsWith("s"),
      greater: modifier.toLowerCase().endsWith("+"),
      weaker: modifier.toLowerCase().endsWith("-"),
      ranks: rankValues,
      rank: max(rankValues),
      kicker: min(rankValues)
    };
  }

  /** 
   * Turn a range notation into an object which can be used to filter the starting hand
   * combinations and return them all.
   * 
   * @param {String} input the range notation as written in popular poker literature
   * @returns {ComboFilter}
  */
  static parseRange(input = '') {
    const items = String(input).trim().split(',').map(s => s.trim())
    return items.map(str => {
      if (str.match('-')) {
        let [top, bottom] = sortBy(str.split('-').map(i => i.trim()).map(h => Range.expandHand(h)), 'rank', 'kicker').reverse()

        if (top.rank === bottom.rank && !top.pair && !bottom.pair) {
          top = { ...top, weaker: true, oneGap: false, twoGap: false, threeGap: false, connected: false }  
          bottom = { ...bottom, greater: true, oneGap: false, twoGap: false, threeGap: false, connected: false }  
        }

        return { top, bottom, ranged: true }
      } else {
        return Range.expandHand(str)
      }
    })
  }

  /** 
   * Run the range comparison function for all of the sklansky ranges.
   * 
   * Doing this once will seed the equity calculator cache with a lot of values, and make
   * subsequent comparisons go a lot fastter.
  */
  static async compareSklanskyRanges(options = {}) {
    const matchups = combination(['ultraStrong', 'strong', 'medium', 'loose'], 2)
    for(let matchup of matchups) {
      const [i1, i2] = matchup
      await Range.sklansky[i1].compare(Range.sklansky[i2], options)
    }
  }

  /** 
   * This is a shortcut to the different hand ranges defined by author David Sklansky.
  */
  static sklansky = Object.assign(sklansky, {
    get ultraStrong() { return sklansky(1) },
    get strong() { return new Range(`${sklansky(1).input},${sklansky(2).input}`) },
    get medium() { return new Range(`${sklansky(1).input},${sklansky(2).input},${sklansky(3).input},${sklansky(4).input},${sklansky(5).input}`) },
    get loose() { return new Range(`${sklansky(1).input},${sklansky(2).input},${sklansky(3).input},${sklansky(4).input},${sklansky(5).input},${sklansky(6).input},${sklansky(7).input} `) },
  })

  static generateCombos = generateCombos
  static groups = groups
}

export function groups() {
  const pocketPairs = Range.chain
    .get("pocketPairs")
    .uniqBy("rank")
    .invokeMap("toString")
    .value();

  const offsuitKingsAndAces = Range.chain
    .get("combos")
    .filter(c => !c.pair && c.offsuit)
    .filter(c => c.rank >= 11)
    .uniqBy(i => i.rank + "," + i.kicker)
    .sortBy("rank")
    .invokeMap("toString")
    .value();

  const broadwayHands = Range.chain
    .get("combos")
    .filter(c => !c.pair && c.offsuit)
    .filter(c => c.rank > 8 && c.kicker >= 8)
    .uniqBy(i => i.rank + "," + i.kicker)
    .sortBy("rank")
    .invokeMap("toString")
    .value();

  const suitedBroadwayHands = Range.chain
    .get("combos")
    .filter(c => !c.pair && c.suited)
    .filter(c => c.rank > 8 && c.kicker >= 8)
    .uniqBy(i => i.suit + "," + i.rank + "," + i.kicker)
    .sortBy("rank")
    .invokeMap("toString")
    .value();

  const connectors = Range.chain
    .get("combos")
    .filter(c => c.offsuit && c.gap === 1)
    .uniqBy(i => i.suit + "," + i.rank + "," + i.kicker)
    .invokeMap("toString")
    .value();

  const suitedConnectors = Range.chain
    .get("suitedConnectors")
    .uniqBy(i => i.suit + "," + i.rank + "," + i.kicker)
    .invokeMap("toString")
    .value();

  const suitedOneGappers = Range.chain
    .get("suitedOneGap")
    .uniqBy(i => i.suit + "," + i.rank + "," + i.kicker)
    .invokeMap("toString")
    .value();

  const suitedAces = Range.chain
    .get("suited")
    .filter({ rank: 12 })
    .uniqBy(i => i.suit + "," + i.rank + "," + i.kicker)
    .invokeMap("toString")
    .value();

  return {
    pocketPairs,
    offsuitKingsAndAces,
    suitedConnectors,
    suitedAces,
    broadwayHands,
    suitedBroadwayHands,
    connectors,
    suitedOneGappers
  };
}


const filterCombo = (combo, filters) => {
  let match = true;
  const { item, ranged, top, bottom, pair, suited, greater, weaker, rank, kicker, connected, oneGap, twoGap, threeGap } = filters      
  // a pair is always greater than a non-pair range

  if (combo.normalized === 'KQs') {
    debugger
  }
  if (ranged) {
    return filterCombo(combo, {
      ...top,
      weaker: true
    }) && filterCombo(combo, {
      ...bottom,
      greater: true
    })
  }

  if (combo.normalized === item) {
    return true
  }

  // This would make KQs+ return pairs
  if (combo.pair && greater && !pair) {
    // return true;
  }

  if (suited && !combo.suited) {
    return false;
  }

  /*
  if (connected && !combo.connected) {
    return false;
  }

  if (oneGap && !combo.oneGap) {
    return false;
  }

  if (oneGap && !combo.oneGap) {
    return false;
  }
  */

  // If we are filtering by pairs
  if (pair && !combo.pair) {
    match = false;
  } else if (pair && greater && combo.pair && combo.rank < rank) {
    match = false;
  } else if (pair && weaker && combo.pair && combo.rank > rank) {
    match = false;
  } else if (pair && (!weaker && !greater && combo.rank !== rank)) {
    match = false;
  }

  if (!pair && greater) {
    if (combo.rank === kicker && combo.kicker < rank) {
      match = false 
    } else if (combo.kicker < kicker) {
      match = false;
    } else if (combo.rank !== rank && combo.kicker !== rank) {
      match = false
    }
  } else if (!pair && weaker) {
    if (combo.rank !== rank && combo.kicker !== rank) {
      match = false;
    } else if (combo.rank === rank && combo.kicker > kicker) {
      match = false;
    }
  } else if (!pair && !greater && !weaker) {
    if (combo.rank !== rank || combo.kicker !== kicker) {
      match = false;
    }
  } 

  return match;
};

function defineProperties(source, obj = {}) {
  Object.entries(obj).map(([prop, cfg]) => Object.defineProperty(source, prop, { enumerable: false, ...cfg }))
}

function normalizeCombo(combo) {
  const labels = combo.trim().replace(/\W/g, '').split('')

  return [
    Range.cardsMap[`${labels[0]}${labels[1]}`],
    Range.cardsMap[`${labels[2]}${labels[3]}`],
  ]
}

function isBlocked(comboOne, ...combos) {
  const h1 = normalizeCombo(comboOne)
  const normalized = combos.map(c => normalizeCombo(c))
  return normalized.filter(h2 => !!h1.find(({ name }) => h2.find(h2 => h2.name === name))).length > 0
}

Range.isBlocked = isBlocked


export function generateCombos(count, deadCards = []) {
  const generator = combination(Range.cards.map(c => c.name), count);

  const combos = [];
  let a;

  while ((a = generator.next())) {
    combos.push(a);
  }

  return combos.filter(combo => !deadCards.find(i => combo.indexOf(i) > -1));
}

function sklansky(groupNumber, deadCards = []) {
  return new Range(SKLANKSY_RANGES[String(groupNumber)], deadCards);
}


