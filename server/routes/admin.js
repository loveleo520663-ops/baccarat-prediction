const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

// 獲取所有用戶
router.get('/users', (req, res) => {
  db.all(`
    SELECT u.id, u.username, u.email, u.role, u.license_key, 
           u.license_expiry, u.created_at, u.last_login, u.is_active,
           lk.duration_days
    FROM users u
    LEFT JOIN license_keys lk ON u.license_key = lk.key_code
    ORDER BY u.created_at DESC
  `, (err, users) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    res.json({ success: true, users });
  });

  });

// 建立許可證金鑰
router.post('/license/generate', (req, res) => {
  const { count = 1, durationDays = 30 } = req.body;

  if (count > 100) {
    return res.status(400).json({ error: '一次最多只能生成 100 個金鑰' });
  }

  const generatedKeys = [];

  db.serialize(() => {
    const stmt = db.prepare('INSERT INTO license_keys (key_code, duration_days) VALUES (?, ?)');
    
    for (let i = 0; i < count; i++) {
      const keyCode = `BAC-${uuidv4().substr(0, 8).toUpperCase()}-${Date.now().toString().substr(-4)}`;
      stmt.run([keyCode, durationDays]);
      generatedKeys.push({
        key_code: keyCode,
        duration_days: durationDays
      });
    }
    
    stmt.finalize(() => {
      res.json({
        success: true,
        message: `成功生成 ${count} 個許可證金鑰`,
        keys: generatedKeys
      });
    });
  });

  });

// 獲取許可證金鑰列表
router.get('/license/keys', (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  // 獲取總數
  db.get('SELECT COUNT(*) as total FROM license_keys', (err, countResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    // 獲取許可證列表
    db.all(`
      SELECT lk.*, u.username as used_by_username
      FROM license_keys lk
      LEFT JOIN users u ON lk.used_by = u.id
      ORDER BY lk.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, keys) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '資料庫錯誤' });
      }

      res.json({
        success: true,
        keys,
        total: countResult.total,
        page: parseInt(page),
        totalPages: Math.ceil(countResult.total / limit)
      });
    });
  });

  });

// 禁用/啟用用戶
router.put('/users/:id/toggle', (req, res) => {
  const userId = req.params.id;

  db.get('SELECT is_active FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    const newStatus = user.is_active ? 0 : 1;

    db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId], (err) => {
      if (err) {
        console.error(err);
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
router.put('/users/:id/extend-license', (req, res) => {
  const userId = req.params.id;
  const { days } = req.body;

  if (!days || days <= 0) {
    return res.status(400).json({ error: '請輸入有效的延長天數' });
  }

  db.get('SELECT license_expiry FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 計算新的到期時間
    let currentExpiry = user.license_expiry ? new Date(user.license_expiry) : new Date();
    if (currentExpiry < new Date()) {
      currentExpiry = new Date(); // 如果已過期，從今天開始計算
    }
    
    currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));

    db.run('UPDATE users SET license_expiry = ? WHERE id = ?', [currentExpiry.toISOString(), userId], (err) => {
      if (err) {
        console.error(err);
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
  const stats = {};

  db.serialize(() => {
    // 用戶統計
    db.get('SELECT COUNT(*) as total FROM users WHERE role = "user"', (err, userCount) => {
      if (err) console.error(err);
      stats.totalUsers = userCount ? userCount.total : 0;
    });

    db.get('SELECT COUNT(*) as active FROM users WHERE role = "user" AND is_active = 1', (err, activeUsers) => {
      if (err) console.error(err);
      stats.activeUsers = activeUsers ? activeUsers.active : 0;
    });

    // 許可證統計
    db.get('SELECT COUNT(*) as total FROM license_keys', (err, totalKeys) => {
      if (err) console.error(err);
      stats.totalLicenseKeys = totalKeys ? totalKeys.total : 0;
    });

    db.get('SELECT COUNT(*) as used FROM license_keys WHERE is_used = 1', (err, usedKeys) => {
      if (err) console.error(err);
      stats.usedLicenseKeys = usedKeys ? usedKeys.used : 0;
    });

    // 預測統計
    db.get('SELECT COUNT(*) as total FROM predictions', (err, totalPredictions) => {
      if (err) console.error(err);
      stats.totalPredictions = totalPredictions ? totalPredictions.total : 0;
    });

    db.get('SELECT COUNT(*) as correct FROM predictions WHERE is_correct = 1', (err, correctPredictions) => {
      if (err) console.error(err);
      stats.correctPredictions = correctPredictions ? correctPredictions.correct : 0;
      
      // 計算準確率
      if (stats.totalPredictions > 0) {
        stats.accuracyRate = ((stats.correctPredictions / stats.totalPredictions) * 100).toFixed(2);
      } else {
        stats.accuracyRate = 0;
      }

      res.json({ success: true, stats });
    });
  });

  });

// 刪除許可證金鑰
router.delete('/license/:id', (req, res) => {
  const keyId = req.params.id;

  db.get('SELECT is_used FROM license_keys WHERE id = ?', [keyId], (err, key) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    if (!key) {
      return res.status(404).json({ error: '許可證金鑰不存在' });
    }

    if (key.is_used) {
      return res.status(400).json({ error: '無法刪除已使用的許可證金鑰' });
    }

    db.run('DELETE FROM license_keys WHERE id = ?', [keyId], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '刪除許可證金鑰失敗' });
      }

      res.json({ success: true, message: '許可證金鑰已刪除' });
    });
  });

  });

module.exports = router;