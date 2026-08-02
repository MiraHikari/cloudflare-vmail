export interface MailboxSession {
  mailbox: string
  token: string
}

/**
 * Parse the JSON stored in the mailbox cookie without trusting its shape.
 * Cookies are user-controlled input and can be stale or manually edited.
 */
export function parseMailboxSession(value: unknown): MailboxSession | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  if (
    typeof record.mailbox !== 'string' ||
    typeof record.token !== 'string' ||
    record.mailbox.length === 0 ||
    record.token.length === 0
  ) {
    return null
  }

  return { mailbox: record.mailbox, token: record.token }
}

export function readMailboxSession(readCookie: () => unknown): MailboxSession | null {
  try {
    return parseMailboxSession(readCookie())
  } catch {
    return null
  }
}
