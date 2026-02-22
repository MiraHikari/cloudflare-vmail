import type { APIRoute } from 'astro'
import * as DAO from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import { verifyMailboxAccessToken } from '@/lib/utils'

/**
 * GET /api/v1/mailbox/[address]/emails/[id]
 * Get a specific email by ID
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Response:
 *   {
 *     success: true,
 *     email: Email
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

    const token = authHeader.substring(7)
    const verification = await verifyMailboxAccessToken(token, locals.runtime.env.JWT_SECRET)

    if (!verification.valid) {
      return new Response(JSON.stringify({ error: verification.error || 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get parameters
    const mailboxAddress = params.address
    const emailId = params.id

    if (!mailboxAddress || !emailId) {
      return new Response(JSON.stringify({ error: 'Mailbox address and email ID required' }), {
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

    // Get the email
    const email = await DAO.getEmail(db, emailId)

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify the email belongs to the requested mailbox
    if (email.messageTo !== mailboxAddress) {
      return new Response(JSON.stringify({ error: 'Email does not belong to this mailbox' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: {
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
        },
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

/**
 * DELETE /api/v1/mailbox/[address]/emails/[id]
 * Delete a specific email
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Response:
 *   {
 *     success: true
 *   }
 */
export const DELETE: APIRoute = async ({ request, locals, params }) => {
  try {
    // Verify authorization token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization token required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.substring(7)
    const verification = await verifyMailboxAccessToken(token, locals.runtime.env.JWT_SECRET)

    if (!verification.valid) {
      return new Response(JSON.stringify({ error: verification.error || 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get parameters
    const mailboxAddress = params.address
    const emailId = params.id

    if (!mailboxAddress || !emailId) {
      return new Response(JSON.stringify({ error: 'Mailbox address and email ID required' }), {
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

    // Get the email to verify ownership
    const email = await DAO.getEmail(db, emailId)

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify the email belongs to the requested mailbox
    if (email.messageTo !== mailboxAddress) {
      return new Response(JSON.stringify({ error: 'Email does not belong to this mailbox' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Delete the email
    await DAO.deleteEmail(db, emailId)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('API Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
