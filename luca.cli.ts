import type { AGIContainer } from "@soederpop/luca/agi"

import { bootPokerContainer } from "./container"

export async function main(container: AGIContainer) {
  await bootPokerContainer(container)
}
