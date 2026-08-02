/* eslint-disable antfu/no-import-dist, test/no-import-node-test */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { drizzle } from 'drizzle-orm/d1'
import {
  createPermanentMailboxesBatch,
  deleteEmail,
  getEmail,
  getEmailsPageByMessageTo,
  loginMailbox,
  mapWithConcurrencyLimit,
  MailboxConflictError,
  markEmailAsRead,
} from '../dist/dao.js'
import * as schema from '../dist/schema.js'
import { D1DatabaseMock, applyMigrations } from './d1-harness.mjs'

const migrations = ['0000_absent_zarda.sql', '0001_many_hairball.sql', '0002_brainy_boomer.sql']

async function createDatabase() {
  const client = new D1DatabaseMock()
  await applyMigrations(client, migrations)
  return { client, db: drizzle(client, { schema }) }
}

function email(id, messageTo, createdAt, isRead = false) {
  return {
    id,
    messageFrom: 'sender@example.com',
    messageTo,
    headers: [],
    from: { address: 'sender@example.com', name: 'Sender' },
    messageId: `<${id}@example.com>`,
    createdAt,
    updatedAt: createdAt,
    isRead,
  }
}

test('email reads, updates, and deletes are scoped to the recipient in SQL', async () => {
  const { client, db } = await createDatabase()
  try {
    await db
      .insert(schema.emails)
      .values(email('email-1', 'owner@example.com', new Date()))
      .run()

    assert.equal(await getEmail(db, 'email-1', 'other@example.com'), null)
    assert.equal(await markEmailAsRead(db, 'email-1', 'other@example.com'), false)
    assert.equal(await deleteEmail(db, 'email-1', 'other@example.com'), false)

    const ownedEmail = await getEmail(db, 'email-1', 'owner@example.com')
    assert.equal(ownedEmail?.isRead, false)
    assert.equal(await markEmailAsRead(db, 'email-1', 'owner@example.com'), true)
    assert.equal((await getEmail(db, 'email-1', 'owner@example.com'))?.isRead, true)
    assert.equal(await deleteEmail(db, 'email-1', 'owner@example.com'), true)
    assert.equal(await getEmail(db, 'email-1', 'owner@example.com'), null)
  } finally {
    client.close()
  }
})

test('email pagination and unread filtering are performed by the database', async () => {
  const { client, db } = await createDatabase()
  try {
    const baseTime = Date.now()
    await db
      .insert(schema.emails)
      .values([
        email('old-unread', 'owner@example.com', new Date(baseTime - 2_000)),
        email('new-read', 'owner@example.com', new Date(baseTime), true),
        {
          ...email('new-unread', 'owner@example.com', new Date(baseTime - 1_000)),
          text: 'x'.repeat(600),
          html: `<p>${'y'.repeat(600)}</p>`,
        },
        email('other', 'other@example.com', new Date(baseTime + 1_000)),
      ])
      .run()

    const firstPage = await getEmailsPageByMessageTo(db, 'owner@example.com', {
      limit: 1,
      offset: 1,
    })
    assert.deepEqual(
      firstPage.emails.map(({ id }) => id),
      ['new-unread']
    )
    assert.equal(firstPage.total, 3)
    assert.equal(firstPage.emails[0].text.length, 500)
    assert.equal(firstPage.emails[0].html.length, 500)
    assert.equal('headers' in firstPage.emails[0], false)

    const unreadPage = await getEmailsPageByMessageTo(db, 'owner@example.com', {
      limit: 10,
      unreadOnly: true,
    })
    assert.deepEqual(
      unreadPage.emails.map(({ id }) => id),
      ['new-unread', 'old-unread']
    )
    assert.equal(unreadPage.total, 2)
  } finally {
    client.close()
  }
})

test('permanent mailbox batches use one atomic D1 batch and expose retryable conflicts', async () => {
  const { client, db } = await createDatabase()
  try {
    const created = await createPermanentMailboxesBatch(
      db,
      [
        { address: 'one@example.com', password: 'password-one' },
        { address: 'two@example.com', password: 'password-two' },
      ],
      'batch-1'
    )
    assert.equal(client.batchCalls, 1)
    assert.equal(created.batchId, 'batch-1')
    assert.deepEqual(
      created.mailboxes.map(({ address, expiresAt }) => ({ address, expiresAt })),
      [
        { address: 'one@example.com', expiresAt: null },
        { address: 'two@example.com', expiresAt: null },
      ]
    )

    const storedCredentials = client.sqlite
      .prepare('SELECT password_hash, salt FROM mailboxes ORDER BY address')
      .all()
    assert.notEqual(storedCredentials[0].salt, storedCredentials[1].salt)
    assert.notEqual(storedCredentials[0].password_hash, storedCredentials[1].password_hash)

    await assert.rejects(
      createPermanentMailboxesBatch(
        db,
        [
          { address: 'new@example.com', password: 'new-password' },
          { address: 'one@example.com', password: 'conflicting-password' },
        ],
        'batch-2'
      ),
      MailboxConflictError
    )
    assert.equal(
      client.sqlite
        .prepare('SELECT count(*) AS count FROM mailboxes WHERE batch_id = ?')
        .get('batch-2').count,
      0
    )
  } finally {
    client.close()
  }
})

test('batch work preserves order while respecting its concurrency limit', async () => {
  let active = 0
  let peakActive = 0
  const result = await mapWithConcurrencyLimit([1, 2, 3, 4, 5, 6], 2, async (value) => {
    active += 1
    peakActive = Math.max(peakActive, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active -= 1
    return value * 2
  })

  assert.equal(peakActive, 2)
  assert.deepEqual(result, [2, 4, 6, 8, 10, 12])
})

test('login upgrades a legacy hash without exposing credential material', async () => {
  const { client, db } = await createDatabase()
  try {
    const password = 'legacy-password'
    const salt = '00112233445566778899aabbccddeeff'
    const passwordHash = createHash('sha256')
      .update(password + salt)
      .digest('hex')
    client.sqlite
      .prepare(
        `INSERT INTO mailboxes
          (address, password_hash, salt, credential_version, created_at, expires_at)
         VALUES (?, ?, ?, 1, ?, NULL)`
      )
      .run('legacy@example.com', passwordHash, salt, 1_800_000_000)

    const result = await loginMailbox(db, 'legacy@example.com', password)
    assert.equal(result.success, true)
    assert.equal(result.mailbox?.expiresAt, null)
    assert.equal('passwordHash' in result.mailbox, false)
    assert.equal('salt' in result.mailbox, false)

    const upgraded = client.sqlite
      .prepare('SELECT password_hash, salt FROM mailboxes WHERE address = ?')
      .get('legacy@example.com')
    assert.match(upgraded.password_hash, /^pbkdf2-sha256\$600000\$/)
    assert.notEqual(upgraded.salt, salt)
  } finally {
    client.close()
  }
})

test('unexpected database failures are propagated', async () => {
  const { client, db } = await createDatabase()
  client.close()
  await assert.rejects(getEmailsPageByMessageTo(db, 'owner@example.com'), /not open/)
})
