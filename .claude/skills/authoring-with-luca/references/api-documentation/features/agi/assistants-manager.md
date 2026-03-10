# AssistantsManager (features.assistantsManager)

No description provided

## Usage

```ts
container.feature('assistantsManager', {
  // Automatically discover assistants on init
  autoDiscover,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `autoDiscover` | `boolean` | Automatically discover assistants on init |

## Methods

### afterInitialize

**Returns:** `void`



### discover

Discovers assistants by finding all CORE.md files in the project using the fileManager. Each directory containing a CORE.md is treated as an assistant definition.

**Returns:** `this`



### list

Returns all discovered assistant entries as an array.

**Returns:** `AssistantEntry[]`



### get

Looks up a single assistant entry by name.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The assistant name (e.g. 'assistants/chief-of-staff') |

**Returns:** `AssistantEntry | undefined`



### create

Creates and returns a new Assistant feature instance for the given name. The assistant is configured with the discovered folder path. Any additional options are merged in.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The assistant name (must match a discovered entry) |
| `options` | `Record<string, any>` |  | Additional options to pass to the Assistant constructor |

**Returns:** `Assistant`

```ts
const assistant = manager.create('assistants/chief-of-staff', { model: 'gpt-4.1' })
```



### getInstance

Returns a previously created assistant instance by name.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The assistant name |

**Returns:** `Assistant | undefined`



### toSummary

Generates a markdown summary of all discovered assistants, listing their names and which definition files are present.

**Returns:** `string`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `available` | `any` |  |

## Events (Zod v4 schema)

### discovered

Emitted when assistant discovery scan completes



### assistantCreated

Emitted when a new assistant instance is created

**Event Arguments:**

| Name | Type | Description |
|------|------|-------------|
| `arg0` | `string` | The assistant name |
| `arg1` | `any` | The assistant instance |



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `discovered` | `boolean` | Whether discovery has been run |
| `assistantCount` | `number` | Number of discovered assistant definitions |
| `activeCount` | `number` | Number of currently instantiated assistants |

## Examples

**features.assistantsManager**

```ts
const manager = container.feature('assistantsManager')
manager.discover()
console.log(manager.list()) // [{ name: 'assistants/chief-of-staff', folder: '...', ... }]
const assistant = manager.create('assistants/chief-of-staff')
const answer = await assistant.ask('Hello!')
```



**create**

```ts
const assistant = manager.create('assistants/chief-of-staff', { model: 'gpt-4.1' })
```

