# WebVault (features.vault)

WebVault helper

## Usage

```ts
container.feature('vault')
```

## Methods

### secret

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `{ refresh = false, set = true }` | `any` |  | Parameter { refresh = false, set = true } |

**Returns:** `Promise<ArrayBuffer>`



### decrypt

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `payload` | `string` | ✓ | Parameter payload |

**Returns:** `void`



### encrypt

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `payload` | `string` | ✓ | Parameter payload |

**Returns:** `void`



## Examples

**features.vault**

```ts
const vault = container.feature('vault')

// Encrypt sensitive data
const encrypted = vault.encrypt('sensitive information')
console.log(encrypted) // Base64 encoded encrypted data

// Decrypt the data
const decrypted = vault.decrypt(encrypted)
console.log(decrypted) // 'sensitive information'
```

