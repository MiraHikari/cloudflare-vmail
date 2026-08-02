import type { APIRoute } from 'astro'
import { loginMailbox } from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import { z } from 'zod'
import { ApiError, apiErrorResponse, jsonResponse, parseJsonBody } from '@/lib/api'
import { createMailboxToken } from '@/lib/auth'
import { publicLoginGuard } from '@/lib/login-guard'
import { ACCESS_TOKEN_EXPIRES_IN_SECONDS } from '@/lib/mailbox-api'
import { getRuntimeBindings } from '@/lib/runtime'

const tokenRequestSchema = z.object({
  address: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(256),
})

export const POST: APIRoute = async ({ request }) => {
  try {
    const env = getRuntimeBindings()
    const input = await parseJsonBody(request, tokenRequestSchema)
    const verifyCredentials = () =>
      loginMailbox(getCloudflareD1(env.DB), input.address, input.password)
    const result = await publicLoginGuard.run(request, input.address, verifyCredentials)

    if (!result.success || !result.mailbox || result.mailbox.expiresAt !== null) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'The mailbox address or password is invalid')
    }

    return jsonResponse({
      success: true,
      mailbox: {
        address: result.mailbox.address,
        accountExpiresAt: result.mailbox.expiresAt,
      },
      accessToken: await createMailboxToken(
        result.mailbox.address,
        result.mailbox.credentialVersion,
        env.JWT_SECRET
      ),
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
