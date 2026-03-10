---
title: "Opener"
tags: [opener, files, urls, apps, editor]
lastTested: null
lastTestPassed: null
---

# opener

Opens files, URLs, desktop applications, and code editors from scripts. HTTP/HTTPS URLs open in Chrome, files open with the system default handler, and VS Code / Cursor can be targeted directly.

## Overview

The `opener` feature provides a simple interface for opening things on the host system. It delegates to platform-appropriate commands (`open` on macOS, `start` on Windows, direct invocation on Linux). Because every method triggers a side effect (launching an application or browser), all operational examples use skip blocks.

## Enabling the Feature

```ts
const opener = container.feature('opener', { enable: true })
console.log('Opener enabled:', opener.state.get('enabled'))
```

## Exploring the API

```ts
const docs = container.features.describe('opener')
console.log(docs)
```

## Opening a URL

Open a URL in Google Chrome (the default browser for HTTP/HTTPS targets).

```ts skip
await opener.open('https://github.com/soederpop/luca')
console.log('URL opened in Chrome')
```

Non-HTTP paths are opened with the platform default handler. For example, opening a `.png` file would launch Preview on macOS.

```ts skip
await opener.open('/Users/jon/screenshots/diagram.png')
```

## Opening a Desktop App

Launch any desktop application by name.

```ts skip
await opener.app('Slack')
console.log('Slack launched')
```

```ts skip
await opener.app('Finder')
```

On macOS this uses `open -a`. The application name should match what appears in `/Applications`.

## Opening in VS Code or Cursor

Open a file or folder directly in VS Code or Cursor.

```ts skip
await opener.code('/Users/jon/projects/my-app')
console.log('VS Code opened')
```

```ts skip
await opener.cursor('/Users/jon/projects/my-app/src/index.ts')
console.log('Cursor opened')
```

Both methods fall back to `open -a` on macOS if the CLI command is not found in PATH.

## Summary

The `opener` feature provides `open`, `app`, `code`, and `cursor` methods for launching URLs, files, desktop applications, and code editors from Luca scripts. All operations produce side effects on the host system.
