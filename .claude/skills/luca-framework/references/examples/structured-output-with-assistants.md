---
title: "Structured Output with Assistants"
tags: [assistant, conversation, structured-output, zod, openai]
lastTested: null
lastTestPassed: null
---

# Structured Output with Assistants

Get typed, schema-validated JSON responses from OpenAI instead of raw text strings.

## Overview

OpenAI's Structured Outputs feature constrains the model to return JSON that exactly matches a schema you provide. Combined with Zod, this means `ask()` can return parsed objects instead of strings — no regex parsing, no "please respond in JSON", no malformed output.

Pass a `schema` option to `ask()` and the response comes back as a parsed object guaranteed to match your schema.

## Basic: Extract Structured Data

The simplest use case — ask a question and get structured data back.

```ts
const { z } = container
const conversation = container.feature('conversation', {
  model: 'gpt-4.1-mini',
  history: [{ role: 'system', content: 'You are a helpful data extraction assistant.' }]
})

const result = await conversation.ask('The founders of Apple are Steve Jobs, Steve Wozniak, and Ronald Wayne. They started it in 1976 in Los Altos, California.', {
  schema: z.object({
    company: z.string(),
    foundedYear: z.number(),
    location: z.string(),
    founders: z.array(z.string()),
  }).describe('CompanyInfo')
})

console.log('Company:', result.company)
console.log('Founded:', result.foundedYear)
console.log('Location:', result.location)
console.log('Founders:', result.founders)
```

The `.describe()` on the schema gives OpenAI the schema name — keep it short and descriptive.

## Enums and Categorization

Structured outputs work great for classification tasks where you want the model to pick from a fixed set of values.

```ts
const { z } = container
const conversation = container.feature('conversation', {
  model: 'gpt-4.1-mini',
  history: [{ role: 'system', content: 'You are a helpful assistant.' }]
})

const sentiment = await conversation.ask('I absolutely love this product, it changed my life!', {
  schema: z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
    confidence: z.number(),
    reasoning: z.string(),
  }).describe('SentimentAnalysis')
})

console.log('Sentiment:', sentiment.sentiment)
console.log('Confidence:', sentiment.confidence)
console.log('Reasoning:', sentiment.reasoning)
```

Because the model is constrained by the schema, `sentiment` will always be one of the four allowed values.

## Nested Objects and Arrays

Schemas can be as complex as you need. Here we extract a structured analysis with nested objects.

```ts
const { z } = container
const conversation = container.feature('conversation', {
  model: 'gpt-4.1-mini',
  history: [{ role: 'system', content: 'You are a technical analyst.' }]
})

const analysis = await conversation.ask(
  'TypeScript 5.5 introduced inferred type predicates, which automatically narrow types in filter callbacks. It also added isolated declarations for faster builds in monorepos, and a new regex syntax checking feature.',
  {
    schema: z.object({
      subject: z.string(),
      version: z.string(),
      features: z.array(z.object({
        name: z.string(),
        category: z.enum(['type-system', 'performance', 'developer-experience', 'syntax', 'other']),
        summary: z.string(),
      })),
      featureCount: z.number(),
    }).describe('ReleaseAnalysis')
  }
)

console.log('Subject:', analysis.subject, analysis.version)
console.log('Features:')
for (const f of analysis.features) {
  console.log(`  [${f.category}] ${f.name}: ${f.summary}`)
}
console.log('Total features:', analysis.featureCount)
```

Every level of nesting is validated — the model cannot return a feature without a category or skip required fields.

## With an Assistant

Structured outputs work the same way through the assistant API. The schema passes straight through to the underlying conversation.

```ts
const { z } = container
const assistant = container.feature('assistant', {
  systemPrompt: 'You are a code review assistant. You analyze code snippets and provide structured feedback.',
  model: 'gpt-4.1-mini',
})

const review = await assistant.ask(
  'Review this: function add(a, b) { return a + b }',
  {
    schema: z.object({
      issues: z.array(z.object({
        severity: z.enum(['info', 'warning', 'error']),
        message: z.string(),
      })),
      suggestion: z.string(),
      score: z.number(),
    }).describe('CodeReview')
  }
)

console.log('Score:', review.score)
console.log('Suggestion:', review.suggestion)
console.log('Issues:')
for (const issue of review.issues) {
  console.log(`  [${issue.severity}] ${issue.message}`)
}
```

## Summary

This demo covered extracting structured data, classification with enums, nested schema validation, and using structured outputs through both the conversation and assistant APIs. The key is passing a Zod schema via `{ schema }` in the options to `ask()` — OpenAI guarantees the response matches, and you get a parsed object back.
