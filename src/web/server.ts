import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { ScriptAssembler } from '../script-modules/script-assembler.js';
import { EFFECT_MODULES, getModulesForCardType } from '../script-modules/module-library.js';
import { CardImageGenerator } from '../image-generator.js';
import { CDBManager } from '../cdb-manager.js';
import { AICardGenerator } from '../ai-generator.js';
import { ScriptTemplate } from '../script-modules/types.js';
import { CardData } from '../types.js';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 配置文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const publicDir = existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '../../src/web/public');
app.use(express.static(publicDir));

// 工具实例
const scriptAssembler = new ScriptAssembler();
const imageGenerator = new CardImageGenerator();

// ========== API路由 ==========

// 辅助函数：检测本机 YGOPRO 与 MDPro3 原卡池路径
function detectLocalCdb(): string | null {
  const appData = process.env.APPDATA || '';
  const localAppData = process.env.LOCALAPPDATA || '';
  const checkPaths = [
    'D:\\ygopro\\cards.cdb',
    'E:\\ygopro\\cards.cdb',
    'C:\\ygopro\\cards.cdb',
    'D:\\YGOPro\\cards.cdb',
    'E:\\YGOPro\\cards.cdb',
    'D:\\mdpro3\\cdb\\cards.cdb',
    'E:\\mdpro3\\cdb\\cards.cdb',
    'C:\\mdpro3\\cdb\\cards.cdb',
    path.join(appData, 'MyCardLibrary\\cards.cdb'),
    path.join(localAppData, 'mdpro3\\cdb\\cards.cdb'),
    'C:\\Program Files\\ygopro\\cards.cdb',
    'C:\\Program Files (x86)\\ygopro\\cards.cdb'
  ];
  for (const p of checkPaths) {
    if (existsSync(p)) return p;
  }
  return null;
}


// 检测本机 YGOPRO 或 MDPro3 原卡池
app.get('/api/detect-local-ygopro', (req, res) => {
  const p = detectLocalCdb();
  if (p) {
    res.json({ found: true, path: p });
  } else {
    res.json({ found: false });
  }
});

// 获取本机原卡池二进制数据
app.get('/api/local-cdb', (req, res) => {
  const p = detectLocalCdb();
  if (p && existsSync(p)) {
    res.sendFile(p);
  } else {
    res.status(404).json({ error: 'Local cards.cdb not found' });
  }
});

// 获取所有效果模块
app.get('/api/modules', (req, res) => {
  try {
    const cardType = req.query.cardType ? parseInt(req.query.cardType as string) : undefined;
    const modules = cardType ? getModulesForCardType(cardType) : EFFECT_MODULES;
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load modules' });
  }
});

// 获取单个模块详情
app.get('/api/modules/:id', (req, res) => {
  try {
    const module = EFFECT_MODULES.find(m => m.id === req.params.id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json(module);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get module' });
  }
});

// 生成脚本
app.post('/api/generate', async (req, res) => {
  try {
    const template: ScriptTemplate = req.body;
    const result = scriptAssembler.generateScript(template);
    const validation = scriptAssembler.validateScript(result.lua);
    
    res.json({
      ...result,
      validation
    });
  } catch (error) {
    console.error('Script generation error:', error);
    res.status(500).json({ 
      error: 'Script generation failed', 
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// 生成卡片图片
app.post('/api/generate-image', upload.single('image'), async (req, res) => {
  try {
    const cardData: CardData = JSON.parse(req.body.cardData);
    
    const tempDir = path.join(__dirname, '../../temp');
    await mkdir(tempDir, { recursive: true });
    
    const outputPath = path.join(tempDir, `card_${cardData.id}_${Date.now()}.png`);
    const imageOptions: any = {};
    
    if (req.file) {
      const uploadedImagePath = path.join(tempDir, `upload_${Date.now()}.png`);
      await writeFile(uploadedImagePath, req.file.buffer);
      imageOptions.imagePath = uploadedImagePath;
    }
    
    await imageGenerator.generateCardImage(cardData, imageOptions, outputPath);
    res.sendFile(outputPath);
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: 'Image generation failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// 生成完整卡片（脚本 + 图片 + CDB）并直接下载 ZIP 包
app.post('/api/download-card-zip', upload.single('image'), async (req, res) => {
  try {
    const template: ScriptTemplate = JSON.parse(req.body.template);
    const cardData: CardData = template.cardData as unknown as CardData;
    const tempDir = path.join(__dirname, '../../temp');
    await mkdir(tempDir, { recursive: true });

    // 1. 生成脚本
    const scriptResult = scriptAssembler.generateScript(template);

    // 2. 生成 CDB
    const tempCdbPath = path.join(tempDir, `temp_${cardData.id}_${Date.now()}.cdb`);
    const cdbManager = new CDBManager();
    await cdbManager.createDatabase(tempCdbPath);
    cdbManager.addCard(cardData);
    await cdbManager.saveDatabase(tempCdbPath);
    cdbManager.close();
    const cdbBuffer = await readFile(tempCdbPath);

    // 3. 生成卡图
    const imageOptions: any = {};
    if (req.file) {
      const uploadedImagePath = path.join(tempDir, `artwork_${cardData.id}_${Date.now()}.png`);
      await writeFile(uploadedImagePath, req.file.buffer);
      imageOptions.imagePath = uploadedImagePath;
    }
    const tempImagePath = path.join(tempDir, `card_${cardData.id}_${Date.now()}.png`);
    await imageGenerator.generateCardImage(cardData, imageOptions, tempImagePath);
    const imageBuffer = await readFile(tempImagePath);

    // 4. 打包为 ZIP 输出
    const filename = `card_${cardData.id}_${encodeURIComponent(cardData.name || 'card')}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    archive.append(scriptResult.lua, { name: `script/c${cardData.id}.lua` });
    archive.append(cdbBuffer, { name: `${cardData.id}.cdb` });
    archive.append(imageBuffer, { name: `pics/${cardData.id}.png` });
    if (req.file) {
      archive.append(req.file.buffer, { name: 'artwork.png' });
    }

    await archive.finalize();
  } catch (error) {
    console.error('ZIP download error:', error);
    res.status(500).json({ error: 'Failed to create card zip package' });
  }
});

// 生成完整卡片（脚本 + 图片 + CDB，保存到本地目录）
app.post('/api/generate-complete', upload.single('image'), async (req, res) => {
  try {
    const template: ScriptTemplate = JSON.parse(req.body.template);
    const cardData: CardData = template.cardData as unknown as CardData;
    
    const workspaceDir = path.join(__dirname, '../../workspace', `card_${cardData.id}`);
    await mkdir(workspaceDir, { recursive: true });
    await mkdir(path.join(workspaceDir, 'script'), { recursive: true });
    await mkdir(path.join(workspaceDir, 'images'), { recursive: true });
    
    // 1. 生成脚本
    const scriptResult = scriptAssembler.generateScript(template);
    const scriptPath = path.join(workspaceDir, 'script', `c${cardData.id}.lua`);
    await writeFile(scriptPath, scriptResult.lua);
    
    // 2. 生成CDB数据库
    const cdbManager = new CDBManager();
    const cdbPath = path.join(workspaceDir, `${cardData.id}.cdb`);
    await cdbManager.createDatabase(cdbPath);
    cdbManager.addCard(cardData);
    await cdbManager.saveDatabase(cdbPath);
    cdbManager.close();
    
    // 3. 生成卡片图片
    const imageOptions: any = {};
    if (req.file) {
      const uploadedImagePath = path.join(workspaceDir, 'images', 'artwork.png');
      await writeFile(uploadedImagePath, req.file.buffer);
      imageOptions.imagePath = uploadedImagePath;
    }
    
    const imagePath = path.join(workspaceDir, 'images', `${cardData.id}_${cardData.name}.png`);
    await imageGenerator.generateCardImage(cardData, imageOptions, imagePath);
    
    res.json({
      success: true,
      files: {
        script: scriptPath,
        cdb: cdbPath,
        image: imagePath
      },
      script: scriptResult,
      workspace: workspaceDir
    });
  } catch (error) {
    console.error('Complete generation error:', error);
    res.status(500).json({
      error: 'Complete generation failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// 下载脚本文件
app.post('/api/download-script', async (req, res) => {
  try {
    const { lua, cardId, cardName } = req.body;
    const filename = `c${cardId}.lua`;
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lua);
  } catch (error) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// 下载卡片图片
app.post('/api/download-image', async (req, res) => {
  try {
    const { imageBase64, cardId, cardName } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    
    // 转换base64为buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const filename = `${cardId}_${cardName || 'card'}.png`;
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(imageBuffer);
  } catch (error) {
    console.error('Image download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// AI生成卡片
app.post('/api/ai-generate-card', async (req, res) => {
  try {
    const { prompt, cardType, theme, generateImage, aiConfig } = req.body;
    
    if (!aiConfig || !aiConfig.apiKey) {
      return res.status(400).json({ error: 'AI API not configured' });
    }

    const aiGenerator = new AICardGenerator(aiConfig);
    
    const cardData = await aiGenerator.generateCard({
      prompt,
      cardType,
      theme,
      startId: Math.floor(Math.random() * 900000000) + 100000000
    });
    
    res.json(cardData);
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({
      error: 'AI generation failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// AI推荐效果
app.post('/api/ai-suggest-effects', async (req, res) => {
  try {
    const { cardName, cardDesc, cardType, aiConfig } = req.body;
    
    if (!aiConfig || !aiConfig.apiKey) {
      return res.status(400).json({ error: 'AI API not configured' });
    }
    
    // 简化版：根据卡片类型返回常用效果
    const suggestions = getModulesForCardType(cardType).slice(0, 5).map(module => ({
      moduleId: module.id,
      parameters: {}
    }));
    
    res.json({ effects: suggestions });
  } catch (error) {
    console.error('AI suggest error:', error);
    res.status(500).json({
      error: 'Effect suggestion failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// 测试AI连接（发起真实请求验证配置）
app.post('/api/test-ai', async (req, res) => {
  try {
    const { provider, apiKey, endpoint, model } = req.body;

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'API Key is required' });
    }

    const aiGenerator = new AICardGenerator({ provider, apiKey, endpoint, model });
    const result = await aiGenerator.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    modulesCount: EFFECT_MODULES.length,
    version: '2.0.1'
  });
});

// 退出并彻底终止后台服务
app.post('/api/shutdown', (req, res) => {
  res.json({ 
    success: true, 
    message: '正在完全终止服务进程与释放端口...' 
  });
  setTimeout(() => {
    console.log('[Server] 收到前端退出确认指令，正在彻底杀死服务进程...');
    process.exit(0);
  }, 250);
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎴 游戏王AI制卡器 - 已启动                              ║
║                                                            ║
║   访问地址: http://localhost:${PORT}                        ║
║                                                            ║
║   核心功能:                                                ║
║   ✓ AI自动生成卡片                                        ║
║   ✓ 图形化脚本编辑（12个效果模块）                        ║
║   ✓ 自定义卡图上传                                        ║
║   ✓ 卡牌库管理                                            ║
║   ✓ 完整文件输出（脚本+图片+CDB）                         ║
║                                                            ║
║   API端点: ${EFFECT_MODULES.length} 个效果模块                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
