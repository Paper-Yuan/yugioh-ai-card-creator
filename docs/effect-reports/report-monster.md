# 怪兽卡效果能力汇总

## 1. 概要

- **数据来源**：`E:/tmp/ygocorpus/split/monster.txt` 列出的官方怪兽卡 Lua 脚本清单。
- **扫描规模**：清单 8552 个文件，成功读取 8552 个（失败 0），合计 554,344 行、约 20.4 MB。
- **方法**：自写 Node 脚本 `E:/tmp/ygocorpus/extract-monster.js` 一次性批量正则统计，输出 `E:/tmp/ygocorpus/raw-monster.json`。统计口径为「出现频次 count」与「命中文件数 fileCount」两维：
  - `count` = 源码中该 token 出现次数；
  - `fileCount` = 至少出现一次该 token 的 lua 文件数（更接近「有多少张卡具备该能力」）。
  - 对 `SetType/SetCode/SetProperty/SetReset/SetCountLimit/SetTargetRange/SelectMatchingCard/SelectReleaseGroup/SelectUnselectGroup` 等的 **参数组合做了归一化**（数字统一成 `N`，十六进制小写）后再统计。
- **效果实体规模**：`Effect.CreateEffect(` 共 **22,860** 次，分布在 **8,456** 个文件中（另有 166 个文件用 `Duel.CreateEffect`/`aux` 封装）。
- **类别常量规模**：32 种 `CATEGORY_*`，合计出现 **26,827** 次；`CATEGORY_SPECIAL_SUMMON` 出现在 3581 个文件中，是最普遍的能力。
- **抽样核对**：对频次最高的约 25 类能力各取 1 个短脚本（60~200 行）Read 全文核对，文件清单见第 5 节。
- **重要口径说明**：本语料只含**怪兽卡**脚本；因此纯魔法/陷阱卡的机制（如通常陷阱的发动条件模板）不在统计内，但怪兽作为「效果的来源/载体」可以具备几乎所有效果类型。

---

## 2. 效果性质分布

### 2.1 统计口径

Lua 中效果性质由 `SetType()` 的第一个（同时也是唯一组合的）`EFFECT_TYPE_*` 原子决定。一个效果可同时含 `EFFECT_TYPE_SINGLE/FIELD`（作用载体）与一个「性质原子」（`IGNITION/TRIGGER_O/TRIGGER_F/QUICK_O/QUICK_F/CONTINUOUS/FLIP/EQUIP/GRANT`）。

- 效果实体总数（分母）：`Effect.CreateEffect` 计数 = **22,860**。
- 性质原子合计 = 13,902（占 60.8%）。其余约 39% 的 `CreateEffect` 是 `SINGLE`/`FIELD` 载体的纯常驻效果（`EFFECT_TYPE_SINGLE`/`EFFECT_TYPE_FIELD` 单独使用，无性质原子，本质是 continuous）。
- `EFFECT_TYPE_SINGLE` 单独出现 6,239 次 / 4138 文件；`EFFECT_TYPE_FIELD` 单独出现 2,804 次 / 2386 文件。

### 2.2 分布

| 性质 | 性质原子出现次数 | 占性质原子比例 | 命中文件数 |
|---|---|---|---|
| trigger（诱发即时/O） | 5,037（TRIGGER_O） | 36.2% | 4,130 |
| ignition（起动） | 3,827 | 27.5% | 3,342 |
| continuous（常驻，含纯 SINGLE/FIELD） | 1,575 + 约 9,000 纯常驻 | 11.3%（原子口径） | 1,308（显式 CONTINUOUS）/ 6591（SINGLE）/ 4138（FIELD） |
| quick（2速诱发即时） | 1,527（QUICK_O 1512 + QUICK_F 15） | 11.0% | 1,451 |
| trigger（强制诱发/F） | 1,503（TRIGGER_F） | 10.8% | 1,363 |
| flip（反转） | 193 | 1.4% | 193 |
| equip（装备） | 227 | 1.6% | 178 |
| grant（赋予他人效果） | 13 | 0.1% | 13 |
| procedure（召唤手续） | 不计入 CreateEffect 原子，见下 | — | 3,538 |

**procedure（召唤手续）单独口径**：以 `*AddProcedure / AddProcMix / AddContactProc / EFFECT_SPSUMMON_PROC / AddNormalSummonProcedure / c:EnableReviveLimit()` 计，命中 **3,538** 个文件；其中 `EnableReviveLimit` 2,622 文件。按召唤法：Fusion 638、Xyz 635、Synchro 559、Link 492、Pendulum 392、Ritual 31。这些属于「非效果/手续」性质，设计器中的 `procSummonType` 已部分覆盖。

**结论**：怪兽效果里 **诱发类(trigger+quick) 约占 47%**，**起动类 27.5%**，常驻类次之；反转/装备/赋予属于小众但确实存在。

---

## 3. 能力清单

下列每条的「命中文件数」均来自脚本统计（fileCount），频次为 count。

### 3.1 调度与检索（搜索 / 堆墓 / 回收）

#### 检索卡组到加入手卡（search）
- **lua 实现特征**：`CATEGORY_TOHAND+CATEGORY_SEARCH`；触发点常为 `EVENT_SPSUMMON_SUCCESS/EVENT_SUMMON_SUCCESS`；操作 `Duel.SelectMatchingCard(...):GetFirst()` → `Duel.SendtoHand(g,nil,REASON_EFFECT)` → `Duel.ConfirmCards(1-tp,g)`。
```lua
e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
e1:SetCode(EVENT_SPSUMMON_SUCCESS)
...
Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,1,nil)
Duel.SendtoHand(g,nil,REASON_EFFECT) Duel.ConfirmCards(1-tp,g)
```
- **命中**：`CATEGORY_SEARCH` 1196、`CATEGORY_TOHAND` 4011；`SetCategory` 组合 `CATEGORY_TOHAND+CATEGORY_SEARCH` 849。`Duel.SendtoHand` 2043/1878。
- **自定义参数**：数量 `count`（1~N，默认1）、来源区 `from`（DECK/EXTRA/GRAVE/REMOVE，多选）、筛选 `filter`（种族/属性/等级/攻守/字段 Setcode）、是否翻卡确认 `confirm`、是否同时允许「送墓或特召」分支（见 aux.ToHandOrElse）。
- **设计器覆盖**：已支持 `search_deck` / `salvage_extra`（部分支持：数量、字段可调；来源区与「加入手卡/送墓/特召」三分支需扩展）。

#### 卡组送墓 / 卡组顶堆积（mill / dump / deckdes）
- **lua 实现特征**：`CATEGORY_DECKDES` 或 `CATEGORY_TOGRAVE` + `Duel.DiscardDeck(tp,n,reason)` / `Duel.SendtoGrave`。
```lua
if chk==0 then return Duel.IsPlayerCanDiscardDeck(tp,1) end
Duel.DiscardDeck(tp,1,REASON_EFFECT)
```
- **命中**：`CATEGORY_DECKDES` 201；`Duel.DiscardDeck` 115/97；`IsPlayerCanDiscardDeck` 113/69。
- **自定义参数**：数量 `count`、来源归属 `who`（self/oppo）、`from_top`/`bottom`、是否可选。
- **设计器覆盖**：已支持 `dump_deck`、`mill_deck_n`（cost）。

#### 卡组翻开/确认顶牌（excavate / confirm）
- **lua 实现特征**：`Duel.ConfirmDecktop(tp,n)` + `Duel.GetDecktopGroup` + `Duel.DisableShuffleCheck()`（可选把余卡送墓/洗回）+ `REASON_EXCAVATE`。
- **命中**：`Duel.ConfirmDecktop` 111/98；`GetDecktopGroup` 142/112；`DisableShuffleCheck` 91/85；`REASON_EXCAVATE` 47/33。
- **自定义参数**：翻数 `count`、命中后去向 `on_hit`（手卡/特召/除外）、未命中去向 `on_miss`（墓地/卡组顶/洗回）、是否洗牌。
- **设计器覆盖**：未支持。

#### 墓地/除外区回收（salvage）
- **lua 实现特征**：`Duel.SendtoHand(g,nil,REASON_EFFECT)` 目标来自 `LOCATION_GRAVE|LOCATION_REMOVED`；常配 `CATEGORY_TOHAND`。
- **命中**：`CATEGORY_TOHAND` 4011/1891（其中相当部分为回收）。
- **自定义参数**：数量、来源区、筛选、是否给对手确认。
- **设计器覆盖**：部分支持（`search_deck`/`salvage_extra` 的筛选可复用）。

#### 检索/回收类通用「卡组顶 or 底」「回到卡组」（return to deck）
- **lua 实现特征**：`CATEGORY_TODECK` + `Duel.SendtoDeck(g,nil,SEQ_DECKTOP|SEQ_DECKBOTTOM|SEQ_DECKSHUFFLE,REASON_EFFECT)`。
- **命中**：`CATEGORY_TODECK` 789/394；`Duel.SendtoDeck` 538/497；`Duel.MoveToDeckBottom` 23、`MoveToDeckTop` 6。
- **自定义参数**：目标区（手卡/场上/墓地/除外）、去向位置 `seq`（顶/底/洗牌）、数量、归属。
- **设计器覆盖**：未支持（仅有 banish / to grave 等）。

### 3.2 特殊召唤

#### 从手卡/卡组/墓地/除外/额外特召（special summon）
- **lua 实现特征**：`CATEGORY_SPECIAL_SUMMON` + `Duel.SpecialSummon` / `SpecialSummonStep`+`SpecialSummonComplete`（多体同时）；筛选 `c:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP)`；先查 `Duel.GetLocationCount(tp,LOCATION_MZONE)>0`。
```lua
e:SetCategory(CATEGORY_SPECIAL_SUMMON)
if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
  and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_GRAVE,0,1,nil,e,tp) end
Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,1,0,0)
Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)
```
- **命中**：`CATEGORY_SPECIAL_SUMMON` 8068（3581 文件，全卡类第一）；`Duel.SpecialSummon` 3597/3183；`SpecialSummonStep` 447/401。
- **自定义参数**：召唤来源区 `from`、数量、归属 `who`、目标表示形式 `pos`、`sumtype/type`（如 `SUMMON_TYPE_SPECIAL` 自定标记）、是否 `forced`、是否算作正规召唤（`CompleteProcedure`）、位置是否要求额外怪兽区。
- **设计器覆盖**：已支持 `special_summon_self/hand/deck`、`revive_grave`（来源区基本覆盖；「除外区特召」「额外区特召」「指定区域」为部分支持）。

#### 自身从手卡/墓地/除外特召（self SS / revive）
- **lua 实现特征**：`EFFECT_SPSUMMON_PROC`（手续类）或 `SetRange(LOCATION_HAND/LOCATION_GRAVE)` + `EVENT_*` 触发。
- **命中**：`EFFECT_SPSUMMON_PROC` 636/635；`EFFECT_SPSUMMON_CONDITION` 504/504（常配合 `EFFECT_FLAG_UNCOPYABLE`、`aux.FALSE` 禁用）。
- **自定义参数**：触发来源、来源区、是否只能自身、是否忽略召唤条件。
- **设计器覆盖**：已支持 `special_summon_self`、`procSummonType`。

#### 衍生物生成（token）
- **lua 实现特征**：`CATEGORY_TOKEN+CATEGORY_SPECIAL_SUMMON`；`Duel.IsPlayerCanSpecialSummonMonster(tp,id,SET,TYPES_TOKEN,atk,def,lv,race,attr)` → `Duel.CreateToken(tp,code)` → `Duel.SpecialSummonStep` → `Duel.SpecialSummonComplete()`。
```lua
if chk==0 then return Duel.IsPlayerCanSpecialSummonMonster(tp,id+1,SET_SKYBLASTER,TYPES_TOKEN,500,500,4,RACE_FIEND,ATTRIBUTE_DARK) end
local token=Duel.CreateToken(tp,id+1)
Duel.SpecialSummonStep(token,0,tp,tp,false,false,POS_FACEUP)
```
- **命中**：`CATEGORY_TOKEN` 278/137；`Duel.CreateToken` 152/139；`TYPES_TOKEN`。
- **自定义参数**：token 数量 `count`、攻 `atk`、守 `def`、等级 `level`、种族 `race`、属性 `attr`、表示形式 `pos`、是否可循环生成（SelectYesNo 循环）。
- **设计器覆盖**：未支持（重要缺口）。

#### 融合/同调/超量/连接/仪式/灵摆召唤（procedure）
- **lua 实现特征**：
  - 融合 `Fusion.AddProcMix / AddProcMixN / AddContactProc / SummonEffTG/OP`；
  - 同调 `Synchro.AddProcedure + Synchro.NonTuner(Ex)`；
  - 超量 `Xyz.AddProcedure`（+ `Xyz.InfiniteMats`）；
  - 连接 `Link.AddProcedure`；
  - 灵摆 `Pendulum.AddProcedure`；
  - 仪式 `Ritual.CreateProc / AddWholeLevelTribute / Target / Operation`。
- **命中**：`Xyz.AddProcedure` 594、`Synchro.AddProcedure` 527、`Link.AddProcedure` 463、`Pendulum.AddProcedure` 390、`Fusion.AddProcMix` 357、`Fusion.AddProcMixN` 153、`Synchro.NonTuner` 364、`Fusion.AddContactProc` 68、`Ritual.AddWholeLevelTribute` 10、`Ritual.CreateProc`。
- **自定义参数**：召唤法 `summon_type`、素材数量上下限 `min/max`、素材筛选（种族/属性/等级/字段）、是否可用额外卡组/手卡/场上素材、接触融合标记、素材替代。
- **设计器覆盖**：部分支持（`procSummonType`、`materialRestriction`；素材筛选细节未支持）。

### 3.3 除去与移动

#### 破坏（destroy）
- **lua 实现特征**：`CATEGORY_DESTROY` + `Duel.Destroy(g,REASON_EFFECT)`；单体常配 `EFFECT_FLAG_CARD_TARGET` + `Duel.SelectTarget` → `GetFirstTarget`；群体配 `Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_MZONE,nil)`。
```lua
Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
Duel.Destroy(g,REASON_EFFECT)
```
- **命中**：`CATEGORY_DESTROY` 3161/1521；`Duel.Destroy` 1855/1691。
- **自定义参数**：数量 `count`、对象归属 `who`（self/oppo/both）、对象区域 `zone`（MONSTER/SPELLTRAP/ONFIELD）、筛选、是否取对象 `targeted`。
- **设计器覆盖**：已支持 `destroy_target`、`destroy_self_all`、`wipe_oppo_*`。

#### 除外 / 送墓 / 回手 / 回卡组（remove / to grave / bounce / to deck）
- **lua 实现特征**：`CATEGORY_REMOVE`+`Duel.Remove(g,POS_FACEUP,REASON_EFFECT)`；`CATEGORY_TOGRAVE`+`Duel.SendtoGrave`；`CATEGORY_TOHAND`+`Duel.SendtoHand`；`CATEGORY_TODECK`+`Duel.SendtoDeck`。
```lua
if chk==0 then return Duel.IsExistingMatchingCard(Card.IsAbleToRemove,tp,0,LOCATION_ONFIELD,1,nil) end
Duel.Remove(g,POS_FACEUP,REASON_EFFECT)
```
- **命中**：`CATEGORY_REMOVE` 980/474、`Duel.Remove` 1058/943；`CATEGORY_TOGRAVE` 980/499、`Duel.SendtoGrave` 1265/1159；`CATEGORY_TOHAND` 4011、`Duel.SendtoHand` 2043；`CATEGORY_TODECK` 789、`Duel.SendtoDeck` 538。
- **自定义参数**：去往地 `destination`（除外/墓地/手卡/卡组/额外卡组/场上/装备区）、数量、对象归属、除外表示形式 `pos`（表侧/里侧）、`reason`（效果/战斗/代价）。
- **设计器覆盖**：已支持 `banish_target`、`to_hand_target`（部分支持：里侧除外、去额外卡组等未支持）。

#### 解放 / 送去墓地（作为代价的字段操作）
- **lua 实现特征**：`Duel.Release(g,REASON_COST)` / `Duel.CheckReleaseGroupCost` / `Duel.SelectReleaseGroupCost`；代价类常用 `Cost.SelfTribute`。
- **命中**：`CATEGORY_RELEASE` 66/40；`Duel.Release` 516/503；`SelectReleaseGroupCost` 300/292；`CheckReleaseGroupCost` 303/294；`Cost.SelfTribute` 279/277。
- **自定义参数**：解放数量、解放来源区（手卡/场上/双方）、筛选、是否作为召唤手续。
- **设计器覆盖**：部分支持（`release_self`、`release_monster_n`）。

#### 卡组/手卡破坏与弃牌（handes / discard）
- **lua 实现特征**：`CATEGORY_HANDES` + `Duel.DiscardHand(tp,filter,...)`；随机弃牌用 `Duel.DiscardHand(1-tp,aux.TRUE,n,hopt,reason)`。
- **命中**：`CATEGORY_HANDES` 286/149；`Duel.DiscardHand` 388/378；`Duel.ShuffleHand` 318/291。
- **自定义参数**：弃牌数量、归属（对手/自己）、是否随机、筛选（卡类）。
- **设计器覆盖**：部分支持（`discard_one`/`discard_n` 作为代价；作为效果本体让对手随机弃牌未支持）。

### 3.4 数值变动（攻守 / 等级 / 属性 / 种族 / 种类）

#### 攻击力/守备力变动（ATK/DEF change）
- **lua 实现特征**：常驻用 `EFFECT_UPDATE_ATTACK` / `EFFECT_UPDATE_DEFENSE`（增量，值可为负）+ `EFFECT_FLAG_SINGLE_RANGE`+`SetRange(LOCATION_MZONE)`；覆盖式用 `EFFECT_SET_ATTACK` / `EFFECT_SET_ATTACK_FINAL` / `EFFECT_SET_BASE_ATTACK`；一次性用 `Effect.CreateEffect(c)` + `SetReset(RESET_EVENT|RESETS_STANDARD)`。
```lua
e1:SetType(EFFECT_TYPE_SINGLE) e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
e1:SetCode(EFFECT_UPDATE_ATTACK) e1:SetRange(LOCATION_MZONE)
e1:SetValue(e:GetLabel()) e1:SetReset(RESET_EVENT|RESETS_STANDARD_DISABLE)
```
- **命中**：`CATEGORY_ATKCHANGE` 900/768、`CATEGORY_DEFCHANGE` 112/99；`EFFECT_UPDATE_ATTACK` 1372/1319、`EFFECT_UPDATE_DEFENSE` 303/292、`EFFECT_SET_ATTACK_FINAL` 262、`EFFECT_SET_ATTACK` 74、`EFFECT_SET_BASE_ATTACK` 81。
- **自定义参数**：数值 `delta`（可负）、模式 `mode`（update/set/base/final）、对象归属与筛选、是否永续 `permanent`、重置时机 `reset`、数值来源 `value_source`（固定值/其余卡攻守/等级×N/墓地数量×N/自身素材数×N 等）。
- **设计器覆盖**：已支持 `atk_boost`（仅固定增量；模式与数值来源未支持）。

#### 等级/阶级/连接刻度变动（level / rank / link change）
- **lua 实现特征**：`EFFECT_UPDATE_LEVEL` / `EFFECT_CHANGE_LEVEL` / `EFFECT_SET_LEVEL`；超量 `EFFECT_XYZ_LEVEL`；值可能含 `-lv` 或 `c:GetLevel()`。
```lua
e1:SetCode(EFFECT_UPDATE_LEVEL) e1:SetValue(-lv)
```
- **命中**：`CATEGORY_LVCHANGE` 184/129；`EFFECT_UPDATE_LEVEL` 188/180、`EFFECT_CHANGE_LEVEL` 165/158、`EFFECT_XYZ_LEVEL` 17/16；`Duel.AnnounceLevel` 21/21（「降低1或2」用 `AnnounceLevel(tp,1,2)`）。
- **自定义参数**：变动值 `delta`、模式、对象、持续时间、可选值集合（如 1 或 2）。
- **设计器覆盖**：ruleLevel 只能改卡面等级，动态变等级未支持。

#### 属性 / 种族 / 种类变更与追加
- **lua 实现特征**：`EFFECT_CHANGE_ATTRIBUTE` / `EFFECT_CHANGE_RACE` / `EFFECT_CHANGE_TYPE`（替换）；`EFFECT_ADD_ATTRIBUTE` / `EFFECT_ADD_RACE` / `EFFECT_ADD_TYPE`（追加）；常驻 + `SetTargetRange`。
- **命中**：`EFFECT_CHANGE_ATTRIBUTE` 59/58、`EFFECT_CHANGE_RACE` 36/34、`EFFECT_CHANGE_TYPE` 51/49、`EFFECT_ADD_TYPE` 106/105、`EFFECT_ADD_ATTRIBUTE` 18/18、`EFFECT_ADD_RACE` 1。
- **自定义参数**：变更种类 `what`（attribute/race/type）、目标值、模式 `change|add`、作用对象。
- **设计器覆盖**：部分支持（`ruleAttribute`/`ruleRace`/`addMonsterType` 仅卡面/常驻简单场景）。

#### 卡名 / 卡号 / 字段变更（name & code change）
- **lua 实现特征**：`EFFECT_CHANGE_CODE`（视为同名）/ `EFFECT_ADD_SETCODE`（追加字段）与 `s.listed_names`、`s.listed_series` 声明。
- **命中**：`EFFECT_CHANGE_CODE` 141/140、`EFFECT_ADD_CODE` 6、`EFFECT_ADD_SETCODE` 5；`s.listed_names`/`s.listed_series` 普遍存在。
- **自定义参数**：目标卡号/卡名、追加字段 setcode、作用对象、是否含自身。
- **设计器覆盖**：未支持（`alias(ADD_CODE)` 仅外文本别名）。

### 3.5 战斗相关

#### 直接攻击 / 连续攻击 / 攻击所有怪兽
- **lua 实现特征**：`EFFECT_DIRECT_ATTACK`；`EFFECT_EXTRA_ATTACK`（可 `SetValue(n)`）；`EFFECT_ATTACK_ALL`（`SetValue(1)`）；`EFFECT_EXTRA_ATTACK_MONSTER`。
- **命中**：`EFFECT_DIRECT_ATTACK` 163/163；`EFFECT_EXTRA_ATTACK` 131/131；`EFFECT_ATTACK_ALL` 38/38；`EFFECT_EXTRA_ATTACK_MONSTER` 42/41。
- **自定义参数**：额外攻击次数 `n`、是否含直接攻击、允许攻击目标条件。
- **设计器覆盖**：已支持 `canDirectAttack`（规则文本）；攻击次数未支持。

#### 贯穿伤害（pierce）
- **lua 实现特征**：`EFFECT_PIERCE`，常配 `SetValue(1)`。
- **命中**：`EFFECT_PIERCE` 158/157。
- **自定义参数**：是否贯穿、穿透伤害倍率。
- **设计器覆盖**：未支持。

#### 战破后处理 / 战斗时点
- **lua 实现特征**：`EVENT_BATTLE_DESTROYING`（战破对手时点）、`EVENT_BATTLE_DESTROYED`、`EVENT_BATTLED`、`EVENT_BE_BATTLE_TARGET`、`EVENT_PRE_DAMAGE_CALCULATE`、`EVENT_DAMAGE_STEP_END`、`Duel.GetAttackTarget / GetBattleTarget / GetAttacker`。
- **命中**：`EVENT_BATTLE_DESTROYING` 281/277、`EVENT_BATTLE_DESTROYED` 277/277、`EVENT_BATTLED` 123/121、`EVENT_BE_BATTLE_TARGET` 116/115、`EVENT_PRE_DAMAGE_CALCULATE` 94/94、`EVENT_DAMAGE_STEP_END` 112/107；`Duel.GetAttacker` 758/537、`GetAttackTarget` 593/428。
- **自定义参数**：时点选择、是否限定由战斗破坏、参照方（攻击方/被攻击方）。
- **设计器覆盖**：已支持 `battle_destroy_oppo`、`destroyed_battle_or_effect` 等。

#### 战斗伤害变动 / 反射 / 无效战斗伤害
- **lua 实现特征**：`EFFECT_CHANGE_BATTLE_DAMAGE` / `EFFECT_AVOID_BATTLE_DAMAGE` / `EFFECT_NO_BATTLE_DAMAGE` / `EFFECT_REFLECT_BATTLE_DAMAGE`；`aux.ChangeBattleDamage(1,DOUBLE_DAMAGE)`。
- **命中**：`EFFECT_CHANGE_BATTLE_DAMAGE` 62/62、`EFFECT_AVOID_BATTLE_DAMAGE` 95/95、`EFFECT_NO_BATTLE_DAMAGE` 17/17、`EFFECT_REFLECT_BATTLE_DAMAGE` 23/23；`aux.ChangeBattleDamage` 39/39。
- **自定义参数**：倍率/半减/归零、是否反射、反射归属。
- **设计器覆盖**：未支持。

#### 攻击限制（不能攻击 / 必须攻击 / 不能成为攻击对象）
- **lua 实现特征**：`EFFECT_CANNOT_ATTACK` / `EFFECT_CANNOT_ATTACK_ANNOUNCE` / `EFFECT_MUST_ATTACK` / `EFFECT_MUST_ATTACK_MONSTER` / `EFFECT_CANNOT_DIRECT_ATTACK` / `EFFECT_CANNOT_SELECT_BATTLE_TARGET` / `EFFECT_CANNOT_BE_BATTLE_TARGET` / `EFFECT_IGNORE_BATTLE_TARGET`。
- **命中**：`EFFECT_CANNOT_ATTACK` 212/208、`EFFECT_CANNOT_ATTACK_ANNOUNCE` 63/63、`EFFECT_MUST_ATTACK` 36/36、`EFFECT_MUST_ATTACK_MONSTER` 19/19、`EFFECT_CANNOT_DIRECT_ATTACK` 63/62、`EFFECT_CANNOT_BE_BATTLE_TARGET` 55/55、`EFFECT_CANNOT_SELECT_BATTLE_TARGET` 94/93。
- **自定义参数**：限制类型、作用对象、条件。
- **设计器覆盖**：部分支持（`cannotAttack`、`cannotBeAttacked`）。

#### 伤害步骤相关保护（战斗破坏抗性/追加战斗阶段）
- **说明**：以 `EFFECT_FLAG_DAMAGE_STEP` / `EFFECT_FLAG_DAMAGE_CAL` 控制可在伤害步骤发动，命中 `EFFECT_FLAG_DAMAGE_STEP` 1206/1131、`EFFECT_FLAG_DAMAGE_CAL` 287/282。
- **自定义参数**：是否可在伤害步骤发动、是否可在伤害计算时发动。
- **设计器覆盖**：部分支持（`quick_chain` 等不含伤害步骤细分）。

### 3.6 控制权与表示形式

#### 控制权变更（change control）
- **lua 实现特征**：`CATEGORY_CONTROL` + `EFFECT_SET_CONTROL`（`SetValue(tp)`）；永久夺取或回合结束归还（示例 c10000080 用 `EVENT_PHASE+PHASE_END` 归还）。
- **命中**：`CATEGORY_CONTROL` 235/119；`EFFECT_SET_CONTROL` 17/17；`Duel.GetControl` 105/104；`HINTMSG_CONTROL` 89/84。
- **自定义参数**：新控制者 `to`（self/oppo/player）、持续 `duration`（永久/回合结束/阶段结束）、对象筛选、是否只能由对手控制。
- **设计器覆盖**：未支持。

#### 表示形式变更（change position）
- **lua 实现特征**：`CATEGORY_POSITION` + `Duel.ChangePosition(g,POS_FACEUP_DEFENSE|POS_FACEUP_ATTACK|POS_FACEDOWN_DEFENSE|POS_FACEDOWN_ATTACK)`；取对象用 `SelectTarget`，常驻强制用 `EFFECT_SET_POSITION`+`SetTargetRange`。
- **命中**：`CATEGORY_POSITION` 592/295；`Duel.ChangePosition` 382/346；`EFFECT_SET_POSITION` 9/9；`HINTMSG_POSCHANGE` 111/102。
- **自定义参数**：目标表示形式 `pos`、数量、归属、是否强制（常驻）、是否里侧。
- **设计器覆盖**：部分支持（规则文本 `cannotChangePosition`；主动变形式未支持）。

### 3.7 卡组/手卡/墓地/除外区操作（其他）

#### 抽卡（draw）
- **lua 实现特征**：`CATEGORY_DRAW` + `Duel.Draw(tp,n,REASON_EFFECT)`；判断 `Duel.IsPlayerCanDraw(tp,n)`。
- **命中**：`CATEGORY_DRAW` 842/424；`Duel.Draw` 465/430；`IsPlayerCanDraw` 338/297。
- **自定义参数**：抽数 `count`、归属 `who`（自己/对手/双方）、是否作为代价。
- **设计器覆盖**：已支持 `draw_cards`。

#### LP 回复 / 伤害（burn）
- **lua 实现特征**：`CATEGORY_RECOVER`+`Duel.Recover(p,n,REASON_EFFECT)`；`CATEGORY_DAMAGE`+`Duel.Damage(p,n,REASON_EFFECT)`；常配 `Duel.SetTargetPlayer(1-tp)` + `CHAININFO_TARGET_PLAYER`。
```lua
Duel.SetTargetPlayer(1-tp)
Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,ct*300)
Duel.Damage(p,ct*300,REASON_EFFECT)
```
- **命中**：`CATEGORY_DAMAGE` 1005/493、`CATEGORY_RECOVER` 252/134；`Duel.Damage` 581/527、`Duel.Recover` 149/140；`Duel.GetLP` 179/106、`Duel.PayLPCost` 70/69、`Duel.SetLP` 32/30。
- **自定义参数**：数值 `amount`（或倍率）、对象 `who`、数值来源 `value_source`（固定/墓地数量×N/场上门数×N/自身攻守）。
- **设计器覆盖**：已支持 `burn_damage`、`gain_lp`。

#### 手卡/卡组洗切与排序
- **lua 实现特征**：`Duel.ShuffleHand(tp)` / `Duel.ShuffleDeck(tp)` / `Duel.ShuffleExtra` / `Duel.SortDecktop` / `Duel.SortDeckbottom` / `Duel.MoveToDeckTop/Bottom`。
- **命中**：`ShuffleHand` 318/291、`ShuffleDeck` 128/124、`ShuffleExtra` 26/23、`SortDeckbottom` 38/30、`SortDecktop` 24/22、`MoveToDeckBottom` 23、`MoveToDeckTop` 6。
- **自定义参数**：洗切范围、排序方向。
- **设计器覆盖**：未支持（一般是副操作）。

#### 宣言卡名 / 属性 / 种族 / 数量（announce）
- **lua 实现特征**：`Duel.AnnounceCard` / `AnnounceAttribute` / `AnnounceRace` / `AnnounceLevel` / `AnnounceNumber(Range)`；值存 `Duel.SetTargetParam` → `CHAININFO_TARGET_PARAM`。
```lua
local ac=Duel.AnnounceCard(tp,table.unpack(s.announce_filter))
Duel.SetTargetParam(ac)
local ac=Duel.GetChainInfo(0,CHAININFO_TARGET_PARAM)
```
- **命中**：`CATEGORY_ANNOUNCE` 9/8；`AnnounceNumber` 33/30、`AnnounceLevel` 21/21、`AnnounceCard` 12/9、`AnnounceAttribute` 12/12、`AnnounceRace` 11/11、`AnnounceNumberRange` 15/15。
- **自定义参数**：宣言类别 `kind`（卡名/属性/种族/等级/数字/区间）、可选值筛选、宣言后判定动作。
- **设计器覆盖**：未支持。

#### 掷骰 / 投币（dice / coin）
- **lua 实现特征**：`CATEGORY_DICE` / `CATEGORY_COIN`；`Duel.TossDice` / `Duel.TossCoin` / `Duel.CountHeads` / `Duel.CallCoin`。
- **命中**：`CATEGORY_COIN` 82/40、`CATEGORY_DICE` 57/28；`Duel.TossDice` 41/36、`Duel.TossCoin` 20/19、`CountHeads` 10、`CallCoin` 10。
- **自定义参数**：骰/币数量、成功判定条件、成功/失败分支。
- **设计器覆盖**：未支持。

#### 卡组外操作：额外卡组、卡组洗回、卡组顶
- 见 3.1/3.3 相关条目；`CATEGORY_TOEXTRA` 86/48、`Duel.SendtoExtraP` 17/17、`Duel.MoveToField` 166/147、`Duel.ReturnToField` 42/40。
- **设计器覆盖**：未支持（回额外卡组、移回场上）。

### 3.8 反制与无效

#### 无效发动 / 无效效果 / 无效召唤
- **lua 实现特征**：`CATEGORY_NEGATE+CATEGORY_DESTROY`；`EFFECT_TYPE_QUICK_O` + `SetCode(EVENT_CHAINING)` + `Duel.IsChainNegatable(ev)` → `Duel.NegateActivation(ev)`；无效效果用 `Duel.NegateEffect(ev)`；无效召唤用 `CATEGORY_DISABLE_SUMMON`+`Duel.NegateSummon(eg)`。
```lua
e3:SetCategory(CATEGORY_NEGATE+CATEGORY_DESTROY)
e3:SetType(EFFECT_TYPE_QUICK_O) e3:SetCode(EVENT_CHAINING)
e3:SetProperty(EFFECT_FLAG_DAMAGE_STEP+EFFECT_FLAG_DAMAGE_CAL)
if chk==0 then return Duel.IsChainNegatable(ev) end
Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
if Duel.NegateActivation(ev) and re:GetHandler():IsRelateToEffect(re) then Duel.Destroy(eg,REASON_EFFECT) end
```
- **命中**：`CATEGORY_NEGATE` 459/229、`CATEGORY_DISABLE_SUMMON` 44/22；`Duel.NegateActivation` 229/229、`Duel.NegateEffect` 153/151、`Duel.NegateSummon` 22/22、`Duel.NegateAttack` 66/64、`Duel.NegateRelatedChain` 63/63；`HINTMSG_NEGATE` 72/72。
- **自定义参数**：无效类型 `kind`（发动/效果/召唤/攻击）、发动时点（EVENT_CHAINING 等）、代价、是否追加破坏、对象范围（链上/场上/召唤的怪）。
- **设计器覆盖**：已支持 `negate_and_destroy`、`negate_activation`、`negate_punish`（`negate_effect`、`negate_summon`、无效攻击未支持）。

#### 效果无效化（disable，被动/常驻）
- **lua 实现特征**：`CATEGORY_DISABLE` + `EFFECT_DISABLE` / `EFFECT_DISABLE_EFFECT`；对单个怪用 `tc:NegateEffects(c,RESET_EVENT|RESETS_STANDARD)`。
- **命中**：`CATEGORY_DISABLE` 454/255；`EFFECT_DISABLE` 336/330、`EFFECT_DISABLE_EFFECT` 278/274、`EFFECT_DISABLE_TRAPMONSTER` 40/40。
- **自定义参数**：无效范围（效果/陷阱怪/发动）、作用对象、持续时间、来源（自身/来源卡）。
- **设计器覆盖**：未支持（仅发动无效；持续无效未支持）。

#### 效果发动封锁（cannot activate / cannot trigger）
- **lua 实现特征**：`EFFECT_CANNOT_ACTIVATE`（`SetValue` 判定 `re`）+ `EFFECT_CANNOT_TRIGGER`；用 `SetLabel/SetLabelObject` 传递限制条件。
```lua
e1:SetCode(EFFECT_CANNOT_ACTIVATE) e1:SetTargetRange(1,0)
e1:SetValue(function(e,re,tp) return re:IsHasType(EFFECT_TYPE_ACTIVATE) and re:GetHandler():IsCode(e:GetLabel()) end)
```
- **命中**：`EFFECT_CANNOT_ACTIVATE` 204/200、`EFFECT_CANNOT_TRIGGER` 63/62。
- **自定义参数**：受限类型（魔法/陷阱/怪兽效果/特定卡）、受限对象（玩家/场上卡）、持续时间、是否只限特定卡名。
- **设计器覆盖**：未支持（`cannotTrigger` 仅外文本）。

#### 效果赋予 / 复制（grant / copy）
- **lua 实现特征**：`EFFECT_TYPE_GRANT`（赋予）；复制效果用 `tc:CheckActivateEffect` + `CreateEffectRelation` + `te:GetTarget()/GetOperation()` 手动执行（示例 c10136446）。
- **命中**：`EFFECT_TYPE_GRANT` 13/13；`EFFECT_COPY_INHERIT` 68/66（继承）；复制执行模式约 20+ 文件。
- **自定义参数**：被赋予对象、被复制效果来源、是否可连锁、是否消耗。
- **设计器覆盖**：未支持。

#### 发动不能无效 / 发动不能禁用（不可被无效）
- **lua 实现特征**：`EFFECT_CANNOT_DISABLE`（效果不可被无效，常驻 `EFFECT_FLAG_CANNOT_DISABLE`）、`EFFECT_CANNOT_INACTIVATE`、`EFFECT_CANNOT_DISEFFECT`、`EFFECT_CANNOT_DISABLE_SUMMON`、`EFFECT_CANNOT_DISABLE_SPSUMMON`。
- **命中**：`EFFECT_CANNOT_DISABLE_SUMMON` 5/5、`EFFECT_CANNOT_DISABLE_SPSUMMON` 16/16、`EFFECT_CANNOT_INACTIVATE` 6/6、`EFFECT_CANNOT_DISEFFECT` 9/9；`EFFECT_FLAG_CANNOT_NEGATE` 47/46、`EFFECT_FLAG_CANNOT_DISABLE` 2580/2122。
- **自定义参数**：禁哪些（发动/效果/召唤）、作用对象。
- **设计器覆盖**：未支持。

### 3.9 抗性与免疫

#### 效果免疫 / 不可破坏
- **lua 实现特征**：
  - 效果免疫 `EFFECT_IMMUNE_EFFECT` + `SetValue(filter)`（如 `te:GetOwner()~=e:GetOwner()`、`te:IsTrapEffect()`）；
  - 战破抗性 `EFFECT_INDESTRUCTABLE_BATTLE`；
  - 效果破坏抗性 `EFFECT_INDESTRUCTABLE_EFFECT`；
  - 破坏替代 `EFFECT_DESTROY_REPLACE` / `EFFECT_DESTROY_SUBSTITUTE` / `EFFECT_INDESTRUCTABLE_COUNT`。
```lua
e3:SetCode(EFFECT_IMMUNE_EFFECT) e3:SetValue(s.efilter)  -- s.efilter(e,te) return te:IsTrapEffect()
e6:SetCode(EFFECT_INDESTRUCTABLE_EFFECT) e6:SetValue(s.tgvalue)
```
- **命中**：`EFFECT_IMMUNE_EFFECT` 168/165；`EFFECT_INDESTRUCTABLE_BATTLE` 411/408、`EFFECT_INDESTRUCTABLE_EFFECT` 327/325、`EFFECT_DESTROY_REPLACE` 155/155、`EFFECT_INDESTRUCTABLE_COUNT` 68/68、`EFFECT_DESTROY_SUBSTITUTE` 15/15。
- **自定义参数**：免疫范围 `scope`（全部/对手/魔法/陷阱/怪兽效果/战斗）、是否含取对象、破坏抗性类型（战破/效破/一次/次数）、替代代价。
- **设计器覆盖**：已支持 `immune_all`（部分支持：分类免疫、条件免疫、破坏抗性细分未支持）。

#### 不能成为效果/攻击对象（untargetable）
- **lua 实现特征**：`EFFECT_CANNOT_BE_EFFECT_TARGET`（常用 `aux.tgoval`）、`EFFECT_CANNOT_BE_BATTLE_TARGET`（常用 `aux.imval2`）。
- **命中**：`EFFECT_CANNOT_BE_EFFECT_TARGET` 226/224、`EFFECT_CANNOT_BE_BATTLE_TARGET` 55/55；`aux.tgoval` 173、`aux.imval1` 30、`aux.imval2` 19。
- **自定义参数**：不可被谁取对象（效果/攻击）、条件、是否含自身效果。
- **设计器覆盖**：未支持（`cannotBeAttacked` 仅规则文本）。

#### 离场/送墓/除外重定向（redirect / replace）
- **lua 实现特征**：`EFFECT_LEAVE_FIELD_REDIRECT`（去向重定向）、`EFFECT_TO_GRAVE_REDIRECT` / `_CB`、`EFFECT_REMOVE_REDIRECT`、`EFFECT_BATTLE_DESTROY_REDIRECT`、`EFFECT_SEND_REPLACE`、`EFFECT_COST_REPLACE`、`EFFECT_OVERLAY_REMOVE_REPLACE`。
- **命中**：`EFFECT_LEAVE_FIELD_REDIRECT` 216/216、`EFFECT_TO_GRAVE_REDIRECT` 23/23、`EFFECT_TO_GRAVE_REDIRECT_CB` 16/16、`EFFECT_BATTLE_DESTROY_REDIRECT` 14/14、`EFFECT_SEND_REPLACE` 3、`EFFECT_COST_REPLACE` 4、`EFFECT_OVERLAY_REMOVE_REPLACE` 3。
- **自定义参数**：重定向触发条件、原去向、新去向、是否仅一次。
- **设计器覆盖**：未支持。

#### 不可解放/不可除外/不可送墓/不可作为素材
- **lua 实现特征**：`EFFECT_UNRELEASABLE_SUM` / `EFFECT_UNRELEASABLE_NONSUM` / `EFFECT_UNRELEASABLE_EFFECT`；`EFFECT_CANNOT_REMOVE`；`EFFECT_CANNOT_TO_GRAVE` / `EFFECT_CANNOT_TO_HAND` / `EFFECT_CANNOT_TO_DECK`；素材限制 `EFFECT_CANNOT_BE_SYNCHRO_MATERIAL` / `_XYZ_` / `_FUSION_` / `_LINK_` / `EFFECT_CANNOT_BE_MATERIAL` / `EFFECT_SYNCHRO_MAT_RESTRICTION`。
- **命中**：`EFFECT_UNRELEASABLE_SUM` 40/39、`EFFECT_UNRELEASABLE_NONSUM` 27/26、`EFFECT_UNRELEASABLE_EFFECT` 1；`EFFECT_CANNOT_REMOVE` 11/11；`EFFECT_CANNOT_BE_SYNCHRO_MATERIAL` 64/64、`EFFECT_CANNOT_BE_XYZ_MATERIAL` 40/40、`EFFECT_CANNOT_BE_FUSION_MATERIAL` 17/17、`EFFECT_CANNOT_BE_LINK_MATERIAL` 45/45、`EFFECT_CANNOT_BE_MATERIAL` 22/21；`EFFECT_SYNCHRO_MAT_RESTRICTION` 13/13。
- **自定义参数**：受限类型、受限召唤法、条件。
- **设计器覆盖**：部分支持（`cannotBeReleased`、`materialRestriction`）。

### 3.10 限制与封锁

#### 不能特殊召唤 / 特召限制 / 召唤限制
- **lua 实现特征**：`EFFECT_CANNOT_SPECIAL_SUMMON`（`SetTargetRange(1,0)` + `SetTarget` 筛选）；`EFFECT_SPSUMMON_CONDITION`（自身特召条件，常 `SetValue(aux.FALSE)` 禁止）；`EFFECT_CANNOT_SUMMON`；`EFFECT_LIMIT_SUMMON_PROC`。
- **命中**：`EFFECT_CANNOT_SPECIAL_SUMMON` 619/615、`EFFECT_SPSUMMON_CONDITION` 504/504、`EFFECT_CANNOT_SUMMON` 72/71、`EFFECT_LIMIT_SUMMON_PROC` 8/8。
- **自定义参数**：限制对象（自己/对手/双方）、限制卡类（属性/种族/种类）、持续时间、是否只限某种召唤法。
- **设计器覆盖**：部分支持（`cannotSpecialSummon` 规则文本；我方限制特召的常驻效果未支持）。

#### 不能通常召唤 / 不能盖放 / 不能反转召唤
- **lua 实现特征**：`EFFECT_CANNOT_MSET` / `EFFECT_CANNOT_SSET` / `EFFECT_CANNOT_FLIP_SUMMON` / `EFFECT_CANNOT_TURN_SET` / `EFFECT_MONSTER_SSET`。
- **命中**：`EFFECT_CANNOT_MSET` 23/23、`EFFECT_CANNOT_SSET` 7/7、`EFFECT_CANNOT_FLIP_SUMMON` 14/14、`EFFECT_CANNOT_TURN_SET` 6/6、`EFFECT_MONSTER_SSET` 18/18。
- **设计器覆盖**：部分支持（`cannotMSet` 规则文本）。

#### 不能改变表示形式 / 不能变更控制权
- **lua 实现特征**：`EFFECT_CANNOT_CHANGE_POSITION`、`EFFECT_CANNOT_CHANGE_CONTROL`。
- **命中**：`EFFECT_CANNOT_CHANGE_POSITION` 41/41、`EFFECT_CANNOT_CHANGE_CONTROL` 11/11。
- **设计器覆盖**：部分支持（`cannotChangePosition` 规则文本）。

#### 跳过阶段 / 回合 / 战斗阶段
- **lua 实现特征**：`EFFECT_SKIP_BP` / `EFFECT_SKIP_DP` / `EFFECT_SKIP_M1` / `EFFECT_SKIP_M2` / `EFFECT_CANNOT_BP` / `EFFECT_SKIP_TURN` / `EFFECT_BP_TWICE`；也可 `Duel.SkipPhase`。
- **命中**：`EFFECT_SKIP_BP` 8/8、`EFFECT_SKIP_DP` 7/7、`EFFECT_CANNOT_BP` 23/23、`EFFECT_SKIP_TURN` 2、`EFFECT_BP_TWICE` 2；`Duel.SkipPhase` 35/27。
- **自定义参数**：跳过哪个阶段/回合、归属、是否仅下一回合。
- **设计器覆盖**：未支持。

#### 召唤次数 / 盖放次数追加（extra summon / set）
- **lua 实现特征**：`EFFECT_EXTRA_SUMMON_COUNT` / `EFFECT_EXTRA_SET_COUNT` / `EFFECT_SET_SUMMON_COUNT_LIMIT` / `EFFECT_DOUBLE_TRIBUTE` / `EFFECT_DECREASE_TRIBUTE` / `EFFECT_EXTRA_TRIBUTE` / `EFFECT_ADD_EXTRA_TRIBUTE`。
- **命中**：`EFFECT_EXTRA_SUMMON_COUNT` 51/51、`EFFECT_EXTRA_SET_COUNT` 5/5、`EFFECT_DOUBLE_TRIBUTE` 25/25、`EFFECT_DECREASE_TRIBUTE` 4/4、`EFFECT_EXTRA_TRIBUTE` 10/10、`EFFECT_ADD_EXTRA_TRIBUTE` 10/10、`EFFECT_TRIBUTE_LIMIT` 9/9。
- **自定义参数**：追加次数、适用对象、是否本回合限定。
- **设计器覆盖**：未支持。

### 3.11 装备 / 同盟 / 指示物

#### 装备（equip）
- **lua 实现特征**：`CATEGORY_EQUIP`+`Duel.Equip(tp,tc,c,true,true)`；装备限制 `EFFECT_EQUIP_LIMIT`；`EFFECT_TYPE_EQUIP` 用于「装备状态下的效果」；配合 `c:CheckEquipTarget` / `aux.AddEREquipLimit`。
```lua
if chk==0 then return c:CheckEquipTarget(ec) end
Duel.Equip(tp,tc,c,true,true) Duel.EquipComplete()
```
- **命中**：`CATEGORY_EQUIP` 455/258；`Duel.Equip` 160/154；`EFFECT_EQUIP_LIMIT` 137/135；`EFFECT_TYPE_EQUIP` 227/178；`Duel.EquipComplete` 12/12；`HINTMSG_EQUIP` 229/219。
- **自定义参数**：装备对象（自己/对手/属性/种族）、装备数量上限、是否作为魔法卡、装备效果内容。
- **设计器覆盖**：未支持。

#### 同盟（union）
- **lua 实现特征**：`aux.AddUnionProcedure(c,filter)`；`TYPE_UNION`；`ec:CheckUnionTarget(c)` + `aux.CheckUnionEquip(ec,c)` + `aux.SetUnionState(ec)`。
- **命中**：`aux.AddUnionProcedure` 40 文件；`aux.SetUnionState` 11/11；`aux.IsUnionState` 11/11。
- **自定义参数**：可装备对象筛选、同盟解除/再装备、装备后是否可特召。
- **设计器覆盖**：未支持。

#### 指示物（counter）
- **lua 实现特征**：`CATEGORY_COUNTER`；`c:AddCounter(COUNTER_X,n)` / `c:RemoveCounter` / `c:GetCounter` / `Duel.IsCanRemoveCounter`；`s.counter_list={COUNTER_A}` 声明可放指示物；常驻许可用 `EFFECT_COUNTER_PERMIT`（语料多以 card 方法为主）。
```lua
s.counter_list={COUNTER_A}
if chk==0 then return Duel.IsCanRemoveCounter(tp,1,1,COUNTER_A,2,REASON_COST) end
Duel.RemoveCounter(tp,1,1,COUNTER_A,2,REASON_COST)
```
- **命中**：`CATEGORY_COUNTER` 171/104；card `AddCounter` 202/160、`RemoveCounter` 152/86、`GetCounter` 174/117；`Duel.IsCanRemoveCounter` 35/33、`RemoveCounter` 33/33。
- **自定义参数**：指示物种类 `counter_type`（A/Spell/…）、数量、放置对象、消耗条件、按指示物数量放大数值。
- **设计器覆盖**：未支持。

### 3.12 灵摆与灵摆刻度

#### 灵摆召唤手续 / 摆区效果 / 刻度变动
- **lua 实现特征**：`Pendulum.AddProcedure(c)`；摆区效果 `SetRange(LOCATION_PZONE)`；刻度变更 `EFFECT_UPDATE_LSCALE/RSCALE`、`EFFECT_CHANGE_LSCALE/RSCALE`；摆区移动 `Duel.MoveToField(c,tp,tp,LOCATION_PZONE,POS_FACEUP,true)`；`Duel.CheckPendulumZones(tp)`。
```lua
Pendulum.AddProcedure(c)
e1:SetRange(LOCATION_PZONE) e1:SetType(EFFECT_TYPE_IGNITION) ...
if c:IsRelateToEffect(e) then Duel.MoveToField(c,tp,tp,LOCATION_PZONE,POS_FACEUP,true) end
```
- **命中**：`Pendulum.AddProcedure` 390；`LOCATION_PZONE` 478/374；`EFFECT_UPDATE_LSCALE` 10/10、`EFFECT_UPDATE_RSCALE` 10/10、`EFFECT_CHANGE_LSCALE` 19/19、`EFFECT_CHANGE_RSCALE` 19/19；`CheckPendulumZones` 127/67；`Duel.MoveToField` 166/147。
- **自定义参数**：左右刻度值/变动、摆区效果时点与内容、是否可用于灵摆召唤。
- **设计器覆盖**：部分支持（独立灵摆设计器；刻度动态变动未支持）。

### 3.13 名称与类别变更

见 3.4 的「卡名/卡号/字段变更」；另 `EFFECT_ADD_CODE`、`s.listed_names`、`s.listed_series`、`EFFECT_CHANGE_CODE` 是主要实现。

- **设计器覆盖**：部分支持（字段库与自定义 Setcode 已支持筛选；改名/改号未支持）。

### 3.14 时点与连锁操作

#### 自由时点 / 连锁时点效果
- **lua 实现特征**：`EVENT_FREE_CHAIN`（诱发即时/起动自由时点）964/940；`EFFECT_FLAG_DELAY`（错开时点/不卡时点）3007/2540；`SetHintTiming(0, TIMING_*)` 提示可发动时点。
```lua
e3:SetType(EFFECT_TYPE_QUICK_O) e3:SetCode(EVENT_FREE_CHAIN)
e3:SetHintTiming(0,TIMING_STANDBY_PHASE|TIMING_MAIN_END|TIMINGS_CHECK_MONSTER_E)
```
- **命中**：`EVENT_FREE_CHAIN` 964/940；`EFFECT_FLAG_DELAY` 3007/2540；`SetHintTiming`（未单独计数，遍布 QUICK 效果）；`TIMING_MAIN_END` 414/405、`TIMINGS_CHECK_MONSTER_E` 283/279。
- **自定义参数**：可发动时点集合 `timings`、是否延迟 `delay`、是否可在伤害步骤/伤害计算发动。
- **设计器覆盖**：部分支持（`quick_free`、`quick_chain` 等；自定义 timing 集合未支持）。

#### 连锁处理 / 插入处理 / 打断（chain solve / break effect）
- **lua 实现特征**：`EVENT_CHAINING/CHAIN_SOLVING/CHAIN_SOLVED/CHAIN_END/CHAIN_NEGATED/CHAIN_ACTIVATING`；`Duel.BreakEffect()` 强制分段（1041/911）；`Duel.GetChainInfo(0,CHAININFO_*)`；`Duel.SetChainLimit` / `SetChainLimitTillChainEnd`（禁止连锁）。
```lua
Duel.SetChainLimitTillChainEnd(aux.FALSE)
Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS)
Duel.BreakEffect()
```
- **命中**：`EVENT_CHAINING` 634/616、`EVENT_CHAIN_SOLVING` 85/85、`EVENT_CHAIN_SOLVED` 113/93、`EVENT_CHAIN_END` 17/17；`Duel.BreakEffect` 1041/911；`Duel.GetChainInfo` 1066/995；`Duel.SetChainLimit`（含 TillChainEnd）。
- **自定义参数**：监听连锁事件类型、是否插入处理、是否禁止对手连锁。
- **设计器覆盖**：未支持（`quick_chain` 仅简单连锁）。

#### 延迟处理 / 下回合时点（delayed operation）
- **lua 实现特征**：注册一个 `EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS` 监听 `EVENT_PHASE+PHASE_STANDBY/PHASE_END`，用 `e:SetLabel(Duel.GetTurnCount()+1)` 与 `SetReset(RESET_PHASE|PHASE_END, n)` 控制触发回合；`aux.DelayedOperation` 封装（30/30）。
```lua
e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
e1:SetCode(EVENT_PHASE|PHASE_STANDBY)
e1:SetLabel(Duel.GetTurnCount()+1)
e1:SetReset(RESET_PHASE|PHASE_END,2)
Duel.RegisterEffect(e1,tp)
```
- **命中**：`aux.DelayedOperation` 30/30；延迟注册模式广泛存在于 PHASE 事件中（`EVENT_PHASE` 922/874）。
- **自定义参数**：延迟到哪个阶段 `phase`、延迟轮数 `turns`、执行内容。
- **设计器覆盖**：未支持（仅 `summon_ns` 等固定时点）。

### 3.15 召唤手续（procedure 细化）

- **通常召唤手续替代**：`aux.AddNormalSummonProcedure(c,true,false,3,3)`（祭品数）、`aux.AddNormalSetProcedure`、`aux.AddNormalSummonProcedure(...,SUMMON_TYPE_TRIBUTE,...)`；命中 `aux.AddNormalSummonProcedure` 59/59、`aux.AddNormalSetProcedure` 35/35；`Duel.CheckTribute` 9/9、`Duel.SelectTribute` 9/9、`Duel.CheckTribute/Limit`。
- **自身特召手续**：`EFFECT_SPSUMMON_PROC` 636/635，配合 `EFFECT_FLAG_UNCOPYABLE`，`SetCondition/SetTarget/SetOperation` 三段式，操作中 `Duel.Release`/`Duel.Remove` 支付。
- **接触融合**：`Fusion.AddContactProc` 68/68。
- **素材检查/限制**：`EFFECT_MATERIAL_CHECK` 166/166，`e:SetLabel(...)` 在 `matcheck` 中保存属性/种族/种类信息供后续效果读取。
- **自定义参数**：召唤法、祭品数量上下限、素材数量上下限、素材筛选、是否可从额外/手卡/墓地取素材、是否解除限制。
- **设计器覆盖**：部分支持（`procSummonType`、`materialRestriction`、`ssOncePerTurn`、`EnableReviveLimit`）。

### 3.16 其他

#### 效果外文本 / 不可复制 / 告知（client hint）
- **lua 实现特征**：`EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE`；`EFFECT_FLAG_CLIENT_HINT` + `aux.RegisterClientHint`；`EFFECT_FLAG_OATH`（誓约）。
- **命中**：`EFFECT_FLAG_UNCOPYABLE` 1550/1327、`EFFECT_FLAG_CANNOT_DISABLE` 2580/2122、`EFFECT_FLAG_CLIENT_HINT` 1104/1036、`aux.RegisterClientHint` 149/147、`EFFECT_FLAG_OATH` 230/219。
- **自定义参数**：是否不可复制/不可无效、提示文本。
- **设计器覆盖**：部分支持。

#### 状态标记与全局检查（flag effect / global check）
- **lua 实现特征**：`Duel.RegisterFlagEffect(tp,id,reset,flag,count)` / `HasFlagEffect` / `GetFlagEffect`；`aux.GlobalCheck` 注册全局监听器（90/90）。
- **命中**：`Duel.RegisterFlagEffect` 213/181、`HasFlagEffect` 130/81、`GetFlagEffect` 117/98；`aux.GlobalCheck` 90/90；`EFFECT_FLAG_SET_AVAILABLE` 129/123。
- **自定义参数**：标记 id、重置时机、计数、全局条件。
- **设计器覆盖**：未支持（内部机制）。

#### 次数限制 / 誓约（count limit / oath）
- **lua 实现特征**：`e:SetCountLimit(n)`（软/硬一次？）与 `SetCountLimit(n,id)`（同卡名共享）、`{id,N}`（同名不同效果分组）、`EFFECT_COUNT_CODE_OATH/SINGLE/CHAIN/DUEL`。
- **命中**：`SetCountLimit` 5430/5430；形态分布 `N,id` 3292、`N,{id,N}` 2427、`N` 2393、`N,id,EFFECT_COUNT_CODE_OATH` 180、`N,N,EFFECT_COUNT_CODE_SINGLE` 49、`N,id,EFFECT_COUNT_CODE_DUEL` 39、`N,N,EFFECT_COUNT_CODE_CHAIN` 28。
- **自定义参数**：次数 `n`、是否同卡名共享 `share_id`、是否决斗一次 `code=DUEL`、是否整条链一次 `CHAIN`、分组编号 `{id,N}`。
- **设计器覆盖**：已支持 HOPT / SOPT / 决斗一次（分组编号与 CHAIN 未支持）。

#### 重置时机（reset）
- **lua 实现特征**：`SetReset(RESETS_STANDARD...)` / `SetReset(RESET_EVENT|RESETS_STANDARD&~(...))` / `SetReset(RESET_PHASE|PHASE_END, n)` / `RESET_OPPO_TURN` / `RESET_SELF_TURN` / `RESET_CHAIN`。
- **命中**：`SetReset` 3390/3390；主要取值 `0`、`RESETS_STANDARD_PHASE_END`、`RESET_EVENT|RESETS_STANDARD_DISABLE`、`RESET_EVENT|RESETS_STANDARD`、`RESET_PHASE|PHASE_END,2`、`RESET_PHASE|PHASE_END` 等。
- **自定义参数**：重置事件、是否阶段结束/回合结束、持续轮数、是否离开场地即失效。
- **设计器覆盖**：未支持（数值/效果持续时间为隐含）。

#### 效果目标范围（target range）
- **lua 实现特征**：`SetTargetRange(loc, who)`；高频组合 `1,0`（828，自己玩家）、`LOCATION_MZONE,0`（410）、`0,1`（213）、`LOCATION_MZONE,LOCATION_MZONE`（201）、`1,1`（106）。
- **自定义参数**：作用方 `who`（self/oppo/both）、作用区 `loc`（怪兽区/魔法陷阱区/手卡/场上/全部）。
- **设计器覆盖**：未支持（字段/卡类筛选部分覆盖）。

#### 不能作为素材 / 多方素材 / 数次素材（3.9 已列，补细节）
- `EFFECT_MATERIAL_CHECK` 166；`EFFECT_EXTRA_MATERIAL` 18；`EFFECT_MULTIPLE_TUNERS` 26；`EFFECT_NONTUNER` 14；`EFFECT_XYZ_LEVEL` 17；`EFFECT_SYNCHRO_MATERIAL_CUSTOM` 9。

#### 融合/同调/超量素材替代（substitute）
- `EFFECT_FUSION_SUBSTITUTE` 12/12、`EFFECT_EXTRA_FUSION_MATERIAL` 4、`EFFECT_EXTRA_RITUAL_MATERIAL` 10、`EFFECT_EXTRA_MATERIAL` 18。
- **设计器覆盖**：未支持。

#### 属性/种族/种类相关的其他
- `EFFECT_SWAP_BASE_AD` 6、`EFFECT_REVERSE_DAMAGE` 6、`EFFECT_REVERSE_RECOVER` 1、`EFFECT_DOUBLE_DAMAGE`。

---

## 4. 需要自定义调整的参数汇总

按「估计影响的效果数」降序（估算基于对应 `CATEGORY_*` 命中文件数/`SetCode` 频次，非精确值）。

| 参数名 | 含义 | 取值域/示例 | 涉及能力 | 估计影响的效果数 |
|---|---|---|---|---|
| `target_count` | 作用对象数量 | 1~5，默认 1；或 `1-99` 表示「任意数量」 | 除去、回收、特召、破坏、除外、抽卡以外所有「选 N 张」 | ~12000 |
| `who` | 对象/受益归属 | `self` / `oppo` / `both`；对应 lua 的 `tp` / `1-tp` / `PLAYER_ALL` | 全部 | ~11000 |
| `zone_from` | 来源区域 | `DECK` / `HAND` / `GRAVE` / `REMOVED` / `EXTRA` / `MZONE` / `SZONE` / `PZONE` / `ONFIELD`（可多选） | 检索、特召、回收、除去 | ~9000 |
| `filter` | 卡筛选条件 | 卡种/种族/属性/等级/攻守/字段 Setcode/卡名/是否怪兽 | 检索、特召、破坏、除外等 | ~8000 |
| `value_source` | 数值来源 | 固定值；`count_of(filter, zone)`×N；`level`×N；`atk/def`的百分比或值；`overlay_count`×N；`lp_diff` | 伤害、回复、攻守变动 | ~4000 |
| `pos` | 表示形式 | `POS_FACEUP_ATTACK` / `POS_FACEUP_DEFENSE` / `POS_FACEDOWN_DEFENSE` / `POS_FACEUP`（除外时表侧/里侧） | 特召、变形式、除外、盖放 | ~3900 |
| `summon_pos`/`sumtype` | 召唤类型/标记 | `SUMMON_TYPE_SPECIAL`（可 +1 自定）、`SUMMON_TYPE_FUSION/SYNCHRO/XYZ/LINK/RITUAL/PENDULUM/TRIBUTE` | 特召、召唤手续 | ~3590 |
| `effect_nature` | 效果性质 | `continuous` / `trigger`(F/O) / `ignition` / `quick` / `procedure` / `flip` / `equip` | 全部效果 | ~22860（全量） |
| `timing_event` | 触发事件 | `EVENT_SPSUMMON_SUCCESS` / `EVENT_SUMMON_SUCCESS` / `EVENT_TO_GRAVE` / `EVENT_DESTROYED` / `EVENT_BATTLE_DESTROYED` / `EVENT_BATTLE_DESTROYING` / `EVENT_FREE_CHAIN` / `EVENT_PHASE|PHASE_*` / `EVENT_CHAINING` / `EVENT_ATTACK_ANNOUNCE` / `EVENT_BE_MATERIAL` / `EVENT_LEAVE_FIELD` / `EVENT_REMOVE` / `EVENT_FLIP` 等 | 全部诱发效果 | ~5000 触发点 |
| `count_limit_n` | 每回合/每决斗发动次数 | 1~3，默认 1 | 全部 | ~5430 |
| `count_limit_scope` | 次数限制范围 | `self`（单效果）/ `same_name_card`（`id`）/ `group`（`{id,N}`）/ `DUEL` / `CHAIN` / `SINGLE` | 全部 | ~5430 |
| `reset_timing` | 效果持续时间/重置 | `STANDARD`（离场失效）/ `PHASE_END` / `TURN_END` / `OPPO_TURN` / `SELF_TURN` / `CHAIN` / 永久（0）；可带轮数 n | 数值变动、控制权、限制类 | ~3390 |
| `reason_filter` | 触发原因筛选 | `REASON_EFFECT` / `REASON_BATTLE` / `REASON_DESTROY` / `REASON_COST` / `REASON_MATERIAL` / `REASON_RELEASE` / 组合与取反 | 「由XX送去墓地/被破坏时」类 | ~1440（IsReason） |
| `targeted` | 是否取对象 | `true`（`EFFECT_FLAG_CARD_TARGET`+SelectTarget）/ `false` | 除去、回收、特召 | ~2550（CARD_TARGET 组合） |
| `zone_to` | 目的地区域 | `GRAVE` / `REMOVED` / `HAND` / `DECK`(顶/底/洗牌) / `EXTRA` / `MZONE` / `SZONE` / `PZONE` / `EQUIP` | 除去、移动、回收、重定向 | ~2500 |
| `cost` | 发动代价 | `pay_lp(n)` / `release_self` / `release_monster(n,filter)` / `discard(n)` / `detach_xyz(n)` / `banish_gy(n)` / `send_grave_self` / `tribute_self` / `reveal` | 全部主动效果 | ~2160（REASON_COST）/ Cost 库 1400+ |
| `atk_value` / `def_value` | 攻守变动量 | 整数可负；`update`（增量，可负）/ `set`（覆盖）/ `base`（基础值）/ `final`（最终值） | 攻守变动 | ~1725 |
| `delay_flag` | 是否错开时点 | `true`（`EFFECT_FLAG_DELAY`）/ `false` | 诱发效果 | ~3000 |
| `negate_kind` | 无效类型 | `activation`（发动）/ `effect`（效果）/ `summon`（召唤）/ `attack`（攻击） | 反制 | ~470（NEGATE）+ 336 DISABLE |
| `disable_scope` | 被动无效范围 | `effects` / `activation` / `trap_monster` | 无效化 | ~454（CATEGORY_DISABLE） |
| `immune_scope` | 免疫范围 | `all` / `oppo_only` / `spell` / `trap` / `monster_effect` / `battle` / `target` | 抗性 | ~767（Indestructible+Immune） |
| `indestructible_kind` | 破坏抗性类型 | `battle` / `effect` / `both` / `once`(一次) / `count_n`(次数) | 抗性 | ~900 |
| `ss_condition` | 特召条件 | 允许/禁止（`aux.FALSE`）；限定召唤法；限定素材 | 特召手续 | ~1120（SPSUMMON_PROC+CONDITION） |
| `control_to` | 控制权归属 | `self` / `oppo`；持续 `permanent` / `phase_end` / `turn_end` | 控制权 | ~235 |
| `position_to` | 目标表示形式 | `POS_FACEUP_DEFENSE` / `POS_FACEUP_ATTACK` / `POS_FACEDOWN_DEFENSE` / `POS_FACEDOWN_ATTACK` | 变形式 | ~592 |
| `counter_type` | 指示物种类 | `COUNTER_A` / `COUNTER_SPELL` / 等；可自定义 | 指示物 | ~171 |
| `counter_count` | 指示物数量 | 1~N | 指示物、代价 | ~200 |
| `token_spec` | 衍生物参数 | `atk/def/level/race/attribute/type/count` | 衍生物生成 | ~278 |
| `scale_value` | 灵摆刻度 | 0~13；左/右；变动量 | 灵摆 | ~390 |
| `announce_kind` | 宣言类型 | `card` / `attribute` / `race` / `level` / `number` / `number_range` | 宣言类 | ~102 |
| `coin_dice_spec` | 骰/币参数 | 个数、成功条件、分支 | 运气类 | ~139（COIN+DICE） |
| `extra_attack_n` | 追加攻击次数 | 1~N；是否可攻击全部 | 战斗 | ~173 |
| `attack_cost` / `cannot_attack` | 攻击限制 | 不能攻击/不能直接攻击/必须攻击/不能被选为攻击对象 | 战斗封锁 | ~400 |
| `leave_redirect_to` | 离场重定向 | 新去向 | 抗性/替代 | ~270 |
| `material_restriction` | 素材/召唤限制 | 受限召唤法、条件 | 召唤手续 | ~347 |
| `extra_summon_n` | 追加召唤/盖放次数 | 1~N | 召唤限制 | ~75 |
| `skip_phase` | 跳过阶段 | `BP` / `DP` / `M1` / `M2` / 回合 | 封锁 | ~43 |
| `chain_limit` | 连锁封锁 | 允许/禁止对手连锁（`SetChainLimit`） | 时点/连锁 | ~60 |
| `hint_msg` | 选择提示文本 | `HINTMSG_SPSUMMON` / `ATOHAND` / `DESTROY` / `TOGRAVE` / `REMOVE` / `FACEUP` / `TARGET` / `TODECK` 等 | 全部需选择的效果 | ~9000（提示出现但可自动化） |
| `label_data` | 运行时数据传递 | 任意（`SetLabel`/`SetLabelObject`/FlagEffect/Announce 值） | 条件与操作联动 | ~874（SetLabel） |

**可落地建议（默认值）**：
- `target_count` 默认 1，上限 5，允许「任意数量」开关；
- `who` 默认 `oppo`（除去类）/`self`（增益类）；
- `value_source` 默认固定值，备选「按筛选数量×倍率」；
- `reset_timing` 默认 `STANDARD`（离场失效）、阶段结束为 `PHASE_END`、永久为 0；
- `count_limit_n` 默认 1 + `count_limit_scope=same_name_card`（即 HOPT）。
- `effect_nature` 建议直接作为设计器顶层选择，映射到 `SetType` 组合：trigger→`EFFECT_TYPE_SINGLE/FIELD+EFFECT_TYPE_TRIGGER_O`（可选 `_F`）、ignition→`EFFECT_TYPE_IGNITION`、quick→`EFFECT_TYPE_QUICK_O`（+`EFFECT_FLAG_DAMAGE_STEP/CAL`）、continuous→`EFFECT_TYPE_SINGLE/FIELD(+CONTINUOUS)`。

---

## 5. 语料佐证

抽样核对（Read 全文）的脚本及对应能力：

| 文件 | 核对的能力 |
|---|---|
| `E:/tmp/ygocorpus/cs/official/c10000.lua` | 自身特召手续 `EFFECT_SPSUMMON_PROC`、祭品数(1~7)、`EFFECT_SET_ATTACK/DEFENSE`、`EnableReviveLimit` |
| `E:/tmp/ygocorpus/cs/official/c10000000.lua` | 祭品召唤手续、不可取对象、结束阶段送墓、起动破坏+解放代价 |
| `E:/tmp/ygocorpus/cs/official/c10000010.lua` | 支付 LP、攻守增量、取对象破坏、`SetChainLimitTillChainEnd` |
| `E:/tmp/ygocorpus/cs/official/c10000080.lua` | 控制权归还（`EFFECT_SET_CONTROL`+`EVENT_PHASE+PHASE_END`）、特召+`EFFECT_SET_ATTACK` |
| `E:/tmp/ygocorpus/cs/official/c10000090.lua` | 效果免疫、从墓地自身特召、送墓 |
| `E:/tmp/ygocorpus/cs/official/c10019086.lua` | 连接召唤手续、禁对手连锁、除外（自身+对手全场）、送墓 |
| `E:/tmp/ygocorpus/cs/official/c10024317.lua` | 破坏+盖放、被破坏回收、`EFFECT_CANNOT_ACTIVATE` 封锁 |
| `E:/tmp/ygocorpus/cs/official/c10113611.lua` | 直接攻击、战伤触发特召、解放+同调特召手续 |
| `E:/tmp/ygocorpus/cs/official/c10136446.lua` | 融合素材 N、不可取对象、盖 2 张、复制墓地魔法效果 |
| `E:/tmp/ygocorpus/cs/official/c10140443.lua` | 同调手续、转生召唤、延迟到下个准备阶段特召、等级下降 |
| `E:/tmp/ygocorpus/cs/official/c10163855.lua` | 变形式+伤害、战斗破坏/效果送墓检索、`SetPossibleOperationInfo` |
| `E:/tmp/ygocorpus/cs/official/c10300821.lua` | 超量手续、按素材数加攻、无效召唤+破坏、`Duel.Overlay` 吸素材 |
| `E:/tmp/ygocorpus/cs/official/c10443957.lua` | 无效发动+破坏（`EVENT_CHAINING`+`NegateActivation`）、`Cost.DetachFromSelf` |
| `E:/tmp/ygocorpus/cs/official/c10613952.lua` | 装备（`Duel.Equip`）、`SelectUnselectGroup` 装备多张、超量去素材破坏 |
| `E:/tmp/ygocorpus/cs/official/c11443677.lua` | 融合手续、`EFFECT_IMMUNE_EFFECT`（免疫陷阱）、`EFFECT_ATTACK_ALL` |
| `E:/tmp/ygocorpus/cs/official/c12958919.lua` | 衍生物生成（`CreateToken`+`SpecialSummonStep`）、按场上数量 burn |
| `E:/tmp/ygocorpus/cs/official/c1487805.lua` | 指示物（`RemoveCounter` 代价）、`EFFECT_SET_POSITION`、`EFFECT_CANNOT_TRIGGER` |
| `E:/tmp/ygocorpus/cs/official/c14761450.lua` | 不能作为同调素材、变形式、`Duel.AnnounceLevel` 降级、`NegateEffects` |
| `E:/tmp/ygocorpus/cs/official/c19048328.lua` | 素材检查 `EFFECT_MATERIAL_CHECK`、按素材属性封锁发动、检索 |
| `E:/tmp/ygocorpus/cs/official/c13331639.lua` | 融合+灵摆手续、摆区封锁、`EFFECT_INDESTRUCTABLE_EFFECT`、摆区移动 |
| `E:/tmp/ygocorpus/cs/official/c89357740.lua` | 同盟手续（`aux.AddUnionProcedure`）、装备+特召 |
| `E:/tmp/ygocorpus/cs/official/c18988396.lua` | 仪式 `Ritual.CreateProc`、不可被对手效果影响、`Ritual.AddWholeLevelTribute` |
| `E:/tmp/ygocorpus/cs/official/c10406322.lua` | 宣言卡名（`Duel.AnnounceCard`+`SetTargetParam`）、翻卡组顶、回到卡组顶/底 |
| `E:/tmp/ygocorpus/cs/official/c10286023.lua` | 伤害步骤发动标志（`EFFECT_FLAG_DAMAGE_STEP`） |

---

## 附：核心数字速查

- 文件 8552 / 行 554,344 / CreateEffect 22,860。
- 效果性质原子：TRIGGER_O 5037、IGNITION 3827、CONTINUOUS 1575、QUICK_O 1512、TRIGGER_F 1503、EQUIP 227、FLIP 193、QUICK_F 15、GRANT 13。
- `CATEGORY_*` 32 种，合计 26,827；Top：SPECIAL_SUMMON 8068、TOHAND 4011、DESTROY 3161、SEARCH 1196、DAMAGE 1005、TOGRAVE 980、REMOVE 980、ATKCHANGE 900、DRAW 842、TODECK 789、POSITION 592、NEGATE 459、EQUIP 455、DISABLE 454、SET 427。
- Top `Duel.*`：SetOperationInfo 11254、Hint 9177、IsExistingMatchingCard 6598、GetLocationCount 6140、SelectMatchingCard 4480、SpecialSummon 3597、SelectTarget 3419、IsExistingTarget 3252、GetFirstTarget 3137、GetMatchingGroup 2954、SendtoHand 2043、Destroy 1855、SendtoGrave 1265、Remove 1058、Draw 465、Damage 581、Recover 149、ChangePosition 382、NegateActivation 229、CreateToken 152、Equip 160、Overlay 164。
- Top 常驻 `SetCode` 常量：EFFECT_UPDATE_ATTACK 1372、EFFECT_SPSUMMON_PROC 636、EFFECT_CANNOT_SPECIAL_SUMMON 619、EFFECT_SPSUMMON_CONDITION 504、EFFECT_INDESTRUCTABLE_BATTLE 411、EFFECT_DISABLE 336、EFFECT_INDESTRUCTABLE_EFFECT 327、EFFECT_UPDATE_DEFENSE 303、EFFECT_DISABLE_EFFECT 278、EFFECT_SET_ATTACK_FINAL 262、EFFECT_CANNOT_BE_EFFECT_TARGET 226、EFFECT_LEAVE_FIELD_REDIRECT 216、EFFECT_CANNOT_ATTACK 212、EFFECT_CANNOT_ACTIVATE 204、EFFECT_UPDATE_LEVEL 188、EFFECT_IMMUNE_EFFECT 168、EFFECT_CHANGE_CODE 141、EFFECT_PIERCE 158、EFFECT_DIRECT_ATTACK 163、EFFECT_EXTRA_ATTACK 131。
- Top `SetProperty`：CARD_TARGET 3535、DELAY 3007、CANNOT_DISABLE 2580、PLAYER_TARGET 1579、UNCOPYABLE 1550、SINGLE_RANGE 1486、DAMAGE_STEP 1206、CLIENT_HINT 1104、IGNORE_IMMUNE 379、OATH 230。
- 选择器形态：`SelectMatchingCard:1-1` 4220（绝大多数单张）、`:expr` 137、`:1-99` 5；`SelectUnselectGroup:2-2` 427；`SelectTarget:expr` 1614。
