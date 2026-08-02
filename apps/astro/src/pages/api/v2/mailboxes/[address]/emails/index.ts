import type { APIRoute } from 'astro'
import { getEmailsPageByMessageTo } from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import { z } from 'zod'
import {
  ApiError,
  apiErrorResponse,
  decodePathParameter,
  jsonResponse,
  parseNonNegativeInteger,
} from '@/lib/api'
import { authorizePermanentMailbox, serializeEmailSummary } from '@/lib/mailbox-api'
import { getRuntimeBindings } from '@/lib/runtime'

const addressSchema = z.string().trim().toLowerCase().pipe(z.email())

export const GET: APIRoute = async ({ request, params }) => {
  try {
    if (!params.address) throw new ApiError(400, 'MAILBOX_REQUIRED', 'Mailbox address is required')
    const address = addressSchema.parse(decodePathParameter(params.address))
    const env = getRuntimeBindings()
    const db = getCloudflareD1(env.DB)
    await authorizePermanentMailbox(db, request, address, env.JWT_SECRET)

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
    return apiErrorResponse(error)
  }
}
