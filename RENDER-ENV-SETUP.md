# 🔧 Render 環境變數設定指南

## 📋 必要的環境變數檢查

### 方法 1: 在 Render Dashboard 手動設定

1. **登入 Render Dashboard**: https://dashboard.render.com
2. **選擇您的服務**: `baccarat-prediction`
3. **點擊 "Environment"**
4. **確保有以下環境變數**:

```
NODE_ENV = production
DB_TYPE = postgres  
DATABASE_URL = postgresql://baccarat_user:密碼@主機:5432/baccarat
JWT_SECRET = 任何長字串 (例如: your-super-secret-jwt-key-2024)
```

### 方法 2: 檢查 PostgreSQL 連接字串

1. **在 Render Dashboard**
2. **點擊您的 PostgreSQL 服務**: `baccarat-db`
3. **複製 "External Database URL"**
4. **在 Web 服務的環境變數中設定**:
   - 變數名: `DATABASE_URL`
   - 值: 剛複製的連接字串

### 方法 3: 完整重新設定

如果上述方法不行，請按以下步驟重新設定:

#### A. PostgreSQL 服務檢查
```
服務名稱: baccarat-db
資料庫名稱: baccarat
用戶名: baccarat_user
狀態: Available (綠色)
```

#### B. Web 服務環境變數 (手動設定)
```
NODE_ENV = production
DB_TYPE = postgres
JWT_SECRET = baccarat-jwt-secret-2024-super-long-key
DATABASE_URL = [從 PostgreSQL 服務複製的連接字串]
```

#### C. 重新部署
設定完環境變數後:
1. 點擊 "Manual Deploy" 重新部署
2. 查看部署日誌確認環境變數載入

## 🔍 驗證步驟

### 1. 檢查部署日誌
在日誌中應該看到:
```
🗄️ 使用資料庫類型: postgres
✅ PostgreSQL 用戶表已確保存在  
✅ 管理員帳號確保存在: admin / password
🚀 伺服器運行在埠 XXXX
```

### 2. 測試健康檢查
訪問: https://baccarat-prediction-nkww.onrender.com/health
應該顯示:
```json
{
  "status": "OK",
  "database": "connected", 
  "dbType": "postgres"
}
```

### 3. 如果仍顯示 SQLite
如果健康檢查顯示 `"dbType": "sqlite"`，表示:
- `DB_TYPE=postgres` 環境變數沒有正確設定
- 需要重新設定並重新部署

## 💡 常見問題

**Q: DATABASE_URL 格式是什麼?**
A: `postgresql://username:password@hostname:port/database`

**Q: 為什麼還是連接到 SQLite?**  
A: `DB_TYPE` 環境變數沒有設定為 `postgres`

**Q: JWT_SECRET 要設定什麼值?**
A: 任何長字串，例如: `baccarat-jwt-secret-key-2024-very-long-string`

---

**請完成環境變數設定後告訴我結果！**