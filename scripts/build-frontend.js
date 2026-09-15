/**
 * 前端构建：把 src/web/public 完整同步到 dist/web/public。
 *
 * 关键点：先清空目标目录再复制。此前直接用 fs.cpSync 增量覆盖，
 * 导致源目录已删除的文件（例如已废弃且文件损坏的霞鹜文楷字体）
 * 会残留在 dist 里，并被后续打包带入安装包。
 *
 * 若附加 --public 参数（或设 PUBLIC_RELEASE=1），则在复制完成后
 * 剔除不可再分发的商业字体（用于公开发布；本地自用打包不加该参数）。
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const SRC = 'src/web/public';
const DEST = 'dist/web/public';
const isPublic = process.argv.includes('--public') || process.env.PUBLIC_RELEASE === '1';

// 1. 清空目标目录，确保 dist 是 src 的精确镜像
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
fs.cpSync(SRC, DEST, { recursive: true });
console.log(`[build] 已同步 ${SRC} -> ${DEST}`);

// 2. 公开发布模式：剔除商业字体
if (isPublic) {
  execFileSync('node', ['scripts/strip-restricted-fonts.js', DEST], { stdio: 'inherit' });
} else {
  console.log('[build] 本地自用模式：保留商业字体（公开分发请用 npm run build:public）');
}
