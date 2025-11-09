# 🚀 Render 部署步驟指南 (使用 Blueprint)

## 📋 部署步驟

### 步驟 1: 刪除現有的 Web Service (如需要)

如果你已經有 `baccarat-prediction-nkww` 服務:

1. 前往 [Render Dashboard](https://dashboard.render.com/)
2. 找到 `baccarat-prediction-nkww` 服務
3. 點擊進入服務詳情頁面
4. 滾動到最底部,點擊 **Settings**
5. 找到 **Delete Web Service** 按鈕
6. 確認刪除

> ⚠️ **注意**: 如果你不想刪除現有服務,可以保留它,新的 Blueprint 部署會創建一個新的服務名稱為 `baccarat-prediction`

---

### 步驟 2: 使用 Blueprint 部署

1. **進入 Render Dashboard**
   - 前往 https://dashboard.render.com/

2. **創建新的 Blueprint**
   - 點擊右上角 **New +** 按鈕
   - 選擇 **Blueprint**

3. **連接 GitHub Repository**
   - 選擇你的 GitHub 帳號
   - 找到並選擇 `baccarat-prediction` repository
   - 點擊 **Connect**

4. **Blueprint 配置**
   - Render 會自動讀取 `render.yaml`
   - 你會看到:
     - ✅ **Database**: `baccarat-db` (PostgreSQL)
     - ✅ **Web Service**: `baccarat-prediction`
   - 確認配置無誤

5. **開始部署**
   - 點擊 **Apply** 按鈕
   - Render 會自動:
     - 創建 PostgreSQL 資料庫
     - 創建 Web Service
     - 設定環境變數 `DATABASE_URL`
     - 部署應用程式

---

### 步驟 3: 等待部署完成

部署過程約需要 **5-10 分鐘**:

1. **資料庫創建** (約 2-3 分鐘)
   - 狀態會顯示 "Creating..."
   - 完成後變成 "Available"

2. **Web Service 部署** (約 3-5 分鐘)
   - 安裝依賴 (`npm ci`)
   - 構建應用
   - 啟動服務

3. **查看 Logs**
   - 點擊 Web Service
   - 進入 **Logs** 分頁
   - 應該看到:
   ```
   🔄 初始化資料庫...
   ✅ PostgreSQL 資料庫連接池已建立
   ✅ 資料庫連接測試成功
   ✅ 已建立預設管理員帳號 (admin/admin123)
   ✅ 資料表建立完成
   ✅ 資料庫初始化完成
   🚀 伺服器運行在: http://localhost:10000
   📊 使用 PostgreSQL 資料庫
   ```

---

### 步驟 4: 獲取新的 URL

部署完成後:

1. 在 Web Service 頁面找到你的新 URL
2. 格式類似: `https://baccarat-prediction.onrender.com`
3. 或者: `https://baccarat-prediction-xxxx.onrender.com`

---

### 步驟 5: 測試應用

#### 5.1 檢查健康狀態

訪問: `https://你的URL/health`

應該看到:
```json
{
  "status": "ok",
  "database": "postgresql"
}
```

#### 5.2 測試登入

使用預設管理員帳號:
- **用戶名**: `admin`
- **密碼**: `admin123`

訪問: `https://你的URL/login`

---

## 🔧 環境變數說明

Blueprint 會自動設定以下環境變數:

| 變數名 | 說明 | 來源 |
|--------|------|------|
| `NODE_ENV` | 運行環境 | 固定值: `production` |
| `JWT_SECRET` | JWT 加密密鑰 | Render 自動生成 |
| `DATABASE_URL` | PostgreSQL 連接字串 | 自動從 `baccarat-db` 獲取 |

---

## 📊 資料庫資訊

### 自動創建的資料表:

1. **users** - 用戶表
   ```sql
   - id (SERIAL PRIMARY KEY)
   - username (VARCHAR(50) UNIQUE)
   - password (VARCHAR(255))
   - is_admin (INTEGER DEFAULT 0)
   - created_at (TIMESTAMP)
   ```

2. **predictions** - 預測記錄表
   ```sql
   - id (SERIAL PRIMARY KEY)
   - user_id (INTEGER)
   - game_data (TEXT)
   - prediction_result (TEXT)
   - created_at (TIMESTAMP)
   ```

3. **license_keys** - 金鑰表
   ```sql
   - id (SERIAL PRIMARY KEY)
   - key_code (VARCHAR(100) UNIQUE)
   - user_id (INTEGER)
   - created_at (TIMESTAMP)
   - activated_at (TIMESTAMP)
   - expires_at (TIMESTAMP)
   - is_active (INTEGER DEFAULT 1)
   ```

### 預設管理員帳號:
- **用戶名**: `admin`
- **密碼**: `admin123`
- **權限**: 管理員

---

## ⚠️ 常見問題

### Q1: 部署失敗怎麼辦?
**A**: 
1. 檢查 Logs 中的錯誤訊息
2. 確認 `render.yaml` 格式正確
3. 確認 GitHub repository 已正確推送最新代碼

### Q2: 資料庫連接失敗?
**A**: 
1. 確認資料庫狀態為 "Available"
2. 檢查 Web Service 的環境變數中是否有 `DATABASE_URL`
3. 確認資料庫和 Web Service 在同一個 Region (Singapore)

### Q3: 如何查看資料庫內容?
**A**: 
1. 進入 PostgreSQL 資料庫頁面
2. 點擊 **Connect** → **External Connection**
3. 使用提供的連接資訊,用 pgAdmin 或其他工具連接

### Q4: 如何更新代碼?
**A**: 
1. 修改代碼並推送到 GitHub
2. Render 會自動偵測並重新部署
3. 或手動點擊 **Manual Deploy** → **Deploy latest commit**

### Q5: Free Plan 有什麼限制?
**A**: 
- Web Service: 750 小時/月
- PostgreSQL: 1GB 儲存空間
- 閒置 15 分鐘後會休眠
- 訪問時會自動喚醒 (約需 30 秒)

---

## 🎉 部署成功檢查清單

- [ ] 資料庫狀態顯示 "Available"
- [ ] Web Service 狀態顯示 "Live"
- [ ] `/health` 端點回應正常
- [ ] Logs 顯示資料庫初始化成功
- [ ] 可以使用 `admin/admin123` 登入
- [ ] 登入後可以正常使用系統

---

## 📞 需要幫助?

如果遇到問題:
1. 查看 Render Logs
2. 檢查 GitHub Actions (如有)
3. 確認所有檔案都已推送到 GitHub
4. 聯繫我協助解決

---

**祝部署順利!** 🚀
