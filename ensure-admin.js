// 確保管理員存在的腳本
const database = require('./server/database');
const bcrypt = require('bcryptjs');

async function ensureAdminExists() {
  try {
    console.log('🔍 檢查管理員帳號...');
    
    const db = database.getDB();
    if (!db) {
      console.error('❌ 無法連接資料庫');
      return;
    }

    // 檢查是否已有管理員
    const existingAdmin = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (existingAdmin) {
      console.log('✅ 管理員帳號已存在:', existingAdmin.username);
      console.log('📅 建立時間:', existingAdmin.created_at);
      console.log('🔐 密碼雜湊:', existingAdmin.password.substring(0, 20) + '...');
      
      // 測試密碼
      const isPasswordValid = await bcrypt.compare('password', existingAdmin.password);
      console.log('🧪 密碼測試 (password):', isPasswordValid ? '✅ 正確' : '❌ 錯誤');
      
      return;
    }

    console.log('⚠️ 管理員帳號不存在，正在建立...');
    
    // 創建管理員
    const hashedPassword = await bcrypt.hash('password', 10);
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    if (database.dbType === 'postgres') {
      await db.run(`
        INSERT INTO users (username, password, duration_days, expiration_date, is_active, is_admin, created_at)
        VALUES ($1, $2, $3, $4, 1, 1, $5)
      `, [
        'admin',
        hashedPassword,
        365,
        expirationDate.toISOString(),
        new Date().toISOString()
      ]);
    } else {
      await db.run(`
        INSERT INTO users (username, password, duration_days, expiration_date, is_active, is_admin, created_at)
        VALUES (?, ?, ?, ?, 1, 1, ?)
      `, [
        'admin',
        hashedPassword,
        365,
        expirationDate.toISOString(),
        new Date().toISOString()
      ]);
    }

    console.log('✅ 管理員帳號建立成功: admin / password');

  } catch (error) {
    console.error('❌ 錯誤:', error);
    if (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key')) {
      console.log('ℹ️ 管理員帳號已存在 (唯一性約束)');
    }
  }
}

// 如果是直接執行此腳本
if (require.main === module) {
  ensureAdminExists().then(() => {
    console.log('🏁 檢查完成');
    process.exit(0);
  }).catch(err => {
    console.error('❌ 執行失敗:', err);
    process.exit(1);
  });
}

module.exports = ensureAdminExists;