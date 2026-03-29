---
title: "Process Manager"
tags: [processManager, processes, spawn, lifecycle]
lastTested: null
lastTestPassed: null
---

# processManager

Manage long-running child processes with tracking, events, and automatic cleanup.

## Overview

The `processManager` feature is an on-demand feature for spawning and supervising child processes. Unlike `proc.spawn` which blocks until a process exits, processManager returns a `SpawnHandler` immediately -- a handle object with its own state, events, and lifecycle methods. The feature tracks all spawned processes and can kill them all on parent exit. Use it when you need to orchestrate multiple background services, dev servers, or worker processes.

## Enabling the Feature

Enable the processManager with auto-cleanup so tracked processes are killed when the parent exits.

```ts
const pm = container.feature('processManager', { enable: true, autoCleanup: true })
console.log('ProcessManager enabled:', pm.state.enabled)
console.log('Total spawned so far:', pm.state.totalSpawned)
```

## Spawning a Process

Spawn a short-lived process and capture its output. The `spawn` method returns a `SpawnHandler` immediately.

```ts
const handle = pm.spawn('echo', ['hello from process manager'], { tag: 'greeter' })
console.log('Spawned process tag:', 'greeter')
console.log('Handle has kill method:', typeof handle.kill === 'function')
```

The handle provides methods like `kill()` and events like `stdout`, `stderr`, `exited`, and `crashed`.

## Listing Tracked Processes

The processManager keeps track of every process it has spawned, whether running or finished.

```ts
const all = pm.list()
console.log('Tracked processes:', all.length)
console.log('Total spawned:', pm.state.totalSpawned)
```

You can also look up a specific process by its tag.

```ts
const found = pm.getByTag('greeter')
console.log('Found by tag:', found ? 'yes' : 'no')
```

## Spawning and Killing

You can spawn a longer process and then kill it. Here we spawn `sleep` and immediately terminate it.

```ts
const sleeper = pm.spawn('sleep', ['10'], { tag: 'sleeper' })
console.log('Sleeper spawned')
sleeper.kill()
console.log('Sleeper killed')
console.log('Total spawned now:', pm.state.totalSpawned)
```

## Cleaning Up

The `killAll` method terminates every tracked process, and `stop` does a full teardown including removing exit handlers.

```ts
pm.killAll()
const remaining = pm.list().filter(h => h.state?.status === 'running')
console.log('Running after killAll:', remaining.length)
```

## Summary

This demo covered the `processManager` feature: spawning processes that return handles immediately, tracking them by ID or tag, listing all tracked processes, and killing them individually or all at once. It is the right tool for orchestrating background services, dev servers, and any scenario where you need non-blocking process management with lifecycle events.
