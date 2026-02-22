import { count, desc, eq, and } from 'drizzle-orm'
import { DrizzleD1Database } from 'drizzle-orm/d1'
import { emails, InsertEmail, mailboxes, apiKeys } from './schema'

// Helper function to handle database operations with consistent error handling
async function dbOperation<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation()
  } catch (e) {
    console.error(e)
    return fallback
  }
}

export async function insertEmail(db: DrizzleD1Database, email: InsertEmail) {
  return dbOperation(() => db.insert(emails).values(email).execute(), undefined)
}

export async function getEmails(db: DrizzleD1Database) {
  return dbOperation(() => db.select().from(emails).all(), [])
}

export async function deleteEmail(db: DrizzleD1Database, id: string) {
  return dbOperation(() => db.delete(emails).where(eq(emails.id, id)).execute(), null)
}

export async function deleteAllEmailsByMessageTo(db: DrizzleD1Database, messageTo: string) {
  return dbOperation(() => db.delete(emails).where(eq(emails.messageTo, messageTo)).execute(), null)
}

export async function getEmail(db: DrizzleD1Database, id: string) {
  return dbOperation(async () => {
    const result = await db.select().from(emails).where(eq(emails.id, id)).all()
    return result[0] || null
  }, null)
}

export async function getMailboxOfEmail(db: DrizzleD1Database, id: string) {
  return dbOperation(async () => {
    const result = await db
      .select({ messageTo: emails.messageTo })
      .from(emails)
      .where(eq(emails.id, id))
      .limit(1)
      .all()
    return result[0] || null
  }, null)
}

export async function getEmailsByMessageTo(db: DrizzleD1Database, messageTo: string) {
  return dbOperation(
    () =>
      db
        .select()
        .from(emails)
        .where(eq(emails.messageTo, messageTo))
        .orderBy(desc(emails.createdAt))
        .all(),
    []
  )
}

export async function getEmailsCount(db: DrizzleD1Database) {
  return dbOperation(async () => {
    const res = await db.select({ count: count() }).from(emails)
    return res[0]?.count ?? 0
  }, 0)
}

export async function markEmailAsRead(db: DrizzleD1Database, id: string) {
  return dbOperation(
    () =>
      db
        .update(emails)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(emails.id, id))
        .execute(),
    null
  )
}

export async function markAllAsRead(db: DrizzleD1Database, messageTo: string) {
  return dbOperation(
    () =>
      db
        .update(emails)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(emails.messageTo, messageTo))
        .execute(),
    null
  )
}

export async function getMailboxStats(db: DrizzleD1Database, messageTo: string) {
  return dbOperation(
    async () => {
      const [total, unread] = await Promise.all([
        db.select({ count: count() }).from(emails).where(eq(emails.messageTo, messageTo)),
        db
          .select({ count: count() })
          .from(emails)
          .where(and(eq(emails.messageTo, messageTo), eq(emails.isRead, false))),
      ])

      const totalCount = total[0]?.count ?? 0
      const unreadCount = unread[0]?.count ?? 0

      return {
        total: totalCount,
        unread: unreadCount,
        read: totalCount - unreadCount,
      }
    },
    { total: 0, unread: 0, read: 0 }
  )
}

// ============ Mailbox Functions ============

// Helper: Convert byte array to hex string
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

// Generate a random salt
async function generateSalt(): Promise<string> {
  return toHex(crypto.getRandomValues(new Uint8Array(16)))
}

// Hash password with salt using Web Crypto API
async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return toHex(new Uint8Array(hashBuffer))
}

// Verify password
async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  return (await hashPassword(password, salt)) === hash
}

// Check if mailbox is claimed
export async function isMailboxClaimed(db: DrizzleD1Database, address: string): Promise<boolean> {
  return dbOperation(async () => {
    const result = await db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.address, address))
      .limit(1)
      .all()
    return result.length > 0
  }, false)
}

// Claim a mailbox with password
export async function claimMailbox(
  db: DrizzleD1Database,
  address: string,
  password: string,
  expiresInDays: number = 30
): Promise<{ success: boolean; error?: string }> {
  return dbOperation(
    async () => {
      if (await isMailboxClaimed(db, address)) {
        return { success: false, error: 'Mailbox already claimed' }
      }

      const salt = await generateSalt()
      const passwordHash = await hashPassword(password, salt)
      const now = new Date()
      const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)

      await db
        .insert(mailboxes)
        .values({
          address,
          passwordHash,
          salt,
          createdAt: now,
          expiresAt,
          lastLoginAt: now,
        })
        .execute()

      return { success: true }
    },
    { success: false, error: 'Failed to claim mailbox' }
  )
}

// Login to claimed mailbox
export async function loginMailbox(
  db: DrizzleD1Database,
  address: string,
  password: string
): Promise<{ success: boolean; error?: string; mailbox?: typeof mailboxes.$inferSelect }> {
  return dbOperation(
    async () => {
      const result = await db
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.address, address))
        .limit(1)
        .all()
      const mailbox = result[0]

      if (!mailbox) {
        return { success: false, error: 'Mailbox not found' }
      }

      if (mailbox.expiresAt && new Date(mailbox.expiresAt) < new Date()) {
        return { success: false, error: 'Mailbox has expired' }
      }

      if (!(await verifyPassword(password, mailbox.salt, mailbox.passwordHash))) {
        return { success: false, error: 'Invalid password' }
      }

      await db
        .update(mailboxes)
        .set({ lastLoginAt: new Date() })
        .where(eq(mailboxes.address, address))
        .execute()

      return { success: true, mailbox }
    },
    { success: false, error: 'Login failed' }
  )
}

// Get mailbox info
export async function getMailbox(db: DrizzleD1Database, address: string) {
  return dbOperation(async () => {
    const result = await db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.address, address))
      .limit(1)
      .all()
    return result[0] || null
  }, null)
}

// Extend mailbox expiration
export async function extendMailboxExpiration(
  db: DrizzleD1Database,
  address: string,
  additionalDays: number = 30
) {
  return dbOperation(
    async () => {
      const mailbox = await getMailbox(db, address)
      if (!mailbox) {
        return { success: false, error: 'Mailbox not found' }
      }

      const currentExpiry = new Date(mailbox.expiresAt)
      const newExpiry = new Date(currentExpiry.getTime() + additionalDays * 24 * 60 * 60 * 1000)

      await db
        .update(mailboxes)
        .set({ expiresAt: newExpiry })
        .where(eq(mailboxes.address, address))
        .execute()

      return { success: true, expiresAt: newExpiry }
    },
    { success: false, error: 'Failed to extend expiration' }
  )
}

// ============ API Key Functions ============

// Generate a random API key
const generateApiKey = () => 'vmails_' + toHex(crypto.getRandomValues(new Uint8Array(32)))

// Generate unique ID
const generateId = () => crypto.randomUUID()

// Create API key
export async function createApiKey(
  db: DrizzleD1Database,
  name: string,
  mailboxAddress?: string,
  expiresInDays?: number
): Promise<{ success: boolean; apiKey?: string; error?: string }> {
  return dbOperation<{ success: boolean; apiKey?: string; error?: string }>(
    async () => {
      const id = generateId()
      const key = generateApiKey()
      const now = new Date()
      const expiresAt = expiresInDays
        ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
        : null

      await db
        .insert(apiKeys)
        .values({
          id,
          key,
          name,
          mailboxAddress: mailboxAddress || null,
          createdAt: now,
          expiresAt,
          lastUsedAt: null,
          isActive: true,
          rateLimit: 100,
        })
        .execute()

      return { success: true, apiKey: key }
    },
    { success: false, error: 'Failed to create API key' }
  )
}

// Verify API key
export async function verifyApiKey(
  db: DrizzleD1Database,
  key: string
): Promise<{ valid: boolean; apiKey?: typeof apiKeys.$inferSelect; error?: string }> {
  return dbOperation(
    async () => {
      const result = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1).all()
      const apiKey = result[0]

      if (!apiKey) {
        return { valid: false, error: 'Invalid API key' }
      }

      if (!apiKey.isActive) {
        return { valid: false, error: 'API key is inactive' }
      }

      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        return { valid: false, error: 'API key has expired' }
      }

      await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.key, key)).execute()

      return { valid: true, apiKey }
    },
    { valid: false, error: 'Failed to verify API key' }
  )
}

// Revoke API key
export async function revokeApiKey(
  db: DrizzleD1Database,
  key: string
): Promise<{ success: boolean; error?: string }> {
  return dbOperation<{ success: boolean; error?: string }>(
    async () => {
      await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.key, key)).execute()
      return { success: true }
    },
    { success: false, error: 'Failed to revoke API key' }
  )
}

// Get all API keys for a mailbox
export async function getApiKeysByMailbox(db: DrizzleD1Database, mailboxAddress: string) {
  return dbOperation(
    () =>
      db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.mailboxAddress, mailboxAddress))
        .orderBy(desc(apiKeys.createdAt))
        .all(),
    []
  )
}
