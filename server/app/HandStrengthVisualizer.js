import React, { useState, useContext, useEffect } from 'react'
import types from 'prop-types'
import { Color, Box, StdinContext } from 'ink'
import Range from '../Range'
import chunk from 'lodash/chunk'
import DataTable from './DataTable'

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

const combos = Range.normalizedComboInfo;
const chain = Range.chain.plant(combos)

const grid = Range.asGrid();

export function RangeVisualizer(props = {}) {
  const { numberOfPlayers = 8 } = props
  const [current, update] = useState(numberOfPlayers)

  useKeyHandler(data => {
    if (data === 'q') process.exit(0)
    if (data === '1') update('1')
    if (data === '2') update('2')
    if (data === '3') update('3')
    if (data === '4') update('4')
    if (data === '5') update('5')
    if (data === '6') update('6')
    if (data === '7') update('7')
    if (data === '8') update('8')
  })
  const average = chain.map(`oddsVsPlayers.${current}`).mean().value();

  const aboveAverage = chain
    .map(`oddsVsPlayers.${current}`)
    .filter(i => i > average)
    .mean()
    .value();

  const belowAverage = chain.map(`oddsVsPlayers.${current}`)
    .filter(i => i < average)
    .mean()
    .value();

  const getColor = (normalized) => {
    const combo = combos[normalized]
    const odds = combo.oddsVsPlayers[current]
    const color = {}

    if (odds <= belowAverage) {
      color.red = true
    } else if (odds >= aboveAverage + 5) {
      color.green = true
    } else if (odds >= aboveAverage - 5) {
      color.hex = "#BADA55" 
    } else if (odds >= belowAverage + 5 && odds <= average + 5) {
      color.rgb=[255,195,0]
    } else if (odds >= belowAverage && odds <= average ) {
      color.rgb=[255,165,10]
    } else {
      color.rgb=[230,165,10]
    }

    return color
  }

  const handStrengths = chunk(Object.values(combos).map((combo) => [combo.normalized, combo.oddsVsPlayers[current]]).flat(), 6)

  return (
    <Box width={140} flexDirection="row">
      <Box width={70} flexDirection="column">
        {grid.map((row, i) => (
          <Box padding={0} flexDirection="row" key={`row-${i}`}>
            {row.map(item => (
              <Box paddingRight={1} paddingLeft={1} key={item}>
                <Color {...getColor(item)}>
                  {item.length === 2 ? `${item}s` : item}
                </Color>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      <Box width={70} flexDirection="column">
        <DataTable 
          headers={['Hand', 'Win %', 'Hand', 'Win%', 'Hand', 'Win%']} 
          rows={handStrengths} 
        />
      </Box>
    </Box>
  );
}

export default RangeVisualizer