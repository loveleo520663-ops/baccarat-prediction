const express = require('express');
const app = express();
const PORT = 3002;

app.get('/', (req, res) => {
  res.send('百家樂預測系統運行中！');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`測試伺服器運行在 http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('未捕獲的異常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的 Promise 拒絕:', reason);
  process.exit(1);
});