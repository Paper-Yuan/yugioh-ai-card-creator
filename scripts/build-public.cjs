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

// 4. 移除商业字体文件
const fontDir = path.join(DIST_DIR, 'web/public/assets/yugioh/font');
const commercialFonts = [
  'RenderFontChineseSimplified.ttf',
  'RenderFontJapanese.ttf',
  'FOT-Rodin Pro DB.otf',
  'Yu-Gi-Oh! FOT-Rodin ProN DB.ttf'
];

if (fs.existsSync(fontDir)) {
  commercialFonts.forEach(font => {
    const fontPath = path.join(fontDir, font);
    if (fs.existsSync(fontPath)) {
      fs.unlinkSync(fontPath);
      console.log(`🗑️  已移除商业字体: ${font}`);
    }
  });
}

// 5. 创建压缩包
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
