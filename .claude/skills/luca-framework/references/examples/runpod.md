---
title: "RunPod GPU Cloud"
tags: [runpod, gpu, cloud, pods, ssh, infrastructure]
lastTested: null
lastTestPassed: null
---

# runpod

GPU cloud pod management via the RunPod REST API and CLI. Provision GPU instances, manage network volumes, SSH into pods, and transfer files.

## Overview

Use the `runpod` feature when you need to manage GPU cloud infrastructure. It provides a complete interface for creating and managing RunPod GPU pods, including template selection, volume management, SSH access, file transfers, and lifecycle operations (start, stop, remove). Integrates with the `secureShell` feature for remote command execution.

Requires a `RUNPOD_API_KEY` environment variable or an `apiKey` option.

## Enabling the Feature

```ts
const runpod = container.feature('runpod', {
  dataCenterId: 'US-TX-3'
})
console.log('RunPod feature created')
console.log('Data center:', runpod.dataCenterId)
console.log('API key configured:', !!runpod.apiKey)
```

## API Documentation

```ts
const info = await container.features.describe('runpod')
console.log(info)
```

## Listing Pods and GPUs

Query your existing pods and available GPU types.

```ts skip
const pods = await runpod.getpods()
pods.forEach(p => console.log(`${p.name}: ${p.desiredStatus} - $${p.costPerHr}/hr`))

const gpus = await runpod.listSecureGPUs()
gpus.forEach(g => console.log(`${g.gpuType}: $${g.ondemandPrice}/hr`))
```

Use `getpods()` for detailed REST API data including port mappings and public IP, or `listPods()` for a quick summary via the CLI.

## Creating and Managing Pods

Provision a new GPU pod and manage its lifecycle.

```ts skip
const pod = await runpod.createPod({
  name: 'my-training-pod',
  gpuTypeId: 'NVIDIA RTX 4090',
  templateId: 'abc123',
  volumeInGb: 50,
  containerDiskInGb: 50,
  ports: ['8888/http', '22/tcp']
})
console.log(`Pod ${pod.id} created`)

const ready = await runpod.waitForPod(pod.id, 'RUNNING', { timeout: 120000 })
console.log('Pod is running:', ready.desiredStatus)
```

After creation, use `waitForPod()` to poll until the pod reaches the desired status.

## Pod Lifecycle

```ts skip
await runpod.stopPod('pod-abc123')
console.log('Pod stopped')

await runpod.startPod('pod-abc123')
console.log('Pod restarted')

await runpod.removePod('pod-abc123')
console.log('Pod permanently deleted')
```

Stopping a pod preserves its disk; removing it is permanent.

## SSH and Remote Execution

Connect to a running pod and execute commands remotely.

```ts skip
const shell = await runpod.getShell('pod-abc123')
const output = await shell.exec('nvidia-smi')
console.log(output)

const ls = await shell.exec('ls /workspace')
console.log('Workspace files:', ls)
```

The `getShell()` method uses REST API data for reliable SSH connections. Use it over `createRemoteShell()` which depends on the CLI.

## Network Volumes

Manage persistent storage that survives pod restarts.

```ts skip
const vol = await runpod.createVolume({ name: 'my-models', size: 100 })
console.log(`Created volume ${vol.id}`)

const volumes = await runpod.listVolumes()
volumes.forEach(v => console.log(`${v.name}: ${v.size}GB`))

await runpod.removeVolume('vol-abc123')
```

Attach network volumes to pods via the `networkVolumeId` option in `createPod()`.

## Summary

The `runpod` feature provides complete GPU cloud management. Create pods from templates, manage lifecycle (start/stop/remove), SSH into running pods, and manage network storage volumes. Supports polling for readiness and file transfer operations. Key methods: `createPod()`, `getpods()`, `waitForPod()`, `getShell()`, `listVolumes()`, `createVolume()`.
