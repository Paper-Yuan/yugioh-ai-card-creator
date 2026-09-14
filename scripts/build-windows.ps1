# Windows 原生无Electron桌面客户端与安装包构建脚本
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "[1/5] 编译前端与静态资源..." -ForegroundColor Cyan
npm run build

Write-Host "[2/5] 准备临时产物目录..." -ForegroundColor Cyan
$binDir = "release\windows-bin"
$payloadDir = "release\temp-payload"
$setupOut = "release\游戏王AI制卡器-v2.0.0-Setup.exe"

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
Copy-Item $tempSetup $setupOut -Force
Remove-Item $tempSetup -Force

Write-Host "✅ 构建成功: $setupOut" -ForegroundColor Green
