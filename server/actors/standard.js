export async function makeDecision(game) {
  const { playerId, chips, holding } = this
  debugger
}

export function defineRanges() {
  this.defineRange({ 
    stage: 'preflop', 
    action: 'open', 
    position: 'UTG', 
    range: '99+,AKs'
  })

  this.defineRange({ 
    stage: 'preflop', 
    action: 'call', 
    position: 'UTG', 
    range: 'TT+,AKs'
  }) 
}
