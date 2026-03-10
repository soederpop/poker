# ConversationHistory (features.conversationHistory)

No description provided

## Usage

```ts
container.feature('conversationHistory', {
  // Custom cache directory for conversation storage
  cachePath,
  // Namespace prefix for cache keys to isolate datasets
  namespace,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `cachePath` | `string` | Custom cache directory for conversation storage |
| `namespace` | `string` | Namespace prefix for cache keys to isolate datasets |

## Methods

### save

Save a conversation. Creates or overwrites by ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `record` | `ConversationRecord` | ✓ | The full conversation record to persist |

`ConversationRecord` properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` |  |
| `title` | `string` |  |
| `model` | `string` |  |
| `messages` | `Message[]` |  |
| `tags` | `string[]` |  |
| `thread` | `string` |  |
| `createdAt` | `string` |  |
| `updatedAt` | `string` |  |
| `messageCount` | `number` |  |
| `metadata` | `Record<string, any>` |  |

**Returns:** `Promise<void>`



### create

Create a new conversation from messages, returning the saved record.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `opts` | `{
		id?: string
		title?: string
		model?: string
		messages: Message[]
		tags?: string[]
		thread?: string
		metadata?: Record<string, any>
	}` | ✓ | Creation options including messages, optional title, model, tags, thread, and metadata |

**Returns:** `Promise<ConversationRecord>`



### load

Load a full conversation by ID, including all messages.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✓ | The conversation ID |

**Returns:** `Promise<ConversationRecord | null>`



### getMeta

Load just the metadata for a conversation (no messages).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✓ | The conversation ID |

**Returns:** `Promise<ConversationMeta | null>`



### append

Append messages to an existing conversation.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✓ | The conversation ID to append to |
| `messages` | `Message[]` | ✓ | The messages to append |

**Returns:** `Promise<ConversationRecord | null>`



### delete

Delete a conversation by ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✓ | The conversation ID to delete |

**Returns:** `Promise<boolean>`



### list

List all conversation metadata, with optional search/filter. Loads only the lightweight meta records, never the full messages.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `SearchOptions` |  | Optional filters for tag, thread, model, date range, and text query |

`SearchOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `tag` | `string` |  |
| `tags` | `string[]` |  |
| `thread` | `string` |  |
| `model` | `string` |  |
| `before` | `string | Date` |  |
| `after` | `string | Date` |  |
| `query` | `string` |  |
| `limit` | `number` |  |
| `offset` | `number` |  |

**Returns:** `Promise<ConversationMeta[]>`



### search

Search conversations by text query across titles, tags, and metadata. Also supports filtering by tag, thread, model, and date range.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `SearchOptions` | ✓ | Search and filter criteria |

`SearchOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `tag` | `string` |  |
| `tags` | `string[]` |  |
| `thread` | `string` |  |
| `model` | `string` |  |
| `before` | `string | Date` |  |
| `after` | `string | Date` |  |
| `query` | `string` |  |
| `limit` | `number` |  |
| `offset` | `number` |  |

**Returns:** `Promise<ConversationMeta[]>`



### allTags

Get all unique tags across all conversations.

**Returns:** `Promise<string[]>`



### allThreads

Get all unique threads across all conversations.

**Returns:** `Promise<string[]>`



### tag

Tag a conversation. Adds tags without duplicates.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✓ | The conversation ID |
| `tags` | `string[]` | ✓ | One or more tags to add |

**Returns:** `Promise<boolean>`



### untag

Remove tags from a conversation.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✓ | The conversation ID |
| `tags` | `string[]` | ✓ | One or more tags to remove |

**Returns:** `Promise<boolean>`



### updateMeta

Update metadata on a conversation without touching messages.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✓ | The conversation ID |
| `updates` | `Partial<Pick<ConversationRecord, 'title' | 'tags' | 'thread' | 'metadata'>>` | ✓ | Partial updates for title, tags, thread, and/or metadata |

**Returns:** `Promise<boolean>`



### findByThread

Find the most recent conversation for an exact thread ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `thread` | `string` | ✓ | The exact thread ID to match |

**Returns:** `Promise<ConversationRecord | null>`



### findByThreadPrefix

Find all conversations whose thread starts with a prefix.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `prefix` | `string` | ✓ | The thread prefix to match |

**Returns:** `Promise<ConversationMeta[]>`



### deleteThread

Delete all conversations for an exact thread.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `thread` | `string` | ✓ | The exact thread ID |

**Returns:** `Promise<number>`



### deleteByThreadPrefix

Delete all conversations matching a thread prefix.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `prefix` | `string` | ✓ | The thread prefix to match |

**Returns:** `Promise<number>`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `diskCache` | `DiskCache` |  |
| `namespace` | `string` |  |

## Events (Zod v4 schema)

### saved

Event emitted by ConversationHistory



### deleted

Event emitted by ConversationHistory



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `conversationCount` | `number` | Total number of stored conversations |
| `lastSaved` | `string` | ISO timestamp of the last save operation |

## Examples

**features.conversationHistory**

```ts
const history = container.feature('conversationHistory', {
 namespace: 'my-app',
 cachePath: '/tmp/conversations'
})

// Create and retrieve conversations
const record = await history.create({ messages, title: 'My Chat' })
const loaded = await history.load(record.id)

// Search and filter
const results = await history.search({ tag: 'important', limit: 10 })
```

