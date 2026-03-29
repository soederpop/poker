# Play Mode Stabilization Handoff

> For Hermes: this is a resume-ready handoff for the in-flight `luca poker play` work. Finish the wiring, stabilize the TUI, then run focused validation before widening scope.

Goal: make `luca poker play` feel solid enough to use as the default human-vs-bot local play loop.

Architecture: keep `commands/poker.ts` thin and treat `lib/poker-play.ts` as the main implementation surface for the Ink TUI and bot-opponent orchestration. Favor a narrow validation pass for the `play` path instead of trying to clean up the repo-wide TypeScript noise right now.

Tech stack: Bun, Luca CLI command plumbing, Ink via Luca's `ink` feature, websocket poker client, local house-bot strategy profiles.

---

## Current state snapshot

Already in progress:
- `commands/poker.ts` now passes `viewOpponentHolecards` into `runPlayMode(...)`.
- `lib/poker-play.ts` exists and contains the new Ink play mode implementation.
- `lib/poker-play.ts` state now includes:
  - `villainCards: string[]`
  - `revealOpponentHolecards: boolean`
- `runPlay(...)` currently parses the opponent mostly from positional args, not from `options.vs`.

Important repo status:
- Modified: `commands/poker.ts`
- Untracked/new: `lib/poker-play.ts`
- Also dirty for unrelated work: `features/table-manager.ts`, `servers/poker-server.ts`, `test/integration/runtime.test.ts`

Important constraint:
- Do not get distracted by global TypeScript/lint noise. The repo currently emits many unrelated TS errors outside the `play` path.

---

## Known gaps to finish

1. Usage/help text says:
   - `play [http://localhost:3000] --vs balanced`
   but `runPlay(...)` currently resolves the opponent from positional args and ignores `options.vs`.
2. `--viewOpponentHolecards` is threaded into state, but the TUI does not yet render opponent cards.
3. `villainCards` exists in state but is not yet populated from showdown / hand result payloads.
4. Validation has not yet been run for the new `play` command path.
5. The command should be tested in realistic source-mode usage, not only by code inspection.

---

## Task 1: Finish command parsing and make help text true

Objective: make `luca poker play` accept both the documented flag form and the positional shorthand without ambiguity.

Files:
- Modify: `commands/poker.ts` around `runPlay(...)` near lines 2509-2521
- Verify usage/help text in `commands/poker.ts` around line 197

Steps:
1. Update `runPlay(...)` so opponent resolution prefers, in order:
   - explicit positional opponent when first arg is not a server URL
   - `options.vs`
   - fallback `balanced`
2. Preserve the existing shorthand forms:
   - `luca poker play balanced`
   - `luca poker play http://127.0.0.1:3000 balanced`
3. Ensure the documented form works too:
   - `luca poker play http://127.0.0.1:3000 --vs balanced`
   - `luca poker play --vs balanced`
4. Keep `serverBaseUrl` resolution simple:
   - if first positional arg looks like a URL, treat it as server
   - else use `options.server` or `http://127.0.0.1:${options.port}`
5. Re-read the usage text after the change and make sure it matches reality.

Success criteria:
- Both `--vs` and positional shorthand work.
- Help text is no longer misleading.

---

## Task 2: Plumb showdown / revealed hole-card data into `PlayState`

Objective: populate `state.villainCards` when the server reveals them, without depending on always-on cheating.

Files:
- Modify: `lib/poker-play.ts`

Implementation notes:
- Inspect `heroClient` message payloads during `hand_result`, showdown, or any reveal event.
- When a payload includes seat/player showdown cards for the non-hero seat, copy them into `state.villainCards`.
- On a fresh `deal`, reset `state.villainCards = []`.
- If the payload never reveals villain cards except at showdown, that is fine for now.

Likely touch points in `lib/poker-play.ts`:
- `message.type === "deal"`
- `message.type === "state"`
- `message.type === "hand_result"`
- any additional showdown/reveal message type discovered during runtime logging

Success criteria:
- Opponent cards are blank during normal play unless revealed by the game or the debug flag path intentionally shows them.
- Revealed showdown cards persist long enough to be visible in the completed-hand state/feed.

---

## Task 3: Render opponent hole cards cleanly in the Ink UI

Objective: expose opponent cards in a way that is useful for debugging but not visually noisy.

Files:
- Modify: `lib/poker-play.ts` render block around lines 461-503

Suggested rendering behavior:
- Keep the existing hero card line.
- Add an opponent cards line under opponent stack info.
- Rendering logic:
  - if `state.revealOpponentHolecards` and `state.villainCards.length > 0`, show actual cards
  - else if `state.villainCards.length > 0` because showdown revealed them, show actual cards
  - else show `— —`
- Consider labeling the line clearly, e.g.:
  - `Opponent cards: Q♠ J♠`
  - `Opponent cards: hidden`

Nice-to-have but optional:
- If the debug flag is enabled and the server does not provide hole cards proactively, show a note in the status/feed that cards are only visible when the server reveals them.

Success criteria:
- The TUI clearly shows whether opponent cards are hidden or known.
- The layout still fits comfortably in a normal terminal width.

---

## Task 4: Tighten UX feedback in the play loop

Objective: make the TUI easier to understand during repeated hands.

Files:
- Modify: `lib/poker-play.ts`

Suggested small improvements:
1. On `deal`, clear stale per-hand state:
   - `state.villainCards = []`
   - `state.pendingAction = false`
   - `state.availableActions = []`
2. On `hand_result`, append a richer feed line if winner names / showdown cards are available.
3. If a sent action fails, surface a clear status/feed error instead of silently leaving stale UI.
4. Keep the existing control scheme:
   - `x/c/enter` call/check
   - `f` fold
   - `b` bet
   - `r` raise
   - `a` all-in
   - `[` / `]` size selection
   - `q` quit

Success criteria:
- Each hand starts from clean UI state.
- The feed explains what happened without requiring packet inspection.

---

## Task 5: Run focused validation, not repo-wide cleanup

Objective: prove the play path works in practice and record the exact commands that passed.

Files:
- Possibly modify: `test/integration/runtime.test.ts` only if there is an obvious narrow test to add
- Prefer adding notes to this doc or a follow-up planning doc instead of broad test churn

Validation commands to try in the next session:
1. Check repo status first:
   - `git status --short`
2. Start the local poker server in one terminal.
3. In another terminal, run at least these source-mode checks:
   - `luca poker play balanced`
   - `luca poker play --vs balanced`
   - `luca poker play http://127.0.0.1:3000 balanced`
   - `luca poker play http://127.0.0.1:3000 --vs balanced --viewOpponentHolecards`
4. Verify manually:
   - table creates successfully
   - villain sits and autoplay works
   - action keys work
   - preset sizing changes visibly
   - hand feed updates during action and hand result
   - opponent card line behaves correctly
5. If there is a narrow automated test seam for argument parsing, add it. If not, do not force a brittle integration test yet.

Known caveat:
- Repo-wide `bun test` or TS validation may fail due to unrelated upstream/workspace issues. Treat those as separate cleanup work unless a failure is directly caused by the `play` changes.

---

## Recommended next-session execution order

1. Finish `runPlay(...)` parsing with `options.vs` support.
2. Instrument `lib/poker-play.ts` just enough to capture showdown/reveal payload shape.
3. Render `Opponent cards:` in the left pane.
4. Clean per-hand state reset and feed messages.
5. Run the four manual source-mode checks above.
6. Save a short note with exactly what passed and what remains broken.

---

## Definition of done

Play mode is ready for a broader polish pass when all of these are true:
- `--vs` and positional shorthand both work.
- `--viewOpponentHolecards` is correctly wired.
- Opponent cards are rendered sensibly when known.
- Repeated hands do not leave stale UI state behind.
- At least one real local run against a house bot succeeds end-to-end.

---

## 2026-03-29 execution notes

Implemented:
- `runPlay(...)` now prefers positional opponent, then `options.vs`, then `balanced`.
- `lib/poker-play.ts` now resets per-hand UI state on `deal`.
- `hand_result` now pulls showdown cards from `payload.showdown`, stores villain hole cards, updates stacks, and emits richer feed text.
- Ink UI now renders `Opponent cards:` with `hidden` vs revealed cards.
- `sendAction(...)` now surfaces send failures in status/feed instead of silently failing.
- Fixed broken token extraction lines in `lib/poker-play.ts` (`heroRegistration.token` / `villainRegistration.token`).

Focused validation run:
- `bun run src/cli.ts poker --help` passed and the documented `play [http://localhost:3000] --vs balanced` usage is present.
- Started local server with `bun run src/cli.ts serve --port 3010 --seedLobby true`.
- These source-mode invocations all reached the Ink TUI without immediate argument-parsing failure:
  - `bun run src/cli.ts play http://127.0.0.1:3010 balanced`
  - `bun run src/cli.ts play http://127.0.0.1:3010 --vs balanced`
  - `bun run src/cli.ts play http://127.0.0.1:3010 --vs balanced --viewOpponentHolecards`
- Observed in TUI:
  - opponent line renders
  - `Opponent cards: hidden` renders
  - sizing bar renders
  - no immediate crash on startup

Still broken / not yet proven:
- The play loop currently reaches a waiting TUI state with `Stack 0`, `Hand 0`, and no live hand/feed progression; local end-to-end hero-vs-bot hand flow is still not validated.
- Because of that, showdown-driven opponent-card reveal is implemented from server payload shape but not yet witnessed live in the TUI.
- Need a follow-up debugging pass on table join / hand-start flow before calling play mode end-to-end stable.
