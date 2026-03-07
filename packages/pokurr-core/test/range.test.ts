import { describe, expect, it } from "bun:test"
import { Range, getCombo } from "../src/range"

const individual: Array<[string, number]> = [
  ["22-99", 48],
  ["ATs-AKs", 16],
  ["KTs+", 16],
  ["QTs+", 16],
  ["JTs", 4],
  ["T9s", 4],
  ["98s", 4],
  ["87s", 4],
]

describe("range notation", () => {
  it("understands plus signs", () => {
    const combos = new Range("KTs+").normalizedComboNames

    expect(combos).toContain("KTs")
    expect(combos).toContain("KJs")
    expect(combos).toContain("KQs")
    expect(combos).toContain("AKs")
    expect(combos.length).toBe(4)
  })

  it("understands dashes", () => {
    const combos = new Range("ATs-AQs").normalizedComboNames
    expect(combos).toContain("ATs")
    expect(combos).toContain("AJs")
    expect(combos).toContain("AQs")
    expect(combos.length).toBe(3)
  })

  for (const [input, count] of individual) {
    it(`counts combos for ${input}`, () => {
      expect(new Range(input).size).toBe(count)
    })
  }

  it("combines comma-separated ranges", () => {
    const combinedInput = individual.map((entry) => entry[0]).join(",")
    const combined = new Range(combinedInput)

    expect(combined.normalizedComboNames).toEqual(
      expect.arrayContaining([
        "AKs",
        "AQs",
        "AJs",
        "ATs",
        "KQs",
        "KJs",
        "KTs",
        "QJs",
        "QTs",
        "JTs",
        "99",
        "88",
        "77",
        "66",
        "55",
        "44",
        "33",
        "22",
        "87s",
        "98s",
        "T9s",
      ]),
    )

    expect(combined.size).toBe(100)
  })

  it("excludes dead cards", () => {
    const full = new Range("AKo,AKs")
    const blocked = new Range("AKo,AKs", ["Ah"])

    expect(full.size).toBe(16)
    expect(blocked.size).toBeLessThan(full.size)
  })

  it("exposes expected sklansky tiers", () => {
    const ultraStrong = Range.ultraStrong()
    const strong = Range.strong()
    const medium = Range.medium()
    const loose = Range.loose()

    expect(ultraStrong.normalizedComboNames).toEqual(expect.arrayContaining(["AA", "KK", "QQ", "JJ", "AKs"]))
    expect(strong.size).toBeGreaterThan(ultraStrong.size)
    expect(medium.size).toBeGreaterThan(strong.size)
    expect(loose.size).toBeGreaterThan(medium.size)
  })

  it("computes combo metadata correctly", () => {
    const aks = getCombo("AhKh")
    const akoff = getCombo("AhKd")
    const sevens = getCombo("7h7d")

    expect(aks?.suited).toBeTrue()
    expect(aks?.connected).toBeTrue()
    expect(aks?.pair).toBeFalse()
    expect(akoff?.offsuit).toBeTrue()
    expect(sevens?.pair).toBeTrue()
  })
})
