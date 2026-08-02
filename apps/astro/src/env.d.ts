/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

declare namespace Cloudflare {
  interface Env {
    BATCH_ADMIN_TOKEN: string
    JWT_SECRET: string
    TURNSTILE_SECRET: string
  }
}
