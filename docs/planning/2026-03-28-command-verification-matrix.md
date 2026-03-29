# Command Verification Matrix

Purpose: track Wave 1 source/binary parity for the public command surface.

Modes:
- source mode: `luca poker ...`
- compiled mode: `./dist/pokurr ...`

## One-shot commands

- analyze equity
  - source: `luca poker analyze equity AhKd QsQc`
  - compiled: `./dist/pokurr analyze equity AhKd QsQc`
  - verify: succeeds, prints readable percentages
- analyze range
  - source: `luca poker analyze range "ATs+,AJo+" --vs "QQ+,AKs"`
  - compiled: `./dist/pokurr analyze range "ATs+,AJo+" --vs "QQ+,AKs"`
  - verify: succeeds, board flag works, percentages are readable
- analyze hand
  - source: `luca poker analyze hand AhQh --board Kh7d2h5h --potSize 42 --toCall 14 --vs "QQ+,AKs"`
  - compiled: `./dist/pokurr analyze hand AhQh --board Kh7d2h5h --potSize 42 --toCall 14 --vs "QQ+,AKs"`
  - verify: rank, villain range, pot-odds threshold, recommendation
- sim
  - source: `luca poker sim --situation docs/situations/turned-flush-draw.md --seed 42 --iterations 2000`
  - compiled: `./dist/pokurr sim --situation docs/situations/turned-flush-draw.md --seed 42 --iterations 2000`
  - verify: loads title, prints situation context, saves cache entry
- new-agent
  - source: `luca poker new-agent my-bot tag`
  - compiled: `./dist/pokurr new-agent my-bot tag`
  - verify: scaffold path semantics match mode expectations
- types
  - source: `luca poker types ./my-bot`
  - compiled: `./dist/pokurr types ./my-bot`
  - verify: writes `types/pokurr.d.ts`, creates tsconfig only if missing
- register
  - source: `luca poker register http://127.0.0.1:3000 --name my-bot`
  - compiled: `./dist/pokurr register http://127.0.0.1:3000 --name my-bot`
  - verify: token/ws URL returned and local auth cache updated
- house status
  - source: `luca poker house status --server http://127.0.0.1:3000`
  - compiled: `./dist/pokurr house status --server http://127.0.0.1:3000`
  - verify: reports readiness and endpoints

## Stateful / interactive commands

- serve
  - verify: base port derives ws=`port+1`, spectator=`port+2`
- join
  - verify: token path, auto-register path, manual mode, custom `--agent`
- watch
  - verify: table auto-selection and event stream
- dashboard
  - verify: spectator fallback or lobby/spectate flow behaves clearly
- leaderboard reset
  - verify: `--force` path in non-interactive mode

## Negative-path checks

- missing token on join gives mode-aware remediation
- invalid situation path fails clearly
- dashboard without spectator websocket explains derived port behavior
- types outside an agent directory fails clearly
