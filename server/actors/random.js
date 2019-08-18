/** 
 * This player will make a random decision every time they're presented with one.
*/
export async function makeDecision() {
  const { game } = this
  const { min, sample } = this.lodash
  const { playerId, toGo, chips } = this
  const { availableOptions } = this 

  const decision = sample(availableOptions) 

  if (decision === 'check') {
    return { playerId, action: 'check', amount: 0 }

  } else if (decision === 'fold') {
    return { playerId, action: 'fold', amount: 0 }

  } else if (decision === 'call') {
    return { playerId, action: 'call', amount: min([toGo, chips]) }

  } else if (decision === 'raise' || decision === 'bet') {
    const amount = sample([2, 3, 5, -1, -2, -3, -4, -5]) 

    if (amount === -1) {
      // pot bet
      return { playerId, action: 'raise', desc: 'pot',  amount: min([game.pot, chips]) }
    } else if (amount === -5) {
      // bomb the pot 2x
      return { playerId, action: 'raise', desc: 'bomb the pot', amount: min([game.pot * 2, chips]) }
    } else if (amount === -4) {
      // two thirds the pot
      return { playerId, action: 'raise', desc: 'two thirds pot', amount: min([ game.pot * 0.66, chips ]) }
    } else if (amount === -3) {
      // half the pot
      return { playerId, action: 'raise', desc: 'half pot', amount: min([ game.pot * 0.5, chips ]) }
    } else if (amount === -2) {
      // all in
      return { playerId, action: 'raise', desc: 'all in', amount: chips }
    } else if (amount > 0) {
      // some multiple of the current bet 
      return { playerId, action: 'raise', desc: `${amount}x`, amount: min([ amount * toGo, chips ]) }
    } else {
      return { playerId, action: 'raise', desc: 'minRaise', amount: min([ toGo * 2, chips ]) }
    }

  } else {
    return { action: decision, playerId }
  }
}