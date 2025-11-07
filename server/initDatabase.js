const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/baccarat.db');

// 刪除舊資料庫重新開始
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️ 已刪除舊資料庫');
}

const db = new sqlite3.Database(dbPath);

// 建立資料表
const initDatabase = () => {
  db.serialize(() => {
    // 用戶表
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT DEFAULT 'user',
      license_key TEXT,
      license_expiry DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1
    )`);

    // 許可證金鑰表
    db.run(`CREATE TABLE IF NOT EXISTS license_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_code TEXT UNIQUE NOT NULL,
      duration_days INTEGER NOT NULL,
      is_used BOOLEAN DEFAULT 0,
      used_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      used_at DATETIME,
      FOREIGN KEY (used_by) REFERENCES users (id)
    )`);

    // 預測記錄表
    db.run(`CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      card_pattern TEXT NOT NULL,
      predicted_result TEXT NOT NULL,
      actual_result TEXT,
      is_correct BOOLEAN,
      confidence_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // 遊戲歷史表
    db.run(`CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      banker_cards TEXT,
      player_cards TEXT,
      result TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // 系統設定表
    db.run(`CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 建立預設管理員帳戶
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, email, role) 
            VALUES ('admin', ?, 'admin@baccarat.com', 'admin')`, [adminPassword]);

    // 插入預設系統設定
    const defaultSettings = [
      ['prediction_algorithm', 'advanced'],
      ['max_predictions_per_day', '100'],
      ['default_license_days', '30']
    ];

    defaultSettings.forEach(([key, value]) => {
      db.run(`INSERT OR IGNORE INTO system_settings (setting_key, setting_value) 
              VALUES (?, ?)`, [key, value]);
    });

    console.log('資料庫初始化完成');
  });
};

// 如果直接執行此檔案，初始化資料庫
if (require.main === module) {
  initDatabase();
  db.close(() => {
    console.log('資料庫連接已關閉');
  });
}

module.exports = { initDatabase, db };