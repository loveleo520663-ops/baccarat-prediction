const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// 記憶體儲存 - 替代資料庫
let users = [
  {
    id: 1,
    username: 'admin',
    password_hash: '$2a$10$X8rM9QJ1YxK2Ln3w4F5vLOyH3mZ8Nq7P5k2X9Rt6Sw4A1Bv8Cy0De', // password: admin123
    role: 'admin',
    is_active: 1,
    created_at: new Date().toISOString(),
    expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1年後到期
  }
];

let licenseKeys = [];
let nextUserId = 2;
let nextLicenseId = 1;

const router = express.Router();

// 獲取所有用戶
router.get('/users', (req, res) => {
  try {
    // 過濾掉密碼哈希，返回安全的用戶資料
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      expiration_date: user.expiration_date
    }));

    res.json({ success: true, users: safeUsers });
  } catch (error) {
    console.error('獲取用戶錯誤:', error);
    res.status(500).json({ error: '獲取用戶失敗' });
  }
});

// 創建用戶
router.post('/users/create', async (req, res) => {
  const { username, password } = req.body;

  // 驗證輸入
  if (!username || !password) {
    return res.status(400).json({ 
      error: '帳號和密碼都是必填的',
      details: {
        username: !username ? '帳號是必填的' : null,
        password: !password ? '密碼是必填的' : null
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

  try {
    // 檢查用戶名是否已存在
    const existingUser = users.find(user => user.username === username);
    
    if (existingUser) {
      return res.status(409).json({ error: '帳號已存在' });
    }

    // 加密密碼
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 設置默認到期日期 (30天)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // 創建新用戶
    const newUser = {
      id: nextUserId++,
      username: username,
      password_hash: hashedPassword,
      role: 'user',
      is_active: 1,
      created_at: new Date().toISOString(),
      expiration_date: expirationDate.toISOString()
    };

    // 添加到記憶體儲存
    users.push(newUser);

    // 返回安全的用戶資料（不包含密碼哈希）
    const safeUser = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      is_active: newUser.is_active,
      created_at: newUser.created_at,
      expiration_date: newUser.expiration_date
    };

    res.status(201).json({
      success: true,
      message: '用戶創建成功',
      user: safeUser
    });

  } catch (error) {
    console.error('創建用戶錯誤:', error);
    res.status(500).json({ 
      error: '創建用戶失敗',
      details: error.message 
    });
  }
});

// 建立許可證金鑰
router.post('/license/generate', (req, res) => {
  const { count = 1, durationDays = 30 } = req.body;

  if (count > 100) {
    return res.status(400).json({ error: '一次最多只能生成 100 個金鑰' });
  }

  try {
    const generatedKeys = [];
    
    for (let i = 0; i < count; i++) {
      const keyCode = `BAC-${uuidv4().substr(0, 8).toUpperCase()}-${Date.now().toString().substr(-4)}`;
      
      const newKey = {
        id: nextLicenseId++,
        key_code: keyCode,
        duration_days: durationDays,
        is_used: 0,
        used_by: null,
        created_at: new Date().toISOString(),
        used_at: null
      };

      licenseKeys.push(newKey);
      generatedKeys.push({
        key_code: keyCode,
        duration_days: durationDays
      });
    }

    res.json({
      success: true,
      message: `成功生成 ${count} 個許可證金鑰`,
      keys: generatedKeys
    });

  } catch (error) {
    console.error('生成金鑰錯誤:', error);
    res.status(500).json({ error: '生成金鑰失敗' });
  }
});

// 獲取許可證金鑰列表
router.get('/license/keys', (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // 獲取總數
    const total = licenseKeys.length;
    
    // 獲取分頁數據
    const keysWithUsernames = licenseKeys
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + parseInt(limit))
      .map(key => {
        const usedByUser = users.find(user => user.id === key.used_by);
        return {
          ...key,
          used_by_username: usedByUser ? usedByUser.username : null
        };
      });

    res.json({
      success: true,
      keys: keysWithUsernames,
      total: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('獲取金鑰錯誤:', error);
    res.status(500).json({ error: '獲取金鑰失敗' });
  }
});

// 禁用/啟用用戶
router.put('/users/:id/toggle', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 切換狀態
    user.is_active = user.is_active ? 0 : 1;

    res.json({
      success: true,
      message: `用戶已${user.is_active ? '啟用' : '禁用'}`,
      is_active: user.is_active
    });

  } catch (error) {
    console.error('更新用戶狀態錯誤:', error);
    res.status(500).json({ error: '更新用戶狀態失敗' });
  }
});

// 延長用戶許可證
router.put('/users/:id/extend-license', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { days } = req.body;

    if (!days || days <= 0) {
      return res.status(400).json({ error: '請輸入有效的延長天數' });
    }

    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 計算新的到期時間
    let currentExpiry = user.expiration_date ? new Date(user.expiration_date) : new Date();
    if (currentExpiry < new Date()) {
      currentExpiry = new Date(); // 如果已過期，從今天開始計算
    }
    
    currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));
    user.expiration_date = currentExpiry.toISOString();

    res.json({
      success: true,
      message: `許可證已延長 ${days} 天`,
      new_expiry: currentExpiry.toISOString()
    });

  } catch (error) {
    console.error('延長許可證錯誤:', error);
    res.status(500).json({ error: '延長許可證失敗' });
  }
});

// 獲取系統統計
router.get('/stats', (req, res) => {
  try {
    const stats = {
      totalUsers: users.filter(u => u.role === 'user').length,
      activeUsers: users.filter(u => u.role === 'user' && u.is_active === 1).length,
      totalLicenseKeys: licenseKeys.length,
      usedLicenseKeys: licenseKeys.filter(k => k.is_used === 1).length,
      totalPredictions: 0, // 暫時設為 0，因為沒有預測資料
      correctPredictions: 0,
      accuracyRate: 0
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('獲取統計錯誤:', error);
    res.status(500).json({ error: '獲取統計失敗' });
  }
});

// 刪除許可證金鑰
router.delete('/license/:id', (req, res) => {
  try {
    const keyId = parseInt(req.params.id);
    const keyIndex = licenseKeys.findIndex(k => k.id === keyId);

    if (keyIndex === -1) {
      return res.status(404).json({ error: '許可證金鑰不存在' });
    }

    const key = licenseKeys[keyIndex];

    if (key.is_used) {
      return res.status(400).json({ error: '無法刪除已使用的許可證金鑰' });
    }

    // 從陣列中移除
    licenseKeys.splice(keyIndex, 1);

    res.json({ success: true, message: '許可證金鑰已刪除' });

  } catch (error) {
    console.error('刪除金鑰錯誤:', error);
    res.status(500).json({ error: '刪除許可證金鑰失敗' });
  }
});

module.exports = router;