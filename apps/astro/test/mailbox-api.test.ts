import { getMailbox, isMailboxClaimed } from 'database/dao'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMailboxSessionToken,
  createMailboxToken,
  createTemporaryMailboxToken,
} from '../src/lib/auth'
import {
  authorizeMailboxSession,
  authorizePermanentMailbox,
  authorizeTemporaryMailbox,
  generateMailboxAddress,
  generateMailboxPassword,
} from '../src/lib/mailbox-api'

vi.mock('database/dao', () => ({
  getMailbox: vi.fn(),
  isMailboxClaimed: vi.fn(),
}))

const SECRET = 'jwt-test-secret-with-at-least-32-bytes'
const ADDRESS = 'owner@example.com'
const db = {} as never
const getMailboxMock = vi.mocked(getMailbox)
const isMailboxClaimedMock = vi.mocked(isMailboxClaimed)

function bearerRequest(token: string) {
  return new Request('https://example.com', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

function mailbox(overrides: Record<string, unknown> = {}) {
  return {
    address: ADDRESS,
    credentialVersion: 1,
    batchId: null,
    createdAt: new Date(0),
    expiresAt: null,
    lastLoginAt: null,
    ...overrides,
  }
}

describe('mailbox state authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('invalidates the same v1 bearer token as soon as its mailbox is claimed', async () => {
    const token = await createTemporaryMailboxToken(ADDRESS, SECRET)
    isMailboxClaimedMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

    await expect(
      authorizeTemporaryMailbox(db, bearerRequest(token), ADDRESS, SECRET)
    ).resolves.toBe(ADDRESS)
    await expect(
      authorizeTemporaryMailbox(db, bearerRequest(token), ADDRESS, SECRET)
    ).rejects.toMatchObject({ status: 401, code: 'MAILBOX_CLAIMED' })
  })

  it('binds v2 access to a permanent mailbox and its current credential version', async () => {
    const token = await createMailboxToken(ADDRESS, 2, SECRET)
    getMailboxMock.mockResolvedValueOnce(mailbox({ credentialVersion: 2 }) as never)
    await expect(
      authorizePermanentMailbox(db, bearerRequest(token), ADDRESS, SECRET)
    ).resolves.toEqual(expect.objectContaining({ address: ADDRESS, credentialVersion: 2 }))

    getMailboxMock.mockResolvedValueOnce(mailbox({ credentialVersion: 3 }) as never)
    await expect(
      authorizePermanentMailbox(db, bearerRequest(token), ADDRESS, SECRET)
    ).rejects.toMatchObject({ status: 401, code: 'NOT_PERMANENT_MAILBOX' })

    getMailboxMock.mockResolvedValueOnce(
      mailbox({ credentialVersion: 2, expiresAt: new Date(Date.now() + 60_000) }) as never
    )
    await expect(
      authorizePermanentMailbox(db, bearerRequest(token), ADDRESS, SECRET)
    ).rejects.toMatchObject({ status: 401, code: 'NOT_PERMANENT_MAILBOX' })
  })

  it('invalidates temporary web sessions on claim and checks claimed session state', async () => {
    const temporary = await createMailboxSessionToken(ADDRESS, SECRET)
    getMailboxMock.mockResolvedValueOnce(null)
    await expect(authorizeMailboxSession(db, temporary, ADDRESS, SECRET)).resolves.toMatchObject({
      credentialVersion: null,
    })

    getMailboxMock.mockResolvedValueOnce(mailbox() as never)
    await expect(authorizeMailboxSession(db, temporary, ADDRESS, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_SESSION',
    })

    const claimed = await createMailboxSessionToken(ADDRESS, SECRET, 2)
    getMailboxMock.mockResolvedValueOnce(mailbox({ credentialVersion: 2 }) as never)
    await expect(authorizeMailboxSession(db, claimed, ADDRESS, SECRET)).resolves.toMatchObject({
      credentialVersion: 2,
    })

    getMailboxMock.mockResolvedValueOnce(mailbox({ credentialVersion: 3 }) as never)
    await expect(authorizeMailboxSession(db, claimed, ADDRESS, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_SESSION',
    })

    getMailboxMock.mockResolvedValueOnce(
      mailbox({ credentialVersion: 2, expiresAt: new Date(Date.now() - 1) }) as never
    )
    await expect(authorizeMailboxSession(db, claimed, ADDRESS, SECRET)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_SESSION',
    })
  })
})

describe('mailbox credential generation', () => {
  it('uses cryptographic entropy for valid, collision-resistant addresses and passwords', () => {
    const addresses = Array.from({ length: 100 }, () => generateMailboxAddress('example.com'))
    const passwords = Array.from({ length: 100 }, () => generateMailboxPassword())

    expect(new Set(addresses).size).toBe(addresses.length)
    expect(new Set(passwords).size).toBe(passwords.length)
    for (const address of addresses) {
      expect(address).toMatch(/^mbx-[\da-f]{24}@example\.com$/)
    }
    for (const password of passwords) {
      expect(password).toMatch(/^[\da-f]{48}$/)
    }
  })
})
