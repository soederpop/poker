require("babel-plugin-require-context-hook/register")();

const runtime = require("../runtime");

main()

async function main() {
  const db = runtime.fileDb
  const data = runtime.data 

  const records = Object.values(data.equityData())

  await db.load()

  await Promise.all(
    records.map(record => db.insert(record))
  )
}