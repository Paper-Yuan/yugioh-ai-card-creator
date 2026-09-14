@echo off
chcp 65001 >nul
title 游戏王AI制卡器 - 服务控制台

echo ===================================================
echo           🎴 游戏王 AI 制卡器 - 本地版
echo ===================================================
echo.
echo [1/3] 检查运行环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 环境，请先安装 Node.js (v18+)
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [2/3] 正在启动后台服务...
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

echo [3/3] 服务正在运行中 (http://localhost:3000)...
echo [提示] 浏览器将在 2 秒内自动弹出。如未打开，请手动访问上述地址。
echo [提示] 关闭此控制台窗口即可停止服务。
echo ===================================================
echo.

node dist/web/server.js
pause
