import type { ZodType } from 'zod'
import { ZodError } from 'zod'

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

const MAX_JSON_BODY_BYTES = 16 * 1024

async function readRequestText(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return ''

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let byteLength = 0
  let text = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      byteLength += value.byteLength
      if (byteLength > maxBytes) {
        await reader.cancel()
        throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'JSON request body is too large')
      }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally {
    reader.releaseLock()
  }
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  for (const [name, value] of Object.entries(JSON_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value)
  }

  return Response.json(body, { ...init, headers })
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      } satisfies ApiErrorBody,
      { status: error.status }
    )
  }

  if (error instanceof ZodError) {
    return jsonResponse(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.issues.map(({ code, message, path }) => ({ code, message, path })),
        },
      } satisfies ApiErrorBody,
      { status: 400 }
    )
  }

  console.error('Unhandled API error', error)
  return jsonResponse(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    } satisfies ApiErrorBody,
    { status: 500 }
  )
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
  options: { allowEmpty?: boolean } = {}
): Promise<T> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json')
  }

  let body: unknown
  try {
    const rawBody = await readRequestText(request, MAX_JSON_BODY_BYTES)
    body = options.allowEmpty && rawBody.length === 0 ? {} : (JSON.parse(rawBody) as unknown)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'INVALID_JSON', 'Request body must contain valid JSON')
  }

  return schema.parse(body)
}

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization) return null

  const match = /^Bearer[ \t]+(\S+)$/i.exec(authorization.trim())
  return match?.[1] ?? null
}

export function requireBearerToken(request: Request): string {
  const token = getBearerToken(request)
  if (!token) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'A Bearer token is required')
  }
  return token
}

export function parseNonNegativeInteger(
  value: string | null,
  fallback: number,
  max: number
): number {
  if (value === null) return fallback
  if (!/^\d+$/.test(value)) {
    throw new ApiError(400, 'INVALID_QUERY', 'Pagination values must be non-negative integers')
  }

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) {
    throw new ApiError(400, 'INVALID_QUERY', 'Pagination value is too large')
  }

  return Math.min(parsed, max)
}

export function decodePathParameter(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new ApiError(400, 'INVALID_PATH_PARAMETER', 'Path parameter encoding is invalid')
  }
}
