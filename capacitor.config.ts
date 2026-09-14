import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yugioh.cardcreator',
  appName: '游戏王AI制卡器',
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
    backgroundColor: '#667eea',
    buildOptions: {
      keystorePath: './android/app/yugioh-release-key.jks',
      keystoreAlias: 'yugioh'
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#667eea',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      spinnerColor: '#ffffff'
    },
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
