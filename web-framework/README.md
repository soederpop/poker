# luca-poker web-framework

React + TypeScript SPA rewrite of the legacy `web/` poker pages.

## Overview

- Entry URL: `/` (redirects to `/app/`)
- Routing: hash routes (`#/leaderboard`, `#/spectator`, etc.)
- Build: Bun bundling TSX to `public/dist/app.js`
- React runtime: CDN importmap (`esm.sh`) from `public/index.html`
- Assets: shared symlink to legacy spectator assets (`public/assets -> ../../web/spectator/assets`)

## Routes

- `#/` home navigation
- `#/leaderboard`
- `#/tournaments`
- `#/agent?id=<botId>`
- `#/spectator`
- `#/spectator-debug`
- `#/spectator-fixtures`

## Build

From the project root:

```bash
bun run web-framework/build.ts
```

This writes:

- `web-framework/public/dist/app.js`
- `web-framework/public/dist/app.js.map`

(`main.js` artifacts are also emitted by Bun and retained.)

## Run with Poker Server

From the project root:

```bash
luca poker serve \
  --port 3000 \
  --wsPort 3001 \
  --spectatorPort 3002
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/app/`

The server serves this SPA under `/app/` and keeps legacy `/web/*` URLs as redirects.

## Implementation Notes

- App root is wrapped in Luca React `ContainerProvider` (`src/main.tsx`) using a browser `WebContainer` (`src/framework/container.ts`).
- Spectator stream lifecycle now lives in Luca feature state (`src/framework/features/spectator-runtime.ts`) and uses a Luca client (`src/framework/clients/poker-spectator-ws.ts`).
- Seat layout editor state is a Luca feature (`src/framework/features/seat-layout-editor.ts`) so it can be toggled from console/container-link and observed reactively.
- Shared table rendering and seat layout visuals are centralized in `src/components/table/*` and `src/lib/seat-layout.ts`.
- Theme switching is route-driven via `data-theme` and scoped CSS classes (`theme-light`, `theme-dark`).
