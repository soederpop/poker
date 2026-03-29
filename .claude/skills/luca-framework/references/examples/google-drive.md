---
title: "Google Drive"
tags: [googleDrive, google, drive, files, storage]
lastTested: null
lastTestPassed: null
---

# googleDrive

Google Drive feature for listing, searching, browsing, and downloading files. Creates a Drive v3 API client and depends on `googleAuth` for authentication.

## Overview

Use the `googleDrive` feature when you need to interact with Google Drive: list files, search by name or content, browse folder hierarchies, download files, or export Google Workspace documents. Authentication is handled automatically via the `googleAuth` feature.

Requires Google OAuth2 credentials or a service account with Drive access.

## Enabling the Feature

```ts
const drive = container.feature('googleDrive', {
  pageSize: 50
})
console.log('Google Drive feature created')
console.log('Default page size:', 50)
```

## API Documentation

```ts
const info = await container.features.describe('googleDrive')
console.log(info)
```

## Listing and Searching Files

List recent files or search by name, content, or MIME type.

```ts skip
const { files } = await drive.listFiles()
console.log(`Found ${files.length} files:`)
files.slice(0, 5).forEach(f => console.log(`  ${f.name} (${f.mimeType})`))

const { files: pdfs } = await drive.search('quarterly report', {
  mimeType: 'application/pdf'
})
console.log(`Found ${pdfs.length} matching PDFs`)
```

The `listFiles()` method accepts an optional Drive query string for filtering. The `search()` method provides a simpler interface for text-based searches.

## Browsing Folders

Browse a folder to see its files and subfolders separately.

```ts skip
const root = await drive.browse()
console.log('Root folders:', root.folders.length)
console.log('Root files:', root.files.length)

const sub = await drive.browse('folder-id-here')
sub.folders.forEach(f => console.log(`  [dir] ${f.name}`))
sub.files.forEach(f => console.log(`  [file] ${f.name}`))
```

The `browse()` method defaults to the root folder and separates the results into `folders` and `files` for easy navigation.

## Downloading and Exporting

Download files to disk or export Google Workspace documents to other formats.

```ts skip
await drive.downloadTo('file-id', './downloads/report.pdf')
console.log('File downloaded')

const buffer = await drive.download('file-id')
console.log('Downloaded', buffer.length, 'bytes')

const csv = await drive.exportFile('sheet-id', 'text/csv')
console.log('Exported sheet as CSV:', csv.length, 'bytes')
```

Use `download()` for binary files and `exportFile()` for converting Google Docs, Sheets, or Slides to formats like PDF, CSV, or plain text.

## Shared Drives

```ts skip
const drives = await drive.listDrives()
drives.forEach(d => console.log(`  ${d.name} (${d.id})`))
```

List all shared drives the authenticated user has access to.

## Summary

The `googleDrive` feature provides complete Drive v3 API access for file management. Browse folders, search by content or type, download files, and export Workspace documents. Authentication is handled by `googleAuth`. Key methods: `listFiles()`, `search()`, `browse()`, `download()`, `downloadTo()`, `exportFile()`.
