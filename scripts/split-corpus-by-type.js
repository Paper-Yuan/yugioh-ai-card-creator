/**
 * 将 YGOPro 卡脚本按「怪兽 / 魔法 / 陷阱」分类，输出三份文件清单。
 *
 * 卡片的类型不在 lua 内，而在卡数据库 (cards.cdb) 的 datas.type 位域：
 *   bit0(1)=怪兽  bit1(2)=魔法  bit2(4)=陷阱
 * 因此本脚本读取 cdb 建立 passcode → type 映射，再按文件名 c<passcode>.lua 归类。
 *
 * 用法:
 *   node scripts/split-corpus-by-type.js <cards.cdb> <要归类的脚本目录> <输出目录>
 * 示例:
 *   node scripts/split-corpus-by-type.js ./cards.cdb ./official ./split
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const CDB = process.argv[2];
const SRC = process.argv[3];
const OUT = process.argv[4] || 'split';

if (!CDB || !SRC) {
  console.error('用法: node scripts/split-corpus-by-type.js <cards.cdb> <脚本目录> <输出目录>');
  process.exit(1);
}
if (!fs.existsSync(CDB) || !fs.existsSync(SRC)) {
  console.error('cdb 或脚本目录不存在');
  process.exit(1);
}

const initSqlJs = require('sql.js');
const SQL = await initSqlJs({
  locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm')
});
const db = new SQL.Database(fs.readFileSync(CDB));

/** passcode → type 位域 */
const typeOf = new Map();
for (const [id, type] of db.exec('SELECT id, type FROM datas')[0].values) {
  typeOf.set(Number(id), Number(type));
}

const buckets = { monster: [], spell: [], trap: [], unknown: [] };

const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!name.endsWith('.lua')) continue;
    const m = /^c(\d+)\.lua$/.exec(name);
    if (!m) { buckets.unknown.push(p); continue; }
    const t = typeOf.get(Number(m[1]));
    if (t === undefined) { buckets.unknown.push(p); continue; }
    if (t & 1) buckets.monster.push(p);
    else if (t & 2) buckets.spell.push(p);
    else if (t & 4) buckets.trap.push(p);
    else buckets.unknown.push(p);
  }
};
walk(SRC);

fs.mkdirSync(OUT, { recursive: true });
for (const [k, list] of Object.entries(buckets)) {
  fs.writeFileSync(path.join(OUT, `${k}.txt`), list.join('\n'), 'utf8');
}

const total = buckets.monster.length + buckets.spell.length + buckets.trap.length;
console.log(`脚本目录: ${SRC}`);
console.log(`数据库:   ${CDB}（索引 ${typeOf.size} 张卡）`);
console.log(`已归类合计: ${total}`);
console.log(`  怪兽 monster: ${buckets.monster.length}`);
console.log(`  魔法 spell:   ${buckets.spell.length}`);
console.log(`  陷阱 trap:    ${buckets.trap.length}`);
console.log(`  无法归类:     ${buckets.unknown.length}`);
console.log(`清单已写出到: ${OUT}/`);
