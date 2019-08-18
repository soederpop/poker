require("babel-plugin-require-context-hook/register")();
require("@babel/register")();
require("@babel/polyfill/noConflict");

const runtime = require("../runtime");

main()

async function main() {
  const hand = new runtime.HandEquity(runtime.argv._, runtime.argv.players || 6)

  await runtime.repl('interactive').launch({ hand, runtime })
}