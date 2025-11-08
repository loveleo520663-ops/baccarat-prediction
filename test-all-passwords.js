// 強制重置雲端管理員密碼
const https = require('https');
const bcrypt = require('bcryptjs');

async function forceResetAdmin() {
  console.log('🔄 強制重置雲端管理員密碼...');
  
  // 首先檢查健康狀態
  const healthData = await testEndpoint('GET', '/health', null);
  console.log('📊 健康狀態:', healthData.statusCode);
  
  if (healthData.statusCode !== 200) {
    console.log('❌ 應用未正常運行');
    return;
  }
  
  // 嘗試用不同密碼測試
  const passwords = ['password', 'admin123', 'admin'];
  
  for (const pwd of passwords) {
    console.log(`🧪 測試密碼: ${pwd}`);
    const result = await testLogin('admin', pwd);
    
    if (result.statusCode === 200) {
      console.log(`✅ 登入成功! 正確密碼是: ${pwd}`);
      return pwd;
    } else {
      console.log(`❌ 密碼錯誤: ${pwd}`);
    }
  }
  
  console.log('🚨 所有常見密碼都失敗了！');
  console.log('💡 建議: 檢查 Render 部署日誌確認管理員是否正確創建');
}

function testLogin(username, password) {
  return testEndpoint('POST', '/api/auth/login', {
    username: username,
    password: password
  });
}

function testEndpoint(method, path, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'baccarat-prediction-nkww.onrender.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

forceResetAdmin().catch(console.error);