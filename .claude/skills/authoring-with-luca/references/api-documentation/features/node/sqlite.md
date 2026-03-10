# Sqlite (features.sqlite)

SQLite feature for safe SQL execution through Bun's native sqlite binding. Supports: - parameterized query execution (`query` / `execute`) - tagged-template query execution (`sql`) to avoid manual placeholder wiring

## Usage

```ts
container.feature('sqlite', {
  // Path to sqlite file. Use :memory: for in-memory database
  path,
  // Open sqlite database in readonly mode
  readonly,
  // Open sqlite database in readwrite mode (defaults to true when readonly is false)
  readwrite,
  // Create the sqlite database file if it does not exist
  create,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `path` | `string` | Path to sqlite file. Use :memory: for in-memory database |
| `readonly` | `boolean` | Open sqlite database in readonly mode |
| `readwrite` | `boolean` | Open sqlite database in readwrite mode (defaults to true when readonly is false) |
| `create` | `boolean` | Create the sqlite database file if it does not exist |

## Methods

### query

Executes a SELECT-like query and returns result rows. Use sqlite placeholders (`?`) for `params`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `queryText` | `string` | ✓ | The SQL query string with optional `?` placeholders |
| `params` | `SqlValue[]` |  | Ordered array of values to bind to the placeholders |

**Returns:** `Promise<T[]>`

```ts
const db = container.feature('sqlite', { path: 'app.db' })
const users = await db.query<{ id: number; email: string }>(
 'SELECT id, email FROM users WHERE active = ?',
 [1]
)
```



### execute

Executes a write/update/delete statement and returns metadata. Use sqlite placeholders (`?`) for `params`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `queryText` | `string` | ✓ | The SQL statement string with optional `?` placeholders |
| `params` | `SqlValue[]` |  | Ordered array of values to bind to the placeholders |

**Returns:** `Promise<{ changes: number; lastInsertRowid: number | bigint | null }>`

```ts
const db = container.feature('sqlite', { path: 'app.db' })
const { changes, lastInsertRowid } = await db.execute(
 'INSERT INTO users (email) VALUES (?)',
 ['hello@example.com']
)
console.log(`Inserted row ${lastInsertRowid}, ${changes} change(s)`)
```



### sql

Safe tagged-template SQL helper. Values become bound parameters automatically, preventing SQL injection.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `strings` | `TemplateStringsArray` | ✓ | Template literal string segments |
| `values` | `SqlValue[]` | ✓ | Interpolated values that become bound `?` parameters |

**Returns:** `Promise<T[]>`

```ts
const db = container.feature('sqlite', { path: 'app.db' })
const email = 'hello@example.com'
const rows = await db.sql<{ id: number }>`
 SELECT id FROM users WHERE email = ${email}
`
```



### close

Closes the sqlite database and updates feature state. Emits `closed` after the database handle is released.

**Returns:** `void`

```ts
const db = container.feature('sqlite', { path: 'app.db' })
// ... run queries ...
db.close()
```



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `db` | `any` | Returns the underlying Bun sqlite database instance. |

## Events (Zod v4 schema)

### query

Event emitted by Sqlite



### error

Event emitted by Sqlite



### execute

Event emitted by Sqlite



### closed

Event emitted by Sqlite



## Examples

**features.sqlite**

```ts
const sqlite = container.feature('sqlite', { path: 'data/app.db' })

await sqlite.execute(
 'create table if not exists users (id integer primary key, email text not null unique)'
)

await sqlite.execute('insert into users (email) values (?)', ['hello@example.com'])

const users = await sqlite.sql<{ id: number; email: string }>`
 select id, email from users where email = ${'hello@example.com'}
`
```



**query**

```ts
const db = container.feature('sqlite', { path: 'app.db' })
const users = await db.query<{ id: number; email: string }>(
 'SELECT id, email FROM users WHERE active = ?',
 [1]
)
```



**execute**

```ts
const db = container.feature('sqlite', { path: 'app.db' })
const { changes, lastInsertRowid } = await db.execute(
 'INSERT INTO users (email) VALUES (?)',
 ['hello@example.com']
)
console.log(`Inserted row ${lastInsertRowid}, ${changes} change(s)`)
```



**sql**

```ts
const db = container.feature('sqlite', { path: 'app.db' })
const email = 'hello@example.com'
const rows = await db.sql<{ id: number }>`
 SELECT id FROM users WHERE email = ${email}
`
```



**close**

```ts
const db = container.feature('sqlite', { path: 'app.db' })
// ... run queries ...
db.close()
```

