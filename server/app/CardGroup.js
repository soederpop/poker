import React from 'react'
import { Box } from 'ink'
import { SYMBOLS, cardToString } from '../cards'
import boxen from 'boxen'
import runtime from '@skypager/node'

const colors = {
  h: 'red',
  d: 'blue',
  c: 'green',
  s: 'yellow',
}

export function CardGroup({ cardStyle = {}, tableStyle = {}, placeholders = 0, bordered = false, label = '', dimmed = false, blanks = 0, box = {}, cards = [] }) {
  const cardLabel = ({ suit, rank, colored, label = cardToString({ suit, rank }) }) =>  {
    let colorFn = colored 
      ? runtime.cli.colors[colors[SYMBOLS[suit]]]
      : runtime.cli.colors.white

    return dimmed ? colorFn.dim(label) : colorFn(label)
  }

  let boxes = blanks > 0
    ? Array.from(new Array(blanks)).map((i) => boxen('Xx', {
      padding: box.padding || 0,
      borderStyle: "single",
      dimBorder: true,
    }))
    : cards.map(({ suit, rank }) => boxen(cardLabel({ suit, rank, colored: true }), {
        padding: 1,
        borderStyle: "doubleSingle",
        borderColor: colors[SYMBOLS[suit]],
        ...dimmed && { dimBorder: true },
        ...box,
        ...cardStyle
      }))
    
  if (placeholders > 0 && boxes.length < placeholders) {
    boxes.push(
      ...Array.from(new Array(placeholders - boxes.length)).map(i =>
        boxen("Xx", {
          padding: box.padding || 1,
          borderStyle: "doubleSingle",
          dimBorder: true
        })
      )
    );
  }

  boxes = boxes.map(line => line.split("\n"))
  const boxHeight = boxes[0].length
  const boxWidth = boxes[0][0].length

  const allLines = Array.from(new Array(boxHeight)).map((_,lineIndex) => {
    const combined = boxes.map(lines => lines[lineIndex]).join("")
    return combined
  })
  
  const content = bordered 
    ? `\n\n${allLines.concat([label]).map(l => `  ${l}  `).join("\n")}\n\n`
    : allLines.concat([label]).map(l => `  ${l}  `).join("\n")

  return (
    <Box height={allLines.length} width={allLines[0].length} flexDirection="row">
      <Box width={boxWidth}>
        {bordered ? boxen(content, { ...tableStyle, borderStyle: "round"}) : content}
      </Box>
    </Box>
  )
}

export default CardGroup