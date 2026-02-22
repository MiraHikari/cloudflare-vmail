import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema } from 'drizzle-zod'
import * as z from 'zod'

export type Header = Record<string, string>

export type Address = {
  address: string
  name: string
}

export type Email = typeof emails.$inferSelect
export type Mailbox = typeof mailboxes.$inferSelect

export const emails = sqliteTable('emails', {
  id: text('id').primaryKey(),
  messageFrom: text('message_from').notNull(),
  messageTo: text('message_to').notNull(),
  headers: text('headers', { mode: 'json' }).$type<Header[]>().notNull(),
  from: text('from', { mode: 'json' }).$type<Address>().notNull(),
  sender: text('sender', { mode: 'json' }).$type<Address>(),
  replyTo: text('reply_to', { mode: 'json' }).$type<Address[]>(),
  deliveredTo: text('delivered_to'),
  returnPath: text('return_path'),
  to: text('to', { mode: 'json' }).$type<Address[]>(),
  cc: text('cc', { mode: 'json' }).$type<Address[]>(),
  bcc: text('bcc', { mode: 'json' }).$type<Address[]>(),
  subject: text('subject'),
  messageId: text('message_id').notNull(),
  inReplyTo: text('in_reply_to'),
  references: text('references'),
  date: text('date'),
  html: text('html'),
  text: text('text'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  readAt: integer('read_at', { mode: 'timestamp' }),
  priority: text('priority', { enum: ['high', 'normal', 'low'] })
    .notNull()
    .default('normal'),
})

const AddressSchema = z.object({
  address: z.string(),
  name: z.string(),
})

export const insertEmailSchema = createInsertSchema(emails, {
  headers: z.array(z.record(z.string())),
  from: AddressSchema,
  sender: AddressSchema.optional(),
  replyTo: z.array(AddressSchema).optional(),
  to: z.array(AddressSchema).optional(),
  cc: z.array(AddressSchema).optional(),
  bcc: z.array(AddressSchema).optional(),
})

export type InsertEmail = z.infer<typeof insertEmailSchema>

// Mailboxes table for claimed mailboxes with password
export const mailboxes = sqliteTable('mailboxes', {
  address: text('address').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
})

export const insertMailboxSchema = createInsertSchema(mailboxes)
export type InsertMailbox = z.infer<typeof insertMailboxSchema>

// API Keys table for developer API access
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  mailboxAddress: text('mailbox_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  rateLimit: integer('rate_limit').notNull().default(100), // requests per minute
})

export const insertApiKeySchema = createInsertSchema(apiKeys)
export type InsertApiKey = z.infer<typeof insertApiKeySchema>
export type ApiKey = typeof apiKeys.$inferSelect
