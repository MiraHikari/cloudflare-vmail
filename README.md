# Cloudflare VMails

> A modern, privacy-focused temporary email service powered entirely by Cloudflare's edge network.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-7.1-orange.svg)](https://astro.build)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com)

Inspired by **[oiov/vmail](https://github.com/oiov/vmail)**. This project has been completely rewritten with modern technologies and enhanced features.

## ✨ Features

### Core Features

- 🔒 **Privacy First** - No registration required, anonymous by default
- 📧 **Email Management** - Receive and view emails instantly
- 🔐 **Mailbox Claiming** - Optionally claim mailboxes with password protection
- 🔍 **OTP Detection** - Automatic extraction and display of verification codes
- 🌐 **Multiple Domains** - Support for multiple email domain suffixes
- 🎨 **Modern UI** - Beautiful interface with light/dark mode support
- 📱 **Responsive Design** - Optimized for all screen sizes
- ⚡ **Edge Performance** - Lightning fast with Cloudflare's global network

### Technical Features

- 🚀 **100% Serverless** - Runs entirely on Cloudflare Workers + D1
- 📦 **Batch Provisioning** - Create up to 100 permanent mailboxes atomically
- 🛡️ **Bot Protection** - Integrated Cloudflare Turnstile
- 🎯 **Type Safety** - Full TypeScript implementation
- 🎭 **Smooth Animations** - Refined page transitions and interactions
- 📚 **Built-in Documentation** - MDX-powered docs system
- 🔧 **Easy Deployment** - One-command deployment to Cloudflare

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │ Email Worker │───▶│  Cloudflare  │◀───│ Astro Worker │ │
│  │ (Receives)   │    │     D1       │    │  (Frontend)  │ │
│  └──────────────┘    │  (Storage)   │    └──────────────┘ │
│                      └──────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Tech Stack:**

- **Frontend**: Astro 7.1 + React 19 + Tailwind CSS 4 on the Cloudflare Workers adapter
- **Email Worker**: Cloudflare Email Worker + postal-mime
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: JWT (jose)
- **UI Components**: Radix UI + shadcn/ui
- **Validation**: Zod + React Hook Form

## 📋 Prerequisites

- [Node.js](https://nodejs.org) >= 22.12
- [pnpm](https://pnpm.io) >= 10.17
- Cloudflare account with:
  - Email routing enabled
  - D1 database created
  - Turnstile site configured

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/MiraHikari/cloudflare-vmail.git
cd cloudflare-vmail
pnpm install
```

### 2. Configure Cloudflare D1

Create the database once, then replace the placeholder `database_id` in both
`apps/astro/wrangler.jsonc` and `apps/emails-worker/wrangler.jsonc` with the ID
returned by Wrangler:

```bash
pnpm --filter astro exec wrangler d1 create vmail-db
```

Apply the tracked Drizzle migrations to the local database while developing and
to the remote database before deployment:

```bash
pnpm --filter astro exec wrangler d1 migrations apply vmail-db --local --config wrangler.jsonc
pnpm --filter astro exec wrangler d1 migrations apply vmail-db --remote --config wrangler.jsonc
```

For local development, copy `apps/astro/.dev.vars.example` to
`apps/astro/.dev.vars` and set private values. Production `JWT_SECRET`,
`BATCH_ADMIN_TOKEN`, and `TURNSTILE_SECRET` must be stored with `wrangler secret put`;
do not place them in `wrangler.jsonc` or commit them.

### 4. Configure Email Routing

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain → **Email** → **Email Routing**
3. Enable Email Routing
4. Add a **Catch-all** route pointing to your email worker

### 5. Development

```bash
# Start development servers
pnpm dev

# Or start individually
pnpm --filter astro dev        # Astro Worker dev server at http://localhost:4321
pnpm --filter email-worker dev # Email Worker
```

### 6. Deploy

```bash
# Deploy the email worker first
cd apps/emails-worker
pnpm deploy

# Deploy the Astro Worker
cd ../astro
pnpm deploy
```

## 📁 Project Structure

```
cloudflare-vmail/
├── apps/
│   ├── astro/              # Frontend application
│   │   ├── src/
│   │   │   ├── actions/    # Astro server actions
│   │   │   ├── components/ # React & Astro components
│   │   │   ├── content/    # MDX documentation
│   │   │   ├── layouts/    # Page layouts
│   │   │   ├── lib/        # Utilities
│   │   │   └── pages/      # Route pages
│   │   └── wrangler.jsonc
│   └── emails-worker/      # Email receiver worker
│       ├── src/
│       │   └── index.ts
│       └── wrangler.jsonc
└── packages/
    └── database/           # Shared database package
        ├── dao.ts          # Data access layer
        ├── db.ts           # Database client
        └── drizzle/        # Drizzle SQL migrations
```

## 🔑 Key Features Explained

### Mailbox Types

**Temporary Mailbox**

- No registration required
- API access token valid for 7 days
- Email access requires the mailbox-scoped Bearer token returned at creation

**Claimed Mailbox**

- Password protected
- Valid for 30 days and protected by a password
- Claiming revokes the anonymous temporary API token
- Existing SHA-256 credentials are upgraded to PBKDF2 at login

**Permanent API Mailbox**

- Created through `POST /api/v2/mailboxes/batch` with an administrator Bearer token
- Up to 100 accounts per atomic request; `expiresAt` is always `null`
- Each response includes a unique password and a 24-hour mailbox access token

### OTP Detection

Automatically detects and extracts verification codes from emails:

- 6-digit codes (123456)
- Alphanumeric codes (A1B2C3)
- Time-sensitive OTP formats

### Security Features

- JWT-based authentication
- Cloudflare Turnstile bot protection
- Authentication and mailbox-scoped authorization on every API route
- Public password login has best-effort per-isolate throttling and bounded PBKDF2 concurrency
- Add Cloudflare WAF/Edge Rate Limiting (or a shared Durable Object) for service-wide brute-force protection
- Password hashing for claimed mailboxes
- Temporary access tokens expire after 7 days; email data cleanup is a separate retention policy

## 🎨 Customization

### Styling

The project uses Tailwind CSS 4 with CSS variables for theming. Customize colors in `apps/astro/src/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  /* ... more variables */
}
```

### Email Domains

Add multiple domains to `AVAILABLE_DOMAINS` in the Astro Worker configuration,
set up email routing for each domain, and place the preferred default first.

## 📝 Commands

```bash
# Development
pnpm dev              # Start all services
pnpm dev:apps         # Start apps only
pnpm dev:packages     # Build packages in watch mode

# Building
pnpm build            # Build all packages and apps
pnpm build:apps       # Build apps only
pnpm build:packages   # Build packages only

# Type checking
pnpm type-check       # Check types
pnpm type-check:watch # Check types in watch mode

# Linting
pnpm lint             # Lint all projects

# Deployment
pnpm deploy           # Build and deploy all

# Cleanup
pnpm clean            # Clean all build outputs
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [oiov/vmail](https://github.com/oiov/vmail)
- Built with [Astro](https://astro.build)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Powered by [Cloudflare](https://cloudflare.com)

## 📧 Support

If you have any questions or need help, please:

- Open an issue on GitHub
- Check the in-app API documentation at `/docs/api-docs` after starting the Astro Worker
- Review existing issues and discussions

---

**Made with ❤️ using Cloudflare's edge network**
