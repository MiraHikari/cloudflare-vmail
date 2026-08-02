import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  ApiError,
  apiErrorResponse,
  decodePathParameter,
  getBearerToken,
  parseJsonBody,
  parseNonNegativeInteger,
} from '../src/lib/api'

describe('aPI request helpers', () => {
  it('requires JSON and validates its schema', async () => {
    const schema = z.object({ count: z.number().int().min(1).max(100) })
    const request = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ count: 10 }),
    })
    await expect(parseJsonBody(request, schema)).resolves.toEqual({ count: 10 })

    const wrongType = new Request('https://example.com', { method: 'POST', body: '{}' })
    await expect(parseJsonBody(wrongType, schema)).rejects.toMatchObject({ status: 415 })

    const emptyJson = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    await expect(parseJsonBody(emptyJson, z.object({}), { allowEmpty: true })).resolves.toEqual({})
    await expect(
      parseJsonBody(
        new Request('https://example.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
        z.object({})
      )
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_JSON' })

    const oversized = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 10, padding: 'x'.repeat(17_000) }),
    })
    await expect(parseJsonBody(oversized, schema)).rejects.toMatchObject({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
    })
  })

  it('parses only a single well-formed Bearer token', () => {
    expect(
      getBearerToken(
        new Request('https://example.com', { headers: { Authorization: 'Bearer token-value' } })
      )
    ).toBe('token-value')
    expect(
      getBearerToken(
        new Request('https://example.com', { headers: { Authorization: 'Bearer one two' } })
      )
    ).toBeNull()
  })

  it('rejects invalid pagination and returns stable error envelopes', async () => {
    expect(() => parseNonNegativeInteger('-1', 0, 100)).toThrow(ApiError)
    const response = apiErrorResponse(new ApiError(400, 'INVALID_QUERY', 'Invalid query'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'INVALID_QUERY', message: 'Invalid query' },
    })
  })

  it('decodes URL-encoded route parameters and rejects malformed escapes', () => {
    expect(decodePathParameter('mailbox%40example.com')).toBe('mailbox@example.com')
    expect(() => decodePathParameter('mailbox%ZZexample.com')).toThrow(
      expect.objectContaining({ status: 400, code: 'INVALID_PATH_PARAMETER' })
    )
  })
})
