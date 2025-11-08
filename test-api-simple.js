const http = require('http');
const https = require('https');
const querystring = require('querystring');

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function testAdminAPI() {
    const baseUrl = 'http://localhost:8000';
    let token = null;

    console.log('🚀 開始測試新管理員API...\n');

    try {
        // 1. 測試登入
        console.log('1️⃣ 測試登入...');
        const loginResult = await makeRequest(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        console.log('登入狀態碼:', loginResult.status);
        console.log('登入響應:', loginResult.data);

        if (loginResult.data.success && loginResult.data.token) {
            token = loginResult.data.token;
            console.log('✅ 登入成功\n');
        } else {
            throw new Error('登入失敗');
        }

        // 2. 測試統計API
        console.log('2️⃣ 測試統計API...');
        const statsResult = await makeRequest(`${baseUrl}/api/admin-new/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('統計API狀態碼:', statsResult.status);
        console.log('統計API響應:', statsResult.data);

        // 3. 測試用戶API
        console.log('\n3️⃣ 測試用戶API...');
        const usersResult = await makeRequest(`${baseUrl}/api/admin-new/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('用戶API狀態碼:', usersResult.status);
        console.log('用戶API響應:', usersResult.data);

        // 4. 測試數據庫直接連接
        console.log('\n4️⃣ 測試數據庫連接...');
        const dbResult = await makeRequest(`${baseUrl}/test-new-admin-api`);
        console.log('數據庫測試狀態碼:', dbResult.status);
        console.log('數據庫測試響應:', dbResult.data);

    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.message);
    }
}

testAdminAPI();