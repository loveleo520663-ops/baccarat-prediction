const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const database = require('../database');

const router = express.Router();

// 中間件：驗證管理員權限
async function requireAdmin(req, res, next) {
  console.log('🔐 新後台 - 驗證管理員權限');
  
  const token = req.headers.authorization?.split(' ')[1]; // Bearer token
  console.log('🎫 收到 Token:', token ? token.substring(0, 20) + '...' : '無');
  
  if (!token) {
    console.log('❌ 新後台 - 未提供認證 Token');
    return res.status(401).json({ success: false, message: '未提供認證 Token' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-prediction-secret-2024';
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ 新後台 - Token 驗證成功，用戶:', decoded.username);
    
    // 檢查用戶是否為管理員
    const db = database.getDB();
    if (!db) {
      console.log('❌ 新後台 - 資料庫連接失敗');
      return res.status(500).json({ success: false, message: '資料庫連接失敗' });
    }
    
    const user = await db.get('SELECT * FROM users WHERE id = $1 AND is_admin = 1', [decoded.userId]);
    
    if (!user) {
      console.log('❌ 新後台 - 用戶不是管理員');
      return res.status(403).json({ success: false, message: '權限不足' });
    }
    
    console.log('✅ 新後台 - 管理員權限驗證通過');
    req.user = user;
    next();
    
  } catch (error) {
    console.error('❌ 新後台 - Token 驗證失敗:', error.message);
    return res.status(401).json({ success: false, message: 'Token 無效' });
  }
}

// 獲取統計數據
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    console.log('📊 新後台 - 獲取統計數據');
    
    const db = database.getDB();
    if (!db) {
      console.log('❌ 新後台 - 資料庫連接失敗');
      return res.status(500).json({ success: false, message: '資料庫連接失敗' });
    }
    
    console.log('🔄 新後台 - 查詢用戶總數...');
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    console.log('👥 新後台 - 用戶總數:', totalUsers?.count || 0);
    
    console.log('🔄 新後台 - 查詢活躍用戶數...');
    const activeUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    console.log('✅ 新後台 - 活躍用戶數:', activeUsers?.count || 0);
    
    console.log('🔄 新後台 - 查詢過期用戶數...');
    // PostgreSQL 和 SQLite 的日期函數不同
    let expiredQuery;
    if (database.dbType === 'postgres') {
      expiredQuery = 'SELECT COUNT(*) as count FROM users WHERE expiration_date < NOW()';
    } else {
      expiredQuery = 'SELECT COUNT(*) as count FROM users WHERE datetime(expiration_date) < datetime("now")';
    }
    const expiredUsers = await db.get(expiredQuery);
    console.log('⏰ 新後台 - 過期用戶數:', expiredUsers?.count || 0);
    
    // 檢查是否有 licenses 表格
    console.log('🔄 新後台 - 檢查金鑰表格...');
    let licenseCount = 0;
    try {
      if (database.dbType === 'postgres') {
        const tableExists = await db.get("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'licenses')");
        if (tableExists.exists) {
          const licenses = await db.get('SELECT COUNT(*) as count FROM licenses');
          licenseCount = licenses?.count || 0;
        }
      } else {
        const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='licenses'");
        if (tableExists) {
          const licenses = await db.get('SELECT COUNT(*) as count FROM licenses');
          licenseCount = licenses?.count || 0;
        }
      }
    } catch (licenseErr) {
      console.log('⚠️ 新後台 - 金鑰表格不存在或查詢失敗:', licenseErr.message);
    }
    console.log('🔑 新後台 - 金鑰數量:', licenseCount);
    
    const stats = {
      totalUsers: totalUsers?.count || 0,
      activeUsers: activeUsers?.count || 0,
      expiredUsers: expiredUsers?.count || 0,
      totalLicenses: licenseCount
    };
    
    console.log('✅ 新後台 - 統計數據查詢完成:', stats);
    res.json({ success: true, stats });
    
  } catch (error) {
    console.error('❌ 新後台 - 統計數據查詢失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取統計數據失敗',
      error: error.message 
    });
  }
});

// 獲取用戶列表
router.get('/users', requireAdmin, async (req, res) => {
  try {
    console.log('👥 新後台 - 獲取用戶列表');
    
    const db = database.getDB();
    if (!db) {
      console.log('❌ 新後台 - 資料庫連接失敗');
      return res.status(500).json({ success: false, message: '資料庫連接失敗' });
    }
    
    console.log('🔄 新後台 - 查詢所有用戶...');
    const users = await db.query(`
      SELECT 
        id, username, duration_days, expiration_date, 
        is_active, created_at, is_admin
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log('✅ 新後台 - 用戶查詢完成，找到', users?.length || 0, '個用戶');
    if (users && users.length > 0) {
      console.log('👤 新後台 - 第一個用戶示例:', {
        id: users[0].id,
        username: users[0].username,
        is_admin: users[0].is_admin
      });
    }
    
    res.json({ 
      success: true, 
      users: users || []
    });
    
  } catch (error) {
    console.error('❌ 新後台 - 用戶列表查詢失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取用戶列表失敗',
      error: error.message 
    });
  }
});

// 新增用戶
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, durationDays, isAdmin } = req.body;
    
    console.log('➕ 新後台 - 新增用戶:', { username, durationDays, isAdmin });
    
    if (!username || !password || !durationDays) {
      return res.status(400).json({ 
        success: false, 
        message: '用戶名、密碼和有效期為必填項' 
      });
    }
    
    const db = database.getDB();
    
    // 檢查用戶名是否已存在
    console.log('🔄 新後台 - 檢查用戶名是否存在...');
    const existingUser = await db.get('SELECT id FROM users WHERE username = $1', [username]);
    
    if (existingUser) {
      console.log('❌ 新後台 - 用戶名已存在:', username);
      return res.status(400).json({ success: false, message: '用戶名已存在' });
    }
    
    // 加密密碼
    console.log('🔄 新後台 - 加密密碼...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 計算到期日期
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(durationDays));
    
    console.log('🔄 新後台 - 新增用戶到資料庫...');
    const result = await db.run(`
      INSERT INTO users (username, password, duration_days, expiration_date, is_active, is_admin, created_at)
      VALUES ($1, $2, $3, $4, 1, $5, $6)
    `, [
      username,
      hashedPassword,
      parseInt(durationDays),
      expirationDate.toISOString(),
      isAdmin ? 1 : 0,
      new Date().toISOString()
    ]);
    
    console.log('✅ 新後台 - 用戶新增成功, ID:', result.lastID);
    
    res.json({ 
      success: true, 
      message: '用戶新增成功',
      userId: result.lastID
    });
    
  } catch (error) {
    console.error('❌ 新後台 - 新增用戶失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '新增用戶失敗',
      error: error.message 
    });
  }
});

// 更新用戶
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, durationDays, isActive, isAdmin } = req.body;
    
    console.log('✏️ 新後台 - 更新用戶:', { userId, username, durationDays, isActive, isAdmin });
    
    const db = database.getDB();
    
    // 如果修改了有效期，重新計算到期時間
    let updateFields = [];
    let updateValues = [];
    let paramIndex = 1;
    
    if (username !== undefined) {
      updateFields.push(`username = $${paramIndex++}`);
      updateValues.push(username);
    }
    
    if (durationDays !== undefined) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(durationDays));
      
      updateFields.push(`duration_days = $${paramIndex++}`);
      updateValues.push(parseInt(durationDays));
      
      updateFields.push(`expiration_date = $${paramIndex++}`);
      updateValues.push(expirationDate.toISOString());
    }
    
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(isActive ? 1 : 0);
    }
    
    if (isAdmin !== undefined) {
      updateFields.push(`is_admin = $${paramIndex++}`);
      updateValues.push(isAdmin ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: '沒有要更新的欄位' });
    }
    
    updateValues.push(userId);
    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
    
    console.log('🔄 新後台 - 執行更新 SQL:', sql);
    const result = await db.run(sql, updateValues);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    console.log('✅ 新後台 - 用戶更新成功');
    res.json({ success: true, message: '用戶更新成功' });
    
  } catch (error) {
    console.error('❌ 新後台 - 更新用戶失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '更新用戶失敗',
      error: error.message 
    });
  }
});

// 刪除用戶
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    console.log('🗑️ 新後台 - 刪除用戶:', userId);
    
    const db = database.getDB();
    const result = await db.run('DELETE FROM users WHERE id = $1', [userId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    console.log('✅ 新後台 - 用戶刪除成功');
    res.json({ success: true, message: '用戶刪除成功' });
    
  } catch (error) {
    console.error('❌ 新後台 - 刪除用戶失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '刪除用戶失敗',
      error: error.message 
    });
  }
});

// 切換用戶狀態
router.post('/users/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isActive } = req.body;
    
    console.log('🔄 新後台 - 切換用戶狀態:', { userId, isActive });
    
    const db = database.getDB();
    const result = await db.run(`
      UPDATE users SET is_active = $1 WHERE id = $2
    `, [isActive ? 1 : 0, userId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }
    
    console.log('✅ 新後台 - 用戶狀態更新成功');
    res.json({ success: true, message: '用戶狀態更新成功' });
    
  } catch (error) {
    console.error('❌ 新後台 - 切換用戶狀態失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '切換用戶狀態失敗',
      error: error.message 
    });
  }
});

// 獲取金鑰列表
router.get('/licenses', requireAdmin, async (req, res) => {
  try {
    console.log('🔑 新後台 - 獲取金鑰列表');
    
    const db = database.getDB();
    
    // 檢查 licenses 表是否存在
    let tableExists = false;
    try {
      if (database.dbType === 'postgres') {
        const result = await db.get("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'licenses')");
        tableExists = result.exists;
      } else {
        const result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='licenses'");
        tableExists = !!result;
      }
    } catch (checkErr) {
      console.log('⚠️ 新後台 - 檢查 licenses 表失敗:', checkErr.message);
    }
    
    if (!tableExists) {
      console.log('⚠️ 新後台 - licenses 表不存在，返回空列表');
      return res.json({ success: true, licenses: [] });
    }
    
    const licenses = await db.query(`
      SELECT 
        id, key_value as key, duration_days, is_used, 
        used_by_user_id, created_at, used_at
      FROM licenses 
      ORDER BY created_at DESC
    `);
    
    console.log('✅ 新後台 - 金鑰查詢完成，找到', licenses?.length || 0, '個金鑰');
    res.json({ success: true, licenses: licenses || [] });
    
  } catch (error) {
    console.error('❌ 新後台 - 獲取金鑰列表失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取金鑰列表失敗',
      error: error.message 
    });
  }
});

// 生成金鑰
router.post('/licenses', requireAdmin, async (req, res) => {
  try {
    const { durationDays, count = 1 } = req.body;
    
    console.log('🔑 新後台 - 生成金鑰:', { durationDays, count });
    
    if (!durationDays || durationDays <= 0) {
      return res.status(400).json({ success: false, message: '有效天數必須大於0' });
    }
    
    const db = database.getDB();
    const generatedKeys = [];
    
    // 確保 licenses 表存在
    if (database.dbType === 'postgres') {
      await db.run(`
        CREATE TABLE IF NOT EXISTS licenses (
          id SERIAL PRIMARY KEY,
          key_value VARCHAR(255) NOT NULL UNIQUE,
          duration_days INTEGER NOT NULL,
          is_used INTEGER DEFAULT 0,
          used_by_user_id INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at TIMESTAMP
        )
      `);
    } else {
      await db.run(`
        CREATE TABLE IF NOT EXISTS licenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_value TEXT NOT NULL UNIQUE,
          duration_days INTEGER NOT NULL,
          is_used INTEGER DEFAULT 0,
          used_by_user_id INTEGER REFERENCES users(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          used_at DATETIME
        )
      `);
    }
    
    for (let i = 0; i < count; i++) {
      const licenseKey = crypto.randomBytes(16).toString('hex').toUpperCase();
      
      await db.run(`
        INSERT INTO licenses (key_value, duration_days, created_at)
        VALUES ($1, $2, $3)
      `, [licenseKey, parseInt(durationDays), new Date().toISOString()]);
      
      generatedKeys.push(licenseKey);
    }
    
    console.log('✅ 新後台 - 金鑰生成成功:', generatedKeys);
    res.json({ 
      success: true, 
      message: `成功生成 ${count} 個金鑰`,
      keys: generatedKeys
    });
    
  } catch (error) {
    console.error('❌ 新後台 - 生成金鑰失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '生成金鑰失敗',
      error: error.message 
    });
  }
});

// 刪除金鑰
router.delete('/licenses/:key', requireAdmin, async (req, res) => {
  try {
    const licenseKey = req.params.key;
    
    console.log('🗑️ 新後台 - 刪除金鑰:', licenseKey);
    
    const db = database.getDB();
    const result = await db.run('DELETE FROM licenses WHERE key_value = $1', [licenseKey]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '金鑰不存在' });
    }
    
    console.log('✅ 新後台 - 金鑰刪除成功');
    res.json({ success: true, message: '金鑰刪除成功' });
    
  } catch (error) {
    console.error('❌ 新後台 - 刪除金鑰失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '刪除金鑰失敗',
      error: error.message 
    });
  }
});

module.exports = router;