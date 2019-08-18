

export function generateCombos(count, deadCards = []) {
  const generator = combination(
    Range.cards.map(c => c.name),
    count
  )

  const combos = []
  let a

  while(a = generator.next()) {
    combos.push(a)  
  }

  return combos
    .filter(combo => !deadCards.find(i => combo.indexOf(i) > -1))
}

