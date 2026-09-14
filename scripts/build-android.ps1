# Android 独立脱机 APK 构建脚本
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# 优先使用环境变量中已配置的路径；未配置时回退到常见安装位置，可按需修改
if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17"
}
if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}
$env:PATH = "$($env:JAVA_HOME)\bin;$($env:ANDROID_HOME)\platform-tools;$($env:PATH)"

Write-Host "[1/4] 同步前端资源到 Android 工程..." -ForegroundColor Cyan
Push-Location $root
npm run build
npx.cmd cap sync android
Pop-Location

Write-Host "[2/4] 执行 Gradle 构建 APK..." -ForegroundColor Cyan
Push-Location (Join-Path $root "android")
cmd.exe /c "gradlew.bat assembleDebug"
Pop-Location

$srcApk = Join-Path $root "android\app\build\outputs\apk\debug\app-debug.apk"
$destApk = Join-Path $root "release\游戏王AI制卡器-v2.0.0.apk"

if (Test-Path $srcApk) {
    New-Item -ItemType Directory -Path (Join-Path $root "release") -Force | Out-Null
    Copy-Item $srcApk $destApk -Force
    Write-Host "✅ Android 独立 APK 构建成功: $destApk" -ForegroundColor Green
} else {
    Write-Host "❌ 未找到生成的 APK 文件" -ForegroundColor Red
}
