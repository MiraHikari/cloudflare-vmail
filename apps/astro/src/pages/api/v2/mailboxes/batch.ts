import type { APIRoute } from 'astro'
import { createPermanentMailboxesBatch, MailboxConflictError } from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import { z } from 'zod'
import { ApiError, apiErrorResponse, jsonResponse, parseJsonBody } from '@/lib/api'
import { createMailboxToken, encodeJWTSecret, requireAdminToken } from '@/lib/auth'
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  generateMailboxAddress,
  generateMailboxPassword,
} from '@/lib/mailbox-api'
import { getAvailableDomains, getRuntimeBindings } from '@/lib/runtime'

const MAX_BATCH_SIZE = 100
const MAX_CONFLICT_RETRIES = 5

const batchRequestSchema = z.object({
  count: z.number().int().min(1).max(MAX_BATCH_SIZE),
  domain: z.string().trim().toLowerCase().optional(),
})

export const POST: APIRoute = async ({ request }) => {
  try {
    const env = getRuntimeBindings()
    await requireAdminToken(request, env.BATCH_ADMIN_TOKEN)
    encodeJWTSecret(env.JWT_SECRET)

    const input = await parseJsonBody(request, batchRequestSchema)
    const availableDomains = getAvailableDomains(env)
    const domain = input.domain ?? availableDomains[0]!
    if (!availableDomains.includes(domain)) {
      throw new ApiError(400, 'DOMAIN_NOT_ALLOWED', 'The requested mailbox domain is not allowed')
    }

    const db = getCloudflareD1(env.DB)
    const batchId = crypto.randomUUID()
    for (let attempt = 1; attempt <= MAX_CONFLICT_RETRIES; attempt += 1) {
      const credentials = Array.from({ length: input.count }, () => ({
        address: generateMailboxAddress(domain),
        password: generateMailboxPassword(),
      }))

      try {
        const batch = await createPermanentMailboxesBatch(db, credentials, batchId)
        const passwordByAddress = new Map(
          credentials.map(({ address, password }) => [address, password])
        )
        const result = await Promise.all(
          batch.mailboxes.map(async (mailbox) => ({
            address: mailbox.address,
            password: passwordByAddress.get(mailbox.address)!,
            accessToken: await createMailboxToken(
              mailbox.address,
              mailbox.credentialVersion,
              env.JWT_SECRET
            ),
            tokenType: 'Bearer' as const,
            tokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
            accountExpiresAt: null,
          }))
        )

        return jsonResponse(
          {
            success: true,
            batch: {
              id: batchId,
              count: result.length,
              createdAt: batch.mailboxes[0]!.createdAt,
            },
            mailboxes: result,
          },
          { status: 201 }
        )
      } catch (error) {
        if (error instanceof MailboxConflictError && attempt < MAX_CONFLICT_RETRIES) {
          continue
        }
        if (error instanceof MailboxConflictError) {
          throw new ApiError(
            409,
            'MAILBOX_ADDRESS_CONFLICT',
            'Could not allocate a unique mailbox batch; retry the request'
          )
        }
        if (error instanceof RangeError || error instanceof TypeError) {
          throw new ApiError(400, 'INVALID_BATCH', error.message)
        }
        throw error
      }
    }

    throw new Error('Mailbox batch retry loop exited unexpectedly')
  } catch (error) {
    return apiErrorResponse(error)
  }
}
