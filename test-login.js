const http = require('http');

const postData = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 測試登入 API...');

const req = http.request(options, (res) => {
  console.log('✅ 狀態碼:', res.statusCode);
  console.log('📋 回應標頭:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 回應內容:', data);
    try {
      const jsonData = JSON.parse(data);
      console.log('✅ JSON 解析成功:', jsonData);
    } catch (err) {
      console.log('❌ JSON 解析失敗:', err.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 請求錯誤:', error.message);
});

req.write(postData);
req.end();