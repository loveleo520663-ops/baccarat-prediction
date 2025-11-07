const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// 建立資料表和初始資料
const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, '../database/baccarat_new.db');
    
    // 刪除舊資料庫（如果存在）
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('🗑️ 已刪除舊資料庫');
    }
    
    const db = new sqlite3.Database(dbPath);
    console.log('🚀 開始初始化新資料庫...');
    db.serialize(async () => {
      try {
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
          console.log('✅ 用戶表創建完成');
        });

        // 等待表創建完成後再插入資料
        setTimeout(async () => {
          try {
            // 創建管理員帳號
            const adminPassword = await bcrypt.hash('admin123', 10);
            const adminExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            
            db.run(`
              INSERT INTO users (username, password, duration_days, expiration_date, is_active)
              VALUES (?, ?, ?, ?, ?)
            `, ['admin', adminPassword, 365, adminExpiry, 1], function(err) {
              if (err) {
                console.error('❌ 創建管理員失敗:', err);
              } else {
                console.log('👤 管理員帳號: admin / admin123');
              }
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

            console.log('🎉 資料庫初始化完成！');
            console.log('📍 資料庫檔案:', dbPath);
            
            // 關閉資料庫連接
            db.close((err) => {
              if (err) {
                console.error('❌ 關閉資料庫連接失敗:', err);
              } else {
                console.log('✅ 資料庫連接已關閉');
              }
              resolve();
            });
            
          } catch (error) {
            console.error('❌ 插入資料時發生錯誤:', error);
            reject(error);
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ 創建表時發生錯誤:', error);
        reject(error);
      }
    });
  });
};

// 導出初始化函數
module.exports = initDatabase;