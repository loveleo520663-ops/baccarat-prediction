// 強制重置管理員密碼腳本
const database = require('./server/database');
const bcrypt = require('bcryptjs');

async function forceResetAdminPassword() {
  try {
    console.log('🔄 強制重置管理員密碼...');
    
    const db = database.getDB();
    if (!db) {
      console.error('❌ 無法連接資料庫');
      return;
    }

    console.log('📊 資料庫類型:', database.dbType);

    // 生成新的密碼雜湊
    const newPassword = 'password';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('🔐 新密碼雜湊:', hashedPassword);

    // 更新管理員密碼
    let sql, params;
    if (database.dbType === 'postgres') {
      sql = 'UPDATE users SET password = $1 WHERE username = $2';
      params = [hashedPassword, 'admin'];
    } else {
      sql = 'UPDATE users SET password = ? WHERE username = ?';
      params = [hashedPassword, 'admin'];
    }

    await db.run(sql, params);
    console.log('✅ 管理員密碼已重置為: password');

    // 驗證更新
    let selectSql, selectParams;
    if (database.dbType === 'postgres') {
      selectSql = 'SELECT username, password FROM users WHERE username = $1';
      selectParams = ['admin'];
    } else {
      selectSql = 'SELECT username, password FROM users WHERE username = ?';
      selectParams = ['admin'];
    }

    const admin = await db.get(selectSql, selectParams);
    console.log('🧪 驗證更新後的用戶:', admin.username);
    
    // 測試新密碼
    const isValid = await bcrypt.compare('password', admin.password);
    console.log('🔍 密碼驗證測試:', isValid ? '✅ 成功' : '❌ 失敗');

    if (isValid) {
      console.log('🎉 密碼重置成功！現在可以使用 admin/password 登入');
    } else {
      console.log('❌ 密碼重置失敗，請檢查');
    }

  } catch (error) {
    console.error('❌ 重置失敗:', error.message);
  }
}

// 直接執行
forceResetAdminPassword().then(() => {
  console.log('🏁 重置完成');
  process.exit(0);
}).catch(err => {
  console.error('❌ 執行失敗:', err);
  process.exit(1);
});