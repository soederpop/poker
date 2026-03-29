# Offline Analysis Workflows

Use Pokurr as a local study tool even if you never run the server.

This doc focuses on task-oriented workflows:
- compare exact hands
- compare ranges
- evaluate a single hand in context
- save reusable situation docs
- run deterministic sims from those docs

Examples below use the standalone command name `pokurr`. If you are running from source in this repo, replace `pokurr` with `luca poker`.

## 1) Hand vs hand equity

Use this when you want a fast answer to a concrete matchup.

```bash
pokurr analyze equity AhKd QsQc --iterations 20000
```

Try it with a partial board:

```bash
pokurr analyze equity AhKd QsQc --board Ks7d2h --iterations 20000
```

## 2) Range vs range analysis

Use this when you want something closer to real decision-making than exact-hand vanity matchups.

```bash
pokurr analyze range "ATs+,AJo+" --vs "QQ+,AKs"
```

With a board:

```bash
pokurr analyze range "KQs,KJs,QJs,JTs,T9s,98s" --vs "AA,KK,QQ,AKs" --board Kh7d2h
```

## 3) Evaluate a hand in context

Use this when you care about one holding on one board with pot geometry.

```bash
pokurr analyze hand AhQh --board Kh7d2h5h --potSize 42 --toCall 14 --vs "QQ+,AKs"
```

Notes:
- `--potSize` and `--toCall` are what make this a real in-context review instead of just a rank check.
- If you omit `--vs`, Pokurr uses a very broad default villain range. That is okay for a rough smell test, but not ideal for realistic study.

## 4) Situation doc spec

Situation docs are reusable markdown files with frontmatter plus optional notes below the frontmatter.

Recommended folder:

```bash
docs/situations/
```

Minimum useful fields:

| field | required | format | example |
|---|---|---|---|
| `title` | recommended | string | `Turned Flush Draw Facing Lead` |
| `stage` | yes | `preflop|flop|turn|river` | `turn` |
| `heroCards` | yes | two-card string | `AhQh` |
| `board` | yes for postflop, empty for preflop | concatenated card string | `Kh7d2h5h` |
| `potSize` | yes | number | `42` |
| `toCall` | yes | number | `14` |
| `stacks` | optional | comma-separated hero-first list | `186,214` |
| `positions` | optional | comma-separated hero-first list | `BTN,BB` |
| `actionHistory` | optional | semicolon-separated or newline-separated actions | `preflop: ...; flop: ...` |
| `villain` | optional | built-in profile name | `loose-passive` |
| `stakes` | optional | string | `1/2 NLH` |

Conventions:
- `stacks` and `positions` are hero first.
- `board` should be empty preflop.
- `actionHistory` may be separated by semicolons or line breaks.
- If `title` is omitted, Pokurr will fall back to the first markdown H1 when available.

Example turn spot:

```md
---
title: Turned Flush Draw Facing Lead
stage: turn
heroCards: AhQh
board: Kh7d2h5h
potSize: 42
toCall: 14
stacks: 186,214
positions: BTN,BB
actionHistory: "preflop: BTN raise 6, BB call; flop: BB check, BTN cbet 8, BB call; turn: BB bet 14"
villain: loose-passive
stakes: 1/2 NLH
---
# Turned Flush Draw Facing Lead

Hero opened button, c-bet flop, and now faces a turn lead on a wet board.
```

Example preflop spot:

```md
---
title: Button Open Facing Big Blind 3-Bet
stage: preflop
heroCards: AsJd
board:
potSize: 10
toCall: 8
stacks: 194,206
positions: BTN,BB
actionHistory: "BTN open 2.5; BB 3bet 10"
villain: tag
stakes: 1/2 NLH
---
# Button Open Facing Big Blind 3-Bet

Use this to compare call/fold/4-bet plans against tighter and wider profiles.
```

For a reusable template, see `docs/situations/_template.md`.

## 5) Run sims from situation docs

By full path:

```bash
pokurr sim \
  --situation docs/situations/turned-flush-draw.md \
  --iterations 5000 \
  --strategy hero=tag villain=calling-station \
  --seed 42
```

By docs-relative id:

```bash
pokurr sim \
  --situation situations/turned-flush-draw \
  --iterations 5000 \
  --strategy hero=tag villain=calling-station \
  --seed 42
```

Why this matters:
- reusable study spots
- deterministic reruns with `--seed`
- easier comparison across strategy profiles

## 6) Build a lightweight study loop

A good manual workflow is:
1. save an interesting hand as a situation doc
2. run `analyze hand` to inspect the immediate spot
3. run `analyze range` to compare likely ranges
4. run `sim --situation ... --seed ...` for a repeatable scenario
5. add notes to the markdown file about what you learned

That gives you a personal hand-journal workflow without needing the bot arena.

## 7) Compare the same spot across profiles

```bash
pokurr sim --situation docs/situations/turned-flush-draw.md --strategy hero=tag villain=calling-station --seed 42 --iterations 4000
pokurr sim --situation docs/situations/turned-flush-draw.md --strategy hero=tag villain=lag --seed 42 --iterations 4000
```

This is often more useful than changing the seed. Keep the seed fixed when you want a cleaner comparison.

## 8) Output interpretation guidelines

When reading results, ask:
- is this an exact-hand curiosity, or a range-based decision?
- am I overfitting to a single board runout?
- does the pot geometry make a continue profitable even if I am behind?
- would a situation file make this easier to revisit later?

## 9) Common mistakes

1. Studying only exact hand matchups
   - fix: use `analyze range` more often

2. Ignoring pot size and to-call pressure
   - fix: use `analyze hand` with `--potSize` and `--toCall`

3. Recreating the same spots by hand
   - fix: save them in `docs/situations/`

4. Comparing sims without a seed
   - fix: use `--seed` when you want repeatability

## 10) Where to go next

If you want to move from study mode into action:
- `docs/writing-a-bot.md`
- `DEMO.md`

If you want the exhaustive API reference for bot logic:
- `docs/strategy-globals-api.md`
