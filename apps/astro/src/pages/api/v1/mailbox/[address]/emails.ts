import type { APIRoute } from 'astro'
import { getEmailsPageByMessageTo } from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import { z, ZodError } from 'zod'
import { ApiError, decodePathParameter, jsonResponse, parseNonNegativeInteger } from '@/lib/api'
import { authorizeTemporaryMailbox, serializeEmailSummary } from '@/lib/mailbox-api'
import { getRuntimeBindings } from '@/lib/runtime'

const addressSchema = z.email()

export const GET: APIRoute = async ({ request, params }) => {
  try {
    if (!params.address) throw new ApiError(400, 'MAILBOX_REQUIRED', 'Mailbox address required')
    const address = addressSchema.parse(decodePathParameter(params.address))
    const env = getRuntimeBindings()
    const db = getCloudflareD1(env.DB)
    await authorizeTemporaryMailbox(db, request, address, env.JWT_SECRET)

    const url = new URL(request.url)
    const limit = Math.max(1, parseNonNegativeInteger(url.searchParams.get('limit'), 50, 100))
    const offset = parseNonNegativeInteger(
      url.searchParams.get('offset'),
      0,
      Number.MAX_SAFE_INTEGER
    )
    const unread = url.searchParams.get('unread_only')
    if (unread !== null && unread !== 'true' && unread !== 'false') {
      throw new ApiError(400, 'INVALID_QUERY', 'unread_only must be true or false')
    }

    const page = await getEmailsPageByMessageTo(db, address, {
      limit,
      offset,
      unreadOnly: unread === 'true',
    })
    return jsonResponse({
      success: true,
      emails: page.emails.map(serializeEmailSummary),
      total: page.total,
      limit: page.limit,
      offset: page.offset,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonResponse({ error: error.message }, { status: error.status })
    }
    if (error instanceof ZodError) {
      return jsonResponse({ error: 'Invalid mailbox address' }, { status: 400 })
    }
    console.error('v1 email listing failed', error)
    return jsonResponse({ error: 'Internal server error' }, { status: 500 })
  }
}
