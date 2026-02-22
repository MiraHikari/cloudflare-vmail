/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

declare namespace App {
  type Locals = import('@astrojs/cloudflare').Runtime<
    Cloudflare.Env & {
      TURNSTILE_SECRET: string
      TURNSTILE_SITE_KEY: string
      MAIL_DOMAIN: string
      COOKIE_EXPIRES_IN_SECONDS: number
      SITE_NAME: string
      SITE_DESCRIPTION: string
      JWT_SECRET: string
      DB: D1Database
    }
  >
}
