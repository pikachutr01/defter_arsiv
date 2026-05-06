import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'

const schemaSql = `
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
  book_notes      TEXT,
    total_pages     INTEGER NOT NULL DEFAULT 0,
    cover_image     TEXT,
    storage_folder  TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id         INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    page_number     INTEGER NOT NULL,
    page_notes      TEXT,
    image           TEXT,
    is_uploaded     INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(book_id, page_number)
);

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
    page_notes,
    content='pages',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
  INSERT INTO pages_fts(rowid, page_notes)
  VALUES (new.id, new.page_notes);
END;

CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, page_notes)
  VALUES ('delete', old.id, old.page_notes);
  INSERT INTO pages_fts(rowid, page_notes)
  VALUES (new.id, new.page_notes);
END;

CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, page_notes)
  VALUES ('delete', old.id, old.page_notes);
END;

CREATE INDEX IF NOT EXISTS idx_pages_book_id ON pages(book_id);
CREATE INDEX IF NOT EXISTS idx_pages_book_page ON pages(book_id, page_number);
`

let dbInstance = null

export const getDefaultStoragePath = ({ userDataRoot, documentsRoot }) => {
  if (documentsRoot) {
    return path.join(documentsRoot, 'Cilt Dijital Kayit Sistemi', 'images')
  }

  return path.join(userDataRoot, 'images')
}

export const initDb = (dbPath) => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  dbInstance = new Database(dbPath)
  dbInstance.pragma('journal_mode = WAL')
  dbInstance.exec(schemaSql)
  ensureSchemaUpdates(dbInstance)
  return dbInstance
}

export const getDb = () => {
  if (!dbInstance) {
    throw new Error('Database not initialized')
  }
  return dbInstance
}

export const closeDb = () => {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
  stmtGetSetting = null
  stmtSetSetting = null
}

let stmtGetSetting = null
export const getSetting = (key) => {
  if (!stmtGetSetting) {
    stmtGetSetting = getDb().prepare('SELECT value FROM settings WHERE key = ?')
  }
  const row = stmtGetSetting.get(key)
  return row ? row.value : null
}

let stmtSetSetting = null
export const setSetting = (key, value) => {
  if (!stmtSetSetting) {
    stmtSetSetting = getDb().prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
  }
  stmtSetSetting.run(key, value)
}

export const ensureDefaults = ({ userDataRoot, documentsRoot }) => {
  const defaultStoragePath = getDefaultStoragePath({ userDataRoot, documentsRoot })
  const legacyStoragePath = path.join(userDataRoot, 'images')

  if (!getSetting('auth_username')) {
    setSetting('auth_username', 'admin')
  }
  if (!getSetting('auth_password_hash')) {
    const hash = bcrypt.hashSync('1234', 10)
    setSetting('auth_password_hash', hash)
  }
  if (!getSetting('install_id')) {
    setSetting('install_id', crypto.randomUUID())
  }

  const currentStoragePath = getSetting('storage_path')
  if (!currentStoragePath) {
    setSetting('storage_path', defaultStoragePath)
    return
  }

  if (
    currentStoragePath === legacyStoragePath &&
    defaultStoragePath !== legacyStoragePath
  ) {
    setSetting('storage_path', defaultStoragePath)
  }
}

export const ensureStorageFolders = (storagePath) => {
  fs.mkdirSync(storagePath, { recursive: true })
  fs.mkdirSync(path.join(storagePath, 'covers'), { recursive: true })
  fs.mkdirSync(path.join(storagePath, 'books'), { recursive: true })
}

const ensureColumn = (db, tableName, columnName, columnType) => {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map((column) => column.name)
  if (!columns.includes(columnName)) {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`).run()
  }
}

const rebuildFts = (db) => {
  db.exec(`
    DROP TRIGGER IF EXISTS pages_ai;
    DROP TRIGGER IF EXISTS pages_au;
    DROP TRIGGER IF EXISTS pages_ad;
    DROP TABLE IF EXISTS pages_fts;

    CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
      page_notes,
      content='pages',
      content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
        INSERT INTO pages_fts(rowid, page_notes)
        VALUES (new.id, new.page_notes);
    END;

    CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, page_notes)
        VALUES ('delete', old.id, old.page_notes);
        INSERT INTO pages_fts(rowid, page_notes)
        VALUES (new.id, new.page_notes);
    END;

    CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, page_notes)
        VALUES ('delete', old.id, old.page_notes);
    END;
  `)

  db.prepare(
    'INSERT INTO pages_fts(rowid, page_notes) SELECT id, page_notes FROM pages'
  ).run()
}

const ensureSchemaUpdates = (db) => {
  ensureColumn(db, 'books', 'book_notes', 'TEXT')

  const pagesColumns = db
    .prepare('PRAGMA table_info(pages)')
    .all()
    .map((column) => column.name)

  if (pagesColumns.includes('side_a_image')) {
    db.exec(`
      DROP TRIGGER IF EXISTS pages_ai;
      DROP TRIGGER IF EXISTS pages_au;
      DROP TRIGGER IF EXISTS pages_ad;
      DROP TABLE IF EXISTS pages_fts;
      DROP TABLE IF EXISTS pages;
    `)
    db.exec(schemaSql)
  }

  ensureColumn(db, 'pages', 'page_notes', 'TEXT')

  let ftsColumns
  try {
    ftsColumns = db
      .prepare('PRAGMA table_info(pages_fts)')
      .all()
      .map((column) => column.name)
  } catch {
    ftsColumns = []
  }

  if (ftsColumns.includes('side_a_notes')) {
    rebuildFts(db)
  }
}
