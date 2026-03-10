# Dns (features.dns)

The Dns feature provides structured DNS lookups by wrapping the `dig` CLI. All query methods parse dig output into typed JSON objects, making it easy to explore and audit a domain's DNS configuration programmatically.

## Usage

```ts
container.feature('dns', {
  // Default DNS server to use for queries
  server,
  // Default timeout in seconds for dig queries
  timeout,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` | Default DNS server to use for queries |
| `timeout` | `number` | Default timeout in seconds for dig queries |

## Methods

### isAvailable

Checks whether the `dig` binary is available on the system.

**Returns:** `Promise<boolean>`

```ts
if (await dns.isAvailable()) {
 const records = await dns.a('example.com')
}
```



### resolve

Resolves DNS records of a given type for a domain. This is the core query method. All convenience methods (a, aaaa, mx, etc.) delegate to this method.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `type` | `DnsRecordType` | ✓ | The DNS record type to look up |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` | DNS server to use (e.g. '8.8.8.8') |
| `timeout` | `number` | Query timeout in seconds |
| `short` | `boolean` | If true, returns only values (no TTL, class, etc.) |

**Returns:** `Promise<DnsQueryResult>`

```ts
const result = await dns.resolve('example.com', 'A')
for (const record of result.records) {
 console.log(`${record.name} -> ${record.value} (TTL: ${record.ttl}s)`)
}

// Query a specific DNS server
const result = await dns.resolve('example.com', 'A', { server: '1.1.1.1' })
```



### a

Looks up A (IPv4 address) records for a domain.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<DnsRecord[]>`

```ts
const records = await dns.a('google.com')
// [{ name: 'google.com.', ttl: 300, class: 'IN', type: 'A', value: '142.250.x.x' }]
```



### aaaa

Looks up AAAA (IPv6 address) records for a domain.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<DnsRecord[]>`

```ts
const records = await dns.aaaa('google.com')
// [{ name: 'google.com.', ttl: 300, class: 'IN', type: 'AAAA', value: '2607:f8b0:...' }]
```



### cname

Looks up CNAME (canonical name) records for a domain.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<DnsRecord[]>`

```ts
const records = await dns.cname('www.github.com')
// [{ name: 'www.github.com.', ttl: 3600, class: 'IN', type: 'CNAME', value: 'github.com.' }]
```



### mx

Looks up MX (mail exchange) records for a domain. Returns enriched records with parsed priority and exchange fields.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<MxRecord[]>`

```ts
const records = await dns.mx('google.com')
// [{ name: 'google.com.', ttl: 300, type: 'MX', priority: 10, exchange: 'smtp.google.com.' }]
```



### ns

Looks up NS (nameserver) records for a domain.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<DnsRecord[]>`

```ts
const records = await dns.ns('google.com')
// [{ name: 'google.com.', ttl: 86400, type: 'NS', value: 'ns1.google.com.' }, ...]
```



### txt

Looks up TXT records for a domain. TXT records often contain SPF policies, DKIM keys, domain verification tokens, and other metadata.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<DnsRecord[]>`

```ts
const records = await dns.txt('google.com')
const spf = records.find(r => r.value.includes('v=spf1'))
console.log(spf?.value) // 'v=spf1 include:_spf.google.com ~all'
```



### soa

Looks up the SOA (Start of Authority) record for a domain. Returns enriched records with parsed SOA fields including primary nameserver, responsible party, serial number, and timing parameters.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<SoaRecord[]>`

```ts
const records = await dns.soa('google.com')
console.log(records[0].mname)  // 'ns1.google.com.'
console.log(records[0].serial) // 879543655
```



### srv

Looks up SRV (service) records for a domain. SRV records specify the location of services. The domain should include the service and protocol prefix (e.g. `_sip._tcp.example.com`).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The full SRV domain (e.g. `_sip._tcp.example.com`) |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<SrvRecord[]>`

```ts
const records = await dns.srv('_sip._tcp.example.com')
// [{ priority: 10, weight: 60, port: 5060, target: 'sip.example.com.' }]
```



### caa

Looks up CAA (Certificate Authority Authorization) records for a domain. CAA records specify which certificate authorities are allowed to issue certificates for a domain.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<CaaRecord[]>`

```ts
const records = await dns.caa('google.com')
// [{ flags: 0, tag: 'issue', issuer: 'pki.goog' }]
```



### reverse

Performs a reverse DNS lookup for an IP address. Converts the IP to its in-addr.arpa form and queries for PTR records.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ip` | `string` | ✓ | The IPv4 address to look up |
| `options` | `QueryOptions` |  | Optional query parameters |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<string[]>`

```ts
const hostnames = await dns.reverse('8.8.8.8')
// ['dns.google.']
```



### overview

Retrieves a comprehensive DNS overview for a domain. Queries all common record types (A, AAAA, CNAME, MX, NS, TXT, SOA, CAA) in parallel and returns a consolidated view. This is the go-to method for exploring a domain's full DNS configuration.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `options` | `QueryOptions` |  | Optional query parameters applied to all queries |

`QueryOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `string` |  |
| `timeout` | `number` |  |
| `short` | `boolean` |  |

**Returns:** `Promise<DnsOverview>`

```ts
const overview = await dns.overview('example.com')
console.log('IPs:', overview.a.map(r => r.value))
console.log('Mail:', overview.mx.map(r => r.exchange))
console.log('Nameservers:', overview.ns.map(r => r.value))
console.log('TXT:', overview.txt.map(r => r.value))
```



### compare

Compares DNS resolution between two nameservers for a given record type. Useful for verifying DNS propagation or checking for inconsistencies between authoritative and recursive resolvers.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `type` | `DnsRecordType` | ✓ | The DNS record type to compare |
| `serverA` | `string` | ✓ | First DNS server (e.g. '8.8.8.8') |
| `serverB` | `string` | ✓ | Second DNS server (e.g. '1.1.1.1') |

**Returns:** `Promise<{ serverA: DnsQueryResult; serverB: DnsQueryResult; match: boolean }>`

```ts
const diff = await dns.compare('example.com', 'A', '8.8.8.8', '1.1.1.1')
console.log(diff.match)   // true if both return the same values
console.log(diff.serverA) // records from 8.8.8.8
console.log(diff.serverB) // records from 1.1.1.1
```



### queryAuthoritative

Queries a domain's authoritative nameservers directly. First resolves the NS records, then queries each nameserver for the specified record type. Useful for bypassing caches and checking what the authoritative servers actually report.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `type` | `DnsRecordType` | ✓ | The DNS record type to look up |

**Returns:** `Promise<DnsQueryResult[]>`

```ts
const results = await dns.queryAuthoritative('example.com', 'A')
for (const r of results) {
 console.log(`${r.server}: ${r.records.map(rec => rec.value).join(', ')}`)
}
```



### hasTxtRecord

Checks whether a domain has a specific TXT record containing the given text. Useful for verifying domain ownership tokens, SPF records, DKIM entries, etc.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | `string` | ✓ | The domain name to query |
| `search` | `string` | ✓ | The text to search for in TXT record values |

**Returns:** `Promise<boolean>`

```ts
// Check for SPF record
const hasSPF = await dns.hasTxtRecord('google.com', 'v=spf1')

// Check for domain verification
const verified = await dns.hasTxtRecord('example.com', 'google-site-verification=')
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `proc` | `any` |  |

## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `lastQuery` | `object` | The most recent DNS query |

## Examples

**features.dns**

```ts
const dns = container.feature('dns')

// Look up A records
const result = await dns.resolve('example.com', 'A')
console.log(result.records)

// Get a full overview of all record types
const overview = await dns.overview('example.com')
console.log(overview.mx)  // mail servers
console.log(overview.ns)  // nameservers
console.log(overview.txt) // TXT records (SPF, DKIM, etc.)

// Reverse lookup
const ptr = await dns.reverse('8.8.8.8')
console.log(ptr) // ['dns.google.']
```



**isAvailable**

```ts
if (await dns.isAvailable()) {
 const records = await dns.a('example.com')
}
```



**resolve**

```ts
const result = await dns.resolve('example.com', 'A')
for (const record of result.records) {
 console.log(`${record.name} -> ${record.value} (TTL: ${record.ttl}s)`)
}

// Query a specific DNS server
const result = await dns.resolve('example.com', 'A', { server: '1.1.1.1' })
```



**a**

```ts
const records = await dns.a('google.com')
// [{ name: 'google.com.', ttl: 300, class: 'IN', type: 'A', value: '142.250.x.x' }]
```



**aaaa**

```ts
const records = await dns.aaaa('google.com')
// [{ name: 'google.com.', ttl: 300, class: 'IN', type: 'AAAA', value: '2607:f8b0:...' }]
```



**cname**

```ts
const records = await dns.cname('www.github.com')
// [{ name: 'www.github.com.', ttl: 3600, class: 'IN', type: 'CNAME', value: 'github.com.' }]
```



**mx**

```ts
const records = await dns.mx('google.com')
// [{ name: 'google.com.', ttl: 300, type: 'MX', priority: 10, exchange: 'smtp.google.com.' }]
```



**ns**

```ts
const records = await dns.ns('google.com')
// [{ name: 'google.com.', ttl: 86400, type: 'NS', value: 'ns1.google.com.' }, ...]
```



**txt**

```ts
const records = await dns.txt('google.com')
const spf = records.find(r => r.value.includes('v=spf1'))
console.log(spf?.value) // 'v=spf1 include:_spf.google.com ~all'
```



**soa**

```ts
const records = await dns.soa('google.com')
console.log(records[0].mname)  // 'ns1.google.com.'
console.log(records[0].serial) // 879543655
```



**srv**

```ts
const records = await dns.srv('_sip._tcp.example.com')
// [{ priority: 10, weight: 60, port: 5060, target: 'sip.example.com.' }]
```



**caa**

```ts
const records = await dns.caa('google.com')
// [{ flags: 0, tag: 'issue', issuer: 'pki.goog' }]
```



**reverse**

```ts
const hostnames = await dns.reverse('8.8.8.8')
// ['dns.google.']
```



**overview**

```ts
const overview = await dns.overview('example.com')
console.log('IPs:', overview.a.map(r => r.value))
console.log('Mail:', overview.mx.map(r => r.exchange))
console.log('Nameservers:', overview.ns.map(r => r.value))
console.log('TXT:', overview.txt.map(r => r.value))
```



**compare**

```ts
const diff = await dns.compare('example.com', 'A', '8.8.8.8', '1.1.1.1')
console.log(diff.match)   // true if both return the same values
console.log(diff.serverA) // records from 8.8.8.8
console.log(diff.serverB) // records from 1.1.1.1
```



**queryAuthoritative**

```ts
const results = await dns.queryAuthoritative('example.com', 'A')
for (const r of results) {
 console.log(`${r.server}: ${r.records.map(rec => rec.value).join(', ')}`)
}
```



**hasTxtRecord**

```ts
// Check for SPF record
const hasSPF = await dns.hasTxtRecord('google.com', 'v=spf1')

// Check for domain verification
const verified = await dns.hasTxtRecord('example.com', 'google-site-verification=')
```

