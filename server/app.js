const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const adminNewRoutes = require('./routes/admin-new');
const predictionRoutes = require('./routes/prediction');
const licenseRoutes = require('./routes/license');
const memoryDB = require('./memoryDB');
const database = require('./database');

// 簡化的資料庫初始化
const initDatabase = async () => {
  try {
    console.log('🔄 檢查並初始化資料庫...');
    
    const db = database.getDB();
    console.log('🗄️ 使用資料庫類型:', database.dbType);
    
    if (!db) {
      console.error('❌ 無法獲取資料庫連接');
      return;
    }

    // 簡單測試資料庫連接
    try {
      if (database.dbType === 'postgres') {
        // PostgreSQL 初始化
        await db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password TEXT NOT NULL,
            duration_days INTEGER NOT NULL DEFAULT 0,
            expiration_date TIMESTAMP NOT NULL,
            is_active INTEGER DEFAULT 1,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ PostgreSQL 用戶表已確保存在');
        
        // 創建管理員 (如果不存在)
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('password', 10);
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        
        try {
          // 先嘗試插入新管理員
          await db.run(`
            INSERT INTO users (username, password, duration_days, expiration_date, is_active, is_admin, created_at)
            VALUES ($1, $2, $3, $4, 1, 1, $5)
            ON CONFLICT (username) DO NOTHING
          `, [
            'admin',
            hashedPassword, 
            365,
            expirationDate.toISOString(),
            new Date().toISOString()
          ]);
          console.log('✅ 管理員帳號確保存在');
        } catch (adminErr) {
          console.log('ℹ️ 管理員帳號可能已存在，嘗試更新密碼...');
        }
        
        // 強制更新管理員密碼確保一致性
        try {
          await db.run(`UPDATE users SET password = $1 WHERE username = $2`, [hashedPassword, 'admin']);
          console.log('✅ 管理員密碼已更新: admin / password');
        } catch (updateErr) {
          console.log('⚠️ 密碼更新失敗:', updateErr.message);
        }
      } else {
        console.log('ℹ️ SQLite 模式 - 跳過初始化 (使用現有資料)');
      }
      
      // 驗證連接
      if (database.dbType === 'postgres') {
        const result = await db.query('SELECT COUNT(*) as count FROM users');
        const userCount = result.rows[0];
        console.log('✅ 資料庫連接正常，用戶數量:', userCount?.count || 0);
      } else {
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        console.log('✅ 資料庫連接正常，用戶數量:', userCount?.count || 0);
      }
      
    } catch (tableError) {
      console.error('❌ 資料庫表操作失敗:', tableError.message);
      // 不阻止應用啟動
    }
    
  } catch (error) {
    console.error('❌ 資料庫初始化失敗:', error.message);
    // 不阻止應用啟動
  }
};

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
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// 限制請求頻率
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

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-new', adminNewRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/license', licenseRoutes);

// 健康檢查
app.get('/health', async (req, res) => {
  try {
    const db = database.getDB();
    let dbStatus = 'disconnected';
    
    try {
      if (database.dbType === 'postgres') {
        const result = await db.query('SELECT 1 as test');
        dbStatus = 'connected';
      } else {
        const result = await db.get('SELECT 1 as test');
        dbStatus = 'connected';
      }
    } catch (dbErr) {
      dbStatus = 'error: ' + dbErr.message;
    }
    
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      dbType: database.dbType
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 前端路由
app.get('/', (req, res) => {
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

app.get('/admin-new', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/admin-new.html'));
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

app.get('/test-new-admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/test-new-admin.html'));
});

app.get('/prediction', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/prediction.html'));
});

app.get('/game', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/game.html'));
});

// 啟動服務器
const startServer = async () => {
  // 先初始化資料庫
  await initDatabase();
  
  // 再啟動服務器
  app.listen(PORT, () => {
    console.log(`🚀 伺服器運行在埠 ${PORT}`);
    console.log(`🌐 訪問地址: http://localhost:${PORT}`);
    console.log(`👑 管理後台: http://localhost:${PORT}/admin-new`);
    console.log(`🔑 管理員帳號: admin / password`);
  });
};

startServer().catch(err => {
  console.error('❌ 服務器啟動失敗:', err);
  console.log('🔄 嘗試僅啟動 Web 服務器...');
  
  // 即使資料庫初始化失敗，也嘗試啟動基本 Web 服務器
  app.listen(PORT, () => {
    console.log(`🚀 Web 伺服器運行在埠 ${PORT} (資料庫離線模式)`);
    console.log(`🌐 訪問地址: http://localhost:${PORT}`);
  });
});