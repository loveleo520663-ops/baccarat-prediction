const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const memoryDB = require('../memoryDB');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-secret-key-2024';

// 登入
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '請輸入用戶名和密碼' });
    }

    const user = memoryDB.findUserByUsername(username);

    if (!user) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: '帳號已被停用' });
    }

    // 驗證密碼
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 檢查許可證
    if (user.role !== 'admin' && (!user.licenseExpiry || new Date(user.licenseExpiry) < new Date())) {
      return res.status(403).json({ error: '許可證已過期，請聯繫管理員' });
    }

    // 更新最後登入時間
    memoryDB.updateUserLogin(username);

    // 生成 JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
          id: user.id,
          username: user.username,
          role: user.role,
          license_expiry: user.license_expiry
        }
      });
    });
  });
});

// 註冊
router.post('/register', (req, res) => {
  const { username, password, email, licenseKey } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '請輸入用戶名和密碼' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密碼長度至少需要 6 位' });
  }

  // 檢查許可證金鑰
  if (licenseKey) {
    db.get('SELECT * FROM license_keys WHERE key_code = ? AND is_used = 0', [licenseKey], (err, license) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '資料庫錯誤' });
      }

      if (!license) {
        return res.status(400).json({ error: '無效的許可證金鑰' });
      }

      // 建立用戶
      createUser(db, username, password, email, license, res);
    });
  } else {
    return res.status(400).json({ error: '需要有效的許可證金鑰才能註冊' });
  }
});

function createUser(db, username, password, email, license, res) {
  // 檢查用戶名是否存在
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, existingUser) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: '資料庫錯誤' });
    }

    if (existingUser) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 加密密碼
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: '密碼加密錯誤' });
      }

      // 計算許可證到期時間
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + license.duration_days);

      // 建立用戶
      db.run(
        `INSERT INTO users (username, password, email, license_key, license_expiry) 
         VALUES (?, ?, ?, ?, ?)`,
        [username, hashedPassword, email, license.key_code, expiryDate.toISOString()],
        function(err) {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: '建立用戶失敗' });
          }

          // 標記許可證為已使用
          db.run(
            'UPDATE license_keys SET is_used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?',
            [this.lastID, license.id]
          );

          res.json({
            success: true,
            message: '註冊成功',
            user: {
              id: this.lastID,
              username,
              license_expiry: expiryDate.toISOString()
            }
          });
        }
      );
    });
  });
}

// 驗證 token
router.post('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '沒有提供認證令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: '無效的認證令牌' });
    }

    res.json({ success: true, user: decoded });
  });
});

module.exports = router;