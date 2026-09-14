// ============================================================
// 游戏王 AI 制卡工作室 - 客户端文件打包与导出系统 (Client Output)
// 100% 纯前端离线生成 Lua、PNG、SQLite CDB 与 YGOPro ZIP 卡包
// ============================================================

// 1. 下载单文件 Lua 脚本
async function downloadSingleLua() {
  readFormToState();
  compileLuaPreview();

  const code = state.generatedScript;
  const cardId = state.cardData.id;

  if (!code) {
    showNotification('未检测到可导出的脚本内容', 'error');
    return;
  }

  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  triggerBrowserDownload(blob, `c${cardId}.lua`);
  showNotification(`✅ 脚本文件 c${cardId}.lua 已下载！`);
}

// 2. 下载单文件高清卡面 PNG
async function downloadSinglePng() {
  readFormToState();
  const canvas = document.getElementById('liveCardCanvas');
  if (!canvas) {
    showNotification('未找到卡面渲染画布', 'error');
    return;
  }

  const cardId = state.cardData.id || 100000001;
  const cardName = sanitizeFilename(state.cardData.name || 'card');

  try {
    let exportedBlob = null;
    const exportScale = state.exportScale || 2; // 默认 4K 极清超采样 (2788×4062)
    
    if (state.renderer && typeof state.renderer.renderOffscreen === 'function') {
      const offscreen = await state.renderer.renderOffscreen(state.cardData, state.currentImage || state.uploadedImageElement, exportScale);
      exportedBlob = await state.renderer.exportBlob(offscreen);
    } else if (state.renderer && typeof state.renderer.exportBlob === 'function') {
      exportedBlob = await state.renderer.exportBlob(canvas);
    } else if (canvas.toBlob) {
      exportedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    }

    if (exportedBlob) {
      triggerBrowserDownload(exportedBlob, `${cardId}_${cardName}.png`);
      showNotification(`✅ 高清卡图 ${cardId}.png 已成功保存！`);
      return;
    }

    // 备用降级方案：toDataURL
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `${cardId}_${cardName}.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 500);
    showNotification(`✅ 高清卡图 ${cardId}.png 已成功保存！`);
  } catch (err) {
    console.error('Canvas export error:', err);
    showNotification('导出卡图失败: ' + err.message, 'error');
  }
}

// 3. 客户端生成并下载 CDB 数据库
async function downloadSingleCdb() {
  readFormToState();
  if (state.assembler && state.selectedEffects) {
    state.cardData.effectStrings = state.assembler.getEffectStrings(state.selectedEffects, state.cardData.language === 'ja');
  }
  showLoading(true, '正在通过 WebAssembly 构建 SQLite 数据库...');

  try {
    const binary = await state.cdbManager.buildCdbBuffer(state.cardData, state.cardData.effectStrings);
    const blob = new Blob([binary], { type: 'application/octet-stream' });
    triggerBrowserDownload(blob, `${state.cardData.id}.cdb`);
    showNotification(`✅ CDB 数据库 ${state.cardData.id}.cdb 已生成并下载！`);
  } catch (err) {
    console.error('CDB generation failed:', err);
    showNotification('CDB 数据库生成失败: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

// 4. 纯客户端一键打包完整 YGOPro ZIP 扩展包
async function downloadFullZipPackage() {
  readFormToState();
  compileLuaPreview();
  if (state.assembler && state.selectedEffects) {
    state.cardData.effectStrings = state.assembler.getEffectStrings(state.selectedEffects, state.cardData.language === 'ja');
  }
  showLoading(true, '正在通过 JSZip 纯客户端高速打包 YGOPro 扩展包...');

  try {
    if (typeof window.JSZip !== 'function') {
      throw new Error('JSZip 依赖库未就绪');
    }

    const zip = new window.JSZip();
    const cardId = state.cardData.id;
    const cardName = sanitizeFilename(state.cardData.name);

    // 1. 放入 script/c{id}.lua
    const luaCode = state.generatedScript;
    zip.file(`script/c${cardId}.lua`, luaCode);

    // 2. 放入 {id}.cdb
    const cdbBinary = await state.cdbManager.buildCdbBuffer(state.cardData, state.cardData.effectStrings);
    zip.file(`${cardId}.cdb`, cdbBinary);

    // 2.5 放入 strings.conf (包含自定义字段/Setcode)
    if (state.cardData.setcode && state.cardData.archetype) {
      const hex = String(state.cardData.setcode).startsWith('0x') ? String(state.cardData.setcode) : '0x' + Number(state.cardData.setcode).toString(16);
      zip.file('strings.conf', `!setname ${hex} ${state.cardData.archetype}\n`);
    }

    // 3. 放入 pics/{id}.png
    const canvas = document.getElementById('liveCardCanvas');
    let pngBlob = null;
    if (state.renderer && typeof state.renderer.exportBlob === 'function') {
      pngBlob = await state.renderer.exportBlob(canvas);
    } else if (canvas.toBlob) {
      pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    }
    if (!pngBlob) {
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch(dataUrl);
      pngBlob = await res.blob();
    }
    const pngBuffer = await pngBlob.arrayBuffer();
    zip.file(`pics/${cardId}.png`, pngBuffer);

    // 4. 如果有原图，放入 artwork.png
    if (state.uploadedImageElement && state.uploadedImageElement.src) {
      try {
        const artResp = await fetch(state.uploadedImageElement.src);
        const artBlob = await artResp.blob();
        zip.file(`pics/artwork_${cardId}.png`, await artBlob.arrayBuffer());
      } catch (e) {
        console.warn('Artwork attach skipped:', e);
      }
    }

    // 5. 压缩并下载
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    triggerBrowserDownload(zipBlob, `YGOPro_Exp_${cardId}_${cardName}.zip`);
    showNotification(`🎉 完整扩展包 YGOPro_Exp_${cardId}.zip 已打包成功！`);

    // 自动保存至卡牌库
    saveCurrentCardToLibrary();
  } catch (err) {
    console.error('ZIP Package generation error:', err);
    showNotification('扩展包打包失败: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

// 5. 手机端 / 全平台 MDPro3 标准扩展包 (.ypk) 导出
async function downloadMdpro3Package(isSet = false) {
  readFormToState();
  if (typeof saveCurrentCardIntoSetSlot === 'function') {
    saveCurrentCardIntoSetSlot();
  }
  compileLuaPreview();
  if (state.assembler && state.selectedEffects) {
    state.cardData.effectStrings = state.assembler.getEffectStrings(state.selectedEffects, state.cardData.language === 'ja');
  }
  showLoading(true, '正在生成手机端 MDPro3 标准扩展包 (.ypk)...');

  try {
    if (typeof window.JSZip !== 'function') {
      throw new Error('JSZip 依赖库未就绪');
    }

    const zip = new window.JSZip();
    const cardsToExport = (isSet && state.cardSet && state.cardSet.length > 0) ? state.cardSet : [state.cardData];
    const packName = isSet ? (state.setName || '自定义扩展卡包') : sanitizeFilename(state.cardData.name || 'MDPro3_Card');

    // 1. 生成 pack.json (MDPro3 官方规范)
    const packMeta = {
      name: packName,
      author: "游戏王AI制卡工作室",
      version: "1.0.0",
      description: `由游戏王AI制卡器生成的扩展卡包 (共 ${cardsToExport.length} 张卡片)`,
      id: `custom_pack_${cardsToExport[0]?.id || Date.now()}`,
      cards_count: cardsToExport.length
    };
    zip.file('pack.json', JSON.stringify(packMeta, null, 2));

    // 2. 合并生成 cards.cdb
    const cdbBinary = await state.cdbManager.buildMergedCdbBuffer(cardsToExport);
    zip.file('cards.cdb', cdbBinary);

    // 2.5 导出 strings.conf (包含自定义系列/Setcode 登记)
    const setnameLines = [];
    const recordedHexes = new Set();
    cardsToExport.forEach(c => {
      if (c.setcode && c.archetype) {
        const hex = String(c.setcode).startsWith('0x') ? String(c.setcode) : '0x' + Number(c.setcode).toString(16);
        if (!recordedHexes.has(hex)) {
          recordedHexes.add(hex);
          setnameLines.push(`!setname ${hex} ${c.archetype}`);
        }
      }
    });
    if (setnameLines.length > 0) {
      zip.file('strings.conf', setnameLines.join('\n') + '\n');
    }

    // 3. 循环写入每张卡的 script/ 与 pics/
    for (const card of cardsToExport) {
      const cId = card.id;
      // 脚本
      const luaScript = (card.id === state.cardData.id && state.generatedScript) 
        ? state.generatedScript 
        : state.assembler.generateScript(card, card.effectSlots || []);
      zip.file(`script/c${cId}.lua`, luaScript);

      // 4K 极清卡面渲染
      let pngBlob = null;
      const imgToRender = (card.id === state.cardData.id)
        ? (state.currentImage || state.uploadedImageElement)
        : (card.uploadedImageElement || card.uploadedImage || null);

      const offscreen = await state.renderer.renderOffscreen(card, imgToRender, 2);
      pngBlob = await state.renderer.exportBlob(offscreen);

      if (pngBlob) {
        zip.file(`pics/${cId}.png`, await pngBlob.arrayBuffer());
      }
    }

    // 4. 压缩为 .ypk
    const ypkBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const fileName = `${packName}.ypk`;

    // 移动端体验优化：若支持 Web Share API，直接调起系统分享 / MDPro3 打开
    try {
      const file = new File([ypkBlob], fileName, { type: 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: '游戏王 MDPro3 扩展卡包'
        });
        showNotification(`🎉 扩展包 ${fileName} 已唤起系统分享/MDPro3导入！`);
        saveCurrentCardToLibrary();
        return;
      }
    } catch (shareErr) {
      if (shareErr && shareErr.name !== 'AbortError') {
        console.warn('Share API notice:', shareErr);
      }
    }

    triggerBrowserDownload(ypkBlob, fileName);
    showNotification(`🎉 手机端 MDPro3 扩展包 ${fileName} 已打包下载！`);
    saveCurrentCardToLibrary();
  } catch (err) {
    console.error('MDPro3 Package generation error:', err);
    showNotification('MDPro3 扩展包打包失败: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

// 辅助函数：触发浏览器安全下载
function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

function sanitizeFilename(name) {
  return (name || 'card').replace(/[\\/:*?"<>|]/g, '_');
}

// 导出全局接口
window.downloadScript = downloadSingleLua;
window.downloadImage = downloadSinglePng;
window.downloadCompletePackage = downloadFullZipPackage;
window.downloadMdpro3Package = downloadMdpro3Package;
