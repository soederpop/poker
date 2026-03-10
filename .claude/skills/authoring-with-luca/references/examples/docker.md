---
title: "Docker"
tags: [docker, containers, images, devops]
lastTested: null
lastTestPassed: null
---

# docker

Docker CLI interface for managing containers, images, and executing commands inside running containers. Provides comprehensive Docker operations including build, run, exec, logs, and system pruning.

## Overview

The `docker` feature wraps the Docker CLI to give you programmatic control over containers and images. It requires Docker to be installed and the Docker daemon to be running on the host machine. All methods return structured data rather than raw CLI output.

## Enabling the Feature

```ts
const docker = container.feature('docker', { enable: true })
console.log('Docker feature enabled:', docker.state.get('enabled'))
```

## Exploring the API

```ts
const docs = container.features.describe('docker')
console.log(docs)
```

## Checking Availability

```ts
const docker = container.feature('docker')
const available = await docker.checkDockerAvailability()
console.log('Docker available:', available)
console.log('State:', docker.state.get('isDockerAvailable'))
```

## Building an Image

Build a Docker image from a Dockerfile in a project directory.

```ts skip
await docker.buildImage('./my-project', {
  tag: 'my-app:latest',
  buildArgs: { NODE_ENV: 'production' },
  nocache: true
})
console.log('Image built successfully')
```

If the build succeeds, the image appears in `docker.listImages()`. The `buildArgs` option passes `--build-arg` flags to the Docker build command.

## Running a Container

Create and start a container from an image with port mappings, volumes, and environment variables.

```ts skip
const containerId = await docker.runContainer('nginx:latest', {
  name: 'web-server',
  ports: ['8080:80'],
  detach: true,
  environment: { NGINX_HOST: 'localhost' }
})
console.log('Container started:', containerId)
```

The `detach: true` option runs the container in the background and returns its ID. Without it, the call blocks until the container exits.

## Executing Commands in a Container

Run commands inside a running container and capture the output.

```ts skip
const result = await docker.execCommand('web-server', ['ls', '-la', '/usr/share/nginx/html'])
console.log('stdout:', result.stdout)
console.log('exit code:', result.exitCode)
```

The command array avoids shell interpretation issues. The returned object includes `stdout`, `stderr`, and `exitCode`.

## Creating a Shell

The `createShell` method returns a shell-like wrapper for running multiple commands against the same container.

```ts skip
const shell = await docker.createShell('web-server', {
  workdir: '/app'
})
await shell.run('ls -la')
console.log(shell.last.stdout)
await shell.run('cat package.json')
console.log(shell.last.stdout)
await shell.destroy()
```

Call `destroy()` when finished to clean up any helper containers created for volume-mounted shells.

## Summary

The `docker` feature provides a complete programmatic interface to Docker: build images, run and manage containers, execute commands inside them, retrieve logs, and prune unused resources. All operations require the Docker daemon to be running on the host.
