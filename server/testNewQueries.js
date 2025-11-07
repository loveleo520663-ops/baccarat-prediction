const db = require('./database');

console.log('🧪 測試管理員路由 SQL 查詢...');

// 測試用戶查詢 (新修改的查詢)
console.log('\n1️⃣ 測試新的用戶查詢...');
db.all(`
  SELECT 
    id, 
    username, 
    duration_days, 
    expiration_date,
    expiration_date as license_expiry,
    username as license_key,
    is_active, 
    created_at,
    NULL as email,
    NULL as last_login
  FROM users 
  ORDER BY created_at DESC
`, (err, users) => {
  if (err) {
    console.error('❌ 新用戶查詢錯誤:', err);
  } else {
    console.log('✅ 新用戶查詢成功，數量:', users.length);
    console.log('用戶資料範例:', users[0]);
  }

  // 測試許可證查詢
  console.log('\n2️⃣ 測試許可證查詢...');
  db.all(`
    SELECT 
      id,
      username as license_holder,
      username as key_code,
      duration_days,
      expiration_date,
      is_active,
      created_at,
      CASE 
        WHEN datetime(expiration_date) > datetime('now') THEN 0
        ELSE 1
      END as is_expired
    FROM users 
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [20, 0], (err, licenses) => {
    if (err) {
      console.error('❌ 許可證查詢錯誤:', err);
    } else {
      console.log('✅ 許可證查詢成功，數量:', licenses.length);
      console.log('許可證資料範例:', licenses[0]);
    }

    // 測試統計查詢
    console.log('\n3️⃣ 測試統計查詢...');
    db.serialize(() => {
      let stats = {};
      db.get('SELECT COUNT(*) as total FROM users', (err, result) => {
        if (err) {
          console.error('❌ 總數統計錯誤:', err);
        } else {
          stats.totalUsers = result.total;
          console.log('✅ 總用戶數:', stats.totalUsers);
        }
        process.exit(0);
      });
    });
  });
});