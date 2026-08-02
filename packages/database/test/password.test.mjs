/* eslint-disable antfu/no-import-dist, test/no-import-node-test */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import {
  PBKDF2_ITERATIONS,
  createPasswordCredential,
  verifyPasswordCredential,
} from '../dist/password.js'

test('PBKDF2 credentials use independent salts and reject the wrong password', async () => {
  const [first, second] = await Promise.all([
    createPasswordCredential('correct horse battery staple'),
    createPasswordCredential('correct horse battery staple'),
  ])

  assert.notEqual(first.salt, second.salt)
  assert.notEqual(first.passwordHash, second.passwordHash)
  assert.match(first.passwordHash, new RegExp(`^pbkdf2-sha256\\$${PBKDF2_ITERATIONS}\\$`))
  assert.deepEqual(
    await verifyPasswordCredential('correct horse battery staple', first.salt, first.passwordHash),
    { valid: true, needsUpgrade: false }
  )
  assert.deepEqual(
    await verifyPasswordCredential('incorrect password', first.salt, first.passwordHash),
    { valid: false, needsUpgrade: false }
  )
})

test('legacy SHA-256 credentials remain valid and are marked for upgrade', async () => {
  const password = 'legacy password'
  const salt = '00112233445566778899aabbccddeeff'
  const passwordHash = createHash('sha256')
    .update(password + salt)
    .digest('hex')

  assert.deepEqual(await verifyPasswordCredential(password, salt, passwordHash), {
    valid: true,
    needsUpgrade: true,
  })
  assert.deepEqual(await verifyPasswordCredential('wrong', salt, passwordHash), {
    valid: false,
    needsUpgrade: false,
  })
})

test('malformed credentials fail closed', async () => {
  assert.deepEqual(await verifyPasswordCredential('password', 'not-hex', 'not-a-hash'), {
    valid: false,
    needsUpgrade: false,
  })
  assert.deepEqual(
    await verifyPasswordCredential(
      'password',
      '00112233445566778899aabbccddeeff',
      'pbkdf2-sha256$0$00'
    ),
    { valid: false, needsUpgrade: false }
  )
  assert.deepEqual(
    await verifyPasswordCredential(
      'password',
      '00112233445566778899aabbccddeeff',
      `pbkdf2-sha256$2000001$${'00'.repeat(32)}`
    ),
    { valid: false, needsUpgrade: false }
  )
})
