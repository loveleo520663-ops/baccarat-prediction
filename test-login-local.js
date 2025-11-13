// 測試本地登入功能
const https = require('https');
const http = require('http');

async function testLogin(baseUrl, username, password) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ username, password });
        const url = new URL(baseUrl);
        
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const client = url.protocol === 'https:' ? https : http;
        
        const req = client.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({
                        status: res.statusCode,
                        data: response
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        error: '解析失敗',
                        body: body
                    });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log('\n========================================');
    console.log('🧪 百家樂登入系統測試');
    console.log('========================================\n');

    // 測試本地伺服器
    console.log('📍 測試 1: 本地伺服器 (http://localhost:8000)');
    try {
        const result = await testLogin('http://localhost:8000', 'admin', 'admin123');
        console.log('   狀態碼:', result.status);
        console.log('   回應:', JSON.stringify(result.data, null, 2));
        
        if (result.status === 200 && result.data.success) {
            console.log('   ✅ 本地登入成功！\n');
        } else {
            console.log('   ❌ 本地登入失敗！\n');
        }
    } catch (error) {
        console.log('   ❌ 錯誤:', error.message, '\n');
    }

    // 測試雲端伺服器
    console.log('📍 測試 2: 雲端伺服器 (https://baccarat-main.onrender.com)');
    try {
        const result = await testLogin('https://baccarat-main.onrender.com', 'admin', 'admin123');
        console.log('   狀態碼:', result.status);
        console.log('   回應:', JSON.stringify(result.data, null, 2));
        
        if (result.status === 200 && result.data.success) {
            console.log('   ✅ 雲端登入成功！\n');
        } else {
            console.log('   ❌ 雲端登入失敗！\n');
        }
    } catch (error) {
        console.log('   ❌ 錯誤:', error.message, '\n');
    }

    // 測試錯誤密碼
    console.log('📍 測試 3: 錯誤密碼測試');
    try {
        const result = await testLogin('http://localhost:8000', 'admin', 'wrongpassword');
        console.log('   狀態碼:', result.status);
        console.log('   回應:', JSON.stringify(result.data, null, 2));
        
        if (result.status === 401) {
            console.log('   ✅ 正確拒絕錯誤密碼！\n');
        } else {
            console.log('   ❌ 應該拒絕錯誤密碼！\n');
        }
    } catch (error) {
        console.log('   ❌ 錯誤:', error.message, '\n');
    }

    console.log('========================================');
    console.log('測試完成！');
    console.log('========================================\n');
}

runTests().catch(console.error);
