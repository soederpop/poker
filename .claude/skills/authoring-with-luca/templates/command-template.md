# Command Template

Copy this into `commands/<name>.ts`:

```ts
import { z } from 'zod'
import type { ContainerContext } from '@soederpop/luca'

export const description = 'What this command does'

export const argsSchema = z.object({
  // Add your flags here
  name: z.string().describe('A required string flag'),
  count: z.number().default(10).describe('An optional number flag with default'),
  verbose: z.boolean().default(false).describe('An optional boolean flag'),
  format: z.enum(['json', 'table']).default('table').describe('An enum flag'),
})

export async function handler(options: z.infer<typeof argsSchema>, context: ContainerContext) {
  const { container } = context

  // Use container features — never import Node builtins
  const fs = container.fs
  const ui = container.ui

  console.log(ui.colors.green('Done.'))
}
```

Run with: `luca <name> --name "value" --count 20 --verbose`
