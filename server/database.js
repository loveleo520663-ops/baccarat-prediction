const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/baccarat_new.db');

// 檢查資料庫文件是否存在
function checkDatabaseExists() {
  const exists = fs.existsSync(dbPath);
  console.log('🔍 資料庫文件檢查:', exists ? '存在' : '不存在', dbPath);
  return exists;
}

// 創建共享的資料庫連線
let db;

function createConnection() {
  if (!checkDatabaseExists()) {
    console.error('❌ 資料庫文件不存在:', dbPath);
    return null;
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ 資料庫連線失敗:', err.message);
    } else {
      console.log('✅ 已連接到 SQLite 資料庫:', dbPath);
      
      // 設置 WAL 模式以支援並發讀寫
      db.run('PRAGMA journal_mode = WAL');
      
      // 測試連接
      db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (err) {
          console.error('❌ 資料庫連接測試失敗:', err.message);
        } else {
          console.log('✅ 資料庫連接測試成功，用戶數量:', result.count);
        }
      });
    }
  });

  return db;
}

// 初始創建連接
db = createConnection();

// 提供重新連接的方法
function reconnect() {
  console.log('🔄 重新連接資料庫...');
  if (db) {
    db.close();
  }
  db = createConnection();
  return db;
}

// 導出資料庫連接和重連方法
module.exports = db;
module.exports.reconnect = reconnect;
module.exports.checkExists = checkDatabaseExists;