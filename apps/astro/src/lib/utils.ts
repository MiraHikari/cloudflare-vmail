import type { ClassValue } from 'clsx'
import type { Config } from 'unique-names-generator'
import { clsx } from 'clsx'
import * as jose from 'jose'
import { twMerge } from 'tailwind-merge'
import { languages, names, uniqueNamesGenerator } from 'unique-names-generator'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateNewMailAddr(domain: string) {
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  const config: Config = {
    dictionaries: [names, languages, numbers],
    length: 3,
    separator: '',
    style: 'capital',
  }

  return `${uniqueNamesGenerator(config)}@${domain}`.toLowerCase()
}

export const encodeJWTSecret = (str: string) => new TextEncoder().encode(str)

export async function genToken(str: string, secret: string) {
  return await new jose.SignJWT({ str })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(encodeJWTSecret(secret))
}

// Generate API access token for a mailbox
export async function genMailboxAccessToken(mailboxAddress: string, secret: string) {
  return await new jose.SignJWT({ mailbox: mailboxAddress })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Token valid for 7 days
    .sign(encodeJWTSecret(secret))
}

// Verify API access token
export async function verifyMailboxAccessToken(
  token: string,
  secret: string
): Promise<{ valid: boolean; mailbox?: string; error?: string }> {
  try {
    const { payload } = await jose.jwtVerify(token, encodeJWTSecret(secret))
    if (typeof payload.mailbox === 'string') {
      return { valid: true, mailbox: payload.mailbox }
    }
    return { valid: false, error: 'Invalid token payload' }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    }
  }
}
