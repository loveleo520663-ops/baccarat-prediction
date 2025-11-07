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

// 確保資料庫存在
const initDatabase = async () => {
  try {
    console.log('🔄 檢查並初始化資料庫...');
    const fs = require('fs');
    const dbDir = path.join(__dirname, '../database');
    const dbPath = path.join(dbDir, 'baccarat_new.db');
    
    // 確保 database 目錄存在
    if (!fs.existsSync(dbDir)) {
      console.log('📁 創建 database 目錄...');
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // 如果資料庫不存在，創建它
    if (!fs.existsSync(dbPath)) {
      console.log('📝 資料庫不存在，正在創建...');
      const initDatabaseScript = require('./newDatabase');
      await initDatabaseScript();
      console.log('✅ 資料庫創建完成');
    } else {
      console.log('✅ 資料庫已存在');
    }

    // 測試資料庫連接和表是否存在
    const database = require('./database');
    let db = database.getDB();
    
    // 檢查資料庫是否存在
    if (!db) {
      console.log('🔄 資料庫連接不存在，嘗試重新連接...');
      db = database.reconnect();
    }
    
    await new Promise(async (resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', async (err, result) => {
        if (err) {
          console.error('❌ 用戶表不存在，需要重新初始化資料庫');
          console.log('🔄 正在重新創建資料庫...');
          
          try {
            const initDatabaseScript = require('./newDatabase');
            await initDatabaseScript();
            console.log('✅ 資料庫重新創建完成');
            
            // 重新連接資料庫
            console.log('🔄 重新連接資料庫...');
            db = database.reconnect();
            
            // 重新測試
            db.get('SELECT COUNT(*) as count FROM users', (err2, result2) => {
              if (err2) {
                reject(err2);
              } else {
                console.log('✅ 資料庫連接正常，用戶數量:', result2.count);
                resolve();
              }
            });
          } catch (initError) {
            console.error('❌ 資料庫重新初始化失敗:', initError);
            reject(initError);
          }
        } else {
          console.log('✅ 資料庫連接正常，用戶數量:', result.count);
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('❌ 資料庫初始化失敗:', error);
    // 不要中斷應用啟動，但記錄錯誤
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
app.use('/api/admin-new', adminNewRoutes); // 新的管理路由，暫時不需要認證
app.use('/api/prediction', authenticateToken, predictionRoutes);
app.use('/api/license', licenseRoutes);

// 健康檢查路由
app.get('/health', async (req, res) => {
  try {
    const database = require('./database');
    const db = database.getDB();
    
    // 測試資料庫連接
    const dbStatus = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (err) {
          resolve({ status: 'error', error: err.message });
        } else {
          resolve({ status: 'ok', userCount: result.count });
        }
      });
    });

    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      routes: {
        adminUsers: '/api/admin/users',
        adminStats: '/api/admin/stats',
        adminLicense: '/api/admin/license/keys',
        testUsers: '/test/admin/users',
        testStats: '/test/admin/stats'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 強制重建資料庫端點（緊急修復用）
app.post('/force-rebuild-db', async (req, res) => {
  try {
    console.log('🚨 收到強制重建資料庫請求');
    
    // 使用新的創建資料庫函數
    const { createDatabaseNow } = require('./createDB');
    const userCount = await createDatabaseNow();
    
    console.log('✅ 資料庫重建完成');
    
    // 重新連接資料庫
    console.log('🔄 重新連接資料庫模塊...');
    const database = require('./database');
    if (database.reconnect) {
      database.reconnect();
    }
    
    res.json({
      success: true,
      message: '資料庫重建成功',
      userCount: userCount,
      timestamp: new Date().toISOString(),
      details: '資料庫已從零開始創建並重新連接'
    });
    
  } catch (error) {
    console.error('❌ 強制重建資料庫失敗:', error);
    res.status(500).json({
      success: false,
      error: '資料庫重建失敗',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 重設管理員密碼（緊急使用）
app.post('/reset-admin-password', async (req, res) => {
  try {
    console.log('🔧 收到管理員密碼重設請求');
    
    const database = require('./database');
    const bcrypt = require('bcryptjs');
    const db = database.getDB();
    
    if (!db) {
      return res.status(500).json({
        success: false,
        message: '資料庫連接失敗'
      });
    }
    
    // 加密新密碼 "password"
    const hashedPassword = await bcrypt.hash('password', 10);
    console.log('🔐 正在重設 admin 密碼...');
    
    db.run(`
      UPDATE users 
      SET password = ? 
      WHERE username = 'admin'
    `, [hashedPassword], function(err) {
      if (err) {
        console.error('❌ 重設密碼失敗:', err);
        return res.status(500).json({
          success: false,
          message: '重設密碼失敗',
          error: err.message
        });
      }
      
      console.log('✅ admin 密碼已重設');
      res.json({
        success: true,
        message: 'admin 密碼已重設為: password',
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('❌ 密碼重設過程中發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '密碼重設失敗',
      error: error.message
    });
  }
});

// 測試認證路由的資料庫連接
app.get('/test-auth-db', (req, res) => {
  const database = require('./database');
  const db = database.getDB();
  
  console.log('🧪 測試認證路由資料庫連接');
  
  db.get(`
    SELECT id, username, password, is_active, expiration_date
    FROM users 
    WHERE username = ?
  `, ['admin'], (err, user) => {
    if (err) {
      console.error('❌ 認證路由資料庫錯誤:', err);
      return res.status(500).json({ 
        error: '資料庫查詢失敗', 
        details: err.message,
        code: err.code 
      });
    }

    if (!user) {
      return res.json({ 
        success: false,
        message: 'admin 用戶不存在',
        found: false
      });
    }

    res.json({
      success: true,
      message: 'admin 用戶查找成功',
      user: {
        id: user.id,
        username: user.username,
        is_active: user.is_active,
        expiration_date: user.expiration_date,
        hasPassword: !!user.password
      }
    });
  });
});

// 檢查資料庫文件是否存在
app.get('/check-db-file', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const dbPath = path.join(__dirname, '../database/baccarat_new.db');
  const dbDir = path.join(__dirname, '../database');
  
  const fileExists = fs.existsSync(dbPath);
  const dirExists = fs.existsSync(dbDir);
  
  let fileSize = 0;
  if (fileExists) {
    const stats = fs.statSync(dbPath);
    fileSize = stats.size;
  }
  
  res.json({
    dbPath: dbPath,
    directoryExists: dirExists,
    fileExists: fileExists,
    fileSize: fileSize,
    timestamp: new Date().toISOString()
  });
});

// 測試路由（無需認證）- 用於診斷
app.get('/test/admin/users', (req, res) => {
  const database = require('./database');
  const db = database.getDB();
  console.log('🧪 測試用戶 API 被調用');
  
  db.all(`
    SELECT id, username, duration_days, expiration_date, is_active, created_at
    FROM users 
    ORDER BY created_at DESC
  `, (err, users) => {
    if (err) {
      console.error('❌ 測試獲取用戶錯誤:', err);
      return res.status(500).json({ error: '獲取用戶失敗', details: err.message });
    }
    console.log('✅ 測試用戶 API 成功，用戶數量:', users.length);
    res.json({ success: true, users });
  });
});

app.get('/test/admin/stats', (req, res) => {
  const database = require('./database');
  const db = database.getDB();
  console.log('🧪 測試統計 API 被調用');
  
  db.serialize(() => {
    let stats = {};
    db.get('SELECT COUNT(*) as total FROM users', (err, result) => {
      if (err) {
        console.error('❌ 測試統計錯誤:', err);
        return res.status(500).json({ error: '獲取統計失敗', details: err.message });
      }
      stats.totalUsers = result.total;

      db.get('SELECT COUNT(*) as active FROM users WHERE is_active = 1', (err, result) => {
        if (err) {
          console.error('❌ 測試統計錯誤:', err);
          return res.status(500).json({ error: '獲取統計失敗', details: err.message });
        }
        stats.activeUsers = result.active;

        db.get('SELECT COUNT(*) as expired FROM users WHERE datetime(expiration_date) < datetime("now")', (err, result) => {
          if (err) {
            console.error('❌ 測試統計錯誤:', err);
            return res.status(500).json({ error: '獲取統計失敗', details: err.message });
          }
          stats.expiredUsers = result.expired;
          console.log('✅ 測試統計 API 成功:', stats);
          res.json({ success: true, stats });
        });
      });
    });
  });
});

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

app.get('/admin-test', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/admin-test.html'));
});

// 新的管理後台
app.get('/admin-new', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/admin-new.html'));
});

app.get('/admin-diagnosis', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/admin-diagnosis.html'));
});

app.get('/quick-test', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/quick-test.html'));
});

app.get('/emergency-fix', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', 'false');
  res.sendFile(path.join(__dirname, '../views/emergency-fix.html'));
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

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 伺服器運行在埠 ${PORT}`);
  
  // 初始化資料庫
  await initDatabase();
  
  console.log('✅ 應用啟動完成');
  console.log('�️ SQLite 資料庫已初始化');
  console.log('� 管理員帳號：admin / password (擁有後台權限)');
  console.log('🔑 測試帳號：test001 / test123');
  console.log('🎉 部署成功！');
});

// 錯誤處理
server.on('error', (err) => {
  console.error('伺服器啟動失敗:', err);
  process.exit(1);
});

module.exports = app;