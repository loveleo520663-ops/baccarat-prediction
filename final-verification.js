// 最終驗證測試 - 確認所有功能正常
const https = require('https');
const http = require('http');

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║   🎯 百家樂系統 - 最終驗證測試                    ║');
console.log('╚════════════════════════════════════════════════════╝\n');

async function makeRequest(url, method, data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            const body = JSON.stringify(data);
            options.headers['Content-Length'] = body.length;
        }

        const req = client.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function testServer(baseUrl, serverName) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 測試: ${serverName}`);
    console.log(`🌐 URL: ${baseUrl}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    let passedTests = 0;
    let failedTests = 0;
    let totalTests = 0;

    // 測試 1: 登入功能
    totalTests++;
    console.log('📝 測試 1: 登入功能');
    try {
        const loginResult = await makeRequest(
            `${baseUrl}/api/auth/login`,
            'POST',
            { username: 'admin', password: 'admin123' }
        );

        if (loginResult.status === 200 && loginResult.data.success && loginResult.data.token) {
            console.log('   ✅ 登入成功');
            console.log(`   └─ Token: ${loginResult.data.token.substring(0, 30)}...`);
            console.log(`   └─ 用戶: ${loginResult.data.user.username}`);
            console.log(`   └─ 管理員: ${loginResult.data.user.isAdmin ? '是' : '否'}`);
            passedTests++;

            // 測試 2: Token 驗證
            totalTests++;
            console.log('\n📝 測試 2: Token 驗證');
            try {
                const urlObj = new URL(`${baseUrl}/api/auth/me`);
                const client = urlObj.protocol === 'https:' ? https : http;
                
                await new Promise((resolve, reject) => {
                    const req = client.request({
                        hostname: urlObj.hostname,
                        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                        path: '/api/auth/me',
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${loginResult.data.token}`,
                            'Content-Type': 'application/json'
                        }
                    }, (res) => {
                        let body = '';
                        res.on('data', chunk => body += chunk);
                        res.on('end', () => {
                            try {
                                const data = JSON.parse(body);
                                if (res.statusCode === 200) {
                                    console.log('   ✅ Token 驗證成功');
                                    console.log(`   └─ 用戶 ID: ${data.id}`);
                                    console.log(`   └─ 用戶名: ${data.username}`);
                                    passedTests++;
                                } else {
                                    console.log('   ❌ Token 驗證失敗');
                                    failedTests++;
                                }
                                resolve();
                            } catch (e) {
                                console.log('   ❌ 回應解析失敗');
                                failedTests++;
                                resolve();
                            }
                        });
                    });
                    req.on('error', (e) => {
                        console.log(`   ❌ 錯誤: ${e.message}`);
                        failedTests++;
                        resolve();
                    });
                    req.end();
                });
            } catch (error) {
                console.log(`   ❌ 錯誤: ${error.message}`);
                failedTests++;
            }
        } else {
            console.log('   ❌ 登入失敗');
            console.log(`   └─ 狀態碼: ${loginResult.status}`);
            console.log(`   └─ 回應: ${JSON.stringify(loginResult.data)}`);
            failedTests++;
        }
    } catch (error) {
        console.log(`   ❌ 錯誤: ${error.message}`);
        failedTests++;
    }

    // 測試 3: 錯誤密碼處理
    totalTests++;
    console.log('\n📝 測試 3: 錯誤密碼處理');
    try {
        const wrongPasswordResult = await makeRequest(
            `${baseUrl}/api/auth/login`,
            'POST',
            { username: 'admin', password: 'wrongpassword' }
        );

        if (wrongPasswordResult.status === 401) {
            console.log('   ✅ 正確拒絕錯誤密碼');
            console.log(`   └─ 錯誤訊息: ${wrongPasswordResult.data.error}`);
            passedTests++;
        } else {
            console.log('   ❌ 應該拒絕錯誤密碼');
            failedTests++;
        }
    } catch (error) {
        console.log(`   ❌ 錯誤: ${error.message}`);
        failedTests++;
    }

    // 顯示結果
    console.log('\n' + '─'.repeat(50));
    console.log(`📊 ${serverName} 測試結果:`);
    console.log(`   總測試數: ${totalTests}`);
    console.log(`   ✅ 通過: ${passedTests}`);
    console.log(`   ❌ 失敗: ${failedTests}`);
    console.log(`   成功率: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('─'.repeat(50));

    return { total: totalTests, passed: passedTests, failed: failedTests };
}

async function runAllTests() {
    const results = {
        local: null,
        cloud: null
    };

    // 測試本地伺服器
    try {
        results.local = await testServer('http://localhost:8000', '本地伺服器');
    } catch (error) {
        console.log(`\n❌ 本地伺服器測試失敗: ${error.message}`);
    }

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 測試雲端伺服器
    try {
        results.cloud = await testServer('https://baccarat-main.onrender.com', '雲端伺服器');
    } catch (error) {
        console.log(`\n❌ 雲端伺服器測試失敗: ${error.message}`);
    }

    // 總結
    console.log('\n\n╔════════════════════════════════════════════════════╗');
    console.log('║              🎊 最終測試總結                       ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    if (results.local) {
        console.log('🖥️  本地伺服器:');
        console.log(`   ✅ 通過: ${results.local.passed}/${results.local.total}`);
        console.log(`   狀態: ${results.local.failed === 0 ? '🟢 完全正常' : '🟡 部分問題'}\n`);
    }

    if (results.cloud) {
        console.log('☁️  雲端伺服器:');
        console.log(`   ✅ 通過: ${results.cloud.passed}/${results.cloud.total}`);
        console.log(`   狀態: ${results.cloud.failed === 0 ? '🟢 完全正常' : '🟡 部分問題'}\n`);
    }

    const allPassed = 
        (results.local && results.local.failed === 0) &&
        (results.cloud && results.cloud.failed === 0);

    if (allPassed) {
        console.log('🎉 恭喜！所有測試全部通過！');
        console.log('✨ 系統已完全修復，可以正常使用！\n');
        console.log('📱 使用說明:');
        console.log('   1. 訪問登入頁面');
        console.log('   2. 使用帳號: admin');
        console.log('   3. 使用密碼: admin123');
        console.log('   4. 點擊登入即可進入系統\n');
    } else {
        console.log('⚠️  部分測試未通過，請檢查上述失敗項目\n');
    }

    console.log('════════════════════════════════════════════════════\n');
}

runAllTests().catch(console.error);
