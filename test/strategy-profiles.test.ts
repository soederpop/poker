import { describe, expect, it } from "bun:test"

import balancedActor from "../house/actors/balanced"
import pressureActor from "../house/actors/pressure"
import shortStackActor from "../house/actors/short-stack"
import trickyActor from "../house/actors/tricky"
import { listStrategyProfileNames } from "../lib/strategy-profiles"

describe("strategy profile pool", () => {
  it("includes stronger baseline profiles for regret-minimizer opponent pools", () => {
    expect(listStrategyProfileNames()).toEqual(expect.arrayContaining([
      "balanced",
      "pressure",
      "short-stack",
      "tricky",
    ]))
  })

  it("ships matching house actors that route through those profiles", () => {
    expect(balancedActor.profileName).toBe("balanced")
    expect(pressureActor.profileName).toBe("pressure")
    expect(shortStackActor.profileName).toBe("short-stack")
    expect(trickyActor.profileName).toBe("tricky")
  })
})
