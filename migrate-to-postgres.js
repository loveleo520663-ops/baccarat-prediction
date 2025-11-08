const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🚀 開始遷移到 PostgreSQL...');

// PostgreSQL 連接配置
const pgConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// 如果沒有 DATABASE_URL，使用單獨配置
if (!pgConfig.connectionString) {
  pgConfig.host = process.env.DB_HOST || 'localhost';
  pgConfig.port = process.env.DB_PORT || 5432;
  pgConfig.database = process.env.DB_NAME || 'baccarat';
  pgConfig.user = process.env.DB_USER || 'postgres';
  pgConfig.password = process.env.DB_PASSWORD || 'password';
  delete pgConfig.connectionString;
}

const client = new Client(pgConfig);

// PostgreSQL 建表語句 (轉換自 SQLite)
const createTables = `
-- 建立用戶表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 0,
  expiration_date TIMESTAMP NOT NULL,
  is_active INTEGER DEFAULT 1,
  is_admin INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立金鑰表 (如果需要的話)
CREATE TABLE IF NOT EXISTS license_keys (
  id SERIAL PRIMARY KEY,
  key_value VARCHAR(255) NOT NULL UNIQUE,
  duration_days INTEGER NOT NULL,
  is_used INTEGER DEFAULT 0,
  used_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP
);

-- 建立預測記錄表 (如果需要的話)
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  prediction_data TEXT,
  result TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// 從 SQLite dump 讀取資料
const dumpPath = path.join(__dirname, 'database', 'dump.sql');

async function migrate() {
  try {
    console.log('📡 連接 PostgreSQL...');
    await client.connect();
    console.log('✅ PostgreSQL 連接成功');

    // 1. 建立表格
    console.log('🏗️ 建立表格結構...');
    await client.query(createTables);
    console.log('✅ 表格建立完成');

    // 2. 讀取 SQLite dump
    if (fs.existsSync(dumpPath)) {
      console.log('📄 讀取 SQLite 備份資料...');
      
      const dumpContent = fs.readFileSync(dumpPath, 'utf8');
      
      // 解析 INSERT 語句
      const insertLines = dumpContent
        .split('\n')
        .filter(line => line.startsWith('INSERT INTO users'));

      console.log(`📊 找到 ${insertLines.length} 筆用戶記錄`);

      // 3. 遷移用戶資料
      for (let i = 0; i < insertLines.length; i++) {
        const line = insertLines[i];
        
        // 解析 INSERT 語句 (簡化版本)
        const match = line.match(/INSERT INTO users \([^)]+\) VALUES \(([^)]+)\);/);
        
        if (match) {
          try {
            // 解析值 (需要處理引號和逗號)
            const valuesStr = match[1];
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < valuesStr.length; j++) {
              const char = valuesStr[j];
              
              if (char === "'" && (j === 0 || valuesStr[j-1] !== "'")) {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());

            // 轉換 SQLite 格式到 PostgreSQL
            const convertedValues = values.map(val => {
              if (val === 'NULL') return null;
              if (val.startsWith("'") && val.endsWith("'")) {
                return val.slice(1, -1).replace(/''/g, "'");
              }
              return val;
            });

            // 插入到 PostgreSQL (假設欄位順序: id, username, password, duration_days, expiration_date, is_active, created_at, is_admin)
            await client.query(
              `INSERT INTO users (username, password, duration_days, expiration_date, is_active, created_at, is_admin) 
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                convertedValues[1], // username
                convertedValues[2], // password
                parseInt(convertedValues[3]), // duration_days
                convertedValues[4], // expiration_date
                parseInt(convertedValues[5]), // is_active
                convertedValues[6], // created_at
                parseInt(convertedValues[7] || '0') // is_admin
              ]
            );
            
            console.log(`✅ 遷移用戶: ${convertedValues[1]}`);
            
          } catch (insertError) {
            console.error(`⚠️ 跳過有問題的記錄 ${i + 1}:`, insertError.message);
          }
        }
      }

      console.log('✅ 資料遷移完成');
      
    } else {
      console.log('⚠️ 找不到 SQLite 備份檔案，只建立表格結構');
    }

    // 4. 驗證遷移結果
    console.log('🔍 驗證遷移結果...');
    const result = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`📊 PostgreSQL 中的用戶數量: ${result.rows[0].count}`);
    
    const users = await client.query('SELECT id, username, is_admin FROM users ORDER BY id');
    console.log('👥 遷移的用戶:');
    users.rows.forEach(user => {
      console.log(`  ${user.id}: ${user.username} ${user.is_admin ? '(管理員)' : ''}`);
    });

  } catch (error) {
    console.error('❌ 遷移失敗:', error);
  } finally {
    await client.end();
  }
}

// 執行遷移
migrate();