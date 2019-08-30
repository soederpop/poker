/** 
 * This player will make a random decision every time they're presented with one.
*/
export async function makeDecision() {
  const { game } = this
  const { min, sample } = this.lodash
  const { playerId, toGo, chips } = this
  const { availableOptions } = this 

  let weightedOptions = []

  if (availableOptions.indexOf('call') > -1) {
    weightedOptions.push(
      ...Array.from(new Array(10)).map(i => 'call')
    )  
  }

  if (availableOptions.indexOf('fold') > -1) {
    weightedOptions.push(
      ...Array.from(new Array(6)).map(i => 'fold')
    )  
  }

  if (availableOptions.indexOf('check') > -1) {
    weightedOptions.push(...Array.from(new Array(10)).map(i => 'check'))
  }

  if (availableOptions.indexOf('raise') > -1 || availableOptions.indexOf('bet') > -1) {
    weightedOptions.push(...Array.from(new Array(4)).map(i => 'bet'))
  }

  if (this.toGo === 0) {
    weightedOptions = weightedOptions.filter(i => i !== 'fold')
  }

  const decision = sample(weightedOptions) 

  if (availableOptions.indexOf('check') > -1 && decision === 'call') {
    decision = 'check'
  }

  if (decision === 'check') {
    return { playerId, action: 'check', amount: 0 }

  } else if (decision === 'fold') {
    return { playerId, action: 'fold', amount: 0 }

  } else if (decision === 'call') {
    return { playerId, action: 'call', amount: toGo }
  } else if (decision === 'raise' || decision === 'bet') {
    // bet sizing sample
    const amount = sample([2, 3, 5, -1, -2, -3, -4, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0]) 

    if (amount === -1) {
      // pot bet
      return { playerId, action: 'raise', desc: 'pot',  amount: min([game.pot, chips]) }
    } else if (amount === -5) {
      // bomb the pot 2x
      return { playerId, action: 'raise', desc: 'bomb the pot', amount: min([ Math.round(game.pot * 2), chips]) }
    } else if (amount === -4) {
      // two thirds the pot
      return { playerId, action: 'raise', desc: 'two thirds pot', amount: min([ Math.round(game.pot * 0.66), chips ]) }
    } else if (amount === -3) {
      // half the pot
      return { playerId, action: 'raise', desc: 'half pot', amount: min([ Math.round(game.pot * 0.5), chips ]) }
    } else if (amount === -2) {
      // all in
      return { playerId, action: 'raise', desc: 'all in', amount: chips }
    } else if (amount > 0) {
      // some multiple of the current bet 
      return { playerId, action: 'raise', desc: `${amount}x`, amount: min([ Math.round(amount * toGo), chips ]) }
    } else {
      return { playerId, action: 'raise', desc: 'minRaise', amount: min([ Math.round(toGo * 2), chips ]) }
    }

  } else {

    return { action: decision, playerId }
  }
}