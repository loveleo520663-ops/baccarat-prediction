const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../database');
const db = database.getDB();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-secret-key-2024';

// 登入
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '請輸入用戶名和密碼' });
    }

    console.log('🔐 登錄請求:', username);
    
    // 檢查資料庫連接
    const currentDb = database.getDB();
    if (!currentDb) {
      console.error('❌ 資料庫連接不存在');
      return res.status(500).json({ error: '資料庫連接失敗' });
    }
    
    console.log('✅ 資料庫連接正常');

    // 從資料庫查找用戶
    let sql, params;
    if (database.dbType === 'postgres') {
      sql = `
        SELECT id, username, password, is_active, expiration_date
        FROM users 
        WHERE username = $1
      `;
      params = [username];
    } else {
      sql = `
        SELECT id, username, password, is_active, expiration_date
        FROM users 
        WHERE username = ?
      `;
      params = [username];
    }
    
    const user = await currentDb.get(sql, params);

    if (!user) {
      console.log('❌ 用戶不存在:', username);
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    if (!user.is_active) {
      console.log('❌ 帳號被停用:', username);
      return res.status(401).json({ error: '帳號已被停用' });
    }
      console.log('🔍 開始驗證密碼 for user:', username);
      console.log('🔍 用戶資料:', { id: user.id, username: user.username, is_active: user.is_active });
      console.log('🔍 密碼 hash:', user.password ? user.password.substring(0, 10) + '...' : 'null');
      
    // 驗證密碼
    const isValid = await bcrypt.compare(password, user.password);
    console.log('🔍 密碼驗證結果:', isValid);
    
    if (!isValid) {
      console.log('❌ 密碼錯誤:', username);
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 決定用戶角色 - admin 用戶有管理員權限
    const role = username === 'admin' ? 'admin' : 'user';
    console.log('🔍 用戶角色:', role);

    // 檢查許可證（管理員不需要檢查）
    if (role !== 'admin' && user.expiration_date && new Date(user.expiration_date) < new Date()) {
      console.log('❌ 許可證過期:', username, user.expiration_date);
      return res.status(403).json({ error: '許可證已過期，請聯繫管理員' });
    }

    console.log('✅ 登錄驗證通過:', username, '角色:', role);

    // 生成 JWT
    console.log('🔍 生成 JWT token...');
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ JWT token 生成成功');

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: role,
        license_expiry: user.expiration_date
      }
    });

  } catch (error) {
    console.error('❌ 登錄處理錯誤:', error);
    console.error('❌ 錯誤堆疊:', error.stack);
    res.status(500).json({ 
      error: '伺服器內部錯誤',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 註冊
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, licenseKey } = req.body;

    if (!username || !password || !licenseKey) {
      return res.status(400).json({ error: '用戶名、密碼和許可證金鑰都是必須的' });
    }

    const currentDb = database.getDB();
    if (!currentDb) {
      return res.status(500).json({ error: '資料庫連接失敗' });
    }

    // 檢查用戶是否已存在
    let checkSql, checkParams;
    if (database.dbType === 'postgres') {
      checkSql = 'SELECT id FROM users WHERE username = $1';
      checkParams = [username];
    } else {
      checkSql = 'SELECT id FROM users WHERE username = ?';
      checkParams = [username];
    }
    
    const existingUser = await currentDb.get(checkSql, checkParams);
    if (existingUser) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 驗證許可證金鑰 (暫時跳過，允許註冊)
    console.log('🔍 許可證驗證:', licenseKey);

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 計算許可證到期時間 (預設30天)
    const licenseExpiry = new Date();
    licenseExpiry.setDate(licenseExpiry.getDate() + 30);

    // 創建用戶
    let insertSql, insertParams;
    if (database.dbType === 'postgres') {
      insertSql = `
        INSERT INTO users (username, password, duration_days, expiration_date, is_active, is_admin)
        VALUES ($1, $2, $3, $4, 1, 0)
      `;
      insertParams = [username, hashedPassword, 30, licenseExpiry.toISOString()];
    } else {
      insertSql = `
        INSERT INTO users (username, password, duration_days, expiration_date, is_active, is_admin)
        VALUES (?, ?, ?, ?, 1, 0)
      `;
      insertParams = [username, hashedPassword, 30, licenseExpiry.toISOString()];
    }
    
    await currentDb.run(insertSql, insertParams);

    console.log('✅ 新用戶註冊成功:', username);

    res.json({
      success: true,
      message: '註冊成功',
      user: {
        username: username,
        role: 'user',
        license_expiry: licenseExpiry.toISOString()
      }
    });
  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 驗證 Token 中間件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登入' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token 無效' });
    }
    req.user = user;
    next();
  });
};

// 獲取用戶信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const currentDb = database.getDB();
    if (!currentDb) {
      return res.status(500).json({ error: '資料庫連接失敗' });
    }

    const user = await currentDb.get(`
      SELECT id, username, is_active, expiration_date, is_admin
      FROM users WHERE username = ?
    `, [req.user.username]);

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    const role = user.is_admin ? 'admin' : 'user';

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: role,
        license_expiry: user.expiration_date
      }
    });
  } catch (error) {
    console.error('獲取用戶信息錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 驗證許可證金鑰
router.post('/verify-license', (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ error: '請輸入許可證金鑰' });
  }

  const license = memoryDB.findLicenseKey(licenseKey);
  
  if (!license) {
    return res.status(400).json({ error: '無效的許可證金鑰' });
  }

  if (license.isUsed) {
    return res.status(400).json({ error: '許可證金鑰已被使用' });
  }

  res.json({
    success: true,
    message: '許可證金鑰有效',
    durationDays: license.durationDays
  });
});

module.exports = router;