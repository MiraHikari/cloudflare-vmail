import type { APIRoute } from 'astro'
import * as DAO from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import { verifyMailboxAccessToken } from '@/lib/utils'

/**
 * GET /api/v1/mailbox/[address]/emails
 * Get all emails for a specific mailbox
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Query Parameters:
 *   limit: number (optional) - Limit number of emails returned (default: 50)
 *   offset: number (optional) - Offset for pagination (default: 0)
 *   unread_only: boolean (optional) - Only return unread emails
 *
 * Response:
 *   {
 *     success: true,
 *     emails: Email[],
 *     total: number
 *   }
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    // Verify authorization token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization token required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const verification = await verifyMailboxAccessToken(token, locals.runtime.env.JWT_SECRET)

    if (!verification.valid) {
      return new Response(JSON.stringify({ error: verification.error || 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get mailbox address from params
    const mailboxAddress = params.address
    if (!mailboxAddress) {
      return new Response(JSON.stringify({ error: 'Mailbox address required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify token matches the requested mailbox
    if (verification.mailbox !== mailboxAddress) {
      return new Response(JSON.stringify({ error: 'Token does not match mailbox address' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const db = getCloudflareD1(locals.runtime.env.DB as D1Database)

    // Parse query parameters
    const url = new URL(request.url)
    const limit = Math.min(Number.parseInt(url.searchParams.get('limit') || '50'), 100) // Max 100
    const offset = Number.parseInt(url.searchParams.get('offset') || '0')
    const unreadOnly = url.searchParams.get('unread_only') === 'true'

    // Get all emails for the mailbox
    let emails = await DAO.getEmailsByMessageTo(db, mailboxAddress)

    // Filter for unread only if requested
    if (unreadOnly) {
      emails = emails.filter((email) => !email.isRead)
    }

    const total = emails.length

    // Apply pagination
    const paginatedEmails = emails.slice(offset, offset + limit)

    // Remove sensitive data and large content from response
    const sanitizedEmails = paginatedEmails.map((email) => ({
      id: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      date: email.date,
      createdAt: email.createdAt,
      isRead: email.isRead,
      readAt: email.readAt,
      priority: email.priority,
      // Include a preview of text content (first 200 chars)
      textPreview: email.text
        ? email.text.substring(0, 200) + (email.text.length > 200 ? '...' : '')
        : null,
      hasHtml: !!email.html,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        emails: sanitizedEmails,
        total,
        limit,
        offset,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('API Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
