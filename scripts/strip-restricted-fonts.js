/**
 * 公开发布模式下，从构建产物中剔除不可再分发的商业字体。
 *
 * 背景：
 * - 本地自用打包需保留商业字体（更贴近官方字形）；
 * - 但公开分发（GitHub Release 等）不能包含这些字体，否则构成再分发。
 *
 * 判定依据：仓库 .gitignore 中「商业字体」段落即为不可再分发清单，
 * 本脚本用 `git check-ignore` 权威判定，避免两处清单不同步。
 * 若不处于 git 环境，则回退到下面硬编码的兜底清单（与 docs/ASSETS.md 一致）。
 *
 * 用法：node scripts/strip-restricted-fonts.js [目标目录，默认 dist/web/public]
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const TARGET = process.argv[2] || 'dist/web/public';
const FONT_DIR = path.join(TARGET, 'assets/yugioh/font');

if (!fs.existsSync(FONT_DIR)) {
  console.error(`字体目录不存在: ${FONT_DIR}`);
  process.exit(1);
}

// 兜底清单：与 .gitignore「商业字体」段及 docs/ASSETS.md 保持一致
const FALLBACK = [
  'RenderFontChineseSimplified.ttf',
  'FZZYJW.ttf',
  'FOT-Rodin Pro.ttf',
  'FOT-Rodin ProN DB.ttf',
  'Yu-Gi-Oh! FOT-Rodin ProN DB.ttf',
  'YGOLDDFLeisho3.ttf',
  'YGOLDDFGLeisho4.ttf',
  'Yu-Gi-Oh-ITC-Stone-Serif-M.ttf',
  'AtkDef.ttf',
  'ygo-cardkey.ttf',
  'ygo-matrix.ttf'
];

/** 用 git check-ignore 判定哪些字体属于「不可再分发」 */
function restrictedByGit(files) {
  try {
    const out = execFileSync('git', ['check-ignore', '--stdin'], {
      input: files.map(f => path.posix.join('src/web/public/assets/yugioh/font', f)).join('\n'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const set = new Set(
      out.split(/\r?\n/).filter(Boolean).map(p => path.basename(p))
    );
    return set.size > 0 ? set : null;
  } catch {
    return null;
  }
}

const allFonts = fs.readdirSync(FONT_DIR).filter(f => /\.(ttf|otf|woff2?)$/i.test(f));
const gitSet = restrictedByGit(allFonts);
const restricted = gitSet
  ? allFonts.filter(f => gitSet.has(f))
  : FALLBACK.filter(f => allFonts.includes(f));

console.log(`目标目录: ${FONT_DIR}`);
console.log(`判定方式: ${gitSet ? 'git check-ignore（依据 .gitignore）' : '兜底清单'}`);

if (restricted.length === 0) {
  console.log('未发现需要剔除的商业字体。');
} else {
  for (const f of restricted) {
    const p = path.join(FONT_DIR, f);
    const size = fs.statSync(p).size;
    fs.unlinkSync(p);
    console.log(`  [移除] ${f} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  }
}

const kept = fs.readdirSync(FONT_DIR).filter(f => /\.(ttf|otf|woff2?)$/i.test(f));
console.log(`已移除 ${restricted.length} 个商业字体，保留 ${kept.length} 个可分发字体：`);
console.log('  ' + kept.join(', '));
console.log('提示：缺失商业字体时程序会自动回退到思源黑体（SIL OFL），不影响功能。');
