---
title: "git"
tags: [git, version-control, core]
lastTested: null
lastTestPassed: null
---

# git

Git repository operations including branch info, commit history, and file listing.

## Overview

The `git` feature is a core feature, auto-enabled on every container. You can access it directly as a global or via `container.feature('git')`. It provides getters for quick repo metadata and methods for querying commit history and tracked files. All operations use the repository that contains the container's working directory.

## Repository Info

The basic getters give you quick access to the current repository state without any arguments.

```ts
console.log('Is a git repo:', git.isRepo)
console.log('Repo root:', git.repoRoot)
console.log('Current branch:', git.branch)
console.log('Current SHA:', git.sha)
```

These are synchronous getters, so you can use them inline anywhere.

## Listing Tracked Files

Use `lsFiles()` to list files tracked by git. This wraps `git ls-files` with structured options.

```ts
const files = await git.lsFiles()
console.log('Total tracked files:', files.length)
console.log('First 5 files:')
files.slice(0, 5).forEach(f => console.log(' ', f))
```

You can filter for modified, deleted, or untracked files by passing options.

## Filtered File Listing

Pass options to `lsFiles()` to narrow down the results by file status or pattern.

```ts
const tsFiles = await git.lsFiles({ include: '*.ts' })
console.log('Tracked .ts files:', tsFiles.length)

const srcFiles = await git.lsFiles({ baseDir: 'src' })
console.log('Files in src/:', srcFiles.length)
```

The `include`, `exclude`, and `baseDir` options let you scope the listing precisely.

## Latest Commits

Use `getLatestChanges()` to retrieve recent commit metadata. Each entry has a `title`, `message`, and `author`.

```ts
const changes = await git.getLatestChanges(3)
changes.forEach((c, i) => {
  console.log(`${i + 1}. [${c.author}] ${c.title}`)
})
```

This is useful for generating changelogs, displaying recent activity, or auditing history.

## File History

Use `fileLog()` to see the commit history for a specific file.

```ts
const log = git.fileLog('package.json')
console.log('Commits touching package.json:', log.length)
log.slice(0, 3).forEach(entry => {
  console.log(`  ${entry.sha.slice(0, 8)} ${entry.message}`)
})
```

Each entry contains the commit `sha` and `message`. This is a synchronous method.

## Summary

This demo covered checking repository status, listing tracked files with filters, viewing recent commit history, and inspecting per-file commit logs. These tools give scripts full visibility into the git state of a project.
