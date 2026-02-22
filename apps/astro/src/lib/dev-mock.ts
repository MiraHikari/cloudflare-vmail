/**
 * Development Mock Data Utilities
 * Provides mock data for local development without requiring external services
 */

import type { Email } from 'database/schema'

const MOCK_SENDERS = [
  { name: 'GitHub', address: 'noreply@github.com' },
  { name: 'Vercel', address: 'team@vercel.com' },
  { name: 'Stripe', address: 'receipts@stripe.com' },
  { name: 'AWS', address: 'no-reply-aws@amazon.com' },
  { name: 'Vercel', address: 'support@vercel.com' },
  { name: 'GitLab', address: 'noreply@gitlab.com' },
  { name: 'Docker Hub', address: 'noreply@docker.com' },
  { name: 'npm', address: 'npm@npmjs.com' },
]

const MOCK_SUBJECTS = [
  'Welcome to our platform!',
  'Your verification code is ready',
  'Password reset request',
  'New login detected',
  'Invoice #12345',
  'Account verification required',
  'Security alert: New device sign-in',
  'Your subscription is confirmed',
  'Action required: Verify your email',
  'Welcome aboard! 🎉',
]

const MOCK_CONTENTS = [
  `Hi there,

Welcome to our platform! We're excited to have you on board.

Your verification code is: 123456

This code will expire in 10 minutes.

Best regards,
The Team`,

  `Hello,

We noticed a new sign-in to your account from a new device.

If this was you, you can ignore this email. If you didn't sign in, please secure your account immediately.

Device: Chrome on Windows
Location: San Francisco, CA
IP: 192.168.1.1

Best,
Security Team`,

  `Dear user,

Your invoice #12345 has been generated.

Amount: $29.00
Due date: 2025-12-31

Please find the attached invoice for your records.

Thank you for your business!`,

  `Hi!

Thank you for subscribing to our service. Your subscription is now active.

Plan: Pro
Billing cycle: Monthly
Next payment: 2025-01-01

If you have any questions, feel free to reach out.

Cheers!`,
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randomDate(): Date {
  const now = new Date()
  const hoursAgo = Math.floor(Math.random() * 48)
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
}

/**
 * Generate mock emails for development
 */
export function generateMockEmails(
  count: number = 5,
  mailbox: string = 'test@example.com'
): Email[] {
  return Array.from({ length: count }, (_, i) => {
    const sender = randomItem(MOCK_SENDERS)
    const subject = randomItem(MOCK_SUBJECTS)
    const text = randomItem(MOCK_CONTENTS)
    const date = randomDate()

    return {
      id: generateId(),
      messageFrom: sender.address,
      messageTo: mailbox,
      headers: [],
      from: sender,
      sender: null,
      replyTo: null,
      deliveredTo: mailbox,
      returnPath: sender.address,
      to: [{ address: mailbox, name: '' }],
      cc: null,
      bcc: null,
      subject,
      messageId: `<${generateId()}@example.com>`,
      inReplyTo: null,
      references: null,
      date: date.toISOString(),
      createdAt: date,
      updatedAt: date,
      isRead: i < 2, // First 2 are read
      readAt: i < 2 ? date : null,
      priority: 'normal',
      text,
      html: `<html><body><p>${text.replace(/\n/g, '<br>')}</p></body></html>`,
    } as Email
  })
}

/**
 * Mock mailbox session for development
 */
export function generateMockMailboxSession(mailbox: string = 'test@example.com') {
  return {
    mailbox,
    token: 'mock-jwt-token-for-development-only',
  }
}

/**
 * Check if we're in development mode
 */
export function checkDevMode(): boolean {
  return import.meta.env.DEV || import.meta.env.PUBLIC_DEV_MODE === 'true'
}

/**
 * Check if mock data should be used
 */
export function shouldUseMockData(): boolean {
  return checkDevMode() && import.meta.env.PUBLIC_USE_MOCK_DATA !== 'false'
}
