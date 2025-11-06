const http = require('http');

console.log('🚀 開始啟動伺服器...');

const server = http.createServer((req, res) => {
    console.log(`📥 收到請求: ${req.method} ${req.url} 來自 ${req.connection.remoteAddress}`);
    
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>百家樂測試伺服器</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #1e1e2e 0%, #2d2d42 100%);
                color: white; 
                text-align: center; 
                padding: 20px;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { 
                background: rgba(45, 45, 66, 0.8);
                padding: 30px; 
                border-radius: 15px; 
                max-width: 500px; 
                width: 100%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                border: 2px solid #4a4a6a;
            }
            .success { 
                color: #00ff88; 
                font-size: 28px; 
                margin: 20px 0;
                text-shadow: 0 0 10px rgba(0,255,136,0.3);
            }
            .info {
                background: #3a3a56;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                text-align: left;
            }
            .emoji { font-size: 2rem; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="emoji">🎯</div>
            <h1>百家樂伺服器測試</h1>
            <div class="success">✅ 連線成功！</div>
            
            <div class="info">
                <strong>📅 時間:</strong> ${new Date().toLocaleString('zh-TW')}<br>
                <strong>🌐 您的IP:</strong> ${req.connection.remoteAddress}<br>
                <strong>📱 設備:</strong> ${req.headers['user-agent']?.substring(0, 50)}...
            </div>
            
            <h2>🎉 路由器端口轉發成功！</h2>
            <p>您現在可以在任何地方訪問這個伺服器</p>
            
            <div style="margin-top: 30px; font-size: 14px; opacity: 0.8;">
                <p>🔗 內網: http://192.168.1.101:8000</p>
                <p>🌍 公網: http://180.218.231.54:8000</p>
            </div>
        </div>
    </body>
    </html>`;
    
    res.end(html);
});

server.on('error', (err) => {
    console.error('❌ 伺服器錯誤:', err);
    if (err.code === 'EADDRINUSE') {
        console.error('💡 端口8000已被使用，請先停止其他程序');
    }
});

server.listen(8000, '0.0.0.0', () => {
    console.log('🌟 =================================');
    console.log('🎯 百家樂測試伺服器啟動成功！');
    console.log('🌟 =================================');
    console.log('📍 監聽地址: 0.0.0.0:8000');
    console.log('🏠 本機訪問: http://localhost:8000');
    console.log('🏢 內網訪問: http://192.168.1.101:8000');
    console.log('🌍 公網訪問: http://180.218.231.54:8000');
    console.log('⏰ 啟動時間:', new Date().toLocaleString('zh-TW'));
    console.log('🌟 =================================');
    console.log('📝 等待連接請求...');
});

// 保持進程運行
setInterval(() => {
    console.log('💓 伺服器運行正常 -', new Date().toLocaleTimeString('zh-TW'));
}, 30000);

console.log('🔧 伺服器腳本載入完成，準備監聽...');