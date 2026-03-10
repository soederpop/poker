---
title: "SQLite"
tags: [sqlite, database, sql, storage]
lastTested: null
lastTestPassed: null
---

# sqlite

In-process SQLite database via Bun's native binding. Create tables, insert rows, and query data with parameterized SQL or tagged templates.

## Overview

The `sqlite` feature is on-demand. Pass `{ path: ':memory:' }` for an in-memory database or a file path for persistence. It supports parameterized queries to prevent SQL injection and a convenient tagged-template syntax for inline SQL.

## Creating an In-Memory Database

Enable the feature with an in-memory path. No files are created on disk.

```ts
const db = container.feature('sqlite', { path: ':memory:' })
console.log('SQLite enabled:', db.state.get('enabled'))
```

The database is ready for queries immediately.

## Creating a Table

Use `execute()` for DDL and write statements.

```ts
await db.execute(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    active INTEGER DEFAULT 1
  )
`)
console.log('Table created')
```

The `execute()` method returns metadata including the number of changes and the last inserted row ID.

## Inserting Rows

Insert data using parameterized queries to keep values safe.

```ts
await db.execute('INSERT INTO users (name, email) VALUES (?, ?)', ['Alice', 'alice@example.com'])
await db.execute('INSERT INTO users (name, email) VALUES (?, ?)', ['Bob', 'bob@example.com'])
const result = await db.execute('INSERT INTO users (name, email, active) VALUES (?, ?, ?)', ['Charlie', 'charlie@example.com', 0])
console.log('Last insert ID:', result.lastInsertRowid)
console.log('Changes:', result.changes)
```

Each `?` placeholder is bound to the corresponding value in the array, preventing SQL injection.

## Querying Rows

Use `query()` for SELECT statements that return result rows.

```ts
const users = await db.query('SELECT * FROM users WHERE active = ?', [1])
console.log('Active users:')
users.forEach(u => console.log(`  ${u.id}: ${u.name} <${u.email}>`))
```

Results come back as an array of plain objects with column names as keys.

## Tagged Template Queries

The `sql` tagged template lets you write queries with inline interpolation that is still safely parameterized.

```ts
const emailDomain = '%example.com'
const rows = await db.sql`SELECT name, email FROM users WHERE email LIKE ${emailDomain}`
console.log('Users matching domain:')
rows.forEach(r => console.log(`  ${r.name}: ${r.email}`))
```

Interpolated values become bound parameters automatically. This combines readability with safety.

## Summary

This demo covered creating an in-memory SQLite database, defining tables, inserting rows with parameterized queries, reading data back, and using the tagged-template SQL syntax. The `sqlite` feature gives you a full relational database with zero setup.
