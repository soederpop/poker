import runtime from '@skypager/node'

export function equityData() {
  const ctx = require.context("../data/equity", true, /\.json$/);
  ctx.resolve = key => key;

  const equities = runtime.Helper.createContextRegistry("equities", {
    context: runtime.Helper.createMockContext({})
  });

  equities.add(ctx);

  const { flatten, values, sumBy, meanBy } = runtime.lodash

  const byHand = runtime.lodash
    .chain(equities)
    .invoke("allMembers")
    .entries()
    .groupBy(entry => {
      const [id, data] = entry
      const { fileId } = data
      const players = id.replace(/\/.*/,'') 
       
      const [r1, s1, r2, s2] = fileId.split("");

      if (r1 === r2) {
        return players + '/' + [r1, r2].join("");
      } else if (s1 === s2) {
        return players + '/' + [r1, r2, "s"].join("");
      } else {
        return players + '/' + [r1, r2, "o"].join("");
      }
    })
    .mapValues(v => {
      return flatten(v.map(i => i[1])).map( v => flatten(Object.values(v.report)))
    }) 
    .mapValues((results, cards) => {
      results = flatten(results)
      const runs = sumBy(results, 'runs')
      const wins = sumBy(results, 'wins')
      const ties = sumBy(results, 'ties')
      const winPercentage = (wins / runs) * 100
      const tiePercentage = (ties / runs) * 100
      const flop = meanBy(results, 'flop')
      const preflop = meanBy(results, 'preflop')
      const turn = meanBy(results, 'turn')

      return {
        cards: cards.split('/')[1],
        players: cards.split('/')[0],
        runs,
        wins,
        ties,
        winPercentage,
        tiePercentage,
        preflop,
        flop,
        turn,
      }
    })
    .value();
  
  return byHand
}