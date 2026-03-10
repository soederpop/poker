# NLP (features.nlp)

The NLP feature provides natural language processing utilities for parsing utterances into structured data. Combines two complementary libraries: - **compromise**: Verb normalization (toInfinitive), POS pattern matching - **wink-nlp**: High-accuracy POS tagging (~95%), named entity recognition Three methods at increasing levels of detail: - `parse()` — compromise-powered quick structure + verb normalization - `analyze()` — wink-powered high-accuracy POS + entity extraction - `understand()` — combined parse + analyze merged

## Usage

```ts
container.feature('nlp')
```

## Methods

### parse

Parse an utterance into structured command data using compromise. Extracts intent (normalized verb), target noun, prepositional subject, and modifiers.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The raw utterance to parse |

**Returns:** `ParsedCommand`

```ts
nlp.parse("open the terminal")
// { intent: "open", target: "terminal", subject: null, modifiers: [], raw: "open the terminal" }

nlp.parse("draw a diagram of the auth flow")
// { intent: "draw", target: "diagram", subject: "auth flow", modifiers: [], raw: "..." }
```



### analyze

Analyze text with high-accuracy POS tagging and named entity recognition using wink-nlp.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The text to analyze |

**Returns:** `Analysis`

```ts
nlp.analyze("meet john at 3pm about the deployment")
// { tokens: [{value:"meet",pos:"VERB"}, {value:"john",pos:"PROPN"}, ...],
//   entities: [{value:"john",type:"PERSON"}, {value:"3pm",type:"TIME"}],
//   raw: "meet john at 3pm about the deployment" }
```



### understand

Full understanding: combines compromise parsing with wink-nlp analysis. Returns intent, target, subject, modifiers (from parse) plus tokens and entities (from analyze).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | ✓ | The text to understand |

**Returns:** `ParsedCommand & Analysis`

```ts
nlp.understand("draw a diagram of the auth flow")
// { intent: "draw", target: "diagram", subject: "auth flow", modifiers: [],
//   tokens: [{value:"draw",pos:"VERB"}, ...], entities: [...], raw: "..." }
```



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether this feature is currently enabled |
| `parseCalls` | `number` | Total parse() invocations |
| `analyzeCalls` | `number` | Total analyze() invocations |

## Examples

**features.nlp**

```ts
const nlp = container.feature('nlp', { enable: true })

nlp.parse("draw a diagram of the auth flow")
// { intent: "draw", target: "diagram", subject: "auth flow", modifiers: [], raw: "..." }

nlp.analyze("meet john at 3pm about the deployment")
// { tokens: [{value:"meet",pos:"VERB"}, ...], entities: [{value:"john",type:"PERSON"}, ...] }

nlp.understand("draw a diagram of the auth flow")
// { intent, target, subject, modifiers, tokens, entities, raw }
```



**parse**

```ts
nlp.parse("open the terminal")
// { intent: "open", target: "terminal", subject: null, modifiers: [], raw: "open the terminal" }

nlp.parse("draw a diagram of the auth flow")
// { intent: "draw", target: "diagram", subject: "auth flow", modifiers: [], raw: "..." }
```



**analyze**

```ts
nlp.analyze("meet john at 3pm about the deployment")
// { tokens: [{value:"meet",pos:"VERB"}, {value:"john",pos:"PROPN"}, ...],
//   entities: [{value:"john",type:"PERSON"}, {value:"3pm",type:"TIME"}],
//   raw: "meet john at 3pm about the deployment" }
```



**understand**

```ts
nlp.understand("draw a diagram of the auth flow")
// { intent: "draw", target: "diagram", subject: "auth flow", modifiers: [],
//   tokens: [{value:"draw",pos:"VERB"}, ...], entities: [...], raw: "..." }
```

