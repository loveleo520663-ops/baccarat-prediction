const express = require('express');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(express.json());

// 直接測試 admin 路由（跳過認證）
app.use('/api/admin', adminRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🧪 測試伺服器運行在 http://localhost:${PORT}`);
  console.log('📋 測試路由:');
  console.log('  GET /api/admin/users');
  console.log('  GET /api/admin/stats');
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n👋 關閉測試伺服器');
  process.exit(0);
});