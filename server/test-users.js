// 測試資料庫用戶數據
const database = require('./database');

console.log('🔍 測試資料庫用戶數據...');

const db = database.getDB();

if (!db) {
    console.error('❌ 資料庫連接失敗');
    process.exit(1);
}

console.log('✅ 資料庫連接成功');

// 查看所有用戶
db.all('SELECT * FROM users', (err, users) => {
    if (err) {
        console.error('❌ 查詢用戶失敗:', err);
        return;
    }
    
    console.log('📊 用戶數據:');
    users.forEach(user => {
        console.log(`👤 用戶: ${user.username}`);
        console.log(`🔑 密碼(加密): ${user.password}`);
        console.log(`📅 到期時間: ${user.expiration_date}`);
        console.log(`🔒 狀態: ${user.is_active ? '啟用' : '停用'}`);
        console.log('---');
    });
    
    // 測試 admin 用戶的密碼
    const adminUser = users.find(u => u.username === 'admin');
    if (adminUser) {
        console.log('🔐 測試 admin 密碼...');
        const bcrypt = require('bcryptjs');
        
        const isPasswordCorrect = bcrypt.compareSync('password', adminUser.password);
        console.log(`✅ admin 密碼驗證: ${isPasswordCorrect ? '正確' : '錯誤'}`);
        
        if (!isPasswordCorrect) {
            console.log('❌ admin 密碼不正確，需要重設');
        }
    } else {
        console.log('❌ 找不到 admin 用戶');
    }
    
    process.exit(0);
});