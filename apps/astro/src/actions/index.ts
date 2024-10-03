import { encodeJWTSecret, generateNewMailAddr, genToken } from '@/lib/utils'
import { ActionError, defineAction } from 'astro:actions'
import { z } from 'astro:schema'
import * as DAO from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import * as jose from 'jose'

export interface MailboxSession {
  mailbox: string
  token: string
}

export const server = {
  getEmailsByMessageToWho: defineAction({
    handler: async (_, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const mailbox = ctx.cookies.get('mailbox')?.json() as MailboxSession

      if (!mailbox) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'mailbox not found',
        })
      }

      await jose.jwtVerify(
        mailbox.token,
        encodeJWTSecret(ctx.locals.runtime.env.JWT_SECRET),
      )

      return await DAO.getEmailsByMessageTo(db, mailbox.mailbox)
    },
  }),
  getEmailByIdOfAEmail: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const mailbox = (await DAO.getEmailByIdOfAEmail(db, input.id))?.messageTo

      if (!mailbox) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'mailbox not found',
        })
      }

      const token = await genToken(mailbox, ctx.locals.runtime.env.JWT_SECRET)
      const session: MailboxSession = {
        mailbox,
        token,
      }

      ctx.cookies.set('mailbox', session, {
        httpOnly: true,
        maxAge: ctx.locals.runtime.env.COOKIE_EXPIRES_IN_SECONDS || 86400,
        path: '/',
      })

      return mailbox
    },
  }),
  getEmail: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      return await DAO.getEmail(db, input.id)
    },
  }),
  generateNewMailbox: defineAction({
    accept: 'form',
    input: z.object({
      'cf-turnstile-response': z.string(),
      'domain': z.string(),
    }),
    handler: async (input, ctx) => {
      const cfToken = input['cf-turnstile-response']
      const formData = new FormData()
      formData.append('secret', ctx.locals.runtime.env.TURNSTILE_SECRET)
      formData.append('response', cfToken)

      const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      const result = await fetch(url, {
        body: formData,
        method: 'POST',
      })

      const outcome = z
        .object({ success: z.boolean() })
        .parse(await result.json())

      if (!outcome) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'complete the turnstile challenge',
        })
      }

      const newMailbox = generateNewMailAddr(input.domain)
      const token = await genToken(
        newMailbox,
        ctx.locals.runtime.env.JWT_SECRET,
      )
      const session: MailboxSession = { mailbox: newMailbox, token }
      ctx.cookies.set('mailbox', session, {
        httpOnly: true,
        maxAge: ctx.locals.runtime.env.COOKIE_EXPIRES_IN_SECONDS || 86400,
      })

      return newMailbox
    },
  }),
  deleteAllEmailsByMessageTo: defineAction({
    handler: async (_, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const mailbox = ctx.cookies.get('mailbox')?.json() as MailboxSession

      if (!mailbox) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'mailbox not found',
        })
      }

      await jose.jwtVerify(
        mailbox.token,
        encodeJWTSecret(ctx.locals.runtime.env.JWT_SECRET),
      )

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
        { maxAge: 1, path: '/' },
      )
    },
  }),
}
