---
title: "Browser: Import Luca from esm.sh"
tags:
  - browser
  - esm
  - web
  - quickstart
  - cdn
---
# Browser: Import Luca from esm.sh

You can use Luca in any browser environment — no bundler, no build step. Import it from [esm.sh](https://esm.sh) and you get the singleton container on `window.luca`, ready to go. All the same APIs apply.

## Basic Setup

```html
<script type="module">
  import "https://esm.sh/@soederpop/luca/web"

  const container = window.luca
  console.log(container.uuid) // unique container ID
  console.log(container.features.available) // ['assetLoader', 'voice', 'speech', 'network', 'vault', 'vm', 'esbuild', 'helpers', 'containerLink']
</script>
```

The import triggers module evaluation, which creates the `WebContainer` singleton and attaches it to `window.luca`. That's it.

If you prefer a named import:

```html
<script type="module">
  import container from "https://esm.sh/@soederpop/luca/web"
  // container === window.luca
</script>
```

## Using Features

Once you have the container, features work exactly like they do on the server — lazy-loaded via `container.feature()`.

```html
<script type="module">
  import "https://esm.sh/@soederpop/luca/web"
  const { luca: container } = window

  // Load a script from a CDN
  const assetLoader = container.feature('assetLoader')
  await assetLoader.loadScript('https://cdn.jsdelivr.net/npm/chart.js')

  // Load a stylesheet
  await assetLoader.loadStylesheet('https://cdn.jsdelivr.net/npm/water.css@2/out/water.css')

  // Text-to-speech
  const speech = container.feature('speech')
  speech.speak('Hello from Luca')

  // Voice recognition
  const voice = container.feature('voice')
  voice.on('transcript', ({ text }) => console.log('Heard:', text))
  voice.start()
</script>
```

## State and Events

The container is a state machine and event bus. This works identically to the server.

```html
<script type="module">
  import container from "https://esm.sh/@soederpop/luca/web"

  // Listen for state changes
  container.on('stateChanged', ({ changes }) => {
    console.log('State changed:', changes)
  })

  // Feature-level state and events
  const voice = container.feature('voice')
  voice.on('stateChanged', ({ changes }) => {
    document.getElementById('status').textContent = changes.listening ? 'Listening...' : 'Idle'
  })
</script>
```

## REST Client

Make HTTP requests with the built-in REST client. Methods return parsed JSON directly.

```html
<script type="module">
  import container from "https://esm.sh/@soederpop/luca/web"

  const api = container.client('rest', { baseURL: 'https://jsonplaceholder.typicode.com' })
  const posts = await api.get('/posts')
  console.log(posts) // array of post objects, not a Response wrapper
</script>
```

## WebSocket Client

Connect to a WebSocket server:

```html
<script type="module">
  import container from "https://esm.sh/@soederpop/luca/web"

  const socket = container.client('socket', { url: 'ws://localhost:3000' })
  socket.on('message', (data) => console.log('Received:', data))
  socket.send({ type: 'hello' })
</script>
```

## Extending: Custom Features

The container exposes the `Feature` class directly, so you can create your own features without any additional imports.

```html
<script type="module">
  import container from "https://esm.sh/@soederpop/luca/web"

  const { Feature } = container

  class Theme extends Feature {
    static shortcut = 'features.theme'
    static { Feature.register(this, 'theme') }

    get current() {
      return this.state.get('mode') || 'light'
    }

    toggle() {
      const next = this.current === 'light' ? 'dark' : 'light'
      this.state.set('mode', next)
      document.documentElement.setAttribute('data-theme', next)
      this.emit('themeChanged', { mode: next })
    }
  }

  const theme = container.feature('theme')
  theme.on('themeChanged', ({ mode }) => console.log('Theme:', mode))
  theme.toggle() // => Theme: dark
</script>
```

## Utilities

The container's built-in utilities are available in the browser too.

```html
<script type="module">
  import container from "https://esm.sh/@soederpop/luca/web"

  // UUID generation
  const id = container.utils.uuid()

  // Lodash helpers
  const { groupBy, keyBy, pick } = container.utils.lodash

  // String utilities
  const { camelCase, kebabCase } = container.utils.stringUtils
</script>
```

## Full Example: A Minimal App

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Luca Browser Demo</title>
</head>
<body>
  <h1>Luca Browser Demo</h1>
  <button id="speak">Speak</button>
  <button id="theme">Toggle Theme</button>
  <pre id="output"></pre>

  <script type="module">
    import container from "https://esm.sh/@soederpop/luca/web"

    const log = (msg) => {
      document.getElementById('output').textContent += msg + '\n'
    }

    // Load a stylesheet
    const assets = container.feature('assetLoader')
    await assets.loadStylesheet('https://cdn.jsdelivr.net/npm/water.css@2/out/water.css')

    // Custom feature
    const { Feature } = container

    class Theme extends Feature {
      static shortcut = 'features.theme'
      static { Feature.register(this, 'theme') }

      toggle() {
        const next = (this.state.get('mode') || 'light') === 'light' ? 'dark' : 'light'
        this.state.set('mode', next)
        document.documentElement.style.colorScheme = next
        this.emit('themeChanged', { mode: next })
      }
    }

    const theme = container.feature('theme')
    theme.on('themeChanged', ({ mode }) => log(`Theme: ${mode}`))

    // Speech
    const speech = container.feature('speech')

    document.getElementById('speak').onclick = () => speech.speak('Hello from Luca')
    document.getElementById('theme').onclick = () => theme.toggle()

    log(`Container ID: ${container.uuid}`)
    log(`Features: ${container.features.available.join(', ')}`)
  </script>
</body>
</html>
```

Save this as an HTML file, open it in a browser, and everything works — no npm, no bundler, no build step.

## Gotchas

- **esm.sh caches aggressively.** Pin a version if you need stability: `https://esm.sh/@soederpop/luca@0.0.29/web`
- **Browser features only.** The web container doesn't include node-specific features like `fs`, `git`, `proc`, or `docker`. If you need server features, run Luca on the server and connect via the REST or WebSocket clients.
- **`window.luca` is the singleton.** Don't call `createContainer()` — it just warns and returns the same instance. If you need isolation, use `container.subcontainer()`.
- **CORS applies.** REST client requests from the browser are subject to browser CORS rules. Your API must send the right headers.

## What's Next

- [State and Events](./05-state-and-events.md) — deep dive into the state machine and event bus (works identically in the browser)
- [Creating Features](./10-creating-features.md) — full anatomy of a feature with schemas, state, and events
- [Clients](./09-clients.md) — REST and WebSocket client APIs
