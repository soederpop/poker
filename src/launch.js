/** 
 * The runtime module is a global singleton that has observable state,
 * an event emitter interface, and module registries for dependency injection.
 * 
 * Any React component in the tree can access this object through its contextTypes
 * interface.  It will have a property `settings` that has specific configuration
 * for this deployment / environment.
*/
import runtime from './runtime'
import React from 'react'
import App from './App'
import { AppContainer } from 'react-hot-loader'
import { render } from 'react-dom'

const renderer = Component => {
  render(
    <AppContainer>
      <Component runtime={runtime} />
    </AppContainer>,
    document.getElementById('root')
  )
}

renderer(App)

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    renderer(App)
  })
}
