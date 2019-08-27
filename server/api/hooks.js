export default function createHooks(server, options) {
  const { runtime } = server 

  function log(context) {
    runtime.debug(`${context.type} app.service('${context.path}').${context.method}()`);

    if (typeof context.toJSON === 'function') {
      runtime.debug(`Hook Context`, runtime.lodash.cloneDeep(context.toJSON()))
    }

    if(context.error && !context.result) {
      runtime.error(context.error.stack);
    }
  }
  
  const before = {
    all: [ log ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  }
  
  const after = {
    all: [ log ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  }
  
  const error = {
    all: [ log ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  }

  return { before, after, error }
}
