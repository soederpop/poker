import React, { useState, useEffect } from 'react'
import { padEnd } from 'lodash'
import { Text, Box, Color } from 'ink'

export function GameInfo({ game, width = 40 }) {
  const [info, update] = useState({
    dealerSeat: game.dealerSeat,
    actionOrder: game.actionOrder,
    lastAction: game.lastAction,
    actionSeat: game.actionSeat,
    stage: game.stage,
    closed: game.isActionClosed,
    favorite: game.favorite || 'N/A'
  })

  useEffect(() => {
    const disposer = game.state.observe(() => {
      update({
        dealerSeat: game.dealerSeat,
        actionOrder: game.actionOrder,
        lastAction: game.lastAction,
        actionSeat: game.actionSeat,
        stage: game.stage,
        closed: game.isActionClosed,
        favorite: game.favorite || 'N/A'
      })
    })

    return disposer
  }, [game.hash])

  return (
    <Box flexDirection="column" width={width}>
      <Box>
        <Color bold>Hash: </Color>
        <Text>{game.hash.slice(0,8)}</Text>
      </Box>
      <Box>
        <Color bold>Stage: </Color>
        <Text>{info.stage}</Text>
      </Box>
      <Box>
        <Color bold>Dealer: </Color>
        <Text>{info.dealerSeat}</Text>
      </Box>     
      <Box>
        <Color bold>Action: </Color>
        <Text>{info.closed ? 'CLOSED' : info.actionSeat}</Text>
      </Box>     
      {info.favorite !== 'N/A' && <Box>
        <Color bold>Favorite: </Color>
        <Text>{info.favorite}</Text>
      </Box>}     
    </Box>
  )
}

export default GameInfo