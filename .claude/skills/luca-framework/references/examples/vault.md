---
title: "Vault"
tags: [vault, encryption, security, crypto]
lastTested: null
lastTestPassed: null
---

# vault

AES-256-GCM encryption and decryption for sensitive data. Encrypt strings and get them back with a simple two-method API.

## Overview

The `vault` feature is on-demand. It generates or accepts a secret key and provides `encrypt()` and `decrypt()` methods using AES-256-GCM, an authenticated encryption scheme. Use it to protect sensitive configuration values, tokens, or any data that should not be stored in plaintext.

## Enabling the Vault

Create a vault instance. It will generate a secret key automatically.

```ts
const vault = container.feature('vault')
console.log('Vault enabled:', vault.state.get('enabled'))
```

The vault is ready to use immediately after creation.

## Encrypting a String

Pass any plaintext string to `encrypt()` and receive an opaque encrypted payload.

```ts
const secret = 'my-database-password-12345'
const encrypted = vault.encrypt(secret)
console.log('Original:', secret)
console.log('Encrypted:', encrypted)
console.log('Encrypted length:', encrypted.length)
```

The encrypted output is a base64-encoded string containing the IV, auth tag, and ciphertext. It is safe to store in config files or databases.

## Decrypting Back to Plaintext

Use `decrypt()` with the same vault instance to recover the original value.

```ts
const decrypted = vault.decrypt(encrypted)
console.log('Decrypted:', decrypted)
console.log('Round-trip matches:', decrypted === secret)
```

The decrypted value is identical to the original input.

## Encrypting Multiple Values

Each call to `encrypt()` produces a unique ciphertext, even for the same input, because a fresh IV is generated every time.

```ts
const a = vault.encrypt('same-input')
const b = vault.encrypt('same-input')
console.log('Encryption A:', a)
console.log('Encryption B:', b)
console.log('Same ciphertext?', a === b)
console.log('Both decrypt correctly?', vault.decrypt(a) === vault.decrypt(b))
```

This property (semantic security) means an attacker cannot tell if two ciphertexts contain the same plaintext.

## Summary

This demo covered enabling the vault, encrypting strings, decrypting them back, and verifying that repeated encryption produces unique ciphertexts. The `vault` feature provides straightforward authenticated encryption for any sensitive data your application handles.
