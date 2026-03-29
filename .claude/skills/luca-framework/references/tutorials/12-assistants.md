---
title: Building Assistants
tags: [assistants, ai, openai, tools, hooks, conversation, CORE.md]
---

# Building Assistants

Assistants are AI-powered conversational agents defined by a file-based convention. Each assistant lives in its own folder with a system prompt, tools, hooks, and documentation.

## Directory Structure

```
assistants/my-assistant/
├── CORE.md           # System prompt (required)
├── tools.ts          # Tool definitions with Zod schemas
├── hooks.ts          # Lifecycle event handlers
└── docs/             # Internal documentation the assistant can search
    ├── guide.md
    └── faq.md
```

## CORE.md -- The System Prompt

This is the assistant's personality and instructions. It's a markdown file that becomes the system message:

```markdown
# Customer Support Assistant

You are a helpful customer support agent for Acme Corp. You help users with
billing questions, account issues, and product information.

Always research internal docs before answering product questions.
Be polite and concise.
```

## tools.ts -- Tool Definitions

Define functions that the assistant can call. Each tool has a Zod schema describing its parameters:

```typescript
const { z } = require('zod')

async function lookupOrder({ orderId }) {
  // In a real app, query your database
  return {
    orderId,
    status: 'shipped',
    trackingNumber: 'ABC123',
    estimatedDelivery: '2024-01-20',
  }
}

async function createTicket({ subject, priority, description }) {
  // Create a support ticket
  const ticketId = `TICKET-${Date.now()}`
  return {
    ticketId,
    subject,
    priority,
    message: `Ticket ${ticketId} created successfully`,
  }
}

async function searchProducts({ query, category }) {
  // Search product catalog
  return {
    results: [
      { name: 'Widget Pro', price: 29.99, inStock: true },
      { name: 'Widget Lite', price: 19.99, inStock: false },
    ],
  }
}

const schemas = {
  lookupOrder: z.object({
    orderId: z.string().describe('The order ID to look up'),
  }).describe('Look up an order by its ID to get status and tracking info'),

  createTicket: z.object({
    subject: z.string().describe('Brief ticket subject line'),
    priority: z.enum(['low', 'medium', 'high']).describe('Ticket priority'),
    description: z.string().describe('Detailed description of the issue'),
  }).describe('Create a new support ticket'),

  searchProducts: z.object({
    query: z.string().describe('Search terms'),
    category: z.string().optional().describe('Product category filter'),
  }).describe('Search the product catalog'),
}

module.exports = { lookupOrder, createTicket, searchProducts, schemas }
```

**Important:** The function name must match the key in the `schemas` object. The `.describe()` on the schema object itself becomes the tool description that the AI model sees.

## hooks.ts -- Lifecycle Hooks

React to assistant events:

```typescript
function started() {
  console.log('[assistant] Session started')
}

function response(text) {
  // Called when the assistant produces a text response
  console.log(`[assistant] ${text.slice(0, 100)}...`)
}

function toolCall(name, args) {
  // Called before a tool is executed
  console.log(`[assistant] Calling tool: ${name}`, args)
}

function error(err) {
  console.error('[assistant] Error:', err.message)
}

module.exports = { started, response, toolCall, error }
```

## docs/ -- Internal Documentation

The `docs/` folder contains markdown files that the assistant can search using the built-in `researchInternalDocs` tool. This is automatically injected -- you don't need to define it in tools.ts.

```
docs/
├── billing-faq.md
├── product-catalog.md
├── return-policy.md
└── troubleshooting.md
```

In CORE.md, instruct the assistant to use it:

```markdown
When asked about products, billing, or policies, always use the
researchInternalDocs tool first to find accurate information before answering.
```

## Using the Assistant

### In a Script

```typescript
import container from '@soederpop/luca'

const assistant = container.feature('assistant', {
  folder: 'assistants/my-assistant',
  model: 'gpt-4o',
})

// Ask a question
const answer = await assistant.ask('What is the return policy?')
console.log(answer)

// Multi-turn conversation
const follow = await assistant.ask('And how long does the refund take?')
console.log(follow)

// Save the conversation
await assistant.save({ title: 'Return policy inquiry' })
```

### In an Endpoint

Expose the assistant as an API:

```typescript
// endpoints/ask.ts
import { z } from 'zod'
import type { EndpointContext } from '@soederpop/luca'

export const path = '/api/ask'
export const description = 'Ask the support assistant a question'
export const tags = ['assistant']

export const postSchema = z.object({
  question: z.string().describe('Your question'),
})

export async function post(params: z.infer<typeof postSchema>, ctx: EndpointContext) {
  const assistant = ctx.container.feature('assistant', {
    folder: 'assistants/my-assistant',
    model: 'gpt-4o',
  })

  const answer = await assistant.ask(params.question)
  return { answer }
}
```

### Streaming Responses

```typescript
const assistant = container.feature('assistant', {
  folder: 'assistants/my-assistant',
  model: 'gpt-4o',
})

// Listen for chunks as they arrive
assistant.on('chunk', (text) => {
  process.stdout.write(text)
})

await assistant.ask('Explain quantum computing')
```

## Best Practices

1. **Write focused CORE.md prompts** -- tell the assistant exactly what it is and what it should/shouldn't do
2. **Keep tools simple** -- each tool should do one thing. The AI model is better at composing simple tools than using complex ones
3. **Use docs/ liberally** -- put all reference material in docs/ so the assistant can look things up rather than relying on the model's training data
4. **Use Zod `.describe()`** -- the descriptions on schemas and fields are what the model sees to decide when and how to call tools
5. **Test with real questions** -- ask the assistant the kinds of things real users will ask
