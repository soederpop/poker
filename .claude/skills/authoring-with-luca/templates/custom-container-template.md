# Custom Container Template

Use when your project has multiple custom features and you want full type safety.

Copy this into your project entrypoint (e.g. `src/container.ts`):

```ts
import { NodeContainer, type NodeFeatures } from '@soederpop/luca/node'

// Side-effect imports register the features
import './features/my-feature'
import './features/another-feature'

// Import types for the feature map
import type { MyFeature } from './features/my-feature'
import type { AnotherFeature } from './features/another-feature'

// Extend the features type map
export interface AppFeatures extends NodeFeatures {
  myFeature: typeof MyFeature
  anotherFeature: typeof AnotherFeature
}

// Create a typed container
const container = new NodeContainer<AppFeatures>()
export default container
```

Now import this container instead of the default:

```ts
import container from './container'

// Fully typed — autocomplete works for custom features
const myFeature = container.feature('myFeature', { /* typed options */ })
```
