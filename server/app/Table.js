import React, { Component } from 'react'
import types from 'prop-types'
import { Box } from 'ink'
import InkBox from 'ink-box'
import Seat from './Seat'
import Board from './Board'

export class App extends Component {
  static propTypes = {
    game: types.object.isRequired
  }

  static childContextTypes = {
    game: types.object,
    runtime: types.object
  }

  getChildContext() {
    return {
      game: this.props.game,
      runtime: this.props.game.runtime
    }
  }

  state = {}

  componentDidMount() {
    const { game } = this.props

    this.disposer = game.state.observe(() => {
      this.setState({ 
        hash: game.hash,
        iteration: game.state.get('iteration')
      })  
    })
  }

  componentWillUnmount() {
    this.disposer && this.disposer()
  }

  render() {
    const { game } = this.props

    return (
      <Board />
    );
  }
}

export default App