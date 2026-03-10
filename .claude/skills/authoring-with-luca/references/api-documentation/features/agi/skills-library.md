# SkillsLibrary (features.skillsLibrary)

No description provided

## Usage

```ts
container.feature('skillsLibrary', {
  // Path to project-level skills directory
  projectSkillsPath,
  // Path to user-level global skills directory
  userSkillsPath,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `projectSkillsPath` | `string` | Path to project-level skills directory |
| `userSkillsPath` | `string` | Path to user-level global skills directory |

## Methods

### load

Loads both project and user skill collections from disk. Gracefully handles missing directories.

**Returns:** `Promise<SkillsLibrary>`



### list

Lists all skills from both collections. Project skills come first.

**Returns:** `SkillEntry[]`



### find

Finds a skill by name. Project skills take precedence over user skills.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The skill name to find (case-insensitive) |

**Returns:** `SkillEntry | undefined`



### search

Searches skills by substring match against name and description.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✓ | The search query |

**Returns:** `SkillEntry[]`



### getSkill

Gets a skill by name. Alias for find().

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The skill name |

**Returns:** `SkillEntry | undefined`



### create

Creates a new SKILL.md file in the specified collection. Maintains the directory-per-skill structure (skill-name/SKILL.md).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `skill` | `{
			name: string
			description: string
			body: string
			meta?: Record<string, unknown>
		}` | ✓ | The skill to create |
| `target` | `'project' | 'user'` |  | Which collection to write to (default: 'project') |

**Returns:** `Promise<SkillEntry>`



### update

Updates an existing skill's content or metadata.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The skill name to update |
| `updates` | `{
			description?: string
			body?: string
			meta?: Record<string, unknown>
		}` | ✓ | Fields to update |

**Returns:** `Promise<SkillEntry>`



### remove

Removes a skill by name, deleting its SKILL.md and cleaning up the directory.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | The skill name to remove |

**Returns:** `Promise<boolean>`



### toConversationTools

Converts all skills into ConversationTool format for use with Conversation. Each skill becomes a tool that returns its instruction body when invoked.

**Returns:** `Record<string, ConversationTool>`



### toSystemPromptBlock

Generates a markdown block listing all available skills with names and descriptions. Suitable for injecting into a system prompt.

**Returns:** `string`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `projectCollection` | `Collection` | Returns the project-level contentbase Collection, lazily initialized. |
| `userCollection` | `Collection` | Returns the user-level contentbase Collection, lazily initialized. |
| `isLoaded` | `boolean` | Whether the skills library has been loaded. |
| `skillNames` | `string[]` | Array of all skill names across both collections. |

## Events (Zod v4 schema)

### loaded

Event emitted by SkillsLibrary



### skillCreated

Event emitted by SkillsLibrary



### skillUpdated

Event emitted by SkillsLibrary



### skillRemoved

Event emitted by SkillsLibrary



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `loaded` | `boolean` | Whether both collections have been loaded |
| `projectSkillCount` | `number` | Number of skills in the project collection |
| `userSkillCount` | `number` | Number of skills in the user-level collection |
| `totalSkillCount` | `number` | Total number of skills across both collections |

## Examples

**features.skillsLibrary**

```ts
const skills = container.feature('skillsLibrary')
await skills.load()

// List and search
const allSkills = skills.list()
const matches = skills.search('code review')

// Create a new skill
await skills.create({
 name: 'summarize',
 description: 'Summarize a document',
 body: '## Instructions\nRead the document and produce a concise summary.'
})
```

