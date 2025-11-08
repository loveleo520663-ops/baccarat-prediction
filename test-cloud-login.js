// 測試雲端登入 API
const https = require('https');

function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: username,
      password: password
    });

    const options = {
      hostname: 'baccarat-prediction-nkww.onrender.com',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('🧪 測試雲端登入 API...');
  
  try {
    const result = await testLogin('admin', 'password');
    console.log('📊 狀態碼:', result.statusCode);
    console.log('📄 回應內容:', result.body);
    
    if (result.statusCode === 200) {
      const data = JSON.parse(result.body);
      console.log('✅ 登入成功!');
      console.log('🔑 Token:', data.token ? 'Yes' : 'No');
      console.log('👤 用戶資料:', data.user);
    } else {
      console.log('❌ 登入失敗');
      try {
        const errorData = JSON.parse(result.body);
        console.log('📋 錯誤訊息:', errorData.error);
      } catch (e) {
        console.log('📋 原始錯誤:', result.body);
      }
    }
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

runTest();