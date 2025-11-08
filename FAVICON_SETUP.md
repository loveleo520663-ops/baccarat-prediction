# 🎨 Favicon 設定指南

## 📝 步驟說明

### 1️⃣ 準備圖片

您需要將百家樂圖片保存為以下格式之一:
- **PNG 格式** (推薦): `favicon.png`
- **ICO 格式**: `favicon.ico`

**建議尺寸:**
- 32x32 像素 (最小)
- 64x64 像素 (推薦)
- 128x128 像素 (高解析度)

### 2️⃣ 保存圖片位置

請將圖片保存到:
```
c:\Users\9898EA\Desktop\新百家樂 - 複製\public\images\favicon.png
```

### 3️⃣ 如果圖片名稱不同

如果您的圖片檔名不是 `favicon.png`,請執行以下操作:

**方法 A: 重新命名圖片**
將圖片重新命名為 `favicon.png`

**方法 B: 修改 HTML 檔案**
如果圖片名稱是 `baccarat-icon.png`,則需要修改所有 HTML 的這一行:
```html
<link rel="icon" type="image/png" href="/images/favicon.png">
```
改為:
```html
<link rel="icon" type="image/png" href="/images/baccarat-icon.png">
```

### 4️⃣ 測試 Favicon

保存圖片後,在本地測試:

```powershell
# 啟動本地伺服器
npm start
```

然後訪問:
```
http://localhost:8000/login
```

查看瀏覽器標籤頁是否顯示您的百家樂圖示。

### 5️⃣ 部署到 Render

確認本地顯示正常後:

```powershell
# 提交變更
git add .
git commit -m "添加百家樂 favicon 圖示"
git push origin main
```

## 🎯 已更新的頁面

以下頁面已添加 favicon 支援:
- ✅ login.html (登入頁面)
- ✅ dashboard.html (主控台)
- ✅ admin.html (管理員後台)
- ✅ prediction.html (預測功能)

## 🔧 故障排除

### 問題 1: 圖示不顯示
**解決方法:**
1. 清除瀏覽器快取 (Ctrl + Shift + Delete)
2. 強制重新整理 (Ctrl + F5)
3. 確認圖片路徑正確

### 問題 2: 圖片檔案過大
**解決方法:**
1. 使用線上工具壓縮圖片:
   - https://tinypng.com/
   - https://imagecompressor.com/
2. 建議檔案大小小於 100KB

### 問題 3: 圖片格式不支援
**解決方法:**
使用以下格式之一:
- PNG (推薦)
- ICO
- SVG
- JPEG

## 📱 手機版圖示

已添加 Apple Touch Icon 支援,在 iPhone/iPad 上將網站加入主畫面時會顯示此圖示:
```html
<link rel="apple-touch-icon" href="/images/favicon.png">
```

## 🎨 進階設定 (選用)

如果想要不同尺寸的圖示:

```html
<!-- 多尺寸 favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="64x64" href="/images/favicon-64x64.png">
<link rel="icon" type="image/png" sizes="128x128" href="/images/favicon-128x128.png">
```

---

**現在請將您的百家樂圖片保存到指定位置,然後測試看看!** 🎲
