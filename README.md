# Cloudflare VMails

Inspired by **[oiov/email](https://github.com/oiov/vmail)**. Thanks to his work.

[shadcn/ui](https://github.com/shadcn/ui) is the UI framework used by this project. So we have light mode and dark mode now.

This project is fully use cloudflare stacks to refactor original author's project. And I used Astro instead of the Remix framework used by the original author and used actions, a new feature of Astro 4.5, to build a dual-stack interface. Now it can be fully hosted on top of the Cloudflare family of services and can be used with just a Worker Free Plan!

## Features

- 🎯 Privacy-friendly, no registration required, out-of-the-box
- ✈️ Support email sending and receiving
- ✨ Support saving passwords and retrieving email addresses
- 😄 Support multiple domain name suffixes
- 🚀 100% open source, quick deployment, no server required, fully based on Cloudflare.

Principles：

- Receiving emails (cloudflare email worker)
- Display email (astro)
- Mail Storage (cloudflare d1)
- [Nodejs](https://nodejs.org) >= 18

> Worker receives email -> saves to d1 -> client queries email by d1

## Notices

If you want to deploy this project, you need to create a file named `wrangler.toml` in `apps/astro/`, and fill your config information in it:

```t
# :schema node_modules/wrangler/config-schema.json
name = "astro"
compatibility_date = "2024-09-25"
pages_build_output_dir = "./dist"

[vars]
TURNSTILE_SECRET="secret"
TURNSTILE_SITE_KEY="key"
MAIL_DOMAIN="domain1,domain2"
COOKIE_EXPIRES_IN_SECONDS=86400
SITE_DESCRIPTION="Virtual temporary Email. Privacy friendly, Valid for 1 day, AD friendly, 100% Run on Cloudflare, Fully Open Source, Based on CLOUD."
JWT_SECRET="what-the-fuck.sbs_hhhhhhhhhhhhhhhhh"

[[d1_databases]]
# DO NOT CHANGE BINDING VALUE
binding = "DB"
database_name = "name"
database_id = "id"
```

Have fun!
