# 效果外文本机制清单（基于 YGOPro 全量脚本语料库）

本文档记录「效果外文本 / 独立规则条款」支持范围的判定依据。

## 数据来源

- 语料库：[ProjectIgnis/CardScripts](https://github.com/ProjectIgnis/CardScripts)（YGOPro/MDPro3 通用卡脚本）
- 快照日期：2026-09-14
- 规模：**22,739** 个 `.lua` 脚本（其中现代 OCG 19,431）

| 顶层目录 | 脚本数 | 说明 |
| --- | --- | --- |
| `official/` | 13,461 | 正式收录卡 |
| `unofficial/` | 5,530 | 未正式收录的 DIY / 同人卡 |
| `rush/` | 3,109 | Rush Duel 赛制（机制与 OCG 差异较大） |
| `goat/` | 191 | Goat Format 复古赛制 |
| `pre-release/` | 181 | 未发布卡 |
| `skill/` | 174 | Rush Duel 技能卡 |
| `pre-errata/` | 68 | 旧版裁定文本 |

复现方式：

```bash
git clone --depth 1 https://github.com/ProjectIgnis/CardScripts.git
node scripts/mine-rule-texts.js <语料根目录> docs/rule-texts-inventory.json
```

## 高频机制统计（全语料库 / 现代 OCG）

| 机制 | 命中文件 | 现代 OCG |
| --- | ---: | ---: |
| 苏生限制（不能通常召唤 + 未正规出场不能特召） | 3,705 | 3,345 |
| 不能特殊召唤（EFFECT_SPSUMMON_CONDITION） | 1,055 | 1,025 |
| 融合召唤手续 | 1,015 | 699 |
| 特殊召唤手续（EFFECT_SPSUMMON_PROC） | 927 | 862 |
| 效果无效化 | 843 | 836 |
| 超量召唤手续 | 789 | 788 |
| 不能攻击（EFFECT_CANNOT_ATTACK） | 731 | 560 |
| 同调召唤手续 | 648 | 647 |
| 连接召唤手续 | 574 | 573 |
| 灵摆刻度手续 | 529 | 528 |
| 可以直接攻击 | 411 | 373 |
| 不受效果影响（EFFECT_IMMUNE_EFFECT） | 359 | 349 |
| 规则上变更等级 | 308 | 305 |
| 不能通常召唤（EFFECT_CANNOT_SUMMON） | 236 | 210 |
| 规则上追加怪兽种类 | 179 | 175 |
| 规则上变更种族 | 157 | 121 |
| 规则上变更属性 | 153 | 137 |
| 不能解放（EFFECT_UNRELEASABLE_SUM） | 143 | 123 |
| 不能变更表示形式 | 137 | 131 |
| 不能成为攻击对象 | 114 | 110 |
| 不能作为同调素材 | 98 | 97 |
| 不能作为解放替代（NONSUM） | 83 | 75 |
| 同名卡 1 回合特召 1 次（SetSPSummonOnce） | 77 | 77 |
| 仪式召唤手续 | 77 | 76 |
| 不能里侧盖放（EFFECT_CANNOT_MSET） | 83 | — |
| 效果不能发动（EFFECT_CANNOT_TRIGGER） | 198 | — |
| 不能作为任意素材（EFFECT_CANNOT_BE_MATERIAL） | 41 | 37 |
| 规则视作其他卡名（EFFECT_ADD_CODE） | 27 | 19 |

完整明细（含每个机制的示例文件）见 [rule-texts-inventory.json](./rule-texts-inventory.json)。

## 本项目已支持并可生成脚本的条款

以下条款均可由界面勾选后生成**可执行**的 OCGCore 脚本，写法对齐上述语料库的既有惯用法：

- 规则视作其他卡名（`EFFECT_ADD_CODE`）
- 同名卡 1 回合只能特殊召唤 1 次（`c:SetSPSummonOnce`）
- 不能通常召唤 / 苏生限制（`c:EnableReviveLimit`，可选叠加 `EFFECT_SPSUMMON_CONDITION → aux.FALSE`）
- 不能特殊召唤（`EFFECT_SPSUMMON_CONDITION → aux.FALSE`）
- 不能里侧盖放（`EFFECT_CANNOT_MSET`）
- 效果不能发动（`EFFECT_CANNOT_TRIGGER`）
- 不能作为召唤素材（融合 / 同调 / 超量 / 连接 / 任意，`EFFECT_CANNOT_BE_*_MATERIAL`）
- 不能解放（`EFFECT_UNRELEASABLE_SUM` + `EFFECT_UNRELEASABLE_NONSUM`）
- 不能变更表示形式（`EFFECT_CANNOT_CHANGE_POSITION`）
- 不能攻击 / 不能成为攻击对象 / 可以直接攻击
- 规则上追加怪兽种类 / 变更属性 / 追加种族 / 变更等级
- 召唤方式手续：`Fusion.AddProcMixN` / `Synchro.AddProcedure` / `Xyz.AddProcedure` / `Link.AddProcedure` / `Ritual.AddProcGreater`

其中「召唤方式手续」会依怪兽种类自动适配：选择融合 / 同调 / 超量 / 连接 / 仪式怪兽后自动预选对应手续。

## 明确不生成脚本的条款

**自定义独有规则**：用户输入的是自由语句（如「这张卡不受「禁咒」的影响」），
引擎无法将其翻译为确定语义的 Lua。因此该条款**只写入卡面文本与 CDB 描述**，
在脚本中仅保留为注释并附带提示，需用户自行补写。这是有意为之的设计，
避免静默生成语义错误的脚本。

## 与其它赛制的差异

`rush/`、`skill/` 目录为 Rush Duel 专用，其机制（如 Maximum 召唤、技能卡）
与 OCG 差异较大，本项目未纳入支持范围，仅在统计中列出以便溯源。
