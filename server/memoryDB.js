// 內存資料庫 - 簡單版本
class MemoryDB {
  constructor() {
    this.users = new Map();
    this.licenseKeys = new Map();
    this.predictions = [];
    this.gameHistory = [];
    
    // 初始化管理員帳號
    this.initAdmin();
    this.initLicenseKeys();
  }

  initAdmin() {
    // 預設管理員帳號
    this.users.set('admin', {
      id: 1,
      username: 'admin',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      email: 'admin@baccarat.com',
      role: 'admin',
      licenseKey: 'ADMIN-FOREVER',
      licenseExpiry: new Date('2099-12-31'),
      createdAt: new Date(),
      lastLogin: null,
      isActive: true
    });
    
    // 預設測試用戶
    this.users.set('test', {
      id: 2,
      username: 'test',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      email: 'test@baccarat.com',
      role: 'user',
      licenseKey: 'TEST-2024',
      licenseExpiry: new Date('2025-12-31'),
      createdAt: new Date(),
      lastLogin: null,
      isActive: true
    });
  }

  initLicenseKeys() {
    // 預設許可證金鑰
    const defaultKeys = [
      'BACCARAT-2024-GOLD',
      'BACCARAT-2024-VIP',
      'BACCARAT-2024-PRO',
      'FREE-TRIAL-30DAYS',
      'PREMIUM-FOREVER'
    ];

    defaultKeys.forEach((key, index) => {
      this.licenseKeys.set(key, {
        id: index + 1,
        keyCode: key,
        durationDays: key.includes('FOREVER') ? 36500 : 30,
        isUsed: false,
        usedBy: null,
        createdAt: new Date(),
        usedAt: null
      });
    });
  }

  // 用戶相關方法
  findUserByUsername(username) {
    return this.users.get(username) || null;
  }

  findUserByEmail(email) {
    for (let user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  createUser(userData) {
    const id = this.users.size + 1;
    const user = {
      id,
      ...userData,
      createdAt: new Date(),
      lastLogin: null,
      isActive: true
    };
    this.users.set(userData.username, user);
    return user;
  }

  updateUserLogin(username) {
    const user = this.users.get(username);
    if (user) {
      user.lastLogin = new Date();
      return user;
    }
    return null;
  }

  // 許可證相關方法
  findLicenseKey(keyCode) {
    return this.licenseKeys.get(keyCode) || null;
  }

  useLicenseKey(keyCode, userId) {
    const key = this.licenseKeys.get(keyCode);
    if (key && !key.isUsed) {
      key.isUsed = true;
      key.usedBy = userId;
      key.usedAt = new Date();
      return key;
    }
    return null;
  }

  getAllLicenseKeys() {
    return Array.from(this.licenseKeys.values());
  }

  createLicenseKey(keyCode, durationDays) {
    const id = this.licenseKeys.size + 1;
    const key = {
      id,
      keyCode,
      durationDays,
      isUsed: false,
      usedBy: null,
      createdAt: new Date(),
      usedAt: null
    };
    this.licenseKeys.set(keyCode, key);
    return key;
  }

  // 預測記錄
  addPrediction(userId, cardPattern, predictedResult) {
    const prediction = {
      id: this.predictions.length + 1,
      userId,
      cardPattern,
      predictedResult,
      actualResult: null,
      isCorrect: null,
      confidenceScore: Math.random() * 0.3 + 0.7, // 70-100% 信心度
      createdAt: new Date()
    };
    this.predictions.push(prediction);
    return prediction;
  }

  getUserPredictions(userId) {
    return this.predictions.filter(p => p.userId === userId);
  }

  // 遊戲歷史
  addGameHistory(userId, gameData) {
    const history = {
      id: this.gameHistory.length + 1,
      userId,
      ...gameData,
      createdAt: new Date()
    };
    this.gameHistory.push(history);
    return history;
  }

  getUserGameHistory(userId) {
    return this.gameHistory.filter(h => h.userId === userId);
  }

  // 統計數據
  getStats() {
    return {
      totalUsers: this.users.size,
      totalLicenseKeys: this.licenseKeys.size,
      usedLicenseKeys: Array.from(this.licenseKeys.values()).filter(k => k.isUsed).length,
      totalPredictions: this.predictions.length,
      totalGames: this.gameHistory.length
    };
  }
}

// 創建全局實例
const memoryDB = new MemoryDB();

module.exports = memoryDB;