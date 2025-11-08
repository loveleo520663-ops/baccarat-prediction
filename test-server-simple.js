// 超簡化測試服務器
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

console.log('🚀 啟動超簡化測試服務器...');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// 基本中間件
app.use(express.static(path.join(__dirname, 'public')));

// 測試路由
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>百家樂預測系統 - 測試版</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
        .container { background: white; padding: 30px; border-radius: 10px; display: inline-block; }
        h1 { color: #333; }
        .status { color: #28a745; font-size: 18px; }
        .links { margin-top: 20px; }
        a { display: inline-block; margin: 10px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎰 百家樂預測系統</h1>
        <div class="status">✅ 服務器運行正常</div>
        <p>時間: ${new Date().toLocaleString()}</p>
        <div class="links">
          <a href="/login">登入頁面</a>
          <a href="/game">遊戲頁面</a>
          <a href="/admin">管理後台</a>
          <a href="/health">系統狀態</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: '百家樂預測系統運行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'game.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// 404 處理
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - 頁面不存在</h1>
    <p>請求的路徑: ${req.path}</p>
    <a href="/">回到首頁</a>
  `);
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('❌ 服務器錯誤:', err);
  res.status(500).send(`
    <h1>500 - 服務器錯誤</h1>
    <p>錯誤: ${err.message}</p>
    <a href="/">回到首頁</a>
  `);
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`✅ 百家樂預測系統運行於端口 ${PORT}`);
  console.log(`🌐 訪問: http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('❌ 服務器啟動失敗:', err);
});