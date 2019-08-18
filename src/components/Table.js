import React, { Component } from 'react'
import types from 'prop-types'
import runtime from './runtime'
import TABLE_BG from './assets/table-bg.jpg'
import aceHearts from './assets/cards/ah.svg'
import aceClubs from './assets/cards/ac.svg'
import aceDiamonds from './assets/cards/ad.svg'
import kingClubs from './assets/cards/kc.svg'
import queenClubs from './assets/cards/qc.svg'

export class App extends Component { 
  static childContextTypes = {
    runtime: types.object
  }

  static propTypes = {
    runtime: types.object
  }

  static defaultProps = {
    runtime
  }

  state = {}

  getChildContext() {
    return { runtime: this.props.runtime }
  }
  
  render() {
    const { height = 800, width = 1200, cardHeight = height / 8 } = this.props

    return (
      <div style={{ position: 'relative', margin: 0, padding: 0, height: `${height}px`, width: `${width}px`, backgroundSize: 'cover', backgroundImage: `url(${TABLE_BG})` }}>
        <div style={{ position: 'absolute', left: width / 3, top: (height / 2 ) - cardHeight, flexDirection: 'row', display: 'flex' }}>
          <div style={{ marginRight: '8px' }}><img style={{ height: `${cardHeight}px` }} src={aceHearts} /></div>
          <div style={{ marginRight: '8px' }}><img style={{ height: `${cardHeight}px` }} src={aceDiamonds} /></div>
          <div style={{ marginRight: '8px' }}><img style={{ height: `${cardHeight}px` }} src={aceClubs} /></div>
          <div style={{ marginRight: '8px' }}><img style={{ height: `${cardHeight}px` }} src={kingClubs} /></div>
          <div style={{ marginRight: '8px' }}><img style={{ height: `${cardHeight}px` }} src={queenClubs} /></div>
        </div>
      </div>
    )
  }
}

export default App