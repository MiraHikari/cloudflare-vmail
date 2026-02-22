/**
 * Environment Configuration Utilities
 * Centralized environment variable access with type safety
 */

// Site configuration
export const SITE_NAME = import.meta.env.SITE_NAME || 'Vmail'
export const SITE_DESCRIPTION =
  import.meta.env.SITE_DESCRIPTION || 'A privacy-focused virtual temporary email service'

// Feature flags
export const IS_DEV = import.meta.env.DEV
export const IS_PROD = import.meta.env.PROD

// Development-specific flags
export const DEV_MODE = import.meta.env.PUBLIC_DEV_MODE === 'true' || IS_DEV
export const USE_MOCK_DATA = DEV_MODE && import.meta.env.PUBLIC_USE_MOCK_DATA !== 'false'

// Turnstile configuration
export const TURNSTILE_SITE_KEY = import.meta.env.TURNSTILE_SITE_KEY || ''
export const TURNSTILE_SECRET = import.meta.env.TURNSTILE_SECRET || ''

// Check if Turnstile is enabled (disabled in dev mode if secret is 'dev-secret')
export const IS_TURNSTILE_ENABLED =
  !DEV_MODE ||
  (TURNSTILE_SECRET !== 'dev-secret' && TURNSTILE_SITE_KEY !== '1x00000000000000000000AA')

// Mail configuration
export const MAIL_DOMAIN = import.meta.env.MAIL_DOMAIN || 'example.com'
export const MAIL_DOMAINS = MAIL_DOMAIN.split(',')
  .map((d: string) => d.trim())
  .filter(Boolean)

// JWT configuration
export const JWT_SECRET = import.meta.env.JWT_SECRET || 'default-secret-change-in-production'
export const COOKIE_EXPIRES_IN_SECONDS = parseInt(
  import.meta.env.COOKIE_EXPIRES_IN_SECONDS || '86400',
  10
)

// Helper functions
/**
 * Get runtime environment (works in both server and client)
 */
export function getRuntimeEnv() {
  // eslint-disable-next-line node/prefer-global/process
  if (typeof process !== 'undefined' && process.env) {
    // eslint-disable-next-line node/prefer-global/process
    return process.env
  }
  return import.meta.env
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const envVar = `PUBLIC_ENABLE_${feature.toUpperCase()}`
  return import.meta.env[envVar] === 'true'
}

/**
 * Log environment info in development
 */
export function logEnvInfo() {
  if (DEV_MODE) {
    // eslint-disable-next-line no-console
    console.log('🔧 Development Mode Active')
    // eslint-disable-next-line no-console
    console.log('  - Mock Data:', USE_MOCK_DATA ? 'Enabled' : 'Disabled')
    // eslint-disable-next-line no-console
    console.log('  - Turnstile:', IS_TURNSTILE_ENABLED ? 'Enabled' : 'Disabled (Dev Mode)')
    // eslint-disable-next-line no-console
    console.log('  - Domains:', MAIL_DOMAINS.join(', '))
  }
}
