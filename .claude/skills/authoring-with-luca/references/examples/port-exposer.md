---
title: "Port Exposer"
tags: [portExposer, ngrok, networking, tunnel]
lastTested: null
lastTestPassed: null
---

# portExposer

Exposes local HTTP services via ngrok with SSL-enabled public URLs. Useful for development, testing webhooks, and sharing local services with external consumers.

## Overview

The `portExposer` feature creates an ngrok tunnel from a local port to a public HTTPS URL. It supports custom subdomains, regional endpoints, basic auth, and OAuth (features that require a paid ngrok plan). Requires ngrok to be installed or available as a dependency, and optionally an auth token for premium features.

## Enabling the Feature

```ts
const exposer = container.feature('portExposer', {
  port: 3000,
  enable: true
})
console.log('Port Exposer enabled:', exposer.state.get('enabled'))
```

## Exploring the API

```ts
const docs = container.features.describe('portExposer')
console.log(docs)
```

## Checking Connection State

```ts
const exposer = container.feature('portExposer', { port: 3000 })
console.log('Connected:', exposer.isConnected())
```

## Exposing a Port

Create a tunnel and get the public URL.

```ts skip
const url = await exposer.expose()
console.log('Public URL:', url)
console.log('Connected:', exposer.isConnected())
```

The returned URL is an HTTPS endpoint that forwards traffic to `localhost:3000`. The tunnel remains active until `close()` is called or the process exits.

## Getting Connection Info

Retrieve a snapshot of the current tunnel state.

```ts skip
await exposer.expose()
const info = exposer.getConnectionInfo()
console.log('Public URL:', info.publicUrl)
console.log('Local port:', info.localPort)
console.log('Connected at:', info.connectedAt)
```

## Reconnecting with New Options

Close the existing tunnel and re-expose with different settings.

```ts skip
const url1 = await exposer.expose()
console.log('First URL:', url1)

const url2 = await exposer.reconnect({ port: 8080 })
console.log('New URL (port 8080):', url2)
```

The `reconnect` method calls `close()` internally, merges the new options, then calls `expose()` again.

## Closing the Tunnel

```ts skip
await exposer.close()
console.log('Tunnel closed:', !exposer.isConnected())
```

Calling `close()` when no tunnel is active is a safe no-op. The `disable()` method also closes the tunnel before disabling the feature.

## Summary

The `portExposer` feature wraps ngrok to expose local ports as public HTTPS endpoints. It supports connection lifecycle management, reconnection with new options, and event-driven notifications for tunnel state changes. Requires ngrok to be installed.
