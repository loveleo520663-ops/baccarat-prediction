const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// 獲取所有用戶 (PostgreSQL版本)
router.get('/users', (req, res) => {
  console.log('🔍 管理員 API - 獲取用戶列表請求');
  
  // 檢查資料庫連接
  if (!req.app.locals.db) {
    console.error('❌ 資料庫連接失敗');
    return res.status(500).json({ error: '資料庫連接失敗', details: '資料庫未初始化' });
  }

  const db = req.app.locals.db;
  
  db.query(`
    SELECT 
      id, 
      username, 
      duration_days, 
      expiration_date,
      expiration_date as license_expiry,
      username as license_key,
      is_active, 
      created_at,
      NULL as email,
      NULL as last_login
    FROM users 
    ORDER BY created_at DESC
  `, (err, result) => {
    if (err) {
      console.error('❌ 獲取用戶列表錯誤:', err);
      return res.status(500).json({ 
        error: '獲取用戶失敗', 
        details: err.message 
      });
    }

    console.log('✅ 成功獲取用戶列表');
    res.json(result.rows);
  });
});

// 創建新用戶 (PostgreSQL版本)
router.post('/create-user', async (req, res) => {
  console.log('👤 管理員 API - 創建用戶請求');
  
  const { username, password, duration } = req.body;
  
  if (!username || !password || !duration) {
    console.log('❌ 缺少必要參數');
    return res.status(400).json({ error: '缺少必要參數' });
  }

  const db = req.app.locals.db;

  try {
    // 檢查用戶是否存在
    const existingUser = await new Promise((resolve, reject) => {
      db.query('SELECT id FROM users WHERE username = $1', [username], (err, result) => {
        if (err) reject(err);
        else resolve(result.rows[0]);
      });
    });

    if (existingUser) {
      console.log('❌ 用戶名已存在:', username);
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(duration));

    // 插入新用戶
    db.query(`
      INSERT INTO users (username, password, role, is_active, duration_days, expiration_date, created_at) 
      VALUES ($1, $2, 'user', true, $3, $4, NOW())
    `, [username, hashedPassword, duration, expirationDate], (err, result) => {
      if (err) {
        console.error('❌ 創建用戶錯誤:', err);
        return res.status(500).json({ 
          error: '創建用戶失敗', 
          details: err.message 
        });
      }

      // 獲取剛創建的用戶信息
      db.query(`
        SELECT id, username, duration_days, expiration_date, is_active, created_at 
        FROM users WHERE username = $1
      `, [username], (err, result) => {
        if (err) {
          console.error('❌ 獲取新用戶信息錯誤:', err);
          return res.status(500).json({ 
            error: '獲取用戶信息失敗', 
            details: err.message 
          });
        }

        console.log('✅ 用戶創建成功:', username);
        res.json({
          message: '用戶創建成功',
          user: result.rows[0]
        });
      });
    });

  } catch (error) {
    console.error('❌ 創建用戶過程錯誤:', error);
    res.status(500).json({ 
      error: '創建用戶失敗', 
      details: error.message 
    });
  }
});

// 切換用戶狀態 (PostgreSQL版本)
router.post('/toggle-user-status', (req, res) => {
  console.log('🔄 管理員 API - 切換用戶狀態請求');
  
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: '缺少用戶ID' });
  }

  const db = req.app.locals.db;

  // 獲取當前狀態
  db.query('SELECT is_active FROM users WHERE id = $1', [userId], (err, result) => {
    if (err) {
      console.error('❌ 獲取用戶狀態錯誤:', err);
      return res.status(500).json({ 
        error: '獲取用戶狀態失敗', 
        details: err.message 
      });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    const currentStatus = result.rows[0].is_active;
    const newStatus = !currentStatus;

    // 更新狀態
    db.query('UPDATE users SET is_active = $1 WHERE id = $2', [newStatus, userId], (err) => {
      if (err) {
        console.error('❌ 更新用戶狀態錯誤:', err);
        return res.status(500).json({ 
          error: '更新用戶狀態失敗', 
          details: err.message 
        });
      }

      console.log('✅ 用戶狀態更新成功');
      res.json({ 
        message: '用戶狀態更新成功',
        newStatus: newStatus
      });
    });
  });
});

// 延期用戶 (PostgreSQL版本)
router.post('/extend-user', (req, res) => {
  console.log('⏰ 管理員 API - 延期用戶請求');
  
  const { userId, extensionDays } = req.body;
  
  if (!userId || !extensionDays) {
    return res.status(400).json({ error: '缺少必要參數' });
  }

  const db = req.app.locals.db;

  // 獲取當前到期日期
  db.query('SELECT expiration_date FROM users WHERE id = $1', [userId], (err, result) => {
    if (err) {
      console.error('❌ 獲取用戶到期日期錯誤:', err);
      return res.status(500).json({ 
        error: '獲取用戶信息失敗', 
        details: err.message 
      });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    const currentExpiry = new Date(result.rows[0].expiration_date);
    const now = new Date();
    
    // 如果已過期，從現在開始計算；否則從原到期日期延長
    const baseDate = currentExpiry < now ? now : currentExpiry;
    baseDate.setDate(baseDate.getDate() + parseInt(extensionDays));

    // 更新到期日期
    db.query('UPDATE users SET expiration_date = $1 WHERE id = $2', [baseDate, userId], (err) => {
      if (err) {
        console.error('❌ 延期用戶錯誤:', err);
        return res.status(500).json({ 
          error: '延期用戶失敗', 
          details: err.message 
        });
      }

      console.log('✅ 用戶延期成功');
      res.json({ 
        message: '用戶延期成功',
        newExpirationDate: baseDate
      });
    });
  });
});

// 獲取統計信息 (PostgreSQL版本)
router.get('/stats', (req, res) => {
  console.log('📊 管理員 API - 獲取統計信息請求');
  
  const db = req.app.locals.db;
  
  // 獲取總用戶數
  db.query('SELECT COUNT(*) as total FROM users', (err, result) => {
    if (err) {
      console.error('❌ 獲取總用戶數錯誤:', err);
      return res.status(500).json({ 
        error: '獲取統計信息失敗', 
        details: err.message 
      });
    }

    const totalUsers = parseInt(result.rows[0].total);

    // 獲取活躍用戶數
    db.query('SELECT COUNT(*) as active FROM users WHERE is_active = true', (err, result) => {
      if (err) {
        console.error('❌ 獲取活躍用戶數錯誤:', err);
        return res.status(500).json({ 
          error: '獲取統計信息失敗', 
          details: err.message 
        });
      }

      const activeUsers = parseInt(result.rows[0].active);

      // 獲取過期用戶數
      db.query('SELECT COUNT(*) as expired FROM users WHERE expiration_date < NOW()', (err, result) => {
        if (err) {
          console.error('❌ 獲取過期用戶數錯誤:', err);
          return res.status(500).json({ 
            error: '獲取統計信息失敗', 
            details: err.message 
          });
        }

        const expiredUsers = parseInt(result.rows[0].expired);

        const stats = {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          expiredUsers,
          validUsers: totalUsers - expiredUsers
        };

        console.log('✅ 統計信息獲取成功:', stats);
        res.json(stats);
      });
    });
  });
});

// 刪除用戶 (PostgreSQL版本)
router.delete('/delete-user/:userId', (req, res) => {
  console.log('🗑️ 管理員 API - 刪除用戶請求');
  
  const userId = req.params.userId;
  
  if (!userId) {
    return res.status(400).json({ error: '缺少用戶ID' });
  }

  const db = req.app.locals.db;

  db.query('DELETE FROM users WHERE id = $1', [userId], (err, result) => {
    if (err) {
      console.error('❌ 刪除用戶錯誤:', err);
      return res.status(500).json({ 
        error: '刪除用戶失敗', 
        details: err.message 
      });
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    console.log('✅ 用戶刪除成功');
    res.json({ message: '用戶刪除成功' });
  });
});

// 獲取許可證列表 (PostgreSQL版本)
router.get('/licenses', (req, res) => {
  console.log('🔍 管理員 API - 獲取許可證列表請求');
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const db = req.app.locals.db;

  // 獲取總數
  db.query('SELECT COUNT(*) as total FROM users', (err, result) => {
    if (err) {
      console.error('❌ 獲取許可證數量錯誤:', err);
      return res.status(500).json({ 
        error: '獲取許可證失敗', 
        details: err.message 
      });
    }

    const total = parseInt(result.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // 獲取許可證數據 (用戶數據)
    db.query(`
      SELECT 
        id,
        username as license_holder,
        username as key_code,
        duration_days,
        expiration_date,
        is_active,
        created_at,
        CASE 
          WHEN expiration_date > NOW() THEN false
          ELSE true
        END as is_expired
      FROM users 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset], (err, result) => {
      if (err) {
        console.error('❌ 獲取許可證數據錯誤:', err);
        return res.status(500).json({ 
          error: '獲取許可證失敗', 
          details: err.message
        });
      }

      const licenses = result.rows;

      console.log('✅ 許可證列表獲取成功');
      res.json({
        licenses: licenses,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: total,
          itemsPerPage: limit
        }
      });
    });
  });
});

module.exports = router;