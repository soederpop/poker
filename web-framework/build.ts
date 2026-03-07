const result = await Bun.build({
  entrypoints: ["./web-framework/src/main.tsx"],
  outdir: "./web-framework/public/dist",
  target: "browser",
  format: "esm",
  sourcemap: "external",
  minify: false,
  external: ["react", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
})

if (!result.success) {
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

const emittedMain = Bun.file("./web-framework/public/dist/main.js")
if (await emittedMain.exists()) {
  await Bun.write("./web-framework/public/dist/app.js", emittedMain)
}

const emittedMap = Bun.file("./web-framework/public/dist/main.js.map")
if (await emittedMap.exists()) {
  await Bun.write("./web-framework/public/dist/app.js.map", emittedMap)
}

console.log(`[web-framework] built ${result.outputs.length} file(s)`)
