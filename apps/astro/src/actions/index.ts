import { generateNewMailAddr } from '@/lib/utils'
import { ActionError, defineAction } from 'astro:actions'
import { z } from 'astro:schema'
import * as DAO from 'database/dao'
import { getCloudflareD1 } from 'database/db'

export const server = {
  getEmailsByMessageToWho: defineAction({
    handler: async (_, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const mailbox = ctx.cookies.get('mailbox')?.value

      if (!mailbox)
        throw new ActionError({ code: 'NOT_FOUND', message: 'mailbox not found' })

      return await DAO.getEmailsByMessageTo(db, mailbox)
    },
  }),
  getEmailByIdOfAEmail: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, ctx) => {
      const db = getCloudflareD1(ctx.locals.runtime.env.DB)
      const mailbox = (await DAO.getEmailByIdOfAEmail(db, input.id))?.messageTo

      if (!mailbox)
        throw new ActionError({ code: 'NOT_FOUND', message: 'mailbox not found' })

      ctx.cookies.set('mailbox', mailbox || 'hi@what-the-fuck.sbs', {
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
      const token = input['cf-turnstile-response']
      const formData = new FormData()
      formData.append('secret', ctx.locals.runtime.env.TURNSTILE_SECRET)
      formData.append('response', token)

      const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      const result = await fetch(url, {
        body: formData,
        method: 'POST',
      })

      const outcome = z.object({ success: z.boolean() }).parse(await result.json())

      if (!outcome)
        throw new ActionError({ code: 'UNAUTHORIZED', message: 'complete the turnstile challenge' })

      const newMailbox = generateNewMailAddr(input.domain)
      ctx.cookies.set('mailbox', newMailbox, {
        httpOnly: true,
        maxAge: ctx.locals.runtime.env.COOKIE_EXPIRES_IN_SECONDS || 86400,
      })

      return newMailbox
    },
  }),
  deleteAllEmailsByMessageTo: defineAction(
    {
      handler: async (_, ctx) => {
        const db = getCloudflareD1(ctx.locals.runtime.env.DB)
        const mailbox = ctx.cookies.get('mailbox')?.value

        if (!mailbox)
          throw new ActionError({ code: 'NOT_FOUND', message: 'mailbox not found' })

        return await DAO.deleteAllEmailsByMessageTo(db, mailbox)
      },
    },
  ),
  exit: defineAction({
    handler: async (_, ctx) => {
      ctx.cookies.set('mailbox', '', { maxAge: 1, path: '/' })
    },
  },
  ),
}
