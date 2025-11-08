// 簡化測試服務器 - 僅測試基本功能
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

console.log('🚀 啟動簡化測試服務器...');
console.log('📊 環境變數:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- DB_TYPE:', process.env.DB_TYPE);
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '已設定' : '未設定');

// 基本中間件
app.use(express.static(path.join(__dirname, 'public')));

// 測試路由
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: '百家樂預測系統 - 簡化測試版',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/test', (req, res) => {
  res.json({
    message: 'Render 部署測試成功！',
    server: 'Express.js',
    node_version: process.version
  });
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`✅ 簡化測試服務器運行在埠 ${PORT}`);
  console.log(`🌐 訪問地址: http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('❌ 服務器啟動錯誤:', err);
});

console.log('🔄 服務器啟動腳本執行完成');