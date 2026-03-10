---
title: "PostgreSQL"
tags: [postgres, database, sql, storage]
lastTested: null
lastTestPassed: null
---

# postgres

PostgreSQL feature for safe SQL execution through Bun's native SQL client. Supports parameterized queries, tagged-template literals, and write operations.

## Overview

Use the `postgres` feature when you need to interact with a PostgreSQL database. It provides three query interfaces: parameterized `query()` for reads, `execute()` for writes, and the `sql` tagged template for injection-safe inline SQL.

Requires a running PostgreSQL instance and a connection URL.

## Enabling the Feature

```ts
const pg = container.feature('postgres', {
  url: 'postgres://user:pass@localhost:5432/mydb'
})
console.log('Postgres feature created')
console.log('Connection URL configured:', !!pg.state.url)
```

Pass your connection URL via the `url` option. In production, read from an environment variable.

## API Documentation

```ts
const info = await container.features.describe('postgres')
console.log(info)
```

## Parameterized Queries

Use `query()` for SELECT statements with `$N` placeholders to prevent SQL injection.

```ts skip
const users = await pg.query(
  'SELECT id, email FROM users WHERE active = $1 LIMIT $2',
  [true, 10]
)
console.log(`Found ${users.length} active users`)
users.forEach(u => console.log(`  ${u.id}: ${u.email}`))
```

With a running database, this would return an array of row objects matching the query. The `query` event fires on each execution.

## Tagged Template SQL

The `sql` tagged template automatically converts interpolated values into bound parameters.

```ts skip
const email = 'hello@example.com'
const rows = await pg.sql`
  SELECT id, name FROM users WHERE email = ${email}
`
console.log('Found:', rows)
```

This is the most ergonomic way to write queries. Each interpolated value becomes a `$N` parameter automatically, preventing SQL injection without manual placeholder numbering.

## Write Operations

Use `execute()` for INSERT, UPDATE, and DELETE statements that return affected row counts.

```ts skip
const { rowCount } = await pg.execute(
  'UPDATE users SET active = $1 WHERE last_login < $2',
  [false, '2024-01-01']
)
console.log(`Deactivated ${rowCount} users`)
```

The `execute` event fires with the row count after each write operation.

## Closing the Connection

```ts skip
await pg.close()
console.log('Connection closed:', !pg.state.connected)
```

Always close the connection when done. The `closed` event fires after teardown.

## Summary

The `postgres` feature wraps Bun's native SQL client with three query methods: `query()` for parameterized reads, `execute()` for writes, and the `sql` tagged template for ergonomic injection-safe queries. Events fire for each operation. Key methods: `query()`, `execute()`, `sql`, `close()`.
