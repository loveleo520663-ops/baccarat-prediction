const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database/baccarat_new.db');
const dumpPath = path.join(__dirname, 'database/dump.sql');

console.log('🔄 開始導出 SQLite 資料...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ 無法連接資料庫:', err.message);
        process.exit(1);
    }
    
    console.log('✅ 已連接到資料庫');
});

// 獲取所有表格名稱
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('❌ 無法獲取表格列表:', err);
        process.exit(1);
    }
    
    let sqlDump = '-- SQLite 資料庫備份\n-- 生成時間: ' + new Date().toISOString() + '\n\n';
    
    let processedTables = 0;
    
    tables.forEach(table => {
        const tableName = table.name;
        
        // 獲取建表語句
        db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`, (err, result) => {
            if (err) {
                console.error(`❌ 無法獲取表 ${tableName} 的結構:`, err);
                return;
            }
            
            sqlDump += `-- 表結構: ${tableName}\n`;
            sqlDump += `DROP TABLE IF EXISTS ${tableName};\n`;
            sqlDump += `${result.sql};\n\n`;
            
            // 獲取表數據
            db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                if (err) {
                    console.error(`❌ 無法獲取表 ${tableName} 的資料:`, err);
                    return;
                }
                
                if (rows.length > 0) {
                    sqlDump += `-- 表資料: ${tableName}\n`;
                    
                    // 獲取欄位名稱
                    const columns = Object.keys(rows[0]);
                    
                    rows.forEach(row => {
                        const values = columns.map(col => {
                            const val = row[col];
                            if (val === null) return 'NULL';
                            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                            return val;
                        });
                        
                        sqlDump += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
                    });
                    
                    sqlDump += '\n';
                }
                
                processedTables++;
                if (processedTables === tables.length) {
                    // 所有表格處理完成，寫入檔案
                    fs.writeFileSync(dumpPath, sqlDump);
                    console.log(`✅ 資料庫備份完成: ${dumpPath}`);
                    console.log(`📊 處理了 ${tables.length} 個表格`);
                    
                    // 顯示備份內容摘要
                    console.log('\n📋 備份摘要:');
                    tables.forEach(table => {
                        console.log(`  - 表格: ${table.name}`);
                    });
                    
                    db.close();
                    process.exit(0);
                }
            });
        });
    });
    
    if (tables.length === 0) {
        console.log('⚠️ 資料庫中沒有找到表格');
        db.close();
        process.exit(0);
    }
});