---
title: Servers
tags: [servers, express, websocket, start, stop, middleware, static]
---

# Servers

Servers are helpers that listen for connections. Luca provides Express and WebSocket servers out of the box.

## Express Server

### Basic Setup

```typescript
const server = container.server('express', {
  port: 3000,
  cors: true,
})

await server.start()
console.log('Listening on http://localhost:3000')
```

### With Endpoints

The most common pattern is file-based endpoints:

```typescript
const server = container.server('express', { port: 3000, cors: true })

// Auto-discover and mount endpoint files
await server.useEndpoints('./endpoints')

// Generate OpenAPI spec
server.serveOpenAPISpec({
  title: 'My API',
  version: '1.0.0',
  description: 'An awesome API built with Luca',
})

await server.start()
```

### Static Files

```typescript
const server = container.server('express', {
  port: 3000,
  static: './public',  // Serve files from public/ directory
})
```

### Port Auto-Discovery

If the requested port is taken, `configure()` can find an open one:

```typescript
const server = container.server('express', { port: 3000 })
await server.configure()  // Finds port 3000 or next available
await server.start()
console.log(`Listening on port ${server.state.get('port')}`)
```

### Server State

```typescript
// After starting, check server state
await server.start()
server.state.get('listening')  // true
server.state.get('port')       // 3000

// Watch for state changes
server.state.observe((type, key, value) => {
  if (key === 'listening' && value) {
    console.log('Server is now listening')
  }
})
```

### Accessing the Express App

For custom middleware or routes beyond file-based endpoints:

```typescript
const server = container.server('express', { port: 3000 })

// Access the underlying express app
const app = server.app

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

app.get('/custom', (req, res) => {
  res.json({ message: 'Custom route' })
})

await server.start()
```

## WebSocket Server

```typescript
const ws = container.server('websocket', { port: 8080 })

ws.on('connection', (socket) => {
  console.log('Client connected')

  socket.on('message', (data) => {
    console.log('Received:', data)
    socket.send(JSON.stringify({ echo: data }))
  })
})

await ws.start()
```

## Combining Servers

Run HTTP and WebSocket together:

```typescript
const http = container.server('express', { port: 3000 })
const ws = container.server('websocket', { port: 8080 })

await http.useEndpoints('./endpoints')

await Promise.all([
  http.start(),
  ws.start(),
])

console.log('HTTP on :3000, WebSocket on :8080')
```

## Discovering Servers

```typescript
container.servers.available    // ['express', 'websocket']
container.servers.describe('express')
```

## The `luca serve` Command

For most projects, you don't need to set up the server manually. The built-in `luca serve` command does it for you:

```bash
luca serve --port 3000
```

It automatically:
- Finds your `endpoints/` directory
- Mounts all endpoint files
- Serves `public/` as static files
- Generates the OpenAPI spec
- Prints all routes
