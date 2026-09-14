const { contextBridge, ipcRenderer } = require('electron');

// 向渲染层安全暴露原生控制能力
contextBridge.exposeInMainWorld('electronAPI', {
  exitApp: () => ipcRenderer.send('app-exit')
});
