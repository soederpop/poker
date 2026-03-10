# DocsReader (features.docsReader)

No description provided

## Usage

```ts
container.feature('docsReader', {
  // A ContentDb instance to read documents from
  contentDb,
  // Optional system prompt to prepend before the docs listing
  systemPrompt,
  // OpenAI model to use for the conversation
  model,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `contentDb` | `any` | A ContentDb instance to read documents from |
| `systemPrompt` | `string` | Optional system prompt to prepend before the docs listing |
| `model` | `string` | OpenAI model to use for the conversation |

## Methods

### buildTools

Build the tool definitions (listDocs, readDoc, readDocOutline, readDocs) that the conversation model uses to query the content database.

**Returns:** `Record<string, ConversationTool>`



### buildSystemPrompt

Build the system prompt by combining the optional prefix with a table of contents generated from the content database.

**Returns:** `string`



### createConversation

Create and return a new Conversation feature configured with the docs reader's system prompt and tools.

**Returns:** `Conversation`



### start

Initialize the docs reader by loading the content database, creating the conversation, and emitting the start event.

**Returns:** `void`



### ask

Ask the docs reader a question. It will read relevant documents and return an answer based on their content.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `question` | `string` | ✓ | The question to ask |

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `contentDb` | `ContentDb` | The ContentDb instance this reader draws from. |
| `isStarted` | `any` | Whether the reader has been started and is ready to answer questions. |

## Events (Zod v4 schema)

### start

Event emitted by DocsReader



### preview

Event emitted by DocsReader



### answered

Event emitted by DocsReader



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `started` | `boolean` | Whether the docs reader has been initialized |
| `docsLoaded` | `boolean` | Whether the content database has been loaded |

## Examples

**features.docsReader**

```ts
const reader = container.feature('docsReader', {
 contentDb: myContentDb,
 model: 'gpt-4.1'
})
await reader.start()
const answer = await reader.ask('How does authentication work?')
```

