const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/baccarat.db');

// 創建共享的資料庫連線
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('資料庫連線失敗:', err.message);
  } else {
    console.log('已連接到 SQLite 資料庫');
  }
});

// 設置 WAL 模式以支援並發讀寫
db.run('PRAGMA journal_mode = WAL');

module.exports = db;