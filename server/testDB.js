const db = require('./database');

console.log('🧪 測試資料庫連接...');

// 測試連接
db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
  if (err) {
    console.error('❌ 資料庫查詢錯誤:', err);
  } else {
    console.log('✅ 資料庫連接正常，用戶數量:', result.count);
  }
  
  // 測試獲取所有用戶
  db.all('SELECT id, username, duration_days, expiration_date, is_active, created_at FROM users', (err, users) => {
    if (err) {
      console.error('❌ 獲取用戶錯誤:', err);
    } else {
      console.log('✅ 用戶資料:');
      console.table(users);
    }
    
    db.close();
  });
});