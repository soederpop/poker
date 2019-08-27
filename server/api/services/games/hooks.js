export default function createHooks(server, options) {
  const { runtime } = server
  const { debounce } = runtime.lodash

  const observing = {}

  runtime.debug('Creating Games Hooks')

  function onGameCreate(context = {}) {
    runtime.debug('On Game Create Hook')

    const { service, result } = context

    if (observing[result.id]) {
      return context
    }
    
    runtime.debug(`Game Service observing ${result.id}`)
    const game = service.gamesMap.get(result.id)

    const publisher = () => {
      service.emit('changed', {
        type: 'changed',
        data: game.toJSON(),
      })
    }

    observing[game.gameId] = game.state.observe(debounce(publisher, 100))

    return context
  }

  const before = {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  }

  const after = {
    all: [],
    find: [],
    get: [],
    create: [ onGameCreate ],
    update: [],
    patch: [],
    remove: [],
  }

  const error = {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  }

  return { before, after, error }
}
