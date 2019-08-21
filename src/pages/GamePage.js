import React, { Component } from 'react'
import types from 'prop-types'
import GameTable from '../components/GameTable'
import GameControls from '../components/GameControls'
import { Segment, Container } from 'semantic-ui-react'

export class GamePage extends Component {
  static contextTypes = {
    runtime: types.object
  }

  static propTypes = {
    viewOptions: types.object
  }

  static defaultProps = {
    viewOptions: {
      display: "playerInfo"
    }
  }

  state = {
    loading: false,
    game: undefined,
    viewOptions: this.props.viewOptions
  }

  receiveGameUpdate = (data = {}) => {
    console.log('Received Game Update', data)
  }

  async componentDidMount() {
    const { runtime } = this.context
    const { api } = runtime
    const { gameId } = this.props.match.params

    try {
      this.setState({ loading: true })
      const game = await api.showGame(gameId)
      this.setState({ game })
    } catch(error) {
      console.error('Error displaying game', error)
      this.setState({ error: error.message })
    } finally {
      this.setState({ loading: false })
    }

    let gamesService

    if (runtime.currentState.connected) {
      console.log('listening for game update')
      gamesService = runtime.api.gamesService;
      gamesService.on("changed", this.receiveGameUpdate);
    } else {
      runtime.once("connected", () => {
        console.log('connected now, listening for game update')
        gamesService = runtime.api.gamesService;
        gamesService.on("changed", this.receiveGameUpdate);
      })
    }

    this.disconnect = () => {
      gamesService && gamesService.off('changed', this.receiveGameUpdate)
    }
  }

  componentWillUnmount() {
    this.disconnect()
  }

  async refreshGame() {
    const { runtime } = this.context;
    const api = runtime.client("game-api");
    const { gameId } = this.props.match.params;

    try {
      const game = await api.showGame(gameId);
      this.setState({ game });
    } catch (error) {
      this.setState({ error: error.message });
    } finally {
      this.setState({ loading: false });
    }    
  }

  handleViewChange = (viewOptions = {}) => {
    this.setState((current) => ({
      ...current,
      viewOptions: {
        ...current.viewOptions,
        ...viewOptions
      }
    }))
  }

  render() {
    const { loading, game = {}, viewOptions = {} } = this.state

    if (loading) {
      return <div />
    } else {
      return (
        <Segment inverted basic style={{ margin: '0px auto', width: '1280px' }}>
          <GameTable game={game} viewOptions={viewOptions} />
          <GameControls 
            onUpdate={() => this.refreshGame()} 
            onChangeView={this.handleViewChange}
            game={game} 
          />
        </Segment>
      )
    }
  }

}

export default GamePage