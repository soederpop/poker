---
title: "Secure Shell"
tags: [secureShell, ssh, scp, remote, deployment]
lastTested: null
lastTestPassed: null
---

# secureShell

SSH command execution and SCP file transfers. Uses the system `ssh` and `scp` binaries to run commands on remote hosts and transfer files securely.

## Overview

The `secureShell` feature provides an SSH client for executing commands on remote machines and transferring files via SCP. It supports both key-based and password-based authentication. All operations require a reachable SSH target host, so the actual connection and command examples use skip blocks.

## Enabling the Feature

```ts
const ssh = container.feature('secureShell', {
  host: 'example.com',
  username: 'deploy',
  key: '~/.ssh/id_ed25519',
  enable: true
})
console.log('SSH enabled:', ssh.state.get('enabled'))
```

## Exploring the API

```ts
const docs = container.features.describe('secureShell')
console.log(docs)
```

## Feature Options

```ts
const ssh = container.feature('secureShell', {
  host: '192.168.1.100',
  port: 22,
  username: 'admin',
  key: '~/.ssh/id_rsa'
})
console.log('Host configured:', ssh.options.host)
console.log('Port:', ssh.options.port || 22)
```

## Testing the Connection

Verify that the SSH target is reachable before running commands.

```ts skip
const ok = await ssh.testConnection()
console.log('Connection OK:', ok)
console.log('State connected:', ssh.state.get('connected'))
```

The `testConnection` method runs a simple echo command on the remote host. If it succeeds, `state.connected` is set to `true`.

## Executing a Remote Command

Run a shell command on the remote host and capture its output.

```ts skip
const uptime = await ssh.exec('uptime')
console.log('Remote uptime:', uptime)

const listing = await ssh.exec('ls -la /var/log')
console.log(listing)
```

The `exec` method returns the command's stdout as a string. It uses the configured host, username, and authentication credentials.

## Uploading and Downloading Files

Transfer files between the local machine and the remote host using SCP.

```ts skip
await ssh.upload('./build/app.tar.gz', '/opt/releases/app.tar.gz')
console.log('Upload complete')
```

```ts skip
await ssh.download('/var/log/app.log', './logs/app.log')
console.log('Download complete')
```

Both methods use the same authentication credentials configured on the feature instance. Paths on the remote side are absolute or relative to the user's home directory.

## Summary

The `secureShell` feature wraps the system `ssh` and `scp` commands to provide remote command execution and file transfers. It supports key-based and password-based authentication, connection testing, and maintains connection state on the feature instance.
