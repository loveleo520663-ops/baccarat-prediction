const path = require('path');
const database = require('./server/database');

console.log('🔧 開始修復用戶表結構...');

// 連接數據庫
const db = database.getDB();

if (!db) {
    console.error('❌ 無法連接數據庫');
    process.exit(1);
}

// 添加缺少的欄位
db.serialize(() => {
    console.log('🔄 檢查並添加 is_admin 欄位...');
    
    // 檢查是否已經有 is_admin 欄位
    db.all('PRAGMA table_info(users)', (err, columns) => {
        if (err) {
            console.error('❌ 獲取表結構失敗:', err);
            return;
        }
        
        const hasIsAdmin = columns.some(col => col.name === 'is_admin');
        
        if (!hasIsAdmin) {
            console.log('➕ 添加 is_admin 欄位...');
            
            db.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0', (err) => {
                if (err) {
                    console.error('❌ 添加 is_admin 欄位失敗:', err);
                    return;
                }
                
                console.log('✅ 成功添加 is_admin 欄位');
                
                // 設置 admin 用戶為管理員
                db.run('UPDATE users SET is_admin = 1 WHERE username = ?', ['admin'], (err) => {
                    if (err) {
                        console.error('❌ 更新管理員權限失敗:', err);
                        return;
                    }
                    
                    console.log('✅ 已設置 admin 用戶為管理員');
                    
                    // 驗證更新
                    db.all('SELECT username, is_admin FROM users', (err, users) => {
                        if (err) {
                            console.error('❌ 查詢用戶失敗:', err);
                            return;
                        }
                        
                        console.log('\n👥 用戶權限狀態:');
                        users.forEach(user => {
                            console.log(`  ${user.username}: ${user.is_admin ? '管理員' : '普通用戶'}`);
                        });
                        
                        process.exit(0);
                    });
                });
            });
        } else {
            console.log('ℹ️ is_admin 欄位已存在');
            
            // 確保 admin 用戶有管理員權限
            db.run('UPDATE users SET is_admin = 1 WHERE username = ?', ['admin'], (err) => {
                if (err) {
                    console.error('❌ 更新管理員權限失敗:', err);
                    return;
                }
                
                console.log('✅ 已確認 admin 用戶為管理員');
                process.exit(0);
            });
        }
    });
});