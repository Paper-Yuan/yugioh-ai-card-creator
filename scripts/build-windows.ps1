# Windows 原生无Electron桌面客户端与安装包构建脚本
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# 版本号统一取自 package.json，避免脚本内硬编码导致与产品版本脱节
# 注意：必须显式按 UTF-8 读取，Windows PowerShell 5.1 默认按 ANSI 解码会破坏中文导致 JSON 解析失败
$root = Split-Path -Parent $PSScriptRoot
$pkgJson = [System.IO.File]::ReadAllText((Join-Path $root "package.json"), [System.Text.Encoding]::UTF8)
$appVersion = ($pkgJson | ConvertFrom-Json).version

Write-Host "[1/5] 编译前端与静态资源..." -ForegroundColor Cyan
npm run build

Write-Host "[2/5] 准备临时产物目录..." -ForegroundColor Cyan
$binDir = "release\windows-bin"
$payloadDir = "release\temp-payload"
$setupOut = "release\游戏王AI制卡器-v$appVersion-Setup.exe"

New-Item -ItemType Directory -Path $binDir -Force | Out-Null
if (Test-Path $payloadDir) { Remove-Item -Recurse -Force $payloadDir }
New-Item -ItemType Directory -Path "$payloadDir\app" -Force | Out-Null
New-Item -ItemType Directory -Path "$binDir\app" -Force | Out-Null

Write-Host "[3/5] 编译 C# 原生运行器与卸载器..." -ForegroundColor Cyan
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /target:winexe /win32icon:assets\icon.ico "/out:$binDir\AppLauncher.exe" /r:System.Windows.Forms.dll,System.Drawing.dll,System.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll src\desktop\AppLauncher.cs
if ($LASTEXITCODE -ne 0) { throw "AppLauncher 编译失败" }
Copy-Item "$binDir\AppLauncher.exe" "$binDir\游戏王AI制卡器.exe" -Force

& $csc /target:winexe /win32icon:assets\icon.ico "/out:$binDir\Uninstall.exe" /r:System.Windows.Forms.dll,System.Drawing.dll,System.dll src\desktop\Uninstaller.cs
if ($LASTEXITCODE -ne 0) { throw "Uninstaller 编译失败" }

Copy-Item -Path "dist\web\public\*" -Destination "$payloadDir\app" -Recurse -Force
Copy-Item -Path "dist\web\public\*" -Destination "$binDir\app" -Recurse -Force
Copy-Item -Path "$binDir\游戏王AI制卡器.exe" -Destination "$payloadDir\" -Force
Copy-Item -Path "$binDir\Uninstall.exe" -Destination "$payloadDir\" -Force

Write-Host "[4/5] 打包内嵌 Payload 压缩流..." -ForegroundColor Cyan
$zipPath = "release\payload.zip"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path "$payloadDir\*" -DestinationPath $zipPath -Force

Write-Host "[5/5] 构建单文件独立安装向导 (Setup.exe)..." -ForegroundColor Cyan
$tempSetup = "release\Setup-Temp.exe"
& $csc /target:winexe /win32icon:assets\icon.ico "/out:$tempSetup" /r:System.Windows.Forms.dll,System.Drawing.dll,System.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll "/resource:$zipPath,payload.zip" src\desktop\SetupWizard.cs
if ($LASTEXITCODE -ne 0) { throw "SetupWizard 编译失败" }
# 用 .NET API 拷贝，规避 Windows PowerShell 对中文目标路径的编码问题
[System.IO.File]::Copy((Join-Path $root $tempSetup), (Join-Path $root $setupOut), $true)
Remove-Item $tempSetup -Force

Write-Host "✅ 构建成功 (v$appVersion): $setupOut" -ForegroundColor Green
