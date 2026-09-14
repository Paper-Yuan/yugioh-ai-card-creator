/**
 * YGOPro 官方资源提取脚本
 * 读取本机 YGOPro 目录下的 cards.cdb 与 strings.conf，
 * 提取全部已占用官方卡密与全部官方系列字段。
 *
 * 用法（默认读取 ./YGOPro，可通过参数或环境变量指定）：
 *   node scripts/extract-ygopro-resources.js [YGOPro目录]
 *   YGOPRO_DIR=/path/to/YGOPro node scripts/extract-ygopro-resources.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YGOPRO_DIR = path.resolve(
  process.argv[2] || process.env.YGOPRO_DIR || path.join(__dirname, '../YGOPro')
);
const TARGET_DIR = path.join(__dirname, '../src/web/public/assets/yugioh');

async function main() {
  console.log('--- 开始提取 YGOPro 官方资源 ---');

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  // 1. 提取 strings.conf 中的全部官方字段 (!setname 0x... Name)
  const stringsConfPath = path.join(YGOPRO_DIR, 'strings.conf');
  if (!fs.existsSync(stringsConfPath)) {
    throw new Error(`未找到 strings.conf: ${stringsConfPath}`);
  }

  const strConfContent = fs.readFileSync(stringsConfPath, 'utf8');
  const lines = strConfContent.split(/\r?\n/);
  const archetypes = [];
  const setcodeMap = {};

  for (const line of lines) {
    const m = line.match(/^!setname\s+(0x[0-9a-fA-F]+)\s+([^#\r\n\t]+)(?:\t(.*))?/);
    if (m) {
      const hex = m[1].toLowerCase();
      const code = parseInt(hex, 16);
      const nameZh = m[2].trim();
      const nameJa = m[3] ? m[3].trim() : '';
      const entry = { hex, code, nameZh, nameJa };
      archetypes.push(entry);
      setcodeMap[nameZh] = hex;
      if (nameJa) setcodeMap[nameJa] = hex;
    }
  }

  const archetypesFile = path.join(TARGET_DIR, 'official-archetypes.json');
  fs.writeFileSync(archetypesFile, JSON.stringify(archetypes, null, 2), 'utf8');
  console.log(`✓ 成功提炼 ${archetypes.length} 个官方字段 -> ${archetypesFile}`);

  // 2. 提取 cards.cdb 中的全部已占用卡密与原卡名称
  const cdbPath = path.join(YGOPRO_DIR, 'cards.cdb');
  if (!fs.existsSync(cdbPath)) {
    throw new Error(`未找到 cards.cdb: ${cdbPath}`);
  }

  const SQL = await initSqlJs();
  const cdbBuffer = fs.readFileSync(cdbPath);
  const db = new SQL.Database(cdbBuffer);

  const res = db.exec('SELECT datas.id, texts.name FROM datas LEFT JOIN texts ON datas.id = texts.id ORDER BY datas.id ASC');
  const occupiedList = [];
  const nameMap = {};

  if (res.length > 0 && res[0].values) {
    for (const [id, name] of res[0].values) {
      occupiedList.push(id);
      if (name) {
        nameMap[id] = name;
      }
    }
  }
  db.close();

  // 写入精简的卡密数组 JSON（约 130KB，前端加载极快）
  const passcodesFile = path.join(TARGET_DIR, 'official-passcodes.json');
  fs.writeFileSync(passcodesFile, JSON.stringify(occupiedList), 'utf8');
  console.log(`✓ 成功提炼 ${occupiedList.length} 个官方卡密列表 -> ${passcodesFile}`);

  // 写入卡密->卡名映射表（用于精确显示冲突原卡名）
  const passcodeNamesFile = path.join(TARGET_DIR, 'official-cardnames.json');
  fs.writeFileSync(passcodeNamesFile, JSON.stringify(nameMap), 'utf8');
  console.log(`✓ 成功提炼 ${Object.keys(nameMap).length} 个官方卡名映射 -> ${passcodeNamesFile}`);

  console.log('--- YGOPro 官方资源提取完成 ---');
}

main().catch(err => {
  console.error('提取失败:', err);
  process.exit(1);
});
