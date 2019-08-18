import { Feature } from '@skypager/runtime'

export default class Players extends Feature {
  static shortcut = 'players'
  
  avatarImages = Feature.createContextRegistry('avatarImages', {
    context: Feature.createMockContext({}) 
  })

  loadImages() {
    const c = avatars().reduce(
      (memo, avatarName) => ({
        ...memo,
        [avatarName]: require(`../assets/avatars/${avatarName}.png`)
      }),
      {}
    );
      
    this.avatarImages.add(c);
  }
}


export function avatars() {
  return Array.from(new Array(28)).map((_,i) => `${i + 1}`)
}