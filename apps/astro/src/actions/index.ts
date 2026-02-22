import type { ActionAPIContext } from 'astro:actions'
import { ActionError, defineAction } from 'astro:actions'
import { z } from 'astro:schema'
import * as DAO from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import * as jose from 'jose'
import { encodeJWTSecret, generateNewMailAddr, genToken } from '@/lib/utils'

export interface MailboxSession {
  mailbox: string
  token: string
}

// Helper: Get and verify mailbox session
async function getMailboxSession(ctx: ActionAPIContext): Promise<MailboxSession> {
  const mailbox = ctx.cookies.get('mailbox')?.json() as MailboxSession
  if (!mailbox) {
    throw new ActionError({
      code: 'NOT_FOUND',
      message: 'mailbox not found',
    })
  }

  await jose.jwtVerify(mailbox.token, encodeJWTSecret(ctx.locals.runtime.env.JWT_SECRET))

  return mailbox
}

// Helper: Set mailbox session cookie
function setMailboxSession(ctx: ActionAPIContext, session: MailboxSession) {
  ctx.cookies.set('mailbox', session, {
    httpOnly: true,
    maxAge: ctx.locals.runtime.env.COOKIE_EXPIRES_IN_SECONDS || 86400,
    path: '/',
  })
}

export const server = {
  getEmailsByMessageToWho: defineAction({
    handler: async (_, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const mailbox = await getMailboxSession(ctx)
      return await DAO.getEmailsByMessageTo(db, mailbox.mailbox)
    },
  }),
  getMailboxOfEmail: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const result = await DAO.getMailboxOfEmail(db, input.id)
      const mailbox = result?.messageTo

      if (!mailbox) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'mailbox not found',
        })
      }

      const token = await genToken(mailbox, ctx.locals.runtime.env.JWT_SECRET)
      setMailboxSession(ctx, { mailbox, token })

      return mailbox
    },
  }),
  generateNewMailbox: defineAction({
    accept: 'form',
    input: z.object({
      'cf-turnstile-response': z.string(),
      domain: z.string(),
    }),
    handler: async (input, ctx) => {
      const Env = ctx.locals.runtime.env

      // Check if we're in development mode
      const isDev = Env.DEV_MODE === 'true'
      const isTurnstileDisabled = isDev && Env.TURNSTILE_SECRET === 'dev-secret'

      // Skip turnstile verification in dev mode
      if (!isTurnstileDisabled) {
        const formData = new FormData()
        formData.append('secret', Env.TURNSTILE_SECRET)
        formData.append('response', input['cf-turnstile-response'])

        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          body: formData,
          method: 'POST',
        })

        const outcome = z.object({ success: z.boolean() }).parse(await result.json())

        if (!outcome.success) {
          throw new ActionError({
            code: 'UNAUTHORIZED',
            message: 'complete the turnstile challenge',
          })
        }
      }

      const newMailbox = generateNewMailAddr(input.domain)
      const token = await genToken(newMailbox, Env.JWT_SECRET)
      setMailboxSession(ctx, { mailbox: newMailbox, token })

      return newMailbox
    },
  }),
  deleteAllEmailsByMessageTo: defineAction({
    handler: async (_, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const mailbox = await getMailboxSession(ctx)
      return await DAO.deleteAllEmailsByMessageTo(db, mailbox.mailbox)
    },
  }),
  // sendEmail: defineAction({
  //   input: z.object({
  //     to: z.string().email(),
  //     subject: z.string(),
  //     content: z.string(),
  //     bcc: z.string().optional(),
  //     cc: z.string().optional(),
  //     name: z.string(),
  //   }),
  //   async handler(input, ctx) {
  //     const Env = ctx.locals.runtime.env
  //     const { mailbox, token } = ctx.cookies
  //       .get('mailbox')
  //       ?.json() as MailboxSession
  //     if (!mailbox) {
  //       throw new ActionError({
  //         code: 'NOT_FOUND',
  //         message: 'mailbox not found',
  //       })
  //     }

  //     await jose.jwtVerify(token, encodeJWTSecret(Env.JWT_SECRET))

  //     const sender = mailbox.split('@')
  //     sender[1] = Env.MAILGUN_SEND_DOMAIN

  //     const mailgun = new Mailgun(FormData)
  //     const mailgunClient = mailgun.client({
  //       username: 'api',
  //       key: Env.MAILGUN_API_KEY,
  //     })

  //     await mailgunClient.messages.create(Env.MAILGUN_SEND_DOMAIN, {
  //       from: `${input.name} <${sender.join('@')}>`,
  //       to: input.to.split(','),
  //       subject: input.subject,
  //       html: input.content,
  //       bcc: input.bcc,
  //       cc: input.cc,
  //     })
  //   },
  // }),
  exit: defineAction({
    handler: async (_, ctx) => {
      ctx.cookies.set(
        'mailbox',
        {
          mailbox: '',
          token: '',
        },
        { maxAge: 1, path: '/' }
      )
    },
  }),

  // ============ Mailbox Claim & Auth ============

  isMailboxClaimed: defineAction({
    input: z.object({
      address: z.string().email(),
    }),
    handler: async (input, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      return await DAO.isMailboxClaimed(db, input.address)
    },
  }),

  claimMailbox: defineAction({
    input: z.object({
      address: z.string().email(),
      password: z.string().min(6),
      expiresInDays: z.number().optional().default(30),
    }),
    handler: async (input, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const result = await DAO.claimMailbox(db, input.address, input.password, input.expiresInDays)

      if (!result.success) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to claim mailbox',
        })
      }

      const token = await genToken(input.address, ctx.locals.runtime.env.JWT_SECRET)
      setMailboxSession(ctx, { mailbox: input.address, token })

      return { success: true }
    },
  }),

  loginMailbox: defineAction({
    input: z.object({
      address: z.string().email(),
      password: z.string(),
    }),
    handler: async (input, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const result = await DAO.loginMailbox(db, input.address, input.password)

      if (!result.success) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: result.error || 'Login failed',
        })
      }

      const token = await genToken(input.address, ctx.locals.runtime.env.JWT_SECRET)
      setMailboxSession(ctx, { mailbox: input.address, token })

      return { success: true, mailbox: result.mailbox }
    },
  }),

  // ============ Email Read Status ============

  markEmailAsRead: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      await getMailboxSession(ctx) // Verify session
      return await DAO.markEmailAsRead(db, input.id)
    },
  }),

  markAllAsRead: defineAction({
    handler: async (_, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const mailbox = await getMailboxSession(ctx)
      return await DAO.markAllAsRead(db, mailbox.mailbox)
    },
  }),

  getMailboxStats: defineAction({
    handler: async (_, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const mailbox = await getMailboxSession(ctx)
      return await DAO.getMailboxStats(db, mailbox.mailbox)
    },
  }),
}
