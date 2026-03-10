# Postgres (features.postgres)

Postgres feature for safe SQL execution through Bun's native SQL client. Supports: - parameterized query execution (`query` / `execute`) - tagged-template query execution (`sql`) to avoid manual placeholder wiring

## Usage

```ts
container.feature('postgres', {
  // Postgres connection URL, e.g. postgres://user:pass@host:5432/db
  url,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string` | Postgres connection URL, e.g. postgres://user:pass@host:5432/db |

## Methods

### query

Executes a SELECT-like query and returns result rows. Use postgres placeholders (`$1`, `$2`, ...) for `params`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `queryText` | `string` | ✓ | The SQL query string with optional `$N` placeholders |
| `params` | `SqlValue[]` |  | Ordered array of values to bind to the placeholders |

**Returns:** `Promise<T[]>`

```ts
const pg = container.feature('postgres', { url: process.env.DATABASE_URL! })
const users = await pg.query<{ id: number; email: string }>(
 'SELECT id, email FROM users WHERE active = $1',
 [true]
)
```



### execute

Executes a write/update/delete statement and returns metadata. Use postgres placeholders (`$1`, `$2`, ...) for `params`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `queryText` | `string` | ✓ | The SQL statement string with optional `$N` placeholders |
| `params` | `SqlValue[]` |  | Ordered array of values to bind to the placeholders |

**Returns:** `Promise<{ rowCount: number }>`

```ts
const pg = container.feature('postgres', { url: process.env.DATABASE_URL! })
const { rowCount } = await pg.execute(
 'UPDATE users SET active = $1 WHERE last_login < $2',
 [false, '2024-01-01']
)
console.log(`Deactivated ${rowCount} users`)
```



### sql

Safe tagged-template SQL helper. Values become bound parameters automatically, preventing SQL injection.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `strings` | `TemplateStringsArray` | ✓ | Template literal string segments |
| `values` | `SqlValue[]` | ✓ | Interpolated values that become bound `$N` parameters |

**Returns:** `Promise<T[]>`

```ts
const pg = container.feature('postgres', { url: process.env.DATABASE_URL! })
const email = 'hello@example.com'
const rows = await pg.sql<{ id: number }>`
 SELECT id FROM users WHERE email = ${email}
`
```



### close

Closes the postgres connection and updates feature state. Emits `closed` after the connection is torn down.

**Returns:** `void`

```ts
const pg = container.feature('postgres', { url: process.env.DATABASE_URL! })
// ... run queries ...
await pg.close()
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `client` | `any` | Returns the underlying Bun SQL postgres client. |

## Events (Zod v4 schema)

### query

Event emitted by Postgres



### error

Event emitted by Postgres



### execute

Event emitted by Postgres



### closed

Event emitted by Postgres



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `connected` | `boolean` | Whether the postgres connection is currently open |
| `url` | `string` | Connection URL used for this postgres feature instance |
| `lastQuery` | `string` | Most recent SQL query string that was executed |
| `lastRowCount` | `number` | Row count returned by the most recent query execution |
| `lastError` | `string` | Most recent postgres error message, if any |

## Examples

**features.postgres**

```ts
const postgres = container.feature('postgres', { url: process.env.DATABASE_URL! })

const users = await postgres.query<{ id: number; email: string }>(
 'select id, email from users where id = $1',
 [123]
)

const rows = await postgres.sql<{ id: number }>`
 select id from users where email = ${'hello@example.com'}
`
```



**query**

```ts
const pg = container.feature('postgres', { url: process.env.DATABASE_URL! })
const users = await pg.query<{ id: number; email: string }>(
 'SELECT id, email FROM users WHERE active = $1',
 [true]
)
```



**execute**

```ts
const pg = container.feature('postgres', { url: process.env.DATABASE_URL! })
const { rowCount } = await pg.execute(
 'UPDATE users SET active = $1 WHERE last_login < $2',
 [false, '2024-01-01']
)
console.log(`Deactivated ${rowCount} users`)
```



**sql**

```ts
const pg = container.feature('postgres', { url: process.env.DATABASE_URL! })
const email = 'hello@example.com'
const rows = await pg.sql<{ id: number }>`
 SELECT id FROM users WHERE email = ${email}
`
```



**close**

```ts
const pg = container.feature('postgres', { url: process.env.DATABASE_URL! })
// ... run queries ...
await pg.close()
```

