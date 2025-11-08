# Render PostgreSQL 設定指南

## 🎯 完整設定步驟

### 1️⃣ 在 Render Dashboard 設定資料庫

1. **登入 Render**
   - 前往: https://dashboard.render.com
   - 使用您的帳號登入

2. **確認資料庫存在**
   - 在左側選單找到 "PostgreSQL"
   - 確認 `baccarat-db` 已建立
   - 如果沒有,點擊 "New +" → "PostgreSQL" 建立

3. **獲取資料庫連接資訊**
   - 點擊 `baccarat-db`
   - 在 "Info" 或 "Connect" 標籤
   - 複製 **Internal Database URL**
   - 格式: `postgresql://user:password@host/database`

### 2️⃣ 設定 Web Service 環境變數

#### 方法 A: 使用 render.yaml (推薦)
已經在 `render.yaml` 中設定好了,Render 會自動連接資料庫。

#### 方法 B: 手動設定
1. 在 Render Dashboard 找到 `baccarat-prediction` Web Service
2. 點擊 "Environment"
3. 添加環境變數:
   ```
   DATABASE_URL = [貼上您的 Internal Database URL]
   ```

### 3️⃣ 部署到 Render

#### 選項 1: 使用 Git 推送 (推薦)
```powershell
# 1. 提交變更
git add .
git commit -m "添加 PostgreSQL 支援"

# 2. 推送到 GitHub
git push origin main
```

Render 會自動偵測變更並重新部署。

#### 選項 2: 手動觸發部署
1. 在 Render Dashboard 找到您的 Web Service
2. 點擊 "Manual Deploy" → "Deploy latest commit"

### 4️⃣ 驗證部署

1. **查看部署日誌**
   - 在 Render Dashboard → "Logs"
   - 應該看到:
     ```
     🔄 初始化資料庫...
     ✅ PostgreSQL 資料庫連接池已建立
     ✅ 資料表建立完成
     ✅ 已建立預設管理員帳號 (admin/admin123)
     🚀 伺服器運行在...
     ```

2. **測試健康檢查**
   - 訪問: `https://your-app.onrender.com/health`
   - 應該返回: `{"status":"ok","database":"postgresql"}`

3. **測試登入**
   - 訪問: `https://your-app.onrender.com/login`
   - 使用預設帳號登入:
     - 用戶名: `admin`
     - 密碼: `admin123`

## 📊 資料庫管理

### 連接到資料庫
使用 External Database URL 可以從本地連接:

```bash
psql [External Database URL]
```

### 查看資料表
```sql
-- 列出所有資料表
\dt

-- 查看用戶
SELECT * FROM users;

-- 查看預測記錄
SELECT * FROM predictions;
```

## 🔧 故障排除

### 問題 1: 部署失敗 - "DATABASE_URL is not defined"
**解決方法:**
1. 確認 `render.yaml` 中的資料庫名稱與實際資料庫名稱一致
2. 或手動在 Environment 頁面添加 `DATABASE_URL`

### 問題 2: 資料庫連接錯誤
**解決方法:**
1. 確認資料庫和 Web Service 在同一區域 (Singapore)
2. 使用 Internal Database URL 而非 External
3. 確認 SSL 設定正確 (`ssl: { rejectUnauthorized: false }`)

### 問題 3: 無法登入
**解決方法:**
1. 查看日誌確認資料表已建立
2. 使用資料庫客戶端確認 admin 用戶存在
3. 重新部署觸發資料表初始化

## 📝 本地測試 PostgreSQL

如果您想在本地測試 PostgreSQL 版本:

```powershell
# 1. 安裝依賴
npm install

# 2. 設定環境變數
$env:DATABASE_URL = "postgresql://localhost/baccarat_test"

# 3. 啟動伺服器
node pg-server.js
```

## 🎉 完成!

現在您的應用程式已經:
✅ 使用 PostgreSQL 資料庫
✅ 資料永久保存 (不會在重啟時丟失)
✅ 自動部署到 Render
✅ 有預設管理員帳號

## 🔐 重要提醒

**記得修改預設密碼!**
登入後請立即在管理後台修改 admin 密碼,或建立新的管理員帳號。
