---
title: Pokurr JS API Demo
tags: [pokurr, luca, markdown-runner, vm, range, equity]
---

# Pokurr JS API Demo

This is a runnable demo document for the TypeScript/JS implementation of Pokurr core.

Run it with:

```bash
luca run demos/js-api.md
```

Install the `luca` CLI if you haven't already:

```bash
npm i -g @soederpop/luca
```

## Load the API in the VM Context

The markdown runner executes each `ts` block in a shared VM context. We use the `vm` feature to load the module from source.

```ts
const corePath = container.paths.resolve('packages/pokurr-core/src/index.ts')
const core = vm.loadModule(corePath)

const {
  stringToCard,
  cardToString,
  Deck,
  evaluateHand,
  compareHands,
  compareRanges,
  equityEngine,
  HandCategory,
  HandEquity,
  equity,
  Range,
} = core

console.log('Loaded exports:', Object.keys(core).sort().join(', '))
```

## Backend-Agnostic API

```ts
const backend = await equityEngine.activeBackend()
console.log('Equity backend selected:', backend)
```

## Card Roundtrip + Deck Basics

```ts
const aceHearts = stringToCard('Ah')
console.log('Roundtrip Ah ->', cardToString(aceHearts))

const deck = new Deck().shuffle()
const twoCards = deck.draw_n(2).map(cardToString)
console.log('Drew two cards:', twoCards.join(', '))
console.log('Cards left in deck:', deck.count)
```

## Shared Context Without Top-Level Await

```ts
const sharedWithoutAwait = {
  message: 'this was declared in a plain sync block',
  deckCountAfterDraw: deck.count,
}
console.log(sharedWithoutAwait.message)
```

```ts
// This works because both blocks are plain sync code.
console.log('sharedWithoutAwait.deckCountAfterDraw =', sharedWithoutAwait.deckCountAfterDraw)
```

## Range Parsing Demo

```ts
const suitedBroadway = new Range('KTs+')
console.log('KTs+ normalized combos:', suitedBroadway.normalizedComboNames.join(', '))
console.log('KTs+ combo count:', suitedBroadway.size)

const pocketPairs = new Range('22-99')
console.log('22-99 combo count:', pocketPairs.size)
```

```ts
const withDeadAce = new Range('AKo,AKs', ['Ah'])
const withoutDeadAce = new Range('AKo,AKs')
console.log('AK with no dead card:', withoutDeadAce.size)
console.log('AK with Ah dead:', withDeadAce.size)
```

## Hand Ranking Demo

```ts
const straightFlush = evaluateHand(['Ah', 'Kh', 'Qh', 'Jh', 'Th', '2c', '3d'])
const quads = evaluateHand(['As', 'Ad', 'Ac', 'Ah', '2c', '3d', '4h'])

console.log('Straight flush category:', straightFlush.category, straightFlush.label)
console.log('Quads category:', quads.category, quads.label)
console.log('Straight flush beats quads?', compareHands(straightFlush, quads) > 0)
console.log('HandCategory.STRAIGHT_FLUSH =', HandCategory.STRAIGHT_FLUSH)
```

## Equity Demo

```ts
const akOffsuit = new HandEquity('AKo', { players: 2 })
console.log('AKo average win % vs 1 opponent (precomputed):', akOffsuit.averageWinPercent)
```

```ts
const match = equity([
  ['Ah', 'Ad'],
  ['Kh', 'Kd'],
], [], 5000)

const aaWin = ((match[0].bestHandCount || 0) / (match[0].possibleHandsCount || 1) * 100).toFixed(2)
const kkWin = ((match[1].bestHandCount || 0) / (match[1].possibleHandsCount || 1) * 100).toFixed(2)

console.log('AA win % (sim):', aaWin)
console.log('KK win % (sim):', kkWin)
```

## Range vs Range Compare

```ts
const ours = new Range('QQ+,AKs')
const theirs = new Range('TT+,AQs+,AKo')
globalThis.rangeResult = await equityEngine.rangeEquity(ours, theirs, { iterations: 2000 })

console.log('Range compare result:')
console.log(JSON.stringify(globalThis.rangeResult, null, 2))
```

## Proof of Shared VM State Across Blocks

```ts
// The previous block used top-level await, so we persisted on globalThis.
console.log('Shared context still has rangeResult.theirs =', globalThis.rangeResult.theirs)
```

## Optional REPL After Running

Drop into a REPL with all variables from this document loaded:

```bash
luca run demos/js-api.md --console
```
