# 百家樂預測系統 - Render 部署指南

## 🚀 部署到 Render

### 1. 準備工作

這個專案現在支援兩種資料庫：
- **SQLite** (本地開發)
- **PostgreSQL** (生產環境，推薦用於 Render)

### 2. 在 Render 上部署

#### 步驟 1: 推送代碼到 GitHub
```bash
git add .
git commit -m "準備部署到 Render 使用 PostgreSQL"
git push origin main
```

#### 步驟 2: 在 Render 上創建服務
1. 登入 [Render Dashboard](https://dashboard.render.com/)
2. 點擊 "New +" -> "Blueprint"
3. 連接你的 GitHub 倉庫
4. Render 會自動讀取 `render.yaml` 配置

#### 步驟 3: 配置會自動完成
`render.yaml` 已經包含了：
- PostgreSQL 資料庫服務 (`baccarat-db`)
- Web 服務配置
- 環境變數設定

### 3. 環境變數說明

系統會自動設定以下環境變數：
- `NODE_ENV=production`
- `DB_TYPE=postgres` (自動使用 PostgreSQL)
- `DATABASE_URL` (來自 Render PostgreSQL 服務)
- `JWT_SECRET` (自動生成)

### 4. 資料庫遷移

部署後第一次啟動時：

1. 訪問你的 Render 應用 URL
2. 應用會自動創建必要的表格
3. 如果需要導入現有資料，可以使用遷移腳本：

```bash
# 在 Render 控制台中執行
node migrate-to-postgres.js
```

### 5. 預設管理員帳號

系統會自動創建管理員帳號：
- 用戶名: `admin`
- 密碼: `admin123`

**重要**: 部署後請立即修改管理員密碼！

### 6. 訪問管理後台

部署完成後，訪問：
- 主頁: `https://你的應用名稱.onrender.com/`
- 管理後台: `https://你的應用名稱.onrender.com/admin-new`

### 7. 本地測試 PostgreSQL (可選)

如果你想在本地測試 PostgreSQL：

```bash
# 使用 Docker 啟動 PostgreSQL
docker run --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# 設定環境變數
set DB_TYPE=postgres
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=baccarat
set DB_USER=postgres
set DB_PASSWORD=password

# 運行遷移
node migrate-to-postgres.js

# 啟動應用
npm start
```

## 🔧 故障排除

### 問題 1: 資料庫連接失敗
- 檢查 Render 資料庫服務是否正常運行
- 確認 `DATABASE_URL` 環境變數是否正確設定

### 問題 2: 管理後台無法載入用戶
- 檢查資料庫表是否正確創建
- 查看 Render 日誌中的錯誤訊息

### 問題 3: 登入失敗
- 確認管理員帳號是否存在
- 檢查 JWT_SECRET 是否設定

## 📱 功能特色

- ✅ 支援 SQLite (開發) 和 PostgreSQL (生產)
- ✅ 自動資料庫遷移
- ✅ 完整的用戶管理系統
- ✅ 金鑰序號管理
- ✅ 響應式管理介面
- ✅ JWT 認證系統

## 🔒 安全性

- 密碼使用 bcrypt 加密
- JWT Token 認證
- 管理員權限驗證
- 請求頻率限制

## 🆘 需要幫助？

如果部署過程中遇到問題：
1. 檢查 Render 服務日誌
2. 確認所有環境變數設定正確
3. 驗證資料庫服務狀態