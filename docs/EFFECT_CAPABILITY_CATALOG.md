# YGOPro 效果能力全集与参数规范（EFFECT CAPABILITY CATALOG）

> 合并自三份卡种报告：
> [`effect-reports/report-monster.md`](./effect-reports/report-monster.md)（怪兽 8552 文件）、
> [`effect-reports/report-spell.md`](./effect-reports/report-spell.md)（魔法 2843 文件）、
> [`effect-reports/report-trap.md`](./effect-reports/report-trap.md)（陷阱 2059 文件）。
> 比对基准：[`DESIGNER_SUPPORT_BASELINE.md`](./DESIGNER_SUPPORT_BASELINE.md)
> 及设计器实现 `src/web/public/js/client-assembler.js` / `src/web/public/js/app.js` / `src/script-modules/module-library.ts`。
> 目标：为效果设计器的 `effectType / timing / cost / target / action / followup / ruleTexts`
> 七维组装模型提供一份穷尽、去重、可直接落库的能力全集。
>
> 复现方式：`node scripts/split-corpus-by-type.js <cards.cdb> <脚本目录> <输出目录>`
> 按卡种切分（读数来自 `cards.cdb` 的 `datas.type` 位域），再对三份清单分别统计。
> 语料来源与数据口径见 [RULE_TEXTS.md](./RULE_TEXTS.md)。

---

## 0. 文档说明与口径对齐（必读）

### 0.1 三份报告的口径差异与本文的对齐规则

| 报告 | 分母 | 数字形态 | 主口径 |
|---|---|---|---|
| 怪兽 | 8552 | `count/fileCount`（如 `CATEGORY_DESTROY 3161/1521`） | 两个都报，`fileCount` 更接近「多少张卡具备」 |
| 魔法 | 2843 | `命中文件数 / 出现频次`（如 `340 文件 / 693 次`） | `files` 为主 |
| 陷阱 | 2059 | 多数只报 `files`（如 `DESTROY 493`） | `files` 为主 |

**本文统一采用「命中文件数（files）」作为 `卡种命中` 的展示口径**，因为它是「多少张卡具备该能力」的最稳近似，也是三份报告唯一都有的字段。怪兽报告中只给出现次数（count）而无法回算 files 的低频条目，会在条目内显式标注「(次)」。

> ⚠️ 需求示例中「除去-破坏｜怪兽 3161、魔法 340、陷阱 493」里的 `3161` 其实是**怪兽的 `CATEGORY_DESTROY` 出现次数（count）**，而其文件数是 `1521`。本文为保持三卡种可比，统一改写为 `怪兽 1521 / 魔法 340 / 陷阱 493`。凡遇此类换算，均按此规则处理。

### 0.2 标识符规范

- 全部 `identifier` 使用 **snake_case**，可直接作为 TS 枚举值 / JSON key / 设计器 `<option value>`。
- 已有设计器使用的标识符（如 `search_deck`、`destroy_target`、`banish_target`、`wipe_oppo_all`、`immune_all`、`atk_boost`、`negate_and_destroy`）
  **优先沿用**，避免破坏现有脚本产物与存档。
- 新能力一律新起标识符，命名风格对齐 `动词_对象_范围`（如 `special_summon_banished`、`change_control`、`leave_field_redirect`）。

### 0.3 覆盖标记

`✅已支持` / `⚠️部分支持` / `❌未支持`；优先级 `P0`（高频且完全缺失）/ `P1`（中频缺失或仅部分支持）/ `P2`（低频或有替代）。

### 0.4 结构差异保留清单（三卡种不可抹平的侧面）

- **魔法/陷阱的「发动本体 + 常驻效果」双层结构**：`EFFECT_TYPE_ACTIVATE` 只声明「卡被发动」，
  真正效果常是随后注册的 `EFFECT_TYPE_FIELD/SINGLE[+CONTINUOUS]`（魔法 773/634 文件，陷阱 313+58 文件）。
- **`SetRange` 驻留区域**：`SZONE`（魔法 649 / 陷阱 547 文件）、`FZONE`（魔法 330 文件）、`GRAVE`（魔法 386 文件）、`PZONE`。
- **陷阱专属**：必须盖放才能发动、盖放回合限制（`EFFECT_TRAP_ACT_IN_SET_TURN` 28 文件）、
  从手牌发动（`EFFECT_TRAP_ACT_IN_HAND` 30 文件）、反击陷阱（157 文件）、陷阱怪兽（76 文件）。
- **怪兽专属**：召唤手续 `EFFECT_SPSUMMON_PROC`（635 文件）、灵摆手续（390 文件）、
  种族/属性/种类变更与追加、`EFFECT_MATERIAL_CHECK`（166 文件）。

---

## 1. 能力索引速查表

> 数字 = 命中 **文件数**。`—` 表示该报告未统计。按维度分组，组内按「三卡种合计」降序。

| 中文名 | identifier | 怪兽 | 魔法 | 陷阱 | 维度 | 覆盖 | 优先级 |
|---|---|---:|---:|---:|---|---|---|
| 破坏 | `destroy_target` | 1521 | 340 | 493 | action | ✅ | P0 |
| 特殊召唤 | `special_summon` | 3581 | 937 | 716 | action | ⚠️ | P0 |
| 检索入卡组 | `search_deck` | 1196 | 505 | 113 | action | ✅ | P0 |
| 除外 | `banish_target` | 474 | 184 | 156 | action | ✅ | P0 |
| 送去墓地 | `to_grave` | 499 | 189 | 97 | action | ⚠️ | P0 |
| 加入手卡/弹回 | `to_hand_target` | 1891 | 750 | 282 | action | ✅ | P0 |
| 返回卡组 | `to_deck` | 394 | 201 | 131 | action | ❌ | P0 |
| 攻击力变动 | `atk_change` | 1319 | 434 | 159 | action | ⚠️ | P0 |
| 抽卡 | `draw_cards` | 424 | — | 126 | action | ✅ | P0 |
| 造成伤害 | `burn_damage` | 493 | — | 129 | action | ✅ | P0 |
| 展开衍生物 | `token_summon` | 137 | 63 | 36 | action | ❌ | P0 |
| 卡的发动本体 | `activate` | — | 2419 | 2009 | effectType | ⚠️ | P0 |
| 灵摆效果 | `pendulum_effect` | 374 | 37 | — | effectType | ⚠️ | P1 |
| 装备状态效果 | `equip_state` | 178 | 216 | 62 | effectType | ❌ | P1 |
| 效果赋予 | `grant` | 13 | 13 | 4 | effectType | ❌ | P2 |
| 反转效果 | `flip` | 193 | — | — | effectType | ❌ | P1 |
| 必发诱发 | `trigger_mandatory` | 1363 | 202 | 136 | effectType | ❌ | P1 |
| 反击/诱发即时（必发） | `quick_mandatory` | 15 | 1 | 1 | effectType | ❌ | P2 |
| 召唤手续 | `procedure` | 3538 | — | — | effectType | ⚠️ | P0 |

---

## 2. 能力全集

每个条目格式：`语义 / 卡种命中 / lua 实现特征 / 需自定义参数 / 设计器覆盖 / 优先级`。

### A. 效果性质 effectType 全集

> 口径：怪兽按 `EFFECT_TYPE_*` 性质原子；魔法/陷阱按 `SetType` 组合。一个效果可同时含载体（SINGLE/FIELD）与一个性质原子。

#### 常驻效果 (`continuous`)
- **语义**：无发动时点、持续适用的效果（含纯 `EFFECT_TYPE_SINGLE`/`FIELD` 载体）。
- **卡种命中**：怪兽 1308（显式 CONTINUOUS）+ 6591（SINGLE）/4138（FIELD）；魔法 1428（static/field）；陷阱 416（FIELD）+ 525（SINGLE）／313（CONTINUOUS+FIELD）。
- **lua 实现特征**：`e:SetType(EFFECT_TYPE_SINGLE)` 或 `EFFECT_TYPE_FIELD[+EFFECT_TYPE_CONTINUOUS]` + `SetRange(...)`。
- **需自定义参数**：`range`(驻留区, LOCATION_SZONE/FZONE/GRAVE/MZONE/PZONE, 默认随卡种)、`targetRange`(适用方与区, 默认 `1,0`)。
- **设计器覆盖**：⚠️（`effectType=continuous` 可用，但驻留区 / 目标范围不可细分）
- **优先级**：P0

#### 起动效果 (`ignition`)
- **语义**：主要阶段玩家主动发动。
- **卡种命中**：怪兽 3342；魔法 654～660；陷阱 1。
- **lua 实现特征**：`EFFECT_TYPE_IGNITION` + `SetRange(LOCATION_MZONE/SZONE/GRAVE/PZONE)`。
- **需自定义参数**：`range`、`countLimit`、`condition`。
- **设计器覆盖**：✅
- **优先级**：P0

#### 诱发效果（可选）(`trigger_optional`)
- **语义**：满足事件时「可以发动」，会错过时点。
- **卡种命中**：怪兽 4130（TRIGGER_O）；魔法 547；陷阱 221（FIELD+TRIGGER_O 133、SINGLE+TRIGGER_O 88）。
- **lua 实现特征**：`EFFECT_TYPE_[SINGLE|FIELD]+EFFECT_TYPE_TRIGGER_O` + `SetCode(EVENT_*)`。
- **需自定义参数**：`event`、`range`、`delay`(EFFECT_FLAG_DELAY, 默认 true)、`condition`。
- **设计器覆盖**：✅（`effectType=trigger`）
- **优先级**：P0

#### 诱发效果（必发）(`trigger_mandatory`)
- **语义**：满足事件时强制发动、不占时点。
- **卡种命中**：怪兽 1363（TRIGGER_F）；魔法 202；陷阱 136（FIELD+TRIGGER_F 99、SINGLE+TRIGGER_F 37）。
- **lua 实现特征**：`EFFECT_TYPE_TRIGGER_F`（无 `SetTarget` 时的「check only」写法）。
- **需自定义参数**：同 `trigger_optional`，另加 `targetable`(是否含取对象段)。
- **设计器覆盖**：❌（仅有 `slot.triggerType='mandatory'` 的隐式分支，未暴露为 effectType）
- **优先级**：P1

#### 诱发即时效果（可选）(`quick_optional`)
- **语义**：二速，可在对手回合/连锁中发动。
- **卡种命中**：怪兽 1451（QUICK_O 1512 次）；魔法 16；陷阱 470（QUICK_O）。
- **lua 实现特征**：`EFFECT_TYPE_QUICK_O` + `SetCode(EVENT_FREE_CHAIN|EVENT_CHAINING)` + `SetHintTiming`。
- **需自定义参数**：`timings`(位掩码集合)、`damageStep`(EFFECT_FLAG_DAMAGE_STEP)、`damageCal`(EFFECT_FLAG_DAMAGE_CAL)、`oppo_turn_only`。
- **设计器覆盖**：⚠️（`quick` + `quick_free/oppo_turn/oppo_main/chain` 四预设，无自由 timing 位掩码）
- **优先级**：P0

#### 诱发即时效果（必发）(`quick_mandatory`)
- **语义**：二速必发。
- **卡种命中**：怪兽 15（QUICK_F）；魔法 1；陷阱 1。
- **lua 实现特征**：`EFFECT_TYPE_QUICK_F`。
- **需自定义参数**：同 `quick_optional`。
- **设计器覆盖**：❌
- **优先级**：P2

#### 卡的发动本体 (`activate`)
- **语义**：魔法/陷阱「这张卡的发动」占位效果，是所有魔陷的必需载体。
- **卡种命中**：魔法 2419（85.1%）；陷阱 2009（97.6%）。
- **lua 实现特征**：
  ```lua
  e1:SetType(EFFECT_TYPE_ACTIVATE)
  e1:SetCode(EVENT_FREE_CHAIN)     -- 魔法 2362 / 陷阱 1519
  e1:SetTarget(s.target); e1:SetOperation(s.activate)
  ```
- **需自定义参数**：`category`(CATEGORY_* 多选)、`targetFlag`(CARD_TARGET/PLAYER_TARGET)、`hintTiming`、`condition`、`cost`、`targeted`、`operation`。
- **设计器覆盖**：⚠️（`spell_trap_act` / `spell_trap_continuous` timing 承担，未作为独立 effectType 暴露）
- **优先级**：P0

#### 反转效果 (`flip`)
- **语义**：反转时发动的效果。
- **卡种命中**：怪兽 193（FLIP）；魔法/陷阱 无。
- **lua 实现特征**：`EFFECT_TYPE_FLIP`（等价 `SetType(EFFECT_TYPE_TRIGGER_O)+SetCode(EVENT_FLIP)`）。
- **需自定义参数**：`eventTiming`(反转召唤/被攻击翻开)、`range`。
- **设计器覆盖**：❌
- **优先级**：P1

#### 装备状态效果 (`equip_state`)
- **语义**：卡片作为装备卡期间对装备怪兽持续生效。
- **卡种命中**：怪兽 178（`EFFECT_TYPE_EQUIP` 227 次）；魔法 216（`EFFECT_TYPE_EQUIP`）；陷阱 62。
- **lua 实现特征**：
  ```lua
  e2:SetType(EFFECT_TYPE_EQUIP) e2:SetCode(EFFECT_UPDATE_ATTACK) e2:SetValue(500)
  ```
  配合 `EFFECT_EQUIP_LIMIT` 限制可装备对象。
- **需自定义参数**：`equipLimit`(筛选)、`value`/`valueSource`、`linkToEquipTarget`。
- **设计器覆盖**：❌
- **优先级**：P1

#### 效果赋予 (`grant`)
- **语义**：把自己拥有的某个效果授予其他卡。
- **卡种命中**：怪兽 13；魔法 13；陷阱 4。
- **lua 实现特征**：`EFFECT_TYPE_FIELD+EFFECT_TYPE_GRANT` + `e:SetLabelObject(e2)` + `SetTargetRange`。
- **需自定义参数**：`grantTarget`(筛选)、`grantedEffect`(被授予效果 id)、`unconditional`。
- **设计器覆盖**：❌
- **优先级**：P2

#### 召唤手续 (`procedure`)
- **语义**：非效果性的召唤条件（融合/同调/超量/连接/仪式/灵摆/祭品）。
- **卡种命中**：怪兽 3538（`EnableReviveLimit` 2622）；魔法（仪式手续 95、融合手续 126）。
- **lua 实现特征**：
  ```lua
  Fusion.AddProcMix / AddProcMixN / Fusion.CreateSummonEff
  Synchro.AddProcedure + Synchro.NonTuner
  Xyz.AddProcedure / Link.AddProcedure / Pendulum.AddProcedure
  Ritual.AddProcGreaterCode / AddProcGreater / AddProcEqual / Ritual.CreateProc
  EFFECT_SPSUMMON_PROC / aux.AddNormalSummonProcedure
  ```
- **需自定义参数**：`summonType`(fusion/synchro/xyz/link/ritual/pendulum/tribute)、`min`/`max`、`matFilter`、`matLocation`、`contactFusion`、`reviveLimit`。
- **设计器覆盖**：⚠️（`procSummonType` + `materialRestriction` + `EnableReviveLimit`，素材筛选与来源未支持）
- **优先级**：P0

> **附带说明**：`EFFECT_TYPE_SINGLE`/`EFFECT_TYPE_FIELD` 不是「性质」而是载体，设计器应以
> `carrier=single|field` 的形式与 effectType 组合，而非并列枚举。当前设计器未暴露该维度。

---

### B. 触发时点 / 起效场合 timing 全集

> 按事件类别分组。identifier 对齐设计器现有 `timing` 值；新增项标注 `(新)`。
> 数字为命中文件数（怪兽/魔法/陷阱）。

#### B1. 自身召唤 / 特殊召唤

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 召唤成功（通常/反转） | `summon_ns` | `EVENT_SUMMON_SUCCESS` | 564 | 67 | 13 | ✅ |
| 特殊召唤成功 | `summon_ss` | `EVENT_SPSUMMON_SUCCESS` | 1377 | 164 | — | ✅ |
| 两者皆可 | `summon_both` | 上二组合 | — | — | — | ✅ |
| 反转召唤成功 | `summon_flip` `(新)` | `EVENT_FLIP_SUMMON_SUCCESS` | 54 | 9 | — | ❌ |
| 按召唤法：融合 | `summon_fusion` | `SUMMON_TYPE_FUSION` | 638 | — | — | ✅ |
| 按召唤法：仪式 | `summon_ritual` | `SUMMON_TYPE_RITUAL` | 31 | 92 | — | ✅ |
| 按召唤法：同调 | `summon_synchro` | `SUMMON_TYPE_SYNCHRO` | 559 | — | — | ✅ |
| 按召唤法：超量 | `summon_xyz` | `SUMMON_TYPE_XYZ` | 635 | — | — | ✅ |
| 按召唤法：连接 | `summon_link` | `SUMMON_TYPE_LINK` | 492 | — | — | ✅ |
| 含素材召唤 | `summon_with_mat` | `GetMaterialCount` | — | — | — | ✅ |
| 召唤被无效 | `summon_negated` `(新)` | `EVENT_SPSUMMON`+`GetCurrentChain` | 22 | — | 27 | ❌ |
| 盖放 | `mset` `(新)` | `EVENT_MSET` | 23 | 5 | — | ❌ |

#### B2. 破坏

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 被破坏（战破或效破） | `destroyed_battle_or_effect` | `EVENT_DESTROYED` | 1521 | 108 | 75 | ✅ |
| 被对手破坏 | `destroyed_by_oppo` | `EVENT_DESTROYED`+`rp` | — | — | — | ✅ |
| 战斗破坏对手怪兽 | `battle_destroy_oppo` | `EVENT_BATTLE_DESTROYING` | 277 | 33 | — | ✅ |
| 自身被战斗破坏 | `battle_destroyed_self` `(新)` | `EVENT_BATTLE_DESTROYED` | 277 | 24 | — | ⚠️ |
| 场上卡被破坏 | `field_card_destroyed` | `EVENT_DESTROYED`(任意) | — | — | — | ✅ |
| 被战斗/效果破坏区分 | `destroyed_by_battle`,`destroyed_by_effect` | `IsReason` 判定 | — | — | — | ⚠️ |

#### B3. 送去墓地 / 丢弃

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 送去墓地（通用） | `to_grave_general` | `EVENT_TO_GRAVE` | — | 185 | 113 | ✅ |
| 从场上送入墓地且曾特召 | `to_grave_from_field_summoned` | `EVENT_TO_GRAVE`+`IsPreviousLocation` | — | — | — | ✅ |
| 自身被送去墓地 | `to_grave_self` `(新)` | `EVENT_TO_GRAVE`+`IsCode` | — | — | — | ❌ |
| 被效果送去墓地 | `to_grave_by_effect` `(新)` | `REASON_EFFECT` | — | — | — | ⚠️ |
| 被丢弃 | `discarded` `(新)` | `EVENT_DISCARD` | — | — | 3 | ❌ |
| 卡组送墓（堆墓） | `deck_to_grave` | `EVENT_DECK_TO_GRAVE` | 201 | 23 | 23 | ✅ |

#### B4. 除外 / 回归

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 自身被除外 | `banished_self` | `EVENT_REMOVE`+`IsCode` | — | 28 | — | ✅ |
| 场上卡被除外 | `field_card_banished` | `EVENT_REMOVE` | — | — | — | ✅ |
| 被效果除外 | `removed_by_effect` `(新)` | `EVENT_REMOVE`+`REASON_EFFECT` | — | — | — | ❌ |
| 暂时除外并归还 | `temporary_banish` `(新)` | `REASON_TEMPORARY` | — | 8 | — | ❌ |

#### B5. 战斗

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 攻击宣言 | `attack_announce` `(新)` | `EVENT_ATTACK_ANNOUNCE` | — | 65 | 144 | ⚠️ |
| 成为攻击对象 | `be_battle_target` `(新)` | `EVENT_BE_BATTLE_TARGET` | 115 | — | 25 | ❌ |
| 伤害计算前 | `pre_damage_calculate` `(新)` | `EVENT_PRE_DAMAGE_CALCULATE` | 94 | 18 | 20 | ❌ |
| 战斗伤害发生 | `battle_damage` `(新)` | `EVENT_BATTLE_DAMAGE` | — | 23 | 22 | ❌ |
| 战斗结束 | `battled` `(新)` | `EVENT_BATTLED` | 121 | 26 | 13 | ❌ |
| 伤害步骤结束 | `damage_step_end` `(新)` | `EVENT_DAMAGE_STEP_END` | 107 | 26 | — | ❌ |
| 攻击被无效 | `attack_disabled` `(新)` | `EVENT_ATTACK_DISABLED` | — | — | — | ❌ |

#### B6. 阶段 / 回合

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 准备阶段 | `standby_phase` `(新)` | `EVENT_PHASE+PHASE_STANDBY` | — | 65 | — | ❌ |
| 抽牌阶段前 | `predraw` `(新)` | `EVENT_PREDRAW` | — | 10 | — | ❌ |
| 主要阶段 | `main_phase` | `EVENT_PHASE+PHASE_MAIN1/2` | — | — | — | ⚠️ |
| 战斗阶段 | `battle_phase` | `EVENT_PHASE+PHASE_BATTLE` | — | — | — | ⚠️ |
| 结束阶段 | `end_phase` | `EVENT_PHASE+PHASE_END` | — | 179 | — | ✅ |
| 阶段通用 | `phase_event` | `EVENT_PHASE` | 874 | 265 | — | ⚠️ |
| 回合切换/轮次 | `turn_event` `(新)` | `EVENT_TURN_START`/`GetTurnCount` | — | — | 43 | ❌ |

#### B7. 连锁

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 发动时（反击时点） | `chain_activating`/`chaining` | `EVENT_CHAINING` | 616 | 67 | 278 | ⚠️ |
| 连锁结算中 | `chain_solving` `(新)` | `EVENT_CHAIN_SOLVING` | 85 | 35 | 22 | ❌ |
| 连锁结算后 | `chain_solved` `(新)` | `EVENT_CHAIN_SOLVED` | 93 | — | 21 | ❌ |
| 连锁结束 | `chain_end` `(新)` | `EVENT_CHAIN_END` | 17 | — | — | ❌ |
| 发动被无效 | `chain_negated` `(新)` | `EVENT_CHAIN_NEGATED` | — | 6 | — | ❌ |
| 自由时点 | `quick_free`/`free_chain` | `EVENT_FREE_CHAIN` | 940 | 2362 | 1519 | ✅ |

#### B8. 永续在场 / 区域变动

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 表侧在场常驻 | `continuous_faceup` | — | — | — | — | ✅ |
| 特召成功的表侧在场 | `continuous_summoned_faceup` | — | — | — | — | ✅ |
| 魔陷发动 | `spell_trap_act` | `EFFECT_TYPE_ACTIVATE` | — | — | — | ✅ |
| 魔陷常驻 | `spell_trap_continuous` | `EVENT_FREE_CHAIN`+常驻 | — | — | — | ✅ |
| 离开场上 | `leave_field` `(新)` | `EVENT_LEAVE_FIELD` | — | 72 | 87 | ❌ |
| 表示形式改变 | `change_pos` `(新)` | `EVENT_CHANGE_POS` | — | 11 | — | ❌ |
| 控制权变更 | `control_changed` `(新)` | `EVENT_CONTROL_CHANGED` | — | 1 | — | ❌ |
| 成为素材 | `be_material` `(新)` | `EVENT_BE_MATERIAL` | 2 | 2 | — | ❌ |
| 取除素材 | `detach_material` `(新)` | `EVENT_DETACH_MATERIAL` | 2 | — | — | ❌ |
| 装备 | `equip` `(新)` | `EVENT_EQUIP` | 7 | 7 | — | ❌ |

#### B9. 卡组 / 手卡 / 额外变动

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 加入手卡 | `to_hand` `(新)` | `EVENT_TO_HAND` | — | 18 | — | ❌ |
| 返回卡组 | `to_deck_event` `(新)` | `EVENT_TO_DECK` | — | 8 | — | ❌ |
| 返回额外卡组 | `to_extra_event` `(新)` | `EVENT_TO_EXTRA` | — | — | — | ❌ |
| 抽卡 | `draw_event` `(新)` | `EVENT_DRAW` | — | 13 | — | ❌ |
| 移动（任意） | `move_event` `(新)` | `EVENT_MOVE` | — | 4 | — | ❌ |

#### B10. 宣言 / 指示物 / 掷硬币骰子

| 中文名 | identifier | 事件 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 放置指示物 | `add_counter_event` `(新)` | `EVENT_ADD_COUNTER` | — | 1 | — | ❌ |
| 取除指示物 | `remove_counter_event` `(新)` | `EVENT_REMOVE_COUNTER` | — | 4 | — | ❌ |
| 掷硬币 | `toss_coin_event` `(新)` | `EVENT_TOSS_COIN` | — | 1 | — | ❌ |
| 掷骰子 | `toss_dice_event` `(新)` | `EVENT_TOSS_DICE` | — | 1 | — | ❌ |
| 解放 | `release_event` `(新)` | `EVENT_RELEASE` | — | 12 | — | ❌ |
| 回复 LP | `recover_event` `(新)` | `EVENT_RECOVER` | — | — | — | ❌ |
| 伤害 | `damage_event` `(新)` | `EVENT_DAMAGE` | — | — | — | ❌ |

---

### C. 发动代价 cost 全集

> 口径：怪兽按 `REASON_COST`（2160）与 `Cost.*` 库；魔法按 `SetCost` 898 文件及 `Cost.*` 实测；
> 陷阱按 `SetCost` 680 文件。代价段只允许做资源支付，不得做效果处理。

#### 支付生命值 (`pay_lp`)
- **语义**：支付指定 LP 作为代价。
- **卡种命中**：怪兽 69（`Duel.PayLPCost`）/ 魔法 78（`Cost.PayLP`，另 `Duel.PayLPCost` 40）/ 陷阱 47。
- **lua 实现特征**：`Duel.PayLPCost(tp,1000)` 或 `Cost.PayLP(1000)(e,tp,eg,ep,ev,re,r,rp,chk)`。
- **需自定义参数**：`lpAmount`(int, 默认 1000)、`who`(默认 self)。
- **设计器覆盖**：✅（`pay_lp`，固定 1000 可改）
- **优先级**：P0

#### 丢弃手卡 (`discard`)
- **语义**：丢弃任意/指定手卡。
- **卡种命中**：怪兽 378（`Duel.DiscardHand`）/ 魔法 157 / 陷阱 82。
- **lua 实现特征**：`Duel.DiscardHand(tp,Card.IsDiscardable,n,n,REASON_COST+REASON_DISCARD)`；辅助 `Cost.Discard(8)`。
- **需自定义参数**：`count`、`random`(bool)、`filter`、`who`。
- **设计器覆盖**：✅（`discard_one`/`discard_n`）
- **优先级**：P0

#### 解放自身 (`release_self`)
- **语义**：把自身解放作代价。
- **卡种命中**：怪兽 277（`Cost.SelfTribute`）/ 魔法 1 / 陷阱 —。
- **lua 实现特征**：`Cost.SelfTribute(e,tp,...,chk)`；`Duel.Release(c,REASON_COST)`。
- **需自定义参数**：无（或 `asTribute` 标记）。
- **设计器覆盖**：✅（`release_self`）
- **优先级**：P0

#### 解放怪兽 N (`release_monster_n`)
- **语义**：解放场上/手卡 N 只怪兽。
- **卡种命中**：怪兽 503（`Duel.Release`）/ 魔法 115 / 陷阱 238。
- **lua 实现特征**：`Duel.CheckReleaseGroupCost` + `Duel.SelectReleaseGroupCost`。
- **需自定义参数**：`count`、`filter`(等级/种族/字段)、`zone`。
- **设计器覆盖**：✅
- **优先级**：P0

#### 取除超量素材 (`detach_xyz`)
- **语义**：取除自身/场上超量素材。
- **卡种命中**：怪兽（`Cost.DetachFromSelf`）/ 魔法 / 陷阱（超量素材相关 `Duel.Overlay` 72）。
- **lua 实现特征**：`Cost.DetachFromSelf(e,tp,...,chk)` / `Duel.RemoveOverlayCard`。
- **需自定义参数**：`count`、`fromSelf`(bool)。
- **设计器覆盖**：✅（`detach_xyz`）
- **优先级**：P0

#### 除外墓地的卡 (`banish_gy`)
- **语义**：除外自己/双方墓地 N 张作为代价。
- **卡种命中**：怪兽（`Cost.SelfBanish` 类）/ 魔法 219（`Cost.SelfBanish`）/ 陷阱。
- **lua 实现特征**：`Duel.Remove(g,POS_FACEUP,REASON_COST)`；`Card.IsAbleToRemoveAsCost`（魔法 141 文件）。
- **需自定义参数**：`count`、`fromSelf`/`fromOppo`、`filter`、`pos`。
- **设计器覆盖**：✅（`banish_one_gy`/`banish_gy_n`）
- **优先级**：P0

#### 自身除外 (`self_banish`)
- **语义**：把这张卡自身除外作代价（发动的卡离场/回场类）。
- **卡种命中**：怪兽 —（多以 effect 计）/ 魔法 219（`Cost.SelfBanish`）/ 陷阱 —。
- **lua 实现特征**：`Cost.SelfBanish(e,tp,eg,ep,ev,re,r,rp,chk)`；`Duel.Remove(e:GetHandler(),POS_FACEUP,REASON_COST)`。
- **需自定义参数**：`pos`(FACEUP/FACEDOWN)、`returnOnResolve`(是否结算后归还)。
- **设计器覆盖**：❌
- **优先级**：P1

#### 自身送墓 (`self_to_grave`)
- **语义**：把自身送去墓地作代价。
- **卡种命中**：魔法 27（`Cost.SelfToGrave`）；陷阱（`Duel.SendtoGrave` 271 含代价）。
- **lua 实现特征**：`Cost.SelfToGrave(e,tp,...,chk)`；`Duel.SendtoGrave(c,REASON_COST)`。
- **需自定义参数**：`alsoSendFromHand`/`fromField`。
- **设计器覆盖**：❌
- **优先级**：P1

#### 自身回卡组 (`self_to_deck`)
- **语义**：把自身放回卡组作代价。
- **卡种命中**：魔法 2（`Cost.SelfToDeck`）。
- **lua 实现特征**：`Cost.SelfToDeck(e,tp,...,chk)`；`Duel.SendtoDeck(c,nil,SEQ_DECKSHUFFLE,REASON_COST)`。
- **需自定义参数**：`seq`(TOP/BOTTOM/SHUFFLE)。
- **设计器覆盖**：❌
- **优先级**：P2

#### 展示手卡 (`reveal`)
- **语义**：展示手卡/卡组顶作为代价或条件前置。
- **卡种命中**：魔法 2（`Cost.Reveal`）/ 怪兽 / 陷阱。
- **lua 实现特征**：`Cost.Reveal(...)` / `Duel.ConfirmCards(tp,g)`。
- **需自定义参数**：`count`、`filter`、`toOppo`(是否给对手看)。
- **设计器覆盖**：❌
- **优先级**：P2

#### 卡组顶送墓 (`mill_deck_n`)
- **语义**：把卡组顶 N 张送墓作代价。
- **卡种命中**：怪兽 97（`Duel.DiscardDeck`）/ 魔法 20 / 陷阱 18。
- **lua 实现特征**：`Duel.DiscardDeck(tp,n,REASON_COST)`。
- **需自定义参数**：`count`、`who`。
- **设计器覆盖**：✅
- **优先级**：P1

#### 除外手卡 (`banish_hand_n`)
- **语义**：除外手卡 N 张作代价。
- **卡种命中**：怪兽 / 魔法 / 陷阱。
- **lua 实现特征**：`Duel.Remove(handg,POS_FACEUP,REASON_COST)`。
- **需自定义参数**：`count`、`filter`。
- **设计器覆盖**：✅
- **优先级**：P1

#### 送墓 N (`send_to_grave_n`)
- **语义**：把场上/手卡 N 张送墓作代价。
- **卡种命中**：怪兽 1159（`SendtoGrave` 总）/ 魔法 385 / 陷阱 271。
- **lua 实现特征**：`Duel.SendtoGrave(g,REASON_COST)`。
- **需自定义参数**：`count`、`zone`、`filter`。
- **设计器覆盖**：✅（`send_to_grave_n`）
- **优先级**：P1

#### 组合代价 (`cost_and`)
- **语义**：多个代价「与」组合。
- **卡种命中**：魔法 5（`Cost.AND`）。
- **lua 实现特征**：`Cost.AND(Cost.A,Cost.B)`。
- **需自定义参数**：`costs[]`（代价数组）。
- **设计器覆盖**：❌（设计器为单代价）
- **优先级**：P2

#### 发动/召唤代价施加 (`activate_cost`)
- **语义**：常驻地给「每次发动/召唤/set」强加付 LP 或代价。
- **卡种命中**：魔法 4（`EFFECT_ACTIVATE_COST`，`EFFECT_SUMMON_COST`/`SPSUMMON_COST`/`MSET_COST`/`SSET_COST` 各 1~5）；陷阱 1。
- **lua 实现特征**：`e:SetCode(EFFECT_ACTIVATE_COST)` + `e:SetCost(...)` + `e:SetOperation(Duel.ActivateCost)`。
- **需自定义参数**：`applyTo`(activate/summon/spsummon/mset/sset)、`lp`/`cost`、`scope`(手卡/场上)。
- **设计器覆盖**：❌
- **优先级**：P2

#### 指示物代价 (`remove_counter`)
- **语义**：取除指示物作代价。
- **卡种命中**：怪兽 33（`Duel.RemoveCounter`）/ 魔法 19 / 陷阱 5。
- **lua 实现特征**：`Duel.RemoveCounter(tp,1,1,COUNTER_A,n,REASON_COST)`；前置 `Duel.IsCanRemoveCounter`。
- **需自定义参数**：`counterType`、`count`、`who`。
- **设计器覆盖**：❌
- **优先级**：P2

#### 其他低频代价 (`other_costs`)
- **语义**：解放 token、弃置随机、回复/伤害自身、改变表示形式等作代价。
- **卡种命中**：合计 < 30。
- **lua 实现特征**：`Duel.ChangePosition(c,POS_FACEDOWN_DEFENSE,REASON_COST)` 等。
- **需自定义参数**：视具体而定。
- **设计器覆盖**：❌
- **优先级**：P2

---

### D. 效果本体 action 全集（按语义分组）

> 这是设计器的核心。`卡种命中` 为命中文件数；`lua 特征` 给出关键 API。

#### D1. 调度与检索

##### 卡组检索加入手卡 (`search_deck`)
- **语义**：从卡组选 N 张加入手卡并公开。
- **卡种命中**：怪兽 1196（`CATEGORY_SEARCH`）/ 魔法 505 / 陷阱 113。
- **lua 实现特征**：`SelectMatchingCard` → `SendtoHand(g,nil,REASON_EFFECT)` → `ConfirmCards(1-tp,g)`；`SetOperationInfo(0,CATEGORY_TOHAND,nil,N,tp,LOCATION_DECK)`。
- **需自定义参数**：`count`(1~N, 默认1)、`filter`、`confirm`(默认 true)、`shuffle`(默认 false)、`from`(默认 DECK)、`branchToHandOrElse`(手卡/送墓/特召三分支)。
- **设计器覆盖**：✅（来源区与三分支需扩展）
- **优先级**：P0

##### 多区域合并检索 (`search_multi_zone` `(新)`)
- **语义**：同时从卡组+墓地+除外+额外检索。
- **卡种命中**：怪兽（`LOCATION_*` 组合）/ 魔法（`LOCATION_REMOVED` 193）/ 陷阱。
- **lua 实现特征**：`SelectMatchingCard(tp,f,LOCATION_DECK|LOCATION_GRAVE,0,...)`。
- **需自定义参数**：`zones[]`(多选)。
- **设计器覆盖**：❌
- **优先级**：P1

##### 墓地回收 (`salvage_grave`)
- **语义**：把墓地卡加入手卡/卡组。
- **卡种命中**：怪兽（`CATEGORY_LEAVE_GRAVE` 类）/ 魔法 103（`CATEGORY_LEAVE_GRAVE`）/ 陷阱 23。
- **lua 实现特征**：`SendtoHand` 目标 `LOCATION_GRAVE`。
- **需自定义参数**：`to`(hand/deck/extra)、`count`、`filter`。
- **设计器覆盖**：⚠️（`to_hand_target` 可近似）
- **优先级**：P1

##### 除外区回收 (`salvage_banished` `(新)`)
- **语义**：把除外卡回收。
- **卡种命中**：魔法 193（`LOCATION_REMOVED` 文件）/ 怪兽 943（`Duel.Remove` 总）/ 陷阱。
- **lua 实现特征**：`SendtoHand/SendtoDeck` 目标 `LOCATION_REMOVED`。
- **需自定义参数**：`to`、`count`、`filter`、`pos`(表/里)。
- **设计器覆盖**：❌
- **优先级**：P1

##### 额外卡组回收 (`salvage_extra`)
- **语义**：额外卡组/灵摆送额外相关回收。
- **卡种命中**：怪兽 48（`CATEGORY_TOEXTRA`）/ 魔法 14 / 陷阱 14。
- **lua 实现特征**：`Duel.SendtoExtraP`（怪兽 17）；`CATEGORY_TOEXTRA`。
- **需自定义参数**：`count`、`pos`、`from`。
- **设计器覆盖**：⚠️（`salvage_extra` 语义偏「加入手卡」）
- **优先级**：P1

##### 卡组送墓 / 堆墓 (`dump_deck`)
- **语义**：从卡组把卡送墓。
- **卡种命中**：怪兽 201（`CATEGORY_DECKDES`）/ 魔法 23 / 陷阱 23。
- **lua 实现特征**：`SendtoGrave`，来源 `LOCATION_DECK`；或 `DiscardDeck`。
- **需自定义参数**：`count`、`fromTop`(默认 true)、`filter`、`reason`。
- **设计器覆盖**：✅
- **优先级**：P0

##### 削卡组（对手）(`discard_deck`)
- **语义**：把卡组顶 N 张送入墓地（削卡）。
- **卡种命中**：怪兽 97 / 魔法 20 / 陷阱 18。
- **lua 实现特征**：`Duel.DiscardDeck(tp,n,REASON_EFFECT)`；前置 `Duel.IsPlayerCanDiscardDeck`。
- **需自定义参数**：`count`、`who`(默认 oppo)。
- **设计器覆盖**：⚠️（`dump_deck` 有 `mill_deck_n` cost；作为 action 未列）
- **优先级**：P1

##### 场上/手卡送墓 (`send_to_grave`)
- **语义**：把场上或手卡卡送去墓地（作为效果）。
- **卡种命中**：怪兽 499 / 魔法 189 / 陷阱 97。
- **lua 实现特征**：`Duel.SendtoGrave(g,REASON_EFFECT)`。
- **需自定义参数**：`count`、`zone`(ONFIELD/HAND/DECK)、`who`、`filter`。
- **设计器覆盖**：⚠️（仅 `dump_deck` / cost 形态）
- **优先级**：P0

##### 返回卡组 (`to_deck`)
- **语义**：把卡放回卡组顶/底/洗回。
- **卡种命中**：怪兽 394（`CATEGORY_TODECK`）/ 魔法 201 / 陷阱 131。
- **lua 实现特征**：`Duel.SendtoDeck(g,nil,SEQ_DECKTOP|SEQ_DECKBOTTOM|SEQ_DECKSHUFFLE,REASON_EFFECT)`；`ShuffleDeck`（魔法 113）。
- **需自定义参数**：`seq`(TOP/BOTTOM/SHUFFLE, 默认 SHUFFLE)、`count`、`from`、`who`。
- **设计器覆盖**：❌
- **优先级**：P0

##### 返回额外卡组 (`to_extra`)
- **语义**：把卡返回额外卡组。
- **卡种命中**：怪兽 48（`CATEGORY_TOEXTRA`）/ 魔法 14 / 陷阱 14。
- **lua 实现特征**：`Duel.SendtoDeck(g,nil,SEQ_DECKTOP,REASON_EFFECT)`；摆怪用 `Duel.SendtoExtraP`。
- **需自定义参数**：`count`、`from`、`pos`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 反转卡组顶并处理 (`excavate`)
- **语义**：翻开卡组顶 N 张，按命中/未命中分流，再洗回/送墓。
- **卡种命中**：怪兽 98（`ConfirmDecktop`）/ 魔法 44 / 陷阱 15。
- **lua 实现特征**：`Duel.ConfirmDecktop(tp,n)` + `Duel.GetDecktopGroup`（怪兽 112）+ `Duel.DisableShuffleCheck()`（怪兽 85）。
- **需自定义参数**：`count`、`onHit`(手卡/特召/除外)、`onMiss`(墓地/卡组顶/洗回)、`shuffle`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 卡组顶/底排序 (`sort_decktop` / `sort_deckbottom`)
- **语义**：确认并重新排序卡组顶/底若干张。
- **卡种命中**：怪兽 22/30 / 魔法 14 / 陷阱 8。
- **lua 实现特征**：`Duel.SortDecktop(tp,tp,3)`；`Duel.SortDeckbottom`。
- **需自定义参数**：`count`(默认 3)、`position`(top/bottom)、`reveal`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 卡组顶/底放置 (`move_deck_top` / `move_deck_bottom`)
- **语义**：把卡放到卡组顶/底（不洗牌）。
- **卡种命中**：怪兽 6/23。
- **lua 实现特征**：`Duel.MoveToDeckTop` / `Duel.MoveToDeckBottom`。
- **需自定义参数**：`position`、`count`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 洗切手卡 / 卡组 / 额外 (`shuffle_hand` / `shuffle_deck` / `shuffle_extra`)
- **语义**：洗切对应区域。
- **卡种命中**：怪兽 291/124/23；魔法 156/113/13；陷阱 —。
- **lua 实现特征**：`Duel.ShuffleHand(tp)` / `ShuffleDeck` / `ShuffleExtra`。
- **需自定义参数**：`zone`、`who`。
- **设计器覆盖**：❌（多为副操作）
- **优先级**：P2

#### D2. 特殊召唤

##### 从指定区域特召 (`special_summon`)
- **语义**：从手卡/卡组/墓地/除外/额外特殊召唤怪兽。
- **卡种命中**：怪兽 3581（`CATEGORY_SPECIAL_SUMMON`）/ 魔法 937 / 陷阱 716。
- **lua 实现特征**：
  ```lua
  Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and c:IsCanBeSpecialSummoned(...)
  Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)
  ```
- **需自定义参数**：`from`(HAND/DECK/GRAVE/REMOVED/EXTRA, 多选)、`count`、`who`、`pos`(POS_FACEUP/POS_FACEUP_DEFENSE/POS_FACEDOWN_DEFENSE)、`ignoreCondition`(bool)、`toOppoField`(bool)、`asProcedure`(bool)。
- **设计器覆盖**：⚠️
- **优先级**：P0

##### 墓地复活 (`revive_grave`)
- **语义**：`special_summon` 的墓地子集。
- **卡种命中**：怪兽 / 魔法 751（`Duel.SpecialSummon`）/ 陷阱 642。
- **lua 实现特征**：来源 `LOCATION_GRAVE`；受苏生限制 `EFFECT_REVIVE_LIMIT`。
- **需自定义参数**：同 `special_summon` + `reviveLimit`。
- **设计器覆盖**：✅
- **优先级**：P0

##### 除外区特召 (`special_summon_banished` `(新)`)
- **语义**：从除外区把怪兽特召。
- **卡种命中**：怪兽 943（`Duel.Remove` 文件）/ 魔法 / 陷阱。
- **lua 实现特征**：来源 `LOCATION_REMOVED`；`SendtoGrave` 后 `SpecialSummon` 或直接 `SpecialSummon`。
- **需自定义参数**：`count`、`pos`、`filter`。
- **设计器覆盖**：❌
- **优先级**：P0

##### 额外卡组特召 (`special_summon_extra` `(新)`)
- **语义**：从额外卡组特召（非手续）。
- **卡种命中**：怪兽（`LOCATION_EXTRA` 广泛）/ 魔法 — / 陷阱 —。
- **lua 实现特征**：`Duel.GetLocationCountFromEx`（怪兽；魔法 124 / 陷阱 72 文件）校验额外怪兽区额度。
- **需自定义参数**：`count`、`pos`、`ignoreEmzone`(bool)。
- **设计器覆盖**：❌
- **优先级**：P1

##### 多体同时特召 (`special_summon_multi` `(新)`)
- **语义**：一次特召多体（Step + Complete）。
- **卡种命中**：怪兽 401（`SpecialSummonStep`）/ 魔法 162 / 陷阱 215。
- **lua 实现特征**：循环 `Duel.SpecialSummonStep(...)` → `Duel.SpecialSummonComplete()`。
- **需自定义参数**：`count`、`from`、`pos`、`filter`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 给对方特召 (`special_summon_oppo` `(新)`)
- **语义**：把怪兽特召到对手场上。
- **卡种命中**：怪兽 / 魔法 / 陷阱。
- **lua 实现特征**：`Duel.SpecialSummon(tc,0,1-tp,1-tp,...)`。
- **需自定义参数**：`toOppoField`(bool)。
- **设计器覆盖**：❌
- **优先级**：P2

##### 展开衍生物 (`token_summon`)
- **语义**：生成 token 并特召。
- **卡种命中**：怪兽 137（`CATEGORY_TOKEN`）/ 魔法 63 / 陷阱 36。
- **lua 实现特征**：
  ```lua
  Duel.IsPlayerCanSpecialSummonMonster(tp,id,SET,TYPES_TOKEN,atk,def,lv,race,attr)
  local token=Duel.CreateToken(tp,id+1); Duel.SpecialSummonStep(token,...)
  ```
- **需自定义参数**：`count`、`atk`、`def`、`level`、`race`、`attribute`、`pos`、`tokenSetcode`、`repeat`(SelectYesNo 循环)。
- **设计器覆盖**：❌
- **优先级**：P0

##### 执行手续召唤 (`special_summon_procedure` `(新)`)
- **语义**：由效果直接执行融合/同调/超量/连接/仪式召唤。
- **卡种命中**：怪兽 / 魔法 126（`Fusion.*`）、95（`Ritual.*`）/ 陷阱 17（`CATEGORY_FUSION_SUMMON`）。
- **lua 实现特征**：`Fusion.CreateSummonEff`（魔法 86 / 陷阱 11）、`Fusion.SummonEffTG/OP`、`Duel.XyzSummon/SynchroSummon/LinkSummon`。
- **需自定义参数**：`summonType`、`matFilter`、`matLocation`、`banishMat`/`shuffleMat`、`sumpos`、`ignoreCondition`。
- **设计器覆盖**：⚠️（仅文本手续，无「发动效果直接执行手续」动作）
- **优先级**：P1

##### 陷阱怪兽化 (`trap_monster` `(新)`)
- **语义**：把陷阱卡本身变成怪兽并特召。
- **卡种命中**：陷阱 76（3.7%）。
- **lua 实现特征**：
  ```lua
  c:AddMonsterAttribute(TYPE_EFFECT|TYPE_TRAP)
  Duel.SpecialSummonStep(c,0,tp,tp,true,false,POS_FACEUP_DEFENSE)
  c:AddMonsterAttributeComplete(); Duel.SpecialSummonComplete()
  ```
- **需自定义参数**：`atk`、`def`、`level`、`race`、`attribute`、`pos`、`laterEffects`(怪兽化后追加效果)。
- **设计器覆盖**：❌
- **优先级**：P1

##### 盖放 (`set_monster` / `sset`)
- **语义**：把怪兽里侧盖放 / 把魔陷盖放。
- **卡种命中**：怪兽 23（`CATEGORY_SET` 427 总）/ 魔法 123（`CATEGORY_SET`）/ 陷阱 147。
- **lua 实现特征**：`Duel.SSet(tp,c)`（魔法 88 / 陷阱 85）；`Duel.MoveToField(c,tp,tp,LOCATION_MZONE,POS_FACEDOWN_DEFENSE,true)`。
- **需自定义参数**：`pos`、`count`、`who`、`asSummon`(bool)。
- **设计器覆盖**：❌
- **优先级**：P1

##### 通常召唤 (`summon_normal` `(新)`)
- **语义**：由效果进行通常召唤/盖放。
- **卡种命中**：陷阱 13（`CATEGORY_SUMMON`）。
- **lua 实现特征**：`Duel.SummonOrSet`；`CATEGORY_SUMMON+CATEGORY_SET`。
- **需自定义参数**：`asSet`(bool)。
- **设计器覆盖**：❌
- **优先级**：P2

#### D3. 除去与移动

##### 破坏 (`destroy_target`)
- **语义**：破坏场上指定卡。
- **卡种命中**：怪兽 1521 / 魔法 340 / 陷阱 493。
- **lua 实现特征**：`SelectTarget`（或 `GetMatchingGroup`）→ `Duel.Destroy(g,REASON_EFFECT)`；群破 `wipe_*`。
- **需自定义参数**：`count`、`who`、`zone`(MZONE/SZONE/ONFIELD)、`targeted`(默认 true)、`filter`、`ignoreImmune`、`destroyOrder`。
- **设计器覆盖**：✅（缺「按条件数量动态破坏」「先己方后对方」顺序控制）
- **优先级**：P0

##### 动态数量破坏 (`destroy_dynamic` `(新)`)
- **语义**：按某条件（如对手卡数、自己墓地数）决定破坏张数。
- **卡种命中**：怪兽 / 魔法（如 c13210191）/ 陷阱。
- **lua 实现特征**：`local ct=Duel.GetFieldGroupCount(...)` → `g:Select(tp,1,ct,nil)` → `Duel.Destroy`。
- **需自定义参数**：`countSource`(valueSource)、`maxCount`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 除外 (`banish_target`)
- **语义**：把场上/墓地卡除外。
- **卡种命中**：怪兽 474 / 魔法 184 / 陷阱 156。
- **lua 实现特征**：`Duel.Remove(g,POS_FACEUP|POS_FACEDOWN,REASON_EFFECT)`。
- **需自定义参数**：`count`、`who`、`zone`、`pos`(表/里, 默认表)、`temporary`(暂时除外)、`targeted`。
- **设计器覆盖**：✅（缺里侧除外、暂时除外）
- **优先级**：P0

##### 弹回手卡 (`to_hand_target`)
- **语义**：把场上卡加入手卡。
- **卡种命中**：怪兽 1878（`SendtoHand`）/ 魔法 747 / 陷阱 267。
- **lua 实现特征**：`Duel.SendtoHand(g,nil,REASON_EFFECT)`；提示 `HINTMSG_RTOHAND`。
- **需自定义参数**：`count`、`who`、`zone`、`confirm`、`targeted`。
- **设计器覆盖**：✅
- **优先级**：P0

##### 解放（作为效果）(`release_target` `(新)`)
- **语义**：把怪兽解放（非代价）。
- **卡种命中**：怪兽 40（`CATEGORY_RELEASE`）/ 魔法 13 / 陷阱 7。
- **lua 实现特征**：`Duel.Release(g,REASON_EFFECT)`。
- **需自定义参数**：`count`、`who`、`filter`。
- **设计器覆盖**：❌（仅作代价）
- **优先级**：P1

##### 效果弃手 (`discard_hand` `(新)`)
- **语义**：让玩家丢弃手卡（效果，非代价）。
- **卡种命中**：怪兽 149（`CATEGORY_HANDES`）/ 魔法 76 / 陷阱 42。
- **lua 实现特征**：`Duel.DiscardHand(p,filter,min,max,REASON_EFFECT+REASON_DISCARD)`。
- **需自定义参数**：`count`(min,max)、`who`、`random`、`filter`。
- **设计器覆盖**：❌（仅 cost）
- **优先级**：P1

##### 吸素材 / 挂载超量素材 (`attach_overlay` `(新)`)
- **语义**：把卡作为超量素材挂到场上超量怪下。
- **卡种命中**：怪兽 164（`Duel.Overlay`）/ 魔法 / 陷阱 72。
- **lua 实现特征**：`Duel.Overlay(tc,mg)`。
- **需自定义参数**：`from`、`count`、`targetXyz`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 取除超量素材（作为效果）(`detach_overlay_effect` `(新)`)
- **语义**：取除超量素材（效果，非代价）。
- **卡种命中**：陷阱 9（`RemoveOverlayCard`）+ `CheckRemoveOverlayCard` 9。
- **lua 实现特征**：`Duel.RemoveOverlayCard(tp,1,1,1,n,REASON_EFFECT)`。
- **需自定义参数**：`count`、`who`、`destination`(GRAVE/REMOVED)。
- **设计器覆盖**：❌
- **优先级**：P2

##### 直接置场 (`move_to_field` `(新)`)
- **语义**：把墓地/除外/手卡卡直接放到场上某区域（可不视作召唤）。
- **卡种命中**：怪兽 147（`Duel.MoveToField`）/ 魔法 59 / 陷阱 33。
- **lua 实现特征**：`Duel.MoveToField(c,tp,tp,LOCATION_SZONE,POS_FACEUP,true)`。
- **需自定义参数**：`zone`(MZONE/SZONE/FZONE/PZONE)、`pos`、`asSummon`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 换位 (`move_sequence` `(新)`)
- **语义**：把场上卡移动到另一区域/位置。
- **卡种命中**：魔法 30（`Duel.MoveSequence`）/ 陷阱。
- **lua 实现特征**：`Duel.MoveSequence(c,seq)`。
- **需自定义参数**：`seq`(0~6)、`count`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 区域封锁 (`select_disable_field` `(新)`)
- **语义**：选择并封锁区域。
- **卡种命中**：魔法 11 / 陷阱 11。
- **lua 实现特征**：`Duel.SelectDisableField(tp,1,LOCATION_MZONE,0,0)`，需 `math.log(...,2)` 转序号。
- **需自定义参数**：`zoneType`、`count`、`duration`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 返回场上 (`return_to_field` `(新)`)
- **语义**：把被暂时除外的卡放回场上。
- **卡种命中**：怪兽 40（`Duel.ReturnToField`）。
- **lua 实现特征**：`Duel.ReturnToField(c,pos)`。
- **需自定义参数**：`pos`、`count`。
- **设计器覆盖**：❌
- **优先级**：P2

#### D4. 数值变动

##### 攻击力/守备力增减 (`atk_change` / `def_change`)
- **语义**：增量式修改 ATK/DEF（可负）。
- **卡种命中**：怪兽 1319（`EFFECT_UPDATE_ATTACK`）/ 魔法 434 / 陷阱 159；DEF 分别为 292 / 143 / 38。
- **lua 实现特征**：
  ```lua
  e1:SetType(EFFECT_TYPE_SINGLE) e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
  e1:SetCode(EFFECT_UPDATE_ATTACK) e1:SetRange(LOCATION_MZONE) e1:SetValue(n)
  ```
- **需自定义参数**：`stat`(atk/def/both)、`delta`(int 可负)、`targetFilter`、`who`、`targeted`、`reset`、`valueSource`。
- **设计器覆盖**：⚠️（`atk_boost` 仅固定增量，无 DEF/负值/来源）
- **优先级**：P0

##### 攻击力/守备力设定 (`atk_set` / `def_set` `(新)`)
- **语义**：覆盖式设定 ATK/DEF（当前值/基础值/最终值）。
- **卡种命中**：怪兽 262（`SET_ATTACK_FINAL`）+74（`SET_ATTACK`）+81（`SET_BASE_ATTACK`）/ 魔法 60+14+11 / 陷阱 41+11+9。
- **lua 实现特征**：`EFFECT_SET_ATTACK` / `_FINAL` / `_BASE_ATTACK` / `_DEFENSE_FINAL` / `_BASE_DEFENSE`。
- **需自定义参数**：`mode`(set/base/final)、`value`(固定/函数)、`stat`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 攻守减半/交换 (`atk_half` / `atk_def_swap`)
- **语义**：把攻守减半、或与另一只怪交换数值。
- **卡种命中**：怪兽 6（`EFFECT_SWAP_BASE_AD`）/ 魔法 / 陷阱（如 c94156050 减半）。
- **lua 实现特征**：`SetValue(function(e,c) return c:GetAttack()/2 end)`；`EFFECT_SWAP_AD`/`SWAP_BASE_AD`。
- **需自定义参数**：`factor`、`target`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 等级 / 阶级 / 连接刻度变动 (`level_change`)
- **语义**：增减或设定等级、阶级、连接值。
- **卡种命中**：怪兽 180（`UPDATE_LEVEL`）+158（`CHANGE_LEVEL`）/ 魔法 32+37 / 陷阱 14+18。
- **lua 实现特征**：`EFFECT_UPDATE_LEVEL` / `EFFECT_CHANGE_LEVEL` / `EFFECT_XYZ_LEVEL`（17）/ `EFFECT_UPDATE_RANK` / `EFFECT_CHANGE_RANK`。
- **需自定义参数**：`mode`(update/change/set)、`delta`、`target`、`announceRange`(如 AnnounceLevel(1,2))。
- **设计器覆盖**：❌（`ruleLevel` 仅卡面）
- **优先级**：P1

##### 属性变更/追加 (`change_attribute` / `add_attribute`)
- **语义**：改变或追加属性。
- **卡种命中**：怪兽 58（`CHANGE_ATTRIBUTE`）+18（`ADD_ATTRIBUTE`）/ 魔法 14 / 陷阱 10。
- **lua 实现特征**：`EFFECT_CHANGE_ATTRIBUTE` / `EFFECT_ADD_ATTRIBUTE` + `SetTargetRange`。
- **需自定义参数**：`mode`(change/add)、`attribute`、`targetFilter`、`who`。
- **设计器覆盖**：⚠️（仅 `ruleAttribute` 卡面）
- **优先级**：P1

##### 种族变更/追加 (`change_race` / `add_race`)
- **语义**：改变或追加种族。
- **卡种命中**：怪兽 34（`CHANGE_RACE`）+1（`ADD_RACE`）/ 魔法 16 / 陷阱 13。
- **lua 实现特征**：`EFFECT_CHANGE_RACE` / `EFFECT_ADD_RACE` + `SetTargetRange`。
- **需自定义参数**：`mode`、`race`、`targetFilter`。
- **设计器覆盖**：⚠️（仅 `ruleRace` 卡面）
- **优先级**：P1

##### 种类变更/追加 (`change_type` / `add_type`)
- **语义**：改变或追加怪兽种类（含把魔陷改成怪兽/永续）。
- **卡种命中**：怪兽 49+105 / 魔法 21+16 / 陷阱 10+3。
- **lua 实现特征**：`EFFECT_CHANGE_TYPE` / `EFFECT_ADD_TYPE`；`EFFECT_MONSTER_SSET`。
- **需自定义参数**：`mode`、`cardType`、`targetFilter`。
- **设计器覆盖**：⚠️（仅 `addMonsterType` 卡面）
- **优先级**：P1

##### 卡名/卡号变更 (`change_code` / `add_code`)
- **语义**：让卡视为同名/追加卡号（别名）。
- **卡种命中**：怪兽 140（`CHANGE_CODE`）+6 / 魔法 17 / 陷阱 9。
- **lua 实现特征**：`EFFECT_CHANGE_CODE` / `EFFECT_ADD_CODE`；`s.listed_names`。
- **需自定义参数**：`targetCardId`、`mode`(change/add)、`targetFilter`。
- **设计器覆盖**：⚠️（`alias(ADD_CODE)` 仅外文本）
- **优先级**：P1

##### 追加字段 (`add_setcode`)
- **语义**：让卡追加属于某字段（Setcode）。
- **卡种命中**：怪兽 5 / 魔法 / 陷阱 5。
- **lua 实现特征**：`EFFECT_ADD_SETCODE`；`s.listed_series`。
- **需自定义参数**：`setcode`、`targetFilter`。
- **设计器覆盖**：❌（筛选侧已有字段库，效果层未支持）
- **优先级**：P2

##### 灵摆刻度变动 (`scale_change`)
- **语义**：改变左/右灵摆刻度。
- **卡种命中**：怪兽 19（`CHANGE_LSCALE`/`CHANGE_RSCALE`）+10（`UPDATE_*`）/ 魔法 / 陷阱 —。
- **lua 实现特征**：`EFFECT_UPDATE_LSCALE` / `EFFECT_UPDATE_RSCALE` / `EFFECT_CHANGE_LSCALE` / `EFFECT_CHANGE_RSCALE`。
- **需自定义参数**：`side`(left/right/both)、`mode`(update/change)、`value`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 伤害/回复反转 (`reverse_damage` / `reverse_recover`)
- **语义**：让伤害变回复、回复变伤害。
- **卡种命中**：怪兽 6/1；魔法 / 陷阱 3/4（`REVERSE_DAMAGE`/`REVERSE_RECOVER`）。
- **lua 实现特征**：`EFFECT_REVERSE_DAMAGE` / `EFFECT_REVERSE_RECOVER`。
- **需自定义参数**：`who`、`condition`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 伤害翻倍 (`double_damage`)
- **语义**：使造成的伤害翻倍。
- **卡种命中**：怪兽（`EFFECT_DOUBLE_DAMAGE`）；魔法（`aux.ChangeBattleDamage(1,DOUBLE_DAMAGE)` 39）。
- **lua 实现特征**：`EFFECT_DOUBLE_DAMAGE`；`aux.ChangeBattleDamage`。
- **需自定义参数**：`scope`(battle/effect)。
- **设计器覆盖**：❌
- **优先级**：P2

#### D5. 战斗

##### 直接攻击 (`direct_attack` `(新)`)
- **语义**：允许此卡直接攻击。
- **卡种命中**：怪兽 163（`EFFECT_DIRECT_ATTACK`）/ 魔法 27 / 陷阱 4。
- **lua 实现特征**：`e:SetCode(EFFECT_DIRECT_ATTACK)`。
- **需自定义参数**：`condition`、`targetFilter`。
- **设计器覆盖**：⚠️（`canDirectAttack` 仅 ruleText）
- **优先级**：P1

##### 追加攻击 (`extra_attack` `(新)`)
- **语义**：增加攻击次数。
- **卡种命中**：怪兽 131（`EXTRA_ATTACK`）+41（`EXTRA_ATTACK_MONSTER`）/ 魔法 30 / 陷阱 8+3。
- **lua 实现特征**：`EFFECT_EXTRA_ATTACK` + `SetValue(n)`。
- **需自定义参数**：`count`、`condition`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 攻击所有怪兽 (`attack_all` `(新)`)
- **语义**：可攻击对方每只怪兽一次。
- **卡种命中**：怪兽 38（`EFFECT_ATTACK_ALL`）。
- **lua 实现特征**：`EFFECT_ATTACK_ALL` + `SetValue(1)`。
- **需自定义参数**：`filter`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 贯穿 (`pierce` `(新)`)
- **语义**：攻击守备怪造成穿刺伤害。
- **卡种命中**：怪兽 157（`EFFECT_PIERCE`）/ 魔法 22 / 陷阱 8。
- **lua 实现特征**：`EFFECT_PIERCE` + `SetValue(1)`。
- **需自定义参数**：`multiplier`(默认 1)。
- **设计器覆盖**：❌
- **优先级**：P1

##### 守备表示攻击 (`defense_attack` `(新)`)
- **语义**：以守备力攻击。
- **卡种命中**：陷阱 2（`EFFECT_DEFENSE_ATTACK`）。
- **lua 实现特征**：`EFFECT_DEFENSE_ATTACK`。
- **需自定义参数**：`useDef`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 先制攻击 / 两次战斗阶段 (`first_attack` / `bp_twice` `(新)`)
- **语义**：先攻/可进行两次战斗阶段。
- **卡种命中**：怪兽 2（`EFFECT_BP_TWICE`）；陷阱 1。
- **lua 实现特征**：`EFFECT_FIRST_ATTACK` / `EFFECT_BP_TWICE`。
- **需自定义参数**：`who`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 战斗伤害改写 (`change_battle_damage` `(新)`)
- **语义**：战斗伤害翻倍/减半/固定。
- **卡种命中**：怪兽 62 / 魔法 17 / 陷阱 9。
- **lua 实现特征**：`EFFECT_CHANGE_BATTLE_DAMAGE` + `SetValue(DOUBLE_DAMAGE/HALF_DAMAGE)`。
- **需自定义参数**：`mode`(double/half/zero/set)、`value`、`who`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 战斗伤害防止 (`avoid_battle_damage` `(新)`)
- **语义**：不受/不造成战斗伤害。
- **卡种命中**：怪兽 95 / 魔法 20 / 陷阱 21。
- **lua 实现特征**：`EFFECT_AVOID_BATTLE_DAMAGE` + `SetTargetRange`。
- **需自定义参数**：`who`、`scope`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 无战斗伤害 (`no_battle_damage` `(新)`)
- **语义**：该次战斗不产生伤害。
- **卡种命中**：怪兽 17 / 陷阱 5。
- **lua 实现特征**：`EFFECT_NO_BATTLE_DAMAGE`。
- **需自定义参数**：`who`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 效果伤害改写/防止 (`change_damage` / `no_effect_damage` `(新)`)
- **语义**：效果伤害改写、归零或反射。
- **卡种命中**：陷阱 26（`CHANGE_DAMAGE`）/14（`NO_EFFECT_DAMAGE`）；魔法 13。
- **lua 实现特征**：`EFFECT_CHANGE_DAMAGE` / `EFFECT_NO_EFFECT_DAMAGE` / `EFFECT_REFLECT_DAMAGE`。
- **需自定义参数**：`mode`、`who`、`scope`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 反射战斗伤害 (`reflect_battle_damage` `(新)`)
- **语义**：把战斗伤害反射给对方。
- **卡种命中**：怪兽 23 / 陷阱 1。
- **lua 实现特征**：`EFFECT_REFLECT_BATTLE_DAMAGE`。
- **需自定义参数**：`to`(self/oppo)。
- **设计器覆盖**：❌
- **优先级**：P2

##### 无效攻击 (`negate_attack` `(新)`)
- **语义**：无效一次攻击。
- **卡种命中**：怪兽 64（`Duel.NegateAttack`）/ 魔法 15 / 陷阱 45。
- **lua 实现特征**：`Duel.NegateAttack()`；事件 `EVENT_ATTACK_ANNOUNCE`（陷阱 144）。
- **需自定义参数**：`targetAttack`、`alsoDamage`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 攻击对象转移 (`change_attack_target` `(新)`)
- **语义**：把攻击对象改为另一只怪。
- **卡种命中**：陷阱 8（`Duel.ChangeAttackTarget`）+9（`Duel.ChangeTargetCard`）。
- **lua 实现特征**：`Duel.ChangeAttackTarget(tc)` / `Duel.ChangeTargetCard`。
- **需自定义参数**：`newTargetFilter`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 强制攻击 (`must_attack` `(新)`)
- **语义**：必须攻击。
- **卡种命中**：怪兽 36（`MUST_ATTACK`）+19（`MUST_ATTACK_MONSTER`）/ 陷阱 13+9。
- **lua 实现特征**：`EFFECT_MUST_ATTACK` / `EFFECT_MUST_ATTACK_MONSTER`。
- **需自定义参数**：`targetFilter`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 攻击限制 (`cannot_attack` 等 `(新)`)
- **语义**：不能攻击/不能直接攻击/不能被选为攻击对象/只能攻击某怪/无视战斗目标。
- **卡种命中**：怪兽 208（`CANNOT_ATTACK`）/ 陷阱 33、魔法 111；`CANNOT_DIRECT_ATTACK` 怪兽 62/魔法 18/陷阱 20；`CANNOT_BE_BATTLE_TARGET` 55；`CANNOT_SELECT_BATTLE_TARGET` 93；`IGNORE_BATTLE_TARGET` 4；`ONLY_ATTACK_MONSTER` 3。
- **lua 实现特征**：`EFFECT_CANNOT_ATTACK` / `_ANNOUNCE` / `CANNOT_DIRECT_ATTACK` / `CANNOT_BE_BATTLE_TARGET` / `CANNOT_SELECT_BATTLE_TARGET` / `IGNORE_BATTLE_TARGET` / `ONLY_ATTACK_MONSTER`。
- **需自定义参数**：`kind`、`who`、`filter`。
- **设计器覆盖**：⚠️（`cannotAttack`/`cannotBeAttacked`/`canDirectAttack` 仅文本）
- **优先级**：P1

##### 攻击代价 (`attack_cost` `(新)`)
- **语义**：每次攻击需支付代价。
- **卡种命中**：怪兽（`EFFECT_ATTACK_COST` 类）。
- **lua 实现特征**：`e:SetCode(EFFECT_ATTACK_COST)` + `SetCost`。
- **需自定义参数**：`cost`。
- **设计器覆盖**：❌
- **优先级**：P2

#### D6. 控制权与表示形式

##### 控制权转移 (`change_control` `(新)`)
- **语义**：夺取某只怪的控制权。
- **卡种命中**：怪兽 119（`CATEGORY_CONTROL`）/ 魔法 36 / 陷阱 38。
- **lua 实现特征**：`Duel.GetControl(tc,tp)`；判定 `c:IsControlerCanBeChanged()`。
- **需自定义参数**：`to`(self/oppo)、`duration`(permanent/phase_end/turn_end)、`count`、`filter`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 控制权交换 (`swap_control` `(新)`)
- **语义**：交换双方怪兽控制权。
- **卡种命中**：陷阱 7（`Duel.SwapControl`）。
- **lua 实现特征**：`Duel.SwapControl(g1,g2)`。
- **需自定义参数**：`count`、`filter`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 表示形式变更 (`change_position` `(新)`)
- **语义**：把怪兽改为表侧攻/守或里侧守。
- **卡种命中**：怪兽 295（`CATEGORY_POSITION`）/ 魔法 64 / 陷阱 80。
- **lua 实现特征**：`Duel.ChangePosition(g,POS_FACEUP_DEFENSE,0,POS_FACEUP_ATTACK,0)`。
- **需自定义参数**：`pos`(FACEUP_ATTACK/FACEUP_DEFENSE/FACEDOWN_DEFENSE)、`count`、`who`、`targeted`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 强制表示形式 (`set_position_forced` `(新)`)
- **语义**：常驻强制某怪表示形式。
- **卡种命中**：怪兽 9（`EFFECT_SET_POSITION`）/ 陷阱。
- **lua 实现特征**：`EFFECT_SET_POSITION` + `SetTargetRange`。
- **需自定义参数**：`pos`、`targetRange`。
- **设计器覆盖**：❌
- **优先级**：P2

#### D7. 反制与无效

##### 无效卡的发动 (`negate_activation`)
- **语义**：无效一次「卡的发动」。
- **卡种命中**：怪兽 229（`Duel.NegateActivation`）/ 魔法 3 / 陷阱 156。
- **lua 实现特征**：
  ```lua
  e:SetCategory(CATEGORY_NEGATE) e:SetType(EFFECT_TYPE_QUICK_O) e:SetCode(EVENT_CHAINING)
  if chk==0 then return Duel.IsChainNegatable(ev) end
  Duel.NegateActivation(ev)
  ```
- **需自定义参数**：`targetScope`(monster/spell/trap/any)、`destroyAfter`(bool)、`fromOppoOnly`(bool)、`damageStep`。
- **设计器覆盖**：✅（`negate_activation`；无效对象类别不可配）
- **优先级**：P0

##### 无效效果 (`negate_effect` `(新)`)
- **语义**：无效一次「效果的发动/适用」（不破坏发动）。
- **卡种命中**：怪兽 151（`Duel.NegateEffect`）/ 魔法 36 / 陷阱 72。
- **lua 实现特征**：`Duel.NegateEffect(ev)`。
- **需自定义参数**：同 `negate_activation`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 无效召唤 (`negate_summon` `(新)`)
- **语义**：无效一次召唤/特殊召唤。
- **卡种命中**：怪兽 22（`Duel.NegateSummon`）/ 魔法 / 陷阱 28。
- **lua 实现特征**：`CATEGORY_DISABLE_SUMMON`+`Duel.NegateSummon(eg)`；`SetCode(EVENT_SPSUMMON)`（陷阱 27）。
- **需自定义参数**：`summonType`、`alsoDestroy`、`chainLimit`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 无效并破坏 (`negate_and_destroy`)
- **语义**：无效发动/效果并破坏来源卡（反击陷阱范式）。
- **卡种命中**：怪兽 229 / 魔法 3 / 陷阱 93（`CATEGORY_NEGATE+CATEGORY_DESTROY`）。
- **lua 实现特征**：`NegateActivation` 后 `if re:GetHandler():IsRelateToEffect(re) then Duel.Destroy(eg,REASON_EFFECT)`。
- **需自定义参数**：`negateKind`、`destroy`(默认 true)、`punish`。
- **设计器覆盖**：✅
- **优先级**：P0

##### 无效后惩罚 (`negate_punish`)
- **语义**：无效后追加削血/弃手等惩罚。
- **卡种命中**：怪兽 / 魔法 / 陷阱（`negate_punish` 现有预设）。
- **lua 实现特征**：`Duel.BreakEffect()` 分段后追加动作。
- **需自定义参数**：`punishAction`、`count`、`who`。
- **设计器覆盖**：⚠️（固定几种）
- **优先级**：P1

##### 相关连锁无效 (`negate_related_chain` `(新)`)
- **语义**：无效同名卡的相关连锁。
- **卡种命中**：怪兽 63（`Duel.NegateRelatedChain`）/ 魔法 9 / 陷阱 31。
- **lua 实现特征**：`Duel.NegateRelatedChain(tc,RESET_TURN_SET)`。
- **需自定义参数**：`reset`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 效果无效化挂载 (`disable_effect` `(新)`)
- **语义**：给目标怪挂上限时/永久的效果无效。
- **卡种命中**：怪兽 330（`EFFECT_DISABLE`）+274（`EFFECT_DISABLE_EFFECT`）/ 魔法 100+76 / 陷阱 102+66。
- **lua 实现特征**：`tc:NegateEffects(c,RESET_EVENT|RESETS_STANDARD)`；注册 `EFFECT_DISABLE`/`EFFECT_DISABLE_EFFECT`（+`SetReset`）。
- **需自定义参数**：`scope`(effects/activation/trapmonster)、`duration`(reset)、`targetFilter`。
- **设计器覆盖**：❌
- **优先级**：P0

##### 陷阱怪兽无效 (`disable_trapmonster` `(新)`)
- **语义**：无效陷阱怪兽的效果。
- **卡种命中**：怪兽 40 / 陷阱 10（`EFFECT_DISABLE_TRAPMONSTER`）。
- **lua 实现特征**：`EFFECT_DISABLE_TRAPMONSTER`。
- **需自定义参数**：`targetFilter`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 封锁发动 (`cannot_activate` `(新)`)
- **语义**：常驻禁止某类效果/卡的发动。
- **卡种命中**：怪兽 200（`EFFECT_CANNOT_ACTIVATE`）/ 魔法 73 / 陷阱 46。
- **lua 实现特征**：`EFFECT_CANNOT_ACTIVATE` + `SetValue(function(e,re,tp) ...)` + `SetTargetRange`。
- **需自定义参数**：`blockType`(monster/spell/trap/effect)、`fromZone`、`who`、`duration`。
- **设计器覆盖**：❌
- **优先级**：P0

##### 封锁触发 (`cannot_trigger` `(新)`)
- **语义**：常驻禁止某类效果发动（不进入连锁）。
- **卡种命中**：怪兽 62 / 魔法 30 / 陷阱 20。
- **lua 实现特征**：`EFFECT_CANNOT_TRIGGER`。
- **需自定义参数**：`blockType`、`who`。
- **设计器覆盖**：⚠️（`cannotTrigger` 仅 ruleText，作用于自身）
- **优先级**：P1

##### 不可被无效 (`cannot_disable` / `cannot_inactivate` / `cannot_diseffect` `(新)`)
- **语义**：该效果/发动不可被无效或禁用。
- **卡种命中**：怪兽（`CANNOT_DISABLE_SUMMON` 5、`CANNOT_DISABLE_SPSUMMON` 16、`CANNOT_INACTIVATE` 6、`CANNOT_DISEFFECT` 9）；魔法（`EFFECT_CANNOT_DISABLE` 27）；陷阱 6/7。
- **lua 实现特征**：`EFFECT_FLAG_CANNOT_DISABLE`（怪兽 2122 文件）/ `CANNOT_NEGATE`（怪物 46）/ `EFFECT_CANNOT_DISABLE`。
- **需自定义参数**：`mode`(disable/inactivate/diseffect)、`flag`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 无视免疫 (`ignore_immune` `(新)`)
- **语义**：本效果无视对方抗性。
- **卡种命中**：怪兽 379（`EFFECT_FLAG_IGNORE_IMMUNE`）/ 魔法 163 / 陷阱 103。
- **lua 实现特征**：`e:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)`。
- **需自定义参数**：`ignore`(bool)。
- **设计器覆盖**：❌
- **优先级**：P1

#### D8. 抗性与替代

##### 效果免疫 (`immune_effect`)
- **语义**：不受某些效果影响。
- **卡种命中**：怪兽 165（`EFFECT_IMMUNE_EFFECT`）/ 魔法 38 / 陷阱 42。
- **lua 实现特征**：`EFFECT_IMMUNE_EFFECT` + `SetValue(filter)`（如 `te:IsTrapEffect()`）。
- **需自定义参数**：`scope`(all/oppo_only/spell/trap/monster_effect/battle)、`targetFilter`、`includeTargeted`。
- **设计器覆盖**：⚠️（`immune_all` 全免疫，无来源限定）
- **优先级**：P0

##### 不可破坏 (`indestructible`)
- **语义**：不被战斗/效果破坏。
- **卡种命中**：怪兽 408（`INDESTRUCTABLE_BATTLE`）+325（`_EFFECT`）+68（`_COUNT`）/ 魔法 54+70+28 / 陷阱 54+45+9。
- **lua 实现特征**：`EFFECT_INDESTRUCTABLE_BATTLE` / `_EFFECT` / `_COUNT` / `EFFECT_INDESTRUCTABLE`。
- **需自定义参数**：`kind`(battle/effect/both)、`count`(次数, 默认 unlimited)、`condition`。
- **设计器覆盖**：❌（`immune_all` 不含破坏抗性）
- **优先级**：P0

##### 破坏替代 (`destroy_replace` `(新)`)
- **语义**：以送墓/除外/解放等代替破坏。
- **卡种命中**：怪兽 155（`DESTROY_REPLACE`）+15（`DESTROY_SUBSTITUTE`）/ 魔法 67+5 / 陷阱 23+1。
- **lua 实现特征**：`EFFECT_DESTROY_REPLACE` + `SetTarget(s.desreptg)` + `SetValue`（代价筛选）。
- **需自定义参数**：`substituteCost`(送墓/除外/解放)、`count`、`once`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 离场去向改写 (`leave_field_redirect` `(新)`)
- **语义**：改写离场去向（回卡组底/手卡/除外等）。
- **卡种命中**：怪兽 216 / 魔法 16 / 陷阱 44。
- **lua 实现特征**：`EFFECT_LEAVE_FIELD_REDIRECT` + `SetValue(LOCATION_DECKBOT)`。
- **需自定义参数**：`destination`(DECKTOP/DECKBOT/HAND/REMOVED/GRAVE)、`condition`、`once`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 送墓/除外重定向 (`to_grave_redirect` / `remove_redirect` `(新)`)
- **语义**：把本应送墓/除外的卡改去别处。
- **卡种命中**：怪兽 23+16 / 魔法 5 / 陷阱 6。
- **lua 实现特征**：`EFFECT_TO_GRAVE_REDIRECT` / `_CB` / `EFFECT_REMOVE_REDIRECT` / `EFFECT_BATTLE_DESTROY_REDIRECT` / `EFFECT_SEND_REPLACE` / `EFFECT_TO_HAND_REDIRECT` / `EFFECT_TO_DECK_REDIRECT`。
- **需自定义参数**：`triggerKind`、`destination`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 自我离场/自毁 (`self_destroy` / `self_to_grave` `(新)`)
- **语义**：常驻维持代价失败时自毁/自送墓。
- **卡种命中**：陷阱 7（`SELF_DESTROY`）+8（`SELF_TOGRAVE`）+3（`REMAIN_FIELD`）；魔法 11（`EFFECT_SELF_DESTROY`）。
- **lua 实现特征**：`EFFECT_SELF_DESTROY` / `EFFECT_SELF_TOGRAVE` / `EFFECT_REMAIN_FIELD`。
- **需自定义参数**：`condition`(维持代价)、`destination`、`mandatory`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 不可取对象 (`untargetable` `(新)`)
- **语义**：不能成为效果/攻击对象。
- **卡种命中**：怪兽 224（`CANNOT_BE_EFFECT_TARGET`）/ 魔法 62 / 陷阱 29；`CANNOT_BE_BATTLE_TARGET` 怪兽 55。
- **lua 实现特征**：`EFFECT_CANNOT_BE_EFFECT_TARGET`（`aux.tgoval` 173）/ `EFFECT_CANNOT_BE_BATTLE_TARGET`（`aux.imval2`）。
- **需自定义参数**：`against`(effect/battle/both)、`condition`、`includeSelf`。
- **设计器覆盖**：❌（`cannotBeAttacked` 仅文本）
- **优先级**：P1

##### 区域/动作禁止 (`cannot_remove` 等 `(新)`)
- **语义**：不能被除外/送墓/回手/回卡组/抽卡/解放/作素材。
- **卡种命中**：怪兽（`CANNOT_REMOVE` 11、`CANNOT_TO_GRAVE/HAND/DECK`）；陷阱（`CANNOT_REMOVE` 4、`CANNOT_TO_HAND/DECK` 3、`CANNOT_DRAW` 2）；魔法。
- **lua 实现特征**：`EFFECT_CANNOT_REMOVE` / `_TO_GRAVE` / `_TO_HAND` / `_TO_DECK` / `_DRAW` / `EFFECT_CANNOT_RELEASE`。
- **需自定义参数**：`kind`、`targetFilter`。
- **设计器覆盖**：❌
- **优先级**：P2

#### D9. 限制与封锁（action 视角）

##### 特召封锁 (`lock_special_summon` `(新)`)
- **语义**：禁止玩家/某类怪特殊召唤。
- **卡种命中**：怪兽 615（`EFFECT_CANNOT_SPECIAL_SUMMON`）/ 魔法 217 / 陷阱 76。
- **lua 实现特征**：`EFFECT_CANNOT_SPECIAL_SUMMON` + `SetTargetRange(1,0)` + `SetTarget(filter)`。
- **需自定义参数**：`who`(self/oppo/both)、`filter`、`duration`。
- **设计器覆盖**：❌（`cannotSpecialSummon` 仅自身文本）
- **优先级**：P0

##### 召唤封锁 (`lock_summon` `(新)`)
- **语义**：禁止通常召唤/盖放/反转召唤。
- **卡种命中**：怪兽 71（`CANNOT_SUMMON`）+23（`CANNOT_MSET`）+7（`CANNOT_SSET`）+14（`CANNOT_FLIP_SUMMON`）/ 魔法 45+16+17+10 / 陷阱 19+6+3+11。
- **lua 实现特征**：`EFFECT_CANNOT_SUMMON` / `_MSET` / `_SSET` / `_FLIP_SUMMON` / `_TURN_SET`。
- **需自定义参数**：`kind`(summon/mset/sset/flip)、`who`、`filter`。
- **设计器覆盖**：⚠️（`cannotMSet`/`cannotNormalSummon` 仅自身文本）
- **优先级**：P1

##### 跳过阶段/回合 (`skip_phase` `(新)`)
- **语义**：跳过战斗阶段/主要阶段/回合。
- **卡种命中**：怪兽 8（`SKIP_BP`）/ 魔法 19（`CANNOT_BP`）/ 陷阱 7（`CANNOT_BP`）+2（`SKIP_DP`）+2（`SKIP_TURN`）；`Duel.SkipPhase` 怪兽 27/陷阱 22。
- **lua 实现特征**：`EFFECT_SKIP_BP` / `_DP` / `_M1` / `_M2` / `_TURN` / `EFFECT_CANNOT_BP`；`Duel.SkipPhase`。
- **需自定义参数**：`phase`(BP/DP/M1/M2/TURN)、`who`、`nextTurnOnly`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 追加召唤/盖放次数 (`extra_summon_count` `(新)`)
- **语义**：增加每回合通常召唤/盖放次数。
- **卡种命中**：怪兽 51（`EXTRA_SUMMON_COUNT`）+5（`EXTRA_SET_COUNT`）/ 魔法 22 / 陷阱。
- **lua 实现特征**：`EFFECT_EXTRA_SUMMON_COUNT` / `EFFECT_EXTRA_SET_COUNT` / `EFFECT_SET_SUMMON_COUNT_LIMIT`。
- **需自定义参数**：`count`、`who`、`thisTurnOnly`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 祭品相关 (`double_tribute` / `decrease_tribute` / `extra_tribute` `(新)`)
- **语义**：一只当两祭品/减少祭品数/追加祭品。
- **卡种命中**：怪兽 25（`DOUBLE_TRIBUTE`）+4（`DECREASE_TRIBUTE`）+10（`EXTRA_TRIBUTE`）+10（`ADD_EXTRA_TRIBUTE`）。
- **lua 实现特征**：`EFFECT_DOUBLE_TRIBUTE` / `EFFECT_DECREASE_TRIBUTE` / `EFFECT_EXTRA_TRIBUTE` / `EFFECT_ADD_EXTRA_TRIBUTE`。
- **需自定义参数**：`mode`、`count`、`filter`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 不可解放/不可作素材 (`unreleasable` / `cannot_be_material` `(新)`)
- **语义**：不能被解放、不能作为融合/同调/超量/连接/任意素材。
- **卡种命中**：怪兽 39（`UNRELEASABLE_SUM`）+26（`NONSUM`）+64（`CANNOT_BE_SYNCHRO_MATERIAL`）+40（`XYZ`）+17（`FUSION`）+45（`LINK`）+21（`CANNOT_BE_MATERIAL`）/ 魔法 23+15 / 陷阱 8+8+5。
- **lua 实现特征**：`EFFECT_UNRELEASABLE_SUM` / `_NONSUM` / `_EFFECT` / `EFFECT_CANNOT_BE_*_MATERIAL` / `EFFECT_SYNCHRO_MAT_RESTRICTION`。
- **需自定义参数**：`kind`、`summonType`、`condition`。
- **设计器覆盖**：⚠️（`materialRestriction`/`cannotBeReleased` 已有）
- **优先级**：P1

##### 效果发动封锁（不可变形式/控制权）(`lock_misc` `(新)`)
- **语义**：不能改变表示形式/控制权。
- **卡种命中**：怪兽 41（`CANNOT_CHANGE_POSITION`）+11（`CANNOT_CHANGE_CONTROL`）/ 魔法 12 / 陷阱 22。
- **lua 实现特征**：`EFFECT_CANNOT_CHANGE_POSITION` / `EFFECT_CANNOT_CHANGE_CONTROL`。
- **需自定义参数**：`kind`、`targetFilter`。
- **设计器覆盖**：⚠️（`cannotChangePosition` 仅文本）
- **优先级**：P2

##### 抽卡/手牌上限改写 (`draw_count` / `hand_limit` `(新)`)
- **语义**：改写抽卡数/手牌上限/决斗规则。
- **卡种命中**：陷阱 4（`EFFECT_DRAW_COUNT`）+1（`EFFECT_HAND_LIMIT`）+3（`EFFECT_NECRO_VALLEY`）。
- **lua 实现特征**：`EFFECT_DRAW_COUNT` / `EFFECT_HAND_LIMIT` / `EFFECT_NECRO_VALLEY`。
- **需自定义参数**：`value`、`who`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 场地唯一 (`unique_on_field` `(新)`)
- **语义**：场上同名/同字段只能存在 1 张。
- **卡种命中**：魔法 34（`SetUniqueOnField`）。
- **lua 实现特征**：`c:SetUniqueOnField(1,0,id)`。
- **需自定义参数**：`count`(默认 1)、`setcode`。
- **设计器覆盖**：❌
- **优先级**：P2

#### D10. 指示物

##### 放置指示物 (`add_counter` `(新)`)
- **语义**：给卡放置指示物。
- **卡种命中**：怪兽 160（`AddCounter`）/ 魔法 77 / 陷阱（`AddCounter`）。
- **lua 实现特征**：`s.counter_list={COUNTER_A}` / `c:EnableCounterPermit(COUNTER_A)` → `tc:AddCounter(COUNTER_A,n)`。
- **需自定义参数**：`counterType`(COUNTER_A/SPELL/…自定义)、`count`、`target`(自身/对手/场上)、`oncePerTurn`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 取除指示物 (`remove_counter` `(新)`)
- **语义**：取除指示物（含作为效果）。
- **卡种命中**：怪兽 86（`RemoveCounter`）/ 魔法 19 / 陷阱 5。
- **lua 实现特征**：`Duel.RemoveCounter(tp,1,1,COUNTER_A,n,REASON_EFFECT)`；`Duel.IsCanRemoveCounter`。
- **需自定义参数**：`counterType`、`count`、`who`、`reason`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 指示物许可/放大 (`counter_permit` `(新)`)
- **语义**：允许某卡放置指示物；按指示物数量放大数值。
- **卡种命中**：魔法 54（`EnableCounterPermit`）+63（`counter_place_list`）/ 陷阱 1（`COUNTER_PERMIT`）。
- **lua 实现特征**：`c:EnableCounterPermit(...)`；`SetValue(function(e,c) return c:GetCounter(COUNTER_A)*300 end)`。
- **需自定义参数**：`counterType`、`perCard`。
- **设计器覆盖**：❌
- **优先级**：P2

#### D11. 装备 / 场地 / 同盟

##### 装备 (`equip` `(新)`)
- **语义**：把卡作为装备卡装备到目标怪。
- **卡种命中**：怪兽 258（`CATEGORY_EQUIP`）/ 魔法 269（装备魔法）；陷阱 72。
- **lua 实现特征**：`Duel.Equip(tp,c,tc)` + `EFFECT_EQUIP_LIMIT` + `Duel.EquipComplete()`。
- **需自定义参数**：`equipTargetFilter`(种族/属性/字段)、`maxCount`、`asSpell`(是否作为魔法卡)、`grantedEffects`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 装备手续 (`equip_procedure` `(新)`)
- **语义**：装备魔法的标准装备手续（含代价/额外处理）。
- **卡种命中**：魔法 250（`aux.AddEquipProcedure`）；陷阱系列助手 `aux.AddAttractionEquipProc`。
- **lua 实现特征**：`aux.AddEquipProcedure(c,nil,filter,cost)`。
- **需自定义参数**：`filter`、`cost`、`onEquip`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 装备限制 (`equip_limit` `(新)`)
- **语义**：限制谁能装备这张装备卡。
- **卡种命中**：怪兽 135（`EFFECT_EQUIP_LIMIT`）/ 魔法 50 / 陷阱 60。
- **lua 实现特征**：`e:SetCode(EFFECT_EQUIP_LIMIT)` + `SetValue(s.eqlimit)`。
- **需自定义参数**：`filter`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 同盟 (`union` `(新)`)
- **语义**：同盟怪兽的装备/解除手续。
- **卡种命中**：怪兽 40（`aux.AddUnionProcedure`）。
- **lua 实现特征**：`aux.AddUnionProcedure(c,filter)`；`aux.SetUnionState` / `aux.IsUnionState`。
- **需自定义参数**：`filter`、`canEquipOpponent`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 场地驻留 (`field_zone` `(新)`)
- **语义**：场地魔法挂在 FZONE 持续生效，并判定环境。
- **卡种命中**：魔法 330（`SetRange(LOCATION_FZONE)`）/361（`LOCATION_FZONE`）。
- **lua 实现特征**：`e:SetRange(LOCATION_FZONE)`；`Duel.IsEnvironment(CARD_NECROVALLEY)`（魔法 9）。
- **需自定义参数**：`unique`(默认 true)、`maintainCost`、`dependsOn`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 永续魔法驻留 (`continuous_residence` `(新)`)
- **语义**：永续魔法挂 SZONE 的常驻适用模板。
- **卡种命中**：魔法 649（`SetRange(LOCATION_SZONE)`）；陷阱 547。
- **lua 实现特征**：
  ```lua
  e2:SetType(EFFECT_TYPE_FIELD) e2:SetRange(LOCATION_SZONE)
  e2:SetCode(EFFECT_UPDATE_ATTACK) e2:SetTargetRange(LOCATION_MZONE,0) e2:SetValue(300)
  ```
- **需自定义参数**：`range`、`targetRange`、`property`、`value`。
- **设计器覆盖**：⚠️（`spell_trap_continuous` + `atk_boost` 可近似，无任意模板）
- **优先级**：P0

#### D12. 召唤手续细节

##### 自身特召手续 (`spsummon_proc` `(新)`)
- **语义**：自身从手卡/墓地/除外满足条件特召的手续。
- **卡种命中**：怪兽 635（`EFFECT_SPSUMMON_PROC`）。
- **lua 实现特征**：三段式 `SetCondition/SetTarget/SetOperation`，配 `EFFECT_FLAG_UNCOPYABLE`。
- **需自定义参数**：`fromZone`、`cost`、`condition`、`ignoreCondition`。
- **设计器覆盖**：⚠️（`special_summon_self` + `procSummonType`）
- **优先级**：P1

##### 通常召唤手续替代 (`normal_summon_procedure` `(新)`)
- **语义**：自定义祭品数/召唤方式的通常召唤手续。
- **卡种命中**：怪兽 59（`aux.AddNormalSummonProcedure`）+35（`AddNormalSetProcedure`）。
- **lua 实现特征**：`aux.AddNormalSummonProcedure(c,true,false,min,max)`。
- **需自定义参数**：`tributeMin`/`tributeMax`、`summonType`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 融合/同调/超量/连接/仪式/灵摆手续 (`*_procedure`)
- **语义**：各召唤法的素材手续。
- **卡种命中**：怪兽 `Xyz.AddProcedure` 635、`Synchro.AddProcedure` 559、`Link.AddProcedure` 492、`Pendulum.AddProcedure` 390、`Fusion.AddProcMix` 357+`AddProcMixN` 153、`Synchro.NonTuner` 364、`Fusion.AddContactProc` 68、`Ritual.CreateProc`/`AddWholeLevelTribute`；魔法 `Ritual.AddProcGreaterCode` 35 / `AddProcGreater` 21 / `AddProcEqual` 11 / `CreateProc` 17、`Fusion.CreateSummonEff` 86。
- **lua 实现特征**：见上各辅助函数。
- **需自定义参数**：`matMin`/`matMax`、`matFilter`、`matLocation`、`contactFusion`、`ritualLevelType`(EQUAL/GREATER)、`ritualLevel`、`sumpos`。
- **设计器覆盖**：⚠️（`procSummonType` + `procMaterialCount`，素材筛选/来源/等级判定均未支持）
- **优先级**：P0

##### 素材检查与替代 (`material_check` `(新)`)
- **语义**：保存素材属性/种族信息；融合素材替代/额外素材。
- **卡种命中**：怪兽 166（`EFFECT_MATERIAL_CHECK`）+18（`EFFECT_EXTRA_MATERIAL`）+26（`EFFECT_MULTIPLE_TUNERS`）+14（`EFFECT_NONTUNER`）+17（`EFFECT_XYZ_LEVEL`）+9（`EFFECT_SYNCHRO_MATERIAL_CUSTOM`）；融合替代 `EFFECT_FUSION_SUBSTITUTE` 12+`EFFECT_EXTRA_FUSION_MATERIAL` 4+`EFFECT_EXTRA_RITUAL_MATERIAL` 10。
- **lua 实现特征**：`EFFECT_MATERIAL_CHECK` + `e:SetLabel(...)`；`EFFECT_FUSION_SUBSTITUTE` / `EFFECT_EXTRA_*_MATERIAL`。
- **需自定义参数**：`level`、`attribute`、`race`、`materialType`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 苏生限制/特召条件 (`spsummon_condition` `(新)`)
- **语义**：自身特召条件（含禁止 `aux.FALSE`）。
- **卡种命中**：怪兽 504（`EFFECT_SPSUMMON_CONDITION`）；魔法；陷阱 2。
- **lua 实现特征**：`EFFECT_SPSUMMON_CONDITION` + `SetValue(aux.FALSE)`。
- **需自定义参数**：`allow`(bool)、`conditionFilter`。
- **设计器覆盖**：⚠️（`cannotSpecialSummon`/`EnableReviveLimit`）
- **优先级**：P1

#### D13. 灵摆

##### 灵摆手续 (`pendulum_procedure` `(新)`)
- **语义**：灵摆召唤手续。
- **卡种命中**：怪兽 390（`Pendulum.AddProcedure`）。
- **lua 实现特征**：`Pendulum.AddProcedure(c)`。
- **需自定义参数**：`scaleLeft`、`scaleRight`（由卡数据提供）。
- **设计器覆盖**：⚠️（独立灵摆设计器）
- **优先级**：P1

##### 摆区效果 (`pendulum_effect` `(新)`)
- **语义**：卡在摆区（LOCATION_PZONE）时适用的效果。
- **卡种命中**：怪兽 374（`LOCATION_PZONE`）；魔法 37/31（灵摆魔法）。
- **lua 实现特征**：`e:SetRange(LOCATION_PZONE)` + `IGINITION/TRIGGER/CONTINUOUS`。
- **需自定义参数**：`timing`、`action`、`scaleSide`。
- **设计器覆盖**：⚠️（独立设计器，仅摆区效果）
- **优先级**：P1

##### 置于摆区 (`pendulum_move` `(新)`)
- **语义**：把卡移动到灵摆区。
- **卡种命中**：怪兽 147（`Duel.MoveToField`）+67（`CheckPendulumZones`）。
- **lua 实现特征**：`Duel.MoveToField(c,tp,tp,LOCATION_PZONE,POS_FACEUP,true)`；`Duel.CheckPendulumZones(tp)`。
- **需自定义参数**：`from`、`side`(left/right)。
- **设计器覆盖**：❌
- **优先级**：P2

#### D14. 名称与类别（效果层）

见 D4 的「属性/种族/种类/卡名/字段变更」条目。另：
- `EFFECT_PUBLIC`（公开手卡/里侧卡，魔法 8 / 陷阱 7）：`需自定义参数` `targetFilter`；设计器 ❌；P2。
- `EFFECT_CHANGE_CODE` / `ADD_CODE`：运行时改名/改号；设计器 ⚠️；P1。

#### D15. 随机性

##### 掷硬币 (`toss_coin` `(新)`)
- **语义**：抛硬币并按正/反分流。
- **卡种命中**：怪兽 19（`Duel.TossCoin`）/ 魔法 9 / 陷阱 4；`CATEGORY_COIN` 怪兽 40/魔法 8/陷阱 9。
- **lua 实现特征**：`Duel.TossCoin(tp,n)`；`Duel.CountHeads` / `Duel.CallCoin`；卡片声明 `s.toss_coin=true`。
- **需自定义参数**：`count`、`branchHeads`、`branchTails`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 掷骰子 (`toss_dice` `(新)`)
- **语义**：掷骰并按点数分流。
- **卡种命中**：怪兽 36（`Duel.TossDice`）/ 魔法 10 / 陷阱 13；`CATEGORY_DICE` 怪兽 28/魔法 9/陷阱 6。
- **lua 实现特征**：`Duel.TossDice(tp,n)`；`s.roll_dice=true`；`Duel.CalculateDamage`。
- **需自定义参数**：`count`、`branchByValue`、`successRange`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 随机选择 (`random_select` `(新)`)
- **语义**：从一组卡中随机选。
- **卡种命中**：怪兽（`RandomSelect`）/ 陷阱（c6859683）。
- **lua 实现特征**：`g:RandomSelect(tp,n)`。
- **需自定义参数**：`count`、`who`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 胜利条件 (`win_condition` `(新)`)
- **语义**：达成条件直接获胜/特殊判定。
- **卡种命中**：陷阱 5（`Duel.Win`）+2（`EFFECT_LIGHT_OF_INTERVENTION`）+1（`Duel.RockPaperScissors`）。
- **lua 实现特征**：`Duel.Win(p,REASON_*)` / `EFFECT_LIGHT_OF_INTERVENTION`。
- **需自定义参数**：`condition`、`winReason`。
- **设计器覆盖**：❌
- **优先级**：P2

#### D16. 时点与连锁操作

##### 分段结算 (`break_effect` `(新)`)
- **语义**：把效果分成两段依次结算。
- **卡种命中**：怪兽 911 / 魔法 478 / 陷阱 351。
- **lua 实现特征**：`Duel.BreakEffect()`。
- **需自定义参数**：`segments[]`(多个 action)。
- **设计器覆盖**：❌（单一 action）
- **优先级**：P1

##### 标签传参 (`set_label` / `set_target_param` `(新)`)
- **语义**：在 target 段算好数值/选择，operation 段取回。
- **卡种命中**：怪兽（`SetLabel` 874 次）/ 魔法（`SetLabel` 418、`SetTargetParam` 248、`GetChainInfo` 402）/ 陷阱（`SetLabel` 305、`SetTargetParam` 141、`GetChainInfo` 322）。
- **lua 实现特征**：`e:SetLabel(v)` / `e:GetLabel()`；`Duel.SetTargetParam(v)` → `Duel.GetChainInfo(0,CHAININFO_TARGET_PARAM)`；`Duel.SetTargetPlayer` / `SetTargetCard`。
- **需自定义参数**：`params[]`(name, valueSource)。
- **设计器覆盖**：❌
- **优先级**：P1

##### 分支选择 (`select_effect` / `select_yes_no` `(新)`)
- **语义**：结算中做 N 选 1 / 是/否分支。
- **卡种命中**：魔法（`SelectEffect` 127、`SelectEffectYesNo` 70、`SelectOption` 59、`SelectYesNo` 334）/ 陷阱（`SelectEffect` 73、`SelectYesNo` 219）。
- **lua 实现特征**：`Duel.SelectEffect(tp,{b1,desc1},{b2,desc2})`；`Duel.SelectYesNo(tp,n)`。
- **需自定义参数**：`branches[]`(count≥2, 各含 desc + action)。
- **设计器覆盖**：⚠️（`choice_*` 仅二元）
- **优先级**：P1

##### 多选组 (`select_unselect_group` `(新)`)
- **语义**：从多组/多区间选多张联动。
- **卡种命中**：怪兽（`SelectUnselectGroup:2-2` 427）/ 陷阱 105（`aux.SelectUnselectGroup`）。
- **lua 实现特征**：`aux.SelectUnselectGroup(g,e,tp,min,max,filter,1)`。
- **需自定义参数**：`min`/`max`、`filter`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 连锁封锁 (`chain_limit` `(新)`)
- **语义**：禁止对手继续连锁 / 改写连锁操作。
- **卡种命中**：怪兽（`SetChainLimitTillChainEnd` / `SetChainLimit`）/ 魔法 10 / 陷阱 10；`ChangeChainOperation` 7。
- **lua 实现特征**：`Duel.SetChainLimit(aux.FALSE)` / `Duel.SetChainLimitTillChainEnd(aux.FALSE)` / `Duel.ChangeChainOperation(ev,f)`。
- **需自定义参数**：`deny`(bool)、`tillChainEnd`(bool)、`rewriteAction`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 延迟处理 (`delayed_operation` `(新)`)
- **语义**：把动作延迟到下个准备/结束阶段执行。
- **卡种命中**：怪兽 30（`aux.DelayedOperation`）/ 魔法 20 / 陷阱（`EFFECT_TYPE_FIELD+CONTINUOUS`）。
- **lua 实现特征**：
  ```lua
  aux.DelayedOperation(tc,PHASE_END,id,e,tp,function(dg) Duel.Destroy(dg,REASON_EFFECT) end,...)
  -- 或注册 EVENT_PHASE+PHASE_STANDBY + SetLabel(GetTurnCount()+1) + SetReset(RESET_PHASE|PHASE_END,n)
  ```
- **需自定义参数**：`phase`(STANDBY/END/BATTLE)、`turns`(默认 1)、`action`、`once`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 标记效果/全局检查 (`register_flag_effect` `(新)`)
- **语义**：注册回合内/决斗内标记，用于条件判定。
- **卡种命中**：怪兽 181（`RegisterFlagEffect`）/ 魔法 294 / 陷阱 66；`aux.GlobalCheck` 90。
- **lua 实现特征**：`Duel.RegisterFlagEffect(tp,id,reset,flag,count)` / `GetFlagEffect` / `HasFlagEffect`。
- **需自定义参数**：`id`、`reset`、`count`。
- **设计器覆盖**：❌（内部机制）
- **优先级**：P2

##### 提示时点 (`hint_timing` `(新)`)
- **语义**：声明可在哪些时点发动。
- **卡种命中**：怪兽（广泛）/ 魔法 347 / 陷阱（`SetHintTiming` 1519 主时点）。
- **lua 实现特征**：`e:SetHintTiming(0,TIMING_STANDBY_PHASE|TIMING_MAIN_END|TIMINGS_CHECK_MONSTER_E)`。
- **需自定义参数**：`timings[]`(位掩码集合)。
- **设计器覆盖**：⚠️（仅 `quick_*` 四预设）
- **优先级**：P0

##### 持续目标锁定 (`persistent_target` `(新)`)
- **语义**：跨阶段持续锁定 target 段选择的卡。
- **卡种命中**：陷阱 23（`aux.PersistentTargetFilter`）/ 魔法。
- **lua 实现特征**：`aux.PersistentTargetFilter` / `aux.PersistentTgCon` + `e:SetLabelObject`。
- **需自定义参数**：`duration`。
- **设计器覆盖**：❌
- **优先级**：P2

#### D17. 其他

##### 造成伤害 (`burn_damage`)
- **语义**：对玩家造成效果伤害。
- **卡种命中**：怪兽 493（`CATEGORY_DAMAGE`）/ 魔法 123 / 陷阱 129。
- **lua 实现特征**：`Duel.SetTargetPlayer(1-tp)` + `Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,p,n)` → `Duel.Damage(p,n,REASON_EFFECT)`。
- **需自定义参数**：`amount`、`who`、`valueSource`。
- **设计器覆盖**：✅
- **优先级**：P0

##### 回复 LP (`gain_lp`)
- **语义**：回复生命值。
- **卡种命中**：怪兽 134（`CATEGORY_RECOVER`）/ 魔法 62 / 陷阱 54。
- **lua 实现特征**：`Duel.Recover(p,n,REASON_EFFECT)`。
- **需自定义参数**：`amount`、`who`、`valueSource`。
- **设计器覆盖**：✅
- **优先级**：P0

##### 设定 LP (`set_lp` `(新)`)
- **语义**：直接设定生命值。
- **卡种命中**：怪兽 30（`Duel.SetLP`）/ 魔法 37 / 陷阱 14。
- **lua 实现特征**：`Duel.SetLP(p,value)`。
- **需自定义参数**：`value`、`who`、`mode`(set/delta)。
- **设计器覆盖**：❌
- **优先级**：P1

##### 抽卡 (`draw_cards`)
- **语义**：抽卡。
- **卡种命中**：怪兽 424（`CATEGORY_DRAW`）/ 魔法 — / 陷阱 126。
- **lua 实现特征**：`Duel.IsPlayerCanDraw` + `Duel.Draw(p,n,REASON_EFFECT)`。
- **需自定义参数**：`count`、`who`(self/oppo/both)、`asCost`。
- **设计器覆盖**：✅
- **优先级**：P0

##### 宣言 (`announce` `(新)`)
- **语义**：宣言卡名/属性/种族/等级/数字。
- **卡种命中**：怪兽 30（`AnnounceNumber`）+21（`AnnounceLevel`）+12（`AnnounceCard`）+12（`AnnounceAttribute`）+11（`AnnounceRace`）；魔法 15/12/7/6；陷阱 11/11/7/6；`CATEGORY_ANNOUNCE` 怪兽 8/魔法 14/陷阱 5。
- **lua 实现特征**：`Duel.AnnounceCard/Attribute/Race/Level/Number(Range)`；值经 `Duel.SetTargetParam` 保存。
- **需自定义参数**：`kind`(card/attribute/race/level/number/number_range)、`options`(筛选)、`followupAction`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 客户提示 (`client_hint` `(新)`)
- **语义**：给对手/玩家显示提示文本。
- **卡种命中**：怪兽 1036（`EFFECT_FLAG_CLIENT_HINT`）/ 魔法 / 陷阱 214。
- **lua 实现特征**：`EFFECT_FLAG_CLIENT_HINT` + `aux.RegisterClientHint`（怪兽 147）。
- **需自定义参数**：`hintText`。
- **设计器覆盖**：❌
- **优先级**：P2

##### 誓约 (`oath` `(新)`)
- **语义**：发动后本回合不能再做某事（自责性誓约）。
- **卡种命中**：怪兽 219（`EFFECT_FLAG_OATH`）/ 魔法 589（`EFFECT_COUNT_CODE_OATH`）/ 陷阱 26。
- **lua 实现特征**：`EFFECT_FLAG_OATH`；`SetCountLimit(1,id,EFFECT_COUNT_CODE_OATH)`。
- **需自定义参数**：`oathText`、`restriction`。
- **设计器覆盖**：❌
- **优先级**：P1

##### 重置 (`reset` `(新)`)
- **语义**：声明效果持续时长/失效时机。
- **卡种命中**：怪兽 3390（`SetReset`）/ 魔法 996 / 陷阱 700。
- **lua 实现特征**：`SetReset(RESETS_STANDARD...)` / `RESET_PHASE|PHASE_END,n` / `RESET_OPPO_TURN` / `RESET_SELF_TURN` / `RESET_CHAIN` / 0。
- **需自定义参数**：`resetMode`(standard/phase_end/turn_end/oppo_turn/self_turn/chain/never)、`turns`。
- **设计器覆盖**：❌
- **优先级**：P0

---

### E. 取对象 / 目标 target 全集

> 设计器 `target` 字段目前只有 7 个值，严重不足。建议拆为 `targeted`(bool) × `targetRange`(归属/区域) × `filter` 的组合。

| 中文名 | identifier | 说明 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---:|---:|---:|---|
| 不取对象 | `none` | operation 段现选 | — | — | — | ✅ |
| 取场上卡为对象 | `target_field_card` | `EFFECT_FLAG_CARD_TARGET`+`SelectTarget` | 3535 组合 | 913/1086 | 879 | ✅ |
| 取对手场上卡 | `target_oppo_card` | 归属对手 | — | — | — | ✅ |
| 取对手怪兽 | `target_oppo_monster` | 怪兽区 | 3419(`SelectTarget`) | 997 | 752 | ✅ |
| 取自己怪兽 | `target_self_monster` | 己方怪兽区 | — | — | — | ✅ |
| 取墓地怪兽 | `target_grave_monster` | 墓地 | — | — | — | ✅ |
| 取除外卡 | `target_banished` | 除外区 | — | — | — | ✅ |
| 取玩家为对象 | `target_player` `(新)` | `EFFECT_FLAG_PLAYER_TARGET` | — | 570 | 316 | ❌ |
| 取魔陷区卡 | `target_spell_trap` `(新)` | SZONE | — | — | — | ⚠️(并入 field_card) |
| 取手卡 | `target_hand` `(新)` | 手卡 | — | 864(LOCATION_HAND) | — | ❌ |
| 取卡组卡 | `target_deck` `(新)` | 卡组（多为非取对象选卡） | — | 1027 | — | ⚠️(并入 search) |
| 取额外卡组 | `target_extra` `(新)` | 额外 | — | 368 | — | ❌ |
| 取灵摆区 | `target_pzone` `(新)` | PZONE | — | 37 | — | ❌ |
| 取超量素材 | `target_overlay` `(新)` | OVERLAY | — | 6 | — | ❌ |
| 归属：双方 | `target_both` `(新)` | 己方+对手 | — | — | — | ⚠️(wipe 有) |
| 数量：单张 | `count_min_max` | `SelectTarget(...,1,1)` | 4220(1-1) | — | — | ✅ |
| 数量：任意张 | `count_any` `(新)` | `1-99` | 5 | — | — | ❌ |
| 目标范围（常驻） | `set_target_range` | `SetTargetRange(loc,who)` | 见 F | 761 | 402 | ❌ |
| 多组联动选择 | `select_unselect_group` | `aux.SelectUnselectGroup` | 427(2-2) | — | 105 | ❌ |
| 取对象可被判据 | `target_filter` | 种族/属性/等级/攻守/字段/卡名 | — | `IsSetCard` 1164 / `IsType` 513 / `IsRace` 480 / `IsAttribute` 222 / `IsLevel` 94 | — | ⚠️ |

- **关键参数**：`targeted`(bool, 默认 true 取对象)、`targetWho`(self/oppo/both, 默认 oppo)、`targetZone`(MZONE/SZONE/ONFIELD/GRAVE/HAND/DECK/REMOVED/EXTRA/PZONE, 默认 ONFIELD)、`targetCountMin`/`targetCountMax`(默认 1/1, 任意张用 1/99)、`targetFilter`(组合筛选)。
- **设计器覆盖**：⚠️（有归属/区域/怪兽-魔陷，缺玩家对象、墓地以外区域、任意张、多组联动）
- **优先级**：P0

---

### F. 常驻适用 continuous（range / targetRange / property / value）

| 字段 | identifier | 取值域 | 怪兽 | 魔法 | 陷阱 | 覆盖 |
|---|---|---|---|---:|---:|---|
| 驻留区域 | `range` | `LOCATION_SZONE` / `FZONE` / `GRAVE` / `MZONE` / `PZONE` / `HAND` / `REMOVED` | 84(MZONE) | 649(SZONE)/330(FZONE)/386(GRAVE) | 547(SZONE) | ⚠️(仅 `range=grave/szone`) |
| 适用目标范围 | `targetRange` | `SetTargetRange(loc,who)`：`1,0`(828)/`LOCATION_MZONE,0`(410)/`0,1`(213)/`LOCATION_MZONE,LOCATION_MZONE`(201)/`1,1`(106) | — | 761 | 402 | ❌ |
| 结算标志 | `property` | `EFFECT_FLAG_*` | — | — | — | ⚠️(隐含) |
| 常驻值 | `value` | 固定/函数（见 G） | — | — | — | ⚠️(atk_boost 固定) |
| 里侧也适用 | `setAvailable` `(新)` | `EFFECT_FLAG_SET_AVAILABLE` | 123 | 55 | 65 | ❌ |
| 只对己方范围 | `selfRange` | `SetRange`+`SetTargetRange(1,0)` | — | — | — | ❌ |
| 不可被无效 | `cannotDisable` | `EFFECT_FLAG_CANNOT_DISABLE` | 2122 | 278 | 232 | ❌ |
| 不可复制 | `uncopyable` | `EFFECT_FLAG_UNCOPYABLE` | 1327 | 28 | — | ❌ |
| 单一范围 | `singleRange` `(新)` | `EFFECT_FLAG_SINGLE_RANGE` | 1486 | 71 | — | ❌ |

- **需自定义参数**：`range`、`targetRangeWho`、`targetRangeLoc`、`property[]`、`value`/`valueSource`、`setAvailable`、`cannotDisable`、`uncopyable`、`singleRange`。
- **设计器覆盖**：❌（常驻类仅 `immune_all`/`atk_boost` 两个硬编码模板）
- **优先级**：P0

---

### G. 数值来源 value source

| 中文名 | identifier | 说明 | lua 特征 | 出现量级(文件) | 覆盖 |
|---|---|---|---|---:|---|
| 固定值 | `fixed` | 直接常量 | `SetValue(800)` | 最高 | ✅ |
| 增量(可负) | `delta` | update | `EFFECT_UPDATE_ATTACK + SetValue(n)` | 怪兽 1319 | ⚠️ |
| 计数×倍率 | `count_times` | 按筛选卡数 | `Duel.GetMatchingGroupCount(...)*n` | 高 | ❌ |
| 墓/场卡数 | `grave_count` / `field_count` | 数量×N | `Duel.GetFieldGroupCount` / `GetMatchingGroupCount` | 怪兽 234(魔法 `GetFieldGroupCount`) | ❌ |
| 等级参照 | `level_ref` | 等级×N / 取等级 | `GetLevel` 魔法 171 / `GetOriginalLevel` 35 / `GetRank` 35 | 中 | ❌ |
| 攻守参照 | `atk_ref` / `def_ref` | 借用攻守值 | `GetAttack` 魔法 134 / `GetDefense` 31 / `GetBaseAttack` 51 | 中 | ❌ |
| 素材数 | `overlay_count` | 超量素材数×N | `GetOverlayCount` / `GetMaterialCount` | 中 | ❌ |
| 当前值比例 | `ratio` | 攻守的一半等 | `tc:GetAttack()/2` | 中 | ❌ |
| LP 差值 | `lp_diff` | 双方 LP 差 | `Duel.GetLP` 怪兽 106 / 魔法 82 | 低 | ❌ |
| 指示物数 | `counter_count` | 指示物数×N | `GetCounter(COUNTER_A)*n` | 低 | ❌ |
| 掷骰/硬币结果 | `dice_coin_result` | 结果×N | `Duel.TossDice` 后累加 | 低 | ❌ |
| 支付 LP 值 | `paid_lp` | 用支付量换算 | `GetFlagEffectLabel(id)`（c75539614） | 低 | ❌ |
| 玩家选择/宣言值 | `chosen_value` | 宣言或 SelectEffect 值 | `CHAININFO_TARGET_PARAM` | 低 | ❌ |
| 公式表达式 | `formula` `(新)` | 上述组合 | 任意 Lua 闭包 | — | ❌ |

- **需自定义参数**：`valueMode`(fixed/delta/ref)、`sourceKind`、`multiplier`、`refFilter`、`refZone`、`formula`。
- **设计器覆盖**：❌（仅固定值；`burn_damage`/`gain_lp`/`atk_boost` 接受常量）
- **优先级**：P0（`count_times` 与 `level_ref` 是最大缺口）

---

### H. 限制与封锁 restriction / lock

> 完整枚举，含低频项；部分条目与 D9 重叠，此处按「常量」维度列全。

| 中文名 | identifier | 常量 | 怪兽 | 魔法 | 陷阱 | 覆盖 | 优先级 |
|---|---|---|---:|---:|---:|---|---|
| 不能特召(群体) | `lock_special_summon` | `EFFECT_CANNOT_SPECIAL_SUMMON` | 615 | 217 | 76 | ❌ | P0 |
| 不能通常召唤 | `lock_summon` | `EFFECT_CANNOT_SUMMON` | 71 | 45 | 19 | ⚠️ | P1 |
| 不能里侧盖放 | `lock_mset` | `EFFECT_CANNOT_MSET` | 23 | 16 | 6 | ⚠️ | P1 |
| 不能盖放魔陷 | `lock_sset` | `EFFECT_CANNOT_SSET` | 7 | 17 | 3 | ❌ | P2 |
| 不能反转召唤 | `lock_flip_summon` | `EFFECT_CANNOT_FLIP_SUMMON` | 14 | 10 | 11 | ❌ | P2 |
| 不能攻击 | `lock_attack` | `EFFECT_CANNOT_ATTACK` | 208 | 111 | 33 | ⚠️ | P1 |
| 不能攻击宣言 | `lock_attack_announce` | `EFFECT_CANNOT_ATTACK_ANNOUNCE` | 63 | 34 | 14 | ❌ | P2 |
| 不能直接攻击 | `lock_direct_attack` | `EFFECT_CANNOT_DIRECT_ATTACK` | 62 | 18 | 20 | ⚠️ | P2 |
| 必须攻击 | `lock_must_attack` | `EFFECT_MUST_ATTACK` / `_MONSTER` | 36/19 | — | 13/9 | ❌ | P2 |
| 只能攻击某怪 | `lock_only_attack_monster` | `EFFECT_ONLY_ATTACK_MONSTER` | — | — | 3 | ❌ | P2 |
| 不能成为攻击对象 | `lock_battle_target` | `EFFECT_CANNOT_BE_BATTLE_TARGET` | 55 | 55 | — | ⚠️ | P1 |
| 不能选择战斗目标 | `lock_select_battle_target` | `EFFECT_CANNOT_SELECT_BATTLE_TARGET` | 93 | 21 | 11 | ❌ | P2 |
| 无视战斗目标 | `lock_ignore_battle_target` | `EFFECT_IGNORE_BATTLE_TARGET` | — | — | 4 | ❌ | P2 |
| 不能不能发动 | `lock_cannot_activate` | `EFFECT_CANNOT_ACTIVATE` | 200 | 73 | 46 | ❌ | P0 |
| 不能触发 | `lock_cannot_trigger` | `EFFECT_CANNOT_TRIGGER` | 62 | 30 | 20 | ⚠️ | P1 |
| 不能变更表示形式 | `lock_change_position` | `EFFECT_CANNOT_CHANGE_POSITION` | 41 | 12 | 22 | ⚠️ | P1 |
| 不能变更控制权 | `lock_change_control` | `EFFECT_CANNOT_CHANGE_CONTROL` | 11 | — | — | ❌ | P2 |
| 不能里侧变 | `lock_turn_set` | `EFFECT_CANNOT_TURN_SET` | 6 | — | 2 | ❌ | P2 |
| 不能解放(上级) | `lock_unreleasable_sum` | `EFFECT_UNRELEASABLE_SUM` | 39 | 23 | 8 | ⚠️ | P1 |
| 不能解放(非上级) | `lock_unreleasable_nonsum` | `EFFECT_UNRELEASABLE_NONSUM` | 26 | 15 | 8 | ⚠️ | P1 |
| 不能解放(效果) | `lock_unreleasable_effect` | `EFFECT_UNRELEASABLE_EFFECT` | 1 | — | — | ❌ | P2 |
| 不能除外 | `lock_remove` | `EFFECT_CANNOT_REMOVE` | 11 | — | 4 | ❌ | P2 |
| 不能送墓 | `lock_to_grave` | `EFFECT_CANNOT_TO_GRAVE` | — | — | — | ❌ | P2 |
| 不能回手 | `lock_to_hand` | `EFFECT_CANNOT_TO_HAND` | — | — | 3 | ❌ | P2 |
| 不能回卡组 | `lock_to_deck` | `EFFECT_CANNOT_TO_DECK` | — | — | 3 | ❌ | P2 |
| 不能抽卡 | `lock_draw` | `EFFECT_CANNOT_DRAW` | — | — | 2 | ❌ | P2 |
| 不能作同调素材 | `lock_synchro_material` | `EFFECT_CANNOT_BE_SYNCHRO_MATERIAL` | 64 | — | — | ⚠️ | P1 |
| 不能作超量素材 | `lock_xyz_material` | `EFFECT_CANNOT_BE_XYZ_MATERIAL` | 40 | — | — | ⚠️ | P1 |
| 不能作融合素材 | `lock_fusion_material` | `EFFECT_CANNOT_BE_FUSION_MATERIAL` | 17 | — | — | ⚠️ | P1 |
| 不能作连接素材 | `lock_link_material` | `EFFECT_CANNOT_BE_LINK_MATERIAL` | 45 | — | — | ⚠️ | P1 |
| 不能作任意素材 | `lock_be_material` | `EFFECT_CANNOT_BE_MATERIAL` | 21 | — | 5 | ⚠️ | P1 |
| 同调素材限制 | `lock_synchro_mat_restriction` | `EFFECT_SYNCHRO_MAT_RESTRICTION` | 13 | — | — | ❌ | P2 |
| 不能战斗阶段 | `lock_battle_phase` | `EFFECT_CANNOT_BP` | 23 | 19 | 7 | ❌ | P2 |
| 跳过阶段/回合 | `skip_phase` | `EFFECT_SKIP_BP/DP/M1/M2/TURN` | 8/7/… | — | 22(`Duel.SkipPhase`) | ❌ | P1 |
| 追加召唤次数 | `extra_summon_count` | `EFFECT_EXTRA_SUMMON_COUNT` | 51 | 22 | — | ❌ | P1 |
| 追加盖放次数 | `extra_set_count` | `EFFECT_EXTRA_SET_COUNT` | 5 | — | — | ❌ | P2 |
| 召唤次数上限 | `set_summon_count_limit` | `EFFECT_SET_SUMMON_COUNT_LIMIT` | — | — | — | ❌ | P2 |
| 双祭品 | `double_tribute` | `EFFECT_DOUBLE_TRIBUTE` | 25 | — | — | ❌ | P2 |
| 减祭品 | `decrease_tribute` | `EFFECT_DECREASE_TRIBUTE` | 4 | — | — | ❌ | P2 |
| 追加祭品 | `extra_tribute` / `add_extra_tribute` | `EFFECT_EXTRA_TRIBUTE` / `ADD_EXTRA_TRIBUTE` | 10/10 | — | — | ❌ | P2 |
| 祭品上限 | `tribute_limit` | `EFFECT_TRIBUTE_LIMIT` | 9 | — | — | ❌ | P2 |
| 不能攻击(召唤回合) | `cannot_attack_turn` | 条件式 `EFFECT_CANNOT_ATTACK` | — | — | — | ❌ | P2 |
| 区域封锁 | `lock_field_zone` | `Duel.SelectDisableField` | — | 11 | 11 | ❌ | P2 |
| 场地唯一 | `lock_unique` | `SetUniqueOnField` | — | 34 | — | ❌ | P2 |
| 规则改写(抽卡/手牌) | `rule_rewrite` | `EFFECT_DRAW_COUNT` / `HAND_LIMIT` / `NECRO_VALLEY` | — | — | 4/1/3 | ❌ | P2 |

- **设计器覆盖**：⚠️（`cannotAttack`/`cannotBeAttacked`/`cannotSpecialSummon`/`cannotNormalSummon`/`cannotMSet`/`cannotTrigger`/`cannotBeReleased`/`cannotChangePosition`/`materialRestriction` 均在，但**全部只写卡面文本，不生成效果层 Lua**）
- **优先级**：P0（`lock_special_summon` / `lock_cannot_activate` 是最大缺口）

---

### I. 抗性与替代 resistance / replacement

| 中文名 | identifier | 常量 | 怪兽 | 魔法 | 陷阱 | 覆盖 | 优先级 |
|---|---|---|---:|---:|---:|---|---|
| 效果免疫(全部) | `immune_all` | `EFFECT_IMMUNE_EFFECT` | 165 | 38 | 42 | ⚠️ | P0 |
| 效果免疫(按来源) | `immune_by_source` `(新)` | `EFFECT_IMMUNE_EFFECT`+filter | — | — | — | ❌ | P1 |
| 不可战斗破坏 | `indestructible_battle` | `EFFECT_INDESTRUCTABLE_BATTLE` | 408 | 54 | 54 | ❌ | P0 |
| 不可效果破坏 | `indestructible_effect` | `EFFECT_INDESTRUCTABLE_EFFECT` | 325 | 70 | 45 | ❌ | P0 |
| 不可破坏(可数) | `indestructible_count` | `EFFECT_INDESTRUCTABLE_COUNT` | 68 | 28 | 9 | ❌ | P1 |
| 不可破坏(通用) | `indestructible` | `EFFECT_INDESTRUCTABLE` | — | — | 1 | ❌ | P2 |
| 破坏替代 | `destroy_replace` | `EFFECT_DESTROY_REPLACE` | 155 | 67 | 23 | ❌ | P1 |
| 破坏替代(代破) | `destroy_substitute` | `EFFECT_DESTROY_SUBSTITUTE` | 15 | 5 | 1 | ❌ | P2 |
| 离场改写 | `leave_field_redirect` | `EFFECT_LEAVE_FIELD_REDIRECT` | 216 | 16 | 44 | ❌ | P1 |
| 送墓改写 | `to_grave_redirect` | `EFFECT_TO_GRAVE_REDIRECT[_CB]` | 23/16 | 5 | 6 | ❌ | P2 |
| 除外改写 | `remove_redirect` | `EFFECT_REMOVE_REDIRECT` | — | — | — | ❌ | P2 |
| 战破改写 | `battle_destroy_redirect` | `EFFECT_BATTLE_DESTROY_REDIRECT` | 14 | — | 2 | ❌ | P2 |
| 送去替代 | `send_replace` | `EFFECT_SEND_REPLACE` | 3 | — | 1 | ❌ | P2 |
| 代价替代 | `cost_replace` | `EFFECT_COST_REPLACE` | 4 | — | 2 | ❌ | P2 |
| 素材取除替代 | `overlay_remove_replace` | `EFFECT_OVERLAY_REMOVE_REPLACE` | 3 | — | — | ❌ | P2 |
| 回手改写 | `to_hand_redirect` | `EFFECT_TO_HAND_REDIRECT` | — | — | 1 | ❌ | P2 |
| 回卡组改写 | `to_deck_redirect` | `EFFECT_TO_DECK_REDIRECT` | — | — | 1 | ❌ | P2 |
| 不可取效果对象 | `cannot_be_effect_target` | `EFFECT_CANNOT_BE_EFFECT_TARGET` | 224 | 62 | 29 | ❌ | P1 |
| 不可取攻击对象 | `cannot_be_battle_target` | `EFFECT_CANNOT_BE_BATTLE_TARGET` | 55 | 55 | — | ⚠️ | P1 |
| 自我离场/留场 | `self_leave` | `EFFECT_SELF_DESTROY` / `SELF_TOGRAVE` / `REMAIN_FIELD` | — | 11 | 7/8/3 | ❌ | P1 |
| 免疫无对象限制 | `immune_include_targeted` | `EFFECT_IMMUNE_EFFECT`+`aux.tgoval` | 173(`tgoval`) | — | — | ❌ | P2 |
| 抗性豁免条件 | `immune_condition` `(新)` | 免疫 filter 中的取反 | — | — | — | ❌ | P2 |

- **需自定义参数**：`resistKind`、`scope`(all/oppo/spell/trap/monster_effect/battle)、`count`、`once`、`substituteCost`、`redirectTo`、`conditionFilter`。
- **设计器覆盖**：⚠️（仅 `immune_all` 一个通用模板）
- **优先级**：P0

---

### J. 时点与连锁操作（SetLabel / BreakEffect / TargetParam / 延迟 / 选择）

| 中文名 | identifier | API | 出现量级(文件) | 覆盖 | 优先级 |
|---|---|---|---:|---|---|
| 标签传参 | `set_label` | `e:SetLabel(v)` / `e:GetLabel()` | 怪兽 874 / 魔法 418 / 陷阱 305 | ❌ | P1 |
| 目标卡保持 | `set_target_card` | `Duel.SetTargetCard(g)` / `GetFirstTarget` | 陷阱 192 / `GetFirstTarget` 683 | ⚠️ | P1 |
| 目标玩家保持 | `set_target_player` | `Duel.SetTargetPlayer(p)` | 魔法 244 | ⚠️ | P1 |
| 参数保持 | `set_target_param` | `Duel.SetTargetParam(v)` → `GetChainInfo(0,CHAININFO_TARGET_PARAM)` | 魔法 248 / 陷阱 141 | ❌ | P1 |
| 取链上信息 | `get_chain_info` | `Duel.GetChainInfo(0,CHAININFO_*)` | 怪兽 995 / 魔法 402 / 陷阱 322 | ⚠️ | P1 |
| 分段结算 | `break_effect` | `Duel.BreakEffect()` | 怪兽 911 / 魔法 478 / 陷阱 351 | ❌ | P1 |
| 连锁封锁 | `set_chain_limit` | `Duel.SetChainLimit(aux.FALSE)` | 魔法 10 / 陷阱 10 | ❌ | P1 |
| 连锁至结束封锁 | `set_chain_limit_till_end` | `Duel.SetChainLimitTillChainEnd(aux.FALSE)` | 怪兽（c10000010） | ❌ | P2 |
| 改写连锁操作 | `change_chain_operation` | `Duel.ChangeChainOperation(ev,f)` | 陷阱 7 | ❌ | P2 |
| 分支选择 | `select_effect` | `Duel.SelectEffect(tp,{b,desc},...)` | 魔法 127 / 陷阱 73 | ⚠️ | P1 |
| 是/否选择 | `select_yes_no` | `Duel.SelectYesNo(tp,n)` | 魔法 334 / 陷阱 219 | ⚠️ | P1 |
| 选项选择 | `select_option` | `Duel.SelectOption(tp,...)` | 魔法 59 | ❌ | P2 |
| 多选组 | `select_unselect_group` | `aux.SelectUnselectGroup` | 怪兽 427 / 陷阱 105 | ❌ | P2 |
| 延迟处理 | `delayed_operation` | `aux.DelayedOperation(...,phase,...)` | 怪兽 30 / 魔法 20 | ❌ | P1 |
| 标记效果 | `register_flag_effect` | `Duel.RegisterFlagEffect` / `GetFlagEffect` | 怪兽 181 / 魔法 294 / 陷阱 66 | ❌ | P2 |
| 全局检查 | `global_check` | `aux.GlobalCheck` | 怪兽 90 | ❌ | P2 |
| 持续目标锁定 | `persistent_target` | `aux.PersistentTargetFilter` | 陷阱 23 | ❌ | P2 |
| 提示时点 | `set_hint_timing` | `SetHintTiming` | 魔法 347 / 陷阱广泛 | ⚠️ | P0 |
| 可能操作声明 | `set_possible_operation_info` | `Duel.SetPossibleOperationInfo` | 魔法 283 | ⚠️(自动) | P2 |
| 公告事件 | `raise_event` | `Duel.RaiseEvent` | 陷阱 26 | ❌ | P2 |
| 访问过的卡组 | `get_operated_group` | `Duel.GetOperatedGroup()` | 陷阱 63 | ❌ | P2 |

- **需自定义参数**：`segments[]`、`params[]`、`branches[]`、`delayPhase`、`delayTurns`、`denyChain`、`labels[]`。
- **设计器覆盖**：❌（除自动 `SetOperationInfo` 外几乎全缺）
- **优先级**：P0（`set_label` / `get_chain_info` / `break_effect` / `select_yes_no` 是复合效果的骨架）

---

### K. 效果外文本 ruleTexts

> 与现有支持清单（`docs/DESIGNER_SUPPORT_BASELINE.md` + `docs/RULE_TEXTS.md`）对齐，并标注缺口。
> 数字为全语料库/现代 OCG（来自 `rule-texts-inventory.json` 与三份报告）。

#### K1. 已支持且可生成脚本

| 中文名 | identifier | 常量/API | 语料规模 | 覆盖 |
|---|---|---|---:|---|
| 规则视作其他卡名 | `alias` | `EFFECT_ADD_CODE` | 全库 27 / 怪兽 6 / 魔法 — / 陷阱 5 | ✅ |
| 同名卡一回合特召一次 | `ssOncePerTurn` | `c:SetSPSummonOnce` | 77 | ✅ |
| 不能通常召唤/苏生限制 | `cannotNormalSummon` | `c:EnableReviveLimit` + `EFFECT_SPSUMMON_CONDITION→aux.FALSE` | 全库 3705 | ✅ |
| 不能特殊召唤 | `cannotSpecialSummon` | `EFFECT_SPSUMMON_CONDITION→aux.FALSE` | 1055 | ✅ |
| 不能里侧盖放 | `cannotMSet` | `EFFECT_CANNOT_MSET` | 83 | ✅ |
| 效果不能发动 | `cannotTrigger` | `EFFECT_CANNOT_TRIGGER` | 198 | ✅ |
| 不能作为素材 | `materialRestriction` | `EFFECT_CANNOT_BE_*_MATERIAL` | 98+41+… | ✅ |
| 不能解放 | `cannotBeReleased` | `EFFECT_UNRELEASABLE_SUM/NONSUM` | 143/83 | ✅ |
| 不能变更表示形式 | `cannotChangePosition` | `EFFECT_CANNOT_CHANGE_POSITION` | 137 | ✅ |
| 不能攻击/不能成为攻击对象/可直接攻击 | `cannotAttack`/`cannotBeAttacked`/`canDirectAttack` | `EFFECT_CANNOT_ATTACK` 等 | 731/114/411 | ✅ |
| 规则上追加种类/属性/种族/等级 | `addMonsterType`/`ruleAttribute`/`ruleRace`/`ruleLevel` | `EFFECT_ADD_TYPE` / `EFFECT_CHANGE_*` | 179/153/157/308 | ✅(卡面文本) |
| 召唤方式手续 | `procSummonType` | `Fusion.AddProcMixN` / `Synchro.AddProcedure` / `Xyz` / `Link` / `Ritual.AddProcGreater` | 融合 1015 / 同调 648 / 超量 789 / 连接 574 / 仪式 77 | ⚠️ |
| 自定义独有规则 | `customRule` | 仅卡面不入脚本 | — | ⚠️(有意为之) |

#### K2. 缺口（语料存在但设计器未支持）

| 中文名 | identifier | 常量/API | 语料规模 | 建议 | 优先级 |
|---|---|---|---:|---|---|
| 场地唯一 | `uniqueOnField` | `SetUniqueOnField` | 魔法 34 | 新增 ruleText | P2 |
| 素材检查/属性保存 | `materialCheck` | `EFFECT_MATERIAL_CHECK` | 166 | 新增 ruleText | P2 |
| 融合素材替代 | `fusionSubstitute` | `EFFECT_FUSION_SUBSTITUTE` | 12 | 新增 ruleText | P2 |
| 额外素材 | `extraMaterial` | `EFFECT_EXTRA_MATERIAL` / `EXTRA_FUSION_MATERIAL` / `EXTRA_RITUAL_MATERIAL` | 18/4/10 | 新增 ruleText | P2 |
| 同调素材自定义 | `synchroMaterialCustom` | `EFFECT_SYNCHRO_MATERIAL_CUSTOM` | 9 | 新增 ruleText | P2 |
| 多重调整/非调整 | `multipleTuners`/`nonTuner` | `EFFECT_MULTIPLE_TUNERS` / `EFFECT_NONTUNER` | 26/14 | 新增 ruleText | P2 |
| 超量等级 | `xyzLevel` | `EFFECT_XYZ_LEVEL` | 17 | 新增 ruleText | P2 |
| 陷阱盖放回合可发动 | `trapActInSetTurn` | `EFFECT_TRAP_ACT_IN_SET_TURN` | 28 | 新增 ruleText | P1 |
| 陷阱可从手牌发动 | `trapActInHand` | `EFFECT_TRAP_ACT_IN_HAND` | 30 | 新增 ruleText | P1 |
| 灵摆刻度 | `ruleScale` | 卡数据 `lscale`/`rscale` | 529 | 已有独立设计器 | P1 |
| 公开手卡/里侧适用 | `publicCard` | `EFFECT_PUBLIC` | 魔法 8 / 陷阱 7 | 新增 | P2 |
| 效果不可被无效 | `cannotBeNegated` | `EFFECT_FLAG_CANNOT_NEGATE`/`_CANNOT_DISABLE`/`_CANNOT_INACTIVATE` | 10/278/10(魔法) | 新增 ruleText | P1 |
| 决斗一次/连锁一次 | `countCodeDuel`/`countCodeChain` | `EFFECT_COUNT_CODE_DUEL` / `_CHAIN` | 39/28（怪兽） | 新增限制选项 | P1 |
| 誓约 | `oath` | `EFFECT_FLAG_OATH` | 219（怪兽） | 新增 ruleText | P1 |
| 抽卡数改写/手牌上限 | `drawCount`/`handLimit` | `EFFECT_DRAW_COUNT` / `EFFECT_HAND_LIMIT` | 4/1 | 新增 | P2 |
| 胜利条件 | `winCondition` | `Duel.Win` / `EFFECT_LIGHT_OF_INTERVENTION` | 5/2 | 新增 | P2 |

- **设计器覆盖**：⚠️（K1 大部分已支持，K2 全缺）
- **优先级**：P1

---

## 3. 需自定义调整的参数总表

> 合并三份报告第 4 节并去重。按「影响范围」降序。`三卡种影响量级` 用命中文件数近似。
> **合并决策**：`target_count` / `count` / `num` / `amount`（用于张数）统一为 **`count`**；
> 用于数值的 `amount` / `value` / `atk_value` / `def_value` 统一为 **`value`**（配合 `valueSource`）；
> 目标范围 `targetRange` / `target_range` 统一为 **`targetRange`**；
> 持续时长 `duration` / `reset` 统一为 **`reset`**（`duration` 保留为 UI 概念，落库用 `reset`）。

| 参数名(英文) | 含义 | 取值域/示例 | 默认值 | 适用能力 | 三卡种影响量级(files) | 设计器已有 |
|---|---|---|---|---|---|---|
| `count` | 操作/选择数量 | 1~5；任意用 `1,99` | 1 | 检索/破坏/除外/特召/抽卡/解放/丢弃 | 怪 ~12000 / 魔 ~2500 / 陷 ~1500 | ✅ |
| `who` | 对象/受益归属 | `self`/`oppo`/`both`/`PLAYER_ALL` | 除去类 oppo，增益类 self | 全部 | 怪 ~11000 / 魔 ~1800 / 陷 全部 | ⚠️ |
| `filter` | 卡筛选 | 卡种/种族/属性/等级/攻守/字段/卡名 | 无 | 全部目标类 | 怪 ~8000 / 魔 ~2500 / 陷 ~1200 | ⚠️(字段+卡类) |
| `zone` / `zone_from` | 来源区域 | `DECK`/`HAND`/`GRAVE`/`REMOVED`/`EXTRA`/`MZONE`/`SZONE`/`FZONE`/`PZONE`/`ONFIELD`（可多选） | 随能力 | 检索/特召/回收/除去 | 怪 ~9000 / 魔 ~2600 / 陷 ~1000 | ⚠️ |
| `zone_to` | 目的地区域 | `GRAVE`/`REMOVED`/`HAND`/`DECK`(TOP/BOTTOM/SHUFFLE)/`EXTRA`/`MZONE`/`SZONE`/`PZONE`/`EQUIP` | 随能力 | 除去/移动/回收/重定向 | 怪 ~2500 / 魔 ~2500 / 陷 ~700 | ⚠️ |
| `category` | 效果分类(CATEGORY_*) | `SPECIAL_SUMMON`/`DESTROY`/`TOHAND`/`SEARCH`/`DRAW`/… | 自动推导 | 全部效果 | 怪 22860 effect / 魔 全部 / 陷 全部 | ⚠️(action 映射) |
| `timing_event` | 触发事件 | `EVENT_*`（见 B 节） | 随 timing | 全部诱发 | 怪 ~5000 / 魔 ~1000 / 陷 全部触发型 | ⚠️(~30 预设) |
| `countLimit` | 频次限制 | `1`；scope=`self`/`same_name_card`/`group`/`DUEL`/`CHAIN`/`SINGLE` | `1, same_name_card`(HOPT) | 全部 | 怪 5430 / 魔 1565 / 陷 857 | ⚠️(缺 OATH/CHAIN) |
| `reset` | 持续时长/重置 | `STANDARD`/`PHASE_END`/`TURN_END`/`OPPO_TURN`/`SELF_TURN`/`CHAIN`/`never`；可带轮数 | `STANDARD` | 数值/抗性/封锁/控制权 | 怪 3390 / 魔 996 / 陷 ~700 | ❌ |
| `value` | 数值量 | ±整数 / 函数 | 0 | 攻守/伤害/回复/等级 | 怪 ~1725 / 魔 ~1000 / 陷 ~300 | ⚠️(仅固定) |
| `valueSource` | 数值来源 | `fixed`/`count_times`/`level_ref`/`atk_ref`/`overlay_count`/`ratio`/`lp_diff`/`formula` | `fixed` | 数值类 | 怪 ~4000 / 魔 ~1000 / 陷 ~300 | ❌ |
| `targeted` | 是否取对象 | `true`/`false` | `true`(有 SelectTarget) | 除去/回收/特召/数值 | 怪 ~2550 / 魔 ~1300 / 陷 ~1200 | ⚠️ |
| `targetRange` | 常驻适用范围 | `SetTargetRange(loc,who)`：`1,0`/`0,1`/`1,1`/`LOCATION_MZONE,0`/`LOCATION_ONFIELD,LOCATION_ONFIELD` | `1,0` | 常驻/免疫/封锁/数值/装备 | 怪 — / 魔 761 / 陷 402 | ❌ |
| `property` | 结算标志 | `CARD_TARGET`/`PLAYER_TARGET`/`CANNOT_DISABLE`/`DAMAGE_STEP`/`DAMAGE_CAL`/`DELAY`/`IGNORE_IMMUNE`/`SET_AVAILABLE`/`SINGLE_RANGE`/`UNCOPYABLE` | 按需自动 | 全部 | 怪 最高(如 CANNOT_DISABLE 2122) / 魔 / 陷 | ⚠️(隐含) |
| `reason_filter` | 触发原因筛选 | `REASON_EFFECT`/`BATTLE`/`DESTROY`/`COST`/`MATERIAL`/`RELEASE` 及组合取反 | `REASON_EFFECT` | 「由XX送去墓地/被破坏」类 | 怪 ~1440 / 魔 ~1800 / 陷 ~1800 | ❌ |
| `cost`/`costType` | 发动代价类型 | 见 C 节 20+ 种 | `none` | 全部主动效果 | 怪 ~2160 / 魔 898 / 陷 680 | ⚠️(缺自身除外/送墓/回卡组/展示) |
| `pos` | 表示形式 | `POS_FACEUP_ATTACK`/`FACEUP_DEFENSE`/`FACEDOWN_DEFENSE`/`FACEDOWN_ATTACK`/`FACEUP`/`FACEDOWN` | `POS_FACEUP` | 特召/变形式/除外/盖放 | 怪 ~3900 / 魔 ~1400 / 陷 ~1000 | ⚠️ |
| `summonType`/`sumtype` | 召唤类型/标记 | `SUMMON_TYPE_SPECIAL/FUSION/SYNCHRO/XYZ/LINK/RITUAL/PENDULUM/TRIBUTE` | `SUMMON_TYPE_SPECIAL` | 特召/手续 | 怪 ~3590 / 魔 / 陷 | ⚠️ |
| `delay` | 是否错开时点 | `true`(`EFFECT_FLAG_DELAY`)/`false` | `true` | 触发类 | 怪 2540 / 魔 341 / 陷 208 | ❌ |
| `range` | 效果驻留区域 | `LOCATION_SZONE`/`FZONE`/`GRAVE`/`MZONE`/`PZONE` | 随卡种 | 常驻/装备/场地/墓地起效 | 怪 84 / 魔 1377 / 陷 547 | ⚠️(grave/szone) |
| `hintTiming` | 可发动时点 | 位掩码：`TIMING_DAMAGE_STEP`/`TIMING_END_PHASE`/`TIMING_MAIN_END`/`TIMINGS_CHECK_MONSTER_E` | 0(任意) | 发动条件/战斗 | 怪 广泛 / 魔 347 / 陷 ~1500 | ⚠️ |
| `ignoreImmune` | 是否无视抗性 | `true`/`false` | `false` | 除去/无效 | 怪 379 / 魔 163 / 陷 103 | ❌ |
| `branchCount`/`branches` | 分支数/各分支 | 2~4；`SelectEffect`/`SelectYesNo` | 2 | 复合/二选一 | 怪 / 魔 127+334 / 陷 73+219 | ⚠️(≤2) |
| `sequence`/`segments` | 多段结算顺序 | `Duel.BreakEffect()` | 1 段 | 复合效果 | 怪 911 / 魔 478 / 陷 351 | ❌ |
| `labelParam`/`params` | 跨段传参 | `SetLabel`/`SetTargetParam`/`GetChainInfo` | 无 | 复合效果 | 怪 874 / 魔 418 / 陷 305 | ❌ |
| `confirm`/`shuffle` | 是否展示/洗牌 | `ConfirmCards`/`ShuffleDeck`/`ShuffleHand`/`DisableShuffleCheck` | confirm=true, shuffle=false | 检索/回收/卡组操作 | 怪 ~750 / 魔 ~750 / 陷 ~450 | ⚠️ |
| `deckPosition` | 回卡组位置 | `SEQ_DECKTOP`/`SEQ_DECKBOTTOM`/`SEQ_DECKSHUFFLE` | `SEQ_DECKSHUFFLE` | 回卡组/回收 | 怪 ~500 / 魔 231 / 陷 169 | ❌ |
| `immune_scope`/`resistKind` | 免疫/抗性范围 | `all`/`oppo_only`/`spell`/`trap`/`monster_effect`/`battle`/`target`；`battle`/`effect`/`both`/`once`/`count_n` | `all` | 抗性 | 怪 ~767 / 魔 ~160 / 陷 ~150 | ⚠️ |
| `negateKind` | 无效类型 | `activation`/`effect`/`summon`/`attack` | `activation` | 反制 | 怪 ~470 / 魔 ~40 / 陷 ~250 | ⚠️ |
| `controlTo`/`controlDuration` | 控制权归属/时长 | `self`/`oppo`；`permanent`/`phase_end`/`turn_end` | `self`,`permanent` | 控制权 | 怪 119 / 魔 36 / 陷 38 | ❌ |
| `counterType`/`counterCount` | 指示物种类/数量 | `COUNTER_A`/`SPELL`/…；1~N | 无 | 指示物 | 怪 160 / 魔 77 / 陷 18 | ❌ |
| `tokenSpec` | 衍生物参数 | `atk/def/level/race/attribute/type/count/setcode` | 无 | 衍生物 | 怪 139 / 魔 65 / 陷 37 | ❌ |
| `scaleValue` | 灵摆刻度 | 0~13；left/right；变动量 | 卡数据 | 灵摆 | 怪 19 / 魔 — / 陷 — | ⚠️(独立设计器) |
| `announceKind` | 宣言类型 | `card`/`attribute`/`race`/`level`/`number`/`number_range` | 无 | 宣言 | 怪 ~102 / 魔 ~40 / 陷 ~35 | ❌ |
| `coinDiceSpec` | 骰/币参数 | 个数、成功条件、分支 | 无 | 运气 | 怪 139 / 魔 19 / 陷 15 | ❌ |
| `extraAttackN` | 追加攻击次数 | 1~N；是否攻击全部 | 1 | 战斗 | 怪 173 / 魔 30 / 陷 8 | ❌ |
| `lockType` | 封锁类型 | `special_summon`/`summon`/`attack`/`activate`/`trigger`/`release`/`material` | 无 | 限制封锁 | 怪 ~1500 / 魔 ~600 / 陷 ~250 | ⚠️(文本) |
| `redirectTo` | 离场重定向去向 | `DECKTOP`/`DECKBOT`/`HAND`/`REMOVED`/`GRAVE` | 无 | 抗性/替代 | 怪 ~270 / 魔 ~25 / 陷 ~55 | ❌ |
| `spSummonCond` | 特召条件 | 允许/禁止(`aux.FALSE`)；限定召唤法/素材 | 允许 | 特召手续 | 怪 ~1120 / 魔 — / 陷 2 | ⚠️ |
| `extraSummonN` | 追加召唤/盖放次数 | 1~N | 1 | 召唤限制 | 怪 75 / 魔 22 / 陷 — | ❌ |
| `skipPhase` | 跳过阶段 | `BP`/`DP`/`M1`/`M2`/`TURN` | 无 | 封锁 | 怪 43 / 魔 19 / 陷 22 | ❌ |
| `chainLimit` | 连锁封锁 | 允许/禁止对手连锁 | 无 | 时点/连锁 | 怪 ~60 / 魔 10 / 陷 10 | ❌ |
| `materialSpec` | 素材规格 | 数量 min/max；筛选；来源区；等级判定(`RITPROC_*`) | 无 | 召唤手续 | 怪 ~1900 / 魔 ~180 / 陷 ~20 | ⚠️(仅数量) |
| `hintMsg` | 选择提示文本 | `HINTMSG_*` | 自动 | 全部需选择的效果 | 怪 ~9000 / 魔 / 陷 | ⚠️(自动) |
| `labelData` | 运行时数据传递 | 任意 | 无 | 条件与操作联动 | 怪 874 / 魔 418 / 陷 305 | ❌ |

**影响最大的 10 个参数（按跨卡种总量）**：`count` > `who` > `filter` > `zone`/`zone_from` > `category` >
`valueSource` > `countLimit` > `reset` > `timing_event` > `targeted`。

---

## 4. API 名称勘误表

> 三份报告均发现「实际语料用法 ≠ 常见文档/直觉」。以出现频次更高且有文件佐证者为准。

| 常见误写 | 语料实际用法 | 佐证频次 | 备注 |
|---|---|---|---|
| `Duel.ChangeControl` | `Duel.GetControl`（转移）/ `Duel.SwapControl`（交换） | `GetControl` 怪 104 / 魔 28 / 陷 27；`ChangeControl` = 0 | 三报告一致 |
| `Duel.AddCounter` | `Card:AddCounter` / `tc:AddCounter` | `AddCounter` 怪 160 / 魔 77；`Duel.AddCounter` = 0 | 放置用 card 方法 |
| `Duel.RemoveCounter` | 有效但少用；主流为 `Card:RemoveCounter` | `Duel.RemoveCounter` 怪 33 / 魔 19 / 陷 5 | 两法并存，代价用 Duel 版 |
| `Duel.DisableEffect` | 注册 `EFFECT_DISABLE` / `EFFECT_DISABLE_EFFECT` | 魔法报告：`Duel.DisableEffect` = 0 | 无此 API |
| `EFFECT_TYPE_TRAPMONSTER` / `EFFECT_TRAP_MONSTER` | `c:AddMonsterAttribute(TYPE_EFFECT\|TYPE_TRAP)` + `Duel.SpecialSummonStep` | 陷阱 73 文件用 `AddMonsterAttribute`；常量 0 命中 | 判定用 `TYPE_TRAPMONSTER`（5 文件） |
| `EFFECT_TRAP_CANNOT_ACTIVATE` | `EFFECT_CANNOT_ACTIVATE`（通用） | 陷阱 46 文件；`EFFECT_TRAP_CANNOT_ACTIVATE` = 0 | 陷阱报告明确 0 |
| `Ritual.AddWholeLevelTribute` | 怪兽语料有（`Ritual.CreateProc` 体系），魔法语料功能性由 `RITPROC_*` 参数承担 | 怪兽有 / 魔法报告称其 0 | **口径冲突**（见 §7-1） |
| `Fusion.AddProcMix` | 怪兽语料有（357）；魔法语料称 `Fusion.AddProcMix*` = 0、用 `Fusion.CreateSummonEff` | 怪兽 357 / 魔法 86（CreateSummonEff） | **口径冲突**（见 §7-2），实为卡种分工不同 |
| `Duel.DelayedOperation` | `aux.DelayedOperation` / `RegisterFlagEffect` | `aux.DelayedOperation` 怪 30 / 魔 20；`Duel.` 版 = 0 | 三报告一致 |
| `Duel.ChangeControl`（陷阱交换） | `Duel.SwapControl` | 陷阱 7 | — |
| `EFFECT_EXTRA_ATTACK_MONSTER` | 存在但低频 | 怪 41 / 陷 3 | 勿与 `EFFECT_EXTRA_ATTACK` 混 |
| `Duel.XyzSummon/SynchroSummon/LinkSummon` | 存在（陷阱有：Xyz 10 / Synchro 11 / Link 7、魔法 6） | 陷阱报告 | 手续召唤特殊场景 |
| `Duel.NegateEffect` vs `Duel.NegateActivation` | 「无效效果」用 `NegateEffect`，「无效卡的发动」用 `NegateActivation` | 怪 151/229；陷 72/156 | 两者不可互换 |
| `Duel.SelectEffectYesNo` | 存在（魔法 70）但与 `Duel.SelectYesNo`（334）不同 | 魔法 | 用于效果分支确认 |
| `Duel.GetControl` 第 3/4 参 | `(tc,tp,phase,count)` 用于限时控制 | 陷阱报告 | — |
| `EFFECT_CHANGE_LEVEL` | 与 `EFFECT_UPDATE_LEVEL` 并存；另有 `CHANGE_LEVEL_FINAL` | 怪 158/180；魔 37/32；陷 18/14 | — |
| `Duel.MoveToField` | 直接置场（可含摆区/魔陷区） | 怪 147 / 魔 59 / 陷 33 | — |
| `Duel.SetLP` | 存在，用于直接设定 LP | 怪 30 / 魔 37 / 陷 14 | 非 `Duel.ChangeLP` |
| `EFFECT_CANNOT_DISABLE_SUMMON`/`_SPSUMMON` | 怪兽语料存在（5/16） | 怪 5/16 | 低频但真实 |
| `Duel.SummonOrSet` | 通常召唤/盖放二选一 | 陷阱 13（`CATEGORY_SUMMON`） | — |

---

## 5. 与现有设计器的差距清单

### P0（高频且完全缺失，优先补齐）

| 能力名 | 缺失点 | 影响量级(files) | 建议实现方式 |
|---|---|---|---|
| 衍生物生成 `token_summon` | 无任何 action | 怪 137 / 魔 63 / 陷 36 | 新增 action + `tokenSpec` 参数组 |
| 返回卡组 `to_deck` | 无 action | 怪 394 / 魔 201 / 陷 131 | 新增 action + `deckPosition` |
| 除外区特召 `special_summon_banished` | 无来源区 | 怪（`SetRange`/Remove 众多） | 扩展 `special_summon` 的 `from=REMOVED` |
| 效果无效化挂载 `disable_effect` | 仅「发动无效」 | 怪 604 / 魔 176 / 陷 168 | 新增 action + `duration`/`scope` |
| 封锁发动 `cannot_activate` | 无效果层 | 怪 200 / 魔 73 / 陷 46 | 新增 restriction + 生成 `EFFECT_CANNOT_ACTIVATE` |
| 特召封锁 `lock_special_summon` | 无效果层 | 怪 615 / 魔 217 / 陷 76 | 新增 restriction + `SetTargetRange` |
| 不可破坏 `indestructible` | 无 | 怪 801 / 魔 152 / 陷 108 | 新增 resistance + kind |
| 效果免疫(按来源) | 仅 all | 怪 165 / 魔 38 / 陷 42 | 扩展 `immune_all` 的 `scope` |
| 数值来源 `valueSource` | 仅固定值 | 怪 ~4000 / 魔 ~1000 | 新增 valueSource 维度 |
| 持续时长 `reset` | 无 | 怪 3390 / 魔 996 / 陷 700 | 新增全局 `reset` 参数 |
| 攻击力/守备力设定与负值 | 仅固定增量 | 怪 ~1700 / 魔 ~500 | 扩展 `atk_boost` 的 mode/stat |
| 卡的发动本体 `activate` | 未作为独立 effectType | 魔 2419 / 陷 2009 | 新增 effectType + 双层结构生成器 |
| 提示时点 `hintTiming` 自由位掩码 | 仅 4 预设 | 魔 347 / 陷 ~1500 | 扩展 timing 为位掩码集合 |
| 多段结算 `break_effect` | 单一 action | 怪 911 / 魔 478 / 陷 351 | 新增 `followup` 多段数组 |
| 标签传参 `set_label`/`get_chain_info` | 无 | 怪 874+995 / 魔 418+402 / 陷 305+322 | 新增 `params` 维度 |

### P1（中频缺失或仅部分支持）

| 能力名 | 缺失点 | 影响量级(files) | 建议实现方式 |
|---|---|---|---|
| 效果无效 `negate_effect` | 仅 activation | 怪 151 / 魔 36 / 陷 72 | 扩展 `negateKind=effect` |
| 无效召唤 `negate_summon` | 无 | 怪 22 / 陷 28 | 扩展 `negateKind=summon` |
| 无效攻击 `negate_attack` | 无 | 怪 64 / 魔 15 / 陷 45 | 新增 action |
| 破坏替代 `destroy_replace` | 无 | 怪 155 / 魔 67 / 陷 23 | 新增 resistance |
| 离场改写 `leave_field_redirect` | 无 | 怪 216 / 魔 16 / 陷 44 | 新增 resistance |
| 不可取对象 `untargetable` | 仅文本 | 怪 224 / 魔 62 / 陷 29 | 新增 restriction + 效果层 |
| 效果赋予 `grant` | 无 | 怪 13 / 魔 13 / 陷 4 | 新增 effectType/action |
| 装备手续/装备状态 `equip*` | 无 | 怪 258 / 魔 269 / 陷 72 | 新增 action + effectType |
| 指示物 `add_counter`/`remove_counter` | 无 | 怪 160 / 魔 77 / 陷 18 | 新增 action + `counterType` |
| 控制权转移/交换 | 无 | 怪 119 / 魔 36 / 陷 38 | 新增 action + `controlTo` |
| 表示形式变更 | 无 | 怪 295 / 魔 64 / 陷 80 | 新增 action + `pos` |
| 等级/阶级变动 | 仅卡面 | 怪 338 / 魔 69 / 陷 32 | 新增 action |
| 属性/种族/种类变更 | 仅卡面 | 怪 150 / 魔 50 / 陷 33 | 新增 action |
| 弹回/除外区回收 | 部分 | 魔 193 / 陷 26 | 扩展 `zone` |
| 解放(作为效果) | 仅代价 | 怪 40 / 魔 13 / 陷 7 | 新增 action |
| 效果弃手 | 仅代价 | 怪 149 / 魔 76 / 陷 42 | 新增 action |
| 穿透/追加攻击/直接攻击 | 仅文本 | 怪 ~390 / 魔 ~80 / 陷 ~30 | 新增 battle action |
| 战斗/效果伤害改写 | 无 | 怪 ~200 / 魔 ~50 / 陷 ~80 | 新增 action |
| 跳过阶段 | 无 | 怪 43 / 魔 19 / 陷 22 | 新增 restriction |
| 追加召唤次数 | 无 | 怪 75 / 魔 22 | 新增 restriction |
| 宣言 | 无 | 怪 102 / 魔 40 / 陷 35 | 新增 action |
| 掷硬币/骰子 | 无 | 怪 139 / 魔 19 / 陷 15 | 新增 action + 分支 |
| 延迟处理 | 无 | 怪 30 / 魔 20 | 新增 followup |
| 分支选择 >2 | 仅二元 | 魔 127+334 / 陷 73+219 | 扩展 `choice_*` 为 N 分支 |
| 盖放 | 无 | 魔 123 / 陷 147 | 新增 action |
| 反转效果 `flip` | 无 | 怪 193 | 新增 effectType |
| 装备状态效果 `equip_state` | 无 | 怪 178 / 魔 216 / 陷 62 | 新增 effectType |
| 必发诱发 `trigger_mandatory` | 隐式 | 怪 1363 / 魔 202 / 陷 136 | 暴露为 effectType |
| 自身除外/送墓/回卡组代价 | 无 | 魔 219+27+2 | 扩展 cost |
| 效果外文本 OATH/不可无效 | 无 | 魔法 278+10 | 扩展 ruleTexts |

### P2（低频或有替代）

| 能力名 | 缺失点 | 影响量级(files) | 建议 |
|---|---|---|---|
| 反击必发 `quick_mandatory` | 无 | 怪 15 | 扩展 effectType |
| 装备限制 `equip_limit` | 无 | 怪 135 / 魔 50 / 陷 60 | 参数 |
| 同盟 `union` | 无 | 怪 40 | action |
| 卡组顶排序/放置 | 无 | 怪 ~50 / 魔 14 / 陷 8 | action |
| 换位/区域封锁 | 无 | 魔 30+11 / 陷 11 | action |
| 灵摆置于摆区 | 无 | 怪 147 | action |
| 灵摆刻度变更 | 无 | 怪 19 | action |
| 规则改写(抽卡/手牌上限) | 无 | 陷 4+1 | ruleText |
| 胜利条件 | 无 | 陷 5 | action |
| 卡名/字段变更(效果层) | 仅 alias | 怪 146 / 魔 17 / 陷 14 | action |
| 素材替代/额外素材 | 无 | 怪 12+18+10 | ruleText |
| 多重调整/非调整/超量等级 | 无 | 怪 26+14+17 | ruleText |
| 场地唯一 | 无 | 魔 34 | ruleText |
| 指示物许可 | 无 | 魔 54+63 | action |
| 组合代价 `cost_and` | 无 | 魔 5 | 参数 |
| 攻击代价 / 攻守减半 / 伤害翻倍 | 无 | 怪 ~100 | action |
| 客户提示 / 全局标记 | 无 | 怪 1036+90 | 内部机制 |

---

## 6. 建议实现路线（分批）

> 覆盖估算基于「该批补齐后，可覆盖原有效果块的比例」；效果块基数 = 怪兽 22,860 + 魔法 6,765 + 陷阱约 4,000 ≈ 33,600。

- **第 1 批（P0 骨架，覆盖约 55%）**
  1. `reset`（持续时长）作为全局参数——影响几乎所有一次性/常驻效果。
  2. `valueSource` 维度——解开 `atk_boost` / `burn_damage` / `gain_lp` 的固定值限制。
  3. `to_deck` / `to_extra` / `send_to_grave`(action) / `special_summon_banished`——补齐移动矩阵。
  4. `token_summon` + `tokenSpec`。
  5. `hintTiming` 位掩码 + 多段 `segments`(BreakEffect) + `params`(SetLabel) ——复合成型骨架。
  6. `activate` 作为独立 effectType，生成「发动本体 + 常驻」双层结构。

- **第 2 批（P0 攻防与抗性，累计约 75%）**
  7. `lock_special_summon` / `lock_cannot_activate`（效果层封锁，含 `SetTargetRange`）。
  8. `indestructible_*` / `immune_by_source` 扩展。
  9. `disable_effect` 挂载 + `negate_effect` / `negate_summon`。
  10. `atk_set` / `def_change` 与负值、`atk_change` 的 mode。

- **第 3 批（P1 通用，累计约 90%）**
  11. 控制权/表示形式/等级/属性/种族/种类变更。
  12. 装备（手续 + 状态 + 限制）与场地 / 永续常驻模板。
  13. 指示物、宣言、掷硬币骰子、分支 N 选 1。
  14. 破坏替代 / 离场改写 / 不可取对象。
  15. 战斗类（穿透、追加攻击、伤害改写、无效攻击）。

- **第 4 批（P1/P2 收尾，累计约 97%）**
  16. 效果赋予、延迟处理、连锁封锁、持续目标锁定。
  17. 陷阱专属：盖放限制、手牌发动、陷阱怪兽、反击模板。
  18. 灵摆效果层、素材替代、规则改写、胜利条件。
  19. ruleTexts 缺口（OATH、不可无效、额外素材、场地唯一等）。

---

## 7. 口径冲突与待人工确认

1. **`Ritual.AddWholeLevelTribute` / `Ritual.AddProc*` 归属**：怪兽报告称存在 `Ritual.AddWholeLevelTribute`（10 次）与
   `Ritual.CreateProc`；魔法报告称 `AddWholeLevelTribute` 与 `Fusion.AddProc*`「本语料 0」，其功能由 `RITPROC_*` 参数承担。
   **待确认**：可能因两者扫描范围/正则不同（怪兽统计 `Ritual.*` 全量，魔法只在其 2843 文件内）。建议以「两套写法并存」实现，不删任何一种。

2. **`Fusion.AddProcMix` 的卡种分布**：怪兽报告计 357（`AddProcMix`）+153（`AddProcMixN`），魔法报告称 `Fusion.AddProcMix*` 为 0、
   魔法侧用 `Fusion.CreateSummonEff`（86）。**待确认**：这可能是真实的「怪兽自身手续 vs 魔法卡执行融合」分工，而非统计错误。建议设计器两个 API 都支持。

3. **`Duel.RemoveCounter` vs `Card:RemoveCounter`**：怪兽报告显示 card 方法 `RemoveCounter` 86 文件、`Duel.RemoveCounter` 33 文件；
   魔法报告称 `Duel.RemoveCounter` 19 文件。**待确认**：是否将「指示物取除」统一生成 card 方法，`Duel.` 版仅在需要按玩家统计时使用。

4. **「必发/可选」的表示层级**：怪兽把 `TRIGGER_F`/`TRIGGER_O` 作为 effectType 原子，设计器则用 `triggerType=mandatory/optional` 属性。
   **待确认**：是新增独立 effectType，还是扩展现有属性枚举（推荐后者，改动小）。

5. **「卡的发动」是否新增 effectType**：设计器现用 `timing=spell_trap_act` 承担。
   **待确认**：魔陷「发动本体 + 常驻」是结构性差异，仅靠 timing 难以准确生成双层脚本；建议新增 `activate` effectType。需产品确认是否接受一次破坏性重构。

6. **`immune_all` 的语义边界**：现有 `immune_all` 只生成 `EFFECT_IMMUNE_EFFECT`（不受效果影响），
   但陷阱报告指出它与「不被破坏」是两回事。**待确认**：是否把 `immune_all` 拆为 `immune_effect` 与 `indestructible` 两个 action（推荐拆，但影响既有存档兼容）。

7. **数字口径**：需求示例中「怪兽 3161」为出现次数，本文统一改为文件数 1521。
   **待确认**：UI 上呈现实例数还是文件数？建议 UI 用文件数（「多少张卡」），文档保留双数字。

8. **`target` 维度的本质**：三份报告均显示「取对象」是 `EFFECT_FLAG_CARD_TARGET`+`SelectTarget` 的产物，
   而非独立语义。**待确认**：设计器应把 `target` 保留为「目标选择配置」还是并入 `action` 的自动推导（推荐保留但扩展）。

9. **覆盖「低频但真实」的常量**：如 `EFFECT_CANNOT_DISABLE_SUMMON`（5）、`EFFECT_SEND_REPLACE`（3）、
   `EFFECT_LIGHT_OF_INTERVENTION`（2）。**待确认**：是否全部入库（P2）还是仅以 `customRule` 兜底。

10. **速攻魔法识别**：魔法报告指出脚本层无法区分通常/速攻（均 `EFFECT_TYPE_ACTIVATE`），需结合卡数据 `TYPE_QUICKPLAY`。
    **待确认**：设计器 `effectType=quick` 与卡数据 `TYPE_QUICKPLAY` 的联动规则。

---

*文档结束。机器可读版本见同目录 `effect-capabilities.json`。*

