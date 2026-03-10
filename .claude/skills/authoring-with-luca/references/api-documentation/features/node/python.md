# Python (features.python)

The Python VM feature provides Python virtual machine capabilities for executing Python code. This feature automatically detects Python environments (uv, conda, venv, system) and provides methods to install dependencies and execute Python scripts. It can manage project-specific Python environments and maintain context between executions.

## Usage

```ts
container.feature('python', {
  // Directory containing the Python project
  dir,
  // Custom install command to override auto-detection
  installCommand,
  // Path to Python script that will populate locals/context
  contextScript,
  // Specific Python executable path to use
  pythonPath,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `dir` | `string` | Directory containing the Python project |
| `installCommand` | `string` | Custom install command to override auto-detection |
| `contextScript` | `string` | Path to Python script that will populate locals/context |
| `pythonPath` | `string` | Specific Python executable path to use |

## Methods

### enable

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `any` |  | Parameter options |

**Returns:** `Promise<this>`



### detectEnvironment

Detects the Python environment type and sets the appropriate Python path. This method checks for various Python environment managers in order of preference: uv, conda, venv, then falls back to system Python. It sets the pythonPath and environmentType in the state.

**Returns:** `Promise<void>`

```ts
await python.detectEnvironment()
console.log(python.state.get('environmentType')) // 'uv' | 'conda' | 'venv' | 'system'
console.log(python.state.get('pythonPath')) // '/path/to/python/executable'
```



### installDependencies

Installs dependencies for the Python project. This method automatically detects the appropriate package manager and install command based on the environment type. If a custom installCommand is provided in options, it will use that instead.

**Returns:** `Promise<{ stdout: string; stderr: string; exitCode: number }>`

```ts
// Auto-detect and install
const result = await python.installDependencies()

// With custom install command
const python = container.feature('python', { 
 installCommand: 'pip install -r requirements.txt' 
})
const result = await python.installDependencies()
```



### execute

Executes Python code and returns the result. This method creates a temporary Python script with the provided code and variables, executes it using the detected Python environment, and captures the output.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | `string` | ✓ | The Python code to execute |
| `variables` | `Record<string, any>` |  | Variables to make available to the Python code |
| `options` | `{ captureLocals?: boolean }` |  | Execution options |

`{ captureLocals?: boolean }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `captureLocals` | `any` | Whether to capture and return local variables after execution |

**Returns:** `Promise<{ stdout: string; stderr: string; exitCode: number; locals?: any }>`

```ts
// Simple execution
const result = await python.execute('print("Hello World")')
console.log(result.stdout) // 'Hello World'

// With variables
const result = await python.execute('print(f"Hello {name}!")', { name: 'Alice' })

// Capture locals
const result = await python.execute('x = 42\ny = x * 2', {}, { captureLocals: true })
console.log(result.locals) // { x: 42, y: 84 }
```



### executeFile

Executes a Python file and returns the result.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | `string` | ✓ | Path to the Python file to execute |
| `variables` | `Record<string, any>` |  | Variables to make available via command line arguments |

**Returns:** `Promise<{ stdout: string; stderr: string; exitCode: number }>`

```ts
const result = await python.executeFile('/path/to/script.py')
console.log(result.stdout)
```



### getEnvironmentInfo

Gets information about the current Python environment.

**Returns:** `Promise<{ version: string; path: string; packages: string[] }>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `projectDir` | `any` | Returns the root directory of the Python project. |
| `pythonPath` | `any` | Returns the path to the Python executable for this environment. |
| `environmentType` | `any` | Returns the detected environment type: 'uv', 'conda', 'venv', or 'system'. |

## Events (Zod v4 schema)

### ready

Event emitted by Python



### environmentDetected

Event emitted by Python



### installingDependencies

Event emitted by Python



### dependenciesInstalled

Event emitted by Python



### dependencyInstallFailed

Event emitted by Python



### localsParseError

Event emitted by Python



### codeExecuted

Event emitted by Python



### fileExecuted

Event emitted by Python



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `pythonPath` | `any` | Path to the detected Python executable |
| `projectDir` | `any` | Root directory of the Python project |
| `environmentType` | `any` | Detected Python environment type (uv, conda, venv, or system) |
| `isReady` | `boolean` | Whether the Python environment is ready for execution |
| `lastExecutedScript` | `any` | Path to the last executed Python script |

## Examples

**features.python**

```ts
const python = container.feature('python', { 
 dir: "/path/to/python/project",
 contextScript: "/path/to/setup-context.py"
})

// Auto-install dependencies
await python.installDependencies()

// Execute Python code
const result = await python.execute('print("Hello from Python!")')

// Execute with custom variables
const result2 = await python.execute('print(f"Hello {name}!")', { name: 'World' })
```



**detectEnvironment**

```ts
await python.detectEnvironment()
console.log(python.state.get('environmentType')) // 'uv' | 'conda' | 'venv' | 'system'
console.log(python.state.get('pythonPath')) // '/path/to/python/executable'
```



**installDependencies**

```ts
// Auto-detect and install
const result = await python.installDependencies()

// With custom install command
const python = container.feature('python', { 
 installCommand: 'pip install -r requirements.txt' 
})
const result = await python.installDependencies()
```



**execute**

```ts
// Simple execution
const result = await python.execute('print("Hello World")')
console.log(result.stdout) // 'Hello World'

// With variables
const result = await python.execute('print(f"Hello {name}!")', { name: 'Alice' })

// Capture locals
const result = await python.execute('x = 42\ny = x * 2', {}, { captureLocals: true })
console.log(result.locals) // { x: 42, y: 84 }
```



**executeFile**

```ts
const result = await python.executeFile('/path/to/script.py')
console.log(result.stdout)
```

