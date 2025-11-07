@echo off
echo 🚀 開始更新和部署...
echo.

echo 📦 添加所有更改到Git...
git add .

echo 📝 提交更改...
set /p commit_msg="請輸入更新說明 (或按Enter使用預設): "
if "%commit_msg%"=="" set commit_msg=功能更新和改進

git commit -m "%commit_msg%"

echo 🌐 推送到GitHub...
git push origin main

echo.
echo ✅ 部署完成！
echo 🌍 請稍等1-2分鐘，然後訪問: https://baccarat-prediction-nkww.onrender.com/
echo.
pause