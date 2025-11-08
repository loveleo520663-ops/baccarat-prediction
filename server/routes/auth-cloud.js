// 全新的認證路由 - 使用雲端 PostgreSQL
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudDB = require('../cloudDatabase');

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

    // 從雲端資料庫查找用戶
    const user = await cloudDB.getUser(username);
    
    if (!user) {
      console.log('❌ 用戶不存在:', username);
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ 密碼錯誤:', username);
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }

    // 檢查帳號是否啟用
    if (!user.is_active) {
      console.log('❌ 帳號已停用:', username);
      return res.status(401).json({ error: '帳號已停用' });
    }

    // 檢查是否過期
    const now = new Date();
    const expirationDate = new Date(user.expiration_date);
    
    if (now > expirationDate) {
      console.log('❌ 帳號已過期:', username);
      return res.status(401).json({ error: '帳號已過期' });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        isAdmin: user.is_admin 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ 登錄成功:', username);

    res.json({
      success: true,
      message: '登錄成功',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin,
        expirationDate: user.expiration_date
      }
    });

  } catch (error) {
    console.error('❌ 登錄錯誤:', error.message);
    res.status(500).json({ error: '系統錯誤，請稍後再試' });
  }
});

// 註冊
router.post('/register', async (req, res) => {
  try {
    const { username, password, durationDays } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '請輸入用戶名和密碼' });
    }

    console.log('📝 註冊請求:', username);

    // 檢查用戶是否已存在
    const existingUser = await cloudDB.getUser(username);
    
    if (existingUser) {
      return res.status(400).json({ error: '用戶名已存在' });
    }

    // 建立新用戶
    const newUser = await cloudDB.createUser({
      username,
      password,
      durationDays: durationDays || 30
    });

    console.log('✅ 註冊成功:', username);

    res.json({
      success: true,
      message: '註冊成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        expirationDate: newUser.expiration_date
      }
    });

  } catch (error) {
    console.error('❌ 註冊錯誤:', error.message);
    res.status(500).json({ error: '註冊失敗，請稍後再試' });
  }
});

// 驗證 token 中間件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登錄' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token 無效' });
    }
    req.user = user;
    next();
  });
};

// 獲取用戶資訊
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await cloudDB.getUser(req.user.username);
    
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({
      id: user.id,
      username: user.username,
      isAdmin: user.is_admin,
      expirationDate: user.expiration_date,
      isActive: user.is_active
    });

  } catch (error) {
    console.error('❌ 獲取用戶資訊錯誤:', error.message);
    res.status(500).json({ error: '系統錯誤' });
  }
});

module.exports = router;