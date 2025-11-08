const path = require('path');
const database = require('./server/database');

console.log('📊 開始檢查用戶數據庫...');

// 連接數據庫
const db = database.getDB();

if (!db) {
    console.error('❌ 無法連接數據庫');
    process.exit(1);
}

// 檢查用戶表結構
db.all('PRAGMA table_info(users)', (err, columns) => {
    if (err) {
        console.error('❌ 獲取表結構失敗:', err);
        return;
    }
    
    console.log('\n📋 users 表結構:');
    columns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // 檢查所有用戶
    db.all('SELECT * FROM users', (err, users) => {
        if (err) {
            console.error('❌ 查詢用戶失敗:', err);
            return;
        }
        
        console.log('\n👥 所有用戶數據:');
        console.log(`找到 ${users.length} 個用戶:`);
        
        users.forEach((user, index) => {
            console.log(`\n用戶 ${index + 1}:`);
            console.log(`  ID: ${user.id}`);
            console.log(`  用戶名: ${user.username}`);
            console.log(`  密碼哈希: ${user.password ? user.password.substring(0, 20) + '...' : '無'}`);
            console.log(`  創建時間: ${user.created_at}`);
            console.log(`  到期時間: ${user.expiration_date}`);
            console.log(`  持續天數: ${user.duration_days}`);
            console.log(`  啟用狀態: ${user.is_active}`);
            console.log(`  管理員: ${user.is_admin}`);
        });
        
        // 檢查管理員用戶
        db.all('SELECT * FROM users WHERE is_admin = 1', (err, admins) => {
            if (err) {
                console.error('❌ 查詢管理員失敗:', err);
                return;
            }
            
            console.log(`\n👑 管理員用戶 (${admins.length} 個):`);
            admins.forEach(admin => {
                console.log(`  - ${admin.username} (ID: ${admin.id})`);
            });
            
            process.exit(0);
        });
    });
});