# GoogleAuth (features.googleAuth)

Google authentication feature supporting OAuth2 browser flow and service account auth. Handles the complete OAuth2 lifecycle: authorization URL generation, local callback server, token exchange, refresh token storage (via diskCache), and automatic token refresh. Also supports non-interactive service account authentication via JSON key files. Other Google features (drive, sheets, calendar, docs) depend on this feature and access it lazily via `container.feature('googleAuth')`.

## Usage

```ts
container.feature('googleAuth', {
  // Authentication mode. Auto-detected if serviceAccountKeyPath is set
  mode,
  // OAuth2 client ID (falls back to GOOGLE_CLIENT_ID env var)
  clientId,
  // OAuth2 client secret (falls back to GOOGLE_CLIENT_SECRET env var)
  clientSecret,
  // Path to service account JSON key file (falls back to GOOGLE_SERVICE_ACCOUNT_KEY env var)
  serviceAccountKeyPath,
  // Service account key as a parsed JSON object (alternative to file path)
  serviceAccountKey,
  // OAuth2 scopes to request
  scopes,
  // Port for OAuth2 callback server (falls back to GOOGLE_OAUTH_REDIRECT_PORT env var, then 3000)
  redirectPort,
  // DiskCache key for storing OAuth2 refresh token
  tokenCacheKey,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `string` | Authentication mode. Auto-detected if serviceAccountKeyPath is set |
| `clientId` | `string` | OAuth2 client ID (falls back to GOOGLE_CLIENT_ID env var) |
| `clientSecret` | `string` | OAuth2 client secret (falls back to GOOGLE_CLIENT_SECRET env var) |
| `serviceAccountKeyPath` | `string` | Path to service account JSON key file (falls back to GOOGLE_SERVICE_ACCOUNT_KEY env var) |
| `serviceAccountKey` | `object` | Service account key as a parsed JSON object (alternative to file path) |
| `scopes` | `array` | OAuth2 scopes to request |
| `redirectPort` | `number` | Port for OAuth2 callback server (falls back to GOOGLE_OAUTH_REDIRECT_PORT env var, then 3000) |
| `tokenCacheKey` | `string` | DiskCache key for storing OAuth2 refresh token |

## Methods

### getOAuth2Client

Get the OAuth2Client instance, creating it lazily. After authentication, this client has valid credentials set.

**Returns:** `OAuth2Client`



### getAuthClient

Get the authenticated auth client for passing to googleapis service constructors. Handles token refresh automatically for OAuth2. For service accounts, returns the JWT auth client.

**Returns:** `Promise<OAuth2Client | ReturnType<typeof google.auth.fromJSON>>`



### authorize

Start the OAuth2 authorization flow. 1. Spins up a temporary Express callback server on a free port 2. Generates the Google authorization URL 3. Opens the browser to the consent page 4. Waits for the callback with the authorization code 5. Exchanges the code for access + refresh tokens 6. Stores the refresh token in diskCache 7. Shuts down the callback server

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `scopes` | `string[]` |  | OAuth2 scopes to request (defaults to options.scopes or defaultScopes) |

**Returns:** `Promise<this>`



### authenticateServiceAccount

Authenticate using a service account JSON key file. Reads the key from options.serviceAccountKeyPath, options.serviceAccountKey, or the GOOGLE_SERVICE_ACCOUNT_KEY env var.

**Returns:** `Promise<this>`



### tryRestoreTokens

Attempt to restore authentication from a cached refresh token. Called automatically by getAuthClient() if not yet authenticated.

**Returns:** `Promise<boolean>`



### revoke

Revoke the current credentials and clear cached tokens.

**Returns:** `Promise<this>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `clientId` | `string` | OAuth2 client ID from options or GOOGLE_CLIENT_ID env var. |
| `clientSecret` | `string` | OAuth2 client secret from options or GOOGLE_CLIENT_SECRET env var. |
| `authMode` | `'oauth2' | 'service-account'` | Resolved authentication mode based on options. |
| `isAuthenticated` | `boolean` | Whether valid credentials are currently available. |
| `defaultScopes` | `string[]` | Default scopes covering Drive, Sheets, Calendar, and Docs read access. |
| `redirectPort` | `number` | Resolved redirect port from options, GOOGLE_OAUTH_REDIRECT_PORT env var, or default 3000. |
| `tokenCacheKey` | `string` | DiskCache key used for storing the refresh token. |

## Events (Zod v4 schema)

### tokenRefreshed

Event emitted by GoogleAuth



### error

Event emitted by GoogleAuth



### authorizationRequired

Event emitted by GoogleAuth



### authenticated

Event emitted by GoogleAuth



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `authMode` | `string` | Current authentication mode |
| `isAuthenticated` | `boolean` | Whether valid credentials are currently available |
| `email` | `string` | Authenticated user or service account email |
| `scopes` | `array` | OAuth2 scopes that have been authorized |
| `tokenExpiry` | `string` | ISO timestamp when the current access token expires |
| `lastError` | `string` | Last authentication error message |

## Environment Variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `GOOGLE_OAUTH_REDIRECT_PORT`

## Examples

**features.googleAuth**

```ts
// OAuth2 flow — opens browser for consent
const auth = container.feature('googleAuth', {
 clientId: 'your-client-id.apps.googleusercontent.com',
 clientSecret: 'your-secret',
 scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})
await auth.authorize()

// Service account flow — no browser needed
const auth = container.feature('googleAuth', {
 serviceAccountKeyPath: '/path/to/key.json',
 scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
await auth.authenticateServiceAccount()
```

