const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// 直接創建資料庫的函數
async function createDatabaseNow() {
  return new Promise(async (resolve, reject) => {
    try {
      const dbDir = path.join(__dirname, '../database');
      const dbPath = path.join(dbDir, 'baccarat_new.db');
      
      console.log('🚀 開始創建資料庫...');
      console.log('📍 資料庫路徑:', dbPath);
      
      // 確保目錄存在
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('✅ 創建目錄:', dbDir);
      }
      
      // 如果資料庫存在，先刪除
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('🗑️ 刪除舊資料庫');
      }
      
      // 創建新資料庫
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ 創建資料庫失敗:', err);
          reject(err);
          return;
        }
        console.log('✅ 資料庫文件創建成功');
      });
      
      // 創建表和插入資料
      db.serialize(async () => {
        // 創建用戶表
        db.run(`
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            duration_days INTEGER NOT NULL,
            expiration_date TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('❌ 創建用戶表失敗:', err);
            reject(err);
            return;
          }
          console.log('✅ 用戶表創建成功');
        });

        // 創建管理員用戶
        const adminPassword = await bcrypt.hash('password', 10);
        const adminExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        
        db.run(`
          INSERT INTO users (username, password, duration_days, expiration_date, is_active)
          VALUES (?, ?, ?, ?, ?)
        `, ['admin', adminPassword, 365, adminExpiry, 1], function(err) {
          if (err) {
            console.error('❌ 創建管理員失敗:', err);
            reject(err);
            return;
          }
          console.log('✅ 管理員創建成功: admin / password');
        });

        // 創建測試用戶
        const testUsers = [
          { username: 'test001', password: 'test123', days: 30 },
          { username: 'user001', password: 'user123', days: 7 },
          { username: 'demo001', password: 'demo123', days: 1 }
        ];

        for (const user of testUsers) {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          const expiry = new Date(Date.now() + user.days * 24 * 60 * 60 * 1000).toISOString();
          
          db.run(`
            INSERT INTO users (username, password, duration_days, expiration_date)
            VALUES (?, ?, ?, ?)
          `, [user.username, hashedPassword, user.days, expiry], function(err) {
            if (err) {
              console.error(`❌ 創建用戶 ${user.username} 失敗:`, err);
            } else {
              console.log(`✅ 測試用戶: ${user.username} / ${user.password} (${user.days}天)`);
            }
          });
        }

        // 等待所有插入完成
        setTimeout(() => {
          // 驗證資料
          db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
            if (err) {
              console.error('❌ 驗證資料失敗:', err);
              reject(err);
            } else {
              console.log('✅ 資料庫創建完成，用戶數量:', result.count);
              console.log('📍 資料庫檔案:', dbPath);
              
              // 關閉連接
              db.close((err) => {
                if (err) {
                  console.error('❌ 關閉資料庫連接失敗:', err);
                } else {
                  console.log('✅ 資料庫連接已關閉');
                }
                resolve(result.count);
              });
            }
          });
        }, 1000);
      });
      
    } catch (error) {
      console.error('❌ 創建資料庫過程中發生錯誤:', error);
      reject(error);
    }
  });
}

module.exports = { createDatabaseNow };