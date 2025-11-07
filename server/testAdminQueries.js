const db = require('./database');

console.log('🧪 直接測試管理員 API 查詢...');

// 測試用戶查詢
console.log('\n1️⃣ 測試用戶查詢...');
db.all(`
  SELECT id, username, duration_days, expiration_date, is_active, created_at
  FROM users 
  ORDER BY created_at DESC
`, (err, users) => {
  if (err) {
    console.error('❌ 用戶查詢錯誤:', err);
  } else {
    console.log('✅ 用戶查詢成功，數量:', users.length);
    console.log('用戶資料:', users);
  }

  // 測試統計查詢
  console.log('\n2️⃣ 測試統計查詢...');
  db.serialize(() => {
    let stats = {};
    db.get('SELECT COUNT(*) as total FROM users', (err, result) => {
      if (err) {
        console.error('❌ 總用戶統計錯誤:', err);
        return;
      }
      stats.totalUsers = result.total;
      console.log('✅ 總用戶數:', stats.totalUsers);

      db.get('SELECT COUNT(*) as active FROM users WHERE is_active = 1', (err, result) => {
        if (err) {
          console.error('❌ 活躍用戶統計錯誤:', err);
          return;
        }
        stats.activeUsers = result.active;
        console.log('✅ 活躍用戶數:', stats.activeUsers);

        db.get('SELECT COUNT(*) as expired FROM users WHERE datetime(expiration_date) < datetime("now")', (err, result) => {
          if (err) {
            console.error('❌ 過期用戶統計錯誤:', err);
            return;
          }
          stats.expiredUsers = result.expired;
          console.log('✅ 過期用戶數:', stats.expiredUsers);
          console.log('\n🎯 最終統計結果:', stats);
          process.exit(0);
        });
      });
    });
  });
});