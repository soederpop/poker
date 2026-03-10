---
title: "Window Manager"
tags: [windowManager, native, ipc, macos, browser, window]
lastTested: null
lastTestPassed: null
---

# windowManager

Native window control via LucaVoiceLauncher IPC. Communicates with the macOS launcher app over a Unix domain socket using NDJSON to spawn, navigate, screenshot, and manage native browser windows.

## Overview

Use the `windowManager` feature when you need to control native browser windows from Luca. It acts as an IPC server that the LucaVoiceLauncher macOS app connects to. Through this connection you can spawn windows with configurable chrome, navigate URLs, evaluate JavaScript, capture screenshots, and record video.

Requires the LucaVoiceLauncher native macOS app to be running and connected.

## Enabling the Feature

```ts
const wm = container.feature('windowManager', {
  autoListen: false,
  requestTimeoutMs: 10000
})
console.log('Window Manager feature created')
console.log('Listening:', wm.isListening)
console.log('Client connected:', wm.isClientConnected)
```

## API Documentation

```ts
const info = await container.features.describe('windowManager')
console.log(info)
```

## Spawning Windows

Create native browser windows with configurable dimensions and chrome.

```ts skip
const result = await wm.spawn({
  url: 'https://google.com',
  width: 1024,
  height: 768,
  alwaysOnTop: true,
  window: { decorations: 'hiddenTitleBar', shadow: true }
})
console.log('Window ID:', result.windowId)
```

The `spawn()` method sends a dispatch to the native app and waits for acknowledgement. Window options include position, size, transparency, click-through, and title bar style.

## Navigation and JavaScript Evaluation

Control window content after spawning.

```ts skip
const handle = wm.window(result.windowId)
await handle.navigate('https://news.ycombinator.com')
console.log('Navigated')

const title = await handle.eval('document.title')
console.log('Page title:', title)

await handle.focus()
await handle.close()
```

The `window()` method returns a `WindowHandle` for chainable operations on a specific window. Use `eval()` to run JavaScript in the window's web view.

## Screenshots and Video

Capture visual output from windows.

```ts skip
await wm.screengrab({
  windowId: result.windowId,
  path: './screenshot.png'
})
console.log('Screenshot saved')

await wm.video({
  windowId: result.windowId,
  path: './recording.mp4',
  durationMs: 5000
})
console.log('Video recorded')
```

Screenshots are saved as PNG. Video recording captures for the specified duration.

## Terminal Windows

Spawn native terminal windows that render command output with ANSI support.

```ts skip
const tty = await wm.spawnTTY({
  command: 'htop',
  title: 'System Monitor',
  width: 900,
  height: 600,
  cols: 120,
  rows: 40
})
console.log('TTY window:', tty.windowId)
```

Terminal windows are read-only displays of process output. Closing the window terminates the process.

## IPC Communication

Other features can send arbitrary messages over the socket connection.

```ts skip
wm.listen()
wm.on('message', (msg) => console.log('App says:', msg))
wm.send({ id: 'abc', status: 'ready', speech: 'Window manager online' })
```

The `message` event fires for any non-windowAck message from the native app.

## Summary

The `windowManager` feature provides native window control through IPC with the LucaVoiceLauncher app. Spawn browser windows, navigate, evaluate JS, capture screenshots, and record video. Supports terminal windows for command output. Key methods: `spawn()`, `navigate()`, `eval()`, `screengrab()`, `video()`, `spawnTTY()`, `window()`.
