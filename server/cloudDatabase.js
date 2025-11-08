// 全新的雲端 PostgreSQL 資料庫模組
const { Pool } = require('pg');

class CloudDatabase {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  // 初始化資料庫連接
  async connect() {
    try {
      console.log('🌩️ 正在連接雲端 PostgreSQL 資料庫...');
      
      // 使用 Render 提供的 DATABASE_URL
      const connectionConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };

      this.pool = new Pool(connectionConfig);

      // 測試連接
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.log('✅ 雲端資料庫連接成功！');
      
      return true;
    } catch (error) {
      console.error('❌ 資料庫連接失敗:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // 執行查詢
  async query(text, params = []) {
    if (!this.isConnected) {
      throw new Error('資料庫未連接');
    }
    
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('❌ 查詢錯誤:', error.message);
      throw error;
    }
  }

  // 初始化資料表
  async initializeTables() {
    try {
      console.log('🔧 正在初始化資料表...');

      // 建立用戶表
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          duration_days INTEGER DEFAULT 30,
          expiration_date TIMESTAMP NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 建立許可證表
      await this.query(`
        CREATE TABLE IF NOT EXISTS licenses (
          id SERIAL PRIMARY KEY,
          license_key VARCHAR(100) UNIQUE NOT NULL,
          duration_days INTEGER NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          used_by INTEGER REFERENCES users(id),
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 建立遊戲記錄表
      await this.query(`
        CREATE TABLE IF NOT EXISTS game_records (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          game_data JSONB,
          prediction_result TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ 資料表初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 資料表初始化失敗:', error.message);
      return false;
    }
  }

  // 建立管理員帳號
  async createDefaultAdmin() {
    try {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // 計算過期時間（1年後）
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      // 使用 INSERT ... ON CONFLICT 避免重複插入
      await this.query(`
        INSERT INTO users (username, password, is_admin, duration_days, expiration_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) 
        DO UPDATE SET 
          password = EXCLUDED.password,
          updated_at = CURRENT_TIMESTAMP
      `, ['admin', hashedPassword, true, 365, expirationDate]);

      console.log('✅ 管理員帳號已建立：admin / admin123');
      return true;
    } catch (error) {
      console.error('❌ 管理員帳號建立失敗:', error.message);
      return false;
    }
  }

  // 獲取用戶
  async getUser(username) {
    try {
      const result = await this.query('SELECT * FROM users WHERE username = $1', [username]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ 獲取用戶失敗:', error.message);
      return null;
    }
  }

  // 建立用戶
  async createUser(userData) {
    try {
      const { username, password, durationDays = 30 } = userData;
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + durationDays);

      const result = await this.query(`
        INSERT INTO users (username, password, duration_days, expiration_date)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, is_admin, expiration_date
      `, [username, hashedPassword, durationDays, expirationDate]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ 建立用戶失敗:', error.message);
      throw error;
    }
  }

  // 獲取所有用戶（管理員功能）
  async getAllUsers() {
    try {
      const result = await this.query(`
        SELECT id, username, is_admin, duration_days, expiration_date, 
               is_active, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('❌ 獲取用戶列表失敗:', error.message);
      return [];
    }
  }

  // 更新用戶
  async updateUser(userId, updateData) {
    try {
      const { durationDays, isActive } = updateData;
      let query = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
      const params = [];
      let paramCount = 0;

      if (durationDays !== undefined) {
        paramCount++;
        query += `, duration_days = $${paramCount}`;
        params.push(durationDays);
        
        // 更新過期時間
        paramCount++;
        const newExpiration = new Date();
        newExpiration.setDate(newExpiration.getDate() + durationDays);
        query += `, expiration_date = $${paramCount}`;
        params.push(newExpiration);
      }

      if (isActive !== undefined) {
        paramCount++;
        query += `, is_active = $${paramCount}`;
        params.push(isActive);
      }

      paramCount++;
      query += ` WHERE id = $${paramCount} RETURNING *`;
      params.push(userId);

      const result = await this.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('❌ 更新用戶失敗:', error.message);
      throw error;
    }
  }

  // 刪除用戶
  async deleteUser(userId) {
    try {
      await this.query('DELETE FROM users WHERE id = $1', [userId]);
      return true;
    } catch (error) {
      console.error('❌ 刪除用戶失敗:', error.message);
      throw error;
    }
  }

  // 關閉連接
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 資料庫連接已關閉');
    }
  }
}

// 匯出單例實例
const cloudDB = new CloudDatabase();
module.exports = cloudDB;