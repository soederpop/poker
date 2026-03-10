---
title: Using Clients
tags: [clients, rest, graphql, websocket, http, api, axios]
---

# Using Clients

Clients connect your application to external services. Luca provides built-in clients for REST APIs, GraphQL, and WebSocket connections.

## REST Client

The REST client wraps axios with Luca's helper patterns (state, events, introspection):

```typescript
const api = container.client('rest', {
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer my-token',
  },
})

await api.connect()

// Standard HTTP methods
const users = await api.get('/users')
const user = await api.get('/users/123')
const created = await api.post('/users', { name: 'Alice', email: 'alice@example.com' })
const updated = await api.put('/users/123', { name: 'Alice Updated' })
await api.delete('/users/123')
```

### REST Client Events

```typescript
api.on('failure', (error) => {
  console.error('Request failed:', error.message)
})

// State changes track connection status
api.state.observe((type, key, value) => {
  if (key === 'connected') {
    console.log(`Client connected: ${value}`)
  }
})
```

## GraphQL Client

For GraphQL APIs, use the REST client's `post()` method to send queries and mutations:

```typescript
const graph = container.client('rest', {
  baseURL: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer my-token' },
})

await graph.connect()

// Send a query
const result = await graph.post('/', {
  query: `
    query GetUser($id: ID!) {
      user(id: $id) {
        name
        email
        posts { title }
      }
    }
  `,
  variables: { id: '123' },
})

// Send a mutation
const mutationResult = await graph.post('/', {
  query: `
    mutation CreatePost($input: PostInput!) {
      createPost(input: $input) {
        id
        title
      }
    }
  `,
  variables: { input: { title: 'Hello World', body: '...' } },
})
```

## WebSocket Client

The WebSocket client wraps a raw `WebSocket` connection:

```typescript
const ws = container.client('websocket', {
  baseURL: 'wss://realtime.example.com',
})

await ws.connect()

// Access the underlying WebSocket via ws.ws
ws.ws.onmessage = (event) => {
  console.log('Received:', event.data)
}

ws.ws.send(JSON.stringify({ type: 'subscribe', channel: 'updates' }))

// Clean up
ws.ws.close()
```

## Discovering Clients

```typescript
container.clients.available   // ['rest', 'graph', 'websocket']
container.clients.describe('rest')
```

## Using Clients in Endpoints

```typescript
// endpoints/proxy.ts
import { z } from 'zod'
import type { EndpointContext } from '@soederpop/luca'

export const path = '/api/external-data'

export const getSchema = z.object({
  query: z.string().describe('Search query'),
})

export async function get(params: z.infer<typeof getSchema>, ctx: EndpointContext) {
  const api = ctx.container.client('rest', {
    baseURL: 'https://external-api.com',
  })

  await api.connect()
  const data = await api.get(`/search?q=${encodeURIComponent(params.query)}`)

  return { results: data }
}
```

## Using Clients in Features

```typescript
class WeatherService extends Feature<WeatherState, WeatherOptions> {
  private api: any

  async initialize() {
    this.api = this.container.client('rest', {
      baseURL: 'https://api.weather.com',
      headers: { 'X-API-Key': this.options.apiKey },
    })
    await this.api.connect()
  }

  async getForecast(city: string) {
    const data = await this.api.get(`/forecast/${encodeURIComponent(city)}`)
    this.state.set('lastForecast', data)
    this.emit('forecastFetched', data)
    return data
  }
}
```
