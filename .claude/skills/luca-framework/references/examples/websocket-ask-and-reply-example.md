---
title: "websocket-ask-and-reply"
tags: [websocket, client, server, ask, reply, rpc]
lastTested: null
lastTestPassed: null
---

# websocket-ask-and-reply

Request/response conversations over WebSocket using `ask()` and `reply()`.

## Overview

The WebSocket client and server both support a request/response protocol on top of the normal fire-and-forget message stream. The client can `ask()` the server a question and await the answer. The server can `ask()` a connected client the same way. Under the hood it works with correlation IDs — `requestId` on the request, `replyTo` on the response — but you never have to touch those directly.

## Setup

Declare the shared references that all blocks will use, and wire up the server's message handler. This block is synchronous so the variables persist across subsequent blocks.

```ts
var port = 0
var server = container.server('websocket', { json: true })
var client = null

server.on('message', (data, ws) => {
  if (data.type === 'add') {
    data.reply({ sum: data.data.a + data.data.b })
  } else if (data.type === 'divide') {
    if (data.data.b === 0) {
      data.replyError('division by zero')
    } else {
      data.reply({ result: data.data.a / data.data.b })
    }
  }
})
console.log('Server and handlers configured')
```

## Start Server and Connect Client

```ts
port = await networking.findOpenPort(19900)
await server.start({ port })
console.log('Server listening on port', port)

client = container.client('websocket', { baseURL: `ws://localhost:${port}` })
await client.connect()
console.log('Client connected')
```

## Client Asks the Server

`ask(type, data, timeout?)` sends a message and returns a promise that resolves with the response payload.

```ts
var sum = await client.ask('add', { a: 3, b: 4 })
console.log('3 + 4 =', sum.sum)

var quotient = await client.ask('divide', { a: 10, b: 3 })
console.log('10 / 3 =', quotient.result.toFixed(2))
```

## Handling Errors

When the server calls `replyError(message)`, the client's `ask()` promise rejects with that message.

```ts
try {
  await client.ask('divide', { a: 1, b: 0 })
} catch (err) {
  console.log('Caught error:', err.message)
}
```

## Server Asks the Client

The server can also ask a connected client. The client handles incoming requests by listening for messages with a `requestId` and sending back a `replyTo` response.

```ts
client.on('message', (data) => {
  if (data.requestId && data.type === 'whoAreYou') {
    client.send({ replyTo: data.requestId, data: { name: 'luca-client', version: '1.0' } })
  }
})

var firstClient = [...server.connections][0]
var identity = await server.ask(firstClient, 'whoAreYou')
console.log('Client identified as:', identity.name, identity.version)
```

## Timeouts

If nobody replies, `ask()` rejects after the timeout (default 10s, configurable as the third argument).

```ts
try {
  await client.ask('noop', {}, 500)
} catch (err) {
  console.log('Timed out as expected:', err.message)
}
```

## Regular Messages Still Work

Messages without `requestId` flow through the normal `message` event as always. The ask/reply protocol is purely additive.

```ts
var received = null
server.on('message', (data) => {
  if (data.type === 'ping') received = data
})

await client.send({ type: 'ping', ts: Date.now() })
await new Promise(r => setTimeout(r, 50))
console.log('Regular message received:', received.type, '— no requestId:', received.requestId === undefined)
```

## Cleanup

```ts
await client.disconnect()
await server.stop()
console.log('Done')
```

## Summary

The ask/reply protocol gives you awaitable request/response over WebSocket without leaving the Luca helper API. The client calls `ask(type, data)` and gets back a promise. The server's message handler gets `reply()` and `replyError()` injected on any message that carries a `requestId`. The server can also `ask()` a specific client. Timeouts, error propagation, and cleanup of pending requests on disconnect are all handled automatically.
