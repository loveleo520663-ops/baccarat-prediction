// 百家樂預測網站 - 簡化網頁版
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-web-key-2024';

// 資料庫連接
let db = null;

async function initDatabase() {
  try {
    console.log('🌩️ 連接雲端資料庫...');
    
    db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // 測試連接
    await db.query('SELECT NOW()');
    console.log('✅ 資料庫連接成功');

    // 創建用戶表
    await db.query(`
      CREATE TABLE IF NOT EXISTS web_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 創建預設管理員
    const adminExists = await db.query('SELECT * FROM web_users WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query(
        'INSERT INTO web_users (username, password, is_admin) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, true]
      );
      console.log('✅ 管理員帳號已創建：admin / admin123');
    }

  } catch (error) {
    console.error('❌ 資料庫錯誤:', error.message);
    // 不讓應用崩潰，使用記憶體模式
    console.log('🔄 使用記憶體模式...');
  }
}

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 網頁路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
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

// API 路由 - 登入
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!db) {
      return res.status(500).json({ error: '資料庫離線' });
    }

    const result = await db.query('SELECT * FROM web_users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        isAdmin: user.is_admin
      }
    });

  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ error: '系統錯誤' });
  }
});

// API 路由 - 註冊
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!db) {
      return res.status(500).json({ error: '資料庫離線' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.query(
      'INSERT INTO web_users (username, password) VALUES ($1, $2)',
      [username, hashedPassword]
    );

    res.json({ success: true, message: '註冊成功' });

  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: '用戶名已存在' });
    } else {
      console.error('註冊錯誤:', error);
      res.status(500).json({ error: '註冊失敗' });
    }
  }
});

// API 路由 - 獲取用戶列表（管理員）
app.get('/api/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '需要登入' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: '需要管理員權限' });
    }

    if (!db) {
      return res.status(500).json({ error: '資料庫離線' });
    }

    const result = await db.query('SELECT id, username, is_admin, created_at FROM web_users ORDER BY created_at DESC');
    res.json({ users: result.rows });

  } catch (error) {
    console.error('獲取用戶錯誤:', error);
    res.status(500).json({ error: '系統錯誤' });
  }
});

// API 路由 - 刪除用戶（管理員）
app.delete('/api/users/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '需要登入' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: '需要管理員權限' });
    }

    if (!db) {
      return res.status(500).json({ error: '資料庫離線' });
    }

    await db.query('DELETE FROM web_users WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: '用戶已刪除' });

  } catch (error) {
    console.error('刪除用戶錯誤:', error);
    res.status(500).json({ error: '刪除失敗' });
  }
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: db ? 'connected' : 'offline',
    timestamp: new Date().toISOString()
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).send('頁面不存在');
});

// 啟動服務器
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 百家樂預測網站運行於 http://localhost:${PORT}`);
    console.log(`🔑 管理員登入：admin / admin123`);
    console.log(`📱 主頁面：http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error('❌ 服務器啟動失敗:', error);
  // 即使資料庫失敗也嘗試啟動基本服務器
  app.listen(PORT, () => {
    console.log(`🚀 百家樂預測網站運行於 http://localhost:${PORT} (離線模式)`);
  });
});