// 測試 Render 連接
const https = require('https');

console.log('🔍 測試 Render 連接...');

const testUrl = 'https://baccarat-prediction-b3m0.onrender.com';

// 測試基本連接
function testConnection(path) {
  return new Promise((resolve, reject) => {
    const url = testUrl + path;
    console.log(`\n📡 測試: ${url}`);
    
    const req = https.get(url, { timeout: 15000 }, (res) => {
      console.log(`✅ 狀態碼: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`📄 回應內容: ${data.substring(0, 200)}...`);
        resolve({ status: res.statusCode, data: data });
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ 錯誤: ${err.message}`);
      reject(err);
    });
    
    req.on('timeout', () => {
      console.log(`⏰ 請求超時`);
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function runTests() {
  const paths = ['/', '/health', '/login'];
  
  for (const path of paths) {
    try {
      await testConnection(path);
    } catch (err) {
      console.log(`💥 ${path} 測試失敗: ${err.message}`);
    }
    
    // 間隔一秒
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 測試完成');
}

runTests();