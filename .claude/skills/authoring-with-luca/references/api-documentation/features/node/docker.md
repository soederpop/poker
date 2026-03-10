# Docker (features.docker)

Docker CLI interface feature for managing containers, images, and executing Docker commands. Provides comprehensive Docker operations including: - Container management (list, start, stop, create, remove) - Image management (list, pull, build, remove) - Command execution inside containers - Docker system information

## Usage

```ts
container.feature('docker', {
  // Path to docker executable
  dockerPath,
  // Command timeout in milliseconds
  timeout,
  // Auto refresh containers/images after operations
  autoRefresh,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `dockerPath` | `string` | Path to docker executable |
| `timeout` | `number` | Command timeout in milliseconds |
| `autoRefresh` | `boolean` | Auto refresh containers/images after operations |

## Methods

### checkDockerAvailability

Check if Docker is available and working.

**Returns:** `Promise<boolean>`

```ts
const available = await docker.checkDockerAvailability()
if (!available) console.log('Docker is not installed or not running')
```



### listContainers

List all containers (running and stopped).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{ all?: boolean }` |  | Listing options |

`{ all?: boolean }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `all` | `any` | Include stopped containers (default: false) |

**Returns:** `Promise<DockerContainer[]>`

```ts
const running = await docker.listContainers()
const all = await docker.listContainers({ all: true })
```



### listImages

List all images available locally.

**Returns:** `Promise<DockerImage[]>`

```ts
const images = await docker.listImages()
console.log(images.map(i => `${i.repository}:${i.tag}`))
```



### startContainer

Start a stopped container.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerIdOrName` | `string` | ✓ | Container ID or name to start |

**Returns:** `Promise<void>`

```ts
await docker.startContainer('my-app')
```



### stopContainer

Stop a running container.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerIdOrName` | `string` | ✓ | Container ID or name to stop |
| `timeout` | `number` |  | Seconds to wait before killing the container |

**Returns:** `Promise<void>`

```ts
await docker.stopContainer('my-app')
await docker.stopContainer('my-app', 30) // wait up to 30s
```



### removeContainer

Remove a container.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerIdOrName` | `string` | ✓ | Container ID or name to remove |
| `options` | `{ force?: boolean }` |  | Removal options |

`{ force?: boolean }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `force` | `any` | Force removal of a running container |

**Returns:** `Promise<void>`

```ts
await docker.removeContainer('old-container')
await docker.removeContainer('stubborn-container', { force: true })
```



### runContainer

Create and run a new container from the given image.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `image` | `string` | ✓ | Docker image to run (e.g. 'nginx:latest') |
| `options` | `{
      /** Assign a name to the container */
      name?: string
      /** Port mappings in 'host:container' format */
      ports?: string[]
      /** Volume mounts in 'host:container' format */
      volumes?: string[]
      /** Environment variables as key-value pairs */
      environment?: Record<string, string>
      /** Run the container in the background */
      detach?: boolean
      /** Keep STDIN open */
      interactive?: boolean
      /** Allocate a pseudo-TTY */
      tty?: boolean
      /** Command and arguments to run inside the container */
      command?: string[]
      /** Working directory inside the container */
      workdir?: string
      /** Username or UID to run as */
      user?: string
      /** Override the default entrypoint */
      entrypoint?: string
      /** Connect the container to a network */
      network?: string
      /** Restart policy (e.g. 'always', 'on-failure') */
      restart?: string
    }` |  | Container run options |

`{
      /** Assign a name to the container */
      name?: string
      /** Port mappings in 'host:container' format */
      ports?: string[]
      /** Volume mounts in 'host:container' format */
      volumes?: string[]
      /** Environment variables as key-value pairs */
      environment?: Record<string, string>
      /** Run the container in the background */
      detach?: boolean
      /** Keep STDIN open */
      interactive?: boolean
      /** Allocate a pseudo-TTY */
      tty?: boolean
      /** Command and arguments to run inside the container */
      command?: string[]
      /** Working directory inside the container */
      workdir?: string
      /** Username or UID to run as */
      user?: string
      /** Override the default entrypoint */
      entrypoint?: string
      /** Connect the container to a network */
      network?: string
      /** Restart policy (e.g. 'always', 'on-failure') */
      restart?: string
    }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `any` | Assign a name to the container |
| `ports` | `any` | Port mappings in 'host:container' format (e.g. ['8080:80']) |
| `volumes` | `any` | Volume mounts in 'host:container' format (e.g. ['./data:/app/data']) |
| `environment` | `any` | Environment variables as key-value pairs |
| `detach` | `any` | Run the container in the background |
| `interactive` | `any` | Keep STDIN open |
| `tty` | `any` | Allocate a pseudo-TTY |
| `command` | `any` | Command and arguments to run inside the container |
| `workdir` | `any` | Working directory inside the container |
| `user` | `any` | Username or UID to run as |
| `entrypoint` | `any` | Override the default entrypoint |
| `network` | `any` | Connect the container to a network |
| `restart` | `any` | Restart policy (e.g. 'always', 'on-failure') |

**Returns:** `Promise<string>`

```ts
const containerId = await docker.runContainer('nginx:latest', {
 name: 'web',
 ports: ['8080:80'],
 detach: true,
 environment: { NODE_ENV: 'production' }
})
```



### execCommand

Execute a command inside a running container. When volumes are specified, uses `docker run --rm` with the container's image instead of `docker exec`, since exec does not support volume mounts.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerIdOrName` | `string` | ✓ | Container ID or name to execute in |
| `command` | `string[]` | ✓ | Command and arguments array (e.g. ['ls', '-la']) |
| `options` | `{
      /** Keep STDIN open */
      interactive?: boolean
      /** Allocate a pseudo-TTY */
      tty?: boolean
      /** Username or UID to run as */
      user?: string
      /** Working directory inside the container */
      workdir?: string
      /** Run the command in the background */
      detach?: boolean
      /** Environment variables as key-value pairs */
      environment?: Record<string, string>
      /** Volume mounts; triggers a docker run --rm fallback */
      volumes?: string[]
    }` |  | Execution options |

`{
      /** Keep STDIN open */
      interactive?: boolean
      /** Allocate a pseudo-TTY */
      tty?: boolean
      /** Username or UID to run as */
      user?: string
      /** Working directory inside the container */
      workdir?: string
      /** Run the command in the background */
      detach?: boolean
      /** Environment variables as key-value pairs */
      environment?: Record<string, string>
      /** Volume mounts; triggers a docker run --rm fallback */
      volumes?: string[]
    }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `interactive` | `any` | Keep STDIN open |
| `tty` | `any` | Allocate a pseudo-TTY |
| `user` | `any` | Username or UID to run as |
| `workdir` | `any` | Working directory inside the container |
| `detach` | `any` | Run the command in the background |
| `environment` | `any` | Environment variables as key-value pairs |
| `volumes` | `any` | Volume mounts; triggers a docker run --rm fallback |

**Returns:** `Promise<{ stdout: string; stderr: string; exitCode: number }>`

```ts
const result = await docker.execCommand('my-app', ['ls', '-la', '/app'])
console.log(result.stdout)
```



### createShell

Create a shell-like wrapper for executing multiple commands against a container. When volume mounts are specified, a new long-running container is created from the same image with the mounts applied (since docker exec does not support volumes). Call `destroy()` when finished to clean up the helper container. Returns an object with: - `run(command)` — execute a shell command string via `sh -c` - `last` — getter for the most recent command result - `destroy()` — stop the helper container (no-op when no volumes were needed)

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerIdOrName` | `string` | ✓ | Parameter containerIdOrName |
| `options` | `{
      volumes?: string[]
      workdir?: string
      user?: string
      environment?: Record<string, string>
    }` |  | Parameter options |

**Returns:** `Promise<DockerShell>`



### pullImage

Pull an image from a registry.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `image` | `string` | ✓ | Full image reference (e.g. 'nginx:latest', 'ghcr.io/org/repo:tag') |

**Returns:** `Promise<void>`

```ts
await docker.pullImage('node:20-alpine')
```



### removeImage

Remove an image from the local store.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `imageIdOrName` | `string` | ✓ | Image ID, repository, or repository:tag to remove |
| `options` | `{ force?: boolean }` |  | Removal options |

`{ force?: boolean }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `force` | `any` | Force removal even if the image is in use |

**Returns:** `Promise<void>`

```ts
await docker.removeImage('nginx:latest')
await docker.removeImage('old-image', { force: true })
```



### buildImage

Build an image from a Dockerfile.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `contextPath` | `string` | ✓ | Path to the build context directory |
| `options` | `{
      /** Tag the resulting image (e.g. 'my-app:latest') */
      tag?: string
      /** Path to an alternate Dockerfile */
      dockerfile?: string
      /** Build-time variables as key-value pairs */
      buildArgs?: Record<string, string>
      /** Target build stage in a multi-stage Dockerfile */
      target?: string
      /** Do not use cache when building the image */
      nocache?: boolean
    }` |  | Build options |

`{
      /** Tag the resulting image (e.g. 'my-app:latest') */
      tag?: string
      /** Path to an alternate Dockerfile */
      dockerfile?: string
      /** Build-time variables as key-value pairs */
      buildArgs?: Record<string, string>
      /** Target build stage in a multi-stage Dockerfile */
      target?: string
      /** Do not use cache when building the image */
      nocache?: boolean
    }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `tag` | `any` | Tag the resulting image (e.g. 'my-app:latest') |
| `dockerfile` | `any` | Path to an alternate Dockerfile |
| `buildArgs` | `any` | Build-time variables as key-value pairs |
| `target` | `any` | Target build stage in a multi-stage Dockerfile |
| `nocache` | `any` | Do not use cache when building the image |

**Returns:** `Promise<void>`

```ts
await docker.buildImage('./project', {
 tag: 'my-app:latest',
 buildArgs: { NODE_ENV: 'production' }
})
```



### getLogs

Get container logs.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerIdOrName` | `string` | ✓ | Container ID or name to fetch logs from |
| `options` | `{
      /** Follow log output (stream) */
      follow?: boolean
      /** Number of lines to show from the end of the logs */
      tail?: number
      /** Show logs since a timestamp or relative time */
      since?: string
      /** Prepend a timestamp to each log line */
      timestamps?: boolean
    }` |  | Log retrieval options |

`{
      /** Follow log output (stream) */
      follow?: boolean
      /** Number of lines to show from the end of the logs */
      tail?: number
      /** Show logs since a timestamp or relative time */
      since?: string
      /** Prepend a timestamp to each log line */
      timestamps?: boolean
    }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `follow` | `any` | Follow log output (stream) |
| `tail` | `any` | Number of lines to show from the end of the logs |
| `since` | `any` | Show logs since a timestamp or relative time (e.g. '10m', '2024-01-01T00:00:00') |
| `timestamps` | `any` | Prepend a timestamp to each log line |

**Returns:** `Promise<string>`

```ts
const logs = await docker.getLogs('my-app', { tail: 100, timestamps: true })
console.log(logs)
```



### getSystemInfo

Get Docker system information (engine version, storage driver, OS, etc.).

**Returns:** `Promise<any>`

```ts
const info = await docker.getSystemInfo()
console.log(info.ServerVersion)
```



### prune

Prune unused Docker resources. When no specific resource type is selected, falls back to `docker system prune`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{
    /** Prune stopped containers */
    containers?: boolean
    /** Prune dangling images */
    images?: boolean
    /** Prune unused volumes */
    volumes?: boolean
    /** Prune unused networks */
    networks?: boolean
    /** Prune all resource types */
    all?: boolean
    /** Skip confirmation prompts for image pruning */
    force?: boolean
  }` |  | Pruning options |

`{
    /** Prune stopped containers */
    containers?: boolean
    /** Prune dangling images */
    images?: boolean
    /** Prune unused volumes */
    volumes?: boolean
    /** Prune unused networks */
    networks?: boolean
    /** Prune all resource types */
    all?: boolean
    /** Skip confirmation prompts for image pruning */
    force?: boolean
  }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `containers` | `any` | Prune stopped containers |
| `images` | `any` | Prune dangling images |
| `volumes` | `any` | Prune unused volumes |
| `networks` | `any` | Prune unused networks |
| `all` | `any` | Prune all resource types (containers, images, volumes, networks) |
| `force` | `any` | Skip confirmation prompts for image pruning |

**Returns:** `Promise<void>`

```ts
await docker.prune({ all: true })
await docker.prune({ containers: true, images: true })
```



### enable

Initialize the Docker feature by checking availability and optionally refreshing state.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `any` |  | Enable options passed to the base Feature |

**Returns:** `Promise<this>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `proc` | `any` | Get the proc feature for executing shell commands |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `containers` | `array` | List of known Docker containers |
| `images` | `array` | List of known Docker images |
| `isDockerAvailable` | `boolean` | Whether Docker CLI is available on this system |
| `lastError` | `string` | Last error message from a Docker operation |

## Examples

**features.docker**

```ts
const docker = container.feature('docker', { enable: true })
await docker.checkDockerAvailability()
const containers = await docker.listContainers({ all: true })
```



**checkDockerAvailability**

```ts
const available = await docker.checkDockerAvailability()
if (!available) console.log('Docker is not installed or not running')
```



**listContainers**

```ts
const running = await docker.listContainers()
const all = await docker.listContainers({ all: true })
```



**listImages**

```ts
const images = await docker.listImages()
console.log(images.map(i => `${i.repository}:${i.tag}`))
```



**startContainer**

```ts
await docker.startContainer('my-app')
```



**stopContainer**

```ts
await docker.stopContainer('my-app')
await docker.stopContainer('my-app', 30) // wait up to 30s
```



**removeContainer**

```ts
await docker.removeContainer('old-container')
await docker.removeContainer('stubborn-container', { force: true })
```



**runContainer**

```ts
const containerId = await docker.runContainer('nginx:latest', {
 name: 'web',
 ports: ['8080:80'],
 detach: true,
 environment: { NODE_ENV: 'production' }
})
```



**execCommand**

```ts
const result = await docker.execCommand('my-app', ['ls', '-la', '/app'])
console.log(result.stdout)
```



**pullImage**

```ts
await docker.pullImage('node:20-alpine')
```



**removeImage**

```ts
await docker.removeImage('nginx:latest')
await docker.removeImage('old-image', { force: true })
```



**buildImage**

```ts
await docker.buildImage('./project', {
 tag: 'my-app:latest',
 buildArgs: { NODE_ENV: 'production' }
})
```



**getLogs**

```ts
const logs = await docker.getLogs('my-app', { tail: 100, timestamps: true })
console.log(logs)
```



**getSystemInfo**

```ts
const info = await docker.getSystemInfo()
console.log(info.ServerVersion)
```



**prune**

```ts
await docker.prune({ all: true })
await docker.prune({ containers: true, images: true })
```

