import { ApiError } from './api'

interface RateLimit {
  maxAttempts: number
  windowMs: number
}

interface RateBucket {
  attempts: number
  resetAt: number
}

export interface PublicLoginGuardOptions {
  accountLimit: RateLimit
  clientLimit: RateLimit
  globalLimit: RateLimit
  maxConcurrent: number
  maxQueued: number
  maxTrackedBuckets: number
  now: () => number
}

const DEFAULT_OPTIONS: PublicLoginGuardOptions = {
  accountLimit: { maxAttempts: 20, windowMs: 5 * 60_000 },
  clientLimit: { maxAttempts: 10, windowMs: 60_000 },
  globalLimit: { maxAttempts: 100, windowMs: 60_000 },
  maxConcurrent: 2,
  maxQueued: 8,
  maxTrackedBuckets: 4_096,
  now: Date.now,
}

interface QueueEntry {
  resolve: () => void
}

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer`)
  }
}

function validateLimit(limit: RateLimit, name: string) {
  assertPositiveInteger(limit.maxAttempts, `${name}.maxAttempts`)
  assertPositiveInteger(limit.windowMs, `${name}.windowMs`)
}

function clientIdentifier(request: Request): string {
  const value = request.headers.get('cf-connecting-ip')?.trim().toLowerCase()
  return value && value.length <= 64 ? value : 'unidentified'
}

/**
 * Best-effort per-isolate rate limiting plus a hard cap on concurrent password
 * verification. Cloudflare overwrites CF-Connecting-IP on public Worker traffic,
 * and no optional KV, Durable Object, or Rate Limiting binding is required.
 */
export class PublicLoginGuard {
  private readonly options: PublicLoginGuardOptions
  private readonly buckets = new Map<string, RateBucket>()
  private globalBucket: RateBucket
  private attemptsSincePrune = 0
  private active = 0
  private readonly queue: QueueEntry[] = []

  constructor(options: Partial<PublicLoginGuardOptions> = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      accountLimit: { ...DEFAULT_OPTIONS.accountLimit, ...options.accountLimit },
      clientLimit: { ...DEFAULT_OPTIONS.clientLimit, ...options.clientLimit },
      globalLimit: { ...DEFAULT_OPTIONS.globalLimit, ...options.globalLimit },
    }

    validateLimit(this.options.accountLimit, 'accountLimit')
    validateLimit(this.options.clientLimit, 'clientLimit')
    validateLimit(this.options.globalLimit, 'globalLimit')
    assertPositiveInteger(this.options.maxConcurrent, 'maxConcurrent')
    assertPositiveInteger(this.options.maxQueued, 'maxQueued')
    assertPositiveInteger(this.options.maxTrackedBuckets, 'maxTrackedBuckets')

    const now = this.options.now()
    this.globalBucket = { attempts: 0, resetAt: now + this.options.globalLimit.windowMs }
  }

  async run<T>(request: Request, address: string, operation: () => Promise<T>): Promise<T> {
    this.consumeAttempt(request, address)
    const release = await this.acquire()
    try {
      return await operation()
    } finally {
      release()
    }
  }

  private consumeAttempt(request: Request, address: string) {
    const now = this.options.now()
    this.pruneBuckets(now)

    this.globalBucket = this.currentBucket(
      this.globalBucket,
      now,
      this.options.globalLimit.windowMs
    )
    const clientKey = `client:${clientIdentifier(request)}`
    const accountKey = `account:${address.trim().toLowerCase()}`
    const clientBucket = this.getBucket(clientKey, now, this.options.clientLimit.windowMs)
    const accountBucket = this.getBucket(accountKey, now, this.options.accountLimit.windowMs)

    const checks = [
      { bucket: this.globalBucket, limit: this.options.globalLimit },
      { bucket: clientBucket, limit: this.options.clientLimit },
      { bucket: accountBucket, limit: this.options.accountLimit },
    ]
    const blocked = checks.filter(({ bucket, limit }) => bucket.attempts >= limit.maxAttempts)
    if (blocked.length > 0) {
      const retryAfterMs = Math.max(...blocked.map(({ bucket }) => bucket.resetAt - now))
      throw new ApiError(429, 'LOGIN_RATE_LIMITED', 'Too many login attempts; try again later', {
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1_000)),
      })
    }

    for (const { bucket } of checks) bucket.attempts += 1
  }

  private currentBucket(bucket: RateBucket, now: number, windowMs: number): RateBucket {
    return now >= bucket.resetAt ? { attempts: 0, resetAt: now + windowMs } : bucket
  }

  private getBucket(key: string, now: number, windowMs: number): RateBucket {
    const existing = this.buckets.get(key)
    const bucket = existing
      ? this.currentBucket(existing, now, windowMs)
      : { attempts: 0, resetAt: now + windowMs }
    if (bucket !== existing) this.buckets.set(key, bucket)
    return bucket
  }

  private pruneBuckets(now: number) {
    this.attemptsSincePrune += 1
    if (this.attemptsSincePrune < 64 && this.buckets.size + 2 <= this.options.maxTrackedBuckets) {
      return
    }

    this.attemptsSincePrune = 0
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key)
    }
    while (this.buckets.size + 2 > this.options.maxTrackedBuckets) {
      const oldestKey = this.buckets.keys().next().value as string | undefined
      if (oldestKey === undefined) break
      this.buckets.delete(oldestKey)
    }
  }

  private async acquire(): Promise<() => void> {
    if (this.active < this.options.maxConcurrent) {
      this.active += 1
      return () => this.release()
    }
    if (this.queue.length >= this.options.maxQueued) {
      throw new ApiError(429, 'LOGIN_BUSY', 'Login verification is busy; try again shortly', {
        retryAfterSeconds: 1,
      })
    }

    await new Promise<void>((resolve) => this.queue.push({ resolve }))
    return () => this.release()
  }

  private release() {
    const next = this.queue.shift()
    if (next) {
      next.resolve()
      return
    }
    this.active -= 1
  }
}

export const publicLoginGuard = new PublicLoginGuard()
