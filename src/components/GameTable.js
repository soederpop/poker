import React, { Component } from 'react'
import types from 'prop-types'
import TABLE_BG from '../assets/table-bg.jpg'
import CardGroup from '../components/CardGroup'
import Players from '../components/Players'
import Chips from '../components/Chips'
import PotDisplay from '../components/PotDisplay'
import DealerButton from '../components/DealerButton'

export class GameTable extends Component { 
  static contextTypes = {
    runtime: types.object
  }

  static childContextTypes = {
    game: types.object
  }

  static propTypes = {
    game: types.object
  }
 
  state = {
    game: this.props.game 
  }

  getChildContext() {
    return { game: this.state.game }
  }

  componentDidUpdate(prevProps) {
    const { game } = this.props

    if (prevProps.game.hash !== game.hash) {
      this.setState({ game: this.props.game })
    }
  }

  render() {
    const { viewOptions = {}, height = 800, width = 1200, cardHeight = height / 8 } = this.props
    const { game } = this.state

    return (
      <div style={{ position: 'relative', margin: '0px auto', padding: 0, height: `${height}px`, width: `${width}px`, backgroundSize: 'cover', backgroundImage: `url(${TABLE_BG})` }}>
        <Players 
          game={game} 
          dimensions={{ height, width }} 
          viewOptions={viewOptions}
        />
        <Chips /> 
        <DealerButton height={800} width={1200} seat={game.dealerSeat} /> 
        <CardGroup
          cardHeight={cardHeight}
          containerStyles={{ left: width / 3, top: (height / 2) - cardHeight }}
          cards={game.boardDescription && game.boardDescription.length && game.boardDescription.split(" ").map((card) => card.toLowerCase())}
        />
        <PotDisplay game={game} height={height} width={width} /> 
      </div>
    )
  }
}

export default GameTable