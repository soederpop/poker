---
title: Google Features
tags: [google, drive, sheets, calendar, docs, oauth2, service-account, auth, api]
---

# Google Features

Luca provides five features for working with Google APIs: authentication, Drive files, Sheets data, Calendar events, and Docs-as-markdown. All are built on the official `googleapis` package.

## Setting Up Google Cloud Credentials

Before using any Google feature, you need credentials from a Google Cloud project.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** > **New Project**
3. Name it (e.g. "Luca Integration") and click **Create**

### Step 2: Enable the APIs

In your project, go to **APIs & Services > Library** and enable:

- **Google Drive API**
- **Google Sheets API**
- **Google Calendar API**
- **Google Docs API**

Click each one and hit **Enable**.

### Step 3a: OAuth2 Credentials (for personal/interactive use)

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. If prompted, configure the **OAuth consent screen** first:
   - Choose **External** (or Internal if using Google Workspace)
   - Fill in app name and your email for support/developer contact
   - Add scopes: `drive.readonly`, `spreadsheets.readonly`, `calendar.readonly`, `documents.readonly`
   - Add yourself as a test user
4. Back in **Credentials**, create an **OAuth client ID**:
   - Application type: **Desktop app** (or Web application)
   - For Desktop app, no redirect URI is needed (Luca handles it)
   - For Web application, add `http://localhost:9876/oauth2callback` as an authorized redirect URI
5. Download or copy the **Client ID** and **Client Secret**

Set them as environment variables in your `.env`:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Step 3b: Service Account Credentials (for servers/automation)

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service account**
3. Name it and click **Create and Continue**
4. Grant it appropriate roles (e.g. Viewer) and click **Done**
5. Click on the service account > **Keys** tab > **Add Key > Create new key > JSON**
6. Save the downloaded JSON key file

Set the path as an environment variable:

```
GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
```

**Important:** For service accounts to access your personal files, you must share Drive files/folders, Sheets, and Calendars with the service account's email address (found in the JSON key file as `client_email`).

## Authentication

### OAuth2 (Interactive)

Opens a browser for Google consent. Best for personal/development use:

```typescript
const auth = container.feature('googleAuth', {
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/documents.readonly',
  ],
})

// Opens browser, waits for consent, stores refresh token
await auth.authorize()

console.log(auth.isAuthenticated)  // true
console.log(auth.state.get('email'))  // your Google email
```

On subsequent runs, the refresh token is automatically restored from the disk cache -- no browser needed:

```typescript
const auth = container.feature('googleAuth')
const restored = await auth.tryRestoreTokens()

if (restored) {
  console.log('Authenticated from cached token')
} else {
  await auth.authorize()
}
```

### Service Account (Non-Interactive)

No browser needed. Best for servers and automation:

```typescript
const auth = container.feature('googleAuth', {
  serviceAccountKeyPath: '/path/to/key.json',
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})

await auth.authenticateServiceAccount()
```

Or pass the key object directly:

```typescript
const key = JSON.parse(fs.readFileSync('/path/to/key.json', 'utf-8'))

const auth = container.feature('googleAuth', {
  serviceAccountKey: key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})

await auth.authenticateServiceAccount()
```

### Auth Events

```typescript
auth.on('authenticated', ({ mode, email }) => {
  console.log(`Signed in via ${mode} as ${email}`)
})

auth.on('tokenRefreshed', () => {
  console.log('Access token refreshed automatically')
})

auth.on('error', (err) => {
  console.error('Auth error:', err.message)
})
```

### Revoking Credentials

```typescript
await auth.revoke()  // Revokes tokens and clears cached refresh token
```

## Google Drive

List, search, browse, and download files from Google Drive.

```typescript
const drive = container.feature('googleDrive')
```

### List Files

```typescript
// List recent files
const { files } = await drive.listFiles()

// With a Drive query filter
const { files: pdfs } = await drive.listFiles("mimeType = 'application/pdf'")

// Paginate
const page1 = await drive.listFiles(undefined, { pageSize: 10 })
const page2 = await drive.listFiles(undefined, { pageSize: 10, pageToken: page1.nextPageToken })
```

### Search

```typescript
// Search by name and content
const { files } = await drive.search('quarterly report')

// Filter by MIME type
const { files: slides } = await drive.search('presentation', {
  mimeType: 'application/vnd.google-apps.presentation',
})

// Search within a folder
const { files: inFolder } = await drive.search('notes', {
  inFolder: 'folder-id-here',
})
```

### Browse Folders

```typescript
// Browse root
const root = await drive.browse()
console.log('Folders:', root.folders.map(f => f.name))
console.log('Files:', root.files.map(f => f.name))

// Browse a specific folder
const contents = await drive.browse('folder-id-here')

// List a folder's contents (flat list)
const { files } = await drive.listFolder('folder-id-here')
```

### Download Files

```typescript
// Get file metadata
const file = await drive.getFile('file-id')
console.log(file.name, file.mimeType, file.size)

// Download as Buffer
const buffer = await drive.download('file-id')

// Download to local disk
const savedPath = await drive.downloadTo('file-id', './downloads/report.pdf')

// Export a Google Workspace file (Docs, Sheets, Slides) to another format
const pdfBuffer = await drive.exportFile('doc-id', 'application/pdf')
const csvBuffer = await drive.exportFile('sheet-id', 'text/csv')
```

### Shared Drives

```typescript
const sharedDrives = await drive.listDrives()

// List files from a shared drive
const { files } = await drive.listFiles(undefined, { corpora: 'allDrives' })
```

## Google Sheets

Read spreadsheet data as JSON objects, CSV strings, or raw 2D arrays.

```typescript
const sheets = container.feature('googleSheets', {
  defaultSpreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
})
```

You can find the spreadsheet ID in the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### Read as JSON

The first row becomes object keys, subsequent rows become values:

```typescript
// Read the first sheet
const data = await sheets.getAsJson()
// => [{ Name: 'Alice', Age: '30', City: 'Austin' }, { Name: 'Bob', Age: '25', City: 'Denver' }]

// Read a specific tab
const revenue = await sheets.getAsJson('Q4 Revenue')

// Read from a different spreadsheet
const other = await sheets.getAsJson('Sheet1', 'other-spreadsheet-id')
```

### Read as CSV

```typescript
const csv = await sheets.getAsCsv('Sheet1')
// => "Name,Age,City\nAlice,30,Austin\nBob,25,Denver"
```

### Read Raw Ranges

```typescript
// A1 notation
const values = await sheets.getRange('Sheet1!A1:D10')
// => [['Name', 'Age', 'City'], ['Alice', '30', 'Austin'], ...]

// Entire sheet
const all = await sheets.getRange('Sheet1')
```

### Save to Files

```typescript
await sheets.saveAsJson('./data/export.json')
await sheets.saveAsJson('./data/revenue.json', 'Revenue')

await sheets.saveAsCsv('./data/export.csv')
await sheets.saveAsCsv('./data/revenue.csv', 'Revenue')
```

### Spreadsheet Metadata

```typescript
const meta = await sheets.getSpreadsheet()
console.log(meta.title)
console.log(meta.sheets)  // [{ sheetId, title, rowCount, columnCount }, ...]

// Just the tab list
const tabs = await sheets.listSheets()
tabs.forEach(t => console.log(t.title, `${t.rowCount} rows`))
```

## Google Calendar

List calendars and read events with convenience methods for common queries.

```typescript
const calendar = container.feature('googleCalendar', {
  timeZone: 'America/Chicago',
})
```

### List Calendars

```typescript
const calendars = await calendar.listCalendars()
calendars.forEach(c => {
  console.log(`${c.primary ? '★' : ' '} ${c.summary} (${c.id})`)
})
```

### Today's Events

```typescript
const today = await calendar.getToday()
today.forEach(event => {
  const time = event.start.dateTime
    ? new Date(event.start.dateTime).toLocaleTimeString()
    : 'All day'
  console.log(`${time} - ${event.summary}`)
})
```

### Upcoming Events

```typescript
// Next 7 days
const upcoming = await calendar.getUpcoming(7)

// Next 30 days
const month = await calendar.getUpcoming(30)

// From a specific calendar
const work = await calendar.getUpcoming(7, 'work-calendar-id')
```

### Search Events

```typescript
const standups = await calendar.searchEvents('standup')
const reviews = await calendar.searchEvents('review', {
  timeMin: '2026-03-01T00:00:00Z',
  timeMax: '2026-03-31T23:59:59Z',
})
```

### List Events with Full Options

```typescript
const { events, nextPageToken } = await calendar.listEvents({
  calendarId: 'primary',
  timeMin: new Date().toISOString(),
  timeMax: new Date(Date.now() + 14 * 86400000).toISOString(),
  maxResults: 50,
  orderBy: 'startTime',
})

events.forEach(e => {
  console.log(e.summary, e.start, e.location, e.attendees?.length)
})
```

### Get a Single Event

```typescript
const event = await calendar.getEvent('event-id-here')
console.log(event.summary, event.description, event.attendees)
```

## Google Docs

Read Google Docs and convert them to Markdown or plain text.

```typescript
const docs = container.feature('googleDocs')
```

You can find the document ID in the URL: `https://docs.google.com/document/d/{DOCUMENT_ID}/edit`

### Convert to Markdown

```typescript
const markdown = await docs.getAsMarkdown('document-id')
console.log(markdown)
```

The converter handles:
- Headings (H1-H6)
- **Bold**, *italic*, ~~strikethrough~~
- [Links](url)
- `Code spans` (Courier/monospace fonts)
- Ordered and unordered lists with nesting
- Tables (markdown pipe format)
- Images (`![alt](url)`)
- Section breaks (`---`)

### Save as Markdown File

```typescript
const path = await docs.saveAsMarkdown('document-id', './docs/imported.md')
console.log(`Saved to ${path}`)
```

### Plain Text

```typescript
const text = await docs.getAsText('document-id')
```

### Raw Document Structure

```typescript
const doc = await docs.getDocument('document-id')
console.log(doc.title)
console.log(doc.body?.content)  // Array of structural elements
console.log(doc.lists)           // List definitions
console.log(doc.inlineObjects)   // Embedded images
```

### List and Search Docs

```typescript
// List all Google Docs in your Drive
const allDocs = await docs.listDocs()
allDocs.forEach(d => console.log(d.name, d.id))

// Filter by name
const reports = await docs.listDocs('report')

// Full-text search
const results = await docs.searchDocs('quarterly earnings')
```

## Common Patterns

### Authenticate Once, Use Everywhere

All Google features share the same `googleAuth` instance. Authenticate once and every feature picks it up:

```typescript
// Auth first
const auth = container.feature('googleAuth')
await auth.authorize()

// All features auto-use the authenticated client
const drive = container.feature('googleDrive')
const sheets = container.feature('googleSheets')
const calendar = container.feature('googleCalendar')
const docs = container.feature('googleDocs')

// No additional auth needed
const files = await drive.listFiles()
const events = await calendar.getToday()
```

### Download a Google Doc as Markdown via Drive Export

Two approaches -- the Docs API (richer formatting) or Drive export (simpler):

```typescript
// Approach 1: Docs API with full markdown conversion (recommended)
const docs = container.feature('googleDocs')
const markdown = await docs.getAsMarkdown('doc-id')

// Approach 2: Drive export as plain text
const drive = container.feature('googleDrive')
const buffer = await drive.exportFile('doc-id', 'text/plain')
const plainText = buffer.toString('utf-8')
```

### Batch Download Sheets as JSON

```typescript
const drive = container.feature('googleDrive')
const sheets = container.feature('googleSheets')

// Find all spreadsheets in a folder
const { files } = await drive.listFolder('folder-id')
const spreadsheets = files.filter(f => f.mimeType === 'application/vnd.google-apps.spreadsheet')

for (const file of spreadsheets) {
  const data = await sheets.getAsJson(undefined, file.id)
  await container.fs.writeFileAsync(
    container.paths.resolve(`./data/${file.name}.json`),
    JSON.stringify(data, null, 2)
  )
  console.log(`Exported ${file.name}: ${data.length} rows`)
}
```

### Error Handling

All features emit `error` events and update `lastError` in state:

```typescript
const drive = container.feature('googleDrive')

drive.on('error', (err) => {
  console.error('Drive error:', err.message)
})

try {
  await drive.download('invalid-id')
} catch (err) {
  console.log(drive.state.get('lastError'))
}
```

## Scopes Reference

Use the narrowest scopes needed. All default to readonly:

| Scope | Access |
|-------|--------|
| `drive.readonly` | View and download Drive files |
| `drive` | Full read/write access to Drive |
| `spreadsheets.readonly` | Read spreadsheet data |
| `spreadsheets` | Read and write spreadsheet data |
| `calendar.readonly` | View calendar events |
| `calendar` | Full calendar access |
| `documents.readonly` | View document content |
| `documents` | Full document access |

Full scope URLs follow the pattern: `https://www.googleapis.com/auth/{scope}`
