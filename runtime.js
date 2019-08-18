const runtime = require('@skypager/node')

const loadSource = process.env.NODE_ENV !== 'production'

if (loadSource) {
  require('@babel/register')()
  require('babel-plugin-require-context-hook/register')()
} else {
  console.log(process.argv)
  process.exit(0)
}

const framework = loadSource
  ? require('./server')
  : require('./lib')

module.exports = runtime.use(framework)
