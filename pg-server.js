// 百家樂預測系統 - PostgreSQL 版本伺服器
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const database = require('./server/database-pg');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-pg-key-2024';

// 初始化資料庫
const initApp = async () => {
  try {
    console.log('🔄 初始化資料庫...');
    await database.createTables();
    console.log('✅ 資料庫初始化完成');
  } catch (error) {
    console.error('❌ 資料庫初始化失敗:', error);
    console.log('⚠️ 警告: 資料庫連接失敗,但伺服器將繼續運行');
    console.log('💡 請檢查 DATABASE_URL 環境變數是否正確設定');
  }
};

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
app.use(express.static(path.join(__dirname, 'public')));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: '請求過於頻繁,請稍後再試' }
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
      return res.status(403).json({ error: '登入已過期,請重新登入' });
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

// ========== 路由 ==========

// 根路徑
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 靜態頁面
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/admin.html'));
});

app.get('/prediction', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/prediction.html'));
});

// ========== API 路由 ==========

// 用戶註冊
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用戶名和密碼不能為空' });
    }

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: '用戶名至少3個字符,密碼至少6個字符' });
    }

    const db = database.getDB();
    
    // 檢查用戶是否已存在
    const existingUser = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 建立新用戶
    const result = await db.query(
      'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
      [username, hashedPassword, 0]
    );

    const newUser = result.rows[0];

    res.json({
      success: true,
      message: '註冊成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        isAdmin: newUser.is_admin === 1
      }
    });
  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({ error: '註冊失敗,請稍後再試' });
  }
});

// 用戶登入
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用戶名和密碼不能為空' });
    }

    const db = database.getDB();
    
    // 查找用戶
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 生成 JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1
      }
    });
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ error: '登入失敗,請稍後再試' });
  }
});

// 獲取當前用戶資訊
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const db = database.getDB();
    const result = await db.query(
      'SELECT id, username, is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1
      }
    });
  } catch (error) {
    console.error('獲取用戶資訊錯誤:', error);
    res.status(500).json({ error: '獲取用戶資訊失敗' });
  }
});

// 管理員 - 獲取所有用戶
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = database.getDB();
    const result = await db.query(
      'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      users: result.rows.map(user => ({
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
        createdAt: user.created_at
      }))
    });
  } catch (error) {
    console.error('獲取用戶列表錯誤:', error);
    res.status(500).json({ error: '獲取用戶列表失敗' });
  }
});

// 管理員 - 刪除用戶
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ error: '不能刪除自己的帳號' });
    }

    const db = database.getDB();
    
    // 檢查用戶是否存在
    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 刪除用戶
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      message: '用戶已刪除'
    });
  } catch (error) {
    console.error('刪除用戶錯誤:', error);
    res.status(500).json({ error: '刪除用戶失敗' });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'postgresql' });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({ error: '頁面不存在' });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('伺服器錯誤:', err);
  res.status(500).json({ error: '伺服器內部錯誤' });
});

// 啟動伺服器
const startServer = async () => {
  await initApp();
  
  app.listen(PORT, () => {
    console.log(`🚀 伺服器運行在: http://localhost:${PORT}`);
    console.log(`📊 使用 PostgreSQL 資料庫`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信號,正在關閉伺服器...');
  await database.closeDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信號,正在關閉伺服器...');
  await database.closeDB();
  process.exit(0);
});

startServer().catch(error => {
  console.error('❌ 啟動伺服器失敗:', error);
  process.exit(1);
});
