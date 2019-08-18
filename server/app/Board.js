import React, { Component } from 'react'
import types from 'prop-types'
import { CardGroup } from './CardGroup'
import { Box } from 'ink'

export class Board extends Component {
  static contextTypes = {
    runtime: types.object,
    game: types.object
  }

  state = { }

  componentDidMount() {
    const { game } = this.context

    this.disposer = game.state.observe(() => {
      this.setState({ 
        hash: game.hash,
        board: game.board, 
        pot: game.pot
      })
    })
  }

  componentWillUnmount() {
    this.disposer()
  }

  render() {
    const { game, runtime } = this.context
    const { pot, board = [] } = this.state

    let potLabel = `POT $${pot}`;

    const labelLength = potLabel.length;
    const paddingToAdd = Math.floor((52 - labelLength) / 2);
    const spaces = Array.from(new Array(paddingToAdd))
      .map(i => ` `)
      .join("");
    potLabel = `${spaces}${potLabel}${spaces}`.slice(0, 52); 

    return (
      <Box flexDirection="column">
        <Box>
          <CardGroup 
            placeholders={5} 
            bordered 
            label={pot > 0 ? potLabel : new Array(18).map(i => ' ').join("")} 
            cards={board} 
            />
        </Box>
      </Box>
    )
  }
}

export default Board

function outputCards(cards = [], runtime) {
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
