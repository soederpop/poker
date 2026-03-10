# YAML (features.yaml)

The YAML feature provides utilities for parsing and stringifying YAML data. This feature wraps the js-yaml library to provide convenient methods for converting between YAML strings and JavaScript objects. It's automatically attached to Node containers for easy access.

## Usage

```ts
container.feature('yaml')
```

## Methods

### stringify

Converts a JavaScript object to a YAML string. This method serializes JavaScript data structures into YAML format, which is human-readable and commonly used for configuration files.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `any` | ✓ | The data to convert to YAML format |

**Returns:** `string`

```ts
const config = {
 name: 'MyApp',
 version: '1.0.0',
 settings: {
   debug: true,
   ports: [3000, 3001]
 }
}

const yamlString = yaml.stringify(config)
console.log(yamlString)
// Output:
// name: MyApp
// version: 1.0.0
// settings:
//   debug: true
//   ports:
//     - 3000
//     - 3001
```



### parse

Parses a YAML string into a JavaScript object. This method deserializes YAML content into JavaScript data structures. It supports all standard YAML features including nested objects, arrays, and various data types.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `yamlStr` | `string` | ✓ | The YAML string to parse |

**Returns:** `T`

```ts
const yamlContent = `
 name: MyApp
 version: 1.0.0
 settings:
   debug: true
   ports:
     - 3000
     - 3001
`

// Parse with type inference
const config = yaml.parse(yamlContent)
console.log(config.name) // 'MyApp'

// Parse with explicit typing
interface AppConfig {
 name: string
 version: string
 settings: {
   debug: boolean
   ports: number[]
 }
}

const typedConfig = yaml.parse<AppConfig>(yamlContent)
console.log(typedConfig.settings.ports) // [3000, 3001]
```



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |

## Examples

**features.yaml**

```ts
const yamlFeature = container.feature('yaml')

// Parse YAML string to object
const config = yamlFeature.parse(`
 name: MyApp
 version: 1.0.0
 settings:
   debug: true
`)

// Convert object to YAML string
const yamlString = yamlFeature.stringify(config)
console.log(yamlString)
```



**stringify**

```ts
const config = {
 name: 'MyApp',
 version: '1.0.0',
 settings: {
   debug: true,
   ports: [3000, 3001]
 }
}

const yamlString = yaml.stringify(config)
console.log(yamlString)
// Output:
// name: MyApp
// version: 1.0.0
// settings:
//   debug: true
//   ports:
//     - 3000
//     - 3001
```



**parse**

```ts
const yamlContent = `
 name: MyApp
 version: 1.0.0
 settings:
   debug: true
   ports:
     - 3000
     - 3001
`

// Parse with type inference
const config = yaml.parse(yamlContent)
console.log(config.name) // 'MyApp'

// Parse with explicit typing
interface AppConfig {
 name: string
 version: string
 settings: {
   debug: boolean
   ports: number[]
 }
}

const typedConfig = yaml.parse<AppConfig>(yamlContent)
console.log(typedConfig.settings.ports) // [3000, 3001]
```

