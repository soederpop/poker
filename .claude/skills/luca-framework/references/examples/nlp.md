---
title: "Natural Language Processing"
tags: [nlp, parsing, text-analysis]
lastTested: null
lastTestPassed: null
---

# nlp

Natural language processing utilities for parsing utterances into structured data, POS tagging, and entity extraction.

## Overview

The `nlp` feature is an on-demand feature that combines two complementary NLP libraries: **compromise** for verb normalization and quick structural parsing, and **wink-nlp** for high-accuracy part-of-speech tagging and named entity recognition. Use it when you need to extract intent from voice commands, classify sentence structure, or identify entities in text.

## Enabling the Feature

The nlp feature is on-demand, so we enable it explicitly.

```ts
const nlp = container.feature('nlp', { enable: true })
console.log('NLP feature enabled:', nlp.state.enabled)
```

## Parsing Voice Commands

The `parse()` method uses compromise to extract structured command data: an intent (normalized verb), a target noun, an optional prepositional subject, and any modifiers.

```ts
const cmd1 = nlp.parse("open the terminal")
console.log('Command:', JSON.stringify(cmd1, null, 2))
```

Prepositional phrases with "of" are extracted as the subject.

```ts
const cmd2 = nlp.parse("draw a diagram of the auth flow")
console.log('Command with subject:', JSON.stringify(cmd2, null, 2))
```

Notice how `intent` is the normalized verb form ("draw"), `target` is the direct object ("diagram"), and `subject` captures the prepositional phrase ("auth flow").

## POS Tagging and Entity Recognition

The `analyze()` method uses wink-nlp for high-accuracy part-of-speech tagging and named entity recognition.

```ts
const analysis = nlp.analyze("meet john at 3pm about the deployment")
console.log('Tokens:')
for (const tok of analysis.tokens) {
  console.log(`  ${tok.value.padEnd(15)} ${tok.pos}`)
}
console.log('Entities:', JSON.stringify(analysis.entities))
```

Each token is tagged with its part of speech (VERB, NOUN, ADP, DET, etc.) and named entities like times and proper nouns are extracted separately.

## Full Understanding

The `understand()` method combines both `parse()` and `analyze()` into a single result, giving you structured command data alongside detailed POS tags and entities.

```ts
const full = nlp.understand("send an email to sarah about the quarterly report")
console.log('Intent:', full.intent)
console.log('Target:', full.target)
console.log('Modifiers:', full.modifiers)
console.log('Token count:', full.tokens.length)
console.log('Entities:', JSON.stringify(full.entities))
```

This is the most complete method when you need both the high-level command structure and the detailed linguistic analysis in one call.

## Comparing Multiple Commands

Parse is fast and lightweight, making it suitable for batch processing of voice commands.

```ts
const commands = [
  "deploy the app to production",
  "restart the database server",
  "show logs for the api gateway",
]
for (const raw of commands) {
  const parsed = nlp.parse(raw)
  console.log(`"${raw}" => intent: ${parsed.intent}, target: ${parsed.target}`)
}
```

## Summary

This demo covered the three main methods of the `nlp` feature: `parse()` for quick structural extraction from voice commands, `analyze()` for detailed POS tagging and entity recognition, and `understand()` for a combined view of both. The feature is well suited for building voice command interpreters, chatbot intent classifiers, and text analysis pipelines.
