import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import {
  createPasswordCredential,
  DUMMY_PASSWORD_CREDENTIAL,
  verifyPasswordCredential,
} from './password.js'
import { apiKeys, emails, mailboxes } from './schema.js'
import type { Email, InsertEmail, Mailbox } from './schema.js'

export const MAX_MAILBOX_BATCH_SIZE = 100
export const PASSWORD_HASH_CONCURRENCY = 2
const EMAIL_PREVIEW_CHARACTERS = 500

export type EmailSummary = Pick<
  Email,
  'id' | 'from' | 'to' | 'subject' | 'date' | 'createdAt' | 'isRead' | 'readAt' | 'priority'
> & {
  text: string | null
  html: string | null
}

export interface EmailPageOptions {
  limit?: number
  offset?: number
  unreadOnly?: boolean
}

export interface EmailPage {
  emails: EmailSummary[]
  total: number
  limit: number
  offset: number
}

export interface PermanentMailboxInput {
  address: string
  password: string
}

export type MailboxInfo = Omit<Mailbox, 'passwordHash' | 'salt'>

export interface PermanentMailboxBatchResult {
  batchId: string
  mailboxes: MailboxInfo[]
}

export class MailboxConflictError extends Error {
  readonly code = 'MAILBOX_CONFLICT'
  readonly retryable = true

  constructor(message = 'One or more mailbox addresses already exist', options?: ErrorOptions) {
    super(message, options)
    this.name = 'MailboxConflictError'
  }
}

export async function mapWithConcurrencyLimit<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isSafeInteger(concurrency) || concurrency <= 0) {
    throw new RangeError('Concurrency must be a positive integer')
  }
  if (values.length === 0) return []

  const result: R[] = Array.from({ length: values.length })
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      result[index] = await mapper(values[index]!, index)
    }
  })
  await Promise.all(workers)
  return result
}

function normalizeMailboxAddress(address: string): string {
  return address.trim().toLowerCase()
}

function toMailboxInfo(mailbox: Mailbox): MailboxInfo {
  return {
    address: mailbox.address,
    credentialVersion: mailbox.credentialVersion,
    batchId: mailbox.batchId,
    createdAt: mailbox.createdAt,
    expiresAt: mailbox.expiresAt,
    lastLoginAt: mailbox.lastLoginAt,
  }
}

function errorMessages(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error)
  }

  const cause = 'cause' in error ? error.cause : undefined
  return `${error.message} ${cause === undefined ? '' : errorMessages(cause)}`
}

function isUniqueMailboxConstraint(error: unknown): boolean {
  const message = errorMessages(error).toLowerCase()
  return (
    message.includes('mailboxes.address') &&
    (message.includes('unique constraint') || message.includes('sqlite_constraint'))
  )
}

function normalizePageOptions(options: EmailPageOptions = {}) {
  const requestedLimit =
    typeof options.limit === 'number' && Number.isFinite(options.limit)
      ? Math.trunc(options.limit)
      : 50
  const requestedOffset =
    typeof options.offset === 'number' && Number.isFinite(options.offset)
      ? Math.trunc(options.offset)
      : 0

  return {
    limit: Math.min(Math.max(requestedLimit, 1), 100),
    offset: Math.max(requestedOffset, 0),
    unreadOnly: options.unreadOnly === true,
  }
}

export async function insertEmail(db: DrizzleD1Database, email: InsertEmail) {
  return db.insert(emails).values(email).execute()
}

export async function deleteEmail(db: DrizzleD1Database, id: string, messageTo: string) {
  const result = await db
    .delete(emails)
    .where(and(eq(emails.id, id), eq(emails.messageTo, normalizeMailboxAddress(messageTo))))
    .execute()
  return result.meta.changes > 0
}

export async function deleteAllEmailsByMessageTo(db: DrizzleD1Database, messageTo: string) {
  return db
    .delete(emails)
    .where(eq(emails.messageTo, normalizeMailboxAddress(messageTo)))
    .execute()
}

export async function getEmail(db: DrizzleD1Database, id: string, messageTo: string) {
  const result = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, id), eq(emails.messageTo, normalizeMailboxAddress(messageTo))))
    .limit(1)
    .all()
  return result[0] ?? null
}

export async function getEmailsPageByMessageTo(
  db: DrizzleD1Database,
  messageTo: string,
  options: EmailPageOptions = {}
): Promise<EmailPage> {
  const address = normalizeMailboxAddress(messageTo)
  const { limit, offset, unreadOnly } = normalizePageOptions(options)
  const predicate = unreadOnly
    ? and(eq(emails.messageTo, address), eq(emails.isRead, false))
    : eq(emails.messageTo, address)

  const emailQuery = db
    .select({
      id: emails.id,
      from: emails.from,
      to: emails.to,
      subject: emails.subject,
      date: emails.date,
      text: sql<string | null>`substr(${emails.text}, 1, ${EMAIL_PREVIEW_CHARACTERS})`,
      html: sql<string | null>`substr(${emails.html}, 1, ${EMAIL_PREVIEW_CHARACTERS})`,
      createdAt: emails.createdAt,
      isRead: emails.isRead,
      readAt: emails.readAt,
      priority: emails.priority,
    })
    .from(emails)
    .where(predicate)
    .orderBy(desc(emails.createdAt), desc(emails.id))
    .limit(limit)
    .offset(offset)
  const countQuery = db.select({ count: count() }).from(emails).where(predicate)
  const [emailRows, countRows] = await db.batch([emailQuery, countQuery])

  return {
    emails: emailRows,
    total: countRows[0]?.count ?? 0,
    limit,
    offset,
  }
}

export async function markEmailAsRead(db: DrizzleD1Database, id: string, messageTo: string) {
  const result = await db
    .update(emails)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(emails.id, id), eq(emails.messageTo, normalizeMailboxAddress(messageTo))))
    .execute()
  return result.meta.changes > 0
}

export async function markAllAsRead(db: DrizzleD1Database, messageTo: string) {
  const address = normalizeMailboxAddress(messageTo)
  return db
    .update(emails)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(emails.messageTo, address), eq(emails.isRead, false)))
    .execute()
}

export async function getMailboxStats(db: DrizzleD1Database, messageTo: string) {
  const result = await db
    .select({
      total: count(),
      unread: sql<number>`coalesce(sum(case when ${emails.isRead} = 0 then 1 else 0 end), 0)`,
    })
    .from(emails)
    .where(eq(emails.messageTo, normalizeMailboxAddress(messageTo)))
    .all()

  const total = result[0]?.total ?? 0
  const unread = result[0]?.unread ?? 0
  return { total, unread, read: total - unread }
}

export async function isMailboxClaimed(db: DrizzleD1Database, address: string): Promise<boolean> {
  const result = await db
    .select({ address: mailboxes.address })
    .from(mailboxes)
    .where(eq(mailboxes.address, normalizeMailboxAddress(address)))
    .limit(1)
    .all()
  return result.length > 0
}

export async function claimMailbox(
  db: DrizzleD1Database,
  address: string,
  password: string,
  expiresInDays = 30
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(expiresInDays) || expiresInDays <= 0) {
    return { success: false, error: 'Expiration must be greater than zero days' }
  }
  if (password.length === 0 || password.length > 256) {
    return { success: false, error: 'Password must be between 1 and 256 characters' }
  }

  const credential = await createPasswordCredential(password)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)

  try {
    await db
      .insert(mailboxes)
      .values({
        address: normalizeMailboxAddress(address),
        ...credential,
        credentialVersion: 1,
        batchId: null,
        createdAt: now,
        expiresAt,
        lastLoginAt: now,
      })
      .execute()
    return { success: true }
  } catch (error) {
    if (isUniqueMailboxConstraint(error)) {
      return { success: false, error: 'Mailbox already claimed' }
    }
    throw error
  }
}

export async function createPermanentMailboxesBatch(
  db: DrizzleD1Database,
  inputs: readonly PermanentMailboxInput[],
  requestedBatchId = crypto.randomUUID()
): Promise<PermanentMailboxBatchResult> {
  if (inputs.length === 0 || inputs.length > MAX_MAILBOX_BATCH_SIZE) {
    throw new RangeError(`Mailbox batch size must be between 1 and ${MAX_MAILBOX_BATCH_SIZE}`)
  }

  const batchId = requestedBatchId.trim()
  if (!batchId || batchId.length > 128) {
    throw new TypeError('Batch ID must be between 1 and 128 characters')
  }

  const addresses = inputs.map((input) => normalizeMailboxAddress(input.address))
  if (addresses.some((address) => !address || address.length > 320)) {
    throw new TypeError('Mailbox address must be between 1 and 320 characters')
  }
  if (new Set(addresses).size !== addresses.length) {
    throw new MailboxConflictError('Mailbox batch contains duplicate addresses')
  }
  if (inputs.some((input) => input.password.length === 0 || input.password.length > 256)) {
    throw new TypeError('Mailbox password must be between 1 and 256 characters')
  }

  const createCredential = (input: PermanentMailboxInput) =>
    createPasswordCredential(input.password)
  const credentials = await mapWithConcurrencyLimit(
    inputs,
    PASSWORD_HASH_CONCURRENCY,
    createCredential
  )
  const createdAt = new Date()
  const rows = inputs.map((_, index) => ({
    address: addresses[index]!,
    ...credentials[index]!,
    credentialVersion: 1,
    batchId,
    createdAt,
    expiresAt: null,
    lastLoginAt: null,
  }))
  const insertQueries = rows.map((row) => db.insert(mailboxes).values(row))

  try {
    // D1 executes batch statements as one transaction and rolls the entire batch
    // back if any address violates the primary-key constraint.
    await db.batch([insertQueries[0]!, ...insertQueries.slice(1)])
  } catch (error) {
    if (isUniqueMailboxConstraint(error)) {
      throw new MailboxConflictError(undefined, { cause: error })
    }
    throw error
  }

  return {
    batchId,
    mailboxes: rows.map((row) => toMailboxInfo(row)),
  }
}

async function getMailboxCredentials(db: DrizzleD1Database, address: string) {
  const result = await db
    .select()
    .from(mailboxes)
    .where(eq(mailboxes.address, normalizeMailboxAddress(address)))
    .limit(1)
    .all()
  return result[0] ?? null
}

export async function loginMailbox(
  db: DrizzleD1Database,
  address: string,
  password: string
): Promise<{ success: boolean; error?: string; mailbox?: MailboxInfo }> {
  const mailbox = await getMailboxCredentials(db, address)
  if (!mailbox) {
    await verifyPasswordCredential(
      password,
      DUMMY_PASSWORD_CREDENTIAL.salt,
      DUMMY_PASSWORD_CREDENTIAL.passwordHash
    )
    return { success: false, error: 'Mailbox not found' }
  }
  if (mailbox.expiresAt && mailbox.expiresAt.getTime() <= Date.now()) {
    await verifyPasswordCredential(
      password,
      DUMMY_PASSWORD_CREDENTIAL.salt,
      DUMMY_PASSWORD_CREDENTIAL.passwordHash
    )
    return { success: false, error: 'Mailbox has expired' }
  }

  const verification = await verifyPasswordCredential(password, mailbox.salt, mailbox.passwordHash)
  if (!verification.valid) {
    return { success: false, error: 'Invalid password' }
  }

  const lastLoginAt = new Date()
  const upgradedCredential = verification.needsUpgrade
    ? await createPasswordCredential(password)
    : undefined
  await db
    .update(mailboxes)
    .set({ lastLoginAt, ...upgradedCredential })
    .where(eq(mailboxes.address, mailbox.address))
    .execute()

  return { success: true, mailbox: { ...toMailboxInfo(mailbox), lastLoginAt } }
}

export async function getMailbox(db: DrizzleD1Database, address: string) {
  const mailbox = await getMailboxCredentials(db, address)
  return mailbox ? toMailboxInfo(mailbox) : null
}

export async function extendMailboxExpiration(
  db: DrizzleD1Database,
  address: string,
  additionalDays = 30
) {
  if (!Number.isFinite(additionalDays) || additionalDays <= 0) {
    return { success: false, error: 'Extension must be greater than zero days' }
  }

  const mailbox = await getMailbox(db, address)
  if (!mailbox) {
    return { success: false, error: 'Mailbox not found' }
  }
  if (!mailbox.expiresAt) {
    return { success: false, error: 'Permanent mailboxes do not expire' }
  }

  const newExpiry = new Date(mailbox.expiresAt.getTime() + additionalDays * 24 * 60 * 60 * 1000)
  await db
    .update(mailboxes)
    .set({ expiresAt: newExpiry })
    .where(eq(mailboxes.address, mailbox.address))
    .execute()

  return { success: true, expiresAt: newExpiry }
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

const generateApiKey = () => `vmails_${toHex(crypto.getRandomValues(new Uint8Array(32)))}`

export async function createApiKey(
  db: DrizzleD1Database,
  name: string,
  mailboxAddress?: string,
  expiresInDays?: number
): Promise<{ success: boolean; apiKey?: string; error?: string }> {
  const key = generateApiKey()
  const now = new Date()
  const expiresAt = expiresInDays
    ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  await db
    .insert(apiKeys)
    .values({
      id: crypto.randomUUID(),
      key,
      name,
      mailboxAddress: mailboxAddress ? normalizeMailboxAddress(mailboxAddress) : null,
      createdAt: now,
      expiresAt,
      lastUsedAt: null,
      isActive: true,
      rateLimit: 100,
    })
    .execute()

  return { success: true, apiKey: key }
}

export async function verifyApiKey(
  db: DrizzleD1Database,
  key: string
): Promise<{ valid: boolean; apiKey?: typeof apiKeys.$inferSelect; error?: string }> {
  const result = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1).all()
  const apiKey = result[0]

  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' }
  }
  if (!apiKey.isActive) {
    return { valid: false, error: 'API key is inactive' }
  }
  if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
    return { valid: false, error: 'API key has expired' }
  }

  const lastUsedAt = new Date()
  await db.update(apiKeys).set({ lastUsedAt }).where(eq(apiKeys.id, apiKey.id)).execute()
  return { valid: true, apiKey: { ...apiKey, lastUsedAt } }
}

export async function revokeApiKey(
  db: DrizzleD1Database,
  key: string
): Promise<{ success: boolean; error?: string }> {
  await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.key, key)).execute()
  return { success: true }
}

export async function getApiKeysByMailbox(db: DrizzleD1Database, mailboxAddress: string) {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.mailboxAddress, normalizeMailboxAddress(mailboxAddress)))
    .orderBy(desc(apiKeys.createdAt))
    .all()
}
