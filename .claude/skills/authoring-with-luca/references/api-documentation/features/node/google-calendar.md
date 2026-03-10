# GoogleCalendar (features.googleCalendar)

Google Calendar feature for listing calendars and reading events. Depends on the googleAuth feature for authentication. Creates a Calendar v3 API client lazily. Provides convenience methods for today's events and upcoming days.

## Usage

```ts
container.feature('googleCalendar', {
  // Default calendar ID (default: "primary")
  defaultCalendarId,
  // Default timezone for event queries (e.g. "America/Chicago")
  timeZone,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `defaultCalendarId` | `string` | Default calendar ID (default: "primary") |
| `timeZone` | `string` | Default timezone for event queries (e.g. "America/Chicago") |

## Methods

### listCalendars

List all calendars accessible to the authenticated user.

**Returns:** `Promise<CalendarInfo[]>`



### listEvents

List events from a calendar within a time range.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `ListEventsOptions` |  | Filtering options including timeMin, timeMax, query, maxResults |

`ListEventsOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `calendarId` | `string` |  |
| `timeMin` | `string` |  |
| `timeMax` | `string` |  |
| `maxResults` | `number` |  |
| `query` | `string` |  |
| `orderBy` | `'startTime' | 'updated'` |  |
| `pageToken` | `string` |  |
| `singleEvents` | `boolean` |  |

**Returns:** `Promise<CalendarEventList>`



### getToday

Get today's events from a calendar.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `calendarId` | `string` |  | Calendar ID (defaults to options.defaultCalendarId or 'primary') |

**Returns:** `Promise<CalendarEvent[]>`



### getUpcoming

Get upcoming events for the next N days.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `days` | `number` |  | Number of days to look ahead (default: 7) |
| `calendarId` | `string` |  | Calendar ID |

**Returns:** `Promise<CalendarEvent[]>`



### getEvent

Get a single event by ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | `string` | ✓ | The event ID |
| `calendarId` | `string` |  | Calendar ID |

**Returns:** `Promise<CalendarEvent>`



### searchEvents

Search events by text query across event summaries, descriptions, and locations.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✓ | Freetext search term |
| `options` | `ListEventsOptions` |  | Additional listing options (timeMin, timeMax, calendarId, etc.) |

`ListEventsOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `calendarId` | `string` |  |
| `timeMin` | `string` |  |
| `timeMax` | `string` |  |
| `maxResults` | `number` |  |
| `query` | `string` |  |
| `orderBy` | `'startTime' | 'updated'` |  |
| `pageToken` | `string` |  |
| `singleEvents` | `boolean` |  |

**Returns:** `Promise<CalendarEvent[]>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `auth` | `GoogleAuth` | Access the google-auth feature lazily. |
| `defaultCalendarId` | `string` | Default calendar ID from options or 'primary'. |

## Events (Zod v4 schema)

### error

Event emitted by GoogleCalendar



### eventsFetched

Event emitted by GoogleCalendar



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `lastCalendarId` | `string` | Last calendar ID queried |
| `lastEventCount` | `number` | Number of events returned in last query |
| `lastError` | `string` | Last Calendar API error message |

## Examples

**features.googleCalendar**

```ts
const calendar = container.feature('googleCalendar')

// List all calendars
const calendars = await calendar.listCalendars()

// Get today's events
const today = await calendar.getToday()

// Get next 7 days of events
const upcoming = await calendar.getUpcoming(7)

// Search events
const meetings = await calendar.searchEvents('standup')

// List events in a time range
const events = await calendar.listEvents({
 timeMin: '2026-03-01T00:00:00Z',
 timeMax: '2026-03-31T23:59:59Z',
})
```

