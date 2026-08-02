import type { APIRoute } from 'astro'
import { deleteEmail, getEmail } from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import { z } from 'zod'
import { ApiError, apiErrorResponse, decodePathParameter, jsonResponse } from '@/lib/api'
import { authorizePermanentMailbox, serializeEmail } from '@/lib/mailbox-api'
import { getRuntimeBindings } from '@/lib/runtime'

const addressSchema = z.string().trim().toLowerCase().pipe(z.email())
const idSchema = z.string().trim().min(1).max(128)

function parseParams(params: Record<string, string | undefined>) {
  if (!params.address || !params.id) {
    throw new ApiError(400, 'RESOURCE_REQUIRED', 'Mailbox address and email ID are required')
  }
  return {
    address: addressSchema.parse(decodePathParameter(params.address)),
    id: idSchema.parse(decodePathParameter(params.id)),
  }
}

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const { address, id } = parseParams(params)
    const env = getRuntimeBindings()
    const db = getCloudflareD1(env.DB)
    await authorizePermanentMailbox(db, request, address, env.JWT_SECRET)

    const email = await getEmail(db, id, address)
    if (!email) throw new ApiError(404, 'EMAIL_NOT_FOUND', 'Email not found')

    return jsonResponse({ success: true, email: serializeEmail(email) })
  } catch (error) {
    return apiErrorResponse(error)
  }
}

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const { address, id } = parseParams(params)
    const env = getRuntimeBindings()
    const db = getCloudflareD1(env.DB)
    await authorizePermanentMailbox(db, request, address, env.JWT_SECRET)

    const deleted = await deleteEmail(db, id, address)
    if (!deleted) throw new ApiError(404, 'EMAIL_NOT_FOUND', 'Email not found')

    return jsonResponse({ success: true })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
