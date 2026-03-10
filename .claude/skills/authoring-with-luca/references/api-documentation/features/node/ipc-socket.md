# IpcSocket (features.ipcSocket)

IpcSocket Feature - Inter-Process Communication via Unix Domain Sockets This feature provides robust IPC (Inter-Process Communication) capabilities using Unix domain sockets. It supports both server and client modes, allowing processes to communicate efficiently through file system-based socket connections. **Key Features:** - Dual-mode operation: server and client functionality - JSON message serialization/deserialization - Multiple client connection support (server mode) - Event-driven message handling - Automatic socket cleanup and management - Broadcast messaging to all connected clients - Lock file management for socket paths **Communication Pattern:** - Messages are automatically JSON-encoded with unique IDs - Both server and client emit 'message' events for incoming data - Server can broadcast to all connected clients - Client maintains single connection to server **Socket Management:** - Automatic cleanup of stale socket files - Connection tracking and management - Graceful shutdown procedures - Lock file protection against conflicts **Usage Examples:** **Server Mode:** ```typescript const ipc = container.feature('ipcSocket'); await ipc.listen('/tmp/myapp.sock', true); // removeLock=true ipc.on('connection', (socket) => { console.log('Client connected'); }); ipc.on('message', (data) => { console.log('Received:', data); ipc.broadcast({ reply: 'ACK', original: data }); }); ``` **Client Mode:** ```typescript const ipc = container.feature('ipcSocket'); await ipc.connect('/tmp/myapp.sock'); ipc.on('message', (data) => { console.log('Server says:', data); }); await ipc.send({ type: 'request', payload: 'hello' }); ```

## Usage

```ts
container.feature('ipcSocket')
```

## Methods

### listen

Starts the IPC server listening on the specified socket path. This method sets up a Unix domain socket server that can accept multiple client connections. Each connected client is tracked, and the server automatically handles connection lifecycle events. Messages received from clients are JSON-parsed and emitted as 'message' events. **Server Behavior:** - Tracks all connected clients in the sockets Set - Automatically removes clients when they disconnect - JSON-parses incoming messages and emits 'message' events - Emits 'connection' events when clients connect - Prevents starting multiple servers on the same instance **Socket File Management:** - Resolves the socket path relative to the container's working directory - Optionally removes existing socket files to prevent "address in use" errors - Throws error if socket file exists and removeLock is false

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `socketPath` | `string` | ✓ | The file system path for the Unix domain socket |
| `removeLock` | `any` |  | Whether to remove existing socket file (default: false) |

**Returns:** `Promise<Server>`

```ts
// Basic server setup
const server = await ipc.listen('/tmp/myapp.sock');

// With automatic lock removal
const server = await ipc.listen('/tmp/myapp.sock', true);

// Handle connections and messages
ipc.on('connection', (socket) => {
 console.log('New client connected');
});

ipc.on('message', (data) => {
 console.log('Received message:', data);
 // Echo back to all clients
 ipc.broadcast({ echo: data });
});
```



### stopServer

Stops the IPC server and cleans up all connections. This method gracefully shuts down the server by: 1. Closing the server listener 2. Destroying all active client connections 3. Clearing the sockets tracking set 4. Resetting the server instance

**Returns:** `Promise<void>`

```ts
// Graceful shutdown
try {
 await ipc.stopServer();
 console.log('IPC server stopped successfully');
} catch (error) {
 console.error('Failed to stop server:', error.message);
}
```



### broadcast

Broadcasts a message to all connected clients (server mode only). This method sends a JSON-encoded message with a unique ID to every client currently connected to the server. Each message is automatically wrapped with metadata including a UUID for tracking. **Message Format:** Messages are automatically wrapped in the format: ```json { "data": <your_message>, "id": "<uuid>" } ```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `any` | ✓ | The message object to broadcast to all clients |

**Returns:** `void`

```ts
// Broadcast to all connected clients
ipc.broadcast({ 
 type: 'notification',
 message: 'Server is shutting down in 30 seconds',
 timestamp: Date.now()
});

// Chain multiple operations
ipc.broadcast({ status: 'ready' })
  .broadcast({ time: new Date().toISOString() });
```



### send

Sends a message to the server (client mode only). This method sends a JSON-encoded message with a unique ID to the connected server. The message is automatically wrapped with metadata for tracking purposes. **Message Format:** Messages are automatically wrapped in the format: ```json { "data": <your_message>, "id": "<uuid>" } ```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `any` | ✓ | The message object to send to the server |

**Returns:** `void`

```ts
// Send a simple message
await ipc.send({ type: 'ping' });

// Send complex data
await ipc.send({
 type: 'data_update',
 payload: { users: [...], timestamp: Date.now() }
});
```



### connect

Connects to an IPC server at the specified socket path (client mode). This method establishes a client connection to an existing IPC server. Once connected, the client can send messages to the server and receive responses. The connection is maintained until explicitly closed or the server terminates. **Connection Behavior:** - Sets the socket mode to 'client' - Returns existing connection if already connected - Automatically handles connection events and cleanup - JSON-parses incoming messages and emits 'message' events - Cleans up connection reference when socket closes **Error Handling:** - Throws error if already in server mode - Rejects promise on connection failures - Automatically cleans up on connection close

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `socketPath` | `string` | ✓ | The file system path to the server's Unix domain socket |

**Returns:** `Promise<Socket>`

```ts
// Connect to server
const socket = await ipc.connect('/tmp/myapp.sock');
console.log('Connected to IPC server');

// Handle incoming messages
ipc.on('message', (data) => {
 console.log('Server message:', data);
});

// Send messages
await ipc.send({ type: 'hello', client_id: 'client_001' });
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `isClient` | `any` | Checks if the IPC socket is operating in client mode. |
| `isServer` | `any` | Checks if the IPC socket is operating in server mode. |
| `connection` | `any` | Gets the current client connection socket. |

## Events (Zod v4 schema)

### connection

Event emitted by IpcSocket



### message

Event emitted by IpcSocket



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `mode` | `string` | The current mode of the IPC socket - either server or client |

## Examples

**listen**

```ts
// Basic server setup
const server = await ipc.listen('/tmp/myapp.sock');

// With automatic lock removal
const server = await ipc.listen('/tmp/myapp.sock', true);

// Handle connections and messages
ipc.on('connection', (socket) => {
 console.log('New client connected');
});

ipc.on('message', (data) => {
 console.log('Received message:', data);
 // Echo back to all clients
 ipc.broadcast({ echo: data });
});
```



**stopServer**

```ts
// Graceful shutdown
try {
 await ipc.stopServer();
 console.log('IPC server stopped successfully');
} catch (error) {
 console.error('Failed to stop server:', error.message);
}
```



**broadcast**

```ts
// Broadcast to all connected clients
ipc.broadcast({ 
 type: 'notification',
 message: 'Server is shutting down in 30 seconds',
 timestamp: Date.now()
});

// Chain multiple operations
ipc.broadcast({ status: 'ready' })
  .broadcast({ time: new Date().toISOString() });
```



**send**

```ts
// Send a simple message
await ipc.send({ type: 'ping' });

// Send complex data
await ipc.send({
 type: 'data_update',
 payload: { users: [...], timestamp: Date.now() }
});
```



**connect**

```ts
// Connect to server
const socket = await ipc.connect('/tmp/myapp.sock');
console.log('Connected to IPC server');

// Handle incoming messages
ipc.on('message', (data) => {
 console.log('Server message:', data);
});

// Send messages
await ipc.send({ type: 'hello', client_id: 'client_001' });
```

