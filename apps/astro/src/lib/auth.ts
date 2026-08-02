import * as jose from 'jose'
import { ApiError, requireBearerToken } from './api'

const JWT_ISSUER = 'cloudflare-vmail'
const ACCESS_AUDIENCE = 'mailbox-api-v2'
const TEMPORARY_AUDIENCE = 'mailbox-api-v1'
const SESSION_AUDIENCE = 'mailbox-web'
const JWT_ALGORITHM = 'HS256'
const ACCESS_TOKEN_TTL = '24h'
const REQUIRED_JWT_CLAIMS = ['aud', 'exp', 'iat', 'iss', 'jti', 'sub']

export interface MailboxTokenClaims {
  mailbox: string
  credentialVersion: number
}

export interface MailboxSessionTokenClaims {
  mailbox: string
  credentialVersion: number | null
}

export function encodeJWTSecret(secret: string): Uint8Array {
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes')
  }
  return new TextEncoder().encode(secret)
}

export async function createMailboxToken(
  mailbox: string,
  credentialVersion: number,
  secret: string
): Promise<string> {
  return new jose.SignJWT({
    mailbox,
    token_use: 'mailbox_access',
    credential_version: credentialVersion,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(ACCESS_AUDIENCE)
    .setSubject(mailbox)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(encodeJWTSecret(secret))
}

async function createScopedMailboxToken(
  mailbox: string,
  tokenUse: 'mailbox_session' | 'temporary_mailbox',
  audience: string,
  expiresIn: string,
  secret: string,
  additionalClaims: Record<string, unknown> = {}
): Promise<string> {
  return new jose.SignJWT({ mailbox, token_use: tokenUse, ...additionalClaims })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(audience)
    .setSubject(mailbox)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(expiresIn)
    .sign(encodeJWTSecret(secret))
}

export function createMailboxSessionToken(
  mailbox: string,
  secret: string,
  credentialVersion: number | null = null
): Promise<string> {
  if (
    credentialVersion !== null &&
    (!Number.isSafeInteger(credentialVersion) || credentialVersion < 1)
  ) {
    throw new TypeError('Credential version must be a positive integer')
  }

  return createScopedMailboxToken(mailbox, 'mailbox_session', SESSION_AUDIENCE, '24h', secret, {
    session_kind: credentialVersion === null ? 'temporary' : 'claimed',
    ...(credentialVersion === null ? {} : { credential_version: credentialVersion }),
  })
}

export function createTemporaryMailboxToken(mailbox: string, secret: string): Promise<string> {
  return createScopedMailboxToken(mailbox, 'temporary_mailbox', TEMPORARY_AUDIENCE, '7d', secret)
}

async function verifyScopedMailboxToken(
  token: string,
  secret: string,
  tokenUse: 'mailbox_session' | 'temporary_mailbox',
  audience: string
): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(token, encodeJWTSecret(secret), {
    algorithms: [JWT_ALGORITHM],
    audience,
    issuer: JWT_ISSUER,
    requiredClaims: REQUIRED_JWT_CLAIMS,
    typ: 'JWT',
  })
  if (
    payload.token_use !== tokenUse ||
    typeof payload.sub !== 'string' ||
    payload.sub !== payload.mailbox ||
    typeof payload.jti !== 'string' ||
    payload.jti.length === 0 ||
    typeof payload.iat !== 'number' ||
    !Number.isSafeInteger(payload.iat) ||
    typeof payload.exp !== 'number' ||
    !Number.isSafeInteger(payload.exp) ||
    payload.exp <= payload.iat
  ) {
    throw new Error('Invalid mailbox token claims')
  }
  return payload
}

export async function verifyMailboxSessionToken(
  token: string,
  secret: string
): Promise<MailboxSessionTokenClaims> {
  try {
    const payload = await verifyScopedMailboxToken(
      token,
      secret,
      'mailbox_session',
      SESSION_AUDIENCE
    )
    if (payload.session_kind === 'temporary' && payload.credential_version === undefined) {
      return { mailbox: payload.sub!, credentialVersion: null }
    }
    if (
      payload.session_kind === 'claimed' &&
      typeof payload.credential_version === 'number' &&
      Number.isSafeInteger(payload.credential_version) &&
      payload.credential_version >= 1
    ) {
      return { mailbox: payload.sub!, credentialVersion: payload.credential_version }
    }
    throw new Error('Invalid mailbox session claims')
  } catch {
    throw new ApiError(401, 'INVALID_SESSION', 'The mailbox session is invalid or expired')
  }
}

export async function verifyTemporaryMailboxToken(token: string, secret: string): Promise<string> {
  try {
    const payload = await verifyScopedMailboxToken(
      token,
      secret,
      'temporary_mailbox',
      TEMPORARY_AUDIENCE
    )
    return payload.sub!
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'The mailbox access token is invalid or expired')
  }
}

export async function verifyMailboxToken(
  token: string,
  secret: string
): Promise<MailboxTokenClaims> {
  try {
    const { payload } = await jose.jwtVerify(token, encodeJWTSecret(secret), {
      algorithms: [JWT_ALGORITHM],
      audience: ACCESS_AUDIENCE,
      issuer: JWT_ISSUER,
      requiredClaims: REQUIRED_JWT_CLAIMS,
      typ: 'JWT',
    })

    if (
      payload.token_use !== 'mailbox_access' ||
      typeof payload.sub !== 'string' ||
      payload.sub !== payload.mailbox ||
      typeof payload.jti !== 'string' ||
      payload.jti.length === 0 ||
      typeof payload.iat !== 'number' ||
      !Number.isSafeInteger(payload.iat) ||
      typeof payload.exp !== 'number' ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= payload.iat ||
      typeof payload.credential_version !== 'number' ||
      !Number.isSafeInteger(payload.credential_version) ||
      payload.credential_version < 1
    ) {
      throw new Error('Invalid mailbox token claims')
    }

    return {
      mailbox: payload.sub,
      credentialVersion: payload.credential_version,
    }
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'The mailbox access token is invalid or expired')
  }
}

export async function authenticateMailboxRequest(
  request: Request,
  expectedMailbox: string,
  secret: string
): Promise<MailboxTokenClaims> {
  const claims = await verifyMailboxToken(requireBearerToken(request), secret)
  if (claims.mailbox !== expectedMailbox) {
    throw new ApiError(403, 'MAILBOX_FORBIDDEN', 'The token does not grant access to this mailbox')
  }
  return claims
}

export async function authenticateTemporaryMailboxRequest(
  request: Request,
  expectedMailbox: string,
  secret: string
): Promise<string> {
  const mailbox = await verifyTemporaryMailboxToken(requireBearerToken(request), secret)
  if (mailbox !== expectedMailbox) {
    throw new ApiError(403, 'MAILBOX_FORBIDDEN', 'The token does not grant access to this mailbox')
  }
  return mailbox
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

export async function secretsEqual(provided: string, expected: string): Promise<boolean> {
  const [providedHash, expectedHash] = await Promise.all([sha256(provided), sha256(expected)])
  let difference = 0
  for (let index = 0; index < providedHash.length; index += 1) {
    difference |= providedHash[index]! ^ expectedHash[index]!
  }
  return difference === 0
}

export async function requireAdminToken(request: Request, expectedToken: string): Promise<void> {
  if (new TextEncoder().encode(expectedToken).byteLength < 32) {
    throw new Error('BATCH_ADMIN_TOKEN must contain at least 32 bytes')
  }

  const providedToken = requireBearerToken(request)
  if (!(await secretsEqual(providedToken, expectedToken))) {
    throw new ApiError(401, 'INVALID_ADMIN_TOKEN', 'The administrator token is invalid')
  }
}
