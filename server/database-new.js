const sqlite3 = require('sqlite3').verbose();
const { Client, Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// 配置設定
const config = {
  // 資料庫類型 (sqlite 或 postgres)
  dbType: process.env.DB_TYPE || 'sqlite',
  
  // SQLite 配置
  sqlite: {
    path: path.join(__dirname, '../database/baccarat_new.db')
  },
  
  // PostgreSQL 配置
  postgres: {
    connectionString: process.env.DATABASE_URL,
    // 或分別設定
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'baccarat',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
};

let db = null;
let dbType = config.dbType;

console.log(`🗄️ 使用資料庫類型: ${dbType}`);

// SQLite 連接函數
function createSQLiteConnection() {
  const dbPath = config.sqlite.path;
  
  if (!fs.existsSync(dbPath)) {
    console.error('❌ SQLite 資料庫文件不存在:', dbPath);
    return null;
  }

  const sqliteDB = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ SQLite 連線失敗:', err.message);
    } else {
      console.log('✅ 已連接到 SQLite 資料庫:', dbPath);
      
      // 設置 WAL 模式以支援並發讀寫
      sqliteDB.run('PRAGMA journal_mode = WAL');
      sqliteDB.run('PRAGMA foreign_keys = ON');
    }
  });

  return sqliteDB;
}

// PostgreSQL 連接函數
function createPostgreSQLConnection() {
  let pgConfig;
  
  if (config.postgres.connectionString) {
    pgConfig = {
      connectionString: config.postgres.connectionString,
      ssl: config.postgres.ssl
    };
  } else {
    pgConfig = {
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      ssl: config.postgres.ssl
    };
  }

  const pool = new Pool(pgConfig);
  
  // 測試連接
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ PostgreSQL 連線失敗:', err.message);
    } else {
      console.log('✅ 已連接到 PostgreSQL 資料庫');
      release();
    }
  });

  return pool;
}

// 初始化資料庫連接
function initDatabase() {
  if (dbType === 'postgres') {
    db = createPostgreSQLConnection();
  } else {
    db = createSQLiteConnection();
  }
  
  return db;
}

// 統一的查詢介面
class DatabaseAdapter {
  constructor(db, type) {
    this.db = db;
    this.type = type;
  }

  // 執行查詢 (SELECT)
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.type === 'postgres') {
        this.db.query(sql, params, (err, result) => {
          if (err) reject(err);
          else resolve(result.rows);
        });
      } else {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }
    });
  }

  // 獲取單行
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.type === 'postgres') {
        this.db.query(sql, params, (err, result) => {
          if (err) reject(err);
          else resolve(result.rows[0] || null);
        });
      } else {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      }
    });
  }

  // 執行命令 (INSERT, UPDATE, DELETE)
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.type === 'postgres') {
        this.db.query(sql, params, (err, result) => {
          if (err) reject(err);
          else resolve({
            lastID: result.insertId,
            changes: result.rowCount
          });
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        });
      }
    });
  }
}

// 獲取資料庫實例
function getDB() {
  if (!db) {
    db = initDatabase();
  }
  return new DatabaseAdapter(db, dbType);
}

// 重新連接
function reconnect() {
  if (db) {
    if (dbType === 'postgres') {
      db.end();
    } else {
      db.close();
    }
  }
  return initDatabase();
}

// 關閉連接
function closeDB() {
  if (db) {
    if (dbType === 'postgres') {
      db.end();
    } else {
      db.close();
    }
    db = null;
  }
}

// 獲取原始資料庫連接 (用於舊版兼容)
function getRawDB() {
  return db;
}

module.exports = {
  getDB,
  reconnect,
  closeDB,
  getRawDB,
  dbType,
  config
};