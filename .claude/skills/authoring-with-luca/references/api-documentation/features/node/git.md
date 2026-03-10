# Git (features.git)

The Git feature provides utilities for interacting with Git repositories. This feature allows you to check repository status, list files, get branch information, and access Git metadata for projects within a Git repository.

## Usage

```ts
container.feature('git')
```

## Methods

### lsFiles

Lists files in the Git repository using git ls-files command. This method provides a flexible interface to the git ls-files command, allowing you to filter files by various criteria such as cached, deleted, modified, untracked, and ignored files.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `LsFilesOptions` |  | Options to control which files are listed |

`LsFilesOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `cached` | `boolean` | Show cached/staged files |
| `deleted` | `boolean` | Show deleted files |
| `modified` | `boolean` | Show modified files |
| `others` | `boolean` | Show untracked files |
| `ignored` | `boolean` | Show ignored files |
| `status` | `boolean` | Show file status information |
| `includeIgnored` | `boolean` | Include ignored files when showing others |
| `exclude` | `string | string[]` | Patterns to exclude from results |
| `baseDir` | `string` | Base directory to list files from |

**Returns:** `void`

```ts
// Get all tracked files
const allFiles = await git.lsFiles()

// Get only modified files
const modified = await git.lsFiles({ modified: true })

// Get untracked files excluding certain patterns
const untracked = await git.lsFiles({ 
 others: true, 
 exclude: ['*.log', 'node_modules'] 
})
```



### getLatestChanges

Gets the latest commits from the repository. Returns an array of commit objects containing the title (first line of commit message), full message body, and author name for each commit.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `numberOfChanges` | `number` |  | The number of recent commits to return |

**Returns:** `void`

```ts
const changes = await git.getLatestChanges(5)
for (const commit of changes) {
 console.log(`${commit.author}: ${commit.title}`)
}
```



### fileLog

Gets a lightweight commit log for one or more files. Returns the SHA and message for each commit that touched the given files, without the per-commit overhead of resolving which specific files matched. For richer per-file matching, see {@link getChangeHistoryForFiles}.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `files` | `string[]` | ✓ | File paths (absolute or relative to container.cwd) |

**Returns:** `void`

```ts
const log = git.fileLog('package.json')
const log = git.fileLog('src/index.ts', 'src/helper.ts')
for (const entry of log) {
 console.log(`${entry.sha.slice(0, 8)} ${entry.message}`)
}
```



### diff

Gets the diff for a file between two refs. By default compares from the current HEAD to the given ref. You can supply both `compareTo` and `compareFrom` to diff between any two commits, branches, or tags.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `file` | `string` | ✓ | File path (absolute or relative to container.cwd) |
| `compareTo` | `string` | ✓ | The target ref (commit SHA, branch, tag) to compare to |
| `compareFrom` | `string` |  | The base ref to compare from (defaults to current HEAD) |

**Returns:** `void`

```ts
// Diff package.json between HEAD and a specific commit
const d = git.diff('package.json', 'abc1234')

// Diff between two branches
const d = git.diff('src/index.ts', 'feature-branch', 'main')
```



### displayDiff

Pretty prints a unified diff string to the terminal using colors. Parses the diff output and applies color coding: - File headers (`diff --git`, `---`, `+++`) are rendered bold - Hunk headers (`@@ ... @@`) are rendered in cyan - Added lines (`+`) are rendered in green - Removed lines (`-`) are rendered in red - Context lines are rendered dim Can be called with a raw diff string, or with the same arguments as {@link diff} to fetch and display in one step.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `diffOrFile` | `string` | ✓ | A raw diff string, or a file path to pass to {@link diff} |
| `compareTo` | `string` |  | When diffOrFile is a file path, the target ref to compare to |
| `compareFrom` | `string` |  | When diffOrFile is a file path, the base ref to compare from |

**Returns:** `string`

```ts
// Display a pre-fetched diff
const raw = git.diff('src/index.ts', 'main')
git.displayDiff(raw)

// Fetch and display in one call
git.displayDiff('src/index.ts', 'abc1234')
```



### getChangeHistoryForFiles

Gets the commit history for a set of files or glob patterns. Accepts absolute paths, relative paths (resolved from container.cwd), or glob patterns. Returns commits that touched any of the matched files, with each entry noting which of your queried files were in that commit.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `paths` | `string[]` | ✓ | File paths or glob patterns to get history for |

**Returns:** `void`

```ts
const history = git.getChangeHistoryForFiles('src/container.ts', 'src/helper.ts')
const history = git.getChangeHistoryForFiles('src/node/features/*.ts')
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `branch` | `any` | Gets the current Git branch name. |
| `sha` | `any` | Gets the current Git commit SHA hash. |
| `isRepo` | `any` | Checks if the current directory is within a Git repository. |
| `isRepoRoot` | `any` | Checks if the current working directory is the root of the Git repository. |
| `repoRoot` | `any` | Gets the absolute path to the Git repository root directory. This method caches the repository root path for performance. It searches upward from the current directory to find the .git directory. |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `repoRoot` | `string` | Absolute path to the Git repository root directory |

## Examples

**features.git**

```ts
const git = container.feature('git')

if (git.isRepo) {
 console.log(`Current branch: ${git.branch}`)
 console.log(`Repository root: ${git.repoRoot}`)
 
 const allFiles = await git.lsFiles()
 const modifiedFiles = await git.lsFiles({ modified: true })
}
```



**lsFiles**

```ts
// Get all tracked files
const allFiles = await git.lsFiles()

// Get only modified files
const modified = await git.lsFiles({ modified: true })

// Get untracked files excluding certain patterns
const untracked = await git.lsFiles({ 
 others: true, 
 exclude: ['*.log', 'node_modules'] 
})
```



**getLatestChanges**

```ts
const changes = await git.getLatestChanges(5)
for (const commit of changes) {
 console.log(`${commit.author}: ${commit.title}`)
}
```



**fileLog**

```ts
const log = git.fileLog('package.json')
const log = git.fileLog('src/index.ts', 'src/helper.ts')
for (const entry of log) {
 console.log(`${entry.sha.slice(0, 8)} ${entry.message}`)
}
```



**diff**

```ts
// Diff package.json between HEAD and a specific commit
const d = git.diff('package.json', 'abc1234')

// Diff between two branches
const d = git.diff('src/index.ts', 'feature-branch', 'main')
```



**displayDiff**

```ts
// Display a pre-fetched diff
const raw = git.diff('src/index.ts', 'main')
git.displayDiff(raw)

// Fetch and display in one call
git.displayDiff('src/index.ts', 'abc1234')
```



**getChangeHistoryForFiles**

```ts
const history = git.getChangeHistoryForFiles('src/container.ts', 'src/helper.ts')
const history = git.getChangeHistoryForFiles('src/node/features/*.ts')
```



**branch**

```ts
const currentBranch = git.branch
if (currentBranch) {
 console.log(`Currently on branch: ${currentBranch}`)
}
```



**sha**

```ts
const commitSha = git.sha
if (commitSha) {
 console.log(`Current commit: ${commitSha}`)
}
```



**isRepo**

```ts
if (git.isRepo) {
 console.log('This is a Git repository!')
} else {
 console.log('Not in a Git repository')
}
```



**isRepoRoot**

```ts
if (git.isRepoRoot) {
 console.log('At the repository root')
} else {
 console.log('In a subdirectory of the repository')
}
```



**repoRoot**

```ts
const repoRoot = git.repoRoot
if (repoRoot) {
 console.log(`Repository root: ${repoRoot}`)
}
```

