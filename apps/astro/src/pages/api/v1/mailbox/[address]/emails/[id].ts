import type { APIRoute } from 'astro'
import { deleteEmail, getEmail } from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import { z, ZodError } from 'zod'
import { ApiError, decodePathParameter, jsonResponse } from '@/lib/api'
import { authorizeTemporaryMailbox, serializeEmail } from '@/lib/mailbox-api'
import { getRuntimeBindings } from '@/lib/runtime'

const addressSchema = z.email()
const idSchema = z.string().trim().min(1).max(128)

function parseParams(params: Record<string, string | undefined>) {
  if (!params.address || !params.id) {
    throw new ApiError(400, 'RESOURCE_REQUIRED', 'Mailbox address and email ID required')
  }
  return {
    address: addressSchema.parse(decodePathParameter(params.address)),
    id: idSchema.parse(decodePathParameter(params.id)),
  }
}

async function authorize(request: Request, address: string) {
  const env = getRuntimeBindings()
  const db = getCloudflareD1(env.DB)
  await authorizeTemporaryMailbox(db, request, address, env.JWT_SECRET)
  return db
}

function handleError(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonResponse({ error: error.message }, { status: error.status })
  }
  if (error instanceof ZodError) {
    return jsonResponse({ error: 'Invalid mailbox address or email ID' }, { status: 400 })
  }
  console.error('v1 email operation failed', error)
  return jsonResponse({ error: 'Internal server error' }, { status: 500 })
}

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const { address, id } = parseParams(params)
    const email = await getEmail(await authorize(request, address), id, address)
    if (!email) throw new ApiError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    return jsonResponse({ success: true, email: serializeEmail(email) })
  } catch (error) {
    return handleError(error)
  }
}

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const { address, id } = parseParams(params)
    const deleted = await deleteEmail(await authorize(request, address), id, address)
    if (!deleted) throw new ApiError(404, 'EMAIL_NOT_FOUND', 'Email not found')
    return jsonResponse({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
