export default async function setupStrategiesEndpoints(app) {
  const { runtime } = this
  const { Range } = runtime
  
  app
    .route("/api/strategies")
    .get(listStrategies.bind(this))
    .post(createStrategy.bind(this))

  app
    .route("/api/strategies/:strategyId")
    .get(showStrategy.bind(this))
    .put(updateStrategy.bind(this))

  app
    .route("/api/games/:gameId/strategies")
    .get(listActorStrategies.bind(this))
  app
    .route("/api/games/:gameId/strategies/:actorId")
    .get(showActorStrategy.bind(this))
    .put(updateActorStrategy.bind(this))

  return app
}

async function listStrategies(req, res) {
  const strategies = await this.runtime.fsx.readdirAsync(
    this.runtime.resolve("server", "actors")
  )

  res.status(200).json(strategies)
}

export async function showStrategy(req, res) {
  const { strategyId } = req.params

  const content = await this.runtime.fsx.readFileAsync(
    this.runtime.resolve("server", "actors", `${sanitize(strategyId)}.js`)
  )

  res.status(200).json({ strategyId, content })
}

export async function updateStrategy(req, res) {
  res.status(200).json({ ok: true })
}

export async function createStrategy(req, res) {
  res.status(200).json({ ok: true })
}

export async function updateActorStrategy(req, res) {
  res.status(200).json({ ok: true })
}

export async function listActorStrategies(req, res) {
  res.status(200).json({ ok: true })
}

export async function showActorStrategy(req, res) {

}