// 全新的管理員路由 - 使用雲端 PostgreSQL
const express = require('express');
const jwt = require('jsonwebtoken');
const cloudDB = require('../cloudDatabase');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'baccarat-secret-key-2024';

// 驗證管理員中間件
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登錄' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token 無效' });
    }
    
    if (!user.isAdmin) {
      return res.status(403).json({ error: '需要管理員權限' });
    }
    
    req.user = user;
    next();
  });
};

// 獲取所有用戶
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 管理員查看用戶列表');
    const users = await cloudDB.getAllUsers();
    
    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin,
        durationDays: user.duration_days,
        expirationDate: user.expiration_date,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }))
    });
    
  } catch (error) {
    console.error('❌ 獲取用戶列表失敗:', error.message);
    res.status(500).json({ error: '系統錯誤' });
  }
});

// 建立用戶
router.post('/users', authenticateAdmin, async (req, res) => {
  try {
    const { username, password, durationDays } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '請提供用戶名和密碼' });
    }
    
    console.log('👤 管理員建立用戶:', username);
    
    const newUser = await cloudDB.createUser({
      username,
      password,
      durationDays: durationDays || 30
    });
    
    res.json({
      success: true,
      message: '用戶建立成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        expirationDate: newUser.expiration_date
      }
    });
    
  } catch (error) {
    console.error('❌ 建立用戶失敗:', error.message);
    if (error.code === '23505') { // PostgreSQL unique violation
      res.status(400).json({ error: '用戶名已存在' });
    } else {
      res.status(500).json({ error: '建立用戶失敗' });
    }
  }
});

// 更新用戶
router.put('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { durationDays, isActive } = req.body;
    
    console.log('✏️ 管理員更新用戶:', userId);
    
    const updatedUser = await cloudDB.updateUser(userId, {
      durationDays,
      isActive
    });
    
    if (!updatedUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    res.json({
      success: true,
      message: '用戶更新成功',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isAdmin: updatedUser.is_admin,
        durationDays: updatedUser.duration_days,
        expirationDate: updatedUser.expiration_date,
        isActive: updatedUser.is_active,
        updatedAt: updatedUser.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ 更新用戶失敗:', error.message);
    res.status(500).json({ error: '更新用戶失敗' });
  }
});

// 刪除用戶
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    console.log('🗑️ 管理員刪除用戶:', userId);
    
    await cloudDB.deleteUser(userId);
    
    res.json({
      success: true,
      message: '用戶刪除成功'
    });
    
  } catch (error) {
    console.error('❌ 刪除用戶失敗:', error.message);
    res.status(500).json({ error: '刪除用戶失敗' });
  }
});

// 獲取系統統計
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 管理員查看系統統計');
    
    const totalUsers = await cloudDB.query('SELECT COUNT(*) as count FROM users');
    const activeUsers = await cloudDB.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const adminUsers = await cloudDB.query('SELECT COUNT(*) as count FROM users WHERE is_admin = true');
    const expiredUsers = await cloudDB.query('SELECT COUNT(*) as count FROM users WHERE expiration_date < NOW()');
    
    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        activeUsers: parseInt(activeUsers.rows[0].count),
        adminUsers: parseInt(adminUsers.rows[0].count),
        expiredUsers: parseInt(expiredUsers.rows[0].count)
      }
    });
    
  } catch (error) {
    console.error('❌ 獲取統計失敗:', error.message);
    res.status(500).json({ error: '系統錯誤' });
  }
});

module.exports = router;