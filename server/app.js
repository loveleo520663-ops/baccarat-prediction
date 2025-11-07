const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const predictionRoutes = require('./routes/prediction');
const licenseRoutes = require('./routes/license');
const memoryDB = require('./memoryDB');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-secret-key-2024';

// 安全中間件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // 允許內聯事件處理程序
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 每個 IP 最多 100 次請求
  message: '請求過於頻繁，請稍後再試'
});

app.use(limiter);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 靜態資源
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    // 對於開發階段，禁用緩存
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// JWT 驗證中間件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要認證令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '無效的認證令牌' });
    }
    req.user = user;
    next();
  });
};

// 管理員驗證中間件
const authenticateAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理員權限' });
  }
  next();
};

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', authenticateToken, authenticateAdmin, adminRoutes);
app.use('/api/prediction', authenticateToken, predictionRoutes);
app.use('/api/license', licenseRoutes);

// 主頁面路由
app.get('/', (req, res) => {
  // 禁用快取
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/home.html'));
});

app.get('/login', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

app.get('/login-test', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/login-test.html'));
});

app.get('/dashboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/admin.html'));
});

app.get('/prediction', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/prediction.html'));
});

app.get('/game', (req, res) => {
  // 強制禁用所有快取
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.setHeader('Last-Modified', new Date().toUTCString());
  res.setHeader('Vary', '*');
  // 添加時間戳
  res.setHeader('X-Timestamp', Date.now().toString());
  res.sendFile(path.join(__dirname, '../views/game.html'));
});

app.get('/test-logout', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/test-logout.html'));
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '伺服器內部錯誤' });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({ error: '找不到頁面' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`伺服器運行在埠 ${PORT}`);
  console.log('內存資料庫已初始化');
  console.log('預設帳號：admin/password 和 test/password');
  console.log('部署成功！');
});

// 錯誤處理
server.on('error', (err) => {
  console.error('伺服器啟動失敗:', err);
  process.exit(1);
});

module.exports = app;