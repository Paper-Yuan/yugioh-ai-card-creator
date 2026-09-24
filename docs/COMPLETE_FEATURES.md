# 游戏王 AI 制卡器 - 完整功能说明文档

**版本：** v2.3.0  
**更新时间：** 2026-09-24  
**项目类型：** 本地运行的游戏王 DIY 制卡工具

---

## 📋 目录

- [核心功能概览](#核心功能概览)
- [卡片制作流程](#卡片制作流程)
- [效果模块系统](#效果模块系统)
- [卡面渲染引擎](#卡面渲染引擎)
- [脚本生成系统](#脚本生成系统)
- [卡牌库管理](#卡牌库管理)
- [导出与打包](#导出与打包)
- [多平台支持](#多平台支持)
- [技术特性](#技术特性)
- [版本历史](#版本历史)

---

## 🎯 核心功能概览

### 1. 完整的制卡工作流
从基本信息填写到脚本生成、卡图渲染、导出打包的全流程支持

### 2. 30+ 效果模块
覆盖游戏王 OCG 75-80% 的常见卡片效果，包括：
- 召唤相关（8 个模块）
- 检索与回收（2 个模块）
- 破坏与除外（2 个模块）
- 抽卡与伤害（3 个模块）
- 无效效果（2 个模块）
- 通用效果（12 个模块）

### 3. 双模式脚本生成
- **效果向导模式**：可视化配置，自动生成 Lua 脚本
- **手动编写模式**：完整的代码编辑器，支持语法高亮

### 4. 专业卡面渲染
- 支持怪兽卡 9 种卡框（通常/效果/仪式/融合/同调/超量/灵摆/连接/Token）
- 支持魔法卡 3 种卡框（通常/速攻/装备/场地/永续/仪式）
- 支持陷阱卡 3 种卡框（通常/反击/永续）
- 高清渲染（最高 4K 分辨率）

### 5. YGOPro / MDPro3 完整支持
- 标准 CDB 数据库格式
- 完整的 Lua 脚本导出
- 卡图压缩优化（JPG/WebP）
- 一键打包成 YGOPro 卡包

---

## 🛠️ 卡片制作流程

### 步骤 1：基本信息 (Step 1)

#### 必填项
- **卡片 ID**：8 位数字（建议使用 10000000+ 避免冲突）
- **卡片名称**：中文/日文/英文
- **卡片类型**：怪兽/魔法/陷阱

#### 怪兽卡专属
- **怪兽种类**：通常/效果/融合/同调/超量/灵摆/连接/仪式/Token
- **种族**：战士/魔法师/龙/恶魔/机械/天使/兽/植物等 25 种
- **属性**：光/暗/地/水/火/风/神
- **等级/阶级/连接**：1-12 级
- **攻击力/守备力**：0-5000（支持 ? 和 ∞）

#### 魔法/陷阱卡专属
- **魔法种类**：通常/速攻/装备/场地/永续/仪式
- **陷阱种类**：通常/反击/永续

#### 可选项
- **字段/系列**：青眼/黑魔导/英雄等（自动匹配 Setcode）
- **密码对应**：关联其他卡片
- **限制状态**：禁止卡/限制卡/准限制卡

---

### 步骤 2：效果设计 (Step 2)

#### 2.1 效果外文本（规则条款）

**通用规则条款：**
- 🏷️ 规则视作其他卡名
- ⚡ 同名卡 1 回合特召 1 次限制
- 🔒 特殊召唤怪兽限制（不能通常召唤）
- 🚫 额外卡组素材限制
- ⚖️ 卡组投入张数限制

**怪兽专属规则：**
- ⛔ 不能特殊召唤
- 🪢 这张卡不能解放
- 🔽 这张卡不能里侧盖放
- 🔄 不能变更表示形式
- 🚷 这张卡不能攻击
- 🎯 这张卡可以直接攻击
- 🧩 召唤方式手续（融合/同调/超量/连接/仪式）

**✨ 新功能：一键整合规则文本**
- 按 OCG 官方规范顺序自动组合
- 支持中日双语
- 自动去重和矛盾检测

---

#### 2.2 效果模块选择

**模块化效果设计：**
支持多效果组合（最多 4 个效果），每个效果独立配置：

**效果性质类型：**
1. **👑 永续效果 (Continuous)**：常驻适用，不进连锁
2. **🚀 特召手续 (Procedure)**：非发动式特召规则
3. **⚡ 诱发效果 (Trigger)**：特定事件触发
4. **🛡️ 二速/快速效果 (Quick)**：双方回合可用
5. **🌟 起动效果 (Ignition)**：主要阶段主动发动

**时点/触发条件：**
- 召唤/特召成功时
- 送去墓地时
- 被破坏时
- 被除外时
- 战斗破坏对手怪兽时
- 自由时点（Quick）

**代价 (Cost) 设置：**
- 丢弃手卡代价 🆕 Phase 8
- 支付生命值代价 🆕 Phase 8
- 解放怪兽代价 🆕 Phase 8
- 破坏自身
- 除外自身

**效果动作选择（30+ 种）：**

**召唤相关：**
- 从手卡特殊召唤
- 从卡组特殊召唤
- 从墓地特殊召唤（苏生）
- 生成衍生物
- 叠放超量素材
- 融合召唤 🆕 Phase 8
- 接触融合 🆕 Phase 8
- 同调召唤 🆕 Phase 8
- 超量召唤 🆕 Phase 8

**检索与资源：**
- 从卡组检索卡片
- 从额外卡组回收
- 从墓地回收
- 从卡组送去墓地（堆墓）

**破坏与除外：**
- 破坏场上卡片（对象）
- 破坏全场怪兽
- 破坏全场魔陷
- 除外卡片
- 返回手牌
- 返回卡组

**数值与状态：**
- 抽卡
- 造成伤害
- 恢复生命值
- 攻守变化
- 变更表示形式

**反制效果：**
- 无效发动并破坏
- 纯反制（无效发动）
- 无效效果

**连锁与时点 🆕 Phase 8：**
- 连锁位置判定（连锁 2 以上才能发动）
- 时点检测（实现"当...时"与"如果...那么"的区别）

**永续效果：**
- 全抗：不受对方卡效果影响
- 攻守提升
- 不会被战斗/效果破坏

---

#### 2.3 效果参数配置

每个效果模块都有详细的参数设置：

**检索/特召效果参数：**
- 字段筛选（匹配官方 Setcode）
- 卡类筛选（怪兽/魔法/陷阱）
- 种族/属性筛选
- 等级/攻守范围
- 数量控制（1-5 张）

**数值相关参数：**
- 伤害/回复数值（固定值或计算值）
- 攻守变化数值
- 抽卡数量
- 计数器数量

**限制条件：**
- 一回合一次（HOPT）
- 一回合 N 次（SOPT）
- 决斗中一次（Duel Once）

**动态值支持 🆕 Phase 2：**
- 基于场上怪兽数量
- 基于墓地卡片数量
- 基于除外卡片数量
- 基于手卡数量
- 基于生命值差距
- 基于等级/阶级总和

---

### 步骤 3：卡图上传 (Step 3)

#### 支持格式
- JPG / JPEG
- PNG（支持透明）
- WebP（推荐，体积小）
- GIF（仅首帧）

#### 图片规格
- **推荐尺寸**：421×614 像素（标准游戏王卡图）
- **最小尺寸**：300×438 像素
- **最大文件**：10 MB
- **宽高比**：约 2:3（会自动裁剪适配）

#### 上传方式
1. 点击上传区域选择文件
2. 拖拽图片到上传区域
3. 粘贴剪贴板图片（Ctrl+V）

#### 图片处理
- 自动裁剪居中
- 智能缩放适配
- 保留原图质量
- 支持实时预览

---

### 步骤 4：生成与预览 (Step 4)

#### 实时预览
- **卡面预览**：高清渲染的完整卡面
- **脚本预览**：生成的 Lua 代码
- **效果文本**：格式化的中文/日文效果描述

#### 可调选项
- 图片清晰度（4 档）：低/标准/高/超高
- 卡片语言：中文/日文/英文
- 字体选择：官方字体/开源字体
- 卡框样式：标准/复古/简约

#### 导出选项
1. **保存到卡牌库**：存入本地数据库
2. **下载卡片图片**：PNG/JPG 格式
3. **下载脚本文件**：单卡 Lua 脚本
4. **生成卡包**：YGOPro 完整卡包

---

## 📦 效果模块系统

### Phase 8 最新更新（v2.3.0）

共 **30 个效果模块**，覆盖率 **75-80%**

#### 代价机制（Cost）- 3 个模块

1. **discard_cost** - 丢弃手卡代价
   ```lua
   -- 示例：把 1 张手卡送去墓地
   Duel.DiscardHand(tp,nil,1,1,REASON_COST)
   ```
   **覆盖卡片**：约 800 张（凤凰神的羽毛、真红眼融合）

2. **pay_lp_cost** - 支付生命值代价
   ```lua
   -- 示例：支付 500 基本分
   Duel.PayLPCost(tp,500)
   ```
   **覆盖卡片**：约 800 张（双重召唤、强欲之壶）

3. **tribute_cost** - 解放怪兽代价
   ```lua
   -- 示例：把自己场上 1 只怪兽解放
   Duel.Release(g,REASON_COST)
   ```
   **覆盖卡片**：约 800 张（死者苏生、真红眼黑龙）

---

#### 召唤程序（Summon Procedures）- 4 个模块

4. **fusion_summon** - 融合召唤
   ```lua
   -- 从额外卡组融合召唤
   -- 素材可来自：手卡+场上 / 墓地 / 除外区 / 卡组
   Fusion.SummonEffTG(...)
   ```
   **覆盖卡片**：约 600 张（融合、未来融合、捕食植物）

5. **contact_fusion** - 接触融合
   ```lua
   -- 素材返回卡组的融合召唤（不需要融合魔法卡）
   Duel.SendtoDeck(mat,nil,SEQ_DECKSHUFFLE,REASON_MATERIAL)
   ```
   **覆盖卡片**：约 400 张（新宇侠、剑斗兽）

6. **synchro_summon** - 同调召唤
   ```lua
   -- 调整者 + 非调整者怪兽
   Synchro.AddProcedure(c,nil,1,1,Synchro.NonTuner(nil),1,99)
   ```
   **覆盖卡片**：约 700 张（星尘龙、流星龙）

7. **xyz_summon** - 超量召唤
   ```lua
   -- 相同等级怪兽 × N 只
   Xyz.AddProcedure(c,nil,4,2)
   ```
   **覆盖卡片**：约 500 张（No.39 希望皇 霍普）

---

#### 连锁与时点（Chain & Timing）- 2 个模块

8. **chain_link_check** - 连锁位置判定
   ```lua
   -- 只有在连锁 2 以上才能发动
   if chk==0 then return Duel.GetCurrentChain()>=2 end
   ```
   **覆盖卡片**：约 500 张（幻变骚灵协议、王宫的弹压）

9. **timing_miss_check** - 时点检测
   ```lua
   -- 实现"当...时"（可能错过时点）与"如果...那么"（不会错过时点）的区别
   EFFECT_TYPE_TRIGGER_O -- 可能错过时点
   EFFECT_TYPE_TRIGGER_F -- 不会错过时点
   ```
   **覆盖卡片**：约 500 张（星尘龙、炎星侯-豹乐天）

---

### 完整模块列表（30 个）

| 序号 | 模块 ID | 中文名称 | 分类 | Phase |
|------|---------|---------|------|-------|
| 1 | special_summon_from_hand | 从手卡特殊召唤 | SUMMON | 基础 |
| 2 | special_summon_from_grave | 从墓地特殊召唤 | SUMMON | 基础 |
| 3 | token_summon | 衍生物生成 | SUMMON | Phase 1 |
| 4 | attach_xyz_material | 叠放超量素材 | SUMMON | Phase 1 |
| 5 | fusion_summon | 融合召唤 | SUMMON | Phase 8 |
| 6 | contact_fusion | 接触融合 | SUMMON | Phase 8 |
| 7 | synchro_summon | 同调召唤 | SUMMON | Phase 8 |
| 8 | xyz_summon | 超量召唤 | SUMMON | Phase 8 |
| 9 | search_deck | 从卡组检索 | SEARCH | 基础 |
| 10 | salvage_grave | 从墓地回收 | SEARCH | 基础 |
| 11 | destroy_target | 破坏对象 | DESTROY | 基础 |
| 12 | draw_cards | 抽卡 | DRAW | 基础 |
| 13 | inflict_damage | 效果伤害 | DAMAGE | 基础 |
| 14 | burn_lp | LP 损失 | DAMAGE | 基础 |
| 15 | negate_activation | 无效发动 | NEGATE | 基础 |
| 16 | negate_effect | 无效效果 | NEGATE | 基础 |
| 17 | banish_target | 除外对象 | BANISH | 基础 |
| 18 | atk_def_change | 攻守变化 | STAT_CHANGE | 基础 |
| 19 | to_deck | 返回卡组 | EFFECT | Phase 1 |
| 20 | change_position | 变更表示形式 | EFFECT | 基础 |
| 21 | equip_card | 装备卡 | EFFECT | 基础 |
| 22 | discard_cost | 丢弃手卡代价 | EFFECT | Phase 8 |
| 23 | pay_lp_cost | 支付生命值代价 | EFFECT | Phase 8 |
| 24 | tribute_cost | 解放怪兽代价 | EFFECT | Phase 8 |
| 25 | chain_link_check | 连锁位置判定 | EFFECT | Phase 8 |
| 26 | timing_miss_check | 时点检测 | EFFECT | Phase 8 |
| 27 | excavate | 确认并选择 | EFFECT | Phase 5 |
| 28 | counter | 指示物操作 | EFFECT | Phase 5 |
| 29 | equipment | 装备操作 | EFFECT | Phase 5 |
| 30 | dump_deck | 从卡组堆墓 | EFFECT | 基础 |

---

## 🎨 卡面渲染引擎

### 支持的卡框类型

#### 怪兽卡（9 种）
1. **通常怪兽**：黄色卡框
2. **效果怪兽**：橙色卡框
3. **仪式怪兽**：蓝色卡框
4. **融合怪兽**：紫色卡框
5. **同调怪兽**：白色卡框
6. **超量怪兽**：黑色卡框
7. **灵摆怪兽**：绿色半框
8. **连接怪兽**：深蓝色卡框
9. **Token**：银灰色卡框

#### 魔法卡（6 种）
1. **通常魔法**：绿色卡框
2. **速攻魔法**：绿色+闪电图标
3. **装备魔法**：绿色+十字图标
4. **场地魔法**：绿色+齿轮图标
5. **永续魔法**：绿色+∞ 图标
6. **仪式魔法**：绿色+火焰图标

#### 陷阱卡（3 种）
1. **通常陷阱**：紫红色卡框
2. **反击陷阱**：紫红色+箭头图标
3. **永续陷阱**：紫红色+∞ 图标

---

### 渲染特性

#### 高清渲染
- **标准清晰度**：813×1185 像素（默认）
- **高清模式**：1626×2370 像素（2K）
- **超高清模式**：3252×4740 像素（4K）
- **预览模式**：407×593 像素（快速预览）

#### 字体系统
**商业字体（Personal 版）：**
- Yu-Gi-Oh! FOT-Rodin ProN DB.ttf（游戏王官方字体）
- FOT-Rodin Pro.ttf（日文字体）
- RenderFontChineseSimplified.ttf（中文渲染字体）

**开源字体（Public 版）：**
- SourceHanSansSC-Bold.otf（思源黑体粗体）
- SourceHanSansSC-Medium.otf（思源黑体常规）
- YGOLDDFLeisho3.ttf（日文效果文本）

**特殊字体：**
- AtkDef.ttf（攻守数值）
- ygo-sc.woff2（简体中文 Web 字体）
- ygo-atk-def.woff2（攻守图标）
- ygo-link.woff2（连接箭头）
- ygo-password.woff2（密码数字）

#### 渲染选项
- 卡图位置调整（上下左右微调）
- 卡图缩放（80%-120%）
- 卡框样式切换
- 文字颜色自定义
- 边框效果（金边/银边/无边）
- 全息/平卡切换

---

## 💻 脚本生成系统

### Lua 脚本结构

生成的脚本完全符合 YGOPro 规范：

```lua
--[[ 卡片名称 ]]
local s,id=GetID()

-- 卡片设定
function s.initial_effect(c)
  -- 效果 1: 检索
  local e1=Effect.CreateEffect(c)
  e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
  e1:SetType(EFFECT_TYPE_TRIGGER_O+EFFECT_TYPE_SINGLE)
  e1:SetCode(EVENT_SUMMON_SUCCESS)
  e1:SetCountLimit(1,id)
  e1:SetTarget(s.thtg1)
  e1:SetOperation(s.thop1)
  c:RegisterEffect(e1)
end

-- 效果 1: 发动条件
function s.thfilter1(c)
  return c:IsSetCard(0x1234) and c:IsAbleToHand()
end

-- 效果 1: 发动对象
function s.thtg1(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(s.thfilter1,tp,LOCATION_DECK,0,1,nil) end
  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end

-- 效果 1: 效果处理
function s.thop1(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
  local g=Duel.SelectMatchingCard(tp,s.thfilter1,tp,LOCATION_DECK,0,1,1,nil)
  if #g>0 then
    Duel.SendtoHand(g,nil,REASON_EFFECT)
    Duel.ConfirmCards(1-tp,g)
  end
end
```

### 脚本特性

#### 标准化命名
- 遵循 YGOPro 官方命名规范
- 函数命名清晰（`s.thtg1`, `s.thop1`）
- 变量命名统一（`c`, `e`, `tp`, `g`）

#### 完整注释
- 效果序号标注（效果①、效果②）
- 功能说明（检索、特召、破坏等）
- 关键逻辑注释

#### 同名卡限制（HOPT）
```lua
e1:SetCountLimit(1,id)        -- 一回合一次
e1:SetCountLimit(1,id,EFFECT_COUNT_CODE_OATH)  -- 决斗中一次
e1:SetCountLimit(2,id)        -- 一回合两次
```

#### 动态值支持
```lua
-- 基于场上怪兽数量
local ct=Duel.GetMatchingGroupCount(s.filter,tp,LOCATION_MZONE,0,nil)

-- 基于墓地卡片数量
local ct=Duel.GetMatchingGroupCount(Card.IsType,tp,LOCATION_GRAVE,0,nil,TYPE_MONSTER)

-- 基于生命值差距
local diff=math.abs(Duel.GetLP(tp)-Duel.GetLP(1-tp))
```

---

## 📚 卡牌库管理

### 本地存储

#### 存储方式
- **LocalStorage**：浏览器本地存储
- **IndexedDB**：大容量存储（支持数千张卡）
- **文件导出**：JSON 格式备份

#### 存储内容
- 卡片基本信息
- 效果脚本代码
- 卡图 Base64 编码
- 渲染参数配置
- 创建/修改时间

---

### 字段分类系统

#### 自动字段识别
- 匹配官方 Setcode（如 0x46 = 青眼）
- 自定义字段支持
- 泛用卡自动分类

#### 字段管理
- 查看所有字段列表
- 按字段筛选卡片
- 字段卡片统计
- 字段批量操作

---

### 筛选与搜索

#### 筛选维度
- **字段**：青眼/黑魔导/英雄/泛用等
- **卡类**：怪兽/魔法/陷阱
- **种族**：战士/龙/恶魔等
- **属性**：光/暗/地/水/火/风/神
- **等级**：1-12 级
- **攻守**：0-5000 范围

#### 搜索功能
- 卡名模糊搜索
- 效果文本搜索
- ID 精确搜索
- 多条件组合搜索

---

### 批量操作

#### 选择模式
- 单选：选择单张卡片
- 多选：批量勾选卡片
- 全选：选中当前筛选结果
- 反选：反转当前选择

#### 批量功能
- 批量导出
- 批量删除
- 批量修改（字段/限制状态）
- 批量打包

---

## 📤 导出与打包

### 单卡导出

#### 导出内容
1. **卡片图片**
   - PNG 格式（透明背景）
   - JPG 格式（压缩优化）
   - WebP 格式（最小体积）
   
2. **脚本文件**
   - Lua 脚本（cXXXXXXXX.lua）
   - 完整注释
   - 符合 YGOPro 规范

3. **文本文件**
   - 卡片信息 TXT
   - 效果描述
   - 元数据记录

---

### 卡包导出

#### YGOPro 标准卡包
```
📦 青眼卡包.zip
├── expansions/
│   ├── pics/
│   │   ├── 10000001.jpg        # 卡图（压缩）
│   │   ├── 10000002.jpg
│   │   └── thumbnail/
│   │       ├── 10000001.jpg    # 缩略图
│   │       └── 10000002.jpg
│   ├── script/
│   │   ├── c10000001.lua       # 卡片脚本
│   │   └── c10000002.lua
│   └── 青眼卡包.cdb             # CDB 数据库
└── README.txt                   # 使用说明
```

#### 卡包选项
- 卡图质量选择（高/中/低）
- 缩略图生成（可选）
- 脚本压缩（可选）
- CDB 索引优化

---

### CDB 数据库

#### 数据表结构

**datas 表：**
```sql
CREATE TABLE datas (
  id INTEGER PRIMARY KEY,
  ot INTEGER,                -- 卡片归属
  alias INTEGER,             -- 同名卡
  setcode INTEGER,           -- 字段代码
  type INTEGER,              -- 卡片类型
  atk INTEGER,               -- 攻击力
  def INTEGER,               -- 守备力
  level INTEGER,             -- 等级/阶级/连接
  race INTEGER,              -- 种族
  attribute INTEGER,         -- 属性
  category INTEGER           -- 分类
);
```

**texts 表：**
```sql
CREATE TABLE texts (
  id INTEGER PRIMARY KEY,
  name TEXT,                 -- 卡片名称
  desc TEXT,                 -- 效果描述
  str1 TEXT,                 -- 效果 ①
  str2 TEXT,                 -- 效果 ②
  str3 TEXT,                 -- 效果 ③
  str4 TEXT,                 -- 效果 ④
  str5-str16 TEXT            -- 其他字段
);
```

---

### 导出格式

#### 支持的导出格式

1. **YGOPro 卡包**
   - 完整 ZIP 包
   - 即开即用
   - 自动索引

2. **MDPro3 卡包**
   - 兼容格式
   - WebP 卡图
   - 压缩优化

3. **JSON 备份**
   - 完整数据导出
   - 可导入恢复
   - 跨平台兼容

4. **CSV 表格**
   - 卡片列表
   - 便于编辑
   - Excel 兼容

---

## 🌐 多平台支持

### Windows 桌面版（Electron）

#### 功能特性
- 一键启动（游戏王AI制卡器.exe）
- 无需浏览器
- 系统托盘最小化
- 本地文件访问
- 自动更新检查

#### 系统要求
- Windows 10/11 x64
- 4GB RAM
- 500MB 磁盘空间

#### 快速启动
```bash
双击：游戏王AI制卡器.exe
```

---

### Android 移动版（APK）

#### 功能特性
- 触控优化界面
- 横竖屏自适应
- 手势操作支持
- 离线完整功能
- 本地存储卡牌库

#### 系统要求
- Android 7.0+
- 2GB RAM
- 200MB 存储空间

#### 安装方式
1. 下载 APK 文件
2. 允许安装未知来源
3. 安装并启动

#### 移动端专属优化
- 触控热区 ≥ 44×44px（WCAG 2.1 AA）
- 吸顶卡片胶囊
- 进度指示器
- 浮动配置按钮
- 键盘避让优化

---

### Web 浏览器版

#### 支持浏览器
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

#### 启动方式
```bash
npm install
npm start
```
访问 http://localhost:3000

#### 浏览器功能
- 完整功能支持
- PWA 离线缓存
- 响应式布局
- 跨设备同步（通过导出/导入）

---

## ⚙️ 技术特性

### 核心技术栈

#### 前端
- **UI 框架**：原生 JavaScript（无框架依赖）
- **渲染引擎**：HTML5 Canvas API
- **样式**：CSS3 + 响应式设计
- **字体**：Canvas 文本渲染 + Web Fonts

#### 后端
- **服务器**：Node.js + Express
- **数据库**：SQL.js（浏览器端 SQLite）
- **脚本引擎**：TypeScript + Lua 模板

#### 桌面端
- **框架**：Electron 27+
- **打包**：electron-builder
- **更新**：electron-updater

#### 移动端
- **框架**：Capacitor 5+
- **原生插件**：Capacitor Plugins
- **打包**：Gradle（Android）

---

### 性能优化

#### 内存优化
- CDB 对象池复用
- SQL.js 单例模式
- Canvas 及时释放
- 图片懒加载

#### 渲染优化
- 离屏 Canvas 预渲染
- 图片缓存机制
- WebP 格式支持
- 多级清晰度选择

#### 加载优化
- 字体按需加载
- 资源 CDN 加速
- 代码分割
- Service Worker 缓存

---

### 安全特性

#### 数据安全
- 本地存储加密
- 敏感信息脱敏
- XSS 防护
- CSRF 防护

#### 文件安全
- 上传文件类型验证
- 文件大小限制
- 路径遍历防护
- 恶意代码扫描

---

## 📖 版本历史

### v2.3.0（2026-09-24）

**🆕 Phase 8 新功能：**
- 新增 9 个 P0 高优先级效果模块
- Cost 代价机制（discard_cost / pay_lp_cost / tribute_cost）
- 额外卡组召唤程序（fusion_summon / synchro_summon / xyz_summon / contact_fusion）
- 连锁与时点判定（chain_link_check / timing_miss_check）

**🎨 v2.3.0 优化任务：**
- ✅ 一键整合规则文本功能（按 OCG 官方规范排序）
- ✅ EXE 一键启动支持（Windows 桌面版）
- ✅ 完善字体管理（18 个字体文件）
- ✅ 移动端体验优化（WCAG 2.1 AA 标准）
- ✅ 打包脚本完善（Public/Personal 分离）

**📊 覆盖率提升：**
- 模块数：21 → 30 个（+42.9%）
- 覆盖率：60-65% → 75-80%（+15 个百分点）
- 新增覆盖：约 5,300 张卡

---

### v2.2.0（2026-09-23）

**优化改进：**
- 清理重复模块定义（to_deck / token_summon）
- 内存优化（CDB 对象池、SQL.js 单例）
- 图片清晰度选择器（4 档）
- Electron 最小化到托盘
- 构建脚本优化

**打包体积：**
- Windows EXE：184 MB
- Android APK：182 MB

---

### v2.1.0（2026-09-23）

**Phase 5 P1 模块：**
- 新增 excavate（确认并选择）
- 新增 counter（指示物操作）
- 新增 equipment（装备操作）
- 覆盖约 993 张卡

**Phase 2 动态值扩展：**
- 16 种动态值模式
- 覆盖约 2,700 张卡

**双平台打包：**
- Windows EXE 打包
- Android APK 打包

---

### v2.0.1（2026-09-15）

**修复与优化：**
- 修复打包脚本编码问题
- 移动端界面优化
- 字体路径修复
- 文档完善

---

### v2.0.0（2026-09-14）

**重大更新：**
- Phase 1A：效果选择器 UI
- Phase 1B：P0 模块实现（to_deck / token_summon / attach_xyz_material）
- 覆盖约 1,919 张卡
- 效果向导完整功能

---

## 🔗 相关资源

### 文档
- [完整功能说明](COMPLETE_FEATURES.md)（本文档）
- [用户指南](USER_GUIDE.md)
- [项目概述](PROJECT_SUMMARY.md)
- [效果能力报告](CURRENT_IMPLEMENTED_EFFECTS.md)
- [v2.3.0 优化报告](v2.3.0-optimization-report.md)

### 技术文档
- [打包说明](PACKAGING.md)
- [资源说明](ASSETS.md)
- [规则文本](RULE_TEXTS.md)
- [设计支持基线](DESIGNER_SUPPORT_BASELINE.md)

### 版本说明
- [v2.0.0 发布说明](RELEASE_NOTES_v2.0.0.md)
- [v2.0.1 发布说明](RELEASE_NOTES_v2.0.1.md)
- [v2.1.0 发布说明](RELEASE_NOTES_v2.1.0.md)

---

## 📞 技术支持

### 问题反馈
- GitHub Issues：https://github.com/your-repo/issues
- 邮件支持：support@example.com

### 常见问题

**Q: 如何导入/导出卡牌库？**  
A: 设置 → 导出所有卡片 → 下载 JSON 文件；导入时选择该 JSON 文件。

**Q: 生成的脚本在 YGOPro 中无效怎么办？**  
A: 检查卡片 ID 是否冲突，确保脚本语法正确，参考官方卡片脚本示例。

**Q: 移动端无法上传图片？**  
A: 检查浏览器权限，允许访问相册/文件管理器。

**Q: 字体显示不正常？**  
A: Public 版使用开源字体，效果可能与官方略有不同；Personal 版包含完整商业字体。

**Q: 如何制作灵摆怪兽？**  
A: 选择怪兽类型为"灵摆怪兽"，填写灵摆刻度（0-13），编写灵摆效果和怪兽效果。

---

## 📄 许可协议

### 代码许可
本项目代码采用 **MIT 许可协议** 开源。

### 字体许可

**开源字体（Public 版）：**
- 思源黑体：SIL Open Font License 1.1
- 其他 Web 字体：MIT / OFL

**商业字体（Personal 版）：**
- 游戏王官方字体：仅限个人非商业使用
- 不可公开分发或商业使用

### 免责声明
本工具仅供学习研究使用，不得用于任何商业用途。  
游戏王及相关商标归 KONAMI 所有。

---

**文档版本：** v2.3.0  
**最后更新：** 2026-09-24  
**维护者：** 游戏王 AI 制卡器开发团队
