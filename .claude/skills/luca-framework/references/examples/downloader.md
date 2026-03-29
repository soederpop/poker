---
title: "Downloader"
tags: [downloader, network, files, http]
lastTested: null
lastTestPassed: null
---

# downloader

Download files from remote URLs and save them to the local filesystem.

## Overview

The `downloader` feature is an on-demand feature that fetches files from HTTP/HTTPS URLs and writes them to disk. It handles the network request, buffering, and file writing automatically. Use it when you need to programmatically pull remote assets -- images, documents, data files -- into your project.

## Feature Documentation

Let us inspect the feature's built-in documentation to understand its API.

```ts
const desc = container.features.describe('downloader')
console.log(desc)
```

The feature exposes a single `download(url, targetPath)` method that fetches a URL and writes the response body to the specified path.

## Enabling the Feature

Enable the downloader and inspect its initial state.

```ts
const downloader = container.feature('downloader', { enable: true })
console.log('Downloader enabled:', downloader.state.enabled)
```

Once enabled, the feature is ready to accept download requests.

## Inspecting the API

The downloader has a straightforward interface: one method for downloading.

```ts
const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(downloader))
  .filter(m => !m.startsWith('_') && m !== 'constructor')
console.log('Available methods:', methods.join(', '))
```

The `download` method takes two arguments: a URL string and a target file path. The target path is resolved relative to the container's working directory.

## How Downloading Works

Here is what happens when you call `download()`:

1. The feature makes an HTTP fetch to the provided URL
2. The response is buffered into memory
3. The buffer is written to the filesystem at the target path
4. The path is resolved using the container's path resolution

```ts
// Example usage (not executed to avoid network calls):
//   await downloader.download(
//     'https://example.com/data.json',
//     'downloads/data.json'
//   )
console.log('Downloader is ready. Call downloader.download(url, path) to fetch files.')
```

## Summary

This demo covered the `downloader` feature, which provides a simple one-method API for fetching remote files and saving them locally. It handles HTTP requests, buffering, and file writing, making it the right choice for any task that involves pulling assets from the network.
