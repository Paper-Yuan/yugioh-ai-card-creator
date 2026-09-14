# 陷阱卡效果能力汇总

> 数据来源：`E:/tmp/ygocorpus/split/trap.txt` 列出的 2059 个官方陷阱卡 Lua 脚本。
> 统计脚本：`E:/tmp/ygocorpus/extract-trap.js`（原始数据 `E:/tmp/ygocorpus/raw-trap.json`）、
> `E:/tmp/ygocorpus/subtype-stats.js`、`E:/tmp/ygocorpus/trap-pattern-count.js`（统计范围仅限上述陷阱卡清单）。
> 文中所有数字均来自脚本统计（`f`=出现频次，`files`=命中文件数）；未统计到的机制一律不写。

---

## 1. 概要

- 样本：**2059** 个陷阱卡脚本，全部读取成功，0 解析错误。
- **97.6%（2009 files）** 的陷阱卡含 `EFFECT_TYPE_ACTIVATE`（卡的发动效果）；另有极少数纯「墓地/场上常驻锁定」脚本不含卡的发动。
- 陷阱卡效果在 Lua 里由 `Effect.CreateEffect` + 下列 5 类 setter 描述：
  `SetCategory`（效果本质分类）、`SetType`（效果类型/触发方式）、`SetCode`（事件或常驻效果码）、
  `SetProperty`（结算标志）、`SetRange`（驻留区域）。此外 `SetTarget/SetOperation/SetCost/SetCondition` 承载逻辑。
- **`CATEGORY_*` 命中排行（files，最可靠的效果本质信号）**：
  SPECIAL_SUMMON 716、DESTROY 493、TOHAND 282、NEGATE 158、REMOVE 156、SET 147、
  TODECK 131、DAMAGE 129、DRAW 126、ATKCHANGE 126、SEARCH 113、DISABLE 110、
  TOGRAVE 97、POSITION 80、EQUIP 72、RECOVER 54、HANDES 42、CONTROL 38、TOKEN 36、
  DISABLE_SUMMON 27、DEFCHANGE 24、LEAVE_GRAVE 23、DECKDES 23、COUNTER 18、
  FUSION_SUMMON 17、TOEXTRA 14、SUMMON 13、COIN 9、LVCHANGE 7、RELEASE 7、
  DICE 6、ANNOUNCE 5。
- **操作函数（Duel.*）命中排行（files）**：
  SetOperationInfo 1630、IsExistingMatchingCard 1049、SelectTarget 752、GetFirstTarget 683、
  GetLocationCount 653、SpecialSummon 642、SelectMatchingCard 636、GetMatchingGroup 619、
  Destroy 580、SetTargetRange 402、RegisterEffect 353、BreakEffect 351、GetChainInfo 322、
  SendtoGrave 271、SendtoHand 267、Remove 251、Release 238、ConfirmCards 222、SelectYesNo 219、
  SpecialSummonStep 215、SendtoDeck 169、GetFieldGroupCount 164、GetAttacker 163、
  NegateActivation 156、IsChainNegatable 156、Damage 153、SetTargetParam 141、Draw 127、
  GetAttackTarget 116、SelectReleaseGroupCost 102、IsSSetable 94、ChangePosition 87、SSet 85、
  DiscardHand 82、IsPhase 75、SelectEffect 73、NegateEffect 72、Overlay 72、Equip 69、
  IsMainPhase 67、PayLPCost 47、NegateAttack 45、GetTurnPlayer 45、GetTurnCount 43、
  CreateToken 37、NegateSummon 28、GetControl 27、SkipPhase 22 等（完整见 §5）。
- **陷阱区别于怪兽/魔法的核心点**：
  1) 必须盖放才能发动（无主动发动），少数用 `EFFECT_TRAP_ACT_IN_HAND` 破例；
  2) 发动时点用 `SetCode(EVENT_FREE_CHAIN)` + `SetHintTiming` 描述；反击类用 `EVENT_CHAINING` 等被触发事件；
  3) `SetType(EFFECT_TYPE_FIELD/EFFECT_TYPE_QUICK_O)` + `SetRange(LOCATION_SZONE)` 表示发动后成为「永续驻留效果」；
  4) 「无效卡的发动」(NegateActivation) 与「无效效果的发动」(NegateEffect) 在 Lua 里是两个不同函数；
  5) 陷阱怪兽不是 `EFFECT_TYPE_TRAPMONSTER`，而是 `c:AddMonsterAttribute(TYPE_EFFECT|TYPE_TRAP)` + `Duel.SpecialSummonStep`。

---

## 2. 效果性质与陷阱子类分布

以 2059 个文件为分母（`subtype-stats.js`）：

| 子类/性质 | 判定信号 | files | 占比 |
|---|---|---|---|
| 含卡的发动 `EFFECT_TYPE_ACTIVATE` | `SetType(...EFFECT_TYPE_ACTIVATE)` | 2009 | 97.6% |
| 一次性（发动后不驻留 SZONE） | 有 ACTIVATE、无 `SetRange(LOCATION_SZONE)`、非陷阱怪兽 | 1421 | 69.0% |
| 发动后驻留 SZONE（永续/装备等） | 存在 `SetRange(LOCATION_SZONE)` | 547 | 26.6% |
| 永续陷阱（驻留 + 非 QUICK_O） | SZONE 且无 `EFFECT_TYPE_QUICK_O` | 288 | 14.0% |
| 驻留后可再发动的 QUICK_O | SZONE + `EFFECT_TYPE_QUICK_O` | 257 | 12.5% |
| 反击陷阱（启发式） | `EVENT_CHAINING` + `CATEGORY_NEGATE` | 157 | 7.6% |
| 陷阱怪兽 | `AddMonsterAttribute` 或引用 `TYPE_TRAPMONSTER` | 76 | 3.7% |
| 盖放回合可发动 | `EFFECT_TRAP_ACT_IN_SET_TURN` | 28 | 1.4% |
| 从手牌发动 | `EFFECT_TRAP_ACT_IN_HAND` | 30 | 1.5% |
| 墓地/除外区效果的发动（随卡驻留） | SZONE + QUICK_O/IGNITION 且涉及 GRAVE | 131 | 6.4% |
| 触发型效果（非卡的发动） | `EFFECT_TYPE_TRIGGER_*` | 343 | 16.7% |
| 含发动代价 | `SetCost(` | 680 | 33.0% |
| 含频次限制 | `SetCountLimit(` | 857 | 41.6% |
| 取对象发动 | `EFFECT_FLAG_CARD_TARGET` | 879 | 42.7% |
| 取玩家发动 | `EFFECT_FLAG_PLAYER_TARGET` | 316 | 15.3% |
| 伤害步骤可发动 | `EFFECT_FLAG_DAMAGE_STEP` | 221 | 10.7% |
| 同一脚本多个发动效果 | >1 个 `EFFECT_TYPE_ACTIVATE` | 31 | 1.5% |
| 无 SetCategory（纯文本/规则处理） | 有 ACTIVATE 但无 SetCategory | 277 | 13.5% |

- **通常陷阱**（发动即结算、不驻留）约 69%；**永续陷阱**（驻留 SZONE 持续生效）约 26.6%、其中 14% 为被动常驻、12.5% 为驻留后仍可主动发动的 QUICK_O；**反击陷阱**约 7.6%；**陷阱怪兽** 3.7%。
- 「发动 vs 常驻」的 Lua 判别：**发动本体**用 `SetType(EFFECT_TYPE_ACTIVATE)`（`SetCategory/SetProperty` 生效于发动链条），
  **常驻效果**另建一个 `Effect`，`SetType(EFFECT_TYPE_FIELD 或 EFFECT_TYPE_SINGLE [+CONTINUOUS])` + `SetRange(LOCATION_SZONE)`，
  典型恒例是只注册一个空 `EFFECT_TYPE_ACTIVATE`（占位，让卡能发动），功能全在第二个常驻 Effect 上（见 c53239672 Spirit Barrier）。

---

## 3. 能力清单

> 每组先给「通用 Lua 特征」，再逐条能力。`设计器覆盖` 依据 `docs/DESIGNER_SUPPORT_BASELINE.md` 现有能力清单判定。

### 3.1 发动条件与盖放限制

#### 3.1.1 自由时点发动 / 时点限定
- **lua 实现特征**：
  ```lua
  e1:SetType(EFFECT_TYPE_ACTIVATE)
  e1:SetCode(EVENT_FREE_CHAIN)
  e1:SetHintTiming(0,TIMINGS_CHECK_MONSTER_E)  -- 或 0,TIMING_END_PHASE / TIMING_DAMAGE_STEP 等
  ```
  陷阱发动机几乎全是 `EVENT_FREE_CHAIN`（**1519 files**，占 73.8%），靠 `SetHintTiming` 限定可选时点。
- **命中文件数 / 出现频次**：`EVENT_FREE_CHAIN` 1519 files / 1929 次；`SetHintTiming` 分布：`0,TIMING_END_PHASE` 220 files、`0,TIMINGS_CHECK_MONSTER_E` 139、`0,TIMING_STANDBY_PHASE|TIMING_MAIN_END|TIMINGS_CHECK_MONSTER_E` 129、`TIMING_DAMAGE_STEP` 94、`0,TIMINGS_CHECK_MONSTER` 52。
- **自定义参数**：显示时点（0=任意可发动时点 / END_PHASE / STANDBY+MAIN_END / DAMAGE_STEP / CHECK_MONSTER 等）、是否战斗阶段、是否对手回合。
- **设计器覆盖**：**部分支持**（timing 已有 `quick_free/quick_oppo_turn/quick_oppo_main/quick_chain`，但没有自由选择 `SetHintTiming` 位掩码、伤害步骤、END PHASE/STANDBY 等细粒度时点）。

#### 3.1.2 盖放回合即可发动 / 从手牌发动 / 不可发动
- **lua 实现特征**：
  ```lua
  -- 盖放回合可发动
  e:SetType(EFFECT_TYPE_SINGLE); e:SetCode(EFFECT_TRAP_ACT_IN_SET_TURN)
  -- 从手牌发动
  e:SetType(EFFECT_TYPE_SINGLE); e:SetCode(EFFECT_TRAP_ACT_IN_HAND); e:SetCondition(s.handcon)
  -- 禁止发动（常驻封锁，通常作用于对手）
  e:SetCode(EFFECT_CANNOT_ACTIVATE); e:SetValue(s.aclimit)  -- 例:loc==LOCATION_HAND and re:IsMonsterEffect()
  ```
  从手牌发动的判定常见 `c:IsStatus(STATUS_ACT_FROM_HAND)`、`IsPreviousPosition(POS_FACEDOWN)`。
- **命中文件数 / 出现频次**：`EFFECT_TRAP_ACT_IN_HAND` 30 files、`EFFECT_TRAP_ACT_IN_SET_TURN` 28 files、
  `EFFECT_FLAG_SET_AVAILABLE` 65 files、`EFFECT_CANNOT_ACTIVATE` 46 files、`STATUS_ACT_FROM_HAND` 8、
  `IsPreviousPosition(POS_FACEDOWN)` 30。**`EFFECT_TRAP_CANNOT_ACTIVATE` 在本语料 0 命中**（该常量未被官方陷阱使用）。
- **自定义参数**：破例类型（盖放回合可发动 / 从手牌发动）、破例条件（场上无卡、指定字段怪兽数量等）、
  封锁目标（谁/什么效果不能发动，如手牌怪兽效果）。
- **设计器覆盖**：**未支持**（规则文本里有 cannotTrigger，但无「盖放回合可发动/手牌发动」；发动封锁也未列）。

#### 3.1.3 发动代价（Cost）
- **lua 实现特征**：`e:SetCost(s.cost)` 内做 `Duel.DiscardHand/PayLPCost/Release/Remove/SendtoGrave`，
  部分用 `Cost.PayLP(n)` 助手（38 files）；注意 **`SetCost` 段只允许操作代价，不得做效果处理**；代价判定发生在 `chk==0` 分支。
  代价操作函数见下表。
- **命中文件数 / 出现频次**：含 `SetCost` 680 files (33.0%)；`Duel.SelectReleaseGroupCost` 102 files、
  `Duel.CheckReleaseGroupCost` 102 files、`Duel.DiscardHand` 82 files、`Duel.PayLPCost` 47 files、
  `Duel.Release` 238 files、`Duel.SendtoGrave` 271 files、`Duel.Remove` 251 files、`Cost.PayLP` 38 files。
- **自定义参数**：代价类型（支付 LP / 弃手 / 解放怪兽 / 除外墓地 / 送墓 / 卡组顶送墓 等）、数量、卡类筛选（字段/种族/属性/等级）、
  是否可为代价（`IsAbleToGraveAsCost`/`IsDiscardable`/`IsReleasable` 等）、是否需要「至少 N 张」。
- **设计器覆盖**：**已支持**（cost 列表：pay_lp/discard_self/release_self/detach_xyz/discard_one/discard_n/banish_one_gy/banish_gy_n/banish_hand_n/release_monster_n/send_to_grave_n/mill_deck_n，数量与卡类可自定义）。

### 3.2 反击与无效

#### 3.2.1 无效卡的发动并破坏（反击陷阱核心）
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_NEGATE+CATEGORY_DESTROY)
  e1:SetType(EFFECT_TYPE_ACTIVATE); e1:SetCode(EVENT_CHAINING)
  e1:SetCondition(function(e,tp,eg,ep,ev,re,r,rp)
     return re:IsMonsterEffect() and Duel.IsChainNegatable(ev) end)
  e1:SetTarget(...); Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
  function s.activate(...) if Duel.NegateActivation(ev) and re:GetHandler():IsRelateToEffect(re) then Duel.Destroy(eg,REASON_EFFECT) end end
  ```
  条件里常配 `Duel.IsChainNegatable(ev)`（可无效）或 `Duel.IsChainDisablable(ev)`（可失效）。
- **命中文件数 / 出现频次**：`CATEGORY_NEGATE` 158 files；`CATEGORY_NEGATE+CATEGORY_DESTROY` 93 files；
  `EVENT_CHAINING` 278 files；`Duel.NegateActivation` 156 files；`Duel.IsChainNegatable` 156 files；反击启发式命中 157 files。
- **自定义参数**：被无效对象的范围（怪兽/魔法/陷阱效果、召唤、特定字段）、是否同时破坏、
  无效「发动」还是无效「效果」、条件筛选函数（`re:GetCode()`、`re:IsHasType()`、控制者 `rp==1-tp`）。
- **设计器覆盖**：**部分支持**（有 negate_and_destroy / negate_activation / negate_punish，但不能精确设定无效对象类别与 `EVENT_CHAINING` 反击条件）。

#### 3.2.2 无效效果（不破坏）
- **lua 实现特征**：`Duel.NegateEffect(ev)`；或不无效发动而给目标挂 `EFFECT_DISABLE` / `EFFECT_DISABLE_EFFECT`。
  ```lua
  Duel.SetOperationInfo(0,CATEGORY_DISABLE,eg,1,0,0)
  function s.activate(...) Duel.NegateEffect(ev) end
  ```
- **命中文件数 / 出现频次**：`Duel.NegateEffect` 72 files；`CATEGORY_DISABLE` 110 files；
  `EFFECT_DISABLE` 102 files；`EFFECT_DISABLE_EFFECT` 66 files；`EFFECT_DISABLE_TRAPMONSTER` 10 files。
- **自定义参数**：无效对象（怪兽效果/魔陷效果）、持续时间（`SetReset`：`RESETS_STANDARD_PHASE_END` 等）、是否同时禁止发动。
- **设计器覆盖**：**部分支持**（negate_* 系列可覆盖一部分，但 DISABLE 的挂载时长/对象细节不可配）。

#### 3.2.3 无效召唤 / 无效攻击
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_DISABLE_SUMMON+CATEGORY_DESTROY)
  e1:SetCode(EVENT_SPSUMMON); e1:SetCondition(function(...) return ep==1-tp and #eg==1 and Duel.GetCurrentChain(true)==0 end)
  Duel.NegateSummon(eg); Duel.Destroy(eg,REASON_EFFECT)
  ```
  无效攻击用 `Duel.NegateAttack()`。
- **命中文件数 / 出现频次**：`CATEGORY_DISABLE_SUMMON` 27 files；`Duel.NegateSummon` 28 files；
  `Duel.NegateAttack` 45 files；`EVENT_SPSUMMON` 27 files；`EVENT_ATTACK_ANNOUNCE` 144 files。
- **自定义参数**：无效对象（特殊召唤/通常召唤/攻击宣言）、召唤类型（融合/同调/超量/灵摆/连接）、是否连锁限制。
- **设计器覆盖**：**未支持**。

#### 3.2.4 无效后追加惩罚 / 相关连锁无效
- **lua 实现特征**：`Duel.NegateRelatedChain(tc,RESET_TURN_SET)`、`Duel.BreakEffect()` 分段、`Duel.ChangeChainOperation`、`Duel.SetChainLimit(aux.FALSE)`。
- **命中文件数 / 出现频次**：`Duel.NegateRelatedChain` 31 files；`Duel.BreakEffect` 351 files；
  `Duel.ChangeChainOperation` 7 files；`Duel.SetChainLimit` 10 files；`Duel.DisableShuffleCheck` 15 files。
- **自定义参数**：惩罚动作（破坏/除外/削血/弃手）、追加目标、连锁操作改写。
- **设计器覆盖**：**部分支持**（negate_punish 覆盖「无效+惩罚」，但追加动作种类有限）。

### 3.3 调度与检索

#### 3.3.1 卡组检索加入手牌
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
  local g=Duel.SelectMatchingCard(tp,s.filter,tp,LOCATION_DECK,0,1,1,nil)
  Duel.SendtoHand(g,nil,REASON_EFFECT); Duel.ConfirmCards(1-tp,g)
  ```
- **命中文件数 / 出现频次**：`CATEGORY_TOHAND+CATEGORY_SEARCH` 61 files、`CATEGORY_SEARCH` 113 files、`CATEGORY_TOHAND` 282 files；
  `Duel.SendtoHand` 267 files、`Duel.ConfirmCards` 222 files。
- **自定义参数**：检索数量、卡类/字段筛选、是否公开、是否「加入手牌或特殊召唤」二选一、`MustBe` 限制。
- **设计器覆盖**：**已支持**（search_deck）。

#### 3.3.2 卡组堆墓 / 送墓
- **lua 实现特征**：`Duel.SendtoGrave(g,REASON_EFFECT)`，或 `Duel.DiscardDeck` 削卡组顶；可选 `Duel.ConfirmDecktop`/`Duel.GetDecktopGroup`。
- **命中文件数 / 出现频次**：`CATEGORY_TOGRAVE` 97 files、`CATEGORY_DECKDES` 23 files；
  `Duel.SendtoGrave` 271 files、`Duel.DiscardDeck` 18 files、`Duel.GetDecktopGroup` 19 files、
  `Duel.ConfirmDecktop` 15 files、`Duel.SortDeckbottom` 8 files。
- **自定义参数**：数量、卡类/字段、从卡组顶/卡组任意、是否确认、是否洗切。
- **设计器覆盖**：**已支持**（dump_deck / mill_deck_n）。

#### 3.3.3 返回卡组 / 额外卡组
- **lua 实现特征**：`Duel.SendtoDeck(g,nil,SEQ_DECKSHUFFLE|SEQ_DECKTOP|SEQ_DECKBOT,REASON_EFFECT)`；
  额外卡组用 `SetCategory(CATEGORY_TOEXTRA)` / `IsAbleToExtra()`。
- **命中文件数 / 出现频次**：`CATEGORY_TODECK` 131 files、`CATEGORY_TOEXTRA` 14 files；
  `Duel.SendtoDeck` 169 files。
- **自定义参数**：放置位置（洗切/卡组顶/卡组底/额外卡组）、数量、来源区域。
- **设计器覆盖**：**未支持**（无 to_deck/to_extra 动作；salvage_extra 不含返回）。

#### 3.3.4 卡组顶/底操作与抽卡
- **lua 实现特征**：`Duel.SortDeckbottom`、`Duel.SortDecktop`、`Duel.MoveToDeckTop/Bottom`；抽卡 `Duel.Draw(p,n,REASON_EFFECT)`。
- **命中文件数 / 出现频次**：`Duel.Draw` 127 files、`CATEGORY_DRAW` 126 files、`Duel.SortDeckbottom` 8 files。
- **自定义参数**：抽卡数量、抽卡对象（己方/对手/双方）、是否跳过洗切、卡组顶/底放置。
- **设计器覆盖**：**已支持**（draw_cards 抽卡）；**未支持**卡组顶/底排序与放置。

### 3.4 特殊召唤

#### 3.4.1 从手牌/卡组/墓地/除外区特殊召唤
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
  -- 检查位置与可召唤性
  Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
  Duel.SpecialSummonStep(tc,0,tp,tp,false,false,POS_FACEUP)  -- 或 Duel.SpecialSummon
  Duel.SpecialSummonComplete()
  ```
- **命中文件数 / 出现频次**：`CATEGORY_SPECIAL_SUMMON` 716 files（最高频效果本质）；
  `Duel.SpecialSummon` 642 files、`Duel.SpecialSummonStep` 215 files、`Duel.GetLocationCount` 653 files、
  `Duel.GetLocationCountFromEx` 72 files。
- **自定义参数**：来源区域（手/卡组/墓/除外/额外）、数量、表示形式（攻/守、表/里）、
  是否无视召唤条件/是否算作正规召唤、字段/种族/属性/等级筛选、是否同步（`SpecialSummonStep`+`Complete`）。
- **设计器覆盖**：**已支持**（special_summon_self/hand/deck/revive_grave），**未支持**从除外区召唤、表示形式选择、无视条件。

#### 3.4.2 融合 / 同调 / 超量 / 连接召唤（手续召唤）
- **lua 实现特征**：
  ```lua
  local e1=Fusion.CreateSummonEff(c,filter,matfilter,...)   -- 融合
  Duel.XyzSummon(tp,tc) / Duel.SynchroSummon(tp,tc,...) / Duel.LinkSummon(tp,tc,...)
  e1:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_FUSION_SUMMON)
  ```
- **命中文件数 / 出现频次**：`CATEGORY_FUSION_SUMMON` 17 files；`Fusion.CreateSummonEff` 11 files、`Fusion.SummonEffTG` 14 files；
  `Duel.XyzSummon` 10 files、`Duel.SynchroSummon` 11 files、`Duel.LinkSummon` 7 files；
  `Duel.Overlay` 72 files（超量素材）。
- **自定义参数**：召唤种类、召唤素材筛选（场上/手/墓/除外）、素材是否送墓/除外/回卡组、
  召唤目标（额外卡组）、是否视为正规召唤、素材数量。
- **设计器覆盖**：**部分支持**（ruleTexts 有 procSummonType 生成手续文本，但缺「发动效果直接执行手续召唤」的动作）。

#### 3.4.3 衍生物生成
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_TOKEN)
  Duel.IsPlayerCanSpecialSummonMonster(tp,id+1,0,TYPES_TOKEN,1000,1000,4,RACE_FIEND,ATTRIBUTE_DARK)
  local token=Duel.CreateToken(tp,id+1); Duel.SpecialSummon(token,0,tp,tp,false,false,POS_FACEUP)
  ```
- **命中文件数 / 出现频次**：`CATEGORY_TOKEN` 36 files；`Duel.CreateToken` 37 files。
- **自定义参数**：衍生物数量、攻/守、等级、种族、属性、卡名/setcode、表示形式。
- **设计器覆盖**：**未支持**。

#### 3.4.4 置于场上 / 移动
- **lua 实现特征**：`Duel.MoveToField(c,tp,tp,LOCATION_MZONE,POS_FACEDOWN_DEFENSE,true)`、`Duel.SSet(tp,c)` 盖放。
- **命中文件数 / 出现频次**：`Duel.MoveToField` 33 files、`Duel.SSet` 85 files、`CATEGORY_SET` 147 files。
- **自定义参数**：目标区域（怪兽区/魔陷区/场地区/灵摆区）、表示形式、是否视为召唤。
- **设计器覆盖**：**未支持**。

### 3.5 除去与移动

#### 3.5.1 破坏
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_DESTROY); e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
  Duel.Destroy(g,REASON_EFFECT)
  ```
- **命中文件数 / 出现频次**：`CATEGORY_DESTROY` 493 files；`Duel.Destroy` 580 files；
  取对象破坏用 `EFFECT_FLAG_CARD_TARGET` 879 files。
- **自定义参数**：目标范围（场上/双方/仅对手/魔陷区/怪兽区）、数量、是否取对象、
  是否要求破坏后追加（`Duel.GetOperatedGroup` 63 files 用于统计被破坏的卡）。
- **设计器覆盖**：**已支持**（destroy_target/wipe_oppo_monsters/wipe_oppo_spells/wipe_oppo_all）。

#### 3.5.2 除外（Remove）
- **lua 实现特征**：`Duel.Remove(g,POS_FACEUP,REASON_EFFECT)`，可选 `CATEGORY_REMOVE` + `EFFECT_FLAG_CARD_TARGET`。
- **命中文件数 / 出现频次**：`CATEGORY_REMOVE` 156 files；`Duel.Remove` 251 files。
- **自定义参数**：除外数量、区域、表侧/里侧、是否回归（`EFFECT_LEAVE_FIELD_REDIRECT` 归位）。
- **设计器覆盖**：**已支持**（banish_target / choice_destroy_or_banish）。

#### 3.5.3 返回手牌 / 弹回
- **lua 实现特征**：`Duel.SendtoHand(g,nil,REASON_EFFECT)`，配 `CATEGORY_TOHAND`。
- **命中文件数 / 出现频次**：`CATEGORY_TOHAND` 282 files；`Duel.SendtoHand` 267 files。
- **自定义参数**：数量、来源（场上/墓地）、对象（取对象/非取对象）、是否公开。
- **设计器覆盖**：**已支持**（to_hand_target）。

#### 3.5.4 送墓
- **lua 实现特征**：`Duel.SendtoGrave(g,REASON_EFFECT)`。
- **命中文件数 / 出现频次**：`CATEGORY_TOGRAVE` 97 files；`Duel.SendtoGrave` 271 files。
- **自定义参数**：数量、来源区域、是否算作「被效果送墓」。
- **设计器覆盖**：**部分支持**（dump_deck 是卡组送墓；场上/手牌强制送墓未直接列）。

#### 3.5.5 解放 / 释放
- **lua 实现特征**：`Duel.Release(g,REASON_EFFECT)`；代价型用 `Duel.CheckReleaseGroupCost`/`SelectReleaseGroupCost`。
- **命中文件数 / 出现频次**：`CATEGORY_RELEASE` 7 files；`Duel.Release` 238 files；
  `Duel.SelectReleaseGroup` 109 files、`SelectReleaseGroupCost` 102 files。
- **自定义参数**：数量、卡类/字段/等级筛选、是否作代价。
- **设计器覆盖**：**已支持**（release_self/release_monster_n 作代价）；作为**效果**的解放**未支持**。

#### 3.5.6 送去额外卡组 / 卡组
- **lua 实现特征**：`Duel.SendtoDeck`、`Duel.SendtoExtraP`、`CATEGORY_TOEXTRA`。
- **命中文件数 / 出现频次**：`CATEGORY_TOEXTRA` 14 files、`Duel.SendtoDeck` 169 files（含 TODECK）。
- **自定义参数**：目标区域（卡组/额外卡组）、位置（顶/底/洗切）。
- **设计器覆盖**：**未支持**。

#### 3.5.7 墓地/除外区归来
- **lua 实现特征**：`CATEGORY_LEAVE_GRAVE` 配合特殊召唤或加入手牌（见 c74100225 类）。
- **命中文件数 / 出现频次**：`CATEGORY_LEAVE_GRAVE` 23 files。
- **自定义参数**：来源（墓地/除外区）、去向（场上/手牌/卡组）。
- **设计器覆盖**：**部分支持**（revive_grave 覆盖墓地→场上之一）。

### 3.6 数值变动

#### 3.6.1 攻击力/守备力增减（永续）
- **lua 实现特征**：
  ```lua
  e:SetType(EFFECT_TYPE_FIELD); e:SetRange(LOCATION_SZONE); e:SetCode(EFFECT_UPDATE_ATTACK)
  e:SetTargetRange(LOCATION_MZONE,0); e:SetTarget(aux.TargetBoolFunction(...)); e:SetValue(s.val)
  ```
- **命中文件数 / 出现频次**：`EFFECT_UPDATE_ATTACK` 159 files、`CATEGORY_ATKCHANGE` 126 files；
  `EFFECT_UPDATE_DEFENSE` 38 files、`CATEGORY_DEFCHANGE` 24 files。
- **自定义参数**：数值（固定/按数量×值/参照攻击力）、目标范围、是否只对己方、是否可被无效。
- **设计器覆盖**：**已支持**（atk_boost）；DEF 变动**部分支持**。

#### 3.6.2 攻/守变更（最终值、base 值、单次）
- **lua 实现特征**：`EFFECT_SET_ATTACK_FINAL` / `EFFECT_SET_DEFENSE_FINAL` / `EFFECT_SET_ATTACK` / `EFFECT_SET_BASE_ATTACK` / `EFFECT_SET_BASE_DEFENSE`；
  配 `SetReset(RESETS_STANDARD_PHASE_END)`。
- **命中文件数 / 出现频次**：`EFFECT_SET_ATTACK_FINAL` 41 files、`EFFECT_SET_DEFENSE_FINAL` 20 files、
  `EFFECT_SET_ATTACK` 11 files、`EFFECT_SET_BASE_ATTACK` 9 files、`EFFECT_SET_BASE_DEFENSE` 6 files。
- **自定义参数**：变为（固定值/当前值的一半/参照值）、是否修改基础值、持续时长。
- **设计器覆盖**：**部分支持**（atk_boost 为增减；「设为固定值」**未支持**）。

#### 3.6.3 等级/阶级变动
- **lua 实现特征**：`EFFECT_UPDATE_LEVEL` / `EFFECT_CHANGE_LEVEL` / `EFFECT_CHANGE_LEVEL_FINAL` / `EFFECT_UPDATE_RANK` / `EFFECT_CHANGE_RANK`。
- **命中文件数 / 出现频次**：`EFFECT_CHANGE_LEVEL` 18 files、`EFFECT_UPDATE_LEVEL` 14 files、
  `CATEGORY_LVCHANGE` 7 files、`EFFECT_CHANGE_LEVEL_FINAL` 2 files、`EFFECT_UPDATE_RANK`/`EFFECT_CHANGE_RANK` 各 1 file（低频）。
- **自定义参数**：增减量、目标等级/阶级、时长。
- **设计器覆盖**：ruleTexts 有 ruleLevel 仅卡面；**效果层面未支持**。

#### 3.6.4 伤害 / 回复
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_DAMAGE); e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
  Duel.SetTargetPlayer(1-tp); Duel.SetTargetParam(dam); Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,dam)
  Duel.Damage(p,dam,REASON_EFFECT)   -- 回复用 Duel.Recover
  ```
- **命中文件数 / 出现频次**：`CATEGORY_DAMAGE` 129 files、`Duel.Damage` 153 files；`CATEGORY_RECOVER` 54 files、`Duel.Recover` 58 files；
  `Duel.SetTargetParam` 141 files。
- **自定义参数**：伤害/回复对象（己方/对手/双方）、数值（固定/按数量×值）、伤害来源 REASON、是否效果伤害。
- **设计器覆盖**：**已支持**（burn_damage / gain_lp）。

#### 3.6.5 生命值设定 / 跳过回复
- **lua 实现特征**：`Duel.SetLP(p,val)`；`EFFECT_REVERSE_RECOVER`、`EFFECT_REVERSE_DAMAGE`。
- **命中文件数 / 出现频次**：`Duel.SetLP` 14 files、`EFFECT_REVERSE_RECOVER` 4 files、`EFFECT_REVERSE_DAMAGE` 3 files（低频）。
- **自定义参数**：设定值、对象。
- **设计器覆盖**：**未支持**。

### 3.7 战斗相关

#### 3.7.1 战斗伤害变更 / 防止
- **lua 实现特征**：
  ```lua
  e:SetType(EFFECT_TYPE_FIELD); e:SetRange(LOCATION_SZONE); e:SetCode(EFFECT_AVOID_BATTLE_DAMAGE); e:SetTargetRange(1,0)
  -- 或 EFFECT_CHANGE_DAMAGE / EFFECT_NO_EFFECT_DAMAGE（配 SetValue 函数）
  ```
- **命中文件数 / 出现频次**：`EFFECT_AVOID_BATTLE_DAMAGE` 21 files、`EFFECT_CHANGE_DAMAGE` 26 files、
  `EFFECT_NO_EFFECT_DAMAGE` 14 files、`EFFECT_CHANGE_BATTLE_DAMAGE` 9 files、`EFFECT_NO_BATTLE_DAMAGE` 5 files、
  `EFFECT_REFLECT_DAMAGE` 3 files、`EFFECT_REFLECT_BATTLE_DAMAGE` 1 file。
- **自定义参数**：变更方式（归零/变值）、作用对象（己方/对手）、伤害类型（战斗/效果）。
- **设计器覆盖**：**未支持**（immune_all 不等于伤害防止）。

#### 3.7.2 攻击限制（不能攻击 / 必须攻击 / 只能攻击某怪）
- **lua 实现特征**：`EFFECT_CANNOT_ATTACK` / `EFFECT_MUST_ATTACK` / `EFFECT_MUST_ATTACK_MONSTER` /
  `EFFECT_ONLY_ATTACK_MONSTER` / `EFFECT_CANNOT_DIRECT_ATTACK` / `EFFECT_CANNOT_ATTACK_ANNOUNCE`。
- **命中文件数 / 出现频次**：`EFFECT_CANNOT_ATTACK` 33 files、`EFFECT_CANNOT_ATTACK_ANNOUNCE` 14 files、
  `EFFECT_MUST_ATTACK` 13 files、`EFFECT_MUST_ATTACK_MONSTER` 9 files、`EFFECT_CANNOT_DIRECT_ATTACK` 20 files、
  `EFFECT_ONLY_ATTACK_MONSTER` 3 files。
- **自定义参数**：限制类型、目标筛选（等级/种族/攻击力）、持续时间。
- **设计器覆盖**：ruleTexts 有 cannotAttack/canDirectAttack（卡面文本），**效果层面未支持**。

#### 3.7.3 攻击对象转移 / 强制战斗
- **lua 实现特征**：`Duel.ChangeAttackTarget`、`Duel.ChangeTargetCard`、`EFFECT_CANNOT_SELECT_BATTLE_TARGET`、`EFFECT_IGNORE_BATTLE_TARGET`、`Duel.ForceAttack`。
- **命中文件数 / 出现频次**：`EFFECT_CANNOT_SELECT_BATTLE_TARGET` 11 files、`EFFECT_IGNORE_BATTLE_TARGET` 4 files、`Duel.ChangeAttackTarget` 8 files、`Duel.ChangeTargetCard` 9 files。
- **自定义参数**：新目标、触发条件。
- **设计器覆盖**：**未支持**。

#### 3.7.4 贯穿 / 多次攻击 / 守备表示攻击
- **lua 实现特征**：`EFFECT_PIERCE`、`EFFECT_EXTRA_ATTACK`、`EFFECT_EXTRA_ATTACK_MONSTER`、`EFFECT_DEFENSE_ATTACK`、`EFFECT_FIRST_ATTACK`、`EFFECT_BP_TWICE`。
- **命中文件数 / 出现频次**：`EFFECT_PIERCE` 8 files、`EFFECT_EXTRA_ATTACK` 8 files、`EFFECT_EXTRA_ATTACK_MONSTER` 3 files、
  `EFFECT_DEFENSE_ATTACK` 2 files、`EFFECT_FIRST_ATTACK` 1 file、`EFFECT_BP_TWICE` 1 file（低频）。
- **自定义参数**：次数、是否贯穿、伤害计算方式。
- **设计器覆盖**：**未支持**。

#### 3.7.5 战斗相关时点发动
- **lua 实现特征**：`EVENT_ATTACK_ANNOUNCE`（144 files）、`EVENT_BE_BATTLE_TARGET`、`EVENT_PRE_DAMAGE_CALCULATE`、
  `EVENT_BATTLE_DAMAGE`、`EVENT_BATTLED`、`EVENT_DAMAGE_STEP_END`；配 `Duel.GetAttacker`/`Duel.GetAttackTarget`/`Duel.GetBattleDamage`。
- **命中文件数 / 出现频次**：`EVENT_ATTACK_ANNOUNCE` 144 files、`EVENT_BE_BATTLE_TARGET` 25 files、
  `EVENT_PRE_DAMAGE_CALCULATE` 20 files、`EVENT_BATTLE_DAMAGE` 22 files、`EVENT_BATTLED` 13 files、
  `Duel.GetAttacker` 163 files、`Duel.GetAttackTarget` 116 files、`Duel.GetBattleDamage` 9 files。
- **自定义参数**：触发时点（攻击宣言/成为目标/伤害计算前/战斗伤害/战斗后）、对象判定。
- **设计器覆盖**：timing 中有 `battle_destroy_oppo`/`destroyed_battle_or_effect`，但攻击宣言/伤害计算时点**部分支持**。

### 3.8 控制权与表示形式

#### 3.8.1 表示形式变更
- **lua 实现特征**：
  ```lua
  Duel.ChangePosition(g,POS_FACEUP_DEFENSE,0,POS_FACEUP_ATTACK,0)
  ```
- **命中文件数 / 出现频次**：`CATEGORY_POSITION` 80 files；`Duel.ChangePosition` 87 files。
- **自定义参数**：目标表示（表攻/表守/里守）、是否强制、是否只对自己。
- **设计器覆盖**：**未支持**（ruleTexts 有 cannotChangePosition，非效果）。

#### 3.8.2 控制权转移 / 交换
- **lua 实现特征**：`Duel.GetControl(tc,tp[,phase,count])`、`Duel.SwapControl(g1,g2)`、`EFFECT_SET_CONTROL`。
- **命中文件数 / 出现频次**：`CATEGORY_CONTROL` 38 files；`Duel.GetControl` 27 files、`Duel.SwapControl` 7 files、`EFFECT_SET_CONTROL` 8 files。
- **自定义参数**：转移方向、目标、持续时长、是否交换。
- **设计器覆盖**：**未支持**。

### 3.9 卡组/手卡/墓地/除外区操作

#### 3.9.1 手牌破坏 / 弃手（效果）
- **lua 实现特征**：`Duel.DiscardHand(p,filter,min,max,REASON_EFFECT|REASON_DISCARD)`；随机弃用 `RandomSelect`。
- **命中文件数 / 出现频次**：`CATEGORY_HANDES` 42 files；`Duel.DiscardHand` 82 files。
- **自定义参数**：对象（己方/对手/双方）、数量、随机/选择、卡类筛选。
- **设计器覆盖**：**部分支持**（discard_one/discard_n 为**代价**；作为**效果**的弃手未直接列）。

#### 3.9.2 手牌/卡组确认与宣言
- **lua 实现特征**：`Duel.ConfirmCards`、`Duel.ConfirmDecktop`、`Duel.AnnounceCard`、`Duel.AnnounceNumber`、`Duel.AnnounceAttribute`、`Duel.AnnounceRace`。
- **命中文件数 / 出现频次**：`Duel.ConfirmCards` 222 files、`CATEGORY_ANNOUNCE` 5 files、
  `Duel.AnnounceAttribute` 11 files、`Duel.AnnounceNumber` 11 files、`Duel.AnnounceCard` 7 files、`Duel.AnnounceRace` 6 files。
- **自定义参数**：宣言种类（卡名/数值/属性/种族/等级）、范围、确认对象。
- **设计器覆盖**：**未支持**。

#### 3.9.3 卡组顶操作（确认/排列/放置）
- **lua 实现特征**：`Duel.GetDecktopGroup`、`Duel.SortDeckbottom`、`Duel.MoveToDeckTop/Bottom`。
- **命中文件数 / 出现频次**：`Duel.GetDecktopGroup` 19 files、`Duel.ConfirmDecktop` 15 files、`Duel.SortDeckbottom` 8 files（低频）。
- **自定义参数**：张数、位置。
- **设计器覆盖**：**未支持**。

#### 3.9.4 超量素材操作
- **lua 实现特征**：`Duel.Overlay(tc,mg)`、`Duel.GetOverlayGroup`、`Duel.RemoveOverlayCard`、`Duel.CheckRemoveOverlayCard`。
- **命中文件数 / 出现频次**：`Duel.Overlay` 72 files、`Duel.GetOverlayGroup` 2 files、
  `Duel.RemoveOverlayCard` 9 files、`Duel.CheckRemoveOverlayCard` 9 files。
- **自定义参数**：素材数量、去向（墓地/除外）、是否任意。
- **设计器覆盖**：cost 含 detach_xyz（取下素材作代价）；作为效果**部分支持**。

### 3.10 抗性与免疫

#### 3.10.1 效果免疫
- **lua 实现特征**：
  ```lua
  e:SetType(EFFECT_TYPE_FIELD); e:SetCode(EFFECT_IMMUNE_EFFECT); e:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
  e:SetValue(function(e,te,c) ... return te:IsMonsterEffect() ... end)
  ```
- **命中文件数 / 出现频次**：`EFFECT_IMMUNE_EFFECT` 42 files（配合 `SetOperation` 或 `Duel.RegisterEffect`）。
- **自定义参数**：免疫范围（怪兽效果/魔法/陷阱）、免疫目标（种族/属性/等级/字段）、豁免条件。
- **设计器覆盖**：**已支持**（immune_all）；细化筛选**未支持**。

#### 3.10.2 不被破坏
- **lua 实现特征**：`EFFECT_INDESTRUCTABLE_EFFECT` / `EFFECT_INDESTRUCTABLE_BATTLE` / `EFFECT_INDESTRUCTABLE_COUNT` / `EFFECT_INDESTRUCTABLE`。
- **命中文件数 / 出现频次**：`EFFECT_INDESTRUCTABLE_BATTLE` 54 files、`EFFECT_INDESTRUCTABLE_EFFECT` 45 files、
  `EFFECT_INDESTRUCTABLE_COUNT` 9 files、`EFFECT_INDESTRUCTABLE` 1 file。
- **自定义参数**：免疫来源（效果/战斗/两者）、次数限制（`SetCountLimit`）。
- **设计器覆盖**：**未支持**（immune_all 是效果免疫，不含「不被破坏」）。

#### 3.10.3 破坏替代 / 移动重定向 / 抗性替换
- **lua 实现特征**：
  ```lua
  e:SetCode(EFFECT_DESTROY_REPLACE); e:SetTarget(s.desreptg)   -- 以送墓等方式代替破坏
  e:SetCode(EFFECT_LEAVE_FIELD_REDIRECT); e:SetValue(LOCATION_DECKBOT)  -- 离场去向改写
  ```
- **命中文件数 / 出现频次**：`EFFECT_DESTROY_REPLACE` 23 files、`EFFECT_LEAVE_FIELD_REDIRECT` 44 files、
  `EFFECT_TO_GRAVE_REDIRECT` 6 files、`EFFECT_BATTLE_DESTROY_REDIRECT` 2 files、
  `EFFECT_DESTROY_SUBSTITUTE` 1 file、`EFFECT_SEND_REPLACE` 1 file、`EFFECT_COST_REPLACE` 2 files（低频）、
  `EFFECT_TO_HAND_REDIRECT`/`EFFECT_TO_DECK_REDIRECT` 各 1 file（低频）。
- **自定义参数**：替代代价、改写去向（卡组顶/底/手牌/墓/除外）、适用范围。
- **设计器覆盖**：**未支持**。

#### 3.10.4 自我离场 / 自毁
- **lua 实现特征**：`EFFECT_SELF_TOGRAVE`、`EFFECT_SELF_DESTROY`、`EFFECT_REMAIN_FIELD`。
- **命中文件数 / 出现频次**：`EFFECT_SELF_TOGRAVE` 8 files、`EFFECT_SELF_DESTROY` 7 files、`EFFECT_REMAIN_FIELD` 3 files（低频）。
- **自定义参数**：触发条件、去向、是否必发。
- **设计器覆盖**：**未支持**。

### 3.11 限制与封锁

#### 3.11.1 召唤/特殊召唤封锁
- **lua 实现特征**：
  ```lua
  e:SetType(EFFECT_TYPE_FIELD); e:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON); e:SetRange(LOCATION_SZONE)
  e:SetProperty(EFFECT_FLAG_PLAYER_TARGET); e:SetTargetRange(1,1); e:SetTarget(s.sumlimit)
  ```
  同理 `EFFECT_CANNOT_SUMMON`、`EFFECT_CANNOT_MSET`、`EFFECT_CANNOT_SSET`、`EFFECT_CANNOT_FLIP_SUMMON`、`EFFECT_CANNOT_BP`。
- **命中文件数 / 出现频次**：`EFFECT_CANNOT_SPECIAL_SUMMON` 76 files、`EFFECT_CANNOT_SUMMON` 19 files、
  `EFFECT_CANNOT_MSET` 6 files、`EFFECT_CANNOT_SSET` 3 files、`EFFECT_CANNOT_FLIP_SUMMON` 11 files、`EFFECT_CANNOT_BP` 7 files。
- **自定义参数**：限制对象（己方/对手/双方）、受限卡类（等级/种族/属性/区域）、限制范围。
- **设计器覆盖**：ruleTexts 有 cannotSpecialSummon/cannotNormalSummon（作用于自身卡面），**对对手的场面封锁未支持**。

#### 3.11.2 效果发动封锁 / 效果无效化
- **lua 实现特征**：`EFFECT_CANNOT_ACTIVATE`（46 files）、`EFFECT_CANNOT_TRIGGER`（20 files）、
  `EFFECT_CANNOT_DISEFFECT`（6 files）、`EFFECT_CANNOT_INACTIVATE`（7 files）、`EFFECT_CANNOT_NEGATE` / `EFFECT_FLAG_CANNOT_NEGATE`。
- **命中文件数 / 出现频次**：`EFFECT_CANNOT_TRIGGER` 20 files、`EFFECT_CANNOT_DISEFFECT` 6 files、
  `EFFECT_CANNOT_INACTIVATE` 7 files、`EFFECT_FLAG_CANNOT_NEGATE` 3 files。
- **自定义参数**：封锁对象（怪兽效果/陷阱/魔法，从手/墓发动）、范围。
- **设计器覆盖**：**部分支持**（ruleTexts 有 cannotTrigger，仅自身卡面）。

#### 3.11.3 解放/素材/位置封锁
- **lua 实现特征**：`EFFECT_UNRELEASABLE_SUM`、`EFFECT_UNRELEASABLE_NONSUM`、`EFFECT_CANNOT_BE_MATERIAL`、
  `EFFECT_CANNOT_BE_SYNCHRO_MATERIAL`、`EFFECT_CANNOT_BE_FUSION_MATERIAL`、`EFFECT_CANNOT_BE_XYZ_MATERIAL`、
  `EFFECT_CANNOT_RELEASE`、`EFFECT_CANNOT_CHANGE_POSITION`、`EFFECT_CANNOT_TURN_SET`、`EFFECT_CANNOT_REMOVE`、
  `EFFECT_CANNOT_TO_HAND`、`EFFECT_CANNOT_TO_DECK`、`EFFECT_CANNOT_DRAW`、`EFFECT_CANNOT_CHANGE_POS_E`。
- **命中文件数 / 出现频次**：`EFFECT_UNRELEASABLE_SUM`/`NONSUM` 各 8 files、`EFFECT_CANNOT_BE_MATERIAL` 5 files、
  `EFFECT_CANNOT_CHANGE_POSITION` 22 files、`EFFECT_CANNOT_RELEASE` 2 files、`EFFECT_CANNOT_REMOVE` 4 files、
  `EFFECT_CANNOT_TO_HAND`/`CANNOT_TO_DECK` 各 3 files、`EFFECT_CANNOT_DRAW` 2 files（多为低频）。
- **自定义参数**：限制种类、对象。
- **设计器覆盖**：ruleTexts 有 cannotBeReleased/cannotChangePosition（仅自身文本）；**效果层未支持**。

#### 3.11.4 抽卡/手牌上限/对决规则改写
- **lua 实现特征**：`EFFECT_DRAW_COUNT`、`EFFECT_HAND_LIMIT`、`EFFECT_ADD_SETCODE`、`EFFECT_CHANGE_CODE`、`EFFECT_NECRO_VALLEY`、`EFFECT_PUBLIC`。
- **命中文件数 / 出现频次**：`EFFECT_DRAW_COUNT` 4 files、`EFFECT_HAND_LIMIT` 1 file、`EFFECT_CHANGE_CODE` 9 files、
  `EFFECT_ADD_SETCODE` 5 files、`EFFECT_NECRO_VALLEY` 3 files、`EFFECT_PUBLIC` 7 files（低频）。
- **自定义参数**：改写目标、数值。
- **设计器覆盖**：ruleTexts 有 alias(ADD_CODE)/ruleAttribute 等；**效果层未支持**。

### 3.12 时点与连锁

#### 3.12.1 事件触发型效果（陷阱卡在场上/GY 触发的效果）
- **lua 实现特征**：
  ```lua
  e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)  -- 或 FIELD+TRIGGER_O
  e1:SetCode(EVENT_TO_GRAVE); e1:SetRange(LOCATION_SZONE)  -- 或 LOCATION_GRAVE
  e1:SetCondition(...); e1:SetTarget(...); e1:SetOperation(...)
  ```
- **命中文件数 / 出现频次**：触发型 343 files (16.7%)；`SetType` 组合：
  `FIELD+TRIGGER_O` 133 files、`FIELD+TRIGGER_F` 99 files、`SINGLE+TRIGGER_O` 88 files、
  `SINGLE+TRIGGER_F` 37 files。事件命中见 §5（`EVENT_TO_GRAVE` 113、`EVENT_DESTROYED` 75、`EVENT_LEAVE_FIELD` 87 等）。
- **自定义参数**：触发事件、触发范围（场上/GY）、必发/任意发（`TRIGGER_F`/`TRIGGER_O`）、时点（`EVENT_PHASE+PHASE_END` 等）。
- **设计器覆盖**：**部分支持**（timing 列表覆盖 to_grave/destroyed/banished 等，但事件粒度有限）。

#### 3.12.2 时点判定（回合/阶段/连锁）
- **lua 实现特征**：
  ```lua
  Duel.IsMainPhase() / Duel.IsBattlePhase() / Duel.IsPhase(PHASE_END)
  Duel.GetTurnPlayer() / Duel.GetTurnCount() / Duel.GetCurrentChain()
  Duel.IsTurnPlayer(tp)
  ```
- **命中文件数 / 出现频次**：`Duel.IsPhase` 75 files、`Duel.IsMainPhase` 67 files、`Duel.IsBattlePhase` 42 files、
  `Duel.GetTurnPlayer` 45 files、`Duel.GetTurnCount` 43 files、`Duel.GetCurrentChain` 60 files。
- **自定义参数**：允许发动的回合（自己/对手）、阶段、连锁数、首回合限制。
- **设计器覆盖**：**部分支持**（quick_oppo_turn/quick_oppo_main），但 GetTurnCount/首回合/连锁数**未支持**。

#### 3.12.3 延迟处理 / 持续监视
- **lua 实现特征**：`EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS` + `SetCode(EVENT_CHAIN_SOLVING/SOLVED)`；
  `SetLabelObject(e1)` 关联发动效果；`aux.PersistentTargetFilter`/`aux.PersistentTgCon` 锁定目标卡。
- **命中文件数 / 出现频次**：`CONTINUOUS+FIELD` 343 files（含触发器）；`EFFECT_TYPE_FIELD+CONTINUOUS` 378 次；
  `EVENT_CHAIN_SOLVING` 22 files、`EVENT_CHAIN_SOLVED` 21 files、`aux.PersistentTargetFilter` 23 files、
  `SetLabelObject` 常见。`e:SetLabel` 305 files、`e:GetLabel` 337 files（用于跨 target/operation 传参）。
- **自定义参数**：监视事件、锁定目标、标签传值（标签数量/含义）。
- **设计器覆盖**：**未支持**。

#### 3.12.4 连锁限制 / 连锁操作改写
- **lua 实现特征**：`Duel.SetChainLimit(aux.FALSE)`（禁止再连锁）、`Duel.ChangeChainOperation`、`Duel.CheckChainTarget`、`Duel.CheckChainUniqueness`。
- **命中文件数 / 出现频次**：`Duel.SetChainLimit` 10 files、`Duel.ChangeChainOperation` 7 files（低频）。
- **自定义参数**：是否禁止连锁、连锁改写目标。
- **设计器覆盖**：**未支持**。

### 3.13 陷阱怪兽

- **lua 实现特征**（本语料 76 files，3.7%）：
  ```lua
  e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
  e1:SetType(EFFECT_TYPE_ACTIVATE); e1:SetCode(EVENT_FREE_CHAIN)
  function s.target(...) ... Duel.IsPlayerCanSpecialSummonMonster(tp,id,0,TYPE_MONSTER|TYPE_EFFECT,atk,def,level,RACE,ATTR) end
  function s.activate(...)
    c:AddMonsterAttribute(TYPE_EFFECT|TYPE_TRAP)     -- 变成怪兽(仍是陷阱)
    Duel.SpecialSummonStep(c,0,tp,tp,true,false,POS_FACEUP_DEFENSE)
    c:AddMonsterAttributeComplete()
    Duel.SpecialSummonComplete()
  end
  ```
  **注意：不存在 `EFFECT_TYPE_TRAPMONSTER` 或 `EFFECT_TRAP_MONSTER` 常量**；陷阱怪兽用 `TYPE_TRAPMONSTER` 判定（引用 5 files），
  用 `AddMonsterAttribute` 生成（73 files），用 `EFFECT_DISABLE_TRAPMONSTER` 无效化（10 files）。
  怪兽化后仍可用 `SetType(EFFECT_TYPE_QUICK_O)+SetRange(LOCATION_MZONE)` 追加效果（见 c10632284 Mimesis Elephant）。
- **命中文件数 / 出现频次**：陷阱怪兽 76 files；`aux.AddMonsterAttribute` 73 files；`EFFECT_DISABLE_TRAPMONSTER` 10 files。
- **自定义参数**：怪兽化后的攻/守/等级/种族/属性/类型、表示形式、是否可攻击/可否作为素材、怪兽化后追加效果。
- **设计器覆盖**：**未支持**。

### 3.14 其他

#### 3.14.1 装备化（陷阱作为装备卡）
- **lua 实现特征**：
  ```lua
  e1:SetCategory(CATEGORY_EQUIP); e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
  Duel.Equip(tp,c,tc)          -- c 为陷阱自身, tc 为装备对象
  e2:SetType(EFFECT_TYPE_EQUIP); e2:SetCode(EFFECT_UPDATE_ATTACK); e2:SetValue(...)
  e3:SetType(EFFECT_TYPE_SINGLE); e3:SetCode(EFFECT_EQUIP_LIMIT); e3:SetValue(s.eqlimit)
  Duel.EquipComplete()
  ```
- **命中文件数 / 出现频次**：`CATEGORY_EQUIP` 72 files、`EFFECT_TYPE_EQUIP` 62 files、`Duel.Equip` 69 files、
  `EFFECT_EQUIP_LIMIT` 60 files、`aux.AddAttractionEquipProc`（系列助手）可见。
- **自定义参数**：装备对象筛选（种族/字段）、装备后赋予的效果、装备限制、是否可破坏代替。
- **设计器覆盖**：**未支持**。

#### 3.14.2 计数器
- **lua 实现特征**：`tc:AddCounter(0x1b,n)`、`s.counter_place_list={0x1b}`、`Duel.RemoveCounter`、`Duel.IsCanAddCounter`、`EFFECT_COUNTER_PERMIT`。
- **命中文件数 / 出现频次**：`CATEGORY_COUNTER` 18 files、`Duel.IsCanAddCounter` 5 files、`Duel.RemoveCounter` 5 files、
  `Duel.GetCounter` 4 files、`EFFECT_COUNTER_PERMIT` 1 file。
- **自定义参数**：计数器种类、数量、放置对象、消耗方式。
- **设计器覆盖**：**未支持**。

#### 3.14.3 硬币 / 骰子
- **lua 实现特征**：`Duel.TossCoin(tp,n)`（配 `s.toss_coin=true`、`CATEGORY_COIN`、`COIN_HEADS/COIN_TAILS`）；
  `Duel.TossDice(tp,n)`（配 `s.roll_dice=true`、`CATEGORY_DICE`、`Duel.CalculateDamage`）。
- **命中文件数 / 出现频次**：`CATEGORY_COIN` 9 files、`CATEGORY_DICE` 6 files；`Duel.TossDice` 13 files、`Duel.TossCoin` 4 files。
- **自定义参数**：次数、正/反面各分支效果、骰子结果分支。
- **设计器覆盖**：**未支持**。

#### 3.14.4 跳过阶段 / 回合 / 额外回合
- **lua 实现特征**：`Duel.SkipPhase(p,PHASE_MAIN1,RESET_PHASE|PHASE_END,1)`、`EFFECT_SKIP_M1/SKIP_BP/SKIP_DP/SKIP_SP/SKIP_TURN`、`Duel.IsAbleToEnterBP`。
- **命中文件数 / 出现频次**：`Duel.SkipPhase` 22 files、`EFFECT_SKIP_DP` 2 files、`EFFECT_SKIP_TURN` 2 files、
  `EFFECT_SKIP_M1`/`SKIP_BP`/`SKIP_SP` 各 1 file（低频）。
- **自定义参数**：跳过的阶段、对象、持续回合。
- **设计器覆盖**：**未支持**。

#### 3.14.5 胜利条件 / 特殊判定
- **lua 实现特征**：`Duel.Win(p,REASON_*)`、`EFFECT_LIGHT_OF_INTERVENTION`、`Duel.RockPaperScissors`、`Duel.CountHeads/Tails`。
- **命中文件数 / 出现频次**：`Duel.Win` 5 files、`EFFECT_LIGHT_OF_INTERVENTION` 2 files、`Duel.RockPaperScissors`/`CountHeads`/`CountTails` 各 1 file（极低频）。
- **自定义参数**：胜利条件、判定方式。
- **设计器覆盖**：**未支持**。

#### 3.14.6 二段效果 / 复合效果（发动后再发动、多分支）
- **lua 实现特征**：同一脚本多个 `Effect.CreateEffect`；`31 files` 含多个发动效果；
  用 `Duel.SelectEffect`/`Duel.SelectEffectYesNo`/`Duel.SelectYesNo` 在结算中分支；
  用 `e:SetLabel`/`GetLabel` 与 `Duel.SetTargetParam`/`GetChainInfo` 跨阶段传参。
- **命中文件数 / 出现频次**：多发动效果 31 files；`Duel.SelectEffect` 73 files、`Duel.SelectYesNo` 219 files；
  `e:SetLabel` 305 files、`e:GetLabel` 337 files、`Duel.SetTargetParam` 141 files、`Duel.GetChainInfo` 322 files、
  `Duel.BreakEffect` 351 files。
- **自定义参数**：分支数量、各分支效果、是否可选、标签参数数量与语义。
- **设计器覆盖**：**部分支持**（choice_* 系列可组合两个分支，`choice_free` 自由组合；多分支/三次以上及跨阶段传参**未支持**）。

#### 3.14.7 常驻驻留（永续陷阱本体）
- **lua 实现特征**：先注册一个空 `EFFECT_TYPE_ACTIVATE` 使卡能发动，再注册 `EFFECT_TYPE_FIELD/SINGLE [+CONTINUOUS]` +
  `SetRange(LOCATION_SZONE)` 的持续效果（可加 `SetTargetRange`/`SetCondition`/`SetTarget`）。
- **命中文件数 / 出现频次**：`SetRange(LOCATION_SZONE)` 547 files（26.6%）；`SetTargetRange` 402 files。
- **自定义参数**：驻留区域、生效范围（谁/哪些卡）、生效条件、是否可被无效。
- **设计器覆盖**：**部分支持**（effectType=continuous 可生成常驻效果；但驻留区域与目标范围不可细分）。

#### 3.14.8 特殊召唤限制 / 苏生限制引用
- **lua 实现特征**：`EFFECT_SPSUMMON_CONDITION`、`EFFECT_REVIVE_LIMIT`、`EFFECT_LEFT_SPSUMMON_COUNT`、`EFFECT_FORCE_MZONE`。
- **命中文件数 / 出现频次**：各 1~2 files（极低频）。
- **自定义参数**：召唤条件、位置限制。
- **设计器覆盖**：ruleTexts 有 ssOncePerTurn（部分）；**未完整支持**。

---

## 4. 需要自定义调整的参数汇总

按「估计影响的效果数」降序（影响范围=命中文件数量级，来自 §1/§2 统计）。「设计器覆盖」列标注现状。

| 参数名 | 含义 | 取值域/示例 | 涉及能力 | 估计影响的效果数 | 设计器覆盖 |
|---|---|---|---|---|---|
| `targetRange` 目标范围 | 效果作用的卡/玩家范围 | 己方/对手/双方；怪兽区/魔陷区/墓地/手/卡组/除外/额外；字段/种族/属性/等级筛选 | 除去、数值、召唤、封锁、装备 | ~1600+（SetTargetRange 402 + 各类 Select） | 部分支持 |
| `category` 效果本质 | `CATEGORY_*` 组合，决定结算与提示 | SPECIAL_SUMMON/DESTROY/TOHAND/NEGATE/REMOVE/SET/TODECK/DAMAGE/DRAW/ATKCHANGE/SEARCH/DISABLE/TOGRAVE/POSITION/EQUIP/HANDES/CONTROL/TOKEN/COUNTER... | 全部 | 全部 2059 | 部分支持（action 映射）|
| `count` 数量 | 数量类参数（张/次/个） | 任意正整数；min/max；`Duel.GetLocationCount` 校验 | 检索/除去/召唤/伤害/弃手/抽卡 | ~1500 | 已支持 |
| `cardFilter` 卡类/字段筛选 | 目标卡筛选谓词 | `IsSetCard(字段)` / `IsRace` / `IsAttribute` / `IsType` / `IsLevelAbove` / `IsAbleTo*` | 检索/除去/召唤/封锁 | ~1200 | 已支持（字段+卡类） |
| `countLimit` 频次限制 | `SetCountLimit(n,id,code)` | `1,id`; `1,id,EFFECT_COUNT_CODE_OATH`; `{id,1}`; `EFFECT_COUNT_CODE_SOFT...` | 全部 | 857 files | 已支持（HOPT/SOPT/决斗一次） |
| `negateTarget` 无效对象 | 无效「卡的发动」还是「效果的发动」；对象类别 | `Duel.NegateActivation` vs `Duel.NegateEffect`；怪兽/魔/陷效果 | 反击与无效 | ~230（NEGATE+DISABLE 158+156） | 部分支持 |
| `hintTiming` 发动时点 | 可发动时点位掩码 | `0,TIMINGS_CHECK_MONSTER_E` / `TIMING_END_PHASE` / `0,TIMING_MAIN_END` / `TIMING_DAMAGE_STEP` | 发动条件、战斗 | ~1500（SetHintTiming） | 部分支持 |
| `reset` 持续时间 | `SetReset` 复位方式 | `RESETS_STANDARD_PHASE_END` / `RESET_PHASE|PHASE_END` / `RESET_EVENT|RESETS_STANDARD` / `RESET_PHASE|PHASE_END,2` / `RESET_CHAIN` | 数值、抗性、封锁、无效 | ~700（SetReset） | 未支持 |
| `sourceZone` 来源区域 | 移动/召唤/检索来源 | LOCATION_HAND/DECK/GRAVE/SZONE/REMOVED/EXTRA/MZONE | 调度、除去、召唤 | ~1000 | 部分支持 |
| `destinationZone` 去向区域 | 移动去向 | 手牌/墓地/卡组(顶/底/洗切)/额外/除外(表/里)/场上 | 除去、调度 | ~700 | 部分支持 |
| `property` 发动标志 | `EFFECT_FLAG_*` | CARD_TARGET/PLAYER_TARGET/CANNOT_DISABLE/DAMAGE_STEP/DELAY/IGNORE_IMMUNE/SET_AVAILABLE | 全部 | 879+316+232+221+208+... | 未支持 |
| `cost` 代价 | 发动代价类型+数量+筛选 | pay_lp/discard/release/detach/banish/send grave/mill | 全部 | 680 files | 已支持 |
| `trapMonsterStats` 陷阱怪兽属性 | 怪兽化后攻/守/等级/种族/属性/类型 | `AddMonsterAttribute(TYPE_EFFECT|TYPE_TRAP)`; POS | 陷阱怪兽 | 76 files | 未支持 |
| `permanentResidence` 常驻驻留 | 是否驻留 SZONE 持续生效 | `SetRange(LOCATION_SZONE)`；FIELD/SINGLE+CONTINUOUS | 常驻类效果 | 547 files | 部分支持 |
| `activatePermission` 发动破例 | 盖放回合可发动/从手牌发动/禁发动 | `EFFECT_TRAP_ACT_IN_HAND` / `EFFECT_TRAP_ACT_IN_SET_TURN` / `EFFECT_CANNOT_ACTIVATE` | 发动条件 | 30+28+46 files | 未支持 |
| `valueFormula` 数值公式 | 数值计算方式 | 固定值 / 数量×系数 / 参照攻守 / 当前值一半 / 骰子结果 | 数值、伤害 | ~300 | 部分支持（固定/数量） |
| `positionTarget` 表示形式 | 目标表示形式 | 表攻/表守/里守；`Duel.ChangePosition(...,POS_FACEUP_DEFENSE,...)` | 表示形式 | 87 files | 未支持 |
| `controlMode` 控制权 | 控制权转移方式 | 转移 / 交换（`GetControl`/`SwapControl`）；持续时长 | 控制权 | 38 files | 未支持 |
| `damageModify` 伤害改写 | 战斗/效果伤害变更或防止 | `AVOID_BATTLE_DAMAGE`/`CHANGE_DAMAGE`/`NO_EFFECT_DAMAGE`/`REFLECT_DAMAGE` | 战斗、数值 | ~60 files | 未支持 |
| `indestructible` 不被破坏 | 免疫来源与次数 | 效果/战斗/两者；`INDESTRUCTABLE_COUNT` 次数 | 抗性 | ~110 files | 未支持 |
| `redirect` 离场改写 | 破坏/移动替代与去向改写 | `DESTROY_REPLACE`/`LEAVE_FIELD_REDIRECT(LOCATION_DECKBOT)`/`TO_GRAVE_REDIRECT` | 抗性、除去 | ~80 files | 未支持 |
| `lockType` 封锁类型 | 禁止召唤/攻击/发动/解放等 | `CANNOT_SPECIAL_SUMMON`/`CANNOT_ATTACK`/`CANNOT_ACTIVATE`/`CANNOT_TRIGGER`/`UNRELEASABLE` | 限制与封锁 | ~200 files | 未支持 |
| `announce` 宣言 | 宣言种类与范围 | 卡名/数值/属性/种族/等级；`Duel.Announce*` | 宣言类 | ~25 files | 未支持 |
| `random` 随机判定 | 硬币/骰子及分支 | `Duel.TossCoin/TossDice`；`CATEGORY_COIN/DICE`；`s.toss_coin/roll_dice` | 其他 | ~15 files | 未支持 |
| `tokenStats` 衍生物属性 | 衍生物攻守/等级/种族/属性/数量 | `Duel.CreateToken`；`TYPES_TOKEN` | 召唤 | 37 files | 未支持 |
| `equipTarget` 装备对象 | 装备化目标与赋予效果 | `Duel.Equip`；`EFFECT_EQUIP_LIMIT`；EQUIP 系效果 | 装备 | 72 files | 未支持 |
| `counterType` 计数器 | 种类/数量/放置对象 | `AddCounter(0x1b,n)`；`counter_place_list` | 计数器 | 18 files | 未支持 |
| `phase/turn` 时点判定 | 允许的回合/阶段/连锁数 | `IsMainPhase`/`IsBattlePhase`/`IsPhase`/`GetTurnCount`/`GetCurrentChain` | 时点与连锁 | 75+67+60+43 files | 部分支持 |
| `branchCount` 分支数 | 二段/多段效果分支 | `Duel.SelectEffect`/`SelectYesNo`；多 `Effect` | 二选一/复合 | 31+73+219 files | 部分支持（≤2） |
| `chainModify` 连锁限制 | 禁止再连锁/改写连锁 | `Duel.SetChainLimit(aux.FALSE)`；`ChangeChainOperation` | 时点与连锁 | 17 files | 未支持 |
| `labelParam` 标签传参 | 跨 target/operation 传参 | `e:SetLabel(a,b)` / `Duel.SetTargetParam` / `GetChainInfo` | 复合效果 | 305+141+322 files | 未支持 |

---

## 5. 语料佐证

### 5.1 `CATEGORY_*` 频次与命中文件数（2025/2059 文件含 SetCategory）
```
files  CATEGORY_*
  716  SPECIAL_SUMMON      493  DESTROY          282  TOHAND
  158  NEGATE             156  REMOVE           147  SET
  131  TODECK             129  DAMAGE           126  DRAW / ATKCHANGE
  113  SEARCH             110  DISABLE           97  TOGRAVE
   80  POSITION            72  EQUIP             54  RECOVER
   42  HANDES              38  CONTROL           36  TOKEN
   27  DISABLE_SUMMON      24  DEFCHANGE         23  LEAVE_GRAVE / DECKDES
   18  COUNTER             17  FUSION_SUMMON     14  TOEXTRA
   13  SUMMON               9  COIN               7  LVCHANGE / RELEASE
    6  DICE                 5  ANNOUNCE
```
（`CATEGORY_SPECIAL_SUMMON`、`CATEGORY_DESTROY`、`CATEGORY_TOHAND` 为最高频三本质。）

### 5.2 操作函数频次（仅陷阱语料；files）
```
1630 SetOperationInfo   1049 IsExistingMatchingCard   752 SelectTarget
 683 GetFirstTarget       653 GetLocationCount        642 SpecialSummon
 636 SelectMatchingCard   619 GetMatchingGroup        580 Destroy
 402 SetTargetRange        353 RegisterEffect          351 BreakEffect
 322 GetChainInfo          271 SendtoGrave             267 SendtoHand
 251 Remove                238 Release                222 ConfirmCards
 219 SelectYesNo           215 SpecialSummonStep       192 SetTargetCard
 169 SendtoDeck            164 GetFieldGroupCount       163 GetAttacker
 156 NegateActivation      156 IsChainNegatable         153 Damage
 143 GetTargetCards        141 SetTargetParam          127 Draw
 116 GetAttackTarget       109 SelectReleaseGroup       105 aux.SelectUnselectGroup
 102 SelectReleaseGroupCost 94 IsSSetable               87 ChangePosition
  85 SSet                   82 DiscardHand              75 IsPhase
  73 SelectEffect            72 NegateEffect             72 Overlay
  69 Equip                  67 IsMainPhase              66 RegisterFlagEffect
  65 EFFECT_FLAG_SET_AVAILABLE 60 GetCurrentChain       60 GetTurnPlayer
  58 Recover                47 PayLPCost               45 NegateAttack
  45 IsChainDisablable      43 GetTurnCount            42 IsBattlePhase
  37 CreateToken            33 MoveToField             30 IsPreviousPosition(POS_FACEDOWN)
  28 NegateSummon           27 GetControl              26 RaiseEvent
  23 aux.PersistentTargetFilter 22 SkipPhase         19 GetDecktopGroup
  18 DiscardDeck            15 ConfirmDecktop          14 SetLP
  13 TossDice               11 AnnounceAttribute/Number/SynchroSummon
  10 SetChainLimit/XyzSummon  9 GetBattleDamage       8 STATUS_ACT_FROM_HAND
   7 ChangeChainOperation/LinkSummon/AnnounceCard/SwapControl
   6 AnnounceRace           5 TossCoin/Win            2 GetOverlayGroup
   1 EFFECT_ACTIVATE_COST
```

### 5.3 `SetType` 组合分布（files）
```
2009  EFFECT_TYPE_ACTIVATE
 525  EFFECT_TYPE_SINGLE
 470  EFFECT_TYPE_QUICK_O
 416  EFFECT_TYPE_FIELD
 313  CONTINUOUS+FIELD
 133  FIELD+TRIGGER_O
  99  FIELD+TRIGGER_F
  88  SINGLE+TRIGGER_O
  58  CONTINUOUS+SINGLE
  45  EFFECT_TYPE_EQUIP
  37  SINGLE+TRIGGER_F
   4  FIELD+GRANT
   1  EFFECT_TYPE_QUICK_F / EFFECT_TYPE_IGNITION
```

### 5.4 `EFFECT_*` 常量命中（files，前 50 及关键低频）
```
2009 TYPE_ACTIVATE      792 TYPE_FIELD       655 TYPE_SINGLE
 471 TYPE_QUICK_O       341 TYPE_CONTINUOUS  232 FLAG_CANNOT_DISABLE
 221 FLAG_DAMAGE_STEP   214 FLAG_CLIENT_HINT 208 FLAG_DELAY
 159 EFFECT_UPDATE_ATTACK 136 TYPE_TRIGGER_F  103 FLAG_IGNORE_IMMUNE
 102 EFFECT_DISABLE      76 CANNOT_SPECIAL_SUMMON  71 FLAG_SINGLE_RANGE
  66 DISABLE_EFFECT      65 FLAG_SET_AVAILABLE    60 EQUIP_LIMIT
  54 INDESTRUCTABLE_BATTLE 46 CANNOT_ACTIVATE     45 INDESTRUCTABLE_EFFECT
  44 LEAVE_FIELD_REDIRECT 42 IMMUNE_EFFECT       41 SET_ATTACK_FINAL
  38 UPDATE_DEFENSE      33 CANNOT_ATTACK      30 TRAP_ACT_IN_HAND
  29 CANNOT_BE_EFFECT_TARGET 28 TRAP_ACT_IN_SET_TURN 26 FLAG_OATH / CHANGE_DAMAGE
  23 DESTROY_REPLACE     22 CANNOT_CHANGE_POSITION 21 AVOID_BATTLE_DAMAGE
  20 CANNOT_TRIGGER / CANNOT_DIRECT_ATTACK / SET_DEFENSE_FINAL
  19 CANNOT_SUMMON       18 CHANGE_LEVEL      14 UPDATE_LEVEL / NO_EFFECT_DAMAGE / CANNOT_ATTACK_ANNOUNCE
  13 CHANGE_RACE / MUST_ATTACK   11 CANNOT_FLIP_SUMMON / SET_ATTACK
  10 DISABLE_TRAPMONSTER / CHANGE_ATTRIBUTE / CHANGE_TYPE
   9 INDESTRUCTABLE_COUNT / SET_BASE_ATTACK / CHANGE_CODE   8 EXTRA_ATTACK / PIERCE / SELF_TOGRAVE / SET_CONTROL
   7 CANNOT_BP / CANNOT_INACTIVATE / SELF_DESTROY   6 TO_GRAVE_REDIRECT / CANNOT_MSET / CANNOT_DISEFFECT
   5 CANNOT_BE_MATERIAL / ADD_SETCODE / NO_BATTLE_DAMAGE
   4 EFFECT_TYPE_GRANT / COUNT_CODE_DUEL / DIRECT_ATTACK / DRAW_COUNT / CANNOT_REMOVE / IGNORE_BATTLE_TARGET
   3 CANNOT_SSET / NECRO_VALLEY / REFLECT_DAMAGE / ADD_TYPE / REMAIN_FIELD / EXTRA_ATTACK_MONSTER / CANNOT_TO_HAND / CANNOT_TO_DECK
   2 COST_REPLACE / BATTLE_DESTROY_REDIRECT / CANNOT_RELEASE / SPSUMMON_CONDITION / CANNOT_TURN_SET / CANNOT_DRAW
   1 EFFECT_ACTIVATE_COST / SEND_REPLACE / TO_HAND_REDIRECT / TO_DECK_REDIRECT / REFLECT_BATTLE_DAMAGE / LIGHT_OF_INTERVENTION / REVIVE_LIMIT / COUNTER_PERMIT / UNRELEASABLE_SUM(8) 等
```
**关键：`EFFECT_TRAP_CANNOT_ACTIVATE`、`EFFECT_TRAP_MONSTER`、`EFFECT_TYPE_TRAPMONSTER` 在本语料 0 命中。**

### 5.5 抽样核对（已完整 Read 的代表脚本）
| 能力 | 代表脚本 | 关键行 |
|---|---|---|
| 自由时点 + 全体破坏 | `E:/tmp/ygocorpus/cs/official/c28121403.lua` | `SetCode(EVENT_FREE_CHAIN)` + `Duel.Destroy(g,REASON_EFFECT)` |
| 反击：无效发动+破坏 | `E:/tmp/ygocorpus/cs/official/c34717238.lua` | `EVENT_CHAINING` + `Duel.IsChainNegatable` + `Duel.NegateActivation` |
| 无效效果（不破坏） | `E:/tmp/ygocorpus/cs/official/c16970158.lua` | `CATEGORY_DISABLE` + `Duel.NegateEffect(ev)` |
| 无效召唤 | `E:/tmp/ygocorpus/cs/official/c50323155.lua` | `CATEGORY_DISABLE_SUMMON` + `Duel.NegateSummon` |
| 手续召唤（超量） | `E:/tmp/ygocorpus/cs/official/c73860462.lua` | `Duel.XyzSummon(tp,tg:GetFirst())` |
| 卡组检索 | `E:/tmp/ygocorpus/cs/official/c14464864.lua` | `SendtoHand` + `ConfirmCards` |
| 通常召唤/盖放 | `E:/tmp/ygocorpus/cs/official/c75025112.lua` | `CATEGORY_SUMMON+CATEGORY_SET` + `Duel.SummonOrSet` |
| 削血（按对手卡数） | `E:/tmp/ygocorpus/cs/official/c27053506.lua` | `SetTargetPlayer` + `SetTargetParam` + `Duel.Damage` |
| 攻守减半/最终值 | `E:/tmp/ygocorpus/cs/official/c94156050.lua` | `EFFECT_SET_ATTACK_FINAL` + `GetAttack()/2` |
| 表示形式变更 | `E:/tmp/ygocorpus/cs/official/c83133491.lua` | `Duel.ChangePosition(sg,POS_FACEUP_DEFENSE,0,POS_FACEUP_ATTACK,0)` |
| 控制权交换 | `E:/tmp/ygocorpus/cs/official/c30426226.lua` | `CATEGORY_CONTROL` + `Duel.SwapControl` |
| 装备化 | `E:/tmp/ygocorpus/cs/official/c7565547.lua` | `CATEGORY_EQUIP` + `Duel.Equip` + `EFFECT_EQUIP_LIMIT` |
| 除外（随机） | `E:/tmp/ygocorpus/cs/official/c6859683.lua` | `CATEGORY_REMOVE` + `RandomSelect` + `SendtoGrave` |
| 送墓（对手卡组） | `E:/tmp/ygocorpus/cs/official/c55348096.lua` | `CATEGORY_TOGRAVE` + 对手 `SelectMatchingCard` |
| 回额外卡组 | `E:/tmp/ygocorpus/cs/official/c58392024.lua` | `CATEGORY_TOEXTRA` + `Duel.SendtoDeck` |
| 回卡组/洗切（融合素材） | `E:/tmp/ygocorpus/cs/official/c31855260.lua` | `Fusion.ShuffleMaterial` + `CATEGORY_TODECK` |
| 抽卡（给对手） | `E:/tmp/ygocorpus/cs/official/c5915629.lua` | `CATEGORY_DRAW` + `Duel.Draw` |
| 回复（条件：战斗伤害） | `E:/tmp/ygocorpus/cs/official/c29389368.lua` | `EVENT_PRE_DAMAGE_CALCULATE` + `GetBattleDamage` + `Duel.Recover` |
| 弃手（效果） | `E:/tmp/ygocorpus/cs/official/c92595643.lua` | `CATEGORY_HANDES` + `Duel.DiscardHand` |
| 衍生物 | `E:/tmp/ygocorpus/cs/official/c65810489.lua` | `CATEGORY_TOKEN` + `Duel.CreateToken` |
| 计数器 | `E:/tmp/ygocorpus/cs/official/c35787450.lua` | `AddCounter(0x1b,2)` + `counter_place_list` |
| 削卡组顶 | `E:/tmp/ygocorpus/cs/official/c92219931.lua` | `CATEGORY_DECKDES` + `Duel.DiscardDeck` |
| 盖放回合可发动（赋予他卡） | `E:/tmp/ygocorpus/cs/official/c24425055.lua` | `Duel.SSet` + `EFFECT_TRAP_ACT_IN_SET_TURN` |
| 从手牌发动 | `E:/tmp/ygocorpus/cs/official/c10045474.lua` | `EFFECT_TRAP_ACT_IN_HAND` + `IsStatus(STATUS_ACT_FROM_HAND)` |
| 常驻：战斗伤害防止 | `E:/tmp/ygocorpus/cs/official/c53239672.lua` | 空 ACTIVATE + `EFFECT_AVOID_BATTLE_DAMAGE` + `SetRange(LOCATION_SZONE)` |
| 常驻：不能被取对象 | `E:/tmp/ygocorpus/cs/official/c96457619.lua` | `EFFECT_CANNOT_BE_EFFECT_TARGET` |
| 常驻：不能攻击 | `E:/tmp/ygocorpus/cs/official/c85742772.lua` | `EFFECT_CANNOT_ATTACK`（`GetLevel()>=4`） |
| 常驻：不能特召 | `E:/tmp/ygocorpus/cs/official/c26586849.lua` | `EFFECT_CANNOT_SPECIAL_SUMMON` |
| 封锁发动 | `E:/tmp/ygocorpus/cs/official/c68937720.lua` | `EFFECT_CANNOT_ACTIVATE`（手牌怪兽效果） |
| 效果免疫 | `E:/tmp/ygocorpus/cs/official/c17841166.lua` | `EFFECT_IMMUNE_EFFECT` + `SetTargetRange` |
| 伤害改写/效果伤害归零 | `E:/tmp/ygocorpus/cs/official/c74270067.lua` | `EFFECT_CHANGE_DAMAGE` + `EFFECT_NO_EFFECT_DAMAGE` |
| 破坏替代（装备陷阱） | `E:/tmp/ygocorpus/cs/official/c29867611.lua` | `EFFECT_DESTROY_REPLACE` + `EFFECT_UPDATE_ATTACK` |
| 离场改写（回卡组底） | `E:/tmp/ygocorpus/cs/official/c76209339.lua` | `EFFECT_LEAVE_FIELD_REDIRECT` + `SetValue(LOCATION_DECKBOT)` |
| 硬币 | `E:/tmp/ygocorpus/cs/official/c50470982.lua` | `s.toss_coin=true` + `Duel.TossCoin` |
| 骰子 | `E:/tmp/ygocorpus/cs/official/c43061293.lua` | `s.roll_dice=true` + `Duel.TossDice` |
| 宣言卡名 | `E:/tmp/ygocorpus/cs/official/c15800838.lua` | `Duel.AnnounceCard` + `CATEGORY_ANNOUNCE` |
| 墓地素材归来 + 超量素材 | `E:/tmp/ygocorpus/cs/official/c74100225.lua` | `CATEGORY_LEAVE_GRAVE` + `aux.SelectUnselectGroup` + `Duel.Overlay` |
| 等级变更 | `E:/tmp/ygocorpus/cs/official/c55262310.lua` | `EFFECT_UPDATE_LEVEL` + `CATEGORY_LVCHANGE` |
| 融合手续召唤（陷阱） | `E:/tmp/ygocorpus/cs/official/c6763530.lua` | `Fusion.CreateSummonEff` + `CATEGORY_FUSION_SUMMON` |
| 陷阱怪兽（自身怪兽化） | `E:/tmp/ygocorpus/cs/official/c26905245.lua` | `AddMonsterAttribute(TYPE_EFFECT|TYPE_TRAP)` + `SpecialSummonStep` |
| 陷阱怪兽（怪兽化后追加效果） | `E:/tmp/ygocorpus/cs/official/c10632284.lua` | `SetType(EFFECT_TYPE_QUICK_O)+SetRange(LOCATION_MZONE)` |
| 持续目标锁定 | `E:/tmp/ygocorpus/cs/official/c40736921.lua` | `aux.PersistentTargetFilter` + `EFFECT_CANNOT_TRIGGER` |
