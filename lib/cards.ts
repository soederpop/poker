import { cardToString, createStandardDeck, stringToCard } from "@pokurr/core"

export function splitCards(input: string): string[] {
  const normalized = String(input || "").replace(/[^0-9a-zA-Z]/g, "")

  if (normalized.length % 2 !== 0) {
    throw new Error(`Invalid card string: ${input}`)
  }

  const cards: string[] = []

  for (let i = 0; i < normalized.length; i += 2) {
    const card = normalized.slice(i, i + 2)
    // Validate through @pokurr/core parser.
    stringToCard(card)
    cards.push(card)
  }

  return cards
}

export function parseExactHand(input: string): [string, string] {
  const cards = splitCards(input)

  if (cards.length !== 2) {
    throw new Error(`Expected exactly 2 cards, got ${cards.length} from: ${input}`)
  }

  return [cards[0] as string, cards[1] as string]
}

export function buildDeckStrings(): string[] {
  return createStandardDeck().map((card) => cardToString(card))
}

export function withoutDeadCards(deck: string[], deadCards: string[]): string[] {
  const dead = new Set(deadCards)
  return deck.filter((card) => !dead.has(card))
}
