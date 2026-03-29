---
title: "networking"
tags: [networking, ports, network, core]
lastTested: null
lastTestPassed: null
---

# networking

Port discovery and availability checking for network services.

## Overview

The `networking` feature is a core feature, auto-enabled on every container. You can access it directly as a global or via `container.feature('networking')`. It provides async methods for finding available ports and checking whether a given port is already in use. Use it before starting servers to avoid port conflicts.

## Finding an Open Port

Use `findOpenPort()` to get the next available port starting from a given number. If the requested port is taken, it searches upward.

```ts
const port = await networking.findOpenPort(3000)
console.log('Available port starting from 3000:', port)
```

If port 3000 is free, you get 3000 back. If not, you get the next one that is.

## Checking Port Availability

Use `isPortOpen()` to check whether a specific port is available without claiming it.

```ts
const is3000Open = await networking.isPortOpen(3000)
console.log('Port 3000 available:', is3000Open)

const is80Open = await networking.isPortOpen(80)
console.log('Port 80 available:', is80Open)
```

Returns `true` if the port is free, `false` if something is already listening on it.

## Finding Multiple Ports

You can call `findOpenPort()` with different starting points to allocate several non-conflicting ports for a multi-service setup.

```ts
const apiPort = await networking.findOpenPort(8080)
const wsPort = await networking.findOpenPort(8090)
const devPort = await networking.findOpenPort(5173)
console.log('API server port:', apiPort)
console.log('WebSocket port:', wsPort)
console.log('Dev server port:', devPort)
```

Each call independently finds the next available port from its starting point.

## Summary

This demo covered finding available ports from a starting number, checking individual port availability, and allocating multiple ports for multi-service architectures. The `networking` feature eliminates port conflicts before they happen.
