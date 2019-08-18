import { Feature } from '@skypager/runtime'

export default class Deck extends Feature {
  static shortcut = 'deck'
  
  cardImages = Feature.createContextRegistry('cardImages', {
    context: Feature.createMockContext({}) 
  })

  loadCardImages() {
    const c = cardNames().reduce(
      (memo, cardName) => ({
        ...memo,
        [cardName]: require(`../assets/cards/${cardName}.svg`)
      }),
      {}
    );
      
    this.cardImages.add(c);
  }
}


export function cardNames() {
  const suits = ['h','d','c','s']
  const ranks = ['a','2','3','4','5','6','7','8','9','t','j','q','k']

  return suits.reduce((memo, suit) => memo.concat(ranks.map(rank => `${rank}${suit}`)), [])
}