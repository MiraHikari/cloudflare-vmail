import { env } from 'cloudflare:workers'

export interface RuntimeBindings {
  AVAILABLE_DOMAINS: string
  BATCH_ADMIN_TOKEN: string
  COOKIE_EXPIRES_IN_SECONDS: string | number
  DB: D1Database
  DEV_MODE?: string
  JWT_SECRET: string
  MOCK_EMAIL_COUNT?: string
  SITE_DESCRIPTION: string
  SITE_NAME: string
  TURNSTILE_SECRET: string
  TURNSTILE_SITE_KEY: string
  USE_MOCK_DATA?: string
}

export function getRuntimeBindings(): RuntimeBindings {
  return env as RuntimeBindings
}

export function getAvailableDomains(env: Pick<RuntimeBindings, 'AVAILABLE_DOMAINS'>): string[] {
  const domains = env.AVAILABLE_DOMAINS.split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)

  if (domains.length === 0) {
    throw new Error('AVAILABLE_DOMAINS must contain at least one domain')
  }
  return [...new Set(domains)]
}
