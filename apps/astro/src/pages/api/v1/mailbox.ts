import type { APIRoute } from 'astro'
import { z } from 'zod'
import { ApiError, apiErrorResponse, jsonResponse, parseJsonBody } from '@/lib/api'
import { createTemporaryMailboxToken } from '@/lib/auth'
import { generateMailboxAddress } from '@/lib/mailbox-api'
import { getAvailableDomains, getRuntimeBindings } from '@/lib/runtime'

const requestSchema = z.object({ domain: z.string().trim().toLowerCase().optional() })

export const POST: APIRoute = async ({ request }) => {
  try {
    let requestedDomain: string | undefined
    if (request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      requestedDomain = (await parseJsonBody(request, requestSchema, { allowEmpty: true })).domain
    }

    const env = getRuntimeBindings()
    const domains = getAvailableDomains(env)
    if (requestedDomain && !domains.includes(requestedDomain)) {
      throw new ApiError(400, 'DOMAIN_NOT_ALLOWED', 'The requested mailbox domain is not allowed')
    }
    const domain = requestedDomain ?? domains[0]!
    const address = generateMailboxAddress(domain)

    return jsonResponse(
      {
        success: true,
        mailbox: {
          address,
          token: await createTemporaryMailboxToken(address, env.JWT_SECRET),
          expiresIn: '7 days',
          createdAt: new Date(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return apiErrorResponse(error)
  }
}
