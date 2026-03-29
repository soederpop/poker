# Demo Checklist

## Before the demo
- `bun run build:wasm`
- `bun run test`
- optional: `bun run compile`
- free local ports 3000-3002
- one known-good bot token available
- one known-good situation doc available
- one browser tab open to `/leaderboard` or `/spectator`

## Recommended show flow
1. show one offline analysis command
2. show one situation-driven sim with a fixed seed
3. start the local arena
4. register or seed bots
5. join with a custom bot
6. spectate one table
7. make one visible `strategy.ts` change and rerun
8. only then talk about the regret-minimizer roadmap

## Fallbacks
- if the arena is flaky, stay in offline-analysis mode
- if join tokens are messy, use seeded bots
- if spectator output is noisy, use leaderboard plus terminal watch
- if compiled mode is unavailable, state clearly that source mode and compiled mode share the same command surface
