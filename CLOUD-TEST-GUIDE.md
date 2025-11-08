# 🌐 百家樂系統 - 雲端測試指南

## 🚀 最新部署狀態
- **提交**: eea2b5d - 修復認證路由 API 相容性
- **修復內容**: 
  - ✅ 修復 app.js 資料庫初始化問題
  - ✅ 修復 auth.js 登入路由從回調式改為 async/await
  - ✅ 修復註冊路由資料庫適配器相容性
- **部署時間**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## 📋 測試步驟

### 1. 等待 Render 自動部署 (2-3 分鐘)
前往 Render Dashboard 查看部署狀態:
- 網址: https://dashboard.render.com
- 查看您的服務是否顯示 "Live" 狀態
- 檢查部署日誌確認無錯誤

### 2. 測試雲端健康檢查
在瀏覽器中訪問: `https://您的應用網址/health`

**預期回應**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-20T...",
  "uptime": 123.456,
  "environment": "production",
  "database": "connected",
  "dbType": "postgres"
}
```

### 3. 測試管理員登入
1. 訪問: `https://您的應用網址/login`
2. 輸入帳號資訊:
   - **用戶名**: `admin`
   - **密碼**: `admin123`
3. 點擊登入

**預期結果**: 成功登入並跳轉到遊戲頁面

### 4. 測試管理後台
1. 訪問: `https://您的應用網址/admin-new`
2. 使用相同的管理員帳號登入
3. 檢查是否能正常顯示用戶統計、金鑰管理等功能

## 🔧 如果仍有問題

### 檢查項目 1: Render 部署日誌
在 Render Dashboard → 您的服務 → Logs 中查找:
```
✅ PostgreSQL 用戶表已確保存在
✅ 管理員帳號確保存在
✅ 資料庫連接正常
🚀 伺服器運行在埠 XXXX
```

### 檢查項目 2: 環境變數
確保 Render 中這些環境變數正確:
```
NODE_ENV=production
DB_TYPE=postgres
DATABASE_URL=postgresql://... (自動設定)
JWT_SECRET=your-secret-key
```

### 檢查項目 3: 瀏覽器網路面板
1. 按 F12 開啟開發者工具
2. 切換到 Network 分頁
3. 嘗試登入並查看網路請求
4. 檢查 `/api/auth/login` 請求的回應

## 🆘 故障排除

### 問題: "網路連接錯誤"
**可能原因**:
1. Render 服務尚未完全啟動
2. PostgreSQL 服務連接問題
3. 環境變數配置錯誤

**解決方案**:
1. 等待 2-3 分鐘讓服務完全啟動
2. 檢查 `/health` 端點確認服務狀態
3. 查看 Render 部署日誌

### 問題: "用戶名或密碼錯誤"
**確認事項**:
- 用戶名: `admin` (全小寫)
- 密碼: `admin123` (全小寫)
- 檢查 PostgreSQL 中是否有管理員記錄

## 📞 下一步
測試完成後請告知結果:
1. 健康檢查回應
2. 登入測試結果
3. 任何錯誤訊息或截圖

---
**注意**: 所有測試都應在雲端進行，無需本地服務器