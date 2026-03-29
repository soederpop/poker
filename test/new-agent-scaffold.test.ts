import { describe, expect, it } from "bun:test"

import { createNewAgentScaffold } from "../lib/new-agent-scaffold"

describe("new agent scaffold", () => {
  it("creates a thin-wrapper strategy entry over modular internals", () => {
    const scaffold = createNewAgentScaffold({
      slug: "my-bot",
      displayName: "My Bot",
      actorTemplate: null,
      standalone: false,
    })

    expect(Object.keys(scaffold.files).sort()).toEqual([
      "README.md",
      "docs/situations/README.md",
      "strategy.ts",
      "strategy/index.ts",
      "tsconfig.json",
      "types/pokurr.d.ts",
    ])

    expect(scaffold.files["strategy.ts"]).toContain('import { buildDecision } from "./strategy"')
    expect(scaffold.files["strategy.ts"]).toContain("return buildDecision(context)")
    expect(scaffold.files["strategy/index.ts"]).toContain("export function buildDecision")
    expect(scaffold.files["strategy/index.ts"]).toContain("premium-raise")
    expect(scaffold.files["README.md"]).toContain("`strategy.ts`: runtime adapter")
    expect(scaffold.files["README.md"]).toContain("`strategy/`: modular strategy internals")
    expect(scaffold.files["tsconfig.json"]).toContain('"strategy/**/*.ts"')
  })

  it("preserves the selected actor template note in the wrapper", () => {
    const scaffold = createNewAgentScaffold({
      slug: "my-bot",
      displayName: "My Bot",
      actorTemplate: "tag",
      standalone: true,
    })

    expect(scaffold.files["strategy.ts"]).toContain("Seeded from house actor style: tag")
    expect(scaffold.files["README.md"]).toContain("Starter baseline: `tag` actor style")
  })
})
