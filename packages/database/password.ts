const HASH_ALGORITHM = 'SHA-256'
const PBKDF2_PREFIX = 'pbkdf2-sha256'
const DERIVED_KEY_BYTES = 32
const SALT_BYTES = 16
const MAX_ACCEPTED_PBKDF2_ITERATIONS = 2_000_000

// OWASP's current PBKDF2-HMAC-SHA256 work factor. The iteration count is stored
// with each hash so it can be raised without invalidating existing passwords.
export const PBKDF2_ITERATIONS = 600_000

// Used for unknown or expired mailbox logins so those paths perform the same
// expensive password work as a real mailbox verification.
export const DUMMY_PASSWORD_CREDENTIAL: PasswordCredential = {
  salt: '00000000000000000000000000000000',
  passwordHash: `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${'00'.repeat(DERIVED_KEY_BYTES)}`,
}

export interface PasswordCredential {
  passwordHash: string
  salt: string
}

export interface PasswordVerification {
  valid: boolean
  needsUpgrade: boolean
}

const encoder = new TextEncoder()

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(value: string): Uint8Array | null {
  if (value.length % 2 !== 0 || !/^[\da-f]+$/i.test(value)) {
    return null
  }

  const bytes = new Uint8Array(value.length / 2)
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16)
  }
  return bytes
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length
  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index++) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }

  return difference === 0
}

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: HASH_ALGORITHM, salt: Uint8Array.from(salt).buffer, iterations },
    key,
    DERIVED_KEY_BYTES * 8
  )
  return new Uint8Array(bits)
}

async function legacySha256(password: string, salt: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(HASH_ALGORITHM, encoder.encode(password + salt))
  return new Uint8Array(digest)
}

export async function createPasswordCredential(password: string): Promise<PasswordCredential> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const derivedKey = await derivePbkdf2(password, saltBytes, PBKDF2_ITERATIONS)

  return {
    salt: toHex(saltBytes),
    passwordHash: `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toHex(derivedKey)}`,
  }
}

export async function verifyPasswordCredential(
  password: string,
  salt: string,
  passwordHash: string
): Promise<PasswordVerification> {
  const saltBytes = fromHex(salt)
  if (!saltBytes) {
    return { valid: false, needsUpgrade: false }
  }

  const [scheme, rawIterations, encodedHash, ...extraParts] = passwordHash.split('$')
  if (scheme === PBKDF2_PREFIX) {
    const iterations = Number(rawIterations)
    const expectedHash = encodedHash?.length === DERIVED_KEY_BYTES * 2 ? fromHex(encodedHash) : null
    if (
      extraParts.length > 0 ||
      !Number.isSafeInteger(iterations) ||
      iterations <= 0 ||
      iterations > MAX_ACCEPTED_PBKDF2_ITERATIONS ||
      !expectedHash ||
      expectedHash.length !== DERIVED_KEY_BYTES
    ) {
      return { valid: false, needsUpgrade: false }
    }

    const actualHash = await derivePbkdf2(password, saltBytes, iterations)
    const valid = constantTimeEqual(actualHash, expectedHash)
    return { valid, needsUpgrade: valid && iterations < PBKDF2_ITERATIONS }
  }

  const expectedLegacyHash =
    passwordHash.length === DERIVED_KEY_BYTES * 2 ? fromHex(passwordHash) : null
  if (!expectedLegacyHash || expectedLegacyHash.length !== DERIVED_KEY_BYTES) {
    return { valid: false, needsUpgrade: false }
  }

  const actualLegacyHash = await legacySha256(password, salt)
  const valid = constantTimeEqual(actualLegacyHash, expectedLegacyHash)
  return { valid, needsUpgrade: valid }
}
