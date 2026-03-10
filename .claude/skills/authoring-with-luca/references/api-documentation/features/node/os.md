# OS (features.os)

The OS feature provides access to operating system utilities and information. This feature wraps Node.js's built-in `os` module and provides convenient getters for system information like architecture, platform, directories, network interfaces, and hardware details.

## Usage

```ts
container.feature('os')
```

## Getters

| Property | Type | Description |
|----------|------|-------------|
| `arch` | `any` | Gets the operating system CPU architecture. |
| `tmpdir` | `any` | Gets the operating system's default directory for temporary files. |
| `homedir` | `any` | Gets the current user's home directory path. |
| `cpuCount` | `any` | Gets the number of logical CPU cores available on the system. |
| `hostname` | `any` | Gets the hostname of the operating system. |
| `platform` | `any` | Gets the operating system platform. |
| `networkInterfaces` | `any` | Gets information about the system's network interfaces. |
| `macAddresses` | `string[]` | Gets an array of MAC addresses for non-internal IPv4 network interfaces. This filters the network interfaces to only include external IPv4 interfaces and returns their MAC addresses, which can be useful for system identification. |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |

## Examples

**features.os**

```ts
const osInfo = container.feature('os')

console.log(`Platform: ${osInfo.platform}`)
console.log(`Architecture: ${osInfo.arch}`)
console.log(`CPU cores: ${osInfo.cpuCount}`)
console.log(`Home directory: ${osInfo.homedir}`)
```



**arch**

```ts
const arch = os.arch
console.log(`Running on ${arch} architecture`)
```



**tmpdir**

```ts
const tempDir = os.tmpdir
console.log(`Temp directory: ${tempDir}`)
```



**homedir**

```ts
const home = os.homedir
console.log(`User home: ${home}`)
```



**cpuCount**

```ts
const cores = os.cpuCount
console.log(`System has ${cores} CPU cores`)
```



**hostname**

```ts
const hostname = os.hostname
console.log(`Hostname: ${hostname}`)
```



**platform**

```ts
const platform = os.platform
if (platform === 'darwin') {
 console.log('Running on macOS')
}
```



**networkInterfaces**

```ts
const interfaces = os.networkInterfaces
Object.keys(interfaces).forEach(name => {
 console.log(`Interface ${name}:`, interfaces[name])
})
```



**macAddresses**

```ts
const macAddresses = os.macAddresses
console.log(`External MAC addresses: ${macAddresses.join(', ')}`)
```

