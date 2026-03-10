---
title: "ui"
tags: [ui, terminal, colors, ascii-art, core]
lastTested: null
lastTestPassed: null
---

# ui

Terminal UI utilities including colors, ASCII art, gradients, and markdown rendering.

## Overview

The `ui` feature is a core feature, auto-enabled on every container. You can access it directly as a global or via `container.feature('ui')`. It provides chalk-based color styling, figlet-powered ASCII art, color gradient effects, and terminal markdown rendering. Use it to make CLI output readable and visually organized.

## Text Colors

The `colors` getter provides the full chalk API for coloring and styling terminal text.

```ts
const { colors } = ui
console.log(colors.green('Success: all tests passed'))
console.log(colors.red('Error: file not found'))
console.log(colors.yellow('Warning: deprecated API'))
console.log(colors.bold.cyan('Info: build complete'))
```

Colors can be chained with styles like `bold`, `italic`, `underline`, and `dim`.

## ASCII Art

Use `asciiArt()` to render text in large figlet fonts. Pass the text and a font name.

```ts
const art = ui.asciiArt('LUCA', 'Standard')
console.log(art)
```

The `fonts` getter lists all available figlet fonts if you want to explore options.

## Banner with Gradient

Use `banner()` to combine ASCII art with a color gradient for eye-catching headers.

```ts
const result = ui.banner('Hello', { font: 'Small', colors: ['cyan', 'blue', 'magenta'] })
console.log(result)
```

The gradient is applied automatically across the lines of the ASCII art.

## Color Gradients

Use `applyGradient()` to apply color transitions to any text. Choose between horizontal (per-character) and vertical (per-line) directions.

```ts
const horizontal = ui.applyGradient('Horizontal gradient across this text', ['red', 'yellow', 'green'], 'horizontal')
console.log(horizontal)

const lines = 'Line one\nLine two\nLine three\nLine four'
const vertical = ui.applyGradient(lines, ['cyan', 'blue', 'magenta'], 'vertical')
console.log(vertical)
```

Horizontal gradients color each character individually. Vertical gradients color each line uniformly.

## Markdown Rendering

Use `markdown()` to render a markdown string for terminal display with formatting preserved.

```ts
const md = ui.markdown('## Features\n\n- **Bold** text\n- `inline code`\n- Regular paragraph text\n')
console.log(md)
```

This uses marked-terminal under the hood to produce styled terminal output from markdown source.

## Summary

This demo covered text coloring with chalk, ASCII art generation with figlet, gradient banners, horizontal and vertical color gradients, and markdown rendering. The `ui` feature handles all the visual polish for terminal applications.
