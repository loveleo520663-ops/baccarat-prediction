const express = require('express');
const database = require('../database');
const db = database.getDB();
const router = express.Router();
// 驗證許可證金鑰
router.post('/validate', (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ error: '請輸入許可證金鑰' });
  }

  db.get(
    'SELECT * FROM license_keys WHERE key_code = ?',
    [licenseKey],
    (err, license) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '資料庫錯誤' });
      }

      if (!license) {
        return res.json({ 
          valid: false, 
          message: '許可證金鑰不存在' 
        });
      }

      if (license.is_used) {
        return res.json({ 
          valid: false, 
          message: '許可證金鑰已被使用' 
        });
      }

      res.json({
        valid: true,
        message: '許可證金鑰有效',
        duration_days: license.duration_days
      });
    }
  );

  });

// 獲取許可證信息（僅用於已登入用戶檢查自己的許可證）
router.get('/info', (req, res) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: '需要認證' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-secret-key-2024';
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    db.get(
      'SELECT license_key, license_expiry FROM users WHERE id = ?',
      [decoded.id],
      (err, user) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: '資料庫錯誤' });
        }

        if (!user) {
          return res.status(404).json({ error: '用戶不存在' });
        }

        const now = new Date();
        const expiry = user.license_expiry ? new Date(user.license_expiry) : null;
        const isExpired = expiry ? expiry < now : true;
        const daysRemaining = expiry ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : 0;

        res.json({
          success: true,
          license: {
            key: user.license_key,
            expiry: user.license_expiry,
            isExpired,
            daysRemaining: Math.max(0, daysRemaining)
          }
        });
      }
    );

    } catch (error) {
    res.status(403).json({ error: '無效的認證令牌' });
  }
});

module.exports = router;