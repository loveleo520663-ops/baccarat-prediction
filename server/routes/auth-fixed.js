const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-secret-key-2024';

// 通用資料庫查詢函數
async function dbQuery(sql, params = []) {
  const currentDb = database.getDB();
  if (!currentDb) {
    throw new Error('資料庫連接不存在');
  }
  
  return new Promise((resolve, reject) => {
    if (database.dbType === 'postgres') {
      currentDb.query(sql, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.rows);
        }
      });
    } else {
      // SQLite
      if (sql.includes('SELECT') && !sql.includes('COUNT')) {
        currentDb.get(sql, params, (err, result) => {
          if (err) reject(err);
          else resolve(result ? [result] : []);
        });
      } else {
        currentDb.all(sql, params, (err, result) => {
          if (err) reject(err);
          else resolve(result || []);
        });
      }
    }
  });
}

// 通用資料庫執行函數
async function dbRun(sql, params = []) {
  const currentDb = database.getDB();
  if (!currentDb) {
    throw new Error('資料庫連接不存在');
  }
  
  return new Promise((resolve, reject) => {
    if (database.dbType === 'postgres') {
      currentDb.query(sql, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    } else {
      currentDb.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    }
  });
}

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
        SELECT id, username, password, is_active, expiration_date, role
        FROM users 
        WHERE username = $1
      `;
      params = [username];
    } else {
      sql = `
        SELECT id, username, password, is_active, expiration_date, role
        FROM users 
        WHERE username = ?
      `;
      params = [username];
    }
    
    const users = await dbQuery(sql, params);
    const user = users[0];

    if (!user) {
      console.log('❌ 用戶不存在:', username);
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    console.log('✅ 用戶存在:', username);

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ 密碼錯誤:', username);
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    console.log('✅ 密碼驗證通過:', username);

    // 檢查帳號狀態
    if (!user.is_active) {
      console.log('❌ 帳號已停用:', username);
      return res.status(403).json({ error: '帳號已停用，請聯繫管理員' });
    }

    // 檢查許可證是否到期
    const now = new Date();
    const expirationDate = new Date(user.expiration_date);
    if (expirationDate < now) {
      console.log('❌ 許可證已到期:', username, expirationDate);
      return res.status(403).json({ error: '許可證已到期，請聯繫管理員續期' });
    }

    console.log('✅ 許可證有效:', username, expirationDate);

    // 生成 JWT token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role || 'user'
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log('✅ 登錄成功:', username);

    // 返回用戶信息和token
    res.json({
      success: true,
      message: '登錄成功',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'user',
        license_expiry: user.expiration_date
      }
    });

  } catch (error) {
    console.error('❌ 登錄錯誤:', error);
    res.status(500).json({ 
      error: '登錄失敗', 
      details: error.message 
    });
  }
});

// 註冊
router.post('/register', async (req, res) => {
  try {
    const { username, password, licenseKey } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '請輸入用戶名和密碼' });
    }

    console.log('📝 註冊請求:', username);

    // 檢查資料庫連接
    const currentDb = database.getDB();
    if (!currentDb) {
      return res.status(500).json({ error: '資料庫連接失敗' });
    }

    // 檢查用戶名是否已存在
    let checkSql, checkParams;
    if (database.dbType === 'postgres') {
      checkSql = 'SELECT id FROM users WHERE username = $1';
      checkParams = [username];
    } else {
      checkSql = 'SELECT id FROM users WHERE username = ?';
      checkParams = [username];
    }
    
    const existingUsers = await dbQuery(checkSql, checkParams);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 驗證許可證金鑰 (暫時跳過，允許註冊)
    console.log('🔍 許可證驗證:', licenseKey);

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 計算許可證到期時間 (預設30天)
    const licenseExpiry = new Date();
    licenseExpiry.setDate(licenseExpiry.getDate() + 30);

    // 插入新用戶
    let insertSql, insertParams;
    if (database.dbType === 'postgres') {
      insertSql = `
        INSERT INTO users (username, password, duration_days, expiration_date, is_active, role)
        VALUES ($1, $2, $3, $4, true, 'user')
      `;
      insertParams = [username, hashedPassword, 30, licenseExpiry];
    } else {
      insertSql = `
        INSERT INTO users (username, password, duration_days, expiration_date, is_active, role)
        VALUES (?, ?, ?, ?, 1, 'user')
      `;
      insertParams = [username, hashedPassword, 30, licenseExpiry.toISOString()];
    }
    
    await dbRun(insertSql, insertParams);

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
    console.error('❌ 註冊錯誤:', error);
    res.status(500).json({ 
      error: '註冊失敗', 
      details: error.message 
    });
  }
});

// JWT 驗證中間件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供認證token' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Token 驗證失敗:', err.message);
      return res.status(403).json({ error: 'Token無效或已過期' });
    }
    req.user = user;
    next();
  });
}

// 獲取用戶信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const currentDb = database.getDB();
    if (!currentDb) {
      return res.status(500).json({ error: '資料庫連接失敗' });
    }

    let sql, params;
    if (database.dbType === 'postgres') {
      sql = `
        SELECT id, username, is_active, expiration_date, role
        FROM users WHERE username = $1
      `;
      params = [req.user.username];
    } else {
      sql = `
        SELECT id, username, is_active, expiration_date, role
        FROM users WHERE username = ?
      `;
      params = [req.user.username];
    }

    const users = await dbQuery(sql, params);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'user',
        license_expiry: user.expiration_date,
        is_active: user.is_active
      }
    });

  } catch (error) {
    console.error('❌ 獲取用戶信息錯誤:', error);
    res.status(500).json({ 
      error: '獲取用戶信息失敗', 
      details: error.message 
    });
  }
});

module.exports = router;