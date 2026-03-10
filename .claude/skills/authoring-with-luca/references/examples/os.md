---
title: "os"
tags: [os, system, platform, core]
lastTested: null
lastTestPassed: null
---

# os

Operating system information including platform, architecture, CPU, and network details.

## Overview

The `os` feature is a core feature, auto-enabled on every container. You can access it directly as a global or via `container.feature('os')`. It exposes system metadata through simple getters -- no method calls needed. Use it to detect the runtime environment, adapt behavior per platform, or gather machine info for diagnostics.

## Platform and Architecture

The `platform` and `arch` getters tell you what operating system and CPU architecture the code is running on.

```ts
console.log('Platform:', os.platform)
console.log('Architecture:', os.arch)
```

Platform returns values like `darwin`, `linux`, or `win32`. Architecture returns values like `arm64` or `x64`.

## CPU Information

The `cpuCount` getter reports the number of logical CPU cores available.

```ts
console.log('CPU cores:', os.cpuCount)
```

Use this to size worker pools or decide how many parallel tasks to run.

## System Paths

The `tmpdir` and `homedir` getters return commonly needed system directories.

```ts
console.log('Temp directory:', os.tmpdir)
console.log('Home directory:', os.homedir)
```

These are the OS defaults -- `tmpdir` for throwaway files and `homedir` for the current user's home.

## Hostname

The `hostname` getter returns the machine's network hostname.

```ts
console.log('Hostname:', os.hostname)
```

This can be useful for logging, multi-machine coordination, or display purposes.

## Network Interfaces

The `macAddresses` getter returns MAC addresses for non-internal IPv4 network interfaces.

```ts
const macs = os.macAddresses
console.log('MAC addresses:', macs.length, 'found')
macs.slice(0, 3).forEach(mac => console.log(' ', mac))
```

MAC addresses are useful for machine fingerprinting or license management.

## Summary

This demo covered querying the platform and architecture, checking CPU core count, retrieving system directory paths, reading the hostname, and listing network MAC addresses. The `os` feature gives scripts everything they need to adapt to and report on the runtime environment.
