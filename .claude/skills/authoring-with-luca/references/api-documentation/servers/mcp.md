# MCPServer (servers.mcp)

MCP (Model Context Protocol) server for exposing tools, resources, and prompts to AI clients like Claude Code. Uses the low-level MCP SDK Server class directly with Zod 4 native JSON Schema conversion. Register tools, resources, and prompts programmatically, then start the server over stdio (for CLI integration) or HTTP (for remote access).

## Usage

```ts
container.server('mcp', {
  // Port number to listen on
  port,
  // Hostname or IP address to bind to
  host,
  // Transport type for MCP communication
  transport,
  // Server name reported to MCP clients
  serverName,
  // Server version reported to MCP clients
  serverVersion,
  // HTTP compatibility profile for MCP clients
  mcpCompat,
  // Stdio framing compatibility profile for MCP clients
  stdioCompat,
})
```

## Options (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `port` | `number` | Port number to listen on |
| `host` | `string` | Hostname or IP address to bind to |
| `transport` | `string` | Transport type for MCP communication |
| `serverName` | `string` | Server name reported to MCP clients |
| `serverVersion` | `string` | Server version reported to MCP clients |
| `mcpCompat` | `string` | HTTP compatibility profile for MCP clients |
| `stdioCompat` | `string` | Stdio framing compatibility profile for MCP clients |

## Methods

### tool

Register an MCP tool. The tool's Zod schema is converted to JSON Schema for the protocol listing, and used for runtime argument validation. Tool handlers can return a string (auto-wrapped as text content) or a full CallToolResult object for advanced responses (images, errors, etc).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | Unique tool name |
| `options` | `ToolRegistrationOptions` | ✓ | Tool schema, description, and handler |

`ToolRegistrationOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `schema` | `z.ZodObject<any>` |  |
| `description` | `string` |  |
| `handler` | `(args: any, ctx: MCPContext) => any` |  |

**Returns:** `this`



### resource

Register an MCP resource. Resources expose data (files, configs, etc) that AI clients can read by URI. Accepts either a handler function directly or an options object with additional metadata (name, description, mimeType).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uri` | `string` | ✓ | Unique resource URI (e.g. "project://readme") |
| `handlerOrOptions` | `ResourceRegistrationOptions['handler'] | ResourceRegistrationOptions` | ✓ | Handler function or options object with handler |

**Returns:** `this`



### prompt

Register an MCP prompt. Prompts are reusable message templates that AI clients can invoke with optional string arguments.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | ✓ | Unique prompt name |
| `options` | `PromptRegistrationOptions` | ✓ | Prompt handler, optional args schema, and description |

`PromptRegistrationOptions` properties:

| Property | Type | Description |
|----------|------|-------------|
| `description` | `string` |  |
| `args` | `Record<string, z.ZodType>` |  |
| `handler` | `(args: Record<string, string | undefined>, ctx: MCPContext) => Promise<PromptMessage[]> | PromptMessage[]` |  |

**Returns:** `this`



### configure

Configure the MCP protocol server and register all protocol handlers. Called automatically before start() if not already configured.

**Returns:** `void`



### start

Start the MCP server with the specified transport.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `{
    transport?: 'stdio' | 'http'
    port?: number
    host?: string
    mcpCompat?: MCPCompatMode
    stdioCompat?: StdioCompatMode
  }` |  | Transport configuration. Defaults to stdio. |

`{
    transport?: 'stdio' | 'http'
    port?: number
    host?: string
    mcpCompat?: MCPCompatMode
    stdioCompat?: StdioCompatMode
  }` properties:

| Property | Type | Description |
|----------|------|-------------|
| `transport` | `any` | 'stdio' for CLI integration, 'http' for remote access |
| `port` | `any` | Port for HTTP transport (default 3001) |

**Returns:** `void`



### stop

Stop the MCP server and close all connections.

**Returns:** `void`



## Getters

| Property | Type | Description |
|----------|------|-------------|
| `mcpServer` | `MCPProtocolServer` | The underlying MCP protocol server instance. Created during configure(). |
| `handlerContext` | `MCPContext` | The handler context passed to all tool, resource, and prompt handlers. |

## Events (Zod v4 schema)

### toolRegistered

Event emitted by MCPServer



### resourceRegistered

Event emitted by MCPServer



### promptRegistered

Event emitted by MCPServer



### toolCalled

Event emitted by MCPServer



## State (Zod v4 schema)

| Property | Type | Description |
|----------|------|-------------|
| `port` | `number` | The port the server is bound to |
| `listening` | `boolean` | Whether the server is actively listening for connections |
| `configured` | `boolean` | Whether the server has been configured |
| `stopped` | `boolean` | Whether the server has been stopped |
| `transport` | `string` | Active transport type |
| `toolCount` | `number` | Number of registered tools |
| `resourceCount` | `number` | Number of registered resources |
| `promptCount` | `number` | Number of registered prompts |

## Examples

**servers.mcp**

```ts
const mcp = container.server('mcp', { serverName: 'my-server', serverVersion: '1.0.0' })

mcp.tool('search_files', {
 schema: z.object({ pattern: z.string() }),
 description: 'Search for files',
 handler: async (args, ctx) => {
   return ctx.container.feature('fs').walk('.', { include: [args.pattern] }).files.join('\n')
 }
})

await mcp.start()
```

