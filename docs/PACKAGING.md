# 打包部署指南

本文档详细说明如何将游戏王AI制卡器打包为PC端exe文件和Android端APK文件。

## 📦 PC端打包（Electron）

### 1. 安装依赖

```bash
npm install --save-dev electron electron-builder
```

### 2. 创建Electron主进程文件

创建 `electron/main.js`：

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');

let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const app = require('../dist/web/server.js').default;
  server = app.listen(3000, () => {
    console.log('Server started on port 3000');
    createWindow();
  });
}

app.on('ready', startServer);

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

### 3. 更新package.json

添加以下配置：

```json
{
  "main": "electron/main.js",
  "scripts": {
    "build": "tsc",
    "electron": "electron .",
    "package:win": "electron-builder --win --x64",
    "package:mac": "electron-builder --mac",
    "package:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.yugioh.cardcreator",
    "productName": "游戏王AI制卡器",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "游戏王AI制卡器"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns",
      "category": "public.app-category.utilities"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "assets/icon.png",
      "category": "Utility"
    }
  }
}
```

### 4. 准备图标

创建 `assets/` 目录，放入以下图标：
- `icon.ico` (Windows, 256×256)
- `icon.icns` (macOS)
- `icon.png` (Linux, 512×512)

### 5. 打包

```bash
# 编译TypeScript
npm run build

# 打包为Windows exe
npm run package:win

# 打包为macOS dmg
npm run package:mac

# 打包为Linux AppImage
npm run package:linux
```

打包后的文件位于 `release/` 目录。

### 6. 测试

```bash
npm run electron
```

---

## 📱 移动端打包（Capacitor + Android）

### 1. 安装Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
```

### 2. 初始化Capacitor

```bash
npx cap init
```

配置提示：
- App name: `游戏王AI制卡器`
- App ID: `com.yugioh.cardcreator`
- Web directory: `dist/web/public`

### 3. 创建移动端构建脚本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "build:mobile": "npm run build && npm run copy:mobile",
    "copy:mobile": "mkdir -p dist/web/public && cp -r src/web/public/* dist/web/public/",
    "cap:add:android": "npx cap add android",
    "cap:sync": "npx cap sync",
    "cap:open:android": "npx cap open android"
  }
}
```

### 4. 配置capacitor.config.ts

创建 `capacitor.config.ts`：

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yugioh.cardcreator',
  appName: '游戏王AI制卡器',
  webDir: 'dist/web/public',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    iosScheme: 'capacitor'
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#667eea'
  }
};

export default config;
```

### 5. 添加Android平台

```bash
npm run build:mobile
npx cap add android
```

### 6. 配置Android权限

编辑 `android/app/src/main/AndroidManifest.xml`：

```xml
<manifest>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    
    <application
        android:usesCleartextTraffic="true"
        android:requestLegacyExternalStorage="true">
        <!-- ... -->
    </application>
</manifest>
```

### 7. 配置应用图标和启动屏幕

创建 `android/app/src/main/res/` 目录下的图标：
- `mipmap-hdpi/ic_launcher.png` (72×72)
- `mipmap-mdpi/ic_launcher.png` (48×48)
- `mipmap-xhdpi/ic_launcher.png` (96×96)
- `mipmap-xxhdpi/ic_launcher.png` (144×144)
- `mipmap-xxxhdpi/ic_launcher.png` (192×192)

### 8. 构建APK

```bash
# 同步资源
npx cap sync android

# 打开Android Studio
npx cap open android
```

在Android Studio中：
1. 点击 `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. 等待构建完成
3. APK位于 `android/app/build/outputs/apk/debug/app-debug.apk`

### 9. 签名APK（发布版本）

创建签名密钥：

```bash
keytool -genkey -v -keystore yugioh-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias yugioh
```

编辑 `android/app/build.gradle`：

```gradle
android {
    signingConfigs {
        release {
            storeFile file("../../yugioh-release-key.jks")
            storePassword "your_password"
            keyAlias "yugioh"
            keyPassword "your_password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

构建发布版APK：

```bash
cd android
./gradlew assembleRelease
```

发布APK位于 `android/app/build/outputs/apk/release/app-release.apk`

---

## 🔧 注意事项

### PC端

1. **图标要求**：
   - Windows: `.ico` 格式，256×256或更高
   - macOS: `.icns` 格式
   - Linux: `.png` 格式，512×512

2. **依赖打包**：
   - 确保所有npm包都正确安装
   - Canvas等原生模块需要重新编译

3. **代码签名**：
   - Windows: 需要代码签名证书
   - macOS: 需要Apple开发者账号

### 移动端

1. **Android版本**：
   - 最低支持Android 5.0 (API 21)
   - 推荐目标Android 13 (API 33)

2. **存储权限**：
   - Android 10+需要配置 `requestLegacyExternalStorage`
   - Android 11+需要使用作用域存储

3. **网络访问**：
   - 需要允许明文流量（usesCleartextTraffic）
   - 生产环境建议使用HTTPS

4. **APK大小优化**：
   - 使用ProGuard混淆
   - 启用资源压缩
   - 分拆APK（按架构）

---

## 📋 发布检查清单

### PC端发布前

- [ ] 更新版本号
- [ ] 测试所有功能
- [ ] 准备图标和资源
- [ ] 配置代码签名
- [ ] 生成安装程序
- [ ] 测试安装和卸载
- [ ] 准备更新说明

### 移动端发布前

- [ ] 更新版本号和versionCode
- [ ] 测试横屏和竖屏
- [ ] 测试不同屏幕尺寸
- [ ] 配置签名密钥
- [ ] 生成发布APK
- [ ] 测试安装和权限
- [ ] 准备应用商店截图
- [ ] 编写应用描述

---

## 🚀 自动化构建

### 使用GitHub Actions

创建 `.github/workflows/build.yml`：

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run package:win
      - uses: actions/upload-artifact@v2
        with:
          name: windows-installer
          path: release/*.exe

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - uses: actions/setup-java@v2
        with:
          distribution: 'adopt'
          java-version: '11'
      - run: npm install
      - run: npm run build:mobile
      - run: npx cap sync android
      - run: cd android && ./gradlew assembleRelease
      - uses: actions/upload-artifact@v2
        with:
          name: android-apk
          path: android/app/build/outputs/apk/release/*.apk
```

---

## 📞 支持

如遇到打包问题，请查看：
- [Electron文档](https://www.electronjs.org/docs)
- [Capacitor文档](https://capacitorjs.com/docs)
- [electron-builder文档](https://www.electron.build/)

或提交Issue获取帮助。
