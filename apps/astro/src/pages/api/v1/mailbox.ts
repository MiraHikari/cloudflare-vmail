import type { APIRoute } from 'astro'
import { generateNewMailAddr, genMailboxAccessToken } from '@/lib/utils'

/**
 * POST /api/v1/mailbox
 * Create a new temporary mailbox and get access token
 *
 * Body (optional):
 *   domain: string - Custom domain (optional, uses default if not provided)
 *
 * Response:
 *   {
 *     success: true,
 *     mailbox: {
 *       address: string,
 *       token: string,
 *       expiresIn: string,
 *       createdAt: string
 *     }
 *   }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let domain: string | undefined
    try {
      const body = (await request.json()) as { domain?: string }
      domain = body.domain
    } catch {
      // If no body or invalid JSON, use default domain
    }

    // Get available domains from environment
    const availableDomains = String(locals.runtime.env.AVAILABLE_DOMAINS).split(',')
    const selectedDomain =
      (domain && availableDomains.includes(domain) ? domain : availableDomains[0]) || 'example.com'

    // Generate new mailbox
    const mailboxAddress = generateNewMailAddr(selectedDomain)

    // Generate access token
    const accessToken = await genMailboxAccessToken(mailboxAddress, locals.runtime.env.JWT_SECRET)

    return new Response(
      JSON.stringify({
        success: true,
        mailbox: {
          address: mailboxAddress,
          token: accessToken,
          expiresIn: '7 days',
          createdAt: new Date().toISOString(),
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('API Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
