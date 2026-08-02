import { describe, expect, it, vi } from 'vitest'
import { PublicLoginGuard } from '../src/lib/login-guard'

const generousLimit = { maxAttempts: 100, windowMs: 60_000 }

function request(ip: string) {
  return new Request('https://example.com', { headers: { 'CF-Connecting-IP': ip } })
}

function guard(overrides: ConstructorParameters<typeof PublicLoginGuard>[0] = {}) {
  return new PublicLoginGuard({
    accountLimit: generousLimit,
    clientLimit: generousLimit,
    globalLimit: generousLimit,
    ...overrides,
  })
}

describe('public password login guard', () => {
  it('limits client attempts before running more password checks and resets after the window', async () => {
    let now = 1_000
    const loginGuard = guard({
      clientLimit: { maxAttempts: 2, windowMs: 10_000 },
      now: () => now,
    })
    const operation = vi.fn(async () => true)

    await loginGuard.run(request('203.0.113.1'), 'owner@example.com', operation)
    await loginGuard.run(request('203.0.113.1'), 'owner@example.com', operation)
    await expect(
      loginGuard.run(request('203.0.113.1'), 'owner@example.com', operation)
    ).rejects.toMatchObject({ status: 429, code: 'LOGIN_RATE_LIMITED' })
    expect(operation).toHaveBeenCalledTimes(2)

    now += 10_000
    await expect(
      loginGuard.run(request('203.0.113.1'), 'owner@example.com', operation)
    ).resolves.toBe(true)
  })

  it('limits distributed attempts against the same account', async () => {
    const loginGuard = guard({ accountLimit: { maxAttempts: 2, windowMs: 60_000 } })
    const operation = vi.fn(async () => true)

    await loginGuard.run(request('203.0.113.1'), 'OWNER@example.com', operation)
    await loginGuard.run(request('203.0.113.2'), 'owner@example.com', operation)
    await expect(
      loginGuard.run(request('203.0.113.3'), 'owner@example.com', operation)
    ).rejects.toMatchObject({ status: 429, code: 'LOGIN_RATE_LIMITED' })
  })

  it('caps concurrent checks, uses a bounded queue, and rejects excess work', async () => {
    const loginGuard = guard({ maxConcurrent: 2, maxQueued: 1 })
    let active = 0
    let peakActive = 0
    const releases: Array<() => void> = []
    const operation = () =>
      new Promise<number>((resolve) => {
        active += 1
        peakActive = Math.max(peakActive, active)
        releases.push(() => {
          active -= 1
          resolve(active)
        })
      })

    const first = loginGuard.run(request('203.0.113.1'), 'one@example.com', operation)
    const second = loginGuard.run(request('203.0.113.2'), 'two@example.com', operation)
    await vi.waitFor(() => expect(active).toBe(2))
    const queued = loginGuard.run(request('203.0.113.3'), 'three@example.com', operation)

    await expect(
      loginGuard.run(request('203.0.113.4'), 'four@example.com', operation)
    ).rejects.toMatchObject({ status: 429, code: 'LOGIN_BUSY' })
    expect(peakActive).toBe(2)

    releases.shift()!()
    await first
    await vi.waitFor(() => expect(releases).toHaveLength(2))
    expect(peakActive).toBe(2)

    releases.shift()!()
    releases.shift()!()
    await Promise.all([second, queued])
  })
})
