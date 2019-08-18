import React from 'react'
import types from 'prop-types'
import { Box } from 'ink'
import Table from './Table'
import Seat from './Seat'

export function App(props = {}) {
  const { game } = props

  return (
    <Box paddingLeft={6} paddingRight={6} flexDirection="column" width={80}>
      <Box minHeight={8}>
        {game.playerIds.slice(0,4).map(playerId => (
          <Box key={playerId} width="100%">
            <Seat game={game} playerId={playerId} />
          </Box>
        ))}
      </Box>
      <Box height={16} width="100%" flexDirection="row">
        <Box width={20}> 
        </Box>
        <Box minWidth={60} width={60}>
          <Table {...props} />
        </Box>
        <Box width={20}> </Box>
      </Box>
      <Box minHeight={8}>
        {game.playerIds.slice(4).reverse().map(playerId => (
          <Box key={playerId} width="100%">
            <Seat game={game} playerId={playerId} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

App.propTypes = {
  game: types.shape({
    deal: types.func,
    board: types.array,
    players: types.object,
    stage: types.string,
    hash: types.string,
    playerData: types.shape({
      set: types.func,
      observe: types.func
    }),
    state: types.shape({
      set: types.func,
      observe: types.func
    })
  })
}

export default App