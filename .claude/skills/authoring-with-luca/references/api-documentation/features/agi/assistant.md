# Assistant (features.assistant)

No description provided

## Usage

```ts
container.feature('assistant', {
  // The folder containing the assistant definition
  folder,
  // The folder containing the assistant documentation
  docsFolder,
  // Text to prepend to the system prompt
  prependPrompt,
  // Text to append to the system prompt
  appendPrompt,
  // Override or extend the tools loaded from tools.ts
  tools,
  // Override or extend schemas whose keys match tool names
  schemas,
  // OpenAI model to use
  model,
  // Maximum number of output tokens per completion
  maxTokens,
  // Conversation history persistence mode
  historyMode,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `folder` | `string` | The folder containing the assistant definition |
| `docsFolder` | `string` | The folder containing the assistant documentation |
| `prependPrompt` | `string` | Text to prepend to the system prompt |
| `appendPrompt` | `string` | Text to append to the system prompt |
| `tools` | `object` | Override or extend the tools loaded from tools.ts |
| `schemas` | `object` | Override or extend schemas whose keys match tool names |
| `model` | `string` | OpenAI model to use |
| `maxTokens` | `number` | Maximum number of output tokens per completion |
| `historyMode` | `string` | Conversation history persistence mode |

## Methods

### afterInitialize

Called immediately after the assistant is constructed. Synchronously loads the system prompt, tools, and hooks, then binds hooks as event listeners so every emitted event automatically invokes its corresponding hook.

**Returns:** `void`



### use

Apply a setup function to this assistant. The function receives the assistant instance and can configure tools, hooks, event listeners, etc.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fn` | `(assistant: this) => void | Promise<void>` | ✓ | Setup function that receives this assistant |

**Returns:** `this`

```ts
assistant
 .use(setupLogging)
 .use(addAnalyticsTools)
```



### addTool

Add a tool to this assistant. The tool name is derived from the handler's function name.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `handler` | `(...args: any[]) => any` | ✓ | A named function that implements the tool |
| `schema` | `z.ZodType` |  | Optional Zod schema describing the tool's parameters |

**Returns:** `this`

```ts
assistant.addTool(function getWeather(args) {
 return { temp: 72 }
}, z.object({ city: z.string() }).describe('Get weather for a city'))
```



### removeTool

Remove a tool by name or handler function reference.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `nameOrHandler` | `string | ((...args: any[]) => any)` | ✓ | The tool name string, or the handler function to match |

**Returns:** `this`



### simulateToolCallWithResult

Simulate a tool call and its result by appending the appropriate messages to the conversation history. Useful for injecting context that looks like the assistant performed a tool call.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `toolCallName` | `string` | ✓ | The name of the tool |
| `args` | `Record<string, any>` | ✓ | The arguments that were "passed" to the tool |
| `result` | `any` | ✓ | The result the tool "returned" |

**Returns:** `this`



### simulateQuestionAndResponse

Simulate a user question and assistant response by appending both messages to the conversation history.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `question` | `string` | ✓ | The user's question |
| `response` | `string` | ✓ | The assistant's response |

**Returns:** `this`



### loadSystemPrompt

Load the system prompt from CORE.md, applying any prepend/append options.

**Returns:** `string`



### loadTools

Load tools from tools.ts using the container's VM feature, injecting the container and assistant as globals. Merges with any tools provided in the constructor options. Runs synchronously via vm.loadModule.

**Returns:** `Record<string, ConversationTool>`



### loadHooks

Load event hooks from hooks.ts. Each exported function name should match an event the assistant emits. When that event fires, the corresponding hook function is called. Runs synchronously via vm.loadModule.

**Returns:** `Record<string, (...args: any[]) => any>`



### resumeThread

Override thread for resume. Call before start().

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `threadId` | `string` | ✓ | The thread ID to resume |

**Returns:** `this`



### listHistory

List saved conversations for this assistant+project.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `opts` | `{ limit?: number }` |  | Optional limit |

**Returns:** `Promise<ConversationMeta[]>`



### clearHistory

Delete all history for this assistant+project.

**Returns:** `Promise<number>`



### start

Start the assistant by creating the conversation and wiring up events. The system prompt, tools, and hooks are already loaded synchronously during initialization.

**Returns:** `Promise<this>`



### ask

Ask the assistant a question. It will use its tools to produce a streamed response. The assistant auto-starts if needed.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `question` | `string | ContentPart[]` | ✓ | The question to ask |
| `options` | `AskOptions` |  | Parameter options |

**Returns:** `Promise<string>`

```ts
const answer = await assistant.ask('What capabilities do you have?')
```



### save

Save the conversation to disk via conversationHistory.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `opts` | `{ title?: string; tags?: string[]; thread?: string; metadata?: Record<string, any> }` |  | Optional overrides for title, tags, thread, or metadata |

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `resolvedFolder` | `string` | The absolute resolved path to the assistant folder. |
| `corePromptPath` | `string` | The path to CORE.md which provides the system prompt. |
| `toolsModulePath` | `string` | The path to tools.ts which provides tool implementations and schemas. |
| `hooksModulePath` | `string` | The path to hooks.ts which provides event handler functions. |
| `hasVoice` | `boolean` | Whether this assistant has a voice.yaml configuration file. |
| `voiceConfig` | `Record<string, any> | undefined` | Parsed voice configuration from voice.yaml, or undefined if not present. |
| `resolvedDocsFolder` | `any` |  |
| `contentDb` | `ContentDb` | Returns an instance of a ContentDb feature for the resolved docs folder |
| `conversation` | `Conversation` |  |
| `messages` | `any` |  |
| `isStarted` | `boolean` | Whether the assistant has been started and is ready to receive questions. |
| `systemPrompt` | `string` | The current system prompt text. |
| `tools` | `Record<string, ConversationTool>` | The tools registered with this assistant. |
| `paths` | `any` | Provides a helper for creating paths off of the assistant's base folder |
| `assistantName` | `string` | The assistant name derived from the folder basename. |
| `cwdHash` | `string` | An 8-char hash of the container cwd for per-project thread isolation. |
| `threadPrefix` | `string` | The thread prefix for this assistant+project combination. |
| `conversationHistory` | `ConversationHistory` | The conversationHistory feature instance. |
| `currentThreadId` | `string | undefined` | The active thread ID (undefined in lifecycle mode). |

## Events (Zod v4 schema)

### created

Emitted immediately after the assistant loads its prompt, tools, and hooks.



### hookFired

Emitted when a hook function is called

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `string` | Hook/event name |



### turnStart

Emitted when a new completion turn begins. isFollowUp is true when resuming after tool calls

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `object` |  |



### turnEnd

Emitted when a completion turn ends. hasToolCalls indicates whether tool calls will follow

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `object` |  |



### chunk

Emitted as tokens stream in

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `string` | A chunk of streamed text |



### preview

Emitted with the full response text accumulated across all turns

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `string` | The accumulated response so far |



### response

Emitted when a complete response is produced (accumulated across all turns)

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `string` | The final response text |



### rawEvent

Emitted for each raw streaming event from the underlying conversation transport

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `any` | A raw streaming event from the active model API |



### mcpEvent

Emitted for MCP-specific streaming and output-item events when using Responses API MCP tools

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `any` | A raw MCP-related streaming event |



### toolCall

Emitted when a tool is called

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `string` | Tool name |
| `arg1` | `any` | Tool arguments |



### toolResult

Emitted when a tool returns a result

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `string` | Tool name |
| `arg1` | `any` | Result value |



### toolError

Emitted when a tool call fails

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `string` | Tool name |
| `arg1` | `any` | Error |



### started

Emitted when the assistant has been initialized



### answered

Event emitted by Assistant



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `started` | `boolean` | Whether the assistant has been initialized |
| `conversationCount` | `number` | Number of ask() calls made |
| `lastResponse` | `string` | The most recent response text |
| `folder` | `string` | The resolved assistant folder path |
| `docsFolder` | `string` | The resolved docs folder |
| `conversationId` | `string` | The active conversation persistence ID |
| `threadId` | `string` | The active thread ID |

## Examples

**features.assistant**

```ts
const assistant = container.feature('assistant', {
 folder: 'assistants/my-helper'
})
const answer = await assistant.ask('What capabilities do you have?')
```



**use**

```ts
assistant
 .use(setupLogging)
 .use(addAnalyticsTools)
```



**addTool**

```ts
assistant.addTool(function getWeather(args) {
 return { temp: 72 }
}, z.object({ city: z.string() }).describe('Get weather for a city'))
```



**ask**

```ts
const answer = await assistant.ask('What capabilities do you have?')
```

