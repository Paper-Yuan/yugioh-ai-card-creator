/**
 * Personal 完整版打包脚本
 * 用于生成个人自用的完整功能版本(保留所有字体和功能)
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const RELEASE_DIR = path.join(PROJECT_ROOT, 'release');
const PERSONAL_OUTPUT = path.join(RELEASE_DIR, 'yugioh-card-creator-personal-full.zip');

console.log('🚀 开始构建 Personal 完整版...');

// 1. 确保 dist 目录存在
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist 目录不存在,请先运行 npm run build');
  process.exit(1);
}

// 2. 创建 release 目录
if (!fs.existsSync(RELEASE_DIR)) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

// 3. 检查是否包含商业字体
const fontDir = path.join(DIST_DIR, 'web/public/assets/yugioh/font');
const commercialFonts = [
  'RenderFontChineseSimplified.ttf',
  'RenderFontJapanese.ttf'
];

let hasFonts = false;
if (fs.existsSync(fontDir)) {
  hasFonts = commercialFonts.some(font => 
    fs.existsSync(path.join(fontDir, font))
  );
}

if (hasFonts) {
  console.log('✅ 检测到商业字体,将打包完整版');
} else {
  console.log('⚠️  未检测到商业字体,此版本功能与 Public 版相同');
}

// 4. 创建压缩包
console.log('📦 正在打包...');
const output = fs.createWriteStream(PERSONAL_OUTPUT);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Personal 完整版打包完成!`);
  console.log(`📦 文件: ${PERSONAL_OUTPUT}`);
  console.log(`💾 大小: ${sizeMB} MB`);
  console.log('');
  console.log('🎉 此版本包含:');
  console.log('   • 完整商业字体(如已放置)');
  console.log('   • 卡面作者水印');
  console.log('   • 全部高级功能');
  console.log('');
  console.log('⚠️  请勿公开分发此版本!');
});

archive.on('error', (err) => {
  console.error('❌ 打包失败:', err);
  process.exit(1);
});

archive.pipe(output);

// 添加完整的 dist 目录
archive.directory(DIST_DIR, false);

// 添加必要的根文件
archive.file(path.join(PROJECT_ROOT, 'package.json'), { name: 'package.json' });
archive.file(path.join(PROJECT_ROOT, 'README.md'), { name: 'README.md' });
archive.file(path.join(PROJECT_ROOT, 'LICENSE'), { name: 'LICENSE' });

if (fs.existsSync(path.join(PROJECT_ROOT, 'electron'))) {
  archive.directory(path.join(PROJECT_ROOT, 'electron'), 'electron');
}

// 添加启动脚本
const startupScript = path.join(PROJECT_ROOT, '启动游戏王制卡器.bat');
if (fs.existsSync(startupScript)) {
  archive.file(startupScript, { name: '启动游戏王制卡器.bat' });
}

archive.finalize();
