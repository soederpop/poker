---
title: "Google Calendar"
tags: [googleCalendar, google, calendar, events, scheduling]
lastTested: null
lastTestPassed: null
---

# googleCalendar

Google Calendar feature for listing calendars and reading events. Creates a Calendar v3 API client and depends on `googleAuth` for authentication.

## Overview

Use the `googleCalendar` feature when you need to read calendar data: list calendars, fetch today's events, look ahead at upcoming days, or search events by text. Provides convenience methods for common time-based queries alongside the full `listEvents()` for custom ranges.

Requires Google OAuth2 credentials or a service account with Calendar access.

## Enabling the Feature

```ts
const calendar = container.feature('googleCalendar', {
  defaultCalendarId: 'primary',
  timeZone: 'America/Chicago'
})
console.log('Google Calendar feature created')
console.log('Default calendar:', calendar.defaultCalendarId)
```

## API Documentation

```ts
const info = await container.features.describe('googleCalendar')
console.log(info)
```

## Listing Calendars

Discover all calendars accessible to the authenticated user.

```ts skip
const calendars = await calendar.listCalendars()
calendars.forEach(c => console.log(`  ${c.summary} (${c.id})`))
```

Returns calendar metadata including ID, summary, time zone, and access role. Use the ID to target specific calendars in other methods.

## Today's Events and Upcoming

Quick methods for the most common queries.

```ts skip
const today = await calendar.getToday()
console.log(`Today: ${today.length} events`)
today.forEach(e => console.log(`  ${e.start} - ${e.summary}`))

const upcoming = await calendar.getUpcoming(7)
console.log(`Next 7 days: ${upcoming.length} events`)
upcoming.forEach(e => console.log(`  ${e.start} - ${e.summary}`))
```

`getToday()` returns events from midnight to midnight in the configured timezone. `getUpcoming(days)` looks ahead the specified number of days from now.

## Searching Events

Search across event summaries, descriptions, and locations.

```ts skip
const meetings = await calendar.searchEvents('standup')
console.log(`Found ${meetings.length} standup events`)
meetings.forEach(e => console.log(`  ${e.start} - ${e.summary}`))
```

The search is freetext and matches against multiple event fields. Combine with time range options for more precise results.

## Custom Time Range Queries

Use `listEvents()` for full control over the query parameters.

```ts skip
const events = await calendar.listEvents({
  timeMin: '2026-03-01T00:00:00Z',
  timeMax: '2026-03-31T23:59:59Z',
  maxResults: 50,
  orderBy: 'startTime',
  singleEvents: true
})
console.log(`March events: ${events.items.length}`)
```

Supports pagination via `pageToken`, ordering by `startTime` or `updated`, and filtering by calendar ID.

## Summary

The `googleCalendar` feature provides read access to Google Calendar events. Use the convenience methods `getToday()` and `getUpcoming()` for quick lookups, `searchEvents()` for text search, or `listEvents()` for full query control. Authentication is handled by `googleAuth`. Key methods: `listCalendars()`, `getToday()`, `getUpcoming()`, `searchEvents()`, `listEvents()`.
