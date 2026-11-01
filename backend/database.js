const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'promptpixel.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDb();
  }
  return db;
}

function initializeDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS failure_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_prompt TEXT,
      enhanced_prompt TEXT,
      prompt_type TEXT,
      failure_reason TEXT,
      judge_score REAL,
      judge_feedback TEXT,
      embedding TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Database initialized successfully');
}

module.exports = { getDb };
