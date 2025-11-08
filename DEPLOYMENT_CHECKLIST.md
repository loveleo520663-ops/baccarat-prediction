# 🚀 Render 部署檢查清單

## ✅ 已完成的步驟

- [x] 安裝 PostgreSQL 套件 (`pg`)
- [x] 建立 PostgreSQL 資料庫連接模組 (`server/database-pg.js`)
- [x] 建立 PostgreSQL 伺服器 (`pg-server.js`)
- [x] 更新 `render.yaml` 連接資料庫
- [x] 提交並推送到 GitHub

## 📋 接下來要做的事

### 1. 監控 Render 部署狀態

前往 Render Dashboard:
👉 https://dashboard.render.com/web/baccarat-prediction

在 "Events" 或 "Logs" 頁面查看部署進度。

### 2. 檢查部署日誌

✅ **成功的日誌應該包含:**
```
🔄 初始化資料庫...
✅ PostgreSQL 資料庫連接池已建立
✅ 資料表建立完成
✅ 已建立預設管理員帳號 (admin/admin123)
🚀 伺服器運行在...
📊 使用 PostgreSQL 資料庫
```

❌ **如果看到錯誤:**
- `DATABASE_URL is not defined` → 檢查環境變數設定
- `Connection refused` → 確認資料庫在同一區域
- `SSL error` → 已在程式碼中處理,不應該出現

### 3. 測試部署結果

部署完成後 (通常 3-5 分鐘):

#### A. 健康檢查
```
https://baccarat-prediction.onrender.com/health
```
應該返回: `{"status":"ok","database":"postgresql"}`

#### B. 訪問網站
```
https://baccarat-prediction.onrender.com/login
```

#### C. 測試登入
- **用戶名**: `admin`
- **密碼**: `admin123`

### 4. 驗證資料庫

如果想直接查看資料庫內容:

1. 在 Render Dashboard 找到 `baccarat-db`
2. 點擊 "Connect" 標籤
3. 複製 External Database URL
4. 使用資料庫客戶端連接 (如 DBeaver, pgAdmin, 或 psql)

## 🔧 如果部署失敗

### 常見問題與解決方法

#### 問題 1: render.yaml 中找不到資料庫
**解決方法:**
1. 確認資料庫名稱是 `baccarat-db`
2. 如果不是,修改 `render.yaml` 中的 `fromDatabase.name`

#### 問題 2: 啟動命令錯誤
**解決方法:**
確認 `render.yaml` 的 `startCommand` 是:
```yaml
startCommand: node pg-server.js
```

#### 問題 3: 依賴安裝失敗
**解決方法:**
檢查 `package.json` 確保包含:
```json
"pg": "^8.11.3"
```

## 📊 資料庫狀態確認

### 方法 1: 透過應用程式 API
```bash
# 健康檢查
curl https://baccarat-prediction.onrender.com/health

# 獲取用戶列表 (需要 admin token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://baccarat-prediction.onrender.com/api/admin/users
```

### 方法 2: 直接連接資料庫
使用 External Database URL 連接並執行:
```sql
-- 列出所有資料表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- 查看用戶
SELECT id, username, is_admin, created_at FROM users;

-- 統計資料
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM predictions) as total_predictions;
```

## 🎯 預期結果

✅ **成功部署後:**
- 資料庫有 3 個資料表: `users`, `predictions`, `license_keys`
- 有 1 個預設管理員帳號
- 可以正常登入和使用系統
- 資料永久保存,不會在重啟後消失

## 📞 需要幫助?

如果遇到任何問題:
1. 查看 Render 部署日誌
2. 檢查資料庫連接狀態
3. 確認環境變數設定正確

---

**您的資料庫資訊:**
- Database: `baccarat_udz3`
- Host: `dpg-d478quhr0fns73f9vis0-a`
- Region: Singapore
- Plan: Free
