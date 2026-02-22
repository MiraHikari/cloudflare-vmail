# Cloudflare VMails

> A modern, privacy-focused temporary email service powered entirely by Cloudflare's edge network.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-5.14-orange.svg)](https://astro.build)
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

- 🚀 **100% Serverless** - Runs entirely on Cloudflare (Workers + Pages + D1)
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
│  │ Email Worker │───▶│  Cloudflare  │◀───│ Astro Pages  │ │
│  │ (Receives)   │    │     D1       │    │  (Frontend)  │ │
│  └──────────────┘    │  (Storage)   │    └──────────────┘ │
│                      └──────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Tech Stack:**

- **Frontend**: Astro 5.14 + React 19 + Tailwind CSS 4
- **Email Worker**: Cloudflare Email Worker + postal-mime
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: JWT (jose)
- **UI Components**: Radix UI + shadcn/ui
- **Validation**: Zod + React Hook Form

## 📋 Prerequisites

- [Node.js](https://nodejs.org) >= 18
- [pnpm](https://pnpm.io) >= 8
- Cloudflare account with:
  - Email routing enabled
  - D1 database created
  - Turnstile site configured

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/cloudflare-vmails.git
cd cloudflare-vmails
pnpm install
```

### 2. Configure Cloudflare D1

Create a D1 database:

```bash
cd apps/astro
wrangler d1 create vmail-db
```

Apply database schema:

```bash
cd ../emails-worker
wrangler d1 execute vmail-db --file=../../packages/database/schema.sql
```

### 3. Configure Environment

Create `apps/astro/wrangler.toml`:

```toml
# :schema node_modules/wrangler/config-schema.json
name = "vmail-app"
compatibility_date = "2024-09-25"
pages_build_output_dir = "./dist"

[vars]
# Cloudflare Turnstile (https://dash.cloudflare.com/?to=/:account/turnstile)
TURNSTILE_SECRET = "your-turnstile-secret"
TURNSTILE_SITE_KEY = "your-turnstile-site-key"

# Email configuration
MAIL_DOMAIN = "your-domain.com"

# Security
JWT_SECRET = "your-random-jwt-secret-min-32-chars"
COOKIE_EXPIRES_IN_SECONDS = 86400  # 24 hours

# Site information
SITE_NAME = "Your VMail Service"
SITE_DESCRIPTION = "Privacy-focused temporary email service"

# Optional: Email sending via Mailgun
# MAILGUN_BASE_URL = "https://api.mailgun.net"
# MAILGUN_API_KEY = "your-mailgun-api-key"
# MAILGUN_SEND_DOMAIN = "your-mailgun-domain.com"

[[d1_databases]]
binding = "DB"  # DO NOT CHANGE
database_name = "vmail-db"
database_id = "your-database-id"
```

Create `apps/emails-worker/wrangler.toml`:

```toml
name = "vmail-email-worker"
compatibility_date = "2024-09-25"
main = "src/index.ts"

[[d1_databases]]
binding = "DB"  # DO NOT CHANGE
database_name = "vmail-db"
database_id = "your-database-id"
```

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
pnpm --filter astro dev        # Frontend at http://localhost:4321
pnpm --filter email-worker dev # Email worker
```

### 6. Deploy

```bash
# Deploy email worker first
cd apps/emails-worker
pnpm deploy

# Deploy frontend
cd ../astro
pnpm deploy
```

## 📁 Project Structure

```
emails/
├── apps/
│   ├── astro/              # Frontend application
│   │   ├── src/
│   │   │   ├── actions/    # Astro server actions
│   │   │   ├── components/ # React & Astro components
│   │   │   ├── content/    # MDX documentation
│   │   │   ├── layouts/    # Page layouts
│   │   │   ├── lib/        # Utilities
│   │   │   └── pages/      # Route pages
│   │   └── wrangler.toml
│   └── emails-worker/      # Email receiver worker
│       ├── src/
│       │   └── index.ts
│       └── wrangler.toml
└── packages/
    └── database/           # Shared database package
        ├── dao.ts          # Data access layer
        ├── db.ts           # Database client
        └── schema.sql      # Database schema
```

## 🔑 Key Features Explained

### Mailbox Types

**Temporary Mailbox**

- No registration required
- Valid for 24 hours (configurable)
- Anyone with the mailbox ID can access

**Claimed Mailbox**

- Password protected
- Permanent storage
- Private and secure

### OTP Detection

Automatically detects and extracts verification codes from emails:

- 6-digit codes (123456)
- Alphanumeric codes (A1B2C3)
- Time-sensitive OTP formats

### Security Features

- JWT-based authentication
- Cloudflare Turnstile bot protection
- CORS and rate limiting ready
- Password hashing for claimed mailboxes
- Automatic email expiration

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

Add multiple domains in your `wrangler.toml` by setting up email routing for each domain and updating the `MAIL_DOMAIN` variable.

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
- Check the [documentation](docs/)
- Review existing issues and discussions

---

**Made with ❤️ using Cloudflare's edge network**
