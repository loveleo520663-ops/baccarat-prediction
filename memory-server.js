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

// 記憶體資料存儲
let memoryUsers = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
    is_admin: 1,
    license_key: 'ADMIN-MASTER-KEY',
    created_at: new Date().toISOString()
  }
];

let memoryLicenses = [
  {
    id: 1,
    license_key: 'ADMIN-MASTER-KEY',
    is_active: 1,
    created_at: new Date().toISOString(),
    used_by: 1
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

const findLicenseByKey = (key) => {
  return memoryLicenses.find(license => license.license_key === key);
};

// 路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/home.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin.html'));
});

app.get('/prediction', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/prediction.html'));
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

// 註冊
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, licenseKey } = req.body;

    if (!username || !password || !licenseKey) {
      return res.status(400).json({ error: '所有欄位都必須填寫' });
    }

    // 檢查用戶名是否已存在
    if (findUserByUsername(username)) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 檢查金鑰
    const license = findLicenseByKey(licenseKey);
    if (!license || license.is_active !== 1 || license.used_by) {
      return res.status(400).json({ error: '無效或已使用的金鑰' });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 創建新用戶
    const newUser = {
      id: memoryUsers.length + 1,
      username,
      password: hashedPassword,
      is_admin: 0,
      license_key: licenseKey,
      created_at: new Date().toISOString()
    };

    memoryUsers.push(newUser);

    // 標記金鑰為已使用
    license.used_by = newUser.id;

    const token = jwt.sign(
      { 
        userId: newUser.id, 
        username: newUser.username, 
        isAdmin: false 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '註冊成功',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        isAdmin: false
      }
    });

    console.log(`✅ 新用戶註冊: ${username}`);
  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
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

// 管理員：獲取所有用戶
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const users = memoryUsers.map(user => ({
    id: user.id,
    username: user.username,
    isAdmin: user.is_admin === 1,
    licenseKey: user.license_key,
    createdAt: user.created_at
  }));

  res.json({ success: true, users });
});

// 管理員：創建金鑰
app.post('/api/admin/licenses', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: '金鑰不能為空' });
    }

    if (findLicenseByKey(key)) {
      return res.status(400).json({ error: '金鑰已存在' });
    }

    const newLicense = {
      id: memoryLicenses.length + 1,
      license_key: key,
      is_active: 1,
      created_at: new Date().toISOString(),
      used_by: null
    };

    memoryLicenses.push(newLicense);

    res.json({ success: true, message: '金鑰創建成功', license: newLicense });
    console.log(`✅ 管理員創建新金鑰: ${key}`);
  } catch (error) {
    console.error('創建金鑰錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 管理員：獲取所有金鑰
app.get('/api/admin/licenses', authenticateToken, requireAdmin, (req, res) => {
  const licenses = memoryLicenses.map(license => ({
    ...license,
    usedByUser: license.used_by ? findUserById(license.used_by)?.username : null
  }));

  res.json({ success: true, licenses });
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
    licenses: memoryLicenses.length,
    predictions: memoryPredictions.length
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
  console.log(`🚀 百家樂預測系統 (記憶體模式) 運行於端口 ${PORT}`);
  console.log(`🌐 訪問: http://localhost:${PORT}`);
  console.log(`🔑 管理員帳號: admin / admin123`);
  console.log(`📊 資料狀態: 純記憶體模式 (重啟後資料會遺失)`);
  console.log(`👥 預設用戶: ${memoryUsers.length} 個`);
  console.log(`🎫 可用金鑰: ${memoryLicenses.length} 個`);
  console.log(`⚠️  注意: 這是記憶體模式，伺服器重啟後所有資料將遺失`);
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