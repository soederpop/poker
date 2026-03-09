# Container-First Philosophy

## The idea

Luca provides a `container` object that gets you 60% of the way to a complete application before you write a line of code. As you narrow your domain, the container grows to cover 95%. The remaining 5% is Layer 3 — the specific thing you're building for the specific person who needs it.

## The layer model

**Layer 1: Platform** — `NodeContainer`, `WebContainer`. Universally applicable features: filesystem, networking, process management, event buses, observable state. Solve once.

**Layer 2: Domain** — `AGIContainer`, or custom domain containers. Features, clients, servers specific to a category of application. Solve rarely.

**Layer 3: The Actual Work** — The specific thing you're building. This changes daily. The entire point is to spend all energy here.

Fix something in Layer 1 and every project benefits. Like docker layer caching — stable layers are cached, volatile layers rebuild.

## Why container-first

- **No reinventing.** If `fs`, `proc`, `git`, `grep`, `networking` exist as features, use them. Don't `npm install` a utility library.
- **Introspection for free.** Every container feature describes itself at runtime. Humans and AI agents can discover the full API without reading docs.
- **Composition over dependency.** Features access each other through `this.container`. New code composes with existing, reviewed components rather than importing raw packages.
- **Trust through audit.** Components captured as Helpers with formal interfaces can be reviewed and audited independently. The codebase gets more trustworthy as it grows.
- **Shared mental model.** Human and AI collaborate inside the same architecture. The human defines categories (Features, Clients, Servers), the AI implements within them.

## In practice

1. Check `container.features.available` before adding any dependency
2. Use `container.fs` not `import { readFileSync } from 'fs'`
3. Use `container.paths` not `import { resolve } from 'path'`
4. Use `container.proc` not `import { exec } from 'child_process'`
5. If the container doesn't have what you need, discuss adding it — don't work around it
