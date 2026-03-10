# Feature Registry

## Blocks

```tsx
const { Box, Text } = ink.components
const React = ink.React

function Table({ rows, columns }) {
  const colWidth = Math.floor(70 / columns)

  const chunked = []
  for (let i = 0; i < rows.length; i += columns) {
    chunked.push(rows.slice(i, i + columns))
  }

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" paddingX={1}>
        <Text bold color="cyan">Available Features</Text>
      </Box>
      {chunked.map((row, ri) => (
        <Box key={ri} flexDirection="row">
          {row.map((item, ci) => (
            <Box key={ci} width={colWidth} paddingX={1}>
              <Text color="green">{item}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}
```

## Features

```ts
const features = container.features.available
await render('Table', { rows: features, columns: 3 })
```
