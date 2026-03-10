# Runpod (features.runpod)

RunPod feature — manage GPU cloud pods, templates, volumes, and SSH connections via the RunPod REST API. Provides a complete interface for provisioning and managing RunPod GPU instances. Supports creating pods from templates, managing network storage volumes, SSH access via the SecureShell feature, file transfers, and polling for pod readiness.

## Usage

```ts
container.feature('runpod', {
  // RunPod API key (falls back to RUNPOD_API_KEY env var)
  apiKey,
  // Preferred data center ID (default: US-TX-3)
  dataCenterId,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `apiKey` | `string` | RunPod API key (falls back to RUNPOD_API_KEY env var) |
| `dataCenterId` | `string` | Preferred data center ID (default: US-TX-3) |

## Methods

### listTemplates

List available pod templates.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ includePublic?: boolean, includeRunpod?: boolean }` |  | Filter options for templates |

`{ includePublic?: boolean, includeRunpod?: boolean }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `includePublic` | `any` | Include public community templates (default: false) |
| `includeRunpod` | `any` | Include RunPod official templates (default: true) |

**Returns:** `Promise<TemplateInfo[]>`

```ts
const templates = await runpod.listTemplates({ includeRunpod: true })
console.log(templates.map(t => t.name))
```



### getTemplate

Get details for a specific template by ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `templateId` | `string` | ✓ | The template ID to look up |

**Returns:** `Promise<TemplateInfo>`

```ts
const template = await runpod.getTemplate('abc123')
console.log(template.imageName)
```



### createPod

Create a new GPU pod on RunPod.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `CreatePodOptions` | ✓ | Pod configuration options |

`CreatePodOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Pod display name (default: 'luca-pod') |
| `imageName` | `string` | Docker image name to run |
| `gpuTypeId` | `string | string[]` | GPU type ID or array of acceptable GPU types |
| `gpuCount` | `number` | Number of GPUs to allocate (default: 1) |
| `templateId` | `string` | Template ID to use for pod configuration |
| `cloudType` | `'SECURE' | 'COMMUNITY'` | Cloud type: 'SECURE' for dedicated or 'COMMUNITY' for shared (default: 'SECURE') |
| `containerDiskInGb` | `number` | Container disk size in GB (default: 50) |
| `volumeInGb` | `number` | Persistent volume size in GB (default: 20) |
| `volumeMountPath` | `string` | Mount path for the volume (default: '/workspace') |
| `ports` | `string[]` | Port mappings like ['8888/http', '22/tcp'] |
| `env` | `Record<string, string>` | Environment variables to set in the container |
| `interruptible` | `boolean` | Whether the pod can be preempted for spot pricing |
| `networkVolumeId` | `string` | ID of an existing network volume to attach |
| `minRAMPerGPU` | `number` | Minimum RAM per GPU in GB |

**Returns:** `Promise<PodInfo>`

```ts
const pod = await runpod.createPod({
 gpuTypeId: 'NVIDIA RTX 4090',
 templateId: 'abc123',
 volumeInGb: 50,
})
console.log(`Pod ${pod.id} created`)
```



### stopPod

Stop a running pod.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID to stop |

**Returns:** `void`

```ts
await runpod.stopPod('pod-abc123')
```



### startPod

Start a stopped pod.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID to start |

**Returns:** `void`

```ts
await runpod.startPod('pod-abc123')
```



### removePod

Permanently delete a pod.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID to remove |

**Returns:** `void`

```ts
await runpod.removePod('pod-abc123')
```



### getpods

Get all pods via the REST API.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filters` | `{ name?: string; imageName?: string; desiredStatus?: string }` |  | Optional filters for name, image, or status |

`{ name?: string; imageName?: string; desiredStatus?: string }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `any` | Filter by pod name |
| `imageName` | `any` | Filter by Docker image name |
| `desiredStatus` | `any` | Filter by status (RUNNING, EXITED, TERMINATED) |

**Returns:** `Promise<RestPodInfo[]>`

```ts
const pods = await runpod.getpods({ desiredStatus: 'RUNNING' })
console.log(pods.map(p => `${p.name}: ${p.desiredStatus}`))
```



### getPod

Get detailed pod info via the REST API. Returns richer data than the CLI-based `getPodInfo`, including port mappings and public IP.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID to look up |

**Returns:** `Promise<RestPodInfo>`

```ts
const pod = await runpod.getPod('pod-abc123')
console.log(`${pod.name} - ${pod.desiredStatus} - $${pod.costPerHr}/hr`)
```



### waitForPod

Poll until a pod reaches a desired status.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID to monitor |
| `status` | `string` |  | Target status to wait for (default: 'RUNNING') |
| `{ interval = 5000, timeout = 300000 }` | `any` |  | Parameter { interval = 5000, timeout = 300000 } |

**Returns:** `Promise<RestPodInfo>`

```ts
const pod = await runpod.createPod({ gpuTypeId: 'NVIDIA RTX 4090', templateId: 'abc' })
const ready = await runpod.waitForPod(pod.id, 'RUNNING', { timeout: 120000 })
```



### listVolumes

List all network storage volumes on your account.

**Returns:** `Promise<VolumeInfo[]>`

```ts
const volumes = await runpod.listVolumes()
console.log(volumes.map(v => `${v.name}: ${v.size}GB`))
```



### getVolume

Get details for a specific network volume.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `volumeId` | `string` | ✓ | The volume ID to look up |

**Returns:** `Promise<VolumeInfo>`

```ts
const vol = await runpod.getVolume('vol-abc123')
console.log(`${vol.name}: ${vol.size}GB in ${vol.dataCenterId}`)
```



### createVolume

Create a new network storage volume.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `CreateVolumeOptions` | ✓ | Volume configuration |

`CreateVolumeOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display name for the volume |
| `size` | `number` | Size in GB |
| `dataCenterId` | `string` | Data center to create in (defaults to feature's dataCenterId) |

**Returns:** `Promise<VolumeInfo>`

```ts
const vol = await runpod.createVolume({ name: 'my-models', size: 100 })
console.log(`Created volume ${vol.id}`)
```



### removeVolume

Delete a network storage volume.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `volumeId` | `string` | ✓ | The volume ID to delete |

**Returns:** `void`

```ts
await runpod.removeVolume('vol-abc123')
```



### createRemoteShell

Create an SSH connection to a pod using the runpodctl CLI. Prefer `getShell()` which uses the REST API and is more reliable.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID to connect to |

**Returns:** `void`

```ts
const shell = await runpod.createRemoteShell('pod-abc123')
const output = await shell.exec('nvidia-smi')
```



### getShell

Get an SSH connection to a pod using the REST API. Uses port mappings and public IP from the REST API, which is more reliable than the CLI-based `createRemoteShell`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID to connect to |

**Returns:** `void`

```ts
const shell = await runpod.getShell('pod-abc123')
const output = await shell.exec('ls /workspace')
```



### ensureFileExists

Ensure a file exists on a pod's filesystem. If missing, kicks off a background download via a helper script and polls until the file appears.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID |
| `remotePath` | `string` | ✓ | Absolute path on the pod where the file should exist |
| `fallbackUrl` | `string` | ✓ | URL to download from (inside the pod) if the file doesn't exist |
| `options` | `{
			pollInterval?: number
			timeout?: number
			onProgress?: (bytes: number) => void
		}` |  | Parameter options |

`{
			pollInterval?: number
			timeout?: number
			onProgress?: (bytes: number) => void
		}` properties:

| Property | Type | Description |
|----------|------|-------------|
| `pollInterval` | `any` | How often to check in ms (default 5000) |
| `timeout` | `any` | Max time to wait for download in ms (default 600000 / 10 min) |
| `onProgress` | `any` | Called each poll with current file size in bytes |

**Returns:** `Promise<{ existed: boolean; path: string }>`

```ts
await runpod.ensureFileExists(
 podId,
 '/workspace/ComfyUI/models/checkpoints/juggernaut_xl.safetensors',
 'https://civitai.com/api/download/models/456789',
 { onProgress: (bytes) => console.log(`${(bytes / 1e9).toFixed(2)} GB downloaded`) }
)
```



### getPodHttpURLs

Get the public HTTP proxy URLs for a pod's exposed HTTP ports.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID |

**Returns:** `void`

```ts
const urls = await runpod.getPodHttpURLs('pod-abc123')
// ['https://pod-abc123-8888.proxy.runpod.net']
```



### listPods

List all pods using the runpodctl CLI. Parses the tabular output from `runpodctl get pod`. For richer data, use `getpods()`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `detailed` | `any` |  | Reserved for future use |

**Returns:** `Promise<PodInfo[]>`

```ts
const pods = await runpod.listPods()
pods.forEach(p => console.log(`${p.name} (${p.gpu}): ${p.status}`))
```



### getPodInfo

Get pod info using the runpodctl CLI. For richer data including port mappings and public IP, use `getPod()`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `podId` | `string` | ✓ | The pod ID to look up |

**Returns:** `Promise<PodInfo>`

```ts
const info = await runpod.getPodInfo('pod-abc123')
console.log(`${info.name}: ${info.status}`)
```



### listSecureGPUs

List available secure GPU types with pricing. Uses the runpodctl CLI to query available secure cloud GPUs, filtering out reserved instances.

**Returns:** `void`

```ts
const gpus = await runpod.listSecureGPUs()
gpus.forEach(g => console.log(`${g.gpuType}: $${g.ondemandPrice}/hr`))
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `proc` | `any` | The proc feature used for executing CLI commands like runpodctl. |
| `apiKey` | `any` | RunPod API key from options or the RUNPOD_API_KEY environment variable. |
| `dataCenterId` | `any` | Preferred data center ID, defaults to 'US-TX-3'. |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |

## Environment Variables

- `RUNPOD_API_KEY`

## Examples

**features.runpod**

```ts
const runpod = container.feature('runpod', { enable: true })
const pod = await runpod.createPod({ gpuTypeId: 'NVIDIA RTX 4090', templateId: 'abc123' })
const ready = await runpod.waitForPod(pod.id)
const shell = await runpod.getShell(pod.id)
await shell.exec('nvidia-smi')
```



**listTemplates**

```ts
const templates = await runpod.listTemplates({ includeRunpod: true })
console.log(templates.map(t => t.name))
```



**getTemplate**

```ts
const template = await runpod.getTemplate('abc123')
console.log(template.imageName)
```



**createPod**

```ts
const pod = await runpod.createPod({
 gpuTypeId: 'NVIDIA RTX 4090',
 templateId: 'abc123',
 volumeInGb: 50,
})
console.log(`Pod ${pod.id} created`)
```



**stopPod**

```ts
await runpod.stopPod('pod-abc123')
```



**startPod**

```ts
await runpod.startPod('pod-abc123')
```



**removePod**

```ts
await runpod.removePod('pod-abc123')
```



**getpods**

```ts
const pods = await runpod.getpods({ desiredStatus: 'RUNNING' })
console.log(pods.map(p => `${p.name}: ${p.desiredStatus}`))
```



**getPod**

```ts
const pod = await runpod.getPod('pod-abc123')
console.log(`${pod.name} - ${pod.desiredStatus} - $${pod.costPerHr}/hr`)
```



**waitForPod**

```ts
const pod = await runpod.createPod({ gpuTypeId: 'NVIDIA RTX 4090', templateId: 'abc' })
const ready = await runpod.waitForPod(pod.id, 'RUNNING', { timeout: 120000 })
```



**listVolumes**

```ts
const volumes = await runpod.listVolumes()
console.log(volumes.map(v => `${v.name}: ${v.size}GB`))
```



**getVolume**

```ts
const vol = await runpod.getVolume('vol-abc123')
console.log(`${vol.name}: ${vol.size}GB in ${vol.dataCenterId}`)
```



**createVolume**

```ts
const vol = await runpod.createVolume({ name: 'my-models', size: 100 })
console.log(`Created volume ${vol.id}`)
```



**removeVolume**

```ts
await runpod.removeVolume('vol-abc123')
```



**createRemoteShell**

```ts
const shell = await runpod.createRemoteShell('pod-abc123')
const output = await shell.exec('nvidia-smi')
```



**getShell**

```ts
const shell = await runpod.getShell('pod-abc123')
const output = await shell.exec('ls /workspace')
```



**ensureFileExists**

```ts
await runpod.ensureFileExists(
 podId,
 '/workspace/ComfyUI/models/checkpoints/juggernaut_xl.safetensors',
 'https://civitai.com/api/download/models/456789',
 { onProgress: (bytes) => console.log(`${(bytes / 1e9).toFixed(2)} GB downloaded`) }
)
```



**getPodHttpURLs**

```ts
const urls = await runpod.getPodHttpURLs('pod-abc123')
// ['https://pod-abc123-8888.proxy.runpod.net']
```



**listPods**

```ts
const pods = await runpod.listPods()
pods.forEach(p => console.log(`${p.name} (${p.gpu}): ${p.status}`))
```



**getPodInfo**

```ts
const info = await runpod.getPodInfo('pod-abc123')
console.log(`${info.name}: ${info.status}`)
```



**listSecureGPUs**

```ts
const gpus = await runpod.listSecureGPUs()
gpus.forEach(g => console.log(`${g.gpuType}: $${g.ondemandPrice}/hr`))
```

