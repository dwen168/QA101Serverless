/**
 * Reports Database (SQLite via better-sqlite3)
 * =============================================
 * Persists rendered HTML analysis reports so users can save,
 * browse, and restore previous analysis sessions.
 *
 * Schema:
 *   reports(id, ticker, label, html, created_at)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'reports.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let _db = null;

function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker     TEXT    NOT NULL,
      label      TEXT    NOT NULL,
      html       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reports_ticker ON reports(ticker);
  `);
  return _db;
}

/**
 * Save a new report. Returns the new row's id.
 */
function saveReport({ ticker, label, html }) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO reports (ticker, label, html) VALUES (?, ?, ?)'
  );
  const info = stmt.run(
    String(ticker).toUpperCase(),
    String(label),
    String(html)
  );
  return { id: info.lastInsertRowid };
}

/**
 * List all reports (metadata only, no html). Newest first.
 */
function listReports() {
  const db = getDb();
  return db
    .prepare('SELECT id, ticker, label, created_at FROM reports ORDER BY id DESC')
    .all();
}

/**
 * Get a single report (including html) by id.
 */
function getReport(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM reports WHERE id = ?').get(Number(id));
}

/**
 * Delete a report by id.
 */
function deleteReport(id) {
  const db = getDb();
  const info = db.prepare('DELETE FROM reports WHERE id = ?').run(Number(id));
  return { deleted: info.changes > 0 };
}

module.exports = { saveReport, listReports, getReport, deleteReport };
