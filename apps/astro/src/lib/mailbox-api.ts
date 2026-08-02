import type { EmailSummary } from 'database/dao'
import type { getCloudflareD1 } from 'database/db'
import type { Email } from 'database/schema'
import { getMailbox, isMailboxClaimed } from 'database/dao'
import { ApiError } from './api'
import {
  authenticateMailboxRequest,
  authenticateTemporaryMailboxRequest,
  verifyMailboxSessionToken,
} from './auth'

export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 24 * 60 * 60
type VmailDatabase = ReturnType<typeof getCloudflareD1>

export function generateMailboxAddress(domain: string): string {
  const entropy = crypto.getRandomValues(new Uint8Array(12))
  const localPart = Array.from(entropy, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `mbx-${localPart}@${domain}`
}

export function generateMailboxPassword(): string {
  const entropy = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(entropy, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function authorizeMailboxSession(
  db: VmailDatabase,
  token: string,
  expectedMailbox: string,
  secret: string
) {
  const claims = await verifyMailboxSessionToken(token, secret)
  if (claims.mailbox !== expectedMailbox) {
    throw new ApiError(401, 'INVALID_SESSION', 'The mailbox session is invalid or expired')
  }

  const mailbox = await getMailbox(db, expectedMailbox)
  const validTemporarySession = claims.credentialVersion === null && mailbox === null
  const validClaimedSession =
    claims.credentialVersion !== null &&
    mailbox !== null &&
    claims.credentialVersion === mailbox.credentialVersion &&
    (mailbox.expiresAt === null || mailbox.expiresAt.getTime() > Date.now())

  if (!validTemporarySession && !validClaimedSession) {
    throw new ApiError(401, 'INVALID_SESSION', 'The mailbox session is invalid or expired')
  }
  return claims
}

export async function authorizePermanentMailbox(
  db: VmailDatabase,
  request: Request,
  address: string,
  secret: string
) {
  const claims = await authenticateMailboxRequest(request, address, secret)
  const mailbox = await getMailbox(db, address)

  if (
    !mailbox ||
    mailbox.credentialVersion !== claims.credentialVersion ||
    mailbox.expiresAt !== null
  ) {
    throw new ApiError(401, 'NOT_PERMANENT_MAILBOX', 'The mailbox is not a permanent mailbox')
  }

  return mailbox
}

export async function authorizeTemporaryMailbox(
  db: VmailDatabase,
  request: Request,
  address: string,
  secret: string
) {
  const mailbox = await authenticateTemporaryMailboxRequest(request, address, secret)
  if (await isMailboxClaimed(db, mailbox)) {
    throw new ApiError(
      401,
      'MAILBOX_CLAIMED',
      'Use the mailbox password after claiming this mailbox'
    )
  }
  return mailbox
}

export function serializeEmailSummary(email: EmailSummary) {
  const text = email.text ?? ''
  return {
    id: email.id,
    from: email.from,
    to: email.to,
    subject: email.subject,
    date: email.date,
    createdAt: email.createdAt,
    isRead: email.isRead,
    readAt: email.readAt,
    priority: email.priority,
    textPreview: text ? `${text.slice(0, 200)}${text.length > 200 ? '...' : ''}` : null,
    hasHtml: Boolean(email.html),
  }
}

export function serializeEmail(email: Email) {
  return {
    id: email.id,
    from: email.from,
    sender: email.sender,
    replyTo: email.replyTo,
    to: email.to,
    cc: email.cc,
    bcc: email.bcc,
    subject: email.subject,
    messageId: email.messageId,
    inReplyTo: email.inReplyTo,
    references: email.references,
    date: email.date,
    text: email.text,
    html: email.html,
    headers: email.headers,
    createdAt: email.createdAt,
    updatedAt: email.updatedAt,
    isRead: email.isRead,
    readAt: email.readAt,
    priority: email.priority,
    deliveredTo: email.deliveredTo,
    returnPath: email.returnPath,
  }
}
