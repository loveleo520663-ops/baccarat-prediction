// 調試伺服器 - 最小化配置測試
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

// 基本中間件
app.use(express.static('public'));
app.use(express.json());

// 根路由
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>百家樂系統調試</title>
      <meta charset="UTF-8">
    </head>
    <body>
      <h1>✅ 百家樂系統正在運行</h1>
      <p>時間: ${new Date().toLocaleString('zh-TW')}</p>
      <p>端口: ${PORT}</p>
      <p>環境: ${process.env.NODE_ENV || 'development'}</p>
      <ul>
        <li><a href="/health">健康檢查</a></li>
        <li><a href="/login.html">登入頁面</a></li>
        <li><a href="/dashboard.html">儀表板</a></li>
      </ul>
    </body>
    </html>
  `);
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// 啟動伺服器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 調試伺服器運行於端口 ${PORT}`);
  console.log(`🌐 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 啟動時間: ${new Date().toLocaleString('zh-TW')}`);
});

// 錯誤處理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕獲的異常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未處理的 Promise 拒絕:', reason);
});