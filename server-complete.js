// 完整的百家樂預測系統 - 包含資料庫功能
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-web-key-2024';

// 全局變數
let db = null;
let isDbConnected = false;

// 記憶體用戶存儲（備用方案）
let memoryUsers = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password' 的 hash
    is_admin: true,
    created_at: new Date()
  }
];

// 資料庫初始化
async function initDatabase() {
  try {
    console.log('🌩️ 連接資料庫...');
    
    if (process.env.DATABASE_URL) {
      // PostgreSQL 雲端資料庫
      db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // 測試連接
      await db.query('SELECT NOW()');
      console.log('✅ PostgreSQL 雲端資料庫連接成功');

      // 建立用戶表
      await db.query(`
        CREATE TABLE IF NOT EXISTS web_users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 建立預設管理員
      const adminExists = await db.query('SELECT * FROM web_users WHERE username = $1', ['admin']);
      if (adminExists.rows.length === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.query(
          'INSERT INTO web_users (username, password, is_admin) VALUES ($1, $2, $3)',
          ['admin', hashedPassword, true]
        );
        console.log('✅ 管理員帳號已創建：admin / admin123');
      }

      isDbConnected = true;
      console.log('✅ 資料庫初始化完成');

    } else {
      throw new Error('沒有找到 DATABASE_URL');
    }

  } catch (error) {
    console.error('❌ 資料庫連接失敗:', error.message);
    console.log('🔄 使用記憶體模式...');
    isDbConnected = false;
    
    // 確保記憶體中有管理員帳號
    const hashedPassword = await bcrypt.hash('admin123', 10);
    memoryUsers[0].password = hashedPassword;
    console.log('✅ 記憶體模式管理員：admin / admin123');
  }
}

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 網頁路由
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>百家樂預測系統</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .container { background: white; padding: 30px; border-radius: 10px; display: inline-block; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 20px; }
        .status { color: ${isDbConnected ? '#28a745' : '#ffc107'}; font-size: 18px; margin: 20px 0; }
        .links { margin-top: 20px; }
        a { display: inline-block; margin: 10px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; transition: background 0.3s; }
        a:hover { background: #0056b3; }
        .info { margin: 10px 0; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎰 百家樂預測系統</h1>
        <div class="status">
          ${isDbConnected ? '✅ 雲端資料庫已連接' : '⚠️ 記憶體模式運行'}
        </div>
        <div class="info">時間: ${new Date().toLocaleString()}</div>
        <div class="info">管理員帳號：admin / admin123</div>
        <div class="links">
          <a href="/login">用戶登入</a>
          <a href="/game">開始遊戲</a>
          <a href="/admin">管理後台</a>
          <a href="/health">系統狀態</a>
        </div>
      </div>
    </body>
    </html>
  `);
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

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/prediction', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'prediction.html'));
});

// API 路由 - 登入
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔐 登錄請求:', username);

    if (!username || !password) {
      return res.status(400).json({ error: '請輸入用戶名和密碼' });
    }

    let user = null;

    if (isDbConnected && db) {
      // 使用 PostgreSQL
      const result = await db.query('SELECT * FROM web_users WHERE username = $1', [username]);
      user = result.rows[0];
    } else {
      // 使用記憶體模式
      user = memoryUsers.find(u => u.username === username);
    }

    if (!user) {
      console.log('❌ 用戶不存在:', username);
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ 密碼錯誤:', username);
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        isAdmin: user.is_admin 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ 登錄成功:', username);

    res.json({
      success: true,
      message: '登錄成功',
      token: token,
      user: {
        username: user.username,
        isAdmin: user.is_admin,
        role: user.is_admin ? 'admin' : 'user'
      }
    });

  } catch (error) {
    console.error('❌ 登錄錯誤:', error.message);
    res.status(500).json({ error: '系統錯誤，請稍後再試' });
  }
});

// API 路由 - 註冊
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '請輸入用戶名和密碼' });
    }

    console.log('📝 註冊請求:', username);

    // 檢查用戶是否已存在
    let existingUser = null;
    
    if (isDbConnected && db) {
      const result = await db.query('SELECT * FROM web_users WHERE username = $1', [username]);
      existingUser = result.rows[0];
    } else {
      existingUser = memoryUsers.find(u => u.username === username);
    }
    
    if (existingUser) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (isDbConnected && db) {
      // PostgreSQL
      await db.query(
        'INSERT INTO web_users (username, password) VALUES ($1, $2)',
        [username, hashedPassword]
      );
    } else {
      // 記憶體模式
      const newUser = {
        id: memoryUsers.length + 1,
        username,
        password: hashedPassword,
        is_admin: false,
        created_at: new Date()
      };
      memoryUsers.push(newUser);
    }

    console.log('✅ 註冊成功:', username);
    res.json({ success: true, message: '註冊成功' });

  } catch (error) {
    console.error('❌ 註冊錯誤:', error.message);
    res.status(500).json({ error: '註冊失敗，請稍後再試' });
  }
});

// 驗證 token 中間件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登錄' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token 無效' });
    }
    req.user = user;
    next();
  });
};

// API 路由 - 獲取用戶資訊
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    let user = null;

    if (isDbConnected && db) {
      const result = await db.query('SELECT * FROM web_users WHERE username = $1', [req.user.username]);
      user = result.rows[0];
    } else {
      user = memoryUsers.find(u => u.username === req.user.username);
    }
    
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({
      username: user.username,
      isAdmin: user.is_admin,
      role: user.is_admin ? 'admin' : 'user',
      createdAt: user.created_at
    });

  } catch (error) {
    console.error('❌ 獲取用戶資訊錯誤:', error.message);
    res.status(500).json({ error: '系統錯誤' });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: '百家樂預測系統運行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    database: isDbConnected ? 'PostgreSQL Connected' : 'Memory Mode',
    users: isDbConnected ? 'Database' : `Memory (${memoryUsers.length} users)`
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).send(`
    <div style="text-align: center; padding: 50px; font-family: Arial;">
      <h1>404 - 頁面不存在</h1>
      <p>請求的路徑: <strong>${req.path}</strong></p>
      <a href="/" style="color: #007bff; text-decoration: none;">← 回到首頁</a>
    </div>
  `);
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('❌ 服務器錯誤:', err);
  res.status(500).send(`
    <div style="text-align: center; padding: 50px; font-family: Arial;">
      <h1>500 - 服務器錯誤</h1>
      <p>錯誤: ${err.message}</p>
      <a href="/" style="color: #007bff; text-decoration: none;">← 回到首頁</a>
    </div>
  `);
});

// 啟動服務器
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 百家樂預測系統運行於端口 ${PORT}`);
    console.log(`🌐 訪問: http://localhost:${PORT}`);
    console.log(`🔑 管理員帳號: admin / admin123`);
    console.log(`📊 資料庫狀態: ${isDbConnected ? 'PostgreSQL 已連接' : '記憶體模式'}`);
  });
}

startServer().catch(error => {
  console.error('❌ 服務器啟動失敗:', error);
});