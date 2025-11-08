const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/health',
  method: 'GET'
};

console.log('🔍 測試健康檢查...');

const req = http.request(options, (res) => {
  console.log('✅ 狀態碼:', res.statusCode);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 健康檢查回應:', data);
  });
});

req.on('error', (error) => {
  console.error('❌ 健康檢查錯誤:', error.message);
  console.error('🔧 可能的問題:');
  console.error('  - 服務器未啟動');
  console.error('  - 埠口 8000 被佔用');
  console.error('  - 防火牆阻擋連接');
});

req.end();