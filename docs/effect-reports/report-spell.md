# 魔法卡效果能力汇总

> 语料：`E:/tmp/ygocorpus/split/spell.txt` 中的 2843 个官方魔法卡 Lua 脚本。
> 统计脚本：`E:/tmp/ygocorpus/extract-spell.js`，原始结果：`E:/tmp/ygocorpus/raw-spell.json`，可读摘要：`E:/tmp/ygocorpus/raw-spell-summary.txt`。
> 补充探针：`probe.js` / `probe2.js` … `probe7.js`（用于校验 `Duel.*`、`Fusion.*`、`Ritual.*`、`Cost.*` 的真实拼写与频次）。
> 已支持清单来源：`E:/Workbox/Web/yugioh-ai-card-creator/docs/DESIGNER_SUPPORT_BASELINE.md`。

---

## 1. 概要

| 指标 | 数值 |
|---|---|
| 魔法卡脚本总数 | 2843 |
| 总行数 | 168,103 |
| `Effect.CreateEffect` 块总数 | 6,765 |
| 含「发动本体」`EFFECT_TYPE_ACTIVATE` 的文件 | 2,419（85.1%） |
| 使用 `EVENT_FREE_CHAIN`（无时点发动）的文件 | 2,362 |
| 含 `SetCondition` 的文件 | 1,412 |
| 含 `SetCost` 的文件 | 898 |
| 含 `SetCountLimit`（频次限制）的文件 | 1,565 |
| 含 `SetReset` 的文件 | 996 |
| 含 `SetRange` 的文件 | 1,377 |
| 含 `SetTargetRange`（群体适用范围）的文件 | 761 |

魔法卡的脚本结构与怪兽卡有四点本质差异，决定了能力拆解方式：

1. **一次「卡的发动」+ 若干「效果的发动/适用」**：所有魔法卡都有 `EFFECT_TYPE_ACTIVATE + EVENT_FREE_CHAIN` 的发动本体（2419 文件），它只声明「卡被发动」；真正的效果常常是后续注册的 `EFFECT_TYPE_FIELD/IGNITION/TRIGGER` 常驻效果。
2. **卡的驻留决定效果寿命**：常驻/装备/场地/永续魔法用 `SetRange(LOCATION_SZONE)`（649 文件）或 `SetRange(LOCATION_FZONE)`（330 文件）让效果依附在场上；一旦离场效果随之失效。`RESET_EVENT|RESETS_STANDARD`（274 文件）是最常见的重置写法。
3. **装备/场地/永续的常驻适用**：`EFFECT_TYPE_FIELD`（1352 文件）+ `SetTargetRange`（761 文件）构成「对某些区域某些卡持续生效」的通用范式。
4. **「卡的发动」被无效/不能被无效**：由 `EFFECT_FLAG_CANNOT_NEGATE`（10 文件）、`EFFECT_FLAG_CANNOT_INACTIVATE`（10 文件）、`EFFECT_FLAG_CANNOT_DISABLE`（278 文件）以及 `EFFECT_ACTIVATE_COST`（4 文件，施加发动代价/限制）控制。

---

## 2. 效果性质与魔法子类分布

### 2.1 发动 vs 常驻（按效果块的性质）

`SetType` 组合频次（文件数）：

| 类型组合 | 文件数 | 含义 |
|---|---|---|
| `EFFECT_TYPE_ACTIVATE` 单独 | 2,403 | 卡的发动本体（通常/速攻/仪式/永续/装备/场地 都必有） |
| `EFFECT_TYPE_FIELD` 单独 | 773 | 常驻适用（永续/场地/装备在场时的持续效果） |
| `EFFECT_TYPE_SINGLE` 单独 | 634 | 只对该卡自身生效 |
| `EFFECT_TYPE_IGNITION` 单独 | 660 | 场上/墓地/摆区可主动发动的效果 |
| `EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS` | 389 | 常驻，且通常无时点（维持/替换类） |
| `EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O` | 389 | 常驻 + 可选触发 |
| `EFFECT_TYPE_EQUIP` | 214 | 装备魔法对装备怪兽的持续效果 |
| `EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O` | 180 | 自身触发（离场/进墓等） |
| `EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_F` | 144 | 常驻 + 必发触发 |
| `EFFECT_TYPE_QUICK_O` / `QUICK_F` | 16 / 1 | 速攻/二速效果 |

效果块性质归类（按文件）：`activate` 2399、`static/field` 1428、`trigger|static/field` 725、`ignition` 654、`continuous|static/field` 500。

要点：**魔法卡的效果不是「一次结算完就结束」**；约 1,377 个文件需要 `SetRange` 决定效果挂在哪个区域，996 个文件需要 `SetReset` 决定持续多久。

### 2.2 魔法子类占比（脚本启发式，近似值）

| 子类 | 文件数 | 识别信号 | 备注 |
|---|---|---|---|
| 通常魔法 | ~1503 | 只有 `EFFECT_TYPE_ACTIVATE`，无 SZONE/FZONE 常驻 | 速攻魔法在脚本层与通常魔法同构，靠卡数据 `TYPE_QUICKPLAY` 区分，脚本内极少标记 |
| 永续魔法 | ~484 | 有 `SetRange(LOCATION_SZONE)` 的常驻效果 | |
| 场地魔法 | 361 | `LOCATION_FZONE` / `SetRange(LOCATION_FZONE)` | |
| 装备魔法 | 269 | `AddEquipProcedure` / `EFFECT_TYPE_EQUIP` | `AddEquipProcedure` 单独 250 文件 |
| 仪式魔法 | 92 | `Ritual.*` | `Ritual.AddProcGreaterCode` 35、`AddProcGreater` 21、`AddProcEqual` 11、`CreateProc` 17 |
| 灵摆魔法 | 31 | `LOCATION_PZONE` / `EFFECT_TYPE_PENDULUM` | 另有独立摆区设计器 |
| 速攻魔法（脚本显式 quick） | 12 | `EFFECT_TYPE_QUICK_O/F` | 仅墓地效果会用 |
| 其他/无法归类 | ~91 | 无 `EFFECT_TYPE_ACTIVATE`（如纯融合/仪式辅助卡） | 含 6 个 `Duel.SynchroSummon/XyzSummon/LinkSummon` |

`EFFECT_TYPE_ACTIVATE` 单块数 2408；`EFFECT_TYPE_EQUIP` 单块 292；场地相关 `LOCATION_FZONE` 792 次 / 361 文件；永续驻留 `LOCATION_SZONE` 1527 次 / 767 文件。

---

## 3. 能力清单

> 命中文件数为「包含该信号的脚本数」，出现频次为「该信号在全部脚本中的出现次数」。覆盖标注对应现有设计器：已支持 / 部分支持 / 未支持。

### A. 发动与条件

#### A1. 卡的发动本体（activation）
- **lua 实现特征**：
  ```lua
  local e1=Effect.CreateEffect(c)
  e1:SetCategory(CATEGORY_DESTROY)
  e1:SetType(EFFECT_TYPE_ACTIVATE)      -- 2403 文件
  e1:SetCode(EVENT_FREE_CHAIN)          -- 2362 文件
  e1:SetTarget(s.target); e1:SetOperation(s.activate)
  c:RegisterEffect(e1)
  ```
- **命中文件数 / 出现频次**：2403 文件；`EFFECT_TYPE_ACTIVATE` 2408 次。
- **自定义参数**：效果分类 category（多选）；是否取对象（`EFFECT_FLAG_CARD_TARGET` 1086 文件 / `EFFECT_FLAG_PLAYER_TARGET` 570 文件）；时点（`SetHintTiming` 347 文件，取值 `TIMING_DAMAGE_STEP` / `TIMING_BATTLE_PHASE` 等）；适用条件 condition；代价 cost；目标 target；效果 operation。
- **设计器覆盖**：已支持（`spell_trap_act`、action 与 cost 体系）。

#### A2. 发动代价（activation cost）
- **lua 实现特征**：`SetCost`（898 文件）；`Cost.*` 辅助函数实测分布：`Cost.SelfBanish` 219、`Cost.PayLP` 78、`Cost.SelfToGrave` 27、`Cost.Discard` 8、`Cost.AND` 5、`Cost.SelfToDeck` 2、`Cost.Reveal` 2、`Cost.SelfTribute` 1。原生写法：`Duel.PayLPCost` 40、`Duel.DiscardHand` 157、`Duel.Release` 115、`Duel.Remove(...REASON_COST)`、`Duel.SendtoGrave(...REASON_COST)`。
- **命中文件数 / 出现频次**：`SetCost` 898 文件 / 982 次；代价资源种类丰富。
- **自定义参数**：代价类型（支付LP / 丢弃手卡 / 解放 / 自身除外 / 自身送墓 / 自身回卡组 / 展示 / 送墓 N）；数量 N（1~N，示例 `Cost.PayLP(1000)`、`Cost.PayLP(500)`）；代价卡筛选（`Card.IsDiscardable`、`IsAbleToRemoveAsCost` 141 文件、`IsAbleToGraveAsCost` 122 文件）；统计方式（`Card.IsSetCard`）。
- **设计器覆盖**：部分支持（pay_lp / discard_one / discard_n / release_monster_n / banish_* / send_to_grave_n / mill_deck_n）；**未支持自身除外/自身送墓/自身回卡组/展示**等「自身代价」。

#### A3. 发动条件（condition）
- **lua 实现特征**：`SetCondition`（1412 文件）返回布尔；常见判定 `Duel.IsExistingMatchingCard`（1667 文件）、`Duel.GetFieldGroupCount`（234 文件）、`Duel.IsTurnPlayer`、`Duel.IsEnvironment`（9 文件）、`IsPhase`（73 文件）、`Duel.GetLP`（82 文件）。
- **命中文件数 / 出现频次**：1412 文件 / 1826 次。
- **自定义参数**：条件类型（场上存在某卡 / 手卡数≥N / 墓地数≥N / 对方场上有卡 / 自身LP≤N / 处于某阶段 / 某场地存在 / 己方回合）；阈值 N；卡筛选。
- **设计器覆盖**：部分支持（timing 预设覆盖多数，但「手卡数/墓地数/LP/场上种族数」等数值条件未暴露）。

#### A4. 频次限制（count limit）
- **lua 实现特征**：`SetCountLimit`（1565 文件 / 2206 次）。取值分布：`1,id` 529 文件、`1,id,EFFECT_COUNT_CODE_OATH` 589 文件、`1` 449 文件、`1,{id,1}` 316 文件、`1,{id,0}` 48、`EFFECT_COUNT_CODE_DUEL` 7、`EFFECT_COUNT_CODE_CHAIN` 6、`EFFECT_COUNT_CODE_SINGLE` 13。
- **命中文件数 / 出现频次**：1565 文件。
- **自定义参数**：每回合次数 N（1/2/3…）；作用域（卡片名共享 / 仅此效果 / 仅此卡）；限制粒度（`EFFECT_COUNT_CODE_OATH` 同名卡合算、`DUEL` 决斗一次、`CHAIN` 每连锁一次、`SINGLE` 单效果）。
- **设计器覆盖**：已支持（HOPT / SOPT / 决斗一次），**未支持「同名卡共享 OATH」与每连锁一次**。

#### A5. 发动/效果不能被无效
- **lua 实现特征**：
  ```lua
  e:SetProperty(EFFECT_FLAG_CANNOT_INACTIVATE+EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_CANNOT_NEGATE)
  -- 或给装备手续传入同样 property（见 c303660）
  ```
  另有 `EFFECT_CANNOT_DISABLE`（`SetCode`，27 处），`EFFECT_FLAG_SET_AVAILABLE` 55 文件（让效果在里侧/非公开状态仍适用）。
- **命中文件数 / 出现频次**：`EFFECT_FLAG_CANNOT_NEGATE` 10 文件、`EFFECT_FLAG_CANNOT_INACTIVATE` 10 文件、`EFFECT_FLAG_CANNOT_DISABLE` 278 文件。
- **自定义参数**：是否不可被发动无效 / 不可被效果无效 / 不可被发动（inactivate）。
- **设计器覆盖**：未支持。

#### A6. 时点限制（hint timing / 阶段）
- **lua 实现特征**：`SetHintTiming`（347 文件）指定可在伤害步骤/战斗阶段等特殊时点发动；`SetCode(EVENT_PHASE+PHASE_END)`（179 文件）、`EVENT_PHASE|PHASE_STANDBY`（65 文件）。
- **命中文件数 / 出现频次**：347 文件 / 347 次。
- **自定义参数**：允许的时点集合（主1 / 战斗 / 伤害步骤 / 结束阶段 / 抽牌 / 准备）；是否伤害步骤可发。
- **设计器覆盖**：部分支持（quick_free / quick_oppo_turn 等 timing 预设）。

### B. 调度与检索

#### B1. 卡组检索入手（search）
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)     -- 333 文件
  Duel.IsExistingMatchingCard(s.filter,tp,LOCATION_DECK,0,1,nil)
  Duel.SelectMatchingCard(tp,s.filter,tp,LOCATION_DECK,0,1,1,nil)
  Duel.SendtoHand(g,nil,REASON_EFFECT); Duel.ConfirmCards(1-tp,g)
  ```
- **命中文件数 / 出现频次**：`CATEGORY_SEARCH` 505 文件（519 次）、`CATEGORY_TOHAND` 750 文件（1557 次）；`Duel.SendtoHand` 747 文件 / 828 次；`Duel.ConfirmCards` 706 文件。
- **自定义参数**：检索张数 count（1~N，默认 1）；来源区域（卡组/墓地/除外/额外，可多选，见 `LOCATION_*` 组合）；卡筛选（类型/种族/属性/等级/字段/攻击力）；是否公开确认（`ConfirmCards`）；是否洗牌（`ShuffleDeck` 113 文件）；检索后是否展示（`HINTMSG_ATOHAND` 597 文件）。
- **设计器覆盖**：已支持（search_deck），但**未支持多区域合并检索与「同名/特定卡」联动检索**（如 `spell:ListsCode`）。

#### B2. 卡组送墓/堆墓（dump / mill）
- **lua 实现特征**：`e:SetCategory(CATEGORY_DECKDES)`（23 文件）；`Duel.SendtoGrave(g,REASON_EFFECT)`；`Duel.DiscardDeck`（20 文件）；`Duel.ConfirmDecktop`（44）+ `Duel.GetDecktopGroup`（40）+ `Duel.DisableShuffleCheck`（28）用于翻卡组顶。
- **命中文件数 / 出现频次**：`CATEGORY_DECKDES` 23 文件；`Duel.DiscardDeck` 20 文件 / 20 次；`Duel.ConfirmDecktop` 44 文件。
- **自定义参数**：堆墓张数 N；来源（卡组顶 / 卡组任意选 / 手卡）；是否需要翻开确认；送墓原因（效果/代价/场合）。
- **设计器覆盖**：部分支持（dump_deck / mill_deck_n），**未支持「翻卡组顶并二选一处理」**。

#### B3. 墓地/除外区回收
- **lua 实现特征**：`CATEGORY_LEAVE_GRAVE`（103 文件）；从 `LOCATION_GRAVE|LOCATION_REMOVED` 检索入手；示例 c68223137 的 `CATEGORY_TOHAND` 从 `LOCATION_GRAVE` 回手。
- **命中文件数 / 出现频次**：`CATEGORY_LEAVE_GRAVE` 103 文件 / 124 次；`LOCATION_REMOVED` 193 文件。
- **自定义参数**：来源区域（墓地/除外）；回收张数 N；回收去处（手卡/卡组/额外/场上）；筛选条件。
- **设计器覆盖**：部分支持（to_hand_target / salvage_extra），**未支持「除外区回收」作为独立能力**。

#### B4. 返回卡组（shuffle back）
- **lua 实现特征**：`Duel.SendtoDeck(g,nil,SEQ_DECKTOP|SEQ_DECKSHUFFLE|SEQ_DECKBOTTOM,REASON_EFFECT)`；`e:SetCategory(CATEGORY_TODECK)`；回卡组后 `Duel.ShuffleDeck(tp)` 或 `Duel.ShuffleHand(tp)`（156 文件）、`Duel.ShuffleExtra`（13 文件）。
- **命中文件数 / 出现频次**：`CATEGORY_TODECK` 201 文件 / 400 次；`Duel.SendtoDeck` 231 文件 / 244 次；`Duel.ShuffleDeck` 113 文件。
- **自定义参数**：返回张数 N；去处位置（牌堆顶 / 牌堆底 / 洗牌）；对象来源（场上/墓地/除外/手卡）；是否洗牌；自身是否同行。
- **设计器覆盖**：未支持（无「回卡组」action；choice 里仅 destroy_or_banish 等）。

#### B5. 送墓 / 送额外
- **lua 实现特征**：`Duel.SendtoGrave`（385 文件 / 425 次）；`e:SetCategory(CATEGORY_TOGRAVE)`（189 文件 / 347 次）；`CATEGORY_TOEXTRA` 14 文件，用 `Duel.SendtoExtraP`（8 文件）把灵摆怪置入额外卡组正面。
- **命中文件数 / 出现频次**：`CATEGORY_TOGRAVE` 189 文件；`CATEGORY_TOEXTRA` 14 文件。
- **自定义参数**：张数 N；来源；是否按效果/代价；正面或里侧；送墓后是否触发。
- **设计器覆盖**：部分支持（send_to_grave 仅作为 cost；dump_deck 是卡组→墓）。

#### B6. 卡组顶操作 / 排序 / 洗牌
- **lua 实现特征**：`Duel.SortDecktop(tp,tp,3)`（14 文件，c96677818）；`Duel.GetDecktopGroup`（40 文件）；`Duel.DisableShuffleCheck`（28 文件）；`Duel.ShuffleHand`（156 文件）。
- **命中文件数 / 出现频次**：`SortDecktop` 14 文件；`GetDecktopGroup` 40 文件。
- **自定义参数**：操作张数 N（默认 3）；排序或重排；是否展示给对手；是否允许洗牌。
- **设计器覆盖**：未支持。

#### B7. 从额外卡组调度
- **lua 实现特征**：`Duel.GetLocationCountFromEx`（124 文件，判断额外怪兽区额度）；`LOCATION_EXTRA` 368 文件；`CATEGORY_SPECIAL_SUMMON` 中从额外 SS。
- **命中文件数 / 出现频次**：`GetLocationCountFromEx` 124 文件 / 143 次。
- **自定义参数**：是否可忽视连接区额度；来源额外卡组；张数。
- **设计器覆盖**：部分支持（salvage_extra；special_summon_deck 不含额外）。

### C. 特殊召唤

#### C1. 一般特殊召唤（手/墓/卡组）
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
  c:IsCanBeSpecialSummoned(e,0,tp,false,false)
  Duel.GetLocationCount(tp,LOCATION_MZONE)>0
  Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)
  ```
  多体同召用 `Duel.SpecialSummonStep`（162 文件）+ `Duel.SpecialSummonComplete`（161 文件）。
- **命中文件数 / 出现频次**：`CATEGORY_SPECIAL_SUMMON` 937 文件 / 1949 次；`Duel.SpecialSummon` 751 文件 / 821 次；`IsCanBeSpecialSummoned` 829 文件；`GetLocationCount` 887 文件。
- **自定义参数**：召唤来源（手卡/墓地/卡组/除外/额外，可多选）；张数 N；表示形式（`POS_FACEUP` / `POS_FACEUP_DEFENSE`）；召唤玩家 who（自己/对方）；是否忽视召唤条件；是否同调/XYZ 素材；是否破坏自身；`sumpos`。
- **设计器覆盖**：已支持（special_summon_self/hand/deck、revive_grave）；**未支持同召多体（Step/Complete）与「无视召唤条件」「对方召唤」**。

#### C2. 生成 Token
- **lua 实现特征**：
  ```lua
  Duel.IsPlayerCanSpecialSummonMonster(tp,TOKEN_...,SET_...,TYPES_TOKEN,0,0,1,RACE_...,ATTRIBUTE_...)
  for i=1,2 do local token=Duel.CreateToken(tp,TOKEN_...); Duel.SpecialSummonStep(token,0,tp,tp,false,false,POS_FACEUP) end
  Duel.SpecialSummonComplete()
  ```
- **命中文件数 / 出现频次**：`CATEGORY_TOKEN` 63 文件 / 124 次；`Duel.CreateToken` 65 文件 / 69 次。
- **自定义参数**：Token 名称/ID；数量 N；攻击力/守备力；等级；种族/属性/类型；表示形式；是否战斗破坏；位置限制。
- **设计器覆盖**：未支持。

#### C3. 苏生限制 / 无视召唤条件 / 召唤计数
- **lua 实现特征**：`EFFECT_CANNOT_SPECIAL_SUMMON`（217 文件，封锁 SS）；`Duel.IsPlayerCanSpecialSummonCount`（15 文件）；`EFFECT_SPSUMMON_COST`（5 文件）；`EFFECT_REVIVE_LIMIT`（2 文件）。
- **命中文件数 / 出现频次**：`EFFECT_CANNOT_SPECIAL_SUMMON` 217 文件；`IsPlayerCanSpecialSummonCount` 15 文件。
- **自定义参数**：是否允许 SS；允许次数；是否受苏生限制。
- **设计器覆盖**：部分支持（ruleTexts：cannotSpecialSummon）。

### D. 除去与移动

#### D1. 破坏
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_DESTROY)
  Duel.IsExistingMatchingCard(Card.IsSpellTrap,tp,LOCATION_ONFIELD,0,1,c)
  local g=Duel.GetMatchingGroup(...) ; Duel.Destroy(g,REASON_EFFECT)
  ```
- **命中文件数 / 出现频次**：`CATEGORY_DESTROY` 340 文件 / 693 次；`Duel.Destroy` 460 文件 / 499 次。
- **自定义参数**：破坏数量 count（1~N，默认 1）；所属 who（self/oppo/both）；卡类筛选（怪兽/魔法/陷阱/字段）；是否取对象（CARD_TARGET 913 文件）；是否可代破；破坏原因（效果/规则）；是否同时处理双方（如 c13210191「岚」按对方数量破坏）。
- **设计器覆盖**：已支持（destroy_target、wipe_*），**未支持「按条件数量动态破坏」与「先破坏我方再破坏对方」的顺序控制**。

#### D2. 除外（banish）
- **lua 实现特征**：`e:SetCategory(CATEGORY_REMOVE)`；`Duel.Remove(g,POS_FACEUP,REASON_EFFECT)` 或 `Duel.Remove(g,POS_FACEDOWN,REASON_COST)`（代价时常见）。
- **命中文件数 / 出现频次**：`CATEGORY_REMOVE` 184 文件 / 336 次；`Duel.Remove` 326 文件 / 362 次；`IsAbleToRemoveAsCost` 141 文件。
- **自定义参数**：除外数量 N；所属 who；来源区域；里侧/表侧；是否按代价除外；是否暂时除外并归还（`REASON_TEMPORARY` 8 文件）。
- **设计器覆盖**：已支持（banish_target、banish_* cost）。

#### D3. 加入手卡（弹回）
- **lua 实现特征**：`Duel.SendtoHand(g,nil,REASON_EFFECT)`；`CATEGORY_TOHAND`；`HINTMSG_RTOHAND`（51 文件）。
- **命中文件数 / 出现频次**：`CATEGORY_TOHAND` 750 文件；`Duel.SendtoHand` 747 文件 / 828 次。
- **自定义参数**：回收数量 N；对象所属 who；来源区域；是否公开（`ConfirmCards`）；是否受「不能加入手卡」限制。
- **设计器覆盖**：已支持（to_hand_target）。

#### D4. 解放 / 祭品
- **lua 实现特征**：`Duel.Release`（115 文件 / 117 次）；`Duel.CheckReleaseGroupCost` + `Duel.SelectReleaseGroupCost`（各 88 文件，成对，用于召唤手续解放）；`e:SetCategory(CATEGORY_RELEASE)`（13 文件）。
- **命中文件数 / 出现频次**：`Duel.Release` 115 文件；`CATEGORY_RELEASE` 13 文件。
- **自定义参数**：解放数量 N；解放对象筛选（等级/种族/字段）；是否作为代价；是否包含 token。
- **设计器覆盖**：部分支持（release_monster_n cost）。

#### D5. 控制权转移
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_CONTROL); e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
  Duel.GetControl(tc,tp)          -- 28 文件
  -- 或 Duel.ChangeControl（本语料为 0，统一用 GetControl）
  ```
  判定可转移用 `c:IsControlerCanBeChanged()`。
- **命中文件数 / 出现频次**：`CATEGORY_CONTROL` 36 文件 / 66 次；`Duel.GetControl` 28 文件。
- **自定义参数**：转移对象 who/筛选；转移给哪一方；是否永久（`RESET_CONTROL` 1 文件）；是否不可被自身控制；转移后可攻击。
- **设计器覆盖**：未支持。

#### D6. 表示形式变更 / 盖放
- **lua 实现特征**：`Duel.ChangePosition(g,POS_FACEDOWN_DEFENSE)`（69 文件）；`e:SetCategory(CATEGORY_POSITION+CATEGORY_SET)`（c31834488）；改动为里侧用 `Duel.SSet`（88 文件）或 `ChangePosition(...,POS_FACEDOWN_DEFENSE)`。
- **命中文件数 / 出现频次**：`CATEGORY_POSITION` 64 文件 / 128 次；`CATEGORY_SET` 123 文件 / 126 次；`Duel.ChangePosition` 69 文件；`Duel.SSet` 88 文件。
- **自定义参数**：目标表示形式（表侧攻击/表侧守备/里侧守备）；数量 N；对象 who；是否盖放（set）；是否允许己方或对方操作；`IsCanTurnSet` 前置判定。
- **设计器覆盖**：未支持。

#### D7. 区域移动 / 换位
- **lua 实现特征**：`Duel.MoveToField`（59 文件，把卡直接放到魔陷区/场上，如 c10004783 把墓地卡放到魔陷区并 `EFFECT_CHANGE_TYPE` 改为永续）；`Duel.MoveSequence`（30 文件，换主怪兽区）；`Duel.SelectDisableField`（11 文件，选择/封锁区域，需 `math.log(...,2)` 转序号，见 c37480144）。
- **命中文件数 / 出现频次**：`MoveToField` 59 文件；`MoveSequence` 30 文件；`SelectDisableField` 11 文件。
- **自定义参数**：目标区域；是否改变卡类型（`EFFECT_CHANGE_TYPE` 21 文件）；位置序号；是否封锁区域及封锁数量。
- **设计器覆盖**：未支持。

#### D8. 送墓 / 丢弃手卡
- **lua 实现特征**：`Duel.SendtoGrave`（385 文件）；`Duel.DiscardHand(tp,Card.IsDiscardable,1,1,REASON_EFFECT|REASON_DISCARD)`（157 文件 / 160 次）；`CATEGORY_HANDES`（76 文件 / 142 次）；`Duel.DiscardDeck`（20 文件）。
- **命中文件数 / 出现频次**：`CATEGORY_HANDES` 76 文件；`Duel.DiscardHand` 157 文件；`Duel.DiscardDeck` 20 文件。
- **自定义参数**：丢弃数量 N（可选 `min,max`）；丢弃方 who；是否随机；筛选；送墓原因。
- **设计器覆盖**：部分支持（discard_n cost）。

### E. 数值变动

#### E1. 攻击力/守备力增减
- **lua 实现特征**：
  ```lua
  local e1=Effect.CreateEffect(c)
  e1:SetType(EFFECT_TYPE_SINGLE)
  e1:SetCode(EFFECT_UPDATE_ATTACK)   -- 434 文件
  e1:SetReset(RESETS_STANDARD_PHASE_END)
  e1:SetValue(800)                   -- 或函数
  tc:RegisterEffect(e1)
  ```
  另有 `EFFECT_UPDATE_DEFENSE`（143 文件）、`EFFECT_SET_ATTACK_FINAL`（60 文件）、`EFFECT_SET_ATTACK`（14 文件）、`EFFECT_SET_BASE_ATTACK`（11 文件）、`EFFECT_SET_DEFENSE_FINAL`（16 文件）；`CATEGORY_ATKCHANGE` 181 文件 / 211 次、`CATEGORY_DEFCHANGE` 30 文件。
- **命中文件数 / 出现频次**：`EFFECT_UPDATE_ATTACK` 434 文件 / 447 次；`EFFECT_UPDATE_DEFENSE` 143 文件。
- **自定义参数**：数值 amount（±固定值 / 按等级/攻击力/守备力换算 / 支付 LP 值）；作用对象（单体/己方全体/对方全体/字段）；是否取对象；持续（回合/永久/场上）；`SetValue` 函数；
  参数来源：`GetAttack` 134 文件、`GetDefense` 31、`GetBaseAttack` 51、`GetLevel` 171、`GetOriginalLevel` 35、`GetRank` 35。
- **设计器覆盖**：部分支持（atk_boost，仅固定提升）；**未支持 DEF 变动、绝对设定、参照其他卡数值**。

#### E2. 等级/阶级变动
- **lua 实现特征**：`EFFECT_UPDATE_LEVEL`（32 文件）、`EFFECT_CHANGE_LEVEL`（37 文件）；`e:SetCategory(CATEGORY_LVCHANGE)`（26 文件 / 38 次）。示例 c42548470 把对方怪兽等级改成与己方相同，并追加抽卡。
- **命中文件数 / 出现频次**：`CATEGORY_LVCHANGE` 26 文件；`EFFECT_UPDATE_LEVEL` 32 文件；`EFFECT_CHANGE_LEVEL` 37 文件。
- **自定义参数**：变动方式（±N / 变为 N / 参照另一卡）；数值；对象；持续；触发额外效果。
- **设计器覆盖**：未支持（ruleLevel 仅卡面文本）。

### F. 战斗相关

#### F1. 直接攻击 / 追加攻击
- **lua 实现特征**：`EFFECT_DIRECT_ATTACK`（27 文件）、`EFFECT_EXTRA_ATTACK`（30 文件 / 27 次）；`EFFECT_CANNOT_DIRECT_ATTACK` 18 文件。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：是否可直接攻击；追加攻击次数 N；对象。
- **设计器覆盖**：部分支持（canDirectAttack 为 ruleText）；未支持追加攻击。

#### F2. 穿刺 / 战伤变动 / 战斗伤害回避
- **lua 实现特征**：`EFFECT_PIERCE`（22 文件）、`EFFECT_CHANGE_BATTLE_DAMAGE`（17 文件）、`EFFECT_AVOID_BATTLE_DAMAGE`（20 文件）、`EFFECT_NO_EFFECT_DAMAGE`（13 文件）。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：是否穿刺；战伤倍率/固定值；是否回避；仅效果伤害或战斗伤害。
- **设计器覆盖**：未支持。

#### F3. 攻击无效
- **lua 实现特征**：`Duel.NegateAttack()`（15 文件），常配合 `EVENT_ATTACK_ANNOUNCE`（65 文件）与 `Duel.TossCoin`。
- **命中文件数 / 出现频次**：`Duel.NegateAttack` 15 文件。
- **自定义参数**：无效对象（攻击宣言/攻击）；是否同时造成伤害。
- **设计器覆盖**：未支持。

#### F4. 战斗破坏耐性 / 代破
- **lua 实现特征**：`EFFECT_INDESTRUCTABLE_BATTLE`（54 文件）、`EFFECT_DESTROY_REPLACE`（67 文件）、`EFFECT_DESTROY_SUBSTITUTE`（5 文件）、`EFFECT_INDESTRUCTABLE_COUNT`（28 文件）。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：耐性范围（战斗/效果/全部）；次数；替代代价。
- **设计器覆盖**：部分支持（immune_all 为通用免疫）。

### G. 控制权与表示形式
见 D5 / D6。补充：`EFFECT_CANNOT_CHANGE_POSITION`（12 文件）、`EFFECT_CANNOT_SELECT_BATTLE_TARGET`（21 文件）、`EFFECT_CANNOT_BE_EFFECT_TARGET`（62 文件）。

### H. 卡组/手卡/墓地/除外区/额外卡组操作
见 B 组。补充「操作矩阵」实测来源/去向（`LOCATION_*` 文件数）：`LOCATION_MZONE` 1932、`LOCATION_DECK` 1027、`LOCATION_GRAVE` 1139、`LOCATION_HAND` 864、`LOCATION_SZONE` 767、`LOCATION_ONFIELD` 525、`LOCATION_EXTRA` 368、`LOCATION_FZONE` 361、`LOCATION_REMOVED` 193、`LOCATION_PZONE` 37、`LOCATION_STZONE` 22、`LOCATION_MMZONE` 11、`LOCATION_EMZONE` 3、`LOCATION_OVERLAY` 6。

### I. 反制与无效

#### I1. 无效效果（negate effect）
- **lua 实现特征**：`Duel.NegateEffect(ev)`（36 文件 / 36 次）；常配合 `EFFECT_TYPE_QUICK_O` + `SetCode(EVENT_CHAINING)`（67 文件）+ `SetProperty(EFFECT_FLAG_DAMAGE_STEP+EFFECT_FLAG_DAMAGE_CAL)`；`e:SetCategory(CATEGORY_DISABLE)`（48 文件）。
- **命中文件数 / 出现频次**：`Duel.NegateEffect` 36 文件；`CATEGORY_DISABLE` 48 文件 / 88 次。
- **自定义参数**：无效对象（效果发动/怪兽效果/魔陷效果）；是否并破坏；是否并除外；条件（对方发动/连锁）；是否无视免疫（`EFFECT_FLAG_IGNORE_IMMUNE` 163 文件）。
- **设计器覆盖**：部分支持（negate_and_destroy、negate_punish）。

#### I2. 无效发动（negate activation）
- **lua 实现特征**：`Duel.NegateActivation(ev)`（3 文件，c82661630）；`CATEGORY_NEGATE`（3 文件 / 6 次）；`Duel.NegateRelatedChain(tc,RESET_TURN_SET)`（9 文件，禁发同名卡）。
- **命中文件数 / 出现频次**：`NegateActivation` 3 文件；`CATEGORY_NEGATE` 3 文件。
- **自定义参数**：无效的是「发动」还是「效果」；是否同时破坏；是否禁止同名卡继续发动；针对怪兽效果/魔陷。
- **设计器覆盖**：部分支持（negate_activation）。

#### I3. 无效并封锁 / 效果无效化（disable）
- **lua 实现特征**：
  ```lua
  Duel.NegateRelatedChain(tc,RESET_TURN_SET)
  local e1=Effect.CreateEffect(c); e1:SetType(EFFECT_TYPE_SINGLE)
  e1:SetCode(EFFECT_DISABLE); e1:SetReset(RESETS_STANDARD_PHASE_END); tc:RegisterEffect(e1)
  local e2=Effect.CreateEffect(c); e2:SetType(EFFECT_TYPE_SINGLE)
  e2:SetCode(EFFECT_DISABLE_EFFECT); e2:SetValue(RESET_TURN_SET); tc:RegisterEffect(e2)
  ```
  `EFFECT_DISABLE` 100 文件 / 101 次；`EFFECT_DISABLE_EFFECT` 76 文件；`Duel.DisableEffect` 不存在（本语料 0，统一用效果注册）。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：无效化范围（仅此效果/整只怪兽所有效果）；持续（回合/永久）；是否禁止再发动；`IsNegatableMonster`（12 文件）前置判定。
- **设计器覆盖**：部分支持（negate_punish 近似）。

#### I4. 无效后的追加处理
- **lua 实现特征**：无效后接 `Duel.Destroy` / `Duel.Remove` / `Duel.SendtoGrave` / `Duel.Draw`，用 `Duel.BreakEffect()`（478 文件）切分结算。
- **命中文件数 / 出现频次**：`Duel.BreakEffect` 478 文件 / 529 次。
- **自定义参数**：追加动作类型、数量、对象。
- **设计器覆盖**：部分支持（negate_punish 固定）。

### J. 抗性与免疫

#### J1. 效果免疫 / 不可破坏
- **lua 实现特征**：
  ```lua
  local e1=Effect.CreateEffect(c); e1:SetType(EFFECT_TYPE_FIELD)
  e1:SetCode(EFFECT_IMMUNE_EFFECT); e1:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
  e1:SetRange(LOCATION_SZONE); e1:SetTargetRange(LOCATION_ONFIELD,LOCATION_ONFIELD)
  e1:SetTarget(s.etarget); e1:SetValue(s.efilter)
  ```
  `EFFECT_IMMUNE_EFFECT` 38 文件 / 38 次；`EFFECT_INDESTRUCTABLE_EFFECT` 70 文件 / 72 次；`EFFECT_FLAG_SET_AVAILABLE` 55 文件。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：免疫来源（怪兽效果/魔陷效果/全部）；作用对象与区域（`SetTargetRange` 参数：1,1 / LOCATION_MZONE,0 / 0,LOCATION_MZONE 等）；是否含里侧（SET_AVAILABLE）；是否不可选为对象（`EFFECT_CANNOT_BE_EFFECT_TARGET` 62 文件）。
- **设计器覆盖**：部分支持（immune_all）；**未支持范围限定与来源限定**。

#### J2. 破坏替代 / 离场改道
- **lua 实现特征**：`EFFECT_DESTROY_REPLACE`（67 文件 / 68 次）、`EFFECT_LEAVE_FIELD_REDIRECT`（16 文件）、`EFFECT_TO_GRAVE_REDIRECT`（5 文件）。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：替代代价；替代后去向（除外/手卡/卡组/破坏方墓地）。
- **设计器覆盖**：未支持。

### K. 限制与封锁

#### K1. 行为禁止（blanket）
- **lua 实现特征**：`EFFECT_TYPE_FIELD` + `SetTargetRange` + `SetCode(EFFECT_CANNOT_*)` + `SetTarget` 筛选。高频：`EFFECT_CANNOT_SPECIAL_SUMMON` 217 文件、`EFFECT_CANNOT_ATTACK` 111、`EFFECT_CANNOT_ACTIVATE` 73、`EFFECT_CANNOT_SUMMON` 45、`EFFECT_CANNOT_TRIGGER` 30、`EFFECT_CANNOT_BP` 19、`EFFECT_CANNOT_MSET` 16、`EFFECT_CANNOT_SSET` 17、`EFFECT_CANNOT_ATTACK_ANNOUNCE` 34、`EFFECT_CANNOT_FLIP_SUMMON` 10、`EFFECT_CANNOT_DIRECT_ATTACK` 18。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：禁止的行为类型；适用方 who（己方/对方/双方）；受影响的卡筛选（如只禁止非「守墓」怪，见 c70000776）；是否永续。
- **设计器覆盖**：部分支持（ruleTexts 仅约束该卡自身；**未支持对场上其他卡的群体封锁**）。

#### K2. 不可解放 / 不可作素材
- **lua 实现特征**：`EFFECT_UNRELEASABLE_SUM`（23 文件）、`EFFECT_UNRELEASABLE_NONSUM`（15 文件）。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：禁止解放范围（上级召唤/效果/全部）。
- **设计器覆盖**：部分支持（cannotBeReleased ruleText）。

#### K3. 区域封锁 / 禁止区域
- **lua 实现特征**：`Duel.SelectDisableField`（11 文件）选择并封锁魔陷/怪兽区。
- **命中文件数 / 出现频次**：11 文件 / 11 次（低频）。
- **自定义参数**：封锁区域类型；数量；持续。
- **设计器覆盖**：未支持。

#### K4. 追加/限制召唤次数、发动代价施加
- **lua 实现特征**：`EFFECT_EXTRA_SUMMON_COUNT`（22 文件）、`EFFECT_ACTIVATE_COST`（4 文件，如 c79323590「魔力之枷」每次发动/召唤付 500 LP）、`EFFECT_SUMMON_COST` / `EFFECT_SPSUMMON_COST` / `EFFECT_MSET_COST` / `EFFECT_SSET_COST`（各 5/1/1/1 文件）。
- **命中文件数 / 出现频次**：`EFFECT_ACTIVATE_COST` 4 文件；`EXTRA_SUMMON_COUNT` 22 文件。
- **自定义参数**：追加召唤次数；发动/召唤必须支付的 LP 或代价；适用范围（手卡发动/场上发动/set）。
- **设计器覆盖**：未支持。

### L. 装备与场地

#### L1. 装备手续与装备关系
- **lua 实现特征**：
  ```lua
  aux.AddEquipProcedure(c,nil,aux.FilterBoolFunction(Card.IsSetCard,SET_X))  -- 250 文件
  -- 或手动：Duel.Equip(tp,c,tc) + 注册 EFFECT_EQUIP_LIMIT
  local e1=Effect.CreateEffect(tc); e1:SetType(EFFECT_TYPE_SINGLE)
  e1:SetCode(EFFECT_EQUIP_LIMIT); e1:SetValue(s.eqlimit)
  c:RegisterEffect(e1)
  ```
- **命中文件数 / 出现频次**：`AddEquipProcedure` 250 文件 / 250 次；`Duel.Equip` 83 文件 / 85 次；`EFFECT_EQUIP_LIMIT` 50 文件 / 51 次；`EFFECT_TYPE_EQUIP` 216 文件。
- **自定义参数**：可装备对象筛选；装备限制 eqlimit（谁能装）；装备代价（`AddEquipProcedure` 第 5 参 cost，如 c75539614 付 LP 且数值转 ATK）；装备怪兽获得效果；离场时处理（`GetPreviousEquipTarget` 37 文件、`GetEquipTarget` 141 文件）；`EFFECT_EQUIP_LIMIT` 值。
- **设计器覆盖**：未支持（无装备魔法专用设计）。

#### L2. 场地魔法驻留与场地判定
- **lua 实现特征**：
  ```lua
  e2:SetType(EFFECT_TYPE_IGNITION); e2:SetRange(LOCATION_FZONE)  -- 330 文件用 FZONE
  e2:SetCode(EVENT_PHASE+PHASE_END); e2:SetCountLimit(1)
  Duel.IsEnvironment(CARD_NECROVALLEY)                            -- 9 文件
  ```
- **命中文件数 / 出现频次**：`SetRange(LOCATION_FZONE)` 694 次 / 330 文件；`LOCATION_FZONE` 361 文件；`Duel.IsEnvironment` 9 文件。
- **自定义参数**：场地是否只能 1 张（`SetUniqueOnField` 34 文件）；维持代价（c33900648：结束阶段付 500 LP 或自毁，用 `EFFECT_SELF_DESTROY` 11 文件）；是否依赖另一场地存在；发动时点。
- **设计器覆盖**：未支持。

#### L3. 永续魔法的常驻适用
- **lua 实现特征**：
  ```lua
  local e2=Effect.CreateEffect(c)
  e2:SetType(EFFECT_TYPE_FIELD)          -- 常驻
  e2:SetRange(LOCATION_SZONE)            -- 挂在魔陷区
  e2:SetCode(EFFECT_UPDATE_ATTACK)
  e2:SetTargetRange(LOCATION_MZONE,0)    -- 只对自己场上怪兽
  e2:SetValue(300)
  ```
- **命中文件数 / 出现频次**：`SetRange(LOCATION_SZONE)` 1077 次 / 649 文件；`SetTargetRange` 761 文件 / 1013 次。
- **自定义参数**：适用区域（`SetTargetRange(a,b)`：己方/对方 区域，实测 `1,1` 最常见、`LOCATION_MZONE,0` 次之）；对象筛选；数值；是否里侧也适用；是否可被无效（CANNOT_DISABLE）。
- **设计器覆盖**：部分支持（atk_boost 常驻 + continuous_faceup timing），**未支持任意「区域+筛选+数值」的常驻模板**。

### M. 指示物

#### M1. 指示物放置/移除
- **lua 实现特征**：
  ```lua
  s.counter_place_list={COUNTER_A}          -- 63 文件
  c:EnableCounterPermit(COUNTER_A)          -- 54 文件
  tc:AddCounter(COUNTER_A,1)                -- :AddCounter 77 文件
  Duel.RemoveCounter(...)                   -- 19 文件
  e1:SetCategory(CATEGORY_COUNTER)
  ```
- **命中文件数 / 出现频次**：`CATEGORY_COUNTER` 33 文件 / 56 次；`EnableCounterPermit` 54 文件；`counter_place_list` 63 文件；`:AddCounter` 77 文件；`Duel.RemoveCounter` 19 文件；`IsCanRemoveCounter` 19 文件。
- **自定义参数**：指示物种类（A/魔/守/强/…自定义）；放置数量 N；放置对象（自身/对方/场地）；移除数量；按指示物数量触发的效果。
- **设计器覆盖**：未支持（`CATEGORY_COUNTER` 33 文件）。

### N. 仪式与融合召唤辅助

#### N1. 仪式召唤手续
- **lua 实现特征**：
  ```lua
  Ritual.AddProcGreaterCode(c,8,nil,10441498)                       -- 35 文件
  Ritual.AddProcGreater(c, aux.FilterBoolFunction(...))             -- 21 文件
  Ritual.AddProcEqual(c, ...)                                       -- 11 文件
  -- 或参数表：
  local ritparams={handler=c,lvtype=RITPROC_EQUAL,filter=...,lv=s.ritlevel,
                   location=LOCATION_DECK,sumpos=POS_FACEUP_DEFENSE}
  e1:SetTarget(Ritual.Target(ritparams)); e1:SetOperation(Ritual.Operation(ritparams))
  Ritual.CreateProc(c,RITPROC_GREATER,...,location)                 -- 17 文件
  ```
- **命中文件数 / 出现频次**：`Ritual.*` 95 文件；`AddProcGreaterCode` 35、`AddProcGreater` 21、`AddProcEqual` 11、`CreateProc` 17；`CATEGORY_FUSION_SUMMON` 49 文件（部分仪式卡也用 `CATEGORY_SPECIAL_SUMMON`）。
- **自定义参数**：等级判定方式（等于/大于等于，`RITPROC_EQUAL` / `RITPROC_GREATER`）；目标等级 lv（可函数，如 ×2）；可解放素材来源区域（`location`，如 `LOCATION_HAND|LOCATION_DECK`）；召唤对象筛选；表示形式 sumpos；是否从墓地/卡组解放；指定卡名/代码。
- **设计器覆盖**：部分支持（procSummonType=ritual 仅卡面文本；无仪式手续设计器）。

#### N2. 融合召唤手续
- **lua 实现特征**：
  ```lua
  c:RegisterEffect(Fusion.CreateSummonEff(c,aux.FilterBoolFunction(Card.IsRace,RACE_INSECT)))  -- 86 文件
  -- 辅助：Fusion.IsMonsterFilter 53、Fusion.SummonEffTG 44、Fusion.SummonEffOP 36、
  --      Fusion.OnFieldMat 30、Fusion.BanishMaterial 28、Fusion.ShuffleMaterial 15、Fusion.InHandMat 4
  g:SetMaterial(...)  -- 57 文件
  ```
- **命中文件数 / 出现频次**：`Fusion.*` 126 文件；`Fusion.CreateSummonEff` 86 文件。
- **自定义参数**：可融合的怪兽筛选（种族/字段/等级）；素材来源（场上/手卡/卡组/墓地/除外）；素材是否除外/洗回卡组；是否允许手卡作为素材（InHandMat）；是否从额外卡组融合；召唤对象。
- **设计器覆盖**：部分支持（procSummonType=fusion 文本；无融合手续设计器）。

### O. 时点与连锁

#### O1. 触发时点（event trigger）
- **lua 实现特征**：`SetCode(EVENT_*)` + `SetType(EFFECT_TYPE_FIELD/SINGLE + EFFECT_TYPE_TRIGGER_O/F)` + `SetRange`。事件频次（文件）：`EVENT_FREE_CHAIN` 2362、`EVENT_PHASE` 265、`EVENT_TO_GRAVE` 185、`EVENT_SPSUMMON_SUCCESS` 164、`EVENT_DESTROYED` 108、`EVENT_LEAVE_FIELD` 72、`EVENT_CHAINING` 67、`EVENT_SUMMON_SUCCESS` 67、`EVENT_ATTACK_ANNOUNCE` 65、`EVENT_CHAIN_SOLVING` 35、`EVENT_BATTLE_DESTROYING` 33、`EVENT_REMOVE` 28、`EVENT_BATTLED` 26、`EVENT_DAMAGE_STEP_END` 26、`EVENT_BATTLE_DESTROYED` 24、`EVENT_BATTLE_DAMAGE` 23、`EVENT_TO_HAND` 18、`EVENT_PRE_DAMAGE_CALCULATE` 18、`EVENT_DRAW` 13、`EVENT_RELEASE` 12、`EVENT_CHANGE_POS` 11、`EVENT_PREDRAW` 10、`EVENT_FLIP_SUMMON_SUCCESS` 9、`EVENT_TO_DECK` 8、`EVENT_EQUIP` 7、`EVENT_CHAIN_NEGATED` 6、`EVENT_MSET` 5、`EVENT_MOVE` 4、`EVENT_REMOVE_COUNTER` 4、`EVENT_DISCARD` 3、`EVENT_DETACH_MATERIAL` 2、`EVENT_BE_MATERIAL` 2、`EVENT_TOSS_COIN` 1、`EVENT_TOSS_DICE` 1、`EVENT_CONTROL_CHANGED` 1、`EVENT_ADD_COUNTER` 1。
- **命中文件数 / 出现频次**：触发类型 `TRIGGER_O` 547 文件、`TRIGGER_F` 202 文件。
- **自定义参数**：触发事件类型（可多个用 `|`）；必发 F / 可选 O（可错过时点）；触发者 who（自己/对方/双方）；触发条件；是否可延迟（`EFFECT_FLAG_DELAY` 341 文件，避免错过时点）；作用范围 range（SZONE/FZONE/GRAVE/MZONE）。
- **设计器覆盖**：部分支持（timing 约 20 种预设）；**未支持「任意事件 × 区域 × 必发/可选 × 玩家」的自由组合**。

#### O2. 效果分类声明（SetOperationInfo）
- **lua 实现特征**：`Duel.SetOperationInfo(0,CATEGORY_X,nil,N,tp,LOCATION)`（2124 文件 / 3218 次）；`Duel.SetPossibleOperationInfo`（283 文件）声明「可能」的副效果。
- **命中文件数 / 出现频次**：`SetOperationInfo` 2124 文件；`SetPossibleOperationInfo` 283 文件。
- **自定义参数**：涉及类别、张数、玩家、区域（自动从 action 推导，设计器需据此生成）。
- **设计器覆盖**：已支持（由 action 生成）。

#### O3. 结算切分与目标保持
- **lua 实现特征**：`Duel.BreakEffect()`（478 文件）分隔两段结算；`Duel.SetTargetCard`（160 文件）、`Duel.SetTargetPlayer`（244 文件）、`Duel.SetTargetParam`（248 文件）保存结算参数，`Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)`（402 文件）取回。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：多段结算顺序；保存的玩家/数值参数（用于「抽 N、恢复 M」等动态值）。
- **设计器覆盖**：部分支持（单一 action）；**未支持多段结算与参数传递**。

#### O4. 分支选择
- **lua 实现特征**：`Duel.SelectEffect(tp,{b1,desc1},{b2,desc2})`（127 文件）；`Duel.SelectEffectYesNo`（70 文件）；`Duel.SelectOption`（59 文件）；`Duel.SelectYesNo`（334 文件）；用 `e:SetLabel(op)`（418 文件）记录选择。
- **命中文件数 / 出现频次**：`SelectEffect` 127 文件；`SelectYesNo` 334 文件。
- **自定义参数**：分支数量与描述；各分支的条件与效果；是否随机。
- **设计器覆盖**：部分支持（choice_* 二选一）。

#### O5. 延迟处理（DelayedOperation）
- **lua 实现特征**：
  ```lua
  aux.DelayedOperation(tc,PHASE_END,id,e,tp,function(dg) Duel.Destroy(dg,REASON_EFFECT) end,nil,0,1,aux.Stringid(id,1))
  ```
- **命中文件数 / 出现频次**：`aux.DelayedOperation` 20 文件；另用 `RegisterFlagEffect`（294 文件）、`Duel.GetFlagEffect`（57 文件）做回合内标记。
- **自定义参数**：延迟到哪个阶段（结束/准备/战斗）；处理动作（破坏/回手/除外）；是否仅一次。
- **设计器覆盖**：未支持（仅有 destroyed_battle_or_effect 等触发）。

#### O6. 无效/连锁相关触发
- **lua 实现特征**：`EVENT_CHAIN_NEGATED`（6 文件）用于「发动被无效时」；`EVENT_CHAINING`（67 文件）+ `Duel.GetChainInfo` 判定发动内容；`Duel.IsChainNegatable`（3 文件）；`Duel.NegateRelatedChain`（9 文件）。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：响应的是「卡的发动」「效果的发动」还是「发动被无效」；连锁数限制。
- **设计器覆盖**：未支持。

### P. 其他

#### P1. 掷骰 / 抛硬币
- **lua 实现特征**：`Duel.TossCoin(tp,1)`（9 文件）、`Duel.TossDice`（10 文件）；`e:SetCategory(CATEGORY_COIN)`（8 文件 / 16 次）、`CATEGORY_DICE`（9 文件 / 16 次）；卡片声明 `s.toss_coin=true`（10 文件）、`s.roll_dice`（10 文件）。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：硬币/骰子数量 N；判定结果对应分支；结果统计方式（表/里、点数）。
- **设计器覆盖**：未支持。

#### P2. 宣言（announce）
- **lua 实现特征**：`Duel.AnnounceCard(tp,...)`（15 文件，配合 `s.announce_filter`）、`Duel.AnnounceNumber`（12 文件）、`Duel.AnnounceAttribute`（7 文件）、`Duel.AnnounceRace`（6 文件）；`e:SetCategory(CATEGORY_ANNOUNCE)`（14 文件）；用 `Duel.SetTargetParam(ac)` + `Duel.GetChainInfo(0,CHAININFO_TARGET_PARAM)` 保存宣言值。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：宣言类型（卡名/数字/属性/种族）；可选范围（如仅额外卡组、1~N）。
- **设计器覆盖**：未支持。

#### P3. LP 直接设定
- **lua 实现特征**：`Duel.SetLP(p,value)`（37 文件 / 43 次），如 c72233469 让对方 LP-1000。
- **命中文件数 / 出现频次**：37 文件。
- **自定义参数**：目标玩家；新数值或增减量。
- **设计器覆盖**：部分支持（gain_lp / burn_damage），**未支持直接设定 LP**。

#### P4. 改变卡名/类型/属性/种族/公开
- **lua 实现特征**：`EFFECT_CHANGE_CODE`（17 文件，c75141056 把怪兽名改成送墓卡名）、`EFFECT_ADD_TYPE`（16 文件，c82661630 给怪兽加效果怪兽类型）、`EFFECT_CHANGE_RACE`（16 文件）、`EFFECT_CHANGE_ATTRIBUTE`（14 文件）、`EFFECT_CHANGE_TYPE`（21 文件，把墓地卡改成永续魔法）、`EFFECT_PUBLIC`（8 文件，公开手卡）。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：改成的代码/类型/属性/种族；作用对象；持续；是否公开。
- **设计器覆盖**：部分支持（ruleAttribute/ruleRace/ruleLevel/addMonsterType 为卡面文本）；**运行时改变未支持**。

#### P5. 效果授予（grant）
- **lua 实现特征**：`EFFECT_TYPE_FIELD+EFFECT_TYPE_GRANT`（13 文件）；`SetLabelObject(e2)` 指定被授予的效果；`SET_AVAILABLE`。
- **命中文件数 / 出现频次**：13 文件 / 13 次。
- **自定义参数**：授予对象筛选；被授予的效果；是否无条件。
- **设计器覆盖**：未支持。

#### P6. 无视免疫 / 不可被连锁
- **lua 实现特征**：`EFFECT_FLAG_IGNORE_IMMUNE`（163 文件 / 176 次）；`EFFECT_FLAG_BOTH_SIDE`（12 文件）；`EFFECT_FLAG_UNCOPYABLE`（28 文件）。
- **命中文件数 / 出现频次**：见上。
- **自定义参数**：是否无视免疫；是否对双方都处理；是否不可复制。
- **设计器覆盖**：未支持。

---

## 4. 需要自定义调整的参数汇总

> 「估计影响的效果数」按含该信号的文件数估算（一个效果可含多个参数），降序排列。

| 参数名 | 含义 | 取值域 / 示例 | 涉及能力 | 估计影响效果数 |
|---|---|---|---|---|
| `count` | 操作/选择数量（min,max） | 1~5，默认 1；实测 `SelectTarget` 多为 `1,1`，最高 5 | 破坏/除外/回收/检索/抽卡/SS/解放/丢弃 | ~2,500（SelectTarget 997 + SelectMatchingCard 1249 + IsExistingTarget 988） |
| `who` | 作用对象所属 | self / oppo / both | 破坏、除外、回收、SS、控制、数值、封锁 | ~1,800（SetTargetRange 761 + 各 API 玩家参数） |
| `location` / 来源去向 | 卡所在区域与目标区域 | `LOCATION_DECK/GRAVE/HAND/REMOVED/EXTRA/MZONE/SZONE/FZONE/PZONE`（可 `|` 组合） | 所有移动类、检索类 | ~2,600（LOCATION_* 广泛使用；`LOCATION_DECK` 1027、`GRAVE` 1139、`HAND` 864） |
| `filter` | 卡筛选（类型/种族/属性/等级/攻击力/字段/卡名） | 任意谓词；`IsSetCard` 1164、`IsType` 513、`IsRace` 480、`IsAttribute` 222、`IsLevel` 94 | 全部目标/筛选类能力 | ~2,500（IsExistingMatchingCard 1667 + SelectTarget 997） |
| `amount` | 数值量（ATK/DEF/伤害/LP/等级） | ±固定值或函数；实测 `800`、`300`、`-500`、`GetAttack()/2`、`GetDefense()` | ATK/DEF 变动、伤害、恢复、等级变动 | ~1,000（UPDATE_ATTACK 434 + UPDATE_DEFENSE 143 + ATKCHANGE 181 + DAMAGE 123 + RECOVER 62） |
| `category` | 效果分类（可多选） | `CATEGORY_*` 31 种；`SPECIAL_SUMMON/TOHAND/SEARCH/DESTROY/DRAW/...` | 所有效果 | ~2,500 |
| `frequencyLimit` | 频次限制 | 每回合 1/2/3 次；OATH 同名共享 / DUEL 决斗一次 / CHAIN / SINGLE | 所有效果 | ~1,565（SetCountLimit） |
| `range` | 效果驻留区域 | `LOCATION_SZONE`(649) / `LOCATION_FZONE`(330) / `LOCATION_GRAVE`(386) / `LOCATION_MZONE`(84) | 永续/装备/场地/墓地起效 | ~1,377（SetRange） |
| `duration` / `reset` | 持续时长 | `RESETS_STANDARD_PHASE_END`、`RESET_PHASE|PHASE_END`、`RESET_EVENT|RESETS_STANDARD`、永久 | 数值变动、免疫、封锁、控制权 | ~996（SetReset） |
| `costType` + `costCount` | 发动代价类型与数量 | pay_lp 1000 / discard 1 / release 1 / banish 1 / self_banish / self_to_grave | 发动、部分效果 | ~898（SetCost）；`Cost.SelfBanish` 219、`Cost.PayLP` 78 |
| `event` | 触发事件 | `EVENT_TO_GRAVE/SPSUMMON_SUCCESS/DESTROYED/PHASE+PHASE_END/CHAINING/ATTACK_ANNOUNCE/...` | 触发类效果 | ~1,000（EVENT_PHASE 265 + TO_GRAVE 185 + SPSUMMON 164 + DESTROYED 108 + …） |
| `triggerKind` | 必发/可选 | `TRIGGER_F` 202 文件 / `TRIGGER_O` 547 文件 | 触发类效果 | ~750 |
| `targetFlag` | 是否取对象 | `EFFECT_FLAG_CARD_TARGET`(1086) / `EFFECT_FLAG_PLAYER_TARGET`(570) / 无 | 除去、数值、SS、控制 | ~1,300 |
| `canDelay` | 是否可延迟以免错过时点 | `EFFECT_FLAG_DELAY` 341 文件 | 触发类效果 | ~340 |
| `ignoreImmune` | 是否无视抗性 | `EFFECT_FLAG_IGNORE_IMMUNE` 163 文件 | 除去、无效 | ~163 |
| `sequence` / 多段结算 | 分步结算顺序 | `Duel.BreakEffect()` 478 文件 | 复合效果 | ~478 |
| `branch` | 分支选项 | 2~4 分支；`SelectEffect` 127 文件 | 二选一/多选一 | ~130 |
| `targetRange` | 常驻适用区域（己方/对方 × 区域） | `1,1`（双方）、`LOCATION_MZONE,0`（己方怪区）、`LOCATION_ONFIELD,LOCATION_ONFIELD` | 常驻/免疫/封锁/数值 | ~761（SetTargetRange） |
| `deckPosition` | 回卡组位置 | `SEQ_DECKTOP` / `SEQ_DECKBOTTOM` / `SEQ_DECKSHUFFLE` | 回卡组、回收 | ~231（SendtoDeck） |
| `confirm` / `shuffle` | 是否展示、是否洗牌 | `ConfirmCards` 706、`ShuffleDeck` 113、`ShuffleHand` 156、`DisableShuffleCheck` 28 | 检索、回收、卡组操作 | ~750 |
| `position` | 表示形式 | `POS_FACEUP`(1066) / `POS_FACEUP_DEFENSE`(139) / `POS_FACEUP_ATTACK`(81) / `POS_FACEDOWN`(57) / `POS_FACEDOWN_DEFENSE`(50) | SS、表示形式变更、盖放 | ~1,400 |
| `summonFrom` | 特殊召唤来源 | hand / grave / deck / removed / extra（多选） | SS | ~937（CATEGORY_SPECIAL_SUMMON） |
| `reason` | 原因标记 | `REASON_EFFECT/COST/DISCARD/BATTLE/DESTROY/...` | 全部 | ~1,800（REASON_EFFECT 1834） |
| `counterType` + `counterCount` | 指示物种类与数量 | `COUNTER_A` 等；1~N | 指示物 | ~77（:AddCounter） |
| `equipLimit` | 装备限制 | 函数 `e:GetOwner()==c`；对象筛选 | 装备 | ~51（EFFECT_EQUIP_LIMIT） |
| `ritLevelType` / `fusionMatLocation` | 仪式等级判定、融合素材来源 | `RITPROC_EQUAL` / `RITPROC_GREATER`；`LOCATION_HAND|LOCATION_DECK` | 仪式/融合手续 | ~92 + ~126 |
| `coinCount` / `diceCount` | 硬币/骰子数量 | 1~N | 掷骰/硬币 | ~19 |
| `announceType` | 宣言类型 | 卡名 / 数字 / 属性 / 种族 | 宣言 | ~14 |
| `cannotFlags` | 禁止行为位 | SS/攻击/发动/召唤/set/翻转/直接攻击 | 封锁 | ~450 |

---

## 5. 语料佐证

以下为人工完整阅读并核对「lua 实现特征 + 可调参数」的代表脚本（共 38 个，覆盖全部主要能力；括号为行数）：

| 能力 | 代表脚本 |
|---|---|
| 手/墓地 SS（一般） | `E:/tmp/ygocorpus/cs/official/c20201255.lua`（40，剑斗兽的再起） |
| 检索入手（联动检索） | `E:/tmp/ygocorpus/cs/official/c13048472.lua`（40，仪式的下准备，`aux.SelectUnselectGroup` 双卡联动） |
| 破坏（动态数量/顺序） | `E:/tmp/ygocorpus/cs/official/c13210191.lua`（42，岚，`Duel.BreakEffect` + `g:Select`） |
| 回卡组 + 抽卡 | `E:/tmp/ygocorpus/cs/official/c17183908.lua`（40，龙星的光辉，`SendtoDeck(SEQ_DECKTOP)` + 条件抽 2） |
| 回卡组 + 回收 | `E:/tmp/ygocorpus/cs/official/c27980138.lua`（40，加尔多的羽毛笔，双向目标） |
| 回收 + 除外（联动） | `E:/tmp/ygocorpus/cs/official/c24037702.lua`（41，暗之进军，`GetDecktopGroup` + `GetOriginalLevel`） |
| 伤害（触发） | `E:/tmp/ygocorpus/cs/official/c31467372.lua`（40，不死式冥界炮，`SetTargetPlayer/Param` + `GetChainInfo`） |
| 回复 + 直接设定 LP | `E:/tmp/ygocorpus/cs/official/c72233469.lua`（40，Lil-la Rap，`SetLP`+`Recover`+`RegisterFlagEffect`） |
| ATK 变动（参照） | `E:/tmp/ygocorpus/cs/official/c49267971.lua`（40，死角的一击，`SetValue(tc1:GetDefense())`） |
| 表示形式 + 盖放 | `E:/tmp/ygocorpus/cs/official/c31834488.lua`（40，皆既月蚀之书，`CATEGORY_POSITION+SET`、`ChangePosition`） |
| 控制权转移 | `E:/tmp/ygocorpus/cs/official/c15520842.lua`（43，光子手，`Duel.GetControl`） |
| 指示物 | `E:/tmp/ygocorpus/cs/official/c34541863.lua`（40，「A」细胞增殖装置，`counter_place_list`+`AddCounter`） |
| 装备 + 离场回收 | `E:/tmp/ygocorpus/cs/official/c25407406.lua`（40，剑斗兽的斗器，`GetPreviousEquipTarget`） |
| 效果无效化（disable） | `E:/tmp/ygocorpus/cs/official/c30430448.lua`（40，神碑，`EFFECT_DISABLE`+`EFFECT_DISABLE_EFFECT`） |
| 全体丢弃 + SS | `E:/tmp/ygocorpus/cs/official/c19828680.lua`（41，炼狱的契约） |
| Token 生成（复数） | `E:/tmp/ygocorpus/cs/official/c21179143.lua`（42，爬虫妖衍生物，`CreateToken`+`SpecialSummonStep`） |
| 仪式手续（GreaterCode 简写） | `E:/tmp/ygocorpus/cs/official/c47435107.lua`（41，原初的叫唤） |
| 融合手续 | `E:/tmp/ygocorpus/cs/official/c13234975.lua`（40，重炼装融合，`Fusion.CreateSummonEff`） |
| 场地（FZONE + 墓地 SS） | `E:/tmp/ygocorpus/cs/official/c47596607.lua`（41，摩天楼2） |
| 装备 + 免疫范围 | `E:/tmp/ygocorpus/cs/official/c303660.lua`（42，电脑增幅器，`EFFECT_IMMUNE_EFFECT`+`SetTargetRange`） |
| 装备手续 + 装备限制 | `E:/tmp/ygocorpus/cs/official/c30979619.lua`（53，SPYRAL GEAR，`Duel.Equip`+`EFFECT_EQUIP_LIMIT`） |
| 发动代价施加（EFFECT_ACTIVATE_COST） | `E:/tmp/ygocorpus/cs/official/c79323590.lua`（59，魔力之枷） |
| 延迟破坏（DelayedOperation） | `E:/tmp/ygocorpus/cs/official/c44728989.lua`（41，再生之海） |
| 等级变动 + 抽卡 | `E:/tmp/ygocorpus/cs/official/c42548470.lua`（52，摇动的发条秤，`EFFECT_CHANGE_LEVEL`） |
| 硬币 + 攻击无效 | `E:/tmp/ygocorpus/cs/official/c16625614.lua`（46，暗黑圣域，`TossCoin`+`NegateAttack`+`Damage`） |
| 群体封锁 SS | `E:/tmp/ygocorpus/cs/official/c70000776.lua`（43，死灵之祭殿，`EFFECT_CANNOT_SPECIAL_SUMMON`+`EFFECT_SELF_DESTROY`） |
| 装备代价（付 LP 换算数值） | `E:/tmp/ygocorpus/cs/official/c75539614.lua`（51，念力之刃，`AddEquipProcedure` cost + `GetFlagEffectLabel`） |
| 离场区 SS / 回额外 | `E:/tmp/ygocorpus/cs/official/c68223137.lua`（43，一栗通路，`CATEGORY_LEAVE_GRAVE`+`SendtoDeck`/`SendtoExtraP`） |
| 无效发动 + 效果授予 | `E:/tmp/ygocorpus/cs/official/c82661630.lua`（75，恐龙领域，`NegateActivation`+`EFFECT_TYPE_GRANT`+`EFFECT_ADD_TYPE`） |
| 卡组送墓 + 改卡名 | `E:/tmp/ygocorpus/cs/official/c75141056.lua`（43，英雄假面，`CATEGORY_DECKDES`+`EFFECT_CHANGE_CODE`） |
| 仪式 CreateProc（参数表） | `E:/tmp/ygocorpus/cs/official/c95612049.lua`（13，世界逆转，`RITPROC_GREATER`） |
| 融合手续（极简） | `E:/tmp/ygocorpus/cs/official/c39564736.lua`（9） |
| 换位 / 区域封锁 | `E:/tmp/ygocorpus/cs/official/c37480144.lua`（27，阿斯特波特，`MoveSequence`+`SelectDisableField`） |
| 宣言 + 翻顶 | `E:/tmp/ygocorpus/cs/official/c22796548.lua`（45，恶魔的宣告，`AnnounceCard`+`ConfirmDecktop`+`DisableShuffleCheck`） |
| 卡组顶排序 | `E:/tmp/ygocorpus/cs/official/c96677818.lua`（18，魔导书整理，`SortDecktop`） |
| 灵摆送额外 | `E:/tmp/ygocorpus/cs/official/c26237713.lua`（27，灵摆宝藏，`SendtoExtraP`） |
| 仪式手续（EQUAL + 参数表） | `E:/tmp/ygocorpus/cs/official/c69003792.lua`（53，大祭仪，`Ritual.Target/Operation`+`SelectEffect` 分支） |
| 场地维持代价 + 多分支常驻 | `E:/tmp/ygocorpus/cs/official/c33900648.lua`（168，清净世界，全套：LP 维持、属性分支、`EFFECT_ACTIVATE_COST`、`EFFECT_PUBLIC`） |
| 墓地起效（range=GRAVE） | `E:/tmp/ygocorpus/cs/official/c68223137.lua`、`c13234975.lua`（`SetRange(LOCATION_GRAVE)` 386 文件） |

### 统计口径与已知局限
1. 子类占比为启发式（按 `LOCATION_FZONE>装备>仪式>灵摆>quick>SZONE 常驻>纯 activate` 顺序判定），存在重叠归类偏差，仅用于看量级。
2. 速攻魔法在脚本层与通常魔法几乎同构，无法仅靠 Lua 计数；`EFFECT_TYPE_QUICK_*` 仅 16 文件，远少于实际速攻卡数，需结合卡数据 `TYPE_QUICKPLAY`。
3. 个别 API 拼写与常见文档不同，已据语料校正：控制权转移用 `Duel.GetControl`（`Duel.ChangeControl` 本语料 0）；效果无效用注册 `EFFECT_DISABLE`/`EFFECT_DISABLE_EFFECT`（`Duel.DisableEffect` 0）；指示物放置用 `Card:AddCounter`（`Duel.AddCounter` 0）；仪式/融合手续用 `Ritual.AddProc*/CreateProc`、`Fusion.CreateSummonEff`（`Ritual.AddWholeLevelTribute` / `Fusion.AddProc*` 本语料 0，其功能由 `RITPROC_*` 参数承担）。
4. `Duel.DelayedOperation` 不存在，延迟处理通过 `aux.DelayedOperation`（20 文件）或 `RegisterFlagEffect` 实现。
