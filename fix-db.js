const fs = require('fs');
const path = require('path');

// 修復所有路由文件中的資料庫連線
const files = [
  'server/routes/admin.js',
  'server/routes/prediction.js', 
  'server/routes/license.js'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 移除舊的資料庫匯入和連線
    content = content.replace(/const sqlite3 = require\('sqlite3'\)\.verbose\(\);\s*/g, '');
    content = content.replace(/const path = require\('path'\);\s*/g, '');
    content = content.replace(/const dbPath = path\.join\(__dirname, '\.\.\/\.\.\/database\/baccarat\.db'\);\s*/g, '');
    content = content.replace(/const db = new sqlite3\.Database\(dbPath\);\s*/g, '');
    content = content.replace(/db\.close\(\);\s*/g, '');
    
    // 添加新的資料庫匯入
    if (!content.includes("const db = require('../database');")) {
      const firstRequire = content.indexOf("const express = require('express');");
      if (firstRequire !== -1) {
        const afterExpress = content.indexOf('\n', firstRequire) + 1;
        content = content.slice(0, afterExpress) + 
                 "const db = require('../database');\n" + 
                 content.slice(afterExpress);
      }
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`已修復: ${filePath}`);
  }
});

console.log('資料庫連線修復完成！');