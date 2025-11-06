const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>測試伺服器</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: #1e1e2e; 
                color: white; 
                text-align: center; 
                padding: 50px; 
            }
            .container { 
                background: #2d2d42; 
                padding: 30px; 
                border-radius: 10px; 
                max-width: 400px; 
                margin: 0 auto; 
            }
            .success { 
                color: #00ff00; 
                font-size: 24px; 
                margin: 20px 0; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎯 百家樂伺服器</h1>
            <div class="success">✅ 連線成功！</div>
            <p>時間: ${new Date().toLocaleString('zh-TW')}</p>
            <p>您的IP: ${req.connection.remoteAddress}</p>
            <p>User-Agent: ${req.headers['user-agent']}</p>
            <h3>路由器端口轉發測試成功！</h3>
        </div>
    </body>
    </html>
  `);
});

server.listen(8000, '0.0.0.0', () => {
  console.log('🌐 測試伺服器運行在 http://0.0.0.0:8000');
  console.log('🌐 本機訪問: http://localhost:8000');
  console.log('🌐 內網訪問: http://192.168.1.101:8000');
  console.log('🌐 公網訪問: http://180.218.231.54:8000');
  console.log('⏰ 啟動時間:', new Date().toLocaleString('zh-TW'));
});

// 防止進程意外退出
process.on('uncaughtException', (err) => {
  console.error('❌ 未捕獲的異常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未處理的Promise拒絕:', reason);
});