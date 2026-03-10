---
title: "Telegram Bot"
tags: [telegram, bot, messaging, grammy]
lastTested: null
lastTestPassed: null
---

# telegram

Telegram bot feature powered by grammY. Supports long-polling and webhook modes, with the full grammY Bot instance exposed for direct API access. Events bridge to Luca's event bus.

## Overview

Use the `telegram` feature when you need to build a Telegram bot. It wraps the grammY library and handles bot lifecycle (start, stop, polling, webhooks) while bridging Telegram events into Luca's event system.

Requires a `TELEGRAM_BOT_TOKEN` environment variable or a `token` option from [@BotFather](https://t.me/BotFather).

## Enabling the Feature

```ts
const tg = container.feature('telegram', {
  mode: 'polling',
  dropPendingUpdates: true
})
console.log('Telegram feature created, mode:', tg.mode)
```

The feature reads `TELEGRAM_BOT_TOKEN` from the environment automatically. You can also pass `token` explicitly as an option.

## API Documentation

```ts
const info = await container.features.describe('telegram')
console.log(info)
```

## Registering Commands

Bot commands are registered with `.command()` and also emit events on Luca's event bus.

```ts skip
tg.command('start', (ctx) => ctx.reply('Welcome! I am your Luca bot.'))
tg.command('help', (ctx) => ctx.reply('Available: /start, /help, /ping'))
tg.command('ping', (ctx) => ctx.reply('Pong!'))
console.log('Registered commands:', tg.state.commandsRegistered)
```

If the bot were running with a valid token, sending `/start` in Telegram would reply with "Welcome! I am your Luca bot." and the `command` event would fire on the Luca event bus.

## Handling Messages

Use `.handle()` to register grammY update handlers for any filter query.

```ts skip
tg.handle('message:text', (ctx) => {
  ctx.reply(`Echo: ${ctx.message.text}`)
})
tg.handle('callback_query:data', (ctx) => {
  ctx.answerCallbackQuery('Button clicked!')
})
```

The `.handle()` method maps directly to grammY's `bot.on()` and supports all grammY filter queries like `message:photo`, `edited_message`, and `callback_query:data`.

## Starting the Bot

```ts skip
await tg.start()
console.log('Bot is running:', tg.isRunning)
console.log('Mode:', tg.mode)
```

Once started in polling mode, the bot continuously fetches updates from Telegram. Call `await tg.stop()` to shut down gracefully. The `started` and `stopped` events fire on the Luca event bus.

## Summary

The `telegram` feature provides a complete Telegram bot lifecycle manager. Register commands and handlers, then start polling or set up a webhook. All Telegram events are bridged to Luca's event bus for integration with other features. Key methods: `command()`, `handle()`, `start()`, `stop()`, `setupWebhook()`.
