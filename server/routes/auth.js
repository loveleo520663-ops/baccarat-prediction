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
        email: user.email,
        role: user.role,
        license_expiry: user.licenseExpiry
      }
    });
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 註冊
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, licenseKey } = req.body;

    if (!username || !password || !licenseKey) {
      return res.status(400).json({ error: '用戶名、密碼和許可證金鑰都是必須的' });
    }

    // 檢查用戶是否已存在
    if (memoryDB.findUserByUsername(username)) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    if (email && memoryDB.findUserByEmail(email)) {
      return res.status(400).json({ error: '電子郵件已被使用' });
    }

    // 驗證許可證金鑰
    const license = memoryDB.findLicenseKey(licenseKey);
    if (!license || license.isUsed) {
      return res.status(400).json({ error: '無效或已使用的許可證金鑰' });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 計算許可證到期時間
    const licenseExpiry = new Date();
    licenseExpiry.setDate(licenseExpiry.getDate() + license.durationDays);

    // 創建用戶
    const userData = {
      username,
      password: hashedPassword,
      email: email || null,
      role: 'user',
      licenseKey,
      licenseExpiry
    };

    const newUser = memoryDB.createUser(userData);

    // 標記許可證為已使用
    memoryDB.useLicenseKey(licenseKey, newUser.id);

    res.json({
      success: true,
      message: '註冊成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        license_expiry: newUser.licenseExpiry
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
router.get('/me', authenticateToken, (req, res) => {
  const user = memoryDB.findUserByUsername(req.user.username);
  if (!user) {
    return res.status(404).json({ error: '用戶不存在' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      license_expiry: user.licenseExpiry,
      last_login: user.lastLogin
    }
  });
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