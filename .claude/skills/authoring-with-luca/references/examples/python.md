---
title: "Python"
tags: [python, scripting, virtualenv, integration]
lastTested: null
lastTestPassed: null
---

# python

Python virtual machine feature for executing Python code, managing environments, and installing dependencies. Automatically detects uv, conda, venv, or system Python.

## Overview

The `python` feature provides a bridge between Luca and the Python ecosystem. It auto-detects the best available Python environment (uv, conda, venv, system), can install project dependencies, and execute Python code with variable injection and local variable capture. Requires Python to be installed on the host.

## Enabling the Feature

```ts
const python = container.feature('python', { enable: true })
console.log('Python feature enabled:', python.state.get('enabled'))
console.log('Python ready:', python.state.get('isReady'))
```

## Exploring the API

```ts
const docs = container.features.describe('python')
console.log(docs)
```

## Environment Detection

```ts
const python = container.feature('python')
await python.detectEnvironment()
console.log('Environment type:', python.state.get('environmentType'))
console.log('Python path:', python.state.get('pythonPath'))
```

## Running Inline Code

Execute Python code directly and capture the output.

```ts skip
const result = await python.execute('print("Hello from Python!")')
console.log('stdout:', result.stdout)
console.log('exit code:', result.exitCode)
```

You can also pass variables into the Python context and capture locals after execution.

```ts skip
const result = await python.execute(
  'greeting = f"Hello {name}, you are {age}!";\nprint(greeting)',
  { name: 'Alice', age: 30 },
  { captureLocals: true }
)
console.log('stdout:', result.stdout)
console.log('locals:', result.locals)
```

The `captureLocals` option serializes all local variables from the script back to JavaScript as JSON.

## Running a Script File

Execute an existing `.py` file and capture its output.

```ts skip
const result = await python.executeFile('/path/to/analysis.py')
console.log('stdout:', result.stdout)
console.log('stderr:', result.stderr)
```

## Creating a Virtual Environment

Install project dependencies using the auto-detected package manager.

```ts skip
const python = container.feature('python', {
  dir: '/path/to/python-project',
  installCommand: 'pip install -r requirements.txt'
})
const result = await python.installDependencies()
console.log('Install exit code:', result.exitCode)
```

When no `installCommand` is provided, the feature infers the correct command from the detected environment type (e.g., `uv sync` for uv, `pip install -e .` for venv).

## Summary

The `python` feature bridges Luca and Python by auto-detecting environments, managing dependencies, and providing inline code execution with variable injection. It supports uv, conda, venv, and system Python installations.
