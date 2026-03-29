---
title: "IPC Socket"
tags: [ipcSocket, ipc, unix-socket, messaging]
lastTested: null
lastTestPassed: null
---

# ipcSocket

Inter-process communication via Unix domain sockets. Supports both server and client modes with JSON message serialization, broadcast messaging, and event-driven message handling.

## Overview

The `ipcSocket` feature enables processes to communicate through file-system-based Unix domain sockets. A server listens on a socket path and accepts multiple client connections. Messages are automatically JSON-encoded with unique IDs. Both server and client emit `message` events for incoming data. Because IPC requires coordinating two processes (server and client), all socket operation examples use skip blocks.

## Enabling the Feature

```ts
const ipc = container.feature('ipcSocket', { enable: true })
console.log('IPC Socket enabled:', ipc.state.get('enabled'))
console.log('Current mode:', ipc.state.get('mode'))
```

## Exploring the API

```ts
const docs = container.features.describe('ipcSocket')
console.log(docs)
```

## Checking Mode

```ts
const ipc = container.feature('ipcSocket')
console.log('Is server:', ipc.isServer)
console.log('Is client:', ipc.isClient)
```

## Starting a Server

Listen on a Unix domain socket and handle incoming connections.

```ts skip
const server = await ipc.listen('/tmp/myapp.sock', true)
console.log('Server listening')

ipc.on('connection', (socket) => {
  console.log('Client connected')
})

ipc.on('message', (data) => {
  console.log('Received:', data)
  ipc.broadcast({ reply: 'ACK', original: data })
})
```

The second argument `true` removes any stale socket file before binding. Without it, the call throws if the socket file already exists.

## Connecting a Client

Connect to an existing server and exchange messages.

```ts skip
const socket = await ipc.connect('/tmp/myapp.sock')
console.log('Connected to server')

ipc.on('message', (data) => {
  console.log('Server says:', data)
})

ipc.send({ type: 'hello', clientId: 'worker-1' })
```

Messages sent via `ipc.send()` are automatically wrapped with a unique ID for tracking. The server receives the original data in the `message` event.

## Broadcasting Messages

Send a message to all connected clients from the server.

```ts skip
ipc.broadcast({
  type: 'notification',
  message: 'Deployment starting',
  timestamp: Date.now()
})
```

Each connected client receives the broadcast as a `message` event. Messages are JSON-encoded with a UUID for correlation.

## Stopping the Server

Gracefully shut down the server and disconnect all clients.

```ts skip
await ipc.stopServer()
console.log('Server stopped')
```

The `stopServer` method closes the listener, destroys all active client connections, and resets internal state.

## Summary

The `ipcSocket` feature provides Unix domain socket IPC with JSON message serialization, multi-client support, broadcast messaging, and automatic socket cleanup. It works in either server or client mode within a single feature instance.
