import Range from '../Range'
import { makeDecision as makeRandomDecision } from './random'

export async function makeDecision(options = {}) {
  const { game } = this
  const { stage } = game

  let decision

  if (stage === 'preflop') {
    decision = await preflop.call(this, options)
  } else if (stage === 'flop') {
    decision = await turn.call(this, options)
  } else if (stage === 'turn') {
    decision = await river.call(this, options)
  } else if (stage === 'river') {
    decision = await river.call(this, options)
  }

  if (decision) {
    return decision
  }

  return makeRandomDecision.call(this, options)
}

export function findRange() {
  const { game, potOdds } = this
  const { stage, isPotOpen, isPotRaised } = game

  return 'AA'
}

export async function preflop(options = {}) {
  const { game } = this
  const { isPotOpen, isPotRaised } = game

  if (isPotOpen && this.handInOpenRange) {
    return {
      playerId: this.playerId,
      action: 'raise',
      amount: game.bigBlindAmount * 3
    } 
  } else if (isPotOpen && this.handInCallingRange) {
    return {
      playerId: this.playerId,
      action: 'call',
      amount: game.toGo
    }
  } else if (isPotRaised && this.handInCallingRange || this.handInOpenRange) {
    return {
      playerId: this.playerId,
      action: 'call',
      amount: game.toGo
    }
  }
} 

export async function flop(options = {}) {

}

export async function turn(options = {}) {

}

export async function river(options = {}) {

}

export function defineRanges() {
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

  this.defineRange({ stage: 'preflop', position: 'UTG', range: strong.input, action: 'call' })
  this.defineRange({ stage: 'preflop', position: 'UTG+1', range: strong.input, action: 'call' })
  this.defineRange({ stage: 'preflop', position: 'MP', range: strong.input + 'ATs+,KJs+,AJo+', action: 'call' })
  this.defineRange({ stage: 'preflop', position: 'MP+1', range: strong.input + 'A9s+,A9o+', action: 'call' })
  this.defineRange({ stage: 'preflop', position: 'HJ', range: strong.input + 'A9s+,A9o+', action: 'call' })
  this.defineRange({ stage: 'preflop', position: 'CO', range: loose.input, action: 'call' })
  this.defineRange({ stage: 'preflop', position: 'BTN', range: loose.input, action: 'call' })
  this.defineRange({ stage: 'preflop', position: 'SB', range: medium.input, action: 'call' })
  this.defineRange({ stage: 'preflop', position: 'BB', range: loose.input, action: 'call' })

  this.defineRange({ stage: 'preflop', position: 'UTG', range: ultraStrong.input, action: '3bet' })
  this.defineRange({ stage: 'preflop', position: 'UTG+1', range: ultraStrong.input, action: '3bet' })
  this.defineRange({ stage: 'preflop', position: 'MP', range: strong.input, action: '3bet' })
  this.defineRange({ stage: 'preflop', position: 'MP+1', range: strong.input, action: '3bet' })
  this.defineRange({ stage: 'preflop', position: 'HJ', range: strong.input, action: '3bet' })
  this.defineRange({ stage: 'preflop', position: 'CO', range: strong.input, action: '3bet' })
  this.defineRange({ stage: 'preflop', position: 'BTN', range: strong.input, action: '3bet' })
  this.defineRange({ stage: 'preflop', position: 'SB', range: strong.input, action: '3bet' })
  this.defineRange({ stage: 'preflop', position: 'BB', range: strong.input, action: '3bet' })   
}
