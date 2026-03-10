# GoogleSheets (features.googleSheets)

Google Sheets feature for reading spreadsheet data as JSON, CSV, or raw arrays. Depends on the googleAuth feature for authentication. Creates a Sheets v4 API client lazily and provides convenient methods for reading tabular data.

## Usage

```ts
container.feature('googleSheets', {
  // Default spreadsheet ID for operations
  defaultSpreadsheetId,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `defaultSpreadsheetId` | `string` | Default spreadsheet ID for operations |

## Methods

### getSpreadsheet

Get spreadsheet metadata including title, locale, and sheet list.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `spreadsheetId` | `string` |  | The spreadsheet ID (defaults to options.defaultSpreadsheetId) |

**Returns:** `Promise<SpreadsheetMeta>`



### listSheets

List all sheets (tabs) in a spreadsheet.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `spreadsheetId` | `string` |  | The spreadsheet ID |

**Returns:** `Promise<SheetInfo[]>`



### getRange

Read a range of values from a sheet.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `range` | `string` | ✓ | A1 notation range (e.g. "Sheet1!A1:D10" or "Sheet1" for entire sheet) |
| `spreadsheetId` | `string` |  | The spreadsheet ID |

**Returns:** `Promise<string[][]>`



### getAsJson

Read a sheet as an array of JSON objects. The first row is treated as headers; subsequent rows become objects keyed by those headers.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sheetName` | `string` |  | Name of the sheet tab (if omitted, reads the first sheet) |
| `spreadsheetId` | `string` |  | The spreadsheet ID |

**Returns:** `Promise<T[]>`



### getAsCsv

Read a sheet and return it as a CSV string.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sheetName` | `string` |  | Name of the sheet tab (if omitted, reads the first sheet) |
| `spreadsheetId` | `string` |  | The spreadsheet ID |

**Returns:** `Promise<string>`



### saveAsJson

Download sheet data as JSON and save to a local file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `localPath` | `string` | ✓ | Local file path (resolved relative to container cwd) |
| `sheetName` | `string` |  | Sheet tab name (defaults to first sheet) |
| `spreadsheetId` | `string` |  | The spreadsheet ID |

**Returns:** `Promise<string>`



### saveAsCsv

Download sheet data as CSV and save to a local file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `localPath` | `string` | ✓ | Local file path (resolved relative to container cwd) |
| `sheetName` | `string` |  | Sheet tab name (defaults to first sheet) |
| `spreadsheetId` | `string` |  | The spreadsheet ID |

**Returns:** `Promise<string>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `auth` | `GoogleAuth` | Access the google-auth feature lazily. |

## Events (Zod v4 schema)

### error

Event emitted by GoogleSheets



### dataFetched

Event emitted by GoogleSheets



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `lastSpreadsheetId` | `string` | Last spreadsheet ID accessed |
| `lastSheetName` | `string` | Last sheet/tab name accessed |
| `lastRowCount` | `number` | Number of rows returned in last read |
| `lastError` | `string` | Last Sheets API error message |

## Examples

**features.googleSheets**

```ts
const sheets = container.feature('googleSheets', {
 defaultSpreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'
})

// Read as JSON objects (first row = headers)
const data = await sheets.getAsJson('Sheet1')
// => [{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }]

// Read as CSV string
const csv = await sheets.getAsCsv('Revenue')

// Read a specific range
const values = await sheets.getRange('Sheet1!A1:D10')

// Save to file
await sheets.saveAsJson('./data/export.json')
```

