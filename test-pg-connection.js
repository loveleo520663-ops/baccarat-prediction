// PostgreSQL 連接測試腳本
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://baccarat_user:a7GFINntcsuKCR0qLtux6m95rer8f0db@dpg-d478quhr0fns73f9vis0-a/baccarat_udz3';

console.log('🔄 開始測試 PostgreSQL 連接...\n');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    // 測試連接
    console.log('1️⃣ 測試資料庫連接...');
    const client = await pool.connect();
    console.log('✅ 資料庫連接成功!\n');

    // 測試查詢
    console.log('2️⃣ 測試基本查詢...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ 查詢成功!');
    console.log(`   當前時間: ${result.rows[0].current_time}\n`);

    // 檢查現有資料表
    console.log('3️⃣ 檢查現有資料表...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tables.rows.length > 0) {
      console.log('✅ 找到以下資料表:');
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('ℹ️  尚未建立任何資料表');
    }

    client.release();
    console.log('\n🎉 所有測試通過!');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('\n詳細錯誤:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
