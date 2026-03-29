---
title: "Google Sheets"
tags: [googleSheets, google, sheets, spreadsheet, data]
lastTested: null
lastTestPassed: null
---

# googleSheets

Google Sheets feature for reading spreadsheet data as JSON, CSV, or raw arrays. Creates a Sheets v4 API client and depends on `googleAuth` for authentication.

## Overview

Use the `googleSheets` feature when you need to read data from Google Sheets. It provides convenient methods for reading ranges, converting rows to JSON objects (using the first row as headers), and exporting as CSV. You can set a default spreadsheet ID to avoid passing it on every call.

Requires Google OAuth2 credentials or a service account with Sheets access.

## Enabling the Feature

```ts
const sheets = container.feature('googleSheets', {
  defaultSpreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'
})
console.log('Google Sheets feature created')
console.log('Default spreadsheet configured:', !!sheets.options.defaultSpreadsheetId)
```

## API Documentation

```ts
const info = await container.features.describe('googleSheets')
console.log(info)
```

## Reading Data as JSON

The `getAsJson()` method treats the first row as headers and returns an array of objects.

```ts skip
const data = await sheets.getAsJson('Sheet1')
console.log(`Read ${data.length} rows`)
data.slice(0, 3).forEach(row => console.log(row))
// => [{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }, ...]
```

With a valid spreadsheet, this reads the first sheet tab and converts each row into a keyed object using the header row. Numeric values come through as strings by default.

## Reading Specific Ranges

Use A1 notation to read a precise cell range.

```ts skip
const values = await sheets.getRange('Sheet1!A1:D10')
console.log(`Got ${values.length} rows, ${values[0]?.length} columns`)
values.forEach(row => console.log(row.join(' | ')))
```

Returns a 2D array of strings. Useful when you need raw cell data without header interpretation.

## Exporting as CSV

```ts skip
const csv = await sheets.getAsCsv('Revenue')
console.log(csv)
```

Returns the entire sheet as a CSV-formatted string, ready for piping to files or other tools.

## Saving to Local Files

```ts skip
await sheets.saveAsJson('./data/export.json', 'Sheet1')
console.log('Saved JSON export')

await sheets.saveAsCsv('./data/export.csv', 'Revenue')
console.log('Saved CSV export')
```

Both methods write the file and return the resolved path. Paths are relative to the container's working directory.

## Spreadsheet Metadata

```ts skip
const meta = await sheets.getSpreadsheet()
console.log('Title:', meta.title)

const tabs = await sheets.listSheets()
tabs.forEach(t => console.log(`  Tab: ${t.title} (${t.rowCount} rows)`))
```

Inspect the spreadsheet structure before reading data.

## Summary

The `googleSheets` feature reads Google Sheets data in three formats: JSON objects, raw 2D arrays, and CSV strings. Set a default spreadsheet ID for convenience. Authentication is handled by `googleAuth`. Key methods: `getAsJson()`, `getRange()`, `getAsCsv()`, `saveAsJson()`, `saveAsCsv()`, `listSheets()`.
