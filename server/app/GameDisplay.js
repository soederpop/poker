import React, { useState, useContext, useEffect } from 'react'
import types from 'prop-types'
import HoldemGame from './HoldemGame'
import { Color, Box, StdinContext } from 'ink'
import GameInfo from './GameInfo'

const useKeyHandler = keyHandler => {
  const { stdin, setRawMode } = useContext(StdinContext);

  useEffect(() => {
    setRawMode(true);
    stdin.on("data", keyHandler);
    return () => {
      stdin.off("data", keyHandler);
      setRawMode(false);
    };
  }, [stdin, setRawMode]);
};

export function App(props = {}) {
  const { game } = props

  const [infoLines, updateInfoLines] = useState('')
  const [equityData, updateEquityData] = useState({})

  useEffect(() => {
    return game.state.observe(() => {
      updateInfoLines((game.state.get('actions') || []).map(a => `${a.playerId} ${a.action} ${a.amount}`).join("\n"))  
    })
  }, [game.hash])

  useEffect(() => {
    const autoCalculate = () => {
      game.runtime.argv.autoCalculate !== false && Promise.resolve(game.calculateEquity())
    }

    game.on('round', autoCalculate)

    return () => game.off('round', autoCalculate)
  }, [game.round])

  useKeyHandler(data => {
    if (data === 'q') process.exit(0)
    
    if (data === 'a') {
      if (!game.isHandFinished) {
        game.currentActor.act()
      }
    }
    
    if (data === 'd') {
      game.stage === 'river' ? game.reset() : game.deal()
    }

    if (data === 'e') {
      Promise.resolve(game.calculateEquity())
    }

    if (data === 'r') {
      game.reset()
      game.deal()
    }
  })

  return (
    <Box width={170} flexDirection="row">
      <Box width={90} flexDirection="column">
        <HoldemGame {...props} hash={game.hash} />
        <Box>Keys: (A) act (D) deal (E) Equity</Box>
      </Box>
      <Box width={80} flexDirection="column">
        <GameInfo game={game} width={20} />
        ---
        <Color bold underline>
          Log:
        </Color>
        {infoLines}
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