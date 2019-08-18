import React, { useState, useContext, useEffect } from 'react'
import types from 'prop-types'
import HoldemGame from './HoldemGame'
import { Text, Color, Box, StdinContext } from 'ink'
import GameInfo from './GameInfo'
import Range from '../Range'
import chunk from 'lodash/chunk'

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
  const average = Range.chain
    .get("normalizedComboInfo")
    .map("oddsVsPlayers.6")
    .mean()
    .value();
  const aboveAverage = Range.chain
    .get("normalizedComboInfo")
    .map("oddsVsPlayers.6")
    .filter(i => i > average)
    .mean()
    .value();
  const belowAverage = Range.chain
    .get("normalizedComboInfo")
    .map("oddsVsPlayers.6")
    .filter(i => i < average)
    .mean()
    .value();

  const grid = Range.asGrid();

export function RangeVisualizer(props = {}) {

  const [current, update] = useState(props.input)

  useKeyHandler(data => {
    if (data === 'q') process.exit(0)
    if (data === '1') update('ultraStrong')
    if (data === '2') update('strong')
    if (data === '3') update('medium')
    if (data === '4') update('loose')
  })

  let range
  switch(current) {
    case 'ultraStrong':
    case 'strong':
    case 'medium':
    case 'loose':
      range = Range.sklansky[current]
      break
    default:
      range = new Range(current)
  }

  const getColor = (normalized) => {
    const combo = combos[normalized]
    const odds = combo.oddsVsPlayers['6']
    const color = {}

    if (!range.combos.find(combo => combo.normalized === normalized)) {
      color.dim = true
    } else {
      color.bold = true
    }

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

  const rangeDescription = range.chain
    .get("combos")
    .map("normalized")
    .uniq()
    .chunk(18)
    .thru((lines) => lines.concat(Array.from(new Array(4 - lines.length)).map(i => []) ))
    .map(line => line.join(","))
    .join("\n")
    .value();

  return (
    <Box width={140} flexDirection="row">
      <Box width={70} flexDirection="column">
        <Color bold underline>
          Range
        </Color>
        <Text>{`\n${rangeDescription}`}</Text>
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
        <Color bold underline>
          Range
        </Color>
        <Text>{`\n${rangeDescription}`}</Text>
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
    </Box>
  );
}

export default RangeVisualizer