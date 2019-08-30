import React, { Component } from 'react'
import types from 'prop-types'
import { Color, Text, Box } from 'ink'
import runtime from '@skypager/node'
import CardGroup from './CardGroup'
import boxen from 'boxen'

/** 
 * @typedef {import("../Game").Game} Game
*/
export class Seat extends Component {
  static propTypes = {
    runtime: types.object,
    game: types.object
  }

  state = { }

  /** 
   * @type {Game}
  */
  get game() {
    return this.props.game  
  }

  componentDidMount() {
    const { game } = this
    const { playerId } = this.props

    this.setState( game.players[playerId] )

    game.state.observe(() => {
      this.setState({ 
        hash: game.hash,
        equity: game.playerEquities || {}
      })
    })

    this.disposer = game.playerData.observe(({ name, newValue }) => {
      if (name === playerId && typeof newValue === 'object' && newValue != undefined) {
        this.setState({
          seat: newValue.seat,
          cards: newValue.cards,
          chips: newValue.chips,
          inHand: newValue.inHand 
        })
      }  
    })
  }

  componentWillUnmount() {
    this.disposer()
  }

  render() {
    const { game } = this
    const { playerId } = this.props
    const { cards = [], chips, seat, inHand, equity = {} } = this.state
    const { actionSeat, dealerSeat, stage, smallBlindSeat, bigBlindSeat } = game

    const isButton = dealerSeat === seat
    const isBigBlind = bigBlindSeat === seat
    const isSmallBlind = smallBlindSeat === seat
    const action = actionSeat === seat

    let badge = ''

    if (isButton) badge = '(D)'
    if (stage === 'preflop' && isBigBlind) badge = '(BB)'
    if (stage === 'preflop' && isSmallBlind) badge = '(SB)'

    let playerLabel = `${playerId}${badge}`;

    const labelLength = playerLabel.length
    const paddingToAdd = Math.floor((12 - labelLength) / 2)
    const spaces = Array.from(new Array(paddingToAdd)).map(i => ` `).join('')
    playerLabel = `${spaces}${playerLabel}${spaces}`.slice(0, 20) 

    const center = (text, width = 12) => {
      const labelLength = text.length
      const paddingToAdd = Math.max(Math.floor((width - labelLength) / 2), 0)
      const spaces = Array.from(new Array(paddingToAdd)).map(i => ` `).join('')
      return `${spaces}${text}${spaces}`
    }

    const playerEquity = equity && equity[playerId] 
     
    let labelText = center(`$${chips}`, 13)

    if (playerEquity) {
      const { tiePercentage, equity } = playerEquity

      labelText = [
        labelText,
        center(`${equity}:${tiePercentage || 0}`, 13)
      ].filter(v => v && v.length).join("\n")
    }
      
    return (
      <Box flexDirection="column" width={20}>
        <Box width={20}>
          {inHand && <Text underline>{playerLabel}</Text>}
          {!inHand && <Color dim>{playerLabel}</Color>}
        </Box>
        <Box>
          {!cards.length && <CardGroup blanks={2} />}
          {!!(cards && cards.length) && <CardGroup dimmed={!inHand} cards={cards} box={{ padding: 0 }} />}
        </Box>
        <Box width={20} minHeight={2}>
          {inHand && <Text underline bold>{labelText}</Text>}
          {!inHand && <Color dim>{labelText}</Color>}
        </Box>
      </Box>
    )
  }
}

export default Seat

function outputCards(cards = []) {
  const {
    colors: { green, blue, red, yellow },
    icon
  } = runtime.cli;

  const table = {
    h: icon("hearts"),
    c: icon("clubs"),
    d: icon("diamonds"),
    s: icon("spades")
  };

  const colorize = {
    h: v => red(v),
    c: v => green(v),
    d: v => blue(v),
    s: v => yellow(v)
  };

  return cards
    .map(card => {
      const parts = card.split("");
      const suit = parts.pop();
      const value = parts.join("");
      return colorize[suit](`${table[suit]}${value}`);
    })
    .join("");
}
