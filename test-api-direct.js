const fetch = require('node-fetch');

async function testAdminAPI() {
    const baseUrl = 'http://localhost:8000';
    let token = null;

    console.log('🚀 開始測試新管理員API...\n');

    try {
        // 1. 測試登入
        console.log('1️⃣ 測試登入...');
        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();
        console.log('登入響應:', loginData);

        if (loginData.success && loginData.token) {
            token = loginData.token;
            console.log('✅ 登入成功，Token:', token.substring(0, 20) + '...\n');
        } else {
            throw new Error('登入失敗: ' + loginData.message);
        }

        // 2. 測試統計API
        console.log('2️⃣ 測試統計API...');
        const statsResponse = await fetch(`${baseUrl}/api/admin-new/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('統計API狀態碼:', statsResponse.status);
        const statsData = await statsResponse.json();
        console.log('統計API響應:', JSON.stringify(statsData, null, 2));

        // 3. 測試用戶API
        console.log('\n3️⃣ 測試用戶API...');
        const usersResponse = await fetch(`${baseUrl}/api/admin-new/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('用戶API狀態碼:', usersResponse.status);
        const usersData = await usersResponse.json();
        console.log('用戶API響應:', JSON.stringify(usersData, null, 2));

        // 4. 測試數據庫直接連接
        console.log('\n4️⃣ 測試數據庫連接...');
        const dbResponse = await fetch(`${baseUrl}/test-new-admin-api`);
        const dbData = await dbResponse.json();
        console.log('數據庫測試響應:', JSON.stringify(dbData, null, 2));

    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.message);
    }
}

// 安裝 node-fetch 如果沒有的話
try {
    require('node-fetch');
    testAdminAPI();
} catch (e) {
    console.log('請安裝 node-fetch: npm install node-fetch');
    
    // 使用內建的 http 模塊替代
    const http = require('http');
    console.log('🔍 使用內建模塊測試...');
    
    const testReq = http.get('http://localhost:8000/test-new-admin-api', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('數據庫測試響應:', JSON.parse(data));
        });
    });
    
    testReq.on('error', (err) => {
        console.error('❌ 測試失敗:', err.message);
    });
}