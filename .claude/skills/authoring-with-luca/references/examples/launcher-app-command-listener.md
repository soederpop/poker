---
title: "Launcher App Command Listener"
tags: [launcherAppCommandListener, ipc, macos, voice, commands]
lastTested: null
lastTestPassed: null
---

# launcherAppCommandListener

IPC transport for receiving commands from the LucaVoiceLauncher macOS app. Listens on a Unix domain socket using NDJSON and wraps incoming commands in a `CommandHandle` for structured acknowledgement, progress, and completion.

## Overview

Use the `launcherAppCommandListener` feature when you need to receive and process commands from the native macOS launcher app (voice commands, hotkeys, or text input). It provides the server side of the IPC protocol: listen for the app to connect, receive command events, and respond with acknowledgements, progress updates, and results.

Requires the LucaVoiceLauncher native macOS app to be running.

## Enabling the Feature

```ts
const listener = container.feature('launcherAppCommandListener', {
  autoListen: false
})
console.log('Command Listener feature created')
console.log('Listening:', listener.isListening)
console.log('Client connected:', listener.isClientConnected)
```

## API Documentation

```ts
const info = await container.features.describe('launcherAppCommandListener')
console.log(info)
```

## Listening for Commands

Start the IPC server and handle incoming commands with the `CommandHandle` API.

```ts skip
const listener = container.feature('launcherAppCommandListener', {
  autoListen: true
})

listener.on('command', async (cmd) => {
  console.log('Received command:', cmd.text)

  cmd.ack('Working on it!')
  // ... process the command ...
  cmd.progress(0.5, 'Halfway there')
  // ... finish processing ...
  cmd.finish({ result: { action: 'completed' }, speech: 'All done!' })
})
```

Each incoming command is wrapped in a `CommandHandle` that provides `ack()`, `progress()`, `finish()`, and `fail()` methods. The native app displays acknowledgements and speaks the `speech` text.

## Command Handle Lifecycle

The `CommandHandle` follows a structured lifecycle: acknowledge, optionally report progress, then finish or fail.

```ts skip
listener.on('command', async (cmd) => {
  // Silent acknowledge
  cmd.ack()

  try {
    // Report progress (0-1 scale)
    cmd.progress(0.25, 'Starting...')
    cmd.progress(0.75, 'Almost done...')

    // Finish with result and optional speech
    cmd.finish({
      result: { data: 'some result' },
      speech: 'Task completed successfully'
    })
  } catch (err) {
    // Report failure with optional speech
    cmd.fail({
      error: err.message,
      speech: 'Sorry, that failed.'
    })
  }
})
```

The native app uses the `speech` field for text-to-speech feedback to the user.

## Connection Events

Monitor the IPC connection state.

```ts skip
listener.on('listening', () => {
  console.log('IPC server listening on:', listener.state.socketPath)
})
listener.on('clientConnected', () => {
  console.log('Launcher app connected')
})
listener.on('clientDisconnected', () => {
  console.log('Launcher app disconnected')
})
```

The `clientConnected` and `clientDisconnected` events fire as the native app connects and disconnects from the socket.

## Sending Messages

Send arbitrary NDJSON messages back to the connected app.

```ts skip
listener.send({ status: 'ready', message: 'Luca is online' })
listener.send({ notification: 'Task queue empty' })
```

Use `send()` for custom protocol messages beyond the standard command lifecycle.

## Summary

The `launcherAppCommandListener` feature provides the IPC server for the LucaVoiceLauncher app. It receives voice, hotkey, and text commands, wrapping each in a `CommandHandle` with structured lifecycle methods (ack, progress, finish, fail). Key methods: `listen()`, `stop()`, `send()`. Key events: `command`, `clientConnected`, `clientDisconnected`.
