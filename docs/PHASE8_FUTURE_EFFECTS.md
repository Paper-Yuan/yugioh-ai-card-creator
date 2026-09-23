# Phase 8 可添加效果报告

## 目录
- [概述](#概述)
- [P0 优先级效果](#p0-优先级效果)
- [P1 优先级效果](#p1-优先级效果)
- [P2 优先级效果](#p2-优先级效果)
- [实现难度评估说明](#实现难度评估说明)

---

## 概述

本报告分析游戏王 OCG 中尚未在当前系统中实现的效果机制。基于现有 24 个效果模块的基础上，识别出高频使用但未覆盖的效果类型，按优先级（P0/P1/P2）进行分类，为 Phase 8 的开发提供参考。

**统计摘要：**
- P0 高优先级效果：8 个
- P1 中优先级效果：12 个
- P2 低优先级效果：8 个
- 总计未实现效果：28 个

---

## P0 优先级效果

### 1. 连锁处理与时点效果

**效果描述：**
实现"错过时点"机制、连锁链构建、以及"当...时"与"如果...那么"的时点判定逻辑。

**典型卡片示例：**
- 星尘龙（无效破坏效果后自我复活）
- 幻变骚灵协议（连锁 2+ 才能发动）
- 炎星侯-豹乐天（错过时点的经典案例）

**覆盖卡片数量估算：** 500+ 张

**实现难度：** ★★★★★ (最高)

**Lua 实现要点：**
- 需实现 `Duel.GetCurrentChain()` 判断连锁位置
- 使用 `EFFECT_TYPE_TRIGGER_O` 和 `EFFECT_TYPE_TRIGGER_F` 区分必发/选发
- 时点检测需通过 `e:GetHandler():GetReasonEffect()` 判定

---

### 2. Cost 机制

**效果描述：**
实现发动代价（Cost）与效果处理的区分，包括丢弃手卡、支付 LP、解放怪兽等作为 Cost 的机制。

**典型卡片示例：**
- 双重召唤（支付 500 LP 作为 Cost）
- 凤凰神的羽毛（丢弃 1 张手卡作为 Cost）
- 真红眼融合（将融合素材从场上/墓地除外作为 Cost）

**覆盖卡片数量估算：** 800+ 张

**实现难度：** ★★★★☆

**Lua 实现要点：**
```lua
-- Cost 在 target 函数中检测，在 operation 函数前执行
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.CheckLPCost(tp,500) end
  Duel.PayLPCost(tp,500)
end
```

---

### 3. 融合召唤机制

**效果描述：**
实现融合召唤的完整流程，包括融合素材检测、替代素材、融合召唤限制等。

**典型卡片示例：**
- 融合（基础融合魔法）
- 未来融合（预约融合）
- 捕食植物·猎蝇天蝎（使用对手怪兽作为融合素材）

**覆盖卡片数量估算：** 600+ 张

**实现难度：** ★★★★☆

**Lua 实现要点：**
- 使用 `Fusion.SummonEffTG` 和 `Fusion.SummonEffOP`
- 素材检测：`c:CheckFusionMaterial()`
- 需实现 `aux.AddFusionProcMix()` 素材配方

---

### 4. 同调召唤机制

**效果描述：**
实现同调召唤的等级计算、调整者检测、同调素材限制等完整机制。

**典型卡片示例：**
- 星尘龙（1 调整 + 2+ 非调整）
- 流星龙（至少需要 1 只同调怪兽作为素材）
- 针虫的巢穴（黑同调召唤）

**覆盖卡片数量估算：** 700+ 张

**实现难度：** ★★★★☆

**Lua 实现要点：**
```lua
-- 同调素材配方
Synchro.AddProcedure(c,aux.FilterBoolFunctionEx(Card.IsType,TYPE_TUNER),1,1,Synchro.NonTuner(nil),1,99)
-- 等级计算
function s.synfilter(c,syncard,tuner,f)
  return c:GetLevel()==syncard:GetLevel()-tuner:GetLevel()
end
```

---

### 5. 超量召唤机制

**效果描述：**
实现超量召唤的等级/阶级匹配、素材数量检测、超量素材移除等机制。

**典型卡片示例：**
- No.39 希望皇 霍普（2 只 4 级怪兽）
- CNo.39 希望皇 霍普雷（3 只超量怪兽叠放）
- 超量单位（通用超量召唤魔法）

**覆盖卡片数量估算：** 500+ 张

**实现难度：** ★★★★☆

**Lua 实现要点：**
```lua
-- 超量素材配方
Xyz.AddProcedure(c,nil,4,2)
-- 超量素材移除
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return e:GetHandler():CheckRemoveOverlayCard(tp,1,REASON_COST) end
  e:GetHandler():RemoveOverlayCard(tp,1,1,REASON_COST)
end
```

---

### 6. P区与灵摆召唤

**效果描述：**
实现灵摆卡片的 P 区放置、灵摆召唤、P 刻度检测、P 区效果等完整机制。

**典型卡片示例：**
- 异色眼灵摆龙（P 刻度 4）
- 虹彩之魔术师（P 刻度操作）
- 星光大道（灵摆召唤保护）

**覆盖卡片数量估算：** 400+ 张

**实现难度：** ★★★★★

**Lua 实现要点：**
- P 区判定：`LOCATION_PZONE`
- P 刻度读取：`c:GetLeftScale()`, `c:GetRightScale()`
- 灵摆召唤限制：需检测 P 刻度范围内的等级

---

### 7. 手卡/卡组诱发效果

**效果描述：**
实现从手卡或卡组诱发的效果，如"从手卡丢弃发动"、"从卡组直接发动"等。

**典型卡片示例：**
- 增殖的G（从手卡发动）
- 灰流丽（从手卡发动无效检索）
- PSY 骨架装备·γ（从手卡/卡组特召）

**覆盖卡片数量估算：** 300+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 手卡诱发
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_QUICK_O)
e1:SetCode(EVENT_FREE_CHAIN)
e1:SetRange(LOCATION_HAND)
e1:SetCost(s.cost)  -- 丢弃自身作为 Cost
```

---

### 8. 特殊胜利条件

**效果描述：**
实现非生命值归零的特殊胜利条件，如艾克佐迪亚、命运盘、创造神等。

**典型卡片示例：**
- 被封印的艾克佐迪亚（集齐 5 张即胜利）
- 最终倒计时（20 回合后胜利）
- 死亡的卡组破坏病毒（对手卡组 0 张时胜利）

**覆盖卡片数量估算：** 50+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 特殊胜利判定
function s.wincon(e,tp,eg,ep,ev,re,r,rp)
  local g=Duel.GetMatchingGroup(s.filter,tp,LOCATION_HAND+LOCATION_MZONE,0,nil)
  if g:GetClassCount(Card.GetCode)==5 then
    Duel.Win(tp,WIN_REASON_EXODIA)
  end
end
```

---

## P1 优先级效果

### 9. 永续效果（Continuous Effect）

**效果描述：**
实现怪兽/魔法/陷阱的永续效果，无需发动即持续生效的被动效果。

**典型卡片示例：**
- 技能抽取（场上怪兽效果无效）
- 王宫的敕命（场上陷阱卡无效）
- 真龙皇 V.F.D.（宣言属性无效）

**覆盖卡片数量估算：** 1000+ 张

**实现难度：** ★★★★☆

**Lua 实现要点：**
```lua
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
e1:SetCode(EFFECT_DISABLE)
e1:SetRange(LOCATION_MZONE)
e1:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
e1:SetTarget(s.distg)
```

---

### 10. 连锁限制与发动条件

**效果描述：**
实现"只能在战斗阶段发动"、"对方主要阶段才能发动"等时机限制效果。

**典型卡片示例：**
- 战斗狂（只能在战斗阶段发动）
- 圣防护罩 -反射镜力-（对方战斗阶段才能发动）
- 虚空的黑暗迪克雷亚（主要阶段 1 才能发动）

**覆盖卡片数量估算：** 600+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
function s.condition(e,tp,eg,ep,ev,re,r,rp)
  return Duel.GetCurrentPhase()==PHASE_BATTLE
end
```

---

### 11. 卡片类型/属性/种族宣言

**效果描述：**
实现宣言卡片类型、属性、种族后，根据宣言内容执行后续效果。

**典型卡片示例：**
- 宣告者的神巫（宣言卡名）
- 真龙皇 V.F.D.（宣言属性）
- DNA 改造手术（宣言种族）

**覆盖卡片数量估算：** 200+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATTRIBUTE)
  local att=Duel.AnnounceAttribute(tp,1,0xff)
  -- 后续效果基于 att 执行
end
```

---

### 12. 卡片公开机制

**效果描述：**
实现公开手卡、公开卡组特定卡片、公开额外卡组等效果。

**典型卡片示例：**
- 心灵崩坏（对手公开手牌）
- 六武众的荒行（公开手卡中的六武众）
- E·HERO 天空侠（从额外卡组公开融合怪兽）

**覆盖卡片数量估算：** 400+ 张

**实现难度：** ★★☆☆☆

**Lua 实现要点：**
```lua
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  local g=Duel.GetFieldGroup(tp,0,LOCATION_HAND)
  if #g>0 then
    Duel.ConfirmCards(tp,g)
  end
end
```

---

### 13. 直接攻击/穿透伤害

**效果描述：**
实现怪兽可以直接攻击玩家、穿透守备表示怪兽造成伤害等效果。

**典型卡片示例：**
- 大革命（所有怪兽直接攻击）
- 地球巨人 盖亚板块（守备穿透）
- 暗黑界的龙神 格拉法（直接攻击限制）

**覆盖卡片数量估算：** 500+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 直接攻击
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_DIRECT_ATTACK)
c:RegisterEffect(e1)

-- 穿透
local e2=Effect.CreateEffect(c)
e2:SetType(EFFECT_TYPE_SINGLE)
e2:SetCode(EFFECT_PIERCE)
c:RegisterEffect(e2)
```

---

### 14. 额外回合/跳过阶段

**效果描述：**
实现获得额外回合、跳过战斗阶段/抽卡阶段等回合流程操作。

**典型卡片示例：**
- 时间魔术师（跳过战斗阶段）
- 次元魔法（获得额外回合）
- 虚空的决战兵器（跳过对手战斗阶段）

**覆盖卡片数量估算：** 100+ 张

**实现难度：** ★★★★☆

**Lua 实现要点：**
```lua
-- 跳过阶段
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
e1:SetCode(EFFECT_SKIP_BP)
e1:SetTargetRange(0,1)
e1:SetReset(RESET_PHASE+PHASE_END+RESET_OPPO_TURN)
Duel.RegisterEffect(e1,tp)

-- 额外回合
Duel.TakeTurnPhase(tp)
```

---

### 15. 连锁攻击/多次攻击

**效果描述：**
实现怪兽可以连续攻击多次、对所有对手怪兽各进行 1 次攻击等效果。

**典型卡片示例：**
- 钢核（可以攻击全部对手怪兽）
- 真红眼暗铁龙（1 回合可以攻击 2 次）
- 混沌战士 -开辟的使者-（一回合两次攻击）

**覆盖卡片数量估算：** 300+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 两次攻击
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_EXTRA_ATTACK)
e1:SetValue(1)
c:RegisterEffect(e1)

-- 攻击全部怪兽
local e2=Effect.CreateEffect(c)
e2:SetType(EFFECT_TYPE_SINGLE)
e2:SetCode(EFFECT_ATTACK_ALL)
e2:SetValue(1)
c:RegisterEffect(e2)
```

---

### 16. 战斗破坏抗性

**效果描述：**
实现怪兽不会被战斗破坏、战斗破坏后除外而非去墓地等抗性效果。

**典型卡片示例：**
- 棉花糖（不会被战斗破坏）
- 星尘龙（战斗破坏时无效并破坏）
- 虹彩的宝石兽（战斗破坏时变成永续魔法）

**覆盖卡片数量估算：** 800+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 战斗破坏抗性
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
e1:SetValue(1)
c:RegisterEffect(e1)
```

---

### 17. 效果破坏抗性

**效果描述：**
实现怪兽不会被效果破坏、不受魔法效果影响等抗性效果。

**典型卡片示例：**
- 星尘龙（不会被效果破坏）
- 黑羽龙（不受陷阱效果影响）
- 真龙皇 V.F.D.（不会被效果破坏）

**覆盖卡片数量估算：** 1000+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 效果破坏抗性
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
e1:SetRange(LOCATION_MZONE)
e1:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
e1:SetValue(1)
c:RegisterEffect(e1)
```

---

### 18. 召唤/特召限制

**效果描述：**
实现"不能特殊召唤"、"只能通常召唤 1 次"、"不能进行战斗"等限制效果。

**典型卡片示例：**
- 王宫的弹压（不能特殊召唤）
- 血鬼术-不死之秘法（不能通常召唤）
- 重力网（不能攻击宣言）

**覆盖卡片数量估算：** 700+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 不能特召
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
e1:SetTargetRange(1,0)
Duel.RegisterEffect(e1,tp)
```

---

### 19. 卡组顶操作

**效果描述：**
实现将卡片放置到卡组顶、查看卡组顶部卡片、改变卡组顶卡片顺序等效果。

**典型卡片示例：**
- 突进的旋风（查看卡组顶 3 张并调整顺序）
- 接下来是你的回合（查看对手卡组顶部）
- 命运抽卡（挖掘后调整卡组顶）

**覆盖卡片数量估算：** 200+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 查看卡组顶
Duel.ConfirmDecktop(tp,3)
local g=Duel.GetDecktopGroup(tp,3)
-- 调整顺序
Duel.SortDecktop(tp,tp,3)
```

---

### 20. 墓地堆叠（Mill）

**效果描述：**
实现从卡组顶送去墓地指定数量的卡片效果。

**典型卡片示例：**
- 愚蠢的埋葬（从卡组选 1 只怪兽送去墓地）
- 针虫的巢穴（将卡组顶 5 张送去墓地）
- 光之护封灵剑（每次抽卡阶段送 1 张去墓地）

**覆盖卡片数量估算：** 400+ 张

**实现难度：** ★★☆☆☆

**Lua 实现要点：**
```lua
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  Duel.DiscardDeck(tp,5,REASON_EFFECT)
end
```

---

## P2 优先级效果

### 21. Link 召唤机制

**效果描述：**
实现 Link 召唤的 Link 素材检测、Link 标记判定、共链效果等完整机制。

**典型卡片示例：**
- 解码语者（Link-3）
- 星杯神乐（Link 标记区怪兽攻击力上升）
- 三眼怪（Link 素材替代）

**覆盖卡片数量估算：** 400+ 张

**实现难度：** ★★★★★

**Lua 实现要点：**
```lua
-- Link 召唤配方
Link.AddProcedure(c,aux.FilterBoolFunction(Card.IsLinkType,TYPE_EFFECT),2)
-- Link 标记判定
c:IsLinkMarker(LINK_MARKER_BOTTOM)
```

---

### 22. 仪式召唤机制

**效果描述：**
实现仪式召唤的等级计算、仪式魔法检测、仪式素材释放等机制。

**典型卡片示例：**
- 混沌仪式（通用仪式魔法）
- 混沌战士（等级 8 仪式怪兽）
- 高等仪式术（从手卡/场上释放素材）

**覆盖卡片数量估算：** 300+ 张

**实现难度：** ★★★★☆

**Lua 实现要点：**
```lua
-- 仪式素材配方
Ritual.AddProcEqual(c,s.filter)
-- 等级计算
function s.filter(c)
  return c:GetLevel()>=8
end
```

---

### 23. 卡组洗切强制

**效果描述：**
实现"效果发动后必须洗切卡组"、"检索后对手可以洗切卡组"等效果。

**典型卡片示例：**
- 强欲而谦虚之壶（检索后洗切卡组）
- 命运抽卡（挖掘后洗切卡组）
- 左手持盾右手持剑的守护者（手卡陷阱放回卡组洗切）

**覆盖卡片数量估算：** 300+ 张

**实现难度：** ★★☆☆☆

**Lua 实现要点：**
```lua
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  -- 效果处理
  Duel.ShuffleDeck(tp)
end
```

---

### 24. 永续陷阱转怪兽

**效果描述：**
实现永续陷阱卡变成怪兽、魔法卡变成怪兽等特殊机制。

**典型卡片示例：**
- 金属化·魔法反射装甲（永续陷阱变成装备怪兽）
- 处刑人-摩休罗（永续陷阱变成怪兽）
- 虹彩的宝石兽（怪兽战斗破坏后变成永续魔法）

**覆盖卡片数量估算：** 100+ 张

**实现难度：** ★★★★☆

**Lua 实现要点：**
```lua
-- 永续陷阱变怪兽
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_CHANGE_TYPE)
e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
e1:SetValue(TYPE_MONSTER+TYPE_EFFECT)
c:RegisterEffect(e1)
```

---

### 25. 硬币/骰子效果

**效果描述：**
实现投掷硬币、掷骰子，并根据结果执行不同效果。

**典型卡片示例：**
- 命运之轮（掷骰子）
- 正面/反面（投掷硬币）
- 第二枚硬币（改变硬币结果）

**覆盖卡片数量估算：** 150+ 张

**实现难度：** ★★☆☆☆

**Lua 实现要点：**
```lua
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  local coin=Duel.TossCoin(tp,1)
  if coin==COIN_HEADS then
    -- 正面效果
  else
    -- 反面效果
  end
end
```

---

### 26. 规则效果（Ruling Effect）

**效果描述：**
实现"不能作为 X 素材"、"不能变成装备卡"等特殊规则限制。

**典型卡片示例：**
- 衍生物（不能作为同调/超量素材）
- 青眼白龙（不能作为融合素材）
- 禁忌的圣衣（不能成为效果对象）

**覆盖卡片数量估算：** 500+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 不能作为素材
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
e1:SetCode(EFFECT_CANNOT_BE_SYNCHRO_MATERIAL)
e1:SetValue(1)
c:RegisterEffect(e1)
```

---

### 27. 快速效果升级

**效果描述：**
实现怪兽效果变成快速效果、魔法卡在对手回合也能发动等效果。

**典型卡片示例：**
- 死者苏生（原本不能在对手回合发动）
- 星尘龙（诱发效果升级为快速效果）
- 幻变骚灵·多功能诈骗者（怪兽效果变快速效果）

**覆盖卡片数量估算：** 200+ 张

**实现难度：** ★★★★☆

**Lua 实现要点：**
```lua
-- 快速效果
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_QUICK_O)
e1:SetCode(EVENT_FREE_CHAIN)
e1:SetRange(LOCATION_MZONE)
e1:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)
```

---

### 28. 二重召唤机制

**效果描述：**
实现二重怪兽的再度召唤机制、二重状态检测等效果。

**典型卡片示例：**
- 二重召唤（可以进行第二次通常召唤）
- 二重之力（加速二重怪兽）
- 金银の守护者（二重怪兽代表）

**覆盖卡片数量估算：** 100+ 张

**实现难度：** ★★★☆☆

**Lua 实现要点：**
```lua
-- 二重怪兽标记
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)
e1:SetCode(EFFECT_GEMINI_STATUS)
c:RegisterEffect(e1)
```

---

## 实现难度评估说明

**★☆☆☆☆ (简单)：**
仅需基础 Lua API，无复杂状态管理。

**★★☆☆☆ (较简单)：**
需要基本的 Duel API 调用和简单条件判断。

**★★★☆☆ (中等)：**
需要多步骤逻辑、状态检测或复杂的 filter 函数。

**★★★★☆ (困难)：**
需要深度的连锁处理、素材管理或特殊召唤流程。

**★★★★★ (非常困难)：**
需要核心引擎级别的机制实现，涉及多个系统交互。

---

## 总结

本报告识别了 28 个尚未实现的核心效果机制，其中：

- **P0 高优先级（8 个）：** 连锁处理、Cost 机制、融合/同调/超量召唤、P 区效果等核心机制，覆盖约 3850+ 张卡片。
  
- **P1 中优先级（12 个）：** 永续效果、战斗/效果抗性、召唤限制、卡组顶操作等常见效果，覆盖约 6300+ 张卡片。
  
- **P2 低优先级（8 个）：** Link 召唤、仪式召唤、硬币/骰子、二重召唤等特殊机制，覆盖约 2050+ 张卡片。

建议优先实现 P0 级别的效果模块，特别是**连锁处理**和 **Cost 机制**，这两者是大量高级效果的基础。融合/同调/超量召唤机制的实现将大幅提升系统对额外卡组怪兽的支持度。
