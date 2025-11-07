const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');

const router = express.Router();

// 獲取所有用戶
router.get('/users', (req, res) => {
  db.all(`
    SELECT id, username, duration_days, expiration_date, is_active, created_at
    FROM users 
    ORDER BY created_at DESC
  `, (err, users) => {
    if (err) {
      console.error('獲取用戶錯誤:', err);
      return res.status(500).json({ error: '獲取用戶失敗' });
    }

    res.json({ success: true, users });
  });
});

// 創建用戶 (合併註冊和金鑰功能)
router.post('/users/create', async (req, res) => {
  const { username, password, durationDays } = req.body;

  // 驗證輸入
  if (!username || !password || !durationDays) {
    return res.status(400).json({ 
      error: '帳號、密碼和有效期都是必填的',
      details: {
        username: !username ? '帳號是必填的' : null,
        password: !password ? '密碼是必填的' : null,
        durationDays: !durationDays ? '有效期是必填的' : null
      }
    });
  }

  // 驗證用戶名格式
  if (username.length < 3) {
    return res.status(400).json({ error: '帳號至少需要 3 個字符' });
  }

  // 驗證密碼強度
  if (password.length < 6) {
    return res.status(400).json({ error: '密碼至少需要 6 個字符' });
  }

  // 驗證有效期選項
  const validDurations = [1, 7, 30, 365, -1]; // -1 表示永久
  if (!validDurations.includes(parseInt(durationDays))) {
    return res.status(400).json({ error: '無效的有效期選項' });
  }

  try {
    // 檢查用戶名是否已存在
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, existingUser) => {
      if (err) {
        console.error('檢查用戶錯誤:', err);
        return res.status(500).json({ error: '檢查用戶時發生錯誤' });
      }

      if (existingUser) {
        return res.status(409).json({ error: '帳號已存在' });
      }

      try {
        // 加密密碼
        const hashedPassword = await bcrypt.hash(password, 10);

        // 計算到期日期
        let expirationDate;
        if (parseInt(durationDays) === -1) {
          // 永久帳號設置為 100 年後
          expirationDate = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
        } else {
          expirationDate = new Date(Date.now() + parseInt(durationDays) * 24 * 60 * 60 * 1000);
        }

        // 創建用戶
        db.run(`
          INSERT INTO users (username, password, duration_days, expiration_date)
          VALUES (?, ?, ?, ?)
        `, [username, hashedPassword, parseInt(durationDays), expirationDate.toISOString()], function(err) {
          if (err) {
            console.error('創建用戶錯誤:', err);
            return res.status(500).json({ error: '創建用戶失敗' });
          }

          // 獲取創建的用戶資訊
          db.get(`
            SELECT id, username, duration_days, expiration_date, is_active, created_at
            FROM users WHERE id = ?
          `, [this.lastID], (err, user) => {
            if (err) {
              console.error('獲取用戶資訊錯誤:', err);
              return res.status(500).json({ error: '獲取用戶資訊失敗' });
            }

            res.status(201).json({
              success: true,
              message: '用戶創建成功',
              user: user
            });
          });
        });

      } catch (hashError) {
        console.error('密碼加密錯誤:', hashError);
        res.status(500).json({ error: '密碼加密失敗' });
      }
    });

  } catch (error) {
    console.error('創建用戶過程錯誤:', error);
    res.status(500).json({ error: '創建用戶失敗' });
  }
});

// 生成隨機帳號
router.get('/generate/username', (req, res) => {
  const adjectives = ['Lucky', 'Smart', 'Fast', 'Cool', 'Pro', 'Elite', 'Super', 'Mega', 'Ultra', 'Prime'];
  const nouns = ['Player', 'Gamer', 'User', 'Winner', 'Master', 'King', 'Queen', 'Star', 'Hero', 'Legend'];
  const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  const username = `${adjective}${noun}${numbers}`;
  
  res.json({ success: true, username });
});

// 生成隨機密碼
router.get('/generate/password', (req, res) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  res.json({ success: true, password });
});

// 禁用/啟用用戶
router.put('/users/:id/toggle', (req, res) => {
  const userId = parseInt(req.params.id);

  db.get('SELECT is_active FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('查詢用戶錯誤:', err);
      return res.status(500).json({ error: '查詢用戶失敗' });
    }

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    const newStatus = user.is_active ? 0 : 1;

    db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId], (err) => {
      if (err) {
        console.error('更新用戶狀態錯誤:', err);
        return res.status(500).json({ error: '更新用戶狀態失敗' });
      }

      res.json({
        success: true,
        message: `用戶已${newStatus ? '啟用' : '禁用'}`,
        is_active: newStatus
      });
    });
  });
});

// 延長用戶許可證
router.put('/users/:id/extend', (req, res) => {
  const userId = parseInt(req.params.id);
  const { days } = req.body;

  if (!days || days <= 0) {
    return res.status(400).json({ error: '請輸入有效的延長天數' });
  }

  db.get('SELECT expiration_date FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('查詢用戶錯誤:', err);
      return res.status(500).json({ error: '查詢用戶失敗' });
    }

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 計算新的到期時間
    let currentExpiry = user.expiration_date ? new Date(user.expiration_date) : new Date();
    if (currentExpiry < new Date()) {
      currentExpiry = new Date(); // 如果已過期，從今天開始計算
    }
    
    currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));

    db.run('UPDATE users SET expiration_date = ? WHERE id = ?', [currentExpiry.toISOString(), userId], (err) => {
      if (err) {
        console.error('延長許可證錯誤:', err);
        return res.status(500).json({ error: '延長許可證失敗' });
      }

      res.json({
        success: true,
        message: `許可證已延長 ${days} 天`,
        new_expiry: currentExpiry.toISOString()
      });
    });
  });
});

// 獲取系統統計
router.get('/stats', (req, res) => {
  db.serialize(() => {
    let stats = {};

    db.get('SELECT COUNT(*) as total FROM users', (err, result) => {
      if (err) {
        console.error('統計錯誤:', err);
        return res.status(500).json({ error: '獲取統計失敗' });
      }
      stats.totalUsers = result.total;

      db.get('SELECT COUNT(*) as active FROM users WHERE is_active = 1', (err, result) => {
        if (err) {
          console.error('統計錯誤:', err);
          return res.status(500).json({ error: '獲取統計失敗' });
        }
        stats.activeUsers = result.active;

        db.get('SELECT COUNT(*) as expired FROM users WHERE datetime(expiration_date) < datetime("now")', (err, result) => {
          if (err) {
            console.error('統計錯誤:', err);
            return res.status(500).json({ error: '獲取統計失敗' });
          }
          stats.expiredUsers = result.expired;

          res.json({ success: true, stats });
        });
      });
    });
  });
});

// 刪除用戶
router.delete('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);

  // 不允許刪除管理員帳號
  if (userId === 1) {
    return res.status(403).json({ error: '無法刪除管理員帳號' });
  }

  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      console.error('刪除用戶錯誤:', err);
      return res.status(500).json({ error: '刪除用戶失敗' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({ success: true, message: '用戶已刪除' });
  });
});

module.exports = router;