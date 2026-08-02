import * as jose from 'jose'
import { describe, expect, it } from 'vitest'
import {
  authenticateMailboxRequest,
  createMailboxSessionToken,
  createMailboxToken,
  createTemporaryMailboxToken,
  encodeJWTSecret,
  requireAdminToken,
  verifyMailboxSessionToken,
  verifyMailboxToken,
  verifyTemporaryMailboxToken,
} from '../src/lib/auth'

const SECRET = 'jwt-test-secret-with-at-least-32-bytes'
const ADMIN_TOKEN = 'admin-test-token-with-at-least-32-bytes'

describe('mailbox JWTs', () => {
  it('binds a 24-hour access token to its subject and credential version', async () => {
    const token = await createMailboxToken('owner@example.com', 3, SECRET)

    await expect(verifyMailboxToken(token, SECRET)).resolves.toEqual({
      mailbox: 'owner@example.com',
      credentialVersion: 3,
    })
    await expect(
      authenticateMailboxRequest(
        new Request('https://example.com', { headers: { Authorization: `Bearer ${token}` } }),
        'other@example.com',
        SECRET
      )
    ).rejects.toMatchObject({ status: 403, code: 'MAILBOX_FORBIDDEN' })
  })

  it('creates scoped session and temporary mailbox tokens', async () => {
    const session = await createMailboxSessionToken('owner@example.com', SECRET)
    const claimedSession = await createMailboxSessionToken('claimed@example.com', SECRET, 4)
    const temporary = await createTemporaryMailboxToken('temporary@example.com', SECRET)

    await expect(verifyMailboxSessionToken(session, SECRET)).resolves.toEqual({
      mailbox: 'owner@example.com',
      credentialVersion: null,
    })
    await expect(verifyMailboxSessionToken(claimedSession, SECRET)).resolves.toEqual({
      mailbox: 'claimed@example.com',
      credentialVersion: 4,
    })
    await expect(verifyTemporaryMailboxToken(temporary, SECRET)).resolves.toBe(
      'temporary@example.com'
    )

    await expect(verifyTemporaryMailboxToken(session, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    })
    await expect(verifyMailboxToken(temporary, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    })
  })

  it('rejects legacy unscoped tokens instead of falling back to mailbox claims', async () => {
    const legacy = await new jose.SignJWT({ mailbox: 'legacy@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(encodeJWTSecret(SECRET))

    await expect(verifyTemporaryMailboxToken(legacy, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    })
    await expect(verifyMailboxSessionToken(legacy, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_SESSION',
    })
  })

  it('requires expiry and credential version on v2 access tokens', async () => {
    const valid = await createMailboxToken('owner@example.com', 2, SECRET)
    const withoutExpiry = { ...jose.decodeJwt(valid) }
    delete withoutExpiry.exp
    const withoutExpiryToken = await new jose.SignJWT(withoutExpiry)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(encodeJWTSecret(SECRET))

    const withoutVersion = { ...jose.decodeJwt(valid) }
    delete withoutVersion.credential_version
    const withoutVersionToken = await new jose.SignJWT(withoutVersion)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(encodeJWTSecret(SECRET))

    await expect(verifyMailboxToken(withoutExpiryToken, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    })
    await expect(verifyMailboxToken(withoutVersionToken, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    })
  })

  it('rejects tokens signed with another secret and weak signing secrets', async () => {
    const modified = await createMailboxToken(
      'owner@example.com',
      1,
      'another-jwt-secret-with-at-least-32-bytes'
    )

    await expect(verifyMailboxToken(modified, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_TOKEN',
    })
    expect(() => encodeJWTSecret('too-short')).toThrow(/32 bytes/)
  })
})

describe('administrator authentication', () => {
  it('accepts the configured Bearer token and rejects another token', async () => {
    const validRequest = new Request('https://example.com', {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    })
    await expect(requireAdminToken(validRequest, ADMIN_TOKEN)).resolves.toBeUndefined()

    const invalidRequest = new Request('https://example.com', {
      headers: { Authorization: `Bearer ${'x'.repeat(40)}` },
    })
    await expect(requireAdminToken(invalidRequest, ADMIN_TOKEN)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_ADMIN_TOKEN',
    })
  })
})
