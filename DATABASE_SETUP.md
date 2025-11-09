# PostgreSQL 資料庫設定指南

## ❌ 目前問題
登入失敗是因為 Render 上的 PostgreSQL 資料庫沒有正確連接或初始化。

## ✅ 解決方案

### 步驟 1: 在 Render 建立 PostgreSQL 資料庫

1. 登入 [Render Dashboard](https://dashboard.render.com/)
2. 點擊 **New +** → 選擇 **PostgreSQL**
3. 設定資料庫:
   - **Name**: `baccarat-db` (或任何你喜歡的名稱)
   - **Database**: `baccarat`
   - **User**: `baccarat_user`
   - **Region**: 選擇與你的 Web Service 相同的區域
   - **Plan**: Free (免費方案)
4. 點擊 **Create Database**

### 步驟 2: 獲取資料庫連接字串

1. 資料庫建立後,進入資料庫詳情頁面
2. 找到 **Connections** 區塊
3. 複製 **Internal Database URL** (格式如下):
   ```
   postgresql://user:password@host/database
   ```

### 步驟 3: 設定環境變數

1. 回到你的 Web Service (`baccarat-prediction-nkww`)
2. 進入 **Environment** 分頁
3. 點擊 **Add Environment Variable**
4. 新增以下變數:
   ```
   Key: DATABASE_URL
   Value: [貼上你複製的 Internal Database URL]
   ```
5. 點擊 **Save Changes**

### 步驟 4: 重新部署

1. 儲存環境變數後,Render 會自動重新部署
2. 或者手動點擊 **Manual Deploy** → **Deploy latest commit**
3. 等待部署完成 (約 2-3 分鐘)

## 📋 檢查部署狀態

部署完成後,檢查 Logs:

```bash
# 應該看到這些訊息:
🔄 初始化資料庫...
✅ PostgreSQL 資料庫連接池已建立
✅ 資料庫連接測試成功
✅ 已建立預設管理員帳號 (admin/admin123)
✅ 資料表建立完成
✅ 資料庫初始化完成
🚀 伺服器運行在: http://localhost:10000
```

## 🔐 預設帳號

資料庫初始化成功後,會自動建立管理員帳號:

- **用戶名**: `admin`
- **密碼**: `admin123`

## 🧪 測試登入

使用以下 curl 命令測試:

```bash
curl -X POST https://baccarat-prediction-nkww.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

成功的回應:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "isAdmin": true
  }
}
```

## ⚠️ 常見問題

### Q: 如果忘記設定 DATABASE_URL 會怎樣?
A: 伺服器會顯示警告訊息但仍會啟動,所有資料庫操作都會失敗 (500 錯誤)

### Q: 如何查看資料庫連接狀態?
A: 訪問 `https://baccarat-prediction-nkww.onrender.com/health`
- 應該顯示: `{"status":"ok","database":"postgresql"}`

### Q: 資料庫初始化失敗怎麼辦?
A: 
1. 檢查 DATABASE_URL 是否正確
2. 確認 PostgreSQL 資料庫狀態為 "Available"
3. 查看 Render Logs 的錯誤訊息
4. 手動重新部署

## 🔄 如果已經有資料庫

如果你之前已經在 Render 建立過 PostgreSQL 資料庫:

1. 找到該資料庫
2. 複製 Internal Database URL
3. 在 Web Service 中設定 DATABASE_URL
4. 重新部署即可

## 📞 需要幫助?

如果按照以上步驟還是無法連接,請檢查:
- [ ] DATABASE_URL 環境變數是否正確設定
- [ ] PostgreSQL 資料庫狀態是否為 Available
- [ ] Web Service 和 Database 是否在同一個 Region
- [ ] Render Logs 中的錯誤訊息
