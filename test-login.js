// 測試登入密碼
const bcrypt = require('bcryptjs');

const storedHash = '$2a$10$BAhIFLwfLFybU67t7.rMSenZrWFQsALFMOKWq7XNqSZaWGcHQJRRm';
const password = 'admin123';

console.log('測試密碼驗證...');
console.log('密碼:', password);
console.log('儲存的雜湊:', storedHash);

bcrypt.compare(password, storedHash, (err, result) => {
  if (err) {
    console.error('❌ 錯誤:', err);
  } else {
    console.log('✅ 密碼驗證結果:', result);
    if (result) {
      console.log('🎉 密碼正確！');
    } else {
      console.log('❌ 密碼錯誤！');
      console.log('\n重新生成正確的雜湊值...');
      const newHash = bcrypt.hashSync(password, 10);
      console.log('新雜湊值:', newHash);
    }
  }
});
