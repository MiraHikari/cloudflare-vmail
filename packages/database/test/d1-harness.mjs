import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'

const migrationDirectory = new URL('../drizzle/', import.meta.url)

function response(results, changes = 0, lastRowId = 0) {
  return {
    success: true,
    results,
    meta: {
      changed_db: changes > 0,
      changes,
      duration: 0,
      last_row_id: lastRowId,
      rows_read: results.length,
      rows_written: changes,
      size_after: 0,
    },
  }
}

class D1PreparedStatementMock {
  constructor(owner, query, parameters = []) {
    this.owner = owner
    this.query = query
    this.parameters = parameters
  }

  bind(...parameters) {
    return new D1PreparedStatementMock(this.owner, this.query, parameters)
  }

  async all() {
    const rows = this.owner.sqlite.prepare(this.query).all(...this.parameters)
    return response(rows)
  }

  async first(column) {
    const result = await this.all()
    const row = result.results[0] ?? null
    return column && row ? row[column] : row
  }

  async raw(options) {
    const statement = this.owner.sqlite.prepare(this.query)
    const columns = statement.columns().map((column) => column.name)
    const rows = statement
      .all(...this.parameters)
      .map((row) => columns.map((column) => row[column]))
    return options?.columnNames ? [columns, ...rows] : rows
  }

  async run() {
    const result = this.owner.sqlite.prepare(this.query).run(...this.parameters)
    return response([], Number(result.changes), Number(result.lastInsertRowid))
  }

  async executeForBatch() {
    return /^\s*(?:pragma|select|with)\b/i.test(this.query) ? this.all() : this.run()
  }
}

export class D1DatabaseMock {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:')
    this.batchCalls = 0
  }

  prepare(query) {
    return new D1PreparedStatementMock(this, query)
  }

  async batch(statements) {
    this.batchCalls += 1
    this.sqlite.exec('BEGIN IMMEDIATE')
    try {
      const results = []
      for (const statement of statements) {
        results.push(await statement.executeForBatch())
      }
      this.sqlite.exec('COMMIT')
      return results
    } catch (error) {
      this.sqlite.exec('ROLLBACK')
      throw error
    }
  }

  close() {
    this.sqlite.close()
  }
}

export async function applyMigrations(database, names) {
  for (const name of names) {
    const sql = await readFile(new URL(name, migrationDirectory), 'utf8')
    database.sqlite.exec(sql.replaceAll('--> statement-breakpoint', ''))
  }
}
