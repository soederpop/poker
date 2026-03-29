---
title: "Text-to-Speech"
tags: [tts, speech, audio, runpod, chatterbox]
lastTested: null
lastTestPassed: null
---

# tts

Text-to-speech feature that synthesizes audio files via RunPod's Chatterbox Turbo endpoint. Supports 20 preset voices and voice cloning from a reference audio URL.

## Overview

Use the `tts` feature when you need to generate speech audio from text. It calls the Chatterbox Turbo public endpoint on RunPod, downloads the resulting audio, and saves it locally. Choose from 20 preset voices or clone any voice by providing a reference audio URL.

Requires a `RUNPOD_API_KEY` environment variable or an `apiKey` option.

## Enabling the Feature

```ts
const tts = container.feature('tts', {
  voice: 'lucy',
  format: 'wav',
  outputDir: '/tmp/tts-output'
})
console.log('TTS feature created')
console.log('Default voice:', tts.options.voice)
console.log('Output format:', tts.options.format)
```

## API Documentation

```ts
const info = await container.features.describe('tts')
console.log(info)
```

## Available Voices

List all 20 preset voice names.

```ts
console.log('Available voices:', tts.voices.join(', '))
```

## Generating Speech

Synthesize text with a preset voice.

```ts skip
const path = await tts.synthesize('Good morning! Here is your daily briefing.', {
  voice: 'ethan'
})
console.log('Audio saved to:', path)
console.log('Last generated file:', tts.state.lastFile)
```

The synthesize method sends the text to RunPod, waits for generation, downloads the audio, and saves it to the output directory. The `synthesized` event fires with the file path on completion.

## Voice Cloning

Clone any voice by providing a reference audio URL.

```ts skip
const path = await tts.synthesize('Hello world, this is a cloned voice.', {
  voiceUrl: 'https://example.com/reference-voice.wav'
})
console.log('Cloned voice audio saved to:', path)
```

The reference audio should be a clear recording of the voice you want to clone. The Chatterbox Turbo model uses it to match the voice characteristics.

## Output Formats

```ts skip
const wav = await tts.synthesize('WAV format', { format: 'wav' })
const flac = await tts.synthesize('FLAC format', { format: 'flac' })
const ogg = await tts.synthesize('OGG format', { format: 'ogg' })
console.log('Generated files:', wav, flac, ogg)
```

Three output formats are supported: WAV (default, uncompressed), FLAC (lossless compressed), and OGG (lossy compressed).

## Summary

The `tts` feature generates speech audio via RunPod's Chatterbox Turbo. Choose from 20 preset voices or clone a custom voice with a reference URL. Supports WAV, FLAC, and OGG output formats. Key methods: `synthesize()`. Key getters: `voices`, `outputDir`.
