export default async function setupRangesEndpoint(app) {
  const { runtime } = this
  const { Range } = runtime

  app.get('/api/ranges/grid', (req, res) => {
    const grid = Range.asGrid()
    const combos = Range.combos.map(combo => combo.toJSON())
    res.json({ grid, combos })
  })

  app.get('/api/ranges/flops', (req, res) => {
    const flops = Range.chains.flops
    const { isNaN } = runtime.lodash
    const filters = runtime
      .chain.plant(req.query)
      .mapValues((v) => !isNaN(parseInt(v, 10)) ? parseInt(v, 10) : v)
      .mapValues((v) => String(v) === 'true' || String(v) === 'false' ? String(v).toLowerCase() === 'true' : v)
      // get the attributes that can be filtered against 
      .pick( flops.first().keys().value() )
      .value()
    
    const { sample, page = 1, limit = 500 } = req.params
    const startAt = (page - 1) * limit
    const endAt = startAt + limit

    let results = flops.filter(filters)

    if (sample) {
      results = results.shuffle().slice(0, sample)  
    } else {
      results = results.slice(startAt, endAt)
    }

    res.json({ page, limit, startAt, endAt, filters, flops: results.value() })
  })
 
  app.get('/ranges/combos', (req, res) => {
    const combos = Range.combos.map(combo => combo.toJSON())
    res.json({ combos })
  })
 
  app.get('/ranges/view', (req, res) => {
    const { range, deadCards } = req.query

    if (String(range).startsWith('sklansky')) {
      const id = range.split(':').pop()
      res.json(Range.sklansky(id).toJSON())
    } else {
      const obj = new Range(range, deadCards)
      res.json(obj.toJSON())
    }
  }) 
  
  return app
}