/**
 * Public 版本打包脚本
 * 用于生成可公开发布的版本(移除商业字体,启用 public 模式)
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const RELEASE_DIR = path.join(PROJECT_ROOT, 'release');
const PUBLIC_OUTPUT = path.join(RELEASE_DIR, 'yugioh-card-creator-public.zip');

console.log('🚀 开始构建 Public 版本...');

// 1. 确保 dist 目录存在
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist 目录不存在,请先运行 npm run build');
  process.exit(1);
}

// 2. 创建 release 目录
if (!fs.existsSync(RELEASE_DIR)) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

// 3. 修改前端代码,启用 public 模式标记
const publicIndexPath = path.join(DIST_DIR, 'web/public/index.html');
if (fs.existsSync(publicIndexPath)) {
  let indexContent = fs.readFileSync(publicIndexPath, 'utf-8');
  
  // 在 <head> 中注入 public 模式标记
  indexContent = indexContent.replace(
    '</head>',
    '  <script>window.IS_PUBLIC_BUILD = true;</script>\n</head>'
  );
  
  fs.writeFileSync(publicIndexPath, indexContent);
  console.log('✅ 已启用 Public 模式标记');
}

// 4. 复制 EXE 启动器到发布包根目录
const exeSource = path.join(RELEASE_DIR, 'win-unpacked/游戏王AI制卡器.exe');
const targetDir = path.join(RELEASE_DIR, 'yugioh-card-creator-public');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}
const exeTarget = path.join(targetDir, '游戏王AI制卡器.exe');
if (fs.existsSync(exeSource)) {
  fs.copyFileSync(exeSource, exeTarget);
  console.log('✅ 已复制 EXE 启动器到发布包');
} else {
  console.log('⚠️  未找到 EXE 启动器，请先运行 npm run package:win');
}

// 5. 移除商业字体文件并确保保留开源字体
const fontDir = path.join(DIST_DIR, 'web/public/assets/yugioh/font');
const commercialFonts = [
  'RenderFontChineseSimplified.ttf',
  'RenderFontJapanese.ttf',
  'FOT-Rodin Pro DB.otf',
  'Yu-Gi-Oh! FOT-Rodin ProN DB.ttf'
];

const openSourceFonts = [
  'SourceHanSansSC-Bold.otf',
  'SourceHanSansSC-Medium.otf',
  'YGOLDDFLeisho3.ttf',
  'AtkDef.ttf',
  'ygo-sc.woff2',
  'ygo-atk-def.woff2',
  'ygo-link.woff2',
  'ygo-password.woff2'
];

if (fs.existsSync(fontDir)) {
  commercialFonts.forEach(font => {
    const fontPath = path.join(fontDir, font);
    if (fs.existsSync(fontPath)) {
      fs.unlinkSync(fontPath);
      console.log(`🗑️  已移除商业字体: ${font}`);
    }
  });
  
  // 验证开源字体是否存在
  let missingFonts = 0;
  openSourceFonts.forEach(font => {
    const fontPath = path.join(fontDir, font);
    if (!fs.existsSync(fontPath)) {
      console.warn(`⚠️  缺少开源字体: ${font}`);
      missingFonts++;
    }
  });
  
  if (missingFonts === 0) {
    console.log(`✅ 已确认所有 ${openSourceFonts.length} 个开源字体文件完整`);
  } else {
    console.warn(`⚠️  缺少 ${missingFonts} 个开源字体文件，请检查 src/web/public/assets/yugioh/font/`);
  }
}

// 6. 生成 README 说明文件
const readmeContent = `# 游戏王 AI 制卡器 - Public 版本

## 快速启动

### Windows 用户
双击 \`游戏王AI制卡器.exe\` 即可启动

### 其他平台用户
1. 确保已安装 Node.js (v16+)
2. 运行命令: \`npm start\`
3. 浏览器访问 http://localhost:3000

## 字体说明

本 Public 版本使用开源字体，符合商业友好许可：

### 中文字体
- **SourceHanSansSC-Bold.otf** (思源黑体)
- **SourceHanSansSC-Medium.otf** (思源黑体)
  - 许可: SIL Open Font License 1.1
  - 来源: Adobe / Google

### 日文效果文本字体
- **YGOLDDFLeisho3.ttf**
  - 开源替代字体，适用于日文效果文本渲染

### 特殊字体
- **AtkDef.ttf** (攻守数值)
- **ygo-sc.woff2** (简体中文 Web 字体)
- **ygo-atk-def.woff2** (攻守图标)
- **ygo-link.woff2** (连接箭头)
- **ygo-password.woff2** (密码数字)

所有字体文件均为开源或免费商用，无商业使用限制。

## 功能特性

- ✅ 完整的游戏王卡牌渲染引擎
- ✅ AI 辅助卡片描述生成
- ✅ YGOPro / MDPro3 脚本导出
- ✅ CDB 数据库管理
- ✅ 批量制卡与卡包导出
- ✅ 手机端适配 (Android APK)

## 技术支持

- 项目主页: https://github.com/your-repo
- 问题反馈: https://github.com/your-repo/issues

## 许可协议

本项目采用 MIT 许可协议开源。
`;

const readmePath = path.join(targetDir, 'README.txt');
fs.writeFileSync(readmePath, readmeContent, 'utf-8');
console.log('✅ 已生成 README.txt 说明文件');

// 7. 创建压缩包
console.log('📦 正在打包...');
const output = fs.createWriteStream(PUBLIC_OUTPUT);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Public 版本打包完成!`);
  console.log(`📦 文件: ${PUBLIC_OUTPUT}`);
  console.log(`💾 大小: ${sizeMB} MB`);
  console.log('');
  console.log('⚠️  注意: Public 版本已移除商业字体,将自动回退到开源字体');
});

archive.on('error', (err) => {
  console.error('❌ 打包失败:', err);
  process.exit(1);
});

archive.pipe(output);

// 添加文件到压缩包
archive.directory(DIST_DIR, false);

// 添加必要的根文件
archive.file(path.join(PROJECT_ROOT, 'package.json'), { name: 'package.json' });
archive.file(path.join(PROJECT_ROOT, 'README.md'), { name: 'README.md' });
archive.file(path.join(PROJECT_ROOT, 'LICENSE'), { name: 'LICENSE' });

if (fs.existsSync(path.join(PROJECT_ROOT, 'electron'))) {
  archive.directory(path.join(PROJECT_ROOT, 'electron'), 'electron');
}

archive.finalize();
