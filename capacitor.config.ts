import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yugioh.cardcreator',
  appName: '游戏王制卡器',
  webDir: 'dist/web/public',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    iosScheme: 'capacitor',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0e17',
    buildOptions: {
      keystorePath: './android/app/yugioh-release-key.jks',
      keystoreAlias: 'yugioh'
    }
  },
  plugins: {
    // 注意：未安装 @capacitor/splash-screen，故不配置 SplashScreen 插件。
    // 启动画面由 android 侧的 AppTheme.NoActionBarLaunch (windowBackground) 提供，
    // 不会阻塞 WebView 加载；若日后接入该插件，需在 MainActivity 调用
    // installSplashScreen() 并在主题中设置 postSplashScreenTheme。
    StatusBar: {
      backgroundColor: '#0a0e17',
      style: 'DARK'
    },
    Haptics: {
      enabled: true
    }
  }
};

export default config;
