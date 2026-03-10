---
title: "Google Auth"
tags: [googleAuth, google, oauth2, authentication, service-account]
lastTested: null
lastTestPassed: null
---

# googleAuth

Google authentication feature supporting OAuth2 browser flow and service account auth. Handles the complete OAuth2 lifecycle including token refresh and secure storage via diskCache.

## Overview

Use the `googleAuth` feature to authenticate with Google APIs. It supports two modes: OAuth2 (opens a browser for user consent) and service account (non-interactive, uses a JSON key file). Other Google features (drive, sheets, calendar, docs) depend on this feature automatically.

Requires either `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables for OAuth2, or a service account key file.

## Enabling the Feature

```ts
const auth = container.feature('googleAuth')
console.log('Auth mode:', auth.authMode)
console.log('Authenticated:', auth.isAuthenticated)
```

The feature reads `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the environment automatically. You can also pass `clientId` and `clientSecret` as options.

## API Documentation

```ts
const info = await container.features.describe('googleAuth')
console.log(info)
```

## OAuth2 Authorization Flow

The `authorize()` method starts the full OAuth2 browser flow: it spins up a local callback server, opens the consent page, exchanges the code for tokens, and caches the refresh token.

```ts skip
const auth = container.feature('googleAuth', {
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
})
await auth.authorize()
console.log('Authenticated:', auth.isAuthenticated)
console.log('Scopes:', auth.state.scopes)
```

When running with valid credentials, this opens a browser to Google's consent page. After approval, tokens are stored in diskCache and automatically refreshed on expiry.

## Service Account Authentication

For server-to-server auth without a browser, use a service account JSON key file.

```ts skip
const auth = container.feature('googleAuth', {
  mode: 'service-account',
  serviceAccountKeyPath: '/path/to/service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
})
await auth.authenticateServiceAccount()
console.log('Service account email:', auth.state.email)
```

Service accounts are ideal for automation, CI/CD, and background services that need Google API access without user interaction.

## Token Management

Tokens are cached automatically and restored on subsequent runs. You can also revoke credentials.

```ts skip
// Attempt to restore from cache (called automatically)
const restored = await auth.tryRestoreTokens()
console.log('Restored from cache:', restored)

// Get the auth client for passing to Google API constructors
const client = await auth.getAuthClient()
console.log('Auth client ready')

// Revoke and clear cached tokens
await auth.revoke()
console.log('Credentials revoked')
```

The `tokenRefreshed` event fires when tokens are automatically refreshed, and `authenticated` fires after successful authentication.

## Summary

The `googleAuth` feature provides the authentication layer for all Google API features. It supports OAuth2 browser flow and service accounts, with automatic token refresh and diskCache storage. Other Google features (drive, sheets, calendar, docs) use it automatically. Key methods: `authorize()`, `authenticateServiceAccount()`, `getAuthClient()`, `revoke()`.
