# Android 独立脱机 APK 构建脚本
#
# 用法：
#   .\build-android.ps1            # 本地自用打包（保留商业字体）
#   .\build-android.ps1 -Public    # 公开发布打包（剔除商业字体，输出到 release\public）
param([switch]$Public)

$ErrorActionPreference = "Stop"
# 强制 UTF-8 输出，避免中文路径/文件名在 PowerShell 5.1 下被按 ANSI 解码而报「非法字符」
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

$root = Split-Path -Parent $PSScriptRoot

# 版本号统一取自 package.json，避免脚本内硬编码导致与产品版本脱节
# 注意：必须显式按 UTF-8 读取，Windows PowerShell 5.1 默认按 ANSI 解码会破坏中文导致 JSON 解析失败
$pkgJson = [System.IO.File]::ReadAllText((Join-Path $root "package.json"), [System.Text.Encoding]::UTF8)
$appVersion = ($pkgJson | ConvertFrom-Json).version

# 优先使用环境变量中已配置的路径；未配置时回退到常见安装位置，可按需修改
if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17"
}
if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}
$env:PATH = "$($env:JAVA_HOME)\bin;$($env:ANDROID_HOME)\platform-tools;$env:PATH"

# 公开发布模式下剔除商业字体，且产物落到 release\public，避免覆盖本地自用包
$outDir = if ($Public) { Join-Path $root "release\public" } else { Join-Path $root "release" }
$modeLabel = if ($Public) { "公开发布（无商业字体）" } else { "本地自用（含商业字体）" }

Write-Host "[1/4] 同步前端资源到 Android 工程... ($modeLabel)" -ForegroundColor Cyan
Push-Location $root
if ($Public) { npm run build:public } else { npm run build }
npx.cmd cap sync android
Pop-Location

Write-Host "[2/4] 执行 Gradle 构建 APK..." -ForegroundColor Cyan
Push-Location (Join-Path $root "android")
cmd.exe /c "gradlew.bat assembleDebug"
Pop-Location

$srcApk = Join-Path $root "android\app\build\outputs\apk\debug\app-debug.apk"
$destApk = Join-Path $outDir "游戏王AI制卡器-v$appVersion.apk"

if (Test-Path $srcApk) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    # 用 .NET API 拷贝，规避 Windows PowerShell 对中文目标路径的编码问题
    [System.IO.File]::Copy($srcApk, $destApk, $true)
    Write-Host "✅ Android 独立 APK 构建成功 (v$appVersion, $modeLabel): $destApk" -ForegroundColor Green
} else {
    Write-Host "❌ 未找到生成的 APK 文件" -ForegroundColor Red
    exit 1
}
