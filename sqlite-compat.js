import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const initSqlJs = require('sql.js')
const SQL = await initSqlJs()

// Wrapper that mimics better-sqlite3 Database class
export default class Database {
  constructor(dbPath) {
    this._dbPath = dbPath
    this._inTransaction = false
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      this._db = new SQL.Database(buffer)
    } else {
      this._db = new SQL.Database()
    }
  }

  _save() {
    if (!this._inTransaction) {
      const data = this._db.export()
      fs.writeFileSync(this._dbPath, Buffer.from(data))
    }
  }

  prepare(sql) {
    const db = this._db
    const self = this

    // Check if SQL uses named parameters (@name) and convert to positional (?)
    const namedParams = [...sql.matchAll(/@([a-zA-Z_][a-zA-Z0-9_]*)/g)].map(m => m[1])
    const useNamed = namedParams.length > 0
    const convertedSql = useNamed ? sql.replace(/@[a-zA-Z_][a-zA-Z0-9_]*/g, '?') : sql

    function bindParams(params) {
      // If first param is an object with named keys, convert to array
      if (useNamed && params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0])) {
        const obj = params[0]
        return namedParams.map(name => obj[name])
      }
      return params
    }

    return {
      run(...params) {
        try {
          const stmt = db.prepare(convertedSql)
          const bound = bindParams(params)
          if (bound.length > 0) stmt.bind(bound)
          stmt.step()
          stmt.free()
          // IMPORTANT: Get these BEFORE _save() because export() resets them
          const changes = db.getRowsModified()
          const id = self._getLastId()
          self._save()
          return { changes, lastInsertRowid: id }
        } catch (e) {
          console.error('[DB] run error:', String(e))
          return { changes: 0, lastInsertRowid: 0 }
        }
      },
      get(...params) {
        try {
          const stmt = db.prepare(convertedSql)
          const bound = bindParams(params)
          if (bound.length > 0) stmt.bind(bound)
          if (stmt.step()) {
            const row = stmt.getAsObject()
            stmt.free()
            return row
          }
          stmt.free()
          return null
        } catch (e) {
          console.error('[DB] get error:', String(e))
          return null
        }
      },
      all(...params) {
        try {
          const results = []
          const stmt = db.prepare(convertedSql)
          const bound = bindParams(params)
          if (bound.length > 0) stmt.bind(bound)
          while (stmt.step()) {
            results.push(stmt.getAsObject())
          }
          stmt.free()
          return results
        } catch (e) {
          console.error('[DB] all error:', String(e))
          return []
        }
      }
    }
  }

  _getLastId() {
    try {
      const result = this._db.exec('SELECT last_insert_rowid() as id')
      if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0]
      }
      return 0
    } catch { return 0 }
  }

  exec(sql) {
    try {
      this._db.exec(sql)
      this._save()
    } catch (e) {
      console.error('[DB] exec error:', String(e))
    }
  }

  pragma(str) {
    // sql.js doesn't support pragmas, ignore
  }

  transaction(fn) {
    const self = this
    return function(...args) {
      self._inTransaction = true
      self._db.exec('BEGIN TRANSACTION')
      try {
        const result = fn.call(self, ...args)
        self._db.exec('COMMIT')
        self._inTransaction = false
        self._save()
        return result
      } catch (e) {
        self._db.exec('ROLLBACK')
        self._inTransaction = false
        throw e
      }
    }
  }

  close() {
    // No-op for compatibility
  }
}
