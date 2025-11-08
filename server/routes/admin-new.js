const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const database = require('../database');

const router = express.Router();

// 中間件：驗證管理員權限
function requireAdmin(req, res, next) {
  // 這裡可以添加 JWT 驗證邏輯
  // 暫時簡化處理
  next();
}

// 獲取統計數據
router.get('/stats', requireAdmin, (req, res) => {
  console.log('📊 新後台 - 獲取統計數據');
  
  const db = database.getDB();
  console.log('🔍 資料庫連接狀態:', db ? '正常' : '失敗');
  
  if (!db) {
    console.error('❌ 新後台 - 資料庫連接失敗');
    return res.status(500).json({ success: false, message: '資料庫連接失敗' });
  }

  const stats = {};

  // 使用 Promise 來處理多個查詢
  const queries = [
    new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (err) reject(err);
        else {
          stats.totalUsers = result.count;
          resolve();
        }
      });
    }),
    
    new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM users 
        WHERE is_active = 1 AND (expiration_date > datetime('now') OR expiration_date IS NULL)
      `, (err, result) => {
        if (err) reject(err);
        else {
          stats.activeUsers = result.count;
          resolve();
        }
      });
    }),
    
    new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM users 
        WHERE expiration_date < datetime('now') AND expiration_date IS NOT NULL
      `, (err, result) => {
        if (err) reject(err);
        else {
          stats.expiredUsers = result.count;
          resolve();
        }
      });
    }),
    
    new Promise((resolve, reject) => {
      // 假設有 licenses 表，如果沒有則返回 0
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='licenses'", (err, result) => {
        if (err || !result) {
          stats.totalLicenses = 0;
          resolve();
        } else {
          db.get('SELECT COUNT(*) as count FROM licenses', (err, licenseResult) => {
            if (err) {
              stats.totalLicenses = 0;
            } else {
              stats.totalLicenses = licenseResult.count;
            }
            resolve();
          });
        }
      });
    })
  ];

  Promise.all(queries)
    .then(() => {
      console.log('✅ 統計數據獲取成功:', stats);
      res.json({
        success: true,
        data: stats
      });
    })
    .catch(error => {
      console.error('❌ 統計數據獲取失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取統計數據失敗',
        error: error.message
      });
    });
});

// 獲取所有用戶
router.get('/users', requireAdmin, (req, res) => {
  console.log('👥 新後台 - 獲取用戶列表');
  
  const db = database.getDB();
  console.log('🔍 用戶查詢 - 資料庫連接狀態:', db ? '正常' : '失敗');
  
  if (!db) {
    console.error('❌ 新後台 - 用戶查詢資料庫連接失敗');
    return res.status(500).json({ success: false, message: '資料庫連接失敗' });
  }

  db.all(`
    SELECT 
      id, 
      username, 
      duration_days,
      expiration_date,
      is_active,
      datetime(expiration_date) as formatted_expiration,
      CASE 
        WHEN expiration_date IS NULL THEN 1
        WHEN expiration_date > datetime('now') THEN 1
        ELSE 0
      END as is_valid
    FROM users 
    ORDER BY id DESC
  `, (err, users) => {
    if (err) {
      console.error('❌ 新後台 - 獲取用戶失敗:', err);
      return res.status(500).json({
        success: false,
        message: '獲取用戶數據失敗',
        error: err.message
      });
    }

    console.log(`✅ 新後台 - 成功獲取 ${users.length} 個用戶`);
    if (users.length > 0) {
      console.log('📋 用戶列表預覽:', users.map(u => ({ id: u.id, username: u.username, is_active: u.is_active })));
    }
    
    res.json({
      success: true,
      users: users,
      count: users.length
    });
  });
});

// 創建新用戶
router.post('/users', requireAdmin, async (req, res) => {
  const { username, password, duration_days } = req.body;
  
  console.log('👤 創建新用戶:', { username, duration_days });
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '用戶名和密碼不能為空'
    });
  }

  const db = database.getDB();
  if (!db) {
    return res.status(500).json({ success: false, message: '資料庫連接失敗' });
  }

  try {
    // 檢查用戶名是否已存在
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE username = ?', [username], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '用戶名已存在'
      });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 計算到期時間
    let expirationDate = null;
    if (duration_days > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + duration_days);
      expirationDate = expDate.toISOString();
    }

    // 創建用戶
    db.run(`
      INSERT INTO users (username, password, duration_days, expiration_date, is_active)
      VALUES (?, ?, ?, ?, 1)
    `, [username, hashedPassword, duration_days, expirationDate], function(err) {
      if (err) {
        console.error('❌ 創建用戶失敗:', err);
        return res.status(500).json({
          success: false,
          message: '創建用戶失敗',
          error: err.message
        });
      }

      console.log('✅ 用戶創建成功:', username);
      res.status(201).json({
        success: true,
        message: '用戶創建成功',
        user: {
          id: this.lastID,
          username: username,
          duration_days: duration_days,
          expiration_date: expirationDate
        }
      });
    });

  } catch (error) {
    console.error('❌ 創建用戶過程中發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建用戶失敗',
      error: error.message
    });
  }
});

// 更新用戶
router.put('/users/:id', requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { duration_days } = req.body;
  
  console.log('✏️ 更新用戶:', { userId, duration_days });

  const db = database.getDB();
  if (!db) {
    return res.status(500).json({ success: false, message: '資料庫連接失敗' });
  }

  try {
    // 計算新的到期時間
    let expirationDate = null;
    if (duration_days > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + duration_days);
      expirationDate = expDate.toISOString();
    }

    db.run(`
      UPDATE users 
      SET duration_days = ?, expiration_date = ?
      WHERE id = ?
    `, [duration_days, expirationDate, userId], function(err) {
      if (err) {
        console.error('❌ 更新用戶失敗:', err);
        return res.status(500).json({
          success: false,
          message: '更新用戶失敗',
          error: err.message
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: '找不到指定用戶'
        });
      }

      console.log('✅ 用戶更新成功');
      res.json({
        success: true,
        message: '用戶更新成功'
      });
    });

  } catch (error) {
    console.error('❌ 更新用戶過程中發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新用戶失敗',
      error: error.message
    });
  }
});

// 刪除用戶
router.delete('/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  console.log('🗑️ 刪除用戶:', userId);

  const db = database.getDB();
  if (!db) {
    return res.status(500).json({ success: false, message: '資料庫連接失敗' });
  }

  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      console.error('❌ 刪除用戶失敗:', err);
      return res.status(500).json({
        success: false,
        message: '刪除用戶失敗',
        error: err.message
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定用戶'
      });
    }

    console.log('✅ 用戶刪除成功');
    res.json({
      success: true,
      message: '用戶刪除成功'
    });
  });
});

// 切換用戶狀態
router.put('/users/:id/status', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { is_active } = req.body;
  
  console.log('🔄 切換用戶狀態:', { userId, is_active });

  const db = database.getDB();
  if (!db) {
    return res.status(500).json({ success: false, message: '資料庫連接失敗' });
  }

  db.run(`
    UPDATE users 
    SET is_active = ?
    WHERE id = ?
  `, [is_active ? 1 : 0, userId], function(err) {
    if (err) {
      console.error('❌ 切換用戶狀態失敗:', err);
      return res.status(500).json({
        success: false,
        message: '切換用戶狀態失敗',
        error: err.message
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定用戶'
      });
    }

    console.log('✅ 用戶狀態切換成功');
    res.json({
      success: true,
      message: `用戶已${is_active ? '啟用' : '停用'}`
    });
  });
});

// 金鑰管理相關路由
// 創建 licenses 表（如果不存在）
function ensureLicensesTable(db) {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        duration_days INTEGER DEFAULT 30,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used BOOLEAN DEFAULT FALSE,
        used_by_user_id INTEGER,
        FOREIGN KEY (used_by_user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// 獲取所有金鑰
router.get('/licenses', requireAdmin, async (req, res) => {
  console.log('🔑 獲取金鑰列表');
  
  const db = database.getDB();
  if (!db) {
    return res.status(500).json({ success: false, message: '資料庫連接失敗' });
  }

  try {
    // 確保 licenses 表存在
    await ensureLicensesTable(db);

    db.all(`
      SELECT 
        l.*,
        u.username as used_by_username
      FROM licenses l
      LEFT JOIN users u ON l.used_by_user_id = u.id
      ORDER BY l.created_at DESC
    `, (err, licenses) => {
      if (err) {
        console.error('❌ 獲取金鑰失敗:', err);
        return res.status(500).json({
          success: false,
          message: '獲取金鑰數據失敗',
          error: err.message
        });
      }

      console.log(`✅ 成功獲取 ${licenses.length} 個金鑰`);
      res.json({
        success: true,
        licenses: licenses,
        count: licenses.length
      });
    });

  } catch (error) {
    console.error('❌ 金鑰操作失敗:', error);
    res.status(500).json({
      success: false,
      message: '金鑰操作失敗',
      error: error.message
    });
  }
});

// 生成新金鑰
router.post('/licenses', requireAdmin, async (req, res) => {
  const { duration_days = 30 } = req.body;
  
  console.log('🆕 生成新金鑰:', { duration_days });

  const db = database.getDB();
  if (!db) {
    return res.status(500).json({ success: false, message: '資料庫連接失敗' });
  }

  try {
    // 確保 licenses 表存在
    await ensureLicensesTable(db);

    // 生成唯一金鑰
    const licenseKey = crypto.randomBytes(16).toString('hex').toUpperCase();

    db.run(`
      INSERT INTO licenses (key, duration_days)
      VALUES (?, ?)
    `, [licenseKey, duration_days], function(err) {
      if (err) {
        console.error('❌ 生成金鑰失敗:', err);
        return res.status(500).json({
          success: false,
          message: '生成金鑰失敗',
          error: err.message
        });
      }

      console.log('✅ 金鑰生成成功:', licenseKey);
      res.status(201).json({
        success: true,
        message: '金鑰生成成功',
        license: {
          id: this.lastID,
          key: licenseKey,
          duration_days: duration_days
        }
      });
    });

  } catch (error) {
    console.error('❌ 生成金鑰過程中發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '生成金鑰失敗',
      error: error.message
    });
  }
});

// 刪除金鑰
router.delete('/licenses/:key', requireAdmin, async (req, res) => {
  const licenseKey = req.params.key;
  
  console.log('🗑️ 刪除金鑰:', licenseKey);

  const db = database.getDB();
  if (!db) {
    return res.status(500).json({ success: false, message: '資料庫連接失敗' });
  }

  try {
    await ensureLicensesTable(db);

    db.run('DELETE FROM licenses WHERE key = ?', [licenseKey], function(err) {
      if (err) {
        console.error('❌ 刪除金鑰失敗:', err);
        return res.status(500).json({
          success: false,
          message: '刪除金鑰失敗',
          error: err.message
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: '找不到指定金鑰'
        });
      }

      console.log('✅ 金鑰刪除成功');
      res.json({
        success: true,
        message: '金鑰刪除成功'
      });
    });

  } catch (error) {
    console.error('❌ 刪除金鑰過程中發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除金鑰失敗',
      error: error.message
    });
  }
});

module.exports = router;