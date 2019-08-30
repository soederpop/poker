const scenarios = require.context('./scenarios', true, /\.js$/)

export default function create(name, options = {}) {
  const id = `./${name}.js`
  const { createGame } = require('../runtime')
  const scenario = scenarios(id).create(createGame, options)

  return scenario
}