// 重設 admin 密碼
const database = require('./database');
const bcrypt = require('bcryptjs');

console.log('🔧 重設 admin 密碼...');

const db = database.getDB();

if (!db) {
    console.error('❌ 資料庫連接失敗');
    process.exit(1);
}

async function resetAdminPassword() {
    try {
        // 加密新密碼 "password"
        const hashedPassword = await bcrypt.hash('password', 10);
        console.log('🔐 新密碼已加密:', hashedPassword);
        
        // 更新 admin 用戶密碼
        db.run(`
            UPDATE users 
            SET password = ? 
            WHERE username = 'admin'
        `, [hashedPassword], function(err) {
            if (err) {
                console.error('❌ 更新密碼失敗:', err);
                return;
            }
            
            console.log('✅ admin 密碼已重設為: password');
            
            // 驗證新密碼
            db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
                if (err) {
                    console.error('❌ 查詢用戶失敗:', err);
                    return;
                }
                
                const isCorrect = bcrypt.compareSync('password', user.password);
                console.log(`🔍 密碼驗證結果: ${isCorrect ? '成功' : '失敗'}`);
                
                if (isCorrect) {
                    console.log('🎉 admin 帳號可以使用以下憑證登入:');
                    console.log('👤 用戶名: admin');
                    console.log('🔑 密碼: password');
                } else {
                    console.log('❌ 密碼驗證仍然失敗');
                }
                
                process.exit(0);
            });
        });
        
    } catch (error) {
        console.error('❌ 重設密碼過程中發生錯誤:', error);
        process.exit(1);
    }
}

resetAdminPassword();