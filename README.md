# Cloudflare VMails

Inspired by **[oiov/email](https://github.com/oiov/vmail)**. Thanks for his work.

This project uses the [shadcn/ui](https://github.com/shadcn/ui) framework, providing both light and dark modes.

This project has been fully refactored using Cloudflare stacks, replacing the original author's framework with Astro. Utilizing Astro's new actions feature (version 4.5), we've built a dual-stack interface that can be hosted entirely on Cloudflare services, operable with just a Worker Free Plan!

## Features

- 🎯 Privacy-friendly, no registration required, ready to use
- ✈️ Supports email sending and receiving
- ✨ Allows password saving and email address retrieval
- 😄 Supports multiple domain suffixes
- 🚀 100% open source, quick deployment, no server needed, fully based on Cloudflare.

### Principles

- Email Reception (Cloudflare email worker)
- Email Display (Astro)
- Email Storage (Cloudflare D1)
- [Node.js](https://nodejs.org) >= 18

> Workflow: Worker receives email -> saves to D1 -> client queries email from D1

## Deployment Instructions

To deploy this project, create a file named `wrangler.toml` in `apps/astro/`, and fill in your configuration details:

```toml
# :schema node_modules/wrangler/config-schema.json
name = "astro"
compatibility_date = "2024-09-25"
pages_build_output_dir = "./dist"

[vars]
TURNSTILE_SECRET="TURNSTILE_SECRET"
TURNSTILE_SITE_KEY="TURNSTILE_SITE_KEY"
MAIL_DOMAIN="what-the-fuck.sbs"
COOKIE_EXPIRES_IN_SECONDS=86400
SITE_NAME="MiraHikari's Vmail"
SITE_DESCRIPTION="Virtual temporary Email. Privacy friendly, Valid for 1 day, AD friendly, 100% Run on Cloudflare, Fully Open Source, Based on CLOUD."
JWT_SECRET="JWT_SECRET"
# MAILGUN_BASE_URL=""
# MAILGUN_API_KEY=""
# MAILGUN_SEND_DOMAIN=""

[[d1_databases]]
# DO NOT CHANGE BINDING VALUE
binding = "DB"
database_name = "name"
database_id = "id"
```

Enjoy using Cloudflare VMails!
