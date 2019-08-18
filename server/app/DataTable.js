import React from 'react'
import { Text, Color, Box } from 'ink'

export function DataTable(props = {}) {
  const { headers = [], rows = [] } = props
  
  const rowContent = rows.map((row,rowIndex) => 
    <Box flexDirection="row" key={`row-${rowIndex}`}>
      {row.map((value, cellIndex) => <Box key={`cell-${cellIndex}`}>{value}</Box>)}  
    </Box>
  ) 

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        {headers.map((value, cellIndex) => <Box key={`cell-${cellIndex}`}>{value}</Box>)}  
      </Box>
      {rowContent}
    </Box>
  )
}

export default DataTable