import type {
  Config,
} from 'unique-names-generator'
import { type ClassValue, clsx } from 'clsx'
import * as jose from 'jose'
import { twMerge } from 'tailwind-merge'
import {
  languages,
  names,
  uniqueNamesGenerator,
} from 'unique-names-generator'

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
