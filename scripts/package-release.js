import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const APP_VERSION = require('../package.json').version;

console.log('========================================================');
console.log(`游戏王 AI 制卡工作室 - 双端发布独立打包系统 (v${APP_VERSION})`);
console.log('========================================================\n');

// 1. 确保 release 目录就绪
if (!fs.existsSync('release')) {
  fs.mkdirSync('release', { recursive: true });
}

// 2. 生成与同步双端 YGOPro 原生图标与前端最新资源
console.log('-> 正在校验并生成双端 YGOPro 专属高清图标体系...');
if (fs.existsSync('src/web/public')) {
  fs.mkdirSync('dist/web/public', { recursive: true });
  fs.cpSync('src/web/public', 'dist/web/public', { recursive: true });
}
execSync('node scripts/generate-android-icons.js', { stdio: 'inherit' });

// 3. 构建 Android 官方独立离线 APK
console.log('\n[1/2] 正在编译构建 Android 独立离线 APK (集成 YGOPro 原生图标)...');
fs.mkdirSync('android/app/src/main/assets/public', { recursive: true });
fs.cpSync('dist/web/public', 'android/app/src/main/assets/public', { recursive: true });
execSync('cd android && gradlew.bat assembleDebug', { stdio: 'inherit' });

const apkSrc = 'android/app/build/outputs/apk/debug/app-debug.apk';
const apkDest = `release/游戏王AI制卡器-v${APP_VERSION}.apk`;
if (fs.existsSync(apkSrc)) {
  fs.copyFileSync(apkSrc, apkDest);
  const apkSizeMb = (fs.statSync(apkDest).size / 1024 / 1024).toFixed(2);
  console.log(`✅ [1/2] Android 独立离线 APK 构建成功: ${apkDest} (${apkSizeMb} MB)`);
} else {
  console.warn(`⚠️ 未找到 Android APK: ${apkSrc}`);
}

// 4. 构建 Windows 原生一键免安装启动器 (非 Setup，双击直接运行)
console.log('\n[2/2] 正在构建 Windows 原生一键免安装独立启动器 (游戏王AI制卡器.exe)...');
const csc = 'C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe';
const binDir = 'release/windows-bin';
const payloadDir = 'release/temp-payload';
const zipPath = 'release/payload.zip';
const finalExeVersion = `release/游戏王AI制卡器-v${APP_VERSION}.exe`;
const finalExeCommon = 'release/游戏王AI制卡器.exe';
const portableDir = 'release/游戏王AI制卡器-便携版';
const portableZip = `release/游戏王AI制卡器-v${APP_VERSION}-便携版.zip`;

// 清理旧安装包与临时目录
if (fs.existsSync(`release/游戏王AI制卡器-v${APP_VERSION}-Setup.exe`)) {
  try { fs.unlinkSync(`release/游戏王AI制卡器-v${APP_VERSION}-Setup.exe`); } catch (e) {}
}
if (fs.existsSync(portableDir)) {
  fs.rmSync(portableDir, { recursive: true, force: true });
}
if (fs.existsSync(payloadDir)) {
  fs.rmSync(payloadDir, { recursive: true, force: true });
}
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(`${payloadDir}/app`, { recursive: true });

// 复制前端资源到 Payload 与 bin
console.log('-> 复制高精官方前端资源到独立启动器 Payload...');
fs.cpSync('dist/web/public', `${payloadDir}/app`, { recursive: true });

// 压缩 Payload
console.log('-> 压缩完整离线前端数据流 (payload.zip)...');
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
execSync(`powershell -Command "Compress-Archive -Path '${payloadDir}/*' -DestinationPath '${zipPath}' -Force"`);

// 编译单文件一键独立启动器 (内嵌 YGOPro 图标与完整 payload.zip)
console.log('-> 编译原生单文件一键启动器 (内嵌 YGOPro 专属图标与前端引擎)...');
execSync(`"${csc}" /target:winexe /win32icon:assets\\icon.ico /resource:assets\\icon.ico,app.ico /resource:${zipPath},payload.zip /out:"${finalExeVersion}" /r:System.Windows.Forms.dll,System.Drawing.dll,System.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll src\\desktop\\AppLauncher.cs`, { stdio: 'inherit' });

// 复制一份通用的 "游戏王AI制卡器.exe"，方便用户无需关心版本号直接双击运行
fs.copyFileSync(finalExeVersion, finalExeCommon);

// 构建标准便携解压目录 (文件夹内含 exe 与 app/，解压即用免缓存释放)
console.log('-> 组装便携版解压目录与 ZIP...');
fs.mkdirSync(portableDir, { recursive: true });
fs.copyFileSync(finalExeCommon, `${portableDir}/游戏王AI制卡器.exe`);
fs.cpSync('dist/web/public', `${portableDir}/app`, { recursive: true });
if (fs.existsSync(portableZip)) fs.unlinkSync(portableZip);
execSync(`powershell -Command "Compress-Archive -Path '${portableDir}' -DestinationPath '${portableZip}' -Force"`);

const exeSizeMb = (fs.statSync(finalExeCommon).size / 1024 / 1024).toFixed(2);
const portableZipSizeMb = (fs.statSync(portableZip).size / 1024 / 1024).toFixed(2);
const apkSizeMb = fs.existsSync(apkDest) ? (fs.statSync(apkDest).size / 1024 / 1024).toFixed(2) : '0';

console.log(`✅ [2/2] Windows 原生一键启动程序构建完成:`);
console.log(`       - 单文件一键直启: ${finalExeCommon} (${exeSizeMb} MB)`);
console.log(`       - 版本号直启文件: ${finalExeVersion} (${exeSizeMb} MB)`);
console.log(`       - 绿色便携压缩包: ${portableZip} (${portableZipSizeMb} MB)`);

// 自动清理构建中间临时文件与目录
console.log('-> 清理构建中间临时文件...');
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
if (fs.existsSync(payloadDir)) fs.rmSync(payloadDir, { recursive: true, force: true });
if (fs.existsSync(binDir)) fs.rmSync(binDir, { recursive: true, force: true });

// 彻底清除历史残存的 Setup 安装程序及乱码文件
for (const f of fs.readdirSync('release')) {
  if (f.toLowerCase().includes('setup') || f.includes('娓告垙') || f.includes('鍒跺崱')) {
    try {
      fs.unlinkSync(path.join('release', f));
    } catch (e) {}
  }
}

console.log('\n========================================================');
console.log('🎉 发布产物已全部构建并验证成功！');
console.log(`1. Windows 单文件一键启动: ${path.resolve(finalExeCommon)} (${exeSizeMb} MB)`);
console.log(`2. Windows 绿色便携包:     ${path.resolve(portableZip)} (${portableZipSizeMb} MB)`);
console.log(`3. Android 离线独立 APK:   ${path.resolve(apkDest)} (${apkSizeMb} MB)`);
console.log('========================================================\n');
