// PostgreSQL 資料庫連接模組
const { Pool } = require('pg');

let pool = null;

// 初始化資料庫連接池
const initDatabase = () => {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 環境變數未設定');
    return null;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Render 需要 SSL
    }
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL 連接錯誤:', err);
  });

  console.log('✅ PostgreSQL 資料庫連接池已建立');
  return pool;
};

// 建立資料表
const createTables = async () => {
  const pool = initDatabase();
  if (!pool) {
    throw new Error('資料庫連接失敗');
  }

  try {
    // 建立用戶表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 建立預測記錄表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        game_data TEXT,
        prediction_result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 建立金鑰表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS license_keys (
        id SERIAL PRIMARY KEY,
        key_code VARCHAR(100) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activated_at TIMESTAMP,
        expires_at TIMESTAMP,
        is_active INTEGER DEFAULT 1
      )
    `);

    // 檢查是否已有管理員帳號
    const adminCheck = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      ['admin']
    );

    // 如果沒有管理員,建立預設管理員
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.query(
        'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 1]
      );
      
      console.log('✅ 已建立預設管理員帳號 (admin/admin123)');
    }

    console.log('✅ 資料表建立完成');
  } catch (error) {
    console.error('❌ 建立資料表失敗:', error);
    throw error;
  }
};

// 獲取資料庫連接
const getDB = () => {
  if (!pool) {
    return initDatabase();
  }
  return pool;
};

// 關閉資料庫連接
const closeDB = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ 資料庫連接已關閉');
  }
};

module.exports = {
  initDatabase,
  createTables,
  getDB,
  closeDB
};
