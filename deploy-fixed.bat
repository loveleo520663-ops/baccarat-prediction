@echo off
echo ============================================
echo    百家樂系統 - 修復版部署腳本
echo ============================================

REM 備份舊的 app.js
if exist server\app.js (
    echo 📁 備份原始 app.js...
    copy server\app.js server\app-backup.js
    echo ✅ 備份完成: server\app-backup.js
)

REM 替換 app.js
echo 🔄 替換 app.js 為修復版...
copy server\app-fixed.js server\app.js
echo ✅ app.js 已更新

REM Git 操作
echo 📤 提交修復版本到 Git...
git add .
git commit -m "修復 PostgreSQL 資料庫 API 相容性問題 - 簡化版"

echo 🚀 推送到 GitHub...
git push origin main

echo ============================================
echo    部署完成！
echo ============================================
echo.
echo 📋 修復內容：
echo    ✅ 修復資料庫 API 相容性問題
echo    ✅ 簡化資料庫初始化流程
echo    ✅ 改善錯誤處理機制
echo    ✅ 添加健康檢查端點
echo.
echo 🌐 Render 會自動部署新版本
echo 📊 請檢查部署狀態: https://dashboard.render.com
echo.
echo 🔑 管理員登入資訊：
echo    用戶名: admin
echo    密碼: admin123
echo.

pause