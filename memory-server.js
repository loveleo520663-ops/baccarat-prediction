// 百家樂預測系統 - 純記憶體版本
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-memory-key-2024';

// 記憶體資料存儲 - 僅管理員帳號
let memoryUsers = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$BAhIFLwfLFybU67t7.rMSenZrWFQsALFMOKWq7XNqSZaWGcHQJRRm', // admin123
    is_admin: 1,
    created_at: new Date().toISOString()
  }
];

let memoryPredictions = [];

// 中間件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100, // 限制每個IP 15分鐘內最多100個請求
  message: { error: '請求過於頻繁，請稍後再試' }
});
app.use('/api', limiter);

// JWT 驗證中間件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登入權限' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '登入已過期，請重新登入' });
    }
    req.user = user;
    next();
  });
};

// 管理員權限中間件
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: '需要管理員權限' });
  }
  next();
};

// 輔助函數
const findUserByUsername = (username) => {
  return memoryUsers.find(user => user.username === username);
};

const findUserById = (id) => {
  return memoryUsers.find(user => user.id === id);
};

// 路由
app.get('/', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'views/home.html');
    console.log(`📄 嘗試服務文件: ${filePath}`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ 根路由錯誤:', error);
    res.status(500).send(`伺服器錯誤: ${error.message}`);
  }
});

app.get('/login', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'views/login.html'));
  } catch (error) {
    console.error('❌ 登入頁面錯誤:', error);
    res.status(500).send(`登入頁面錯誤: ${error.message}`);
  }
});

app.get('/dashboard', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'views/dashboard.html'));
  } catch (error) {
    console.error('❌ 儀表板錯誤:', error);
    res.status(500).send(`儀表板錯誤: ${error.message}`);
  }
});

app.get('/admin', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'views/admin.html'));
  } catch (error) {
    console.error('❌ 管理頁面錯誤:', error);
    res.status(500).send(`管理頁面錯誤: ${error.message}`);
  }
});

app.get('/prediction', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'views/prediction.html'));
  } catch (error) {
    console.error('❌ 預測頁面錯誤:', error);
    res.status(500).send(`預測頁面錯誤: ${error.message}`);
  }
});

// API 路由
// 登入
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用戶名和密碼不能為空' });
    }

    const user = findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        isAdmin: user.is_admin === 1 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '登入成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1
      }
    });

    console.log(`✅ 用戶登入成功: ${username} (${user.is_admin === 1 ? '管理員' : '普通用戶'})`);
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 註冊功能已禁用 - 僅保留管理員帳號
app.post('/api/register', (req, res) => {
  res.status(403).json({ error: '註冊功能已關閉，請聯絡管理員' });
});

// 獲取用戶資訊
app.get('/api/me', authenticateToken, (req, res) => {
  const user = findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: '用戶不存在' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.is_admin === 1,
      licenseKey: user.license_key,
      createdAt: user.created_at
    }
  });
});

// 管理員後台路由 (已禁用功能，僅保留頁面訪問)
app.get('/api/admin/status', authenticateToken, requireAdmin, (req, res) => {
  res.json({ 
    success: true, 
    message: '管理員權限確認',
    admin: req.user.username,
    timestamp: new Date().toISOString()
  });
});

// 預測相關API
app.post('/api/prediction', authenticateToken, (req, res) => {
  try {
    const { gameData, prediction } = req.body;

    const newPrediction = {
      id: memoryPredictions.length + 1,
      userId: req.user.userId,
      gameData,
      prediction,
      timestamp: new Date().toISOString()
    };

    memoryPredictions.push(newPrediction);

    res.json({ success: true, prediction: newPrediction });
    console.log(`✅ 用戶 ${req.user.username} 提交預測`);
  } catch (error) {
    console.error('預測錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 獲取預測歷史
app.get('/api/predictions', authenticateToken, (req, res) => {
  const userPredictions = memoryPredictions.filter(p => p.userId === req.user.userId);
  res.json({ success: true, predictions: userPredictions });
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: 'memory',
    users: memoryUsers.length,
    predictions: memoryPredictions.length,
    uptime: process.uptime(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// 調試路由
app.get('/debug', (req, res) => {
  res.json({
    message: '✅ 簡化版伺服器運行正常',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    directory: __dirname,
    viewsPath: path.join(__dirname, 'views'),
    publicPath: path.join(__dirname, 'public'),
    routes: ['/', '/login', '/dashboard', '/admin', '/prediction', '/health', '/debug'],
    memoryData: {
      adminUser: 1,
      predictions: memoryPredictions.length
    }
  });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('伺服器錯誤:', err);
  res.status(500).json({ error: '內部伺服器錯誤' });
});

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({ error: '頁面不存在' });
});

// 啟動伺服器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 百家樂預測系統 (簡化版) 運行於端口 ${PORT}`);
  console.log(`🌐 訪問: http://localhost:${PORT}`);
  console.log(`🔑 管理員帳號: admin / admin123`);
  console.log(`📊 資料狀態: 純記憶體模式 (重啟後資料會遺失)`);
  console.log(`👥 僅管理員帳號，已移除註冊和後台管理功能`);
  console.log(`� 保留登入和遊戲功能`);
  console.log(`⚠️  注意: 這是簡化版，伺服器重啟後遊戲資料會遺失`);
});

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('🛑 收到關閉信號，正在關閉伺服器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 收到中斷信號，正在關閉伺服器...');
  process.exit(0);
});