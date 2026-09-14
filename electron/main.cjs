const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow;
let isQuitting = false;

// 彻底杀死所有进程与后台服务
function killEverythingAndExit() {
  isQuitting = true;
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
  } catch (e) {}
  try {
    app.exit(0);
  } catch (e) {}
  try {
    process.exit(0);
  } catch (e) {}
}

// 启动在 Electron 进程内的 Express 后端服务
async function startServer() {
  try {
    const serverPath = path.join(__dirname, '../dist/web/server.js');
    const fileUrl = pathToFileURL(serverPath).href;
    await import(fileUrl);
    console.log('[Electron] 后端服务已在主进程内成功启动');
  } catch (err) {
    // 如果端口已被占用（如本地已运行），依然允许加载该端口
    console.warn('[Electron] 后端初始化提示:', err.message);
  }
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: '游戏王AI制卡器',
    backgroundColor: '#0a0e17',
    show: false
  });

  const loadApp = () => {
    mainWindow.loadURL('http://localhost:3000');
  };

  // 避免首屏连接竞态导致白屏
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.warn(`[Electron] 页面连接重试 (${errorCode}: ${errorDescription})`);
    setTimeout(loadApp, 500);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  loadApp();

  // 处理外部链接在浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 核心拦截：原生窗口按下关闭 (X) 或 Alt+F4 时的未保存提醒与退出询问
  mainWindow.on('close', async (e) => {
    if (isQuitting) return; // 已确认退出，放行

    e.preventDefault(); // 拦截原生直接关闭

    let hasUnsaved = false;
    let cardName = '';
    try {
      const status = await mainWindow.webContents.executeJavaScript(`
        (function() {
          if (typeof window.checkUnsavedChanges === 'function') {
            return window.checkUnsavedChanges();
          }
          return { hasUnsaved: false, cardName: '' };
        })()
      `);
      if (status && status.hasUnsaved) {
        hasUnsaved = true;
        cardName = status.cardName || '';
      }
    } catch (err) {
      console.warn('[Electron] 检查未保存修改异常:', err.message);
    }

    if (hasUnsaved) {
      const choice = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: '退出提示',
        message: cardName ? `当前卡片「${cardName}」有未保存的修改！` : '当前卡片有未保存的修改！',
        detail: '直接退出将丢失未保存的编辑内容。您希望保存后再退出，还是直接放弃修改退出？',
        buttons: ['取消', '放弃修改并退出', '保存并退出'],
        defaultId: 2,
        cancelId: 0,
        noLink: true
      });

      if (choice.response === 0) {
        // 用户取消，继续保留在当前编辑页
        return;
      } else if (choice.response === 2) {
        // 保存并退出
        try {
          await mainWindow.webContents.executeJavaScript(`
            if (typeof saveCurrentCardToLibrary === 'function') {
              saveCurrentCardToLibrary();
            }
          `);
        } catch (err) {}
      }
    } else {
      const choice = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: '退出提示',
        message: '确定要退出游戏王AI制卡器吗？',
        detail: '退出后将完全关闭程序并彻底终止所有后台服务与进程，释放系统资源。',
        buttons: ['取消', '确定退出'],
        defaultId: 1,
        cancelId: 0,
        noLink: true
      });

      if (choice.response === 0) {
        // 用户取消
        return;
      }
    }

    // 确认退出：彻底杀死所有进程
    killEverythingAndExit();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    killEverythingAndExit();
  });
}

// 接收来自渲染进程的主动退出调用
ipcMain.on('app-exit', () => {
  killEverythingAndExit();
});

// 应用生命周期管理
app.whenReady().then(async () => {
  await startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  killEverythingAndExit();
});

app.on('will-quit', () => {
  killEverythingAndExit();
});
