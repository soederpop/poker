# Ink Blocks — Poor Man's MDX

This example demonstrates rendering rich terminal UI inline in a markdown document using ink blocks.

## Blocks

```tsx
const { Box, Text } = ink.components
const React = ink.React

function Greeting({ name, role }) {
  return (
    <Box borderStyle="round" padding={1}>
      <Text color="green" bold>Hello {name}!</Text>
      <Text dimColor> ({role})</Text>
    </Box>
  )
}

function StatusBar({ items }) {
  return (
    <Box flexDirection="row" gap={2}>
      {items.map((item, i) =>
        <Text key={i} color={item.ok ? 'green' : 'red'}>{item.label}</Text>
      )}
    </Box>
  )
}

function DelayedMessage({ message, delay, done }) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
      done()
    }, delay || 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Box>
      <Text dimColor={!visible} color={visible ? 'cyan' : undefined}>
        {visible ? message : 'Loading...'}
      </Text>
    </Box>
  )
}
```

## Report

Let's greet the admin:

```ts
await render('Greeting', { name: 'Jon', role: 'admin' })
```

Now let's check the system status:

```ts
await render('StatusBar', { items: [
  { label: 'API', ok: true },
  { label: 'DB', ok: false },
  { label: 'Cache', ok: true },
]})
```

Now an async block that waits for a timer before rendering:

```ts
await renderAsync('DelayedMessage', { message: 'Data loaded successfully!', delay: 1000 })
```

All done. Blocks rendered inline with the document flow.
