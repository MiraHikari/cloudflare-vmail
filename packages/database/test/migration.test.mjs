/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'

const migrationDirectory = new URL('../drizzle/', import.meta.url)

async function readMigration(name) {
  const sql = await readFile(new URL(name, migrationDirectory), 'utf8')
  return sql.replaceAll('--> statement-breakpoint', '')
}

test('mailbox migration preserves legacy rows and permits permanent mailboxes', async () => {
  const database = new DatabaseSync(':memory:')
  try {
    database.exec(await readMigration('0000_absent_zarda.sql'))
    database.exec(await readMigration('0001_many_hairball.sql'))

    const legacyExpiry = 1_900_000_000
    database
      .prepare(
        `INSERT INTO mailboxes
          (address, password_hash, salt, created_at, expires_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run('legacy@example.com', 'legacy-hash', 'legacy-salt', 1_800_000_000, legacyExpiry, null)

    database.exec(await readMigration('0002_brainy_boomer.sql'))

    const legacy = database
      .prepare('SELECT * FROM mailboxes WHERE address = ?')
      .get('legacy@example.com')
    assert.equal(legacy.password_hash, 'legacy-hash')
    assert.equal(legacy.salt, 'legacy-salt')
    assert.equal(legacy.expires_at, legacyExpiry)
    assert.equal(legacy.credential_version, 1)
    assert.equal(legacy.batch_id, null)

    database
      .prepare(
        `INSERT INTO mailboxes
          (address, password_hash, salt, credential_version, batch_id, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`
      )
      .run('permanent@example.com', 'hash', 'salt', 1, 'batch-1', 1_800_000_001)
    const permanent = database
      .prepare('SELECT expires_at FROM mailboxes WHERE address = ?')
      .get('permanent@example.com')
    assert.equal(permanent.expires_at, null)

    const emailIndexes = database
      .prepare('SELECT name FROM pragma_index_list(?)')
      .all('emails')
      .map((row) => row.name)
    assert.ok(emailIndexes.includes('emails_message_to_created_at_idx'))
    assert.ok(emailIndexes.includes('emails_message_to_is_read_created_at_idx'))

    const mailboxIndexes = database
      .prepare('SELECT name FROM pragma_index_list(?)')
      .all('mailboxes')
      .map((row) => row.name)
    assert.ok(mailboxIndexes.includes('mailboxes_batch_id_idx'))
    assert.ok(mailboxIndexes.includes('mailboxes_expires_at_idx'))
  } finally {
    database.close()
  }
})
