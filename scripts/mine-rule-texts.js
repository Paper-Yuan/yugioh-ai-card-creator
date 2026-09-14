/**
 * 扫描 YGOPro 官方 Lua 脚本语料库，统计「效果外文本」相关机制的出现频次。
 * 效果外文本 = 非「①②③」编号效果之外的独立规则条款，通常以
 * EFFECT_* 常驻/手续类 SetCode、aux.* 手续注册函数或 proc_*.lua 的形式出现。
 *
 * 默认扫描整个语料库（official / unofficial / goat / pre-errata /
 * pre-release / rush / skill 等全部卡脚本），并额外给出「现代 OCG」
 * （official + unofficial）的独立统计，便于区分正式卡与替代赛制。
 *
 * 用法: node scripts/mine-rule-texts.js <corpus-root> [outJson]
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.argv[2] || '../ygocorpus/cs';
const OUT = process.argv[3] || '';

if (!fs.existsSync(ROOT)) {
  console.error('语料目录不存在: ' + ROOT);
  process.exit(1);
}

// 现代 OCG（正式 + 未正式收录）目录，用于区分主统计
const MODERN_DIRS = new Set(['official', 'unofficial', 'pre-errata', 'pre-release', 'goat']);

/** 规则条款机制定义：pattern 用于统计，group 用于归并同类条款 */
const MECHANISMS = [
  // ---- 1. 卡名 / 属性 / 种族 / 类型 的规则变更 ----
  { id: 'alias_name', group: 'name', label: '规则视作其他卡名', re: /EFFECT_ADD_CODE/g },
  { id: 'add_type', group: 'type', label: '规则上追加怪兽种类(同调/超量/融合等)', re: /EFFECT_ADD_TYPE/g },
  { id: 'change_attribute', group: 'attribute', label: '规则上变更属性', re: /EFFECT_CHANGE_ATTRIBUTE/g },
  { id: 'add_race', group: 'race', label: '规则上追加种族', re: /EFFECT_ADD_RACE/g },
  { id: 'change_race', group: 'race', label: '规则上变更种族', re: /EFFECT_CHANGE_RACE/g },
  { id: 'change_level', group: 'level', label: '规则上变更等级', re: /EFFECT_CHANGE_LEVEL/g },
  { id: 'change_rank', group: 'level', label: '规则上变更阶级', re: /EFFECT_CHANGE_RANK/g },

  // ---- 2. 通常召唤 / 特殊召唤 手续与限制 ----
  { id: 'enable_revive_limit', group: 'summon', label: '苏生限制(不能通常召唤+未正规出场不能特召)', re: /EnableReviveLimit\(/g },
  { id: 'spsummon_proc', group: 'summon', label: '特殊召唤手续(EFFECT_SPSUMMON_PROC)', re: /EFFECT_SPSUMMON_PROC\b/g },
  { id: 'spsummon_condition', group: 'summon', label: '特殊召唤条件(EFFECT_SPSUMMON_CONDITION)', re: /EFFECT_SPSUMMON_CONDITION/g },
  { id: 'cannot_summon', group: 'summon', label: '不能通常召唤(EFFECT_CANNOT_SUMMON)', re: /EFFECT_CANNOT_SUMMON\b/g },
  { id: 'cannot_spsummon', group: 'summon', label: '不能特殊召唤(EFFECT_CANNOT_SPECIAL_SUMMON)', re: /EFFECT_CANNOT_SPECIAL_SUMMON/g },
  { id: 'spsummon_once', group: 'summon', label: '同名卡1回合特召1次(SetSPSummonOnce)', re: /SetSPSummonOnce\(/g },
  { id: 'spsummon_count_limit', group: 'summon', label: '1回合特召次数上限(EFFECT_SPSUMMON_COUNT_LIMIT)', re: /EFFECT_SPSUMMON_COUNT_LIMIT/g },
  { id: 'cannot_be_spsummon_target', group: 'summon', label: '不能被特殊召唤(EFFECT_CANNOT_BE_SPSUMMON...)', re: /EFFECT_[A-Z_]*CANNOT_BE_SPECIAL_SUMMON[A-Z_]*/g },

  // ---- 3. 作为融合/同调/超量/连接素材的限制 ----
  { id: 'mat_fusion', group: 'material', label: '不能作为融合素材', re: /EFFECT_CANNOT_BE_FUSION_MATERIAL/g },
  { id: 'mat_synchro', group: 'material', label: '不能作为同调素材', re: /EFFECT_CANNOT_BE_SYNCHRO_MATERIAL/g },
  { id: 'mat_xyz', group: 'material', label: '不能作为超量素材', re: /EFFECT_CANNOT_BE_XYZ_MATERIAL/g },
  { id: 'mat_link', group: 'material', label: '不能作为连接素材', re: /EFFECT_CANNOT_BE_LINK_MATERIAL/g },
  { id: 'mat_any', group: 'material', label: '不能作为任意召唤素材(EFFECT_CANNOT_BE_MATERIAL)', re: /EFFECT_CANNOT_BE_MATERIAL/g },

  // ---- 4. 解放 / 祭品 相关规则 ----
  { id: 'unreleasable_sum', group: 'release', label: '不能解放(EFFECT_UNRELEASABLE_SUM)', re: /EFFECT_UNRELEASABLE_SUM/g },
  { id: 'unreleasable_non', group: 'release', label: '不能作为解放替代(EFFECT_UNRELEASABLE_NONSUM)', re: /EFFECT_UNRELEASABLE_NONSUM/g },

  // ---- 5. 表示形式 / 战斗 / 控制权 规则 ----
  { id: 'cannot_change_pos', group: 'position', label: '不能变更表示形式', re: /EFFECT_CANNOT_CHANGE_POSITION|EFFECT_CANNOT_CHANGE_POS_E/g },
  { id: 'cannot_attack', group: 'battle', label: '不能攻击(EFFECT_CANNOT_ATTACK)', re: /EFFECT_CANNOT_ATTACK\b/g },
  { id: 'cannot_be_attacked', group: 'battle', label: '不能成为攻击对象', re: /EFFECT_CANNOT_BE_BATTLE_TARGET|EFFECT_ONLY_BE_ATTACKED/g },
  { id: 'direct_attack', group: 'battle', label: '可以直接攻击', re: /EFFECT_DIRECT_ATTACK|EFFECT_ATTACK_ALL/g },

  // ---- 6. 效果无效 / 不受影响 的规则(非编号效果) ----
  { id: 'immune_effect', group: 'immune', label: '不受效果影响(EFFECT_IMMUNE_EFFECT)', re: /EFFECT_IMMUNE_EFFECT/g },
  { id: 'disable_effect', group: 'immune', label: '效果无效化', re: /EFFECT_DISABLE\b|EFFECT_DISABLE_EFFECT/g },

  // ---- 7. 常规召唤手续注册函数(融合/同调/超量/连接/仪式/灵摆) ----
  { id: 'proc_fusion', group: 'procedure_api', label: '融合召唤手续', re: /Fusion\.AddProc|aux\.AddFusionProcFunction|aux\.AddFusionProcFunRep|aux\.AddFusionProcMixRep|aux\.AddFusionProcMix/g },
  { id: 'proc_synchro', group: 'procedure_api', label: '同调召唤手续', re: /Synchro\.AddProcedure/g },
  { id: 'proc_xyz', group: 'procedure_api', label: '超量召唤手续', re: /Xyz\.AddProcedure/g },
  { id: 'proc_link', group: 'procedure_api', label: '连接召唤手续', re: /Link\.AddProcedure/g },
  { id: 'proc_ritual', group: 'procedure_api', label: '仪式召唤手续', re: /Ritual\.AddProc/g },
  { id: 'proc_pendulum', group: 'procedure_api', label: '灵摆刻度手续', re: /Pendulum\.AddProcedure/g },
  { id: 'proc_normal', group: 'procedure_api', label: '通常怪兽手续', re: /aux\.AddNormalProcedure/g },

  // ---- 8. 复合特性手续(二重/灵魂/同盟/卡通/反转) ----
  { id: 'proc_gemini', group: 'trait_api', label: '二重怪兽手续(Gemini)', re: /Gemini\.AddProcedure|EFFECT_DUAL_SUMMON/g },
  { id: 'proc_spirit', group: 'trait_api', label: '灵魂怪兽手续(Spirit)', re: /EFFECT_SPIRIT_DONOT_RETURN|EFFECT_SPIRIT_MAYNOT_RETURN|Spirit\./g },
  { id: 'proc_union', group: 'trait_api', label: '同盟怪兽手续(Union)', re: /EFFECT_UNION_SUPPORT|aux\.AddUnionProcedure|EFFECT_UNION_STATUS/g },
  { id: 'proc_toon', group: 'trait_api', label: '卡通怪兽手续(Toon)', re: /EFFECT_TOON|aux\.AddToonProcedure|EFFECT_TOON_SUMMONING/g },
];

const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith('.lua')) files.push(p);
  }
})(ROOT);

const counts = Object.fromEntries(MECHANISMS.map(m => [m.id, 0]));
const fileHits = Object.fromEntries(MECHANISMS.map(m => [m.id, 0]));
// 记录每个机制的示例文件（便于人工核对）
const samples = Object.fromEntries(MECHANISMS.map(m => [m.id, []]));
// 现代 OCG（正式收录 + 未收录）独立统计
const countsModern = Object.fromEntries(MECHANISMS.map(m => [m.id, 0]));
const fileHitsModern = Object.fromEntries(MECHANISMS.map(m => [m.id, 0]));
// 按顶层目录统计脚本数
const byDir = {};

const topDirOf = (p) => {
  const rel = path.relative(ROOT, p).split(path.sep);
  return rel.length > 1 ? rel[0] : '(root)';
};

let scanned = 0;
let scannedModern = 0;
for (const f of files) {
  let txt;
  try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
  scanned++;
  const dir = topDirOf(f);
  byDir[dir] = (byDir[dir] || 0) + 1;
  const isModern = MODERN_DIRS.has(dir);
  if (isModern) scannedModern++;
  for (const m of MECHANISMS) {
    m.re.lastIndex = 0;
    const n = (txt.match(m.re) || []).length;
    if (n > 0) {
      counts[m.id] += n;
      fileHits[m.id] += 1;
      if (samples[m.id].length < 6) samples[m.id].push(path.basename(f));
      if (isModern) {
        countsModern[m.id] += n;
        fileHitsModern[m.id] += 1;
      }
    }
  }
}

const rows = MECHANISMS
  .map(m => ({
    ...m,
    occurrences: counts[m.id],
    files: fileHits[m.id],
    modernOccurrences: countsModern[m.id],
    modernFiles: fileHitsModern[m.id],
    samples: samples[m.id]
  }))
  .filter(r => r.occurrences > 0)
  .sort((a, b) => b.files - a.files);

console.log(`扫描目录: ${ROOT}`);
console.log(`Lua 脚本总数: ${scanned}（其中现代 OCG ${scannedModern}）`);
console.log('各顶层目录脚本数: ' + Object.entries(byDir).sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d}=${n}`).join('  '));
console.log('');
console.log('机制'.padEnd(46) + '命中文件'.padStart(8) + '现代OCG'.padStart(10) + '总出现'.padStart(8) + '  分组');
console.log('-'.repeat(92));
for (const r of rows) {
  console.log(r.label.padEnd(46) + String(r.files).padStart(8) + String(r.modernFiles).padStart(10) + String(r.occurrences).padStart(8) + '  ' + r.group);
}

// 按分组汇总
const byGroup = {};
for (const r of rows) {
  byGroup[r.group] = byGroup[r.group] || { files: 0, occurrences: 0, items: 0 };
  byGroup[r.group].files += r.files;
  byGroup[r.group].occurrences += r.occurrences;
  byGroup[r.group].items++;
}
console.log('\n== 分组汇总 ==');
console.log('分组'.padEnd(16) + '机制数'.padStart(8) + '命中文件'.padStart(10) + '总出现'.padStart(10));
for (const [g, v] of Object.entries(byGroup).sort((a, b) => b[1].files - a[1].files)) {
  console.log(g.padEnd(16) + String(v.items).padStart(8) + String(v.files).padStart(10) + String(v.occurrences).padStart(10));
}

if (OUT) {
  fs.writeFileSync(OUT, JSON.stringify({ scanned, scannedModern, byDir, root: ROOT, rows }, null, 2), 'utf8');
  console.log('\n已写出: ' + OUT);
}
