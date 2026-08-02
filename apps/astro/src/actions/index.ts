import type { ActionAPIContext } from 'astro:actions'
import type { MailboxSession } from '@/lib/session'
import { z } from 'astro/zod'
import { ActionError, defineAction } from 'astro:actions'
import * as DAO from 'database/dao'
import { getCloudflareD1 } from 'database/db'
import { ApiError } from '@/lib/api'
import { createMailboxSessionToken } from '@/lib/auth'
import { publicLoginGuard } from '@/lib/login-guard'
import { authorizeMailboxSession, generateMailboxAddress } from '@/lib/mailbox-api'
import { getAvailableDomains, getRuntimeBindings } from '@/lib/runtime'
import { readMailboxSession } from '@/lib/session'

export type { MailboxSession } from '@/lib/session'

function actionError(
  code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'TOO_MANY_REQUESTS',
  message: string
): never {
  throw new ActionError({ code, message })
}

async function getMailboxSession(ctx: ActionAPIContext): Promise<MailboxSession> {
  const session = readMailboxSession(() => ctx.cookies.get('mailbox')?.json())

  if (!session?.mailbox || !session.token) {
    actionError('UNAUTHORIZED', 'Mailbox session required')
  }

  const env = getRuntimeBindings()
  await authorizeMailboxSession(
    getCloudflareD1(env.DB),
    session.token,
    session.mailbox,
    env.JWT_SECRET
  ).catch(() => actionError('UNAUTHORIZED', 'Invalid or expired mailbox session'))

  return session
}

function setMailboxSession(ctx: ActionAPIContext, session: MailboxSession) {
  const env = getRuntimeBindings()
  const configuredMaxAge = Number(env.COOKIE_EXPIRES_IN_SECONDS)
  const maxAge =
    Number.isSafeInteger(configuredMaxAge) && configuredMaxAge > 0 ? configuredMaxAge : 86400

  ctx.cookies.set('mailbox', session, {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: 'lax',
    secure: new URL(ctx.request.url).protocol === 'https:',
  })
}

async function createSession(
  ctx: ActionAPIContext,
  mailbox: string,
  credentialVersion: number | null = null
) {
  const token = await createMailboxSessionToken(
    mailbox,
    getRuntimeBindings().JWT_SECRET,
    credentialVersion
  )
  setMailboxSession(ctx, { mailbox, token })
}

export const server = {
  getEmailsByMessageToWho: defineAction({
    handler: async (_, ctx) => {
      const mailbox = await getMailboxSession(ctx)
      const { emails } = await DAO.getEmailsPageByMessageTo(
        getCloudflareD1(getRuntimeBindings().DB),
        mailbox.mailbox,
        { limit: 100, offset: 0, unreadOnly: false }
      )
      return emails
    },
  }),

  generateNewMailbox: defineAction({
    accept: 'form',
    input: z.object({
      'cf-turnstile-response': z.string(),
      domain: z.string().trim().toLowerCase(),
    }),
    handler: async (input, ctx) => {
      const env = getRuntimeBindings()
      const domains = getAvailableDomains(env)
      if (!domains.includes(input.domain)) {
        actionError('BAD_REQUEST', 'Mailbox domain is not allowed')
      }

      const isDev = env.DEV_MODE === 'true'
      const skipTurnstile = isDev && env.TURNSTILE_SECRET === 'dev-secret'
      if (!skipTurnstile) {
        const formData = new FormData()
        formData.append('secret', env.TURNSTILE_SECRET)
        formData.append('response', input['cf-turnstile-response'])

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          body: formData,
          method: 'POST',
        })
        if (!response.ok) {
          throw new Error(`Turnstile verification failed with status ${response.status}`)
        }

        const outcome = z.object({ success: z.boolean() }).parse(await response.json())
        if (!outcome.success) actionError('UNAUTHORIZED', 'Complete the Turnstile challenge')
      }

      const mailbox = generateMailboxAddress(input.domain)
      await createSession(ctx, mailbox)
      return mailbox
    },
  }),

  deleteAllEmailsByMessageTo: defineAction({
    handler: async (_, ctx) => {
      const mailbox = await getMailboxSession(ctx)
      return DAO.deleteAllEmailsByMessageTo(
        getCloudflareD1(getRuntimeBindings().DB),
        mailbox.mailbox
      )
    },
  }),

  exit: defineAction({
    handler: async (_, ctx) => {
      ctx.cookies.delete('mailbox', { path: '/' })
    },
  }),

  isMailboxClaimed: defineAction({
    input: z.object({ address: z.string().trim().toLowerCase().pipe(z.email()) }),
    handler: async (input, ctx) => {
      const session = await getMailboxSession(ctx)
      if (session.mailbox !== input.address) {
        actionError('UNAUTHORIZED', 'Cannot inspect another mailbox')
      }
      return DAO.isMailboxClaimed(getCloudflareD1(getRuntimeBindings().DB), input.address)
    },
  }),

  claimMailbox: defineAction({
    input: z.object({
      address: z.string().trim().toLowerCase().pipe(z.email()),
      password: z.string().min(8).max(256),
    }),
    handler: async (input, ctx) => {
      const session = await getMailboxSession(ctx)
      if (session.mailbox !== input.address) {
        actionError('UNAUTHORIZED', 'Cannot claim another mailbox')
      }

      const db = getCloudflareD1(getRuntimeBindings().DB)
      const result = await DAO.claimMailbox(db, input.address, input.password, 30)
      if (!result.success) actionError('BAD_REQUEST', result.error || 'Failed to claim mailbox')

      const mailbox = await DAO.getMailbox(db, input.address)
      if (!mailbox) throw new Error('Claimed mailbox was not persisted')
      await createSession(ctx, input.address, mailbox.credentialVersion)
      return { success: true }
    },
  }),

  loginMailbox: defineAction({
    input: z.object({
      address: z.string().trim().toLowerCase().pipe(z.email()),
      password: z.string().min(1).max(256),
    }),
    handler: async (input, ctx) => {
      let result
      try {
        const verifyCredentials = () =>
          DAO.loginMailbox(getCloudflareD1(getRuntimeBindings().DB), input.address, input.password)
        result = await publicLoginGuard.run(ctx.request, input.address, verifyCredentials)
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          actionError('TOO_MANY_REQUESTS', error.message)
        }
        throw error
      }
      if (!result.success || !result.mailbox) {
        actionError('UNAUTHORIZED', 'Invalid mailbox address or password')
      }

      await createSession(ctx, result.mailbox.address, result.mailbox.credentialVersion)
      return {
        success: true,
        mailbox: {
          address: result.mailbox.address,
          createdAt: result.mailbox.createdAt,
          expiresAt: result.mailbox.expiresAt,
          lastLoginAt: result.mailbox.lastLoginAt,
        },
      }
    },
  }),

  markEmailAsRead: defineAction({
    input: z.object({ id: z.string().min(1).max(128) }),
    handler: async (input, ctx) => {
      const mailbox = await getMailboxSession(ctx)
      const updated = await DAO.markEmailAsRead(
        getCloudflareD1(getRuntimeBindings().DB),
        input.id,
        mailbox.mailbox
      )
      if (!updated) actionError('NOT_FOUND', 'Email not found')
      return { success: true }
    },
  }),

  markAllAsRead: defineAction({
    handler: async (_, ctx) => {
      const mailbox = await getMailboxSession(ctx)
      return DAO.markAllAsRead(getCloudflareD1(getRuntimeBindings().DB), mailbox.mailbox)
    },
  }),

  getMailboxStats: defineAction({
    handler: async (_, ctx) => {
      const mailbox = await getMailboxSession(ctx)
      return DAO.getMailboxStats(getCloudflareD1(getRuntimeBindings().DB), mailbox.mailbox)
    },
  }),
}
