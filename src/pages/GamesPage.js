import React, { Component } from 'react'
import types from 'prop-types'

export class GamesPage extends Component {
  static contextTypes = {
    runtime: types.object
  }

  state = {
    loading: false,
    game: undefined
  }

  async componentDidMount() {
    const { runtime } = this.context
    const api = runtime.client('game-api')

    try {
      this.setState({ loading: true })
      const games = await api.listGames()
      this.setState({ games })
    } catch(error) {
      console.error('Error listing games', error)
      this.setState({ error: error.message })
    } finally {
      this.setState({ loading: false })
    }
    
  }

  render() {
    const { loading, games = [] } = this.state

    console.log({ games })
    return (
      <div>
        {!loading && games.map((game, index) => <div key={game.id}><a href={`/games/${game.id}`}>{game.id}</a></div>)}  
      </div>
    )
  }

}

export default GamesPage