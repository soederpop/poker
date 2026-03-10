# Networking (features.networking)

The Networking feature provides utilities for network-related operations. This feature includes utilities for port detection and availability checking, which are commonly needed when setting up servers or network services.

## Usage

```ts
container.feature('networking', {
  // Default timeout in milliseconds for probing
  timeout,
  // Default concurrency for scanning operations
  concurrency,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `timeout` | `number` | Default timeout in milliseconds for probing |
| `concurrency` | `number` | Default concurrency for scanning operations |

## Methods

### findOpenPort

Finds the next available port starting from the specified port number. This method will search for the first available port starting from the given port number. If the specified port is available, it returns that port. Otherwise, it returns the next available port.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `startAt` | `any` |  | The port number to start searching from (0 means system will choose) |

**Returns:** `void`

```ts
// Find any available port
const anyPort = await networking.findOpenPort()

// Find an available port starting from 3000
const port = await networking.findOpenPort(3000)
console.log(`Server can use port: ${port}`)
```



### isPortOpen

Checks if a specific port is available for use. This method attempts to detect if the specified port is available. It returns true if the port is available, false if it's already in use.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `checkPort` | `any` |  | The port number to check for availability |

**Returns:** `void`

```ts
// Check if port 8080 is available
const isAvailable = await networking.isPortOpen(8080)
if (isAvailable) {
 console.log('Port 8080 is free to use')
} else {
 console.log('Port 8080 is already in use')
}
```



### getLocalNetworks

Returns local external IPv4 interfaces and their CIDR ranges.

**Returns:** `LocalNetwork[]`



### expandCidr

Expands a CIDR block to host IP addresses. For /31 and /32, all addresses are returned. For all others, network/broadcast are excluded.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `cidr` | `string` | ✓ | Parameter cidr |

**Returns:** `string[]`



### getArpTable

Reads and parses the system ARP cache.

**Returns:** `Promise<ArpEntry[]>`



### isHostReachable

Performs a lightweight TCP reachability probe.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `host` | `string` | ✓ | Parameter host |
| `options` | `ReachableHostOptions` |  | Parameter options |

`ReachableHostOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `timeout` | `number` |  |
| `ports` | `number[]` |  |

**Returns:** `Promise<boolean>`



### discoverHosts

Discovers hosts in a CIDR range by combining ARP cache and TCP probes.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `cidr` | `string` | ✓ | Parameter cidr |
| `options` | `DiscoverHostsOptions` |  | Parameter options |

`DiscoverHostsOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `timeout` | `number` |  |
| `concurrency` | `number` |  |
| `ports` | `number[]` |  |

**Returns:** `Promise<DiscoverHost[]>`



### scanPorts

TCP connect scan for a host. By default only returns open ports.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `host` | `string` | ✓ | Parameter host |
| `options` | `ScanPortsOptions` |  | Parameter options |

`ScanPortsOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `ports` | `string | number[]` |  |
| `timeout` | `number` |  |
| `concurrency` | `number` |  |
| `banner` | `boolean` |  |
| `includeClosed` | `boolean` |  |

**Returns:** `Promise<PortScanResult[]>`



### scanLocalNetworks

Convenience method: discover and port-scan hosts across all local networks.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `ScanLocalNetworksOptions` |  | Parameter options |

`ScanLocalNetworksOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `ports` | `string | number[]` |  |
| `timeout` | `number` |  |
| `concurrency` | `number` |  |
| `hostConcurrency` | `number` |  |
| `banner` | `boolean` |  |

**Returns:** `Promise<LocalNetworkScanHost[]>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `proc` | `any` |  |
| `os` | `any` |  |
| `nmap` | `any` | Optional nmap wrapper for users that already have nmap installed. |

## Events (Zod v4 schema)

### scan:start

Event emitted by Networking



### host:discovered

Event emitted by Networking



### scan:complete

Event emitted by Networking



### port:open

Event emitted by Networking



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `lastScan` | `object` | The most recent network scan result |

## Examples

**features.networking**

```ts
const networking = container.feature('networking')

// Find an available port starting from 3000
const port = await networking.findOpenPort(3000)
console.log(`Available port: ${port}`)

// Check if a specific port is available
const isAvailable = await networking.isPortOpen(8080)
if (isAvailable) {
 console.log('Port 8080 is available')
}
```



**findOpenPort**

```ts
// Find any available port
const anyPort = await networking.findOpenPort()

// Find an available port starting from 3000
const port = await networking.findOpenPort(3000)
console.log(`Server can use port: ${port}`)
```



**isPortOpen**

```ts
// Check if port 8080 is available
const isAvailable = await networking.isPortOpen(8080)
if (isAvailable) {
 console.log('Port 8080 is free to use')
} else {
 console.log('Port 8080 is already in use')
}
```

