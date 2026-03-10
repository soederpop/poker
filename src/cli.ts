#!/usr/bin/env bun
/**
 * Standalone pokurr CLI entry point.
 *
 * Boots a luca container and dispatches to the poker command handler directly.
 * In the compiled binary, POKURR_COMPILED is defined at build time so the
 * WASM equity engine loads from inlined base64 instead of the filesystem.
 */
import container from "@soederpop/luca/agi"
import { handler, argsSchema } from "../commands/poker"
import type { BootMode } from "../container"

const isCompiled = process.env.POKURR_COMPILED === "true"
const bootMode: BootMode = isCompiled ? "standalone" : "project"

async function main() {
  // The poker command handler expects argv._[0] === "poker" and reads
  // subcommands from argv._[1] onward. In the standalone binary, process.argv
  // gives us ["pokurr", "analyze", ...] so we prepend "poker" as a synthetic
  // first positional to keep the handler's index math correct.
  const rawArgs = container.argv._ as string[]
  rawArgs.unshift("poker")

  // Store the boot mode on the container so the handler can access it
  container.state.set("pokurrBootMode" as any, bootMode)

  // Parse options through the command's zod schema
  const parsed = argsSchema.safeParse(container.argv)
  const options = parsed.success ? parsed.data : argsSchema.parse({})

  await handler(options, { container } as any)
}

main().catch((err) => {
  console.error(err?.message || err)
  process.exit(1)
})
