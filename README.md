# Cloudflare VMails

Inspired by **[oiov/email](https://github.com/oiov/vmail)**. Thanks to his work.

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
