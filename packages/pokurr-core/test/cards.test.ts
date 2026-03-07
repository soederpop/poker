import { describe, expect, it } from "bun:test"
import { Deck, HandCategory, cardToString, compareHands, evaluateHand, stringToCard } from "../src/cards"

describe("cards", () => {
  it("round-trips card serialization", () => {
    const card = stringToCard("Ah")
    expect(cardToString(card)).toBe("Ah")
  })

  it("deck contains 52 unique cards", () => {
    const deck = new Deck().shuffle()
    expect(deck.count).toBe(52)

    const names = deck.cards.map((card) => cardToString(card))
    expect(new Set(names).size).toBe(52)
  })

  it("draw and reset lifecycle works", () => {
    const deck = new Deck()
    const cards = deck.draw_n(2)

    expect(cards.length).toBe(2)
    expect(deck.count).toBe(50)

    deck.reset()
    expect(deck.count).toBe(52)
  })

  it("evaluates best 5 of 7 correctly", () => {
    const straightFlush = evaluateHand(["Ah", "Kh", "Qh", "Jh", "Th", "2c", "3d"])
    const fourOfAKind = evaluateHand(["As", "Ad", "Ac", "Ah", "2c", "3d", "4h"])

    expect(straightFlush.category).toBe(HandCategory.STRAIGHT_FLUSH)
    expect(fourOfAKind.category).toBe(HandCategory.FOUR_OF_A_KIND)
    expect(compareHands(straightFlush, fourOfAKind)).toBeGreaterThan(0)
  })
})
