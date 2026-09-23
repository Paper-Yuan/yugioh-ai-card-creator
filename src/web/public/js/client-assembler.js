/**
 * 客户端 YGOPro Lua 脚本模块化装配引擎 (ClientScriptAssembler)
 * 基于 YGOPro OCGCore 官方规范与 ygopro-scripting-workflow 标准：
 * 1. 严格按效果规则性质 (Effect Type) 差异化装配：永续/特召手续/诱发/二速/起动
 * 2. 严格遵循同名卡一回合一次 (HOPT) 偏移递增：id, id+o, id+2*o...
 * 3. 提取效果简要描述至 CDB texts.str1..str16，彻底杜绝 Unknown
 */

// 效果性质类型定义
const EFFECT_TYPES = [
  { id: 'continuous', name: '👑 永续效果 (Continuous)', badge: '永续', desc: '常驻适用，不进连锁，无代价与对象' },
  { id: 'procedure', name: '🚀 特召手续 (Procedure)', badge: '特召规则', desc: '非发动式特召规则，不进连锁' },
  { id: 'trigger', name: '⚡ 诱发效果 (Trigger)', badge: '诱发', desc: '由特定事件（召/特召、送墓、战破）触发' },
  { id: 'quick', name: '🛡️ 二速/快速效果 (Quick)', badge: '二速·即时', desc: '二速连锁反制或双方回合自由时点发动' },
  { id: 'ignition', name: '🌟 起动效果 (Ignition)', badge: '起动', desc: '自己主要阶段主动宣言发动' }
];

// 标准原型库（用于快速套用与初值构建）
const EFFECT_PRESETS = [
  {
    id: 'continuous_immune',
    name: '不受对方卡效果影响',
    effectType: 'continuous',
    subType: 'immune_all',
    range: 'mzone',
    condition: 'none',
    descText: '只要这张卡在怪兽区域表侧表示存在，不受对方卡的效果影响。'
  },
  {
    id: 'continuous_atk_boost',
    name: '自身攻守提升1000',
    effectType: 'continuous',
    subType: 'atk_boost_1000',
    range: 'mzone',
    condition: 'none',
    descText: '只要这张卡在怪兽区域表侧表示存在，这张卡的攻击力·守备力上升1000。'
  },
  {
    id: 'continuous_indestructable',
    name: '不会被战斗·效果破坏',
    effectType: 'continuous',
    subType: 'indestructable_both',
    range: 'mzone',
    condition: 'none',
    descText: '只要这张卡在怪兽区域表侧表示存在，这张卡不会被战斗以及对方的效果破坏。'
  },
  {
    id: 'proc_self_ss_empty',
    name: '自己空场自身特召',
    effectType: 'procedure',
    procType: 'no_monsters',
    from: 'hand',
    descText: '自己场上没有怪兽存在的场合，这张卡可以从手卡特殊召唤。'
  },
  {
    id: 'proc_self_ss_release',
    name: '解放场上怪兽特召',
    effectType: 'procedure',
    procType: 'release_one',
    from: 'hand',
    descText: '把自己场上1只怪兽解放的场合，这张卡可以从手卡特殊召唤。'
  },
  {
    id: 'trigger_summon_search',
    name: '召·特召诱发检索',
    effectType: 'trigger',
    event: 'summon_success',
    triggerType: 'optional',
    countLimit: 'hopt',
    cost: 'none',
    target: 'none',
    action: 'search_deck',
    descText: '这张卡召唤·特殊召唤成功的场合才能发动。从卡组把1张卡加入手牌。'
  },
  {
    id: 'trigger_grave_search',
    name: '被送去墓地诱发检索',
    effectType: 'trigger',
    event: 'to_grave',
    triggerType: 'optional',
    countLimit: 'hopt',
    cost: 'none',
    target: 'none',
    action: 'search_deck',
    descText: '这张卡被送去墓地的场合才能发动。从卡组把1张卡加入手牌。'
  },
  {
    id: 'trigger_battle_burn',
    name: '战破怪兽追加伤害',
    effectType: 'trigger',
    event: 'battle_destroy',
    triggerType: 'optional',
    countLimit: 'none',
    cost: 'none',
    target: 'none',
    action: 'burn_battle_destroy',
    descText: '这张卡战斗破坏对方怪兽送去墓地时才能发动。给对方造成那只怪兽原本攻击力数值的伤害。'
  },
  {
    id: 'quick_negate_destroy',
    name: '二速无效发动并破坏',
    effectType: 'quick',
    quickTiming: 'quick_chain',
    countLimit: 'hopt',
    cost: 'none',
    target: 'none',
    action: 'negate_and_destroy',
    descText: '对方把怪兽效果·魔法·陷阱卡发动时才能发动。那个发动无效并破坏。'
  },
  {
    id: 'quick_banish_target',
    name: '二速自由时点取对象除外',
    effectType: 'quick',
    quickTiming: 'quick_free',
    countLimit: 'hopt',
    cost: 'none',
    target: 'target_oppo_card',
    action: 'banish_target',
    descText: '双方回合，以对方场上1张卡为对象才能发动。那张卡除外。'
  },
  {
    id: 'quick_hand_trap_negate',
    name: '手坑舍弃二速打断',
    effectType: 'quick',
    quickTiming: 'quick_chain',
    countLimit: 'hopt',
    cost: 'discard_self',
    target: 'none',
    action: 'negate_activation',
    descText: '把手卡的这张卡送去墓地，对方把效果发动时才能发动。那个发动无效。'
  },
  {
    id: 'ignition_wipe_all',
    name: '起动破坏对方场上所有卡',
    effectType: 'ignition',
    countLimit: 'sopt',
    condition: 'none',
    cost: 'none',
    target: 'none',
    action: 'wipe_oppo_all',
    descText: '1回合1次，自己主要阶段才能发动。对方场上的卡全部破坏。'
  },
  {
    id: 'ignition_target_destroy',
    name: '起动点破场上卡片',
    effectType: 'ignition',
    countLimit: 'sopt',
    condition: 'none',
    cost: 'none',
    target: 'target_field_card',
    action: 'destroy_target',
    descText: '1回合1次，以场上1张卡为对象才能发动。那张卡破坏。'
  },
  {
    id: 'ignition_revive_grave',
    name: '起动苏生墓地怪兽',
    effectType: 'ignition',
    countLimit: 'hopt',
    condition: 'none',
    cost: 'none',
    target: 'target_grave_monster',
    action: 'revive_grave',
    descText: '以自己或对方墓地1只怪兽为对象才能发动。那只怪兽在自己场上特殊召唤。'
  },
  {
    id: 'ignition_draw_two',
    name: '起动抽2张卡补充',
    effectType: 'ignition',
    countLimit: 'hopt',
    condition: 'none',
    cost: 'none',
    target: 'none',
    action: 'draw_cards',
    descText: '从卡组抽2张卡。'
  },
  {
    id: 'quick_omni_negate',
    name: '⚡ 二速三色康 (无效发动并破坏)',
    effectType: 'quick',
    quickTiming: 'quick_chain',
    countLimit: 'hopt',
    cost: 'none',
    target: 'none',
    action: 'negate_and_destroy',
    descText: '对方把怪兽效果·魔法·陷阱卡发动时才能发动。那个发动无效并破坏。'
  },
  {
    id: 'quick_negate_field_faceup',
    name: '🚫 二速单体效遮/泡影 (无效表侧怪兽)',
    effectType: 'quick',
    quickTiming: 'quick_free',
    countLimit: 'hopt',
    cost: 'none',
    target: 'target_oppo_monster',
    action: 'negate_target_monster',
    descText: '双方回合，以对方场上1只表侧表示怪兽为对象才能发动。那只怪兽的效果直到回合结束时无效。'
  },
  {
    id: 'ignition_foolish_dump',
    name: '⚰️ 卡组精确定点堆墓 (愚蠢的埋葬)',
    effectType: 'ignition',
    countLimit: 'hopt',
    condition: 'none',
    cost: 'none',
    target: 'none',
    action: 'dump_deck',
    descText: '从卡组把1张卡送去墓地。'
  },
  {
    id: 'trigger_special_summon_deck',
    name: '🚀 登场卡组特召起跳',
    effectType: 'trigger',
    event: 'summon_success',
    triggerType: 'optional',
    countLimit: 'hopt',
    cost: 'none',
    target: 'none',
    action: 'special_summon_deck',
    descText: '这张卡召唤·特殊召唤成功的场合才能发动。从卡组把1只怪兽特殊召唤。'
  },
  {
    id: 'trigger_grave_substitute',
    name: '🛡️ 墓地除外代破 (自保续航)',
    effectType: 'continuous',
    subType: 'grave_substitute',
    range: 'grave',
    condition: 'none',
    descText: '自己场上的卡被战斗·效果破坏的场合，可以作为代替把墓地的这张卡除外。'
  },
  {
    id: 'xyz_detach_destroy',
    name: '💥 超量去除素材点破',
    effectType: 'ignition',
    countLimit: 'sopt',
    condition: 'none',
    cost: 'detach_xyz',
    target: 'target_field_card',
    action: 'destroy_target',
    descText: '1回合1次，去除这张卡的1个超量素材，以场上1张卡为对象才能发动。那张卡破坏。'
  },
  {
    id: 'pendulum_scale_pop_search',
    name: '🔮 灵摆自炸检索 (慧眼/异色眼类)',
    effectType: 'ignition',
    countLimit: 'hopt',
    condition: 'none',
    cost: 'none',
    target: 'none',
    action: 'p_destroy_search',
    descText: '把这张卡破坏，从卡组把1张卡加入手牌。'
  },
  {
    id: 'choice_search_or_dump',
    name: '🎯 二选一：检索加入手卡 / 堆墓送去墓地',
    effectType: 'ignition',
    countLimit: 'hopt',
    condition: 'none',
    cost: 'none',
    target: 'none',
    action: 'choice_search_or_dump',
    descText: '从以下效果选择1个发动。\n●从卡组把1张卡加入手牌。\n●从卡组把1张卡送去墓地。'
  },
  {
    id: 'choice_ss_or_search',
    name: '🚀 二选一：特召怪兽 / 检索加入手卡',
    effectType: 'ignition',
    countLimit: 'hopt',
    condition: 'none',
    cost: 'none',
    target: 'none',
    action: 'choice_ss_or_search',
    descText: '从以下效果选择1个发动。\n●从卡组把1只怪兽特殊召唤。\n●从卡组把1张卡加入手牌。'
  },
  {
    id: 'choice_destroy_or_banish',
    name: '💥 二选一：破坏场上卡片 / 除外卡片',
    effectType: 'ignition',
    countLimit: 'hopt',
    condition: 'none',
    cost: 'none',
    target: 'none',
    action: 'choice_destroy_or_banish',
    descText: '从以下效果选择1个发动。\n●以场上1张卡为对象破坏。\n●以场上1张卡为对象除外。'
  },
  {
    id: 'choice_draw_or_burn',
    name: '⚡ 二选一：抽2张卡 / 造成2000点伤害',
    effectType: 'ignition',
    countLimit: 'hopt',
    condition: 'none',
    cost: 'none',
    target: 'none',
    action: 'choice_draw_or_burn',
    descText: '从以下效果选择1个发动。\n●从卡组抽2张卡。\n●给对方造成2000点伤害。'
  }
];

class ClientScriptAssembler {
  constructor() {
    this.presets = EFFECT_PRESETS;
  }

  /**
   * 生成完整 YGOPro Lua 脚本
   */
  generateScript(cardData, effectSlots) {
    const code = cardData.id || 100000001;
    const name = cardData.name || '未命名卡片';
    const orderSymbols = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

    const lines = [];
    lines.push(`-- 游戏王官方 OCGCore 标准脚本`);
    lines.push(`-- 卡片密码: c${code}.lua`);
    lines.push(`-- 卡片名称: ${name}`);
    lines.push(`local s,id,o=GetID()`);
    lines.push(`function s.initial_effect(c)`);

    // 效果外文本与全局规则 (Rule Texts)
    this.assembleRuleTexts(lines, cardData);

    // 额外卡组召唤方式手续 (融合/同调/超量/连接/仪式) —— 依怪兽种类自动适配
    this.assembleSummonProcedure(lines, cardData);

    // 灵摆怪兽刻度手续支持
    if (cardData.type & 16777216) {
      lines.push(`  -- 灵摆刻度手续`);
      lines.push(`  Pendulum.AddProcedure(c)`);
    }

    // 魔法 / 陷阱专属卡片发动放置或装备手续
    const isSpell = (cardData.type & 2) || cardData.mainType === 'spell';
    const isTrap = (cardData.type & 4) || cardData.mainType === 'trap';
    const isContinuous = (cardData.type & 131072) || false;
    const isField = (cardData.type & 524288) || false;
    const isEquip = (cardData.type & 262144) || false;

    if (isContinuous || isField) {
      lines.push(`  -- 永续/场地卡片发动放置`);
      lines.push(`  local e0_act=Effect.CreateEffect(c)`);
      lines.push(`  e0_act:SetType(EFFECT_TYPE_ACTIVATE)`);
      lines.push(`  e0_act:SetCode(EVENT_FREE_CHAIN)`);
      lines.push(`  c:RegisterEffect(e0_act)`);
    } else if (isEquip) {
      lines.push(`  -- 装备魔法装备手续`);
      lines.push(`  Auxiliary.AddEquipProcedure(c,0,aux.FilterBoolFunction(Card.IsFaceup))`);
    }

    const logicFunctions = [];

    // 灵摆专属效果 (LOCATION_PZONE)
    if ((cardData.type & 16777216) && cardData.pendulumEffect) {
      const penEff = cardData.pendulumEffect;
      lines.push(`  -- 灵摆专属效果 (摆区适用)`);
      lines.push(`  local ep=Effect.CreateEffect(c)`);
      lines.push(`  ep:SetDescription(aux.Stringid(id,15))`);
      lines.push(`  ep:SetType(EFFECT_TYPE_IGNITION)`);
      lines.push(`  ep:SetRange(LOCATION_PZONE)`);
      if (penEff.countLimit === 'hopt') {
        const count = parseInt(penEff.countNumber) || 1;
        lines.push(`  ep:SetCountLimit(${count},id+1000000)`);
      } else if (penEff.countLimit === 'sopt') {
        lines.push(`  ep:SetCountLimit(1)`);
      }
      if (penEff.cost === 'destroy_self') {
        lines.push(`  ep:SetCost(s.pcost)`);
        logicFunctions.push(`-- 灵摆效果 自爆代价\nfunction s.pcost(e,tp,eg,ep,ev,re,r,rp,chk)\n  if chk==0 then return e:GetHandler():IsDestructable() end\n  Duel.Destroy(e:GetHandler(),REASON_COST)\nend`);
      }
      lines.push(`  ep:SetOperation(s.pop)`);
      logicFunctions.push(`-- 灵摆效果 效果处理\nfunction s.pop(e,tp,eg,ep,ev,re,r,rp)\n  -- 灵摆效果操作执行\nend`);
      lines.push(`  c:RegisterEffect(ep)`);
    }

    effectSlots.forEach((slot, index) => {
      const idx = index + 1;
      const sym = orderSymbols[index] || `(${idx})`;
      const effectName = slot.name || `效果${sym}`;
      const effectType = slot.effectType || 'ignition';

      lines.push(`  -- 效果${sym}: ${effectName}`);

      if (effectType === 'continuous') {
        this.assembleContinuousEffect(lines, logicFunctions, slot, idx, sym);
      } else if (effectType === 'procedure') {
        this.assembleProcedureEffect(lines, logicFunctions, slot, idx, sym);
      } else {
        this.assembleActivatedEffect(lines, logicFunctions, slot, idx, sym, index, cardData);
      }
    });

    lines.push(`end`);
    lines.push(``);
    lines.push(logicFunctions.join('\n\n'));

    return lines.join('\n');
  }

  /**
   * 效果外文本 (Rule Texts) 装配。
   *
   * 说明：以下条款均属「规则性文字」，由 OCGCore 的常驻 Effect 直接表达，
   * 可生成可执行脚本；「自定义独有规则」例外——引擎无法把一个自由句
   * 翻译成确定语义，故只写入卡面文本，不生成任何 Lua（详见 ruleTexts.customRule）。
   *
   * 各条款的写法对齐 ProjectIgnis/CardScripts 官方脚本语料库的既有惯用法，
   * 详见 scripts/mine-rule-texts.js 的统计结果。
   */
  assembleRuleTexts(lines, cardData) {
    const r = cardData.ruleTexts || {};
    const type = cardData.type || 0;
    const isMonster = (type & 1) || cardData.mainType === 'monster' || !(type & (2 | 4));

    // 1. 规则视作其他卡名 (EFFECT_ADD_CODE)
    if (r.ruleAlias && r.ruleAliasName) {
      const aliasId = parseInt(r.ruleAliasId) || 89631139;
      lines.push(`  -- 效果外文本: 规则视作其他卡名`);
      lines.push(`  local e_rt_alias=Effect.CreateEffect(c)`);
      lines.push(`  e_rt_alias:SetType(EFFECT_TYPE_SINGLE)`);
      lines.push(`  e_rt_alias:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)`);
      lines.push(`  e_rt_alias:SetCode(EFFECT_ADD_CODE)`);
      lines.push(`  e_rt_alias:SetValue(${aliasId})`);
      lines.push(`  c:RegisterEffect(e_rt_alias)`);
    }

    // 2. 同名卡 1 回合只能特殊召唤 1 次 (c:SetSPSummonOnce)，仅怪兽适用
    if (isMonster && r.ssOncePerTurn) {
      lines.push(`  -- 效果外文本: 同名卡1回合只能特殊召唤1次`);
      lines.push(`  c:SetSPSummonOnce(id)`);
    }

    // 3. 不能通常召唤 / 苏生限制 (c:EnableReviveLimit)，仅怪兽适用
    if (isMonster && r.cannotNormalSummon) {
      lines.push(`  -- 效果外文本: 不能通常召唤 (苏生限制)`);
      lines.push(`  c:EnableReviveLimit()`);
      // 「仅自身手续特召」(nomi)：额外封死其他一切特殊召唤
      if (r.nomiType === 'self_effect') {
        lines.push(`  local e_rt_nomi=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_nomi:SetType(EFFECT_TYPE_SINGLE)`);
        lines.push(`  e_rt_nomi:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)`);
        lines.push(`  e_rt_nomi:SetCode(EFFECT_SPSUMMON_CONDITION)`);
        lines.push(`  e_rt_nomi:SetValue(aux.FALSE)`);
        lines.push(`  c:RegisterEffect(e_rt_nomi)`);
      }
    }

    // 4. 不能特殊召唤 (EFFECT_SPSUMMON_CONDITION → aux.FALSE)，仅怪兽适用
    if (isMonster && r.cannotSpecialSummon && !r.cannotNormalSummon) {
      lines.push(`  -- 效果外文本: 不能特殊召唤`);
      lines.push(`  local e_rt_nosps=Effect.CreateEffect(c)`);
      lines.push(`  e_rt_nosps:SetType(EFFECT_TYPE_SINGLE)`);
      lines.push(`  e_rt_nosps:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)`);
      lines.push(`  e_rt_nosps:SetCode(EFFECT_SPSUMMON_CONDITION)`);
      lines.push(`  e_rt_nosps:SetValue(aux.FALSE)`);
      lines.push(`  c:RegisterEffect(e_rt_nosps)`);
    }

    // 4b. 不能里侧盖放 (EFFECT_CANNOT_MSET)
    // 4c. 效果不能发动 (EFFECT_CANNOT_TRIGGER)
    // 5. 作为融合/同调/超量/连接召唤素材的限制
    // 6. 不能解放 (EFFECT_UNRELEASABLE_SUM + NONSUM)
    // —— 以上条款仅怪兽卡适用，统一放入 isMonster 分支 ——
    if (isMonster) {
      // 4b. 不能里侧盖放
      if (r.cannotMSet) {
        lines.push(`  -- 效果外文本: 不能里侧盖放`);
        lines.push(`  local e_rt_mset=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_mset:SetType(EFFECT_TYPE_SINGLE)`);
        lines.push(`  e_rt_mset:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)`);
        lines.push(`  e_rt_mset:SetCode(EFFECT_CANNOT_MSET)`);
        lines.push(`  c:RegisterEffect(e_rt_mset)`);
      }

      // 4c. 效果不能发动
      if (r.cannotTrigger) {
        lines.push(`  -- 效果外文本: 效果不能发动`);
        lines.push(`  local e_rt_notrg=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_notrg:SetType(EFFECT_TYPE_SINGLE)`);
        lines.push(`  e_rt_notrg:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)`);
        lines.push(`  e_rt_notrg:SetCode(EFFECT_CANNOT_TRIGGER)`);
        lines.push(`  c:RegisterEffect(e_rt_notrg)`);
      }

      // 5. 作为融合/同调/超量/连接召唤素材的限制
      if (r.materialRestriction) {
        const codes = [];
        const mt = r.materialType || 'all_extra';
        if (mt === 'all_extra') {
          codes.push('EFFECT_CANNOT_BE_FUSION_MATERIAL', 'EFFECT_CANNOT_BE_SYNCHRO_MATERIAL', 'EFFECT_CANNOT_BE_XYZ_MATERIAL', 'EFFECT_CANNOT_BE_LINK_MATERIAL');
        } else if (mt === 'any_material') codes.push('EFFECT_CANNOT_BE_MATERIAL');
        else if (mt === 'fusion_only') codes.push('EFFECT_CANNOT_BE_FUSION_MATERIAL');
        else if (mt === 'synchro_only') codes.push('EFFECT_CANNOT_BE_SYNCHRO_MATERIAL');
        else if (mt === 'xyz_only') codes.push('EFFECT_CANNOT_BE_XYZ_MATERIAL');
        else if (mt === 'link_only') codes.push('EFFECT_CANNOT_BE_LINK_MATERIAL');
        lines.push(`  -- 效果外文本: 不能作为召唤素材`);
        codes.forEach((code, i) => {
          const v = `e_rt_mat${i}`;
          if (i === 0) {
            lines.push(`  local ${v}=Effect.CreateEffect(c)`);
            lines.push(`  ${v}:SetType(EFFECT_TYPE_SINGLE)`);
            lines.push(`  ${v}:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)`);
          } else {
            lines.push(`  local ${v}=e_rt_mat0:Clone()`);
          }
          lines.push(`  ${v}:SetCode(${code})`);
          lines.push(`  ${v}:SetValue(1)`);
          lines.push(`  c:RegisterEffect(${v})`);
        });
      }

      // 6. 不能解放
      if (r.cannotBeReleased) {
        lines.push(`  -- 效果外文本: 不能解放`);
        lines.push(`  local e_rt_rel=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_rel:SetType(EFFECT_TYPE_SINGLE)`);
        lines.push(`  e_rt_rel:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)`);
        lines.push(`  e_rt_rel:SetCode(EFFECT_UNRELEASABLE_SUM)`);
        lines.push(`  e_rt_rel:SetValue(1)`);
        lines.push(`  c:RegisterEffect(e_rt_rel)`);
        lines.push(`  local e_rt_rel2=e_rt_rel:Clone()`);
        lines.push(`  e_rt_rel2:SetCode(EFFECT_UNRELEASABLE_NONSUM)`);
        lines.push(`  c:RegisterEffect(e_rt_rel2)`);
      }

      // 7. 规则上追加怪兽种类 (同调/超量/融合/效果等)
      if (r.addMonsterType) {
        const tmap = { effect: 'TYPE_EFFECT', fusion: 'TYPE_FUSION', synchro: 'TYPE_SYNCHRO', xyz: 'TYPE_XYZ', link: 'TYPE_LINK', ritual: 'TYPE_RITUAL', pendulum: 'TYPE_PENDULUM' };
        const tv = tmap[r.addMonsterType];
        if (tv) {
          lines.push(`  -- 效果外文本: 规则上追加怪兽种类`);
          lines.push(`  local e_rt_type=Effect.CreateEffect(c)`);
          lines.push(`  e_rt_type:SetType(EFFECT_TYPE_SINGLE)`);
          lines.push(`  e_rt_type:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)`);
          lines.push(`  e_rt_type:SetCode(EFFECT_ADD_TYPE)`);
          lines.push(`  e_rt_type:SetValue(${tv})`);
          lines.push(`  c:RegisterEffect(e_rt_type)`);
        }
      }

      // 8. 规则上变更属性
      if (r.ruleAttribute) {
        const amap = { dark: 'ATTRIBUTE_DARK', light: 'ATTRIBUTE_LIGHT', earth: 'ATTRIBUTE_EARTH', water: 'ATTRIBUTE_WATER', fire: 'ATTRIBUTE_FIRE', wind: 'ATTRIBUTE_WIND', divine: 'ATTRIBUTE_DIVINE' };
        const av = amap[r.ruleAttribute];
        if (av) {
          lines.push(`  -- 效果外文本: 规则上变更属性`);
          lines.push(`  local e_rt_attr=Effect.CreateEffect(c)`);
          lines.push(`  e_rt_attr:SetType(EFFECT_TYPE_SINGLE)`);
          lines.push(`  e_rt_attr:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)`);
          lines.push(`  e_rt_attr:SetCode(EFFECT_CHANGE_ATTRIBUTE)`);
          lines.push(`  e_rt_attr:SetValue(${av})`);
          lines.push(`  c:RegisterEffect(e_rt_attr)`);
        }
      }

      // 9. 规则上追加种族
      if (r.ruleRace) {
        const rmap = {
          warrior: 'RACE_WARRIOR', spellcaster: 'RACE_SPELLCASTER', fairy: 'RACE_FAIRY', fiend: 'RACE_FIEND',
          zombie: 'RACE_ZOMBIE', machine: 'RACE_MACHINE', aqua: 'RACE_AQUA', pyro: 'RACE_PYRO', rock: 'RACE_ROCK',
          wingedbeast: 'RACE_WINGEDBEAST', plant: 'RACE_PLANT', insect: 'RACE_INSECT', thunder: 'RACE_THUNDER',
          dragon: 'RACE_DRAGON', beast: 'RACE_BEAST', beastwarrior: 'RACE_BEASTWARRIOR', dinosaur: 'RACE_DINOSAUR',
          fish: 'RACE_FISH', seaserpent: 'RACE_SEASERPENT', reptile: 'RACE_REPTILE', psychic: 'RACE_PSYCHIC',
          divinebeast: 'RACE_DIVINE', wyrm: 'RACE_WYRM', cyberse: 'RACE_CYBERSE', illusion: 'RACE_ILLUSION'
        };
        const rv = rmap[r.ruleRace];
        if (rv) {
          lines.push(`  -- 效果外文本: 规则上追加种族`);
          lines.push(`  local e_rt_race=Effect.CreateEffect(c)`);
          lines.push(`  e_rt_race:SetType(EFFECT_TYPE_SINGLE)`);
          lines.push(`  e_rt_race:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)`);
          lines.push(`  e_rt_race:SetCode(EFFECT_ADD_RACE)`);
          lines.push(`  e_rt_race:SetValue(${rv})`);
          lines.push(`  c:RegisterEffect(e_rt_race)`);
        }
      }

      // 10. 规则上变更等级 (灵摆怪兽的等级仅在怪兽区生效)
      const ruleLevel = parseInt(r.ruleLevel) || 0;
      if (ruleLevel > 0) {
        lines.push(`  -- 效果外文本: 规则上变更等级`);
        lines.push(`  local e_rt_lv=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_lv:SetType(EFFECT_TYPE_SINGLE)`);
        lines.push(`  e_rt_lv:SetProperty(EFFECT_FLAG_SINGLE_RANGE+EFFECT_FLAG_CANNOT_DISABLE)`);
        lines.push(`  e_rt_lv:SetRange(LOCATION_MZONE)`);
        lines.push(`  e_rt_lv:SetCode(EFFECT_CHANGE_LEVEL)`);
        lines.push(`  e_rt_lv:SetValue(${ruleLevel})`);
        lines.push(`  c:RegisterEffect(e_rt_lv)`);
      }

      // 11. 不能变更表示形式
      if (r.cannotChangePosition) {
        lines.push(`  -- 效果外文本: 不能变更表示形式`);
        lines.push(`  local e_rt_pos=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_pos:SetType(EFFECT_TYPE_SINGLE)`);
        lines.push(`  e_rt_pos:SetProperty(EFFECT_FLAG_SINGLE_RANGE+EFFECT_FLAG_CANNOT_DISABLE)`);
        lines.push(`  e_rt_pos:SetRange(LOCATION_MZONE)`);
        lines.push(`  e_rt_pos:SetCode(EFFECT_CANNOT_CHANGE_POSITION)`);
        lines.push(`  c:RegisterEffect(e_rt_pos)`);
      }

      // 12. 不能攻击
      if (r.cannotAttack) {
        lines.push(`  -- 效果外文本: 不能攻击`);
        lines.push(`  local e_rt_atk=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_atk:SetType(EFFECT_TYPE_SINGLE)`);
        lines.push(`  e_rt_atk:SetProperty(EFFECT_FLAG_SINGLE_RANGE+EFFECT_FLAG_CANNOT_DISABLE)`);
        lines.push(`  e_rt_atk:SetRange(LOCATION_MZONE)`);
        lines.push(`  e_rt_atk:SetCode(EFFECT_CANNOT_ATTACK)`);
        lines.push(`  c:RegisterEffect(e_rt_atk)`);
      }

      // 13. 不能成为攻击对象
      if (r.cannotBeAttacked) {
        lines.push(`  -- 效果外文本: 不能成为攻击对象`);
        lines.push(`  local e_rt_bt=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_bt:SetType(EFFECT_TYPE_SINGLE)`);
        lines.push(`  e_rt_bt:SetProperty(EFFECT_FLAG_SINGLE_RANGE+EFFECT_FLAG_CANNOT_DISABLE)`);
        lines.push(`  e_rt_bt:SetRange(LOCATION_MZONE)`);
        lines.push(`  e_rt_bt:SetCode(EFFECT_CANNOT_BE_BATTLE_TARGET)`);
        lines.push(`  e_rt_bt:SetValue(aux.imval1)`);
        lines.push(`  c:RegisterEffect(e_rt_bt)`);
      }

      // 14. 可以直接攻击
      if (r.canDirectAttack) {
        lines.push(`  -- 效果外文本: 可以直接攻击`);
        lines.push(`  local e_rt_da=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_da:SetType(EFFECT_TYPE_SINGLE)`);
        lines.push(`  e_rt_da:SetCode(EFFECT_DIRECT_ATTACK)`);
        lines.push(`  c:RegisterEffect(e_rt_da)`);
      }

      // 15. 追加通常召唤次数 (EFFECT_EXTRA_SUMMON_COUNT)
      if (r.extraSummonCount) {
        const count = parseInt(r.extraSummonCountValue) || 1;
        lines.push(`  -- 效果外文本: 追加通常召唤次数`);
        lines.push(`  local e_rt_extsum=Effect.CreateEffect(c)`);
        lines.push(`  e_rt_extsum:SetType(EFFECT_TYPE_FIELD)`);
        lines.push(`  e_rt_extsum:SetRange(LOCATION_MZONE)`);
        lines.push(`  e_rt_extsum:SetCode(EFFECT_EXTRA_SUMMON_COUNT)`);
        lines.push(`  e_rt_extsum:SetTargetRange(LOCATION_HAND+LOCATION_MZONE,0)`);
        lines.push(`  e_rt_extsum:SetValue(${count})`);
        lines.push(`  c:RegisterEffect(e_rt_extsum)`);
      }
    }

    // 15. 自定义独有规则：仅写入卡面文本，不生成脚本（引擎无法解析自由语句）
    if (r.customRule && r.customRuleText) {
      lines.push(`  -- 效果外文本(自定义): ${String(r.customRuleText).replace(/[\r\n]+/g, ' ')}`);
      lines.push(`  -- [注意] 自定义规则为自由文本，无法自动生成可执行脚本，请自行按需补写 Lua`);
    }
  }

  /**
   * 额外卡组召唤方式手续装配。
   *
   * 严格对齐 ProjectIgnis/CardScripts 官方语料的调用签名：
   *   Xyz.AddProcedure(c,filter,level,count)
   *   Synchro.AddProcedure(c,filter1,min1,max1,filter2,min2,max2)
   *   Link.AddProcedure(c,filter,min,count)
   *   Fusion.AddProcMixN(c,self,self2,filter,count) / Fusion.AddProcMixRep(c,self,self2,filter,min,max)
   *   Ritual.AddProcGreater({handler=c,filter=...,stage2=...})
   * 素材筛选留空时使用 aux.TRUE（不限素材）。
   */
  assembleSummonProcedure(lines, cardData) {
    const type = cardData.type || 0;
    const isMonster = (type & 1) || cardData.mainType === 'monster' || !(type & (2 | 4));
    if (!isMonster) return;

    const r = cardData.ruleTexts || {};
    // 默认依怪兽种类自动适配召唤手续；用户可显式关闭
    if (r.autoSummonProcedure === false) return;
    const matFilter = r.procMaterialFilterExpr || 'aux.TRUE';
    const procType = r.procSummonType || (type & 64 ? 'fusion' : type & 8192 ? 'synchro' : type & 8388608 ? 'xyz' : type & 67108864 ? 'link' : type & 128 ? 'ritual' : '');

    const level = parseInt(cardData.level) || 4;
    const count = parseInt(r.procMaterialCount) || 2;

    if (procType === 'fusion') {
      const n = parseInt(r.procMaterialCount) || 2;
      lines.push(`  -- 召唤方式手续: 融合召唤 (需 ${n} 只素材)`);
      lines.push(`  Fusion.AddProcMixN(c,true,true,${matFilter},${n})`);
    } else if (procType === 'synchro') {
      lines.push(`  -- 召唤方式手续: 同调召唤 (调整 + 非调整)`);
      lines.push(`  Synchro.AddProcedure(c,nil,1,1,Synchro.NonTuner(nil),1,99)`);
    } else if (procType === 'xyz') {
      lines.push(`  -- 召唤方式手续: 超量召唤 (阶级 ${level} · ${count} 只素材)`);
      lines.push(`  Xyz.AddProcedure(c,nil,${level},${count})`);
    } else if (procType === 'link') {
      lines.push(`  -- 召唤方式手续: 连接召唤 (需 ${count} 只素材)`);
      lines.push(`  Link.AddProcedure(c,${matFilter},${count},${count})`);
    } else if (procType === 'ritual') {
      lines.push(`  -- 召唤方式手续: 仪式召唤 (仪式魔法与素材均不设限，可按需补填 filter/matfilter)`);
      lines.push(`  Ritual.AddProcGreater({handler=c,matfilter=${matFilter}})`);
    }
  }

  /**
   * 1. 永续效果装配 (Continuous)
   * 规则：不进连锁、无代价、不取对象、无 operation 链
   */
  assembleContinuousEffect(lines, logicFunctions, slot, idx, sym) {
    // 允许用「效果本体(Action)」指定常驻子类型：immune_all / atk_boost
    let subType = slot.subType || 'immune_all';
    if (slot.action === 'immune_all') subType = 'immune_all';
    if (slot.action === 'atk_boost') subType = 'atk_boost_1000';
    const range = slot.range === 'grave' ? 'LOCATION_GRAVE' : slot.range === 'szone' ? 'LOCATION_SZONE' : 'LOCATION_MZONE';

    lines.push(`  local e${idx}=Effect.CreateEffect(c)`);
    lines.push(`  e${idx}:SetType(EFFECT_TYPE_SINGLE)`);
    lines.push(`  e${idx}:SetProperty(EFFECT_FLAG_SINGLE_RANGE)`);
    lines.push(`  e${idx}:SetRange(${range})`);

    if (subType === 'immune_all') {
      lines.push(`  e${idx}:SetCode(EFFECT_IMMUNE_EFFECT)`);
      lines.push(`  e${idx}:SetValue(s.efilter${idx})`);
      lines.push(`  c:RegisterEffect(e${idx})`);
      logicFunctions.push(`-- 效果${sym} 不受对方卡效果影响过滤\nfunction s.efilter${idx}(e,te)\n  return te:GetOwnerPlayer()~=e:GetHandlerPlayer()\nend`);
    } else if (subType === 'atk_boost_1000') {
      lines.push(`  e${idx}:SetCode(EFFECT_UPDATE_ATTACK)`);
      lines.push(`  e${idx}:SetValue(1000)`);
      lines.push(`  c:RegisterEffect(e${idx})`);
      lines.push(`  local e${idx}_def=e${idx}:Clone()`);
      lines.push(`  e${idx}_def:SetCode(EFFECT_UPDATE_DEFENSE)`);
      lines.push(`  c:RegisterEffect(e${idx}_def)`);
    } else if (subType === 'indestructable_battle') {
      lines.push(`  e${idx}:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)`);
      lines.push(`  e${idx}:SetValue(1)`);
      lines.push(`  c:RegisterEffect(e${idx})`);
    } else if (subType === 'indestructable_effect') {
      lines.push(`  e${idx}:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)`);
      lines.push(`  e${idx}:SetValue(s.indval${idx})`);
      lines.push(`  c:RegisterEffect(e${idx})`);
      logicFunctions.push(`-- 效果${sym} 不受对方效果破坏判定\nfunction s.indval${idx}(e,re,tp)\n  return tp~=e:GetHandlerPlayer()\nend`);
    } else if (subType === 'indestructable_both') {
      lines.push(`  e${idx}:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)`);
      lines.push(`  e${idx}:SetValue(1)`);
      lines.push(`  c:RegisterEffect(e${idx})`);
      lines.push(`  local e${idx}_eff=e${idx}:Clone()`);
      lines.push(`  e${idx}_eff:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)`);
      lines.push(`  e${idx}_eff:SetValue(s.indval${idx})`);
      lines.push(`  c:RegisterEffect(e${idx}_eff)`);
      logicFunctions.push(`-- 效果${sym} 不受对方效果破坏判定\nfunction s.indval${idx}(e,re,tp)\n  return tp~=e:GetHandlerPlayer()\nend`);
    } else if (subType === 'cannot_target') {
      lines.push(`  e${idx}:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET)`);
      lines.push(`  e${idx}:SetValue(aux.tgoval)`);
      lines.push(`  c:RegisterEffect(e${idx})`);
    } else if (subType === 'lock_spsummon') {
      lines.push(`  e${idx}:SetType(EFFECT_TYPE_FIELD)`);
      lines.push(`  e${idx}:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)`);
      lines.push(`  e${idx}:SetProperty(EFFECT_FLAG_PLAYER_TARGET)`);
      lines.push(`  e${idx}:SetTargetRange(1,1)`);
      lines.push(`  c:RegisterEffect(e${idx})`);
    } else if (subType === 'grave_substitute') {
      lines.push(`  e${idx}:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)`);
      lines.push(`  e${idx}:SetCode(EFFECT_DESTROY_REPLACE)`);
      lines.push(`  e${idx}:SetRange(LOCATION_GRAVE)`);
      lines.push(`  e${idx}:SetTarget(s.reptg${idx})`);
      lines.push(`  e${idx}:SetValue(s.repval${idx})`);
      lines.push(`  e${idx}:SetOperation(s.repop${idx})`);
      lines.push(`  c:RegisterEffect(e${idx})`);
      logicFunctions.push(`-- 效果${sym} 墓地除外代替破坏判定\nfunction s.repfilter${idx}(c,tp)\n  return c:IsControler(tp) and c:IsOnField() and c:IsReason(REASON_BATTLE+REASON_EFFECT) and not c:IsReason(REASON_REPLACE)\nend\nfunction s.reptg${idx}(e,tp,eg,ep,ev,re,r,rp,chk)\n  if chk==0 then return e:GetHandler():IsAbleToRemove() and eg:IsExists(s.repfilter${idx},1,nil,tp) end\n  return Duel.SelectEffectYesNo(tp,e:GetHandler(),96)\nend\nfunction s.repval${idx}(e,c)\n  return s.repfilter${idx}(c,e:GetHandlerPlayer())\nend\nfunction s.repop${idx}(e,tp,eg,ep,ev,re,r,rp)\n  Duel.Remove(e:GetHandler(),POS_FACEUP,REASON_EFFECT)\nend`);
    }
  }

  /**
   * 2. 特召手续装配 (Procedure)
   * 规则：不进连锁、非发动式、EFFECT_FLAG_UNCOPYABLE
   */
  assembleProcedureEffect(lines, logicFunctions, slot, idx, sym) {
    const procType = slot.procType || 'no_monsters';

    lines.push(`  local e${idx}=Effect.CreateEffect(c)`);
    lines.push(`  e${idx}:SetType(EFFECT_TYPE_FIELD)`);
    lines.push(`  e${idx}:SetCode(EFFECT_SPSUMMON_PROC)`);
    lines.push(`  e${idx}:SetProperty(EFFECT_FLAG_UNCOPYABLE)`);
    lines.push(`  e${idx}:SetRange(LOCATION_HAND)`);
    lines.push(`  e${idx}:SetCondition(s.spcon${idx})`);

    if (procType === 'no_monsters') {
      lines.push(`  c:RegisterEffect(e${idx})`);
      logicFunctions.push(`-- 效果${sym} 空场特殊召唤手续判定\nfunction s.spcon${idx}(e,c)\n  if c==nil then return true end\n  local tp=c:GetControler()\n  return Duel.GetLocationCount(tp,LOCATION_MZONE)>0\n    and Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)==0\nend`);
    } else if (procType === 'release_one') {
      lines.push(`  e${idx}:SetOperation(s.spop${idx})`);
      lines.push(`  c:RegisterEffect(e${idx})`);
      logicFunctions.push(`-- 效果${sym} 解放怪兽特殊召唤手续\nfunction s.spcon${idx}(e,c)\n  if c==nil then return true end\n  local tp=c:GetControler()\n  return Duel.CheckReleaseGroup(tp,aux.TRUE,1,false,1,true,c,tp,nil,false,nil)\nend\nfunction s.spop${idx}(e,tp,eg,ep,ev,re,r,rp,c)\n  local g=Duel.SelectReleaseGroup(tp,aux.TRUE,1,1,false,true,true,c,nil,nil,false,nil)\n  Duel.Release(g,REASON_COST)\nend`);
    } else if (procType === 'banish_one_gy') {
      lines.push(`  e${idx}:SetOperation(s.spop${idx})`);
      lines.push(`  c:RegisterEffect(e${idx})`);
      logicFunctions.push(`-- 效果${sym} 墓地除外特殊召唤手续\nfunction s.spcon${idx}(e,c)\n  if c==nil then return true end\n  local tp=c:GetControler()\n  return Duel.GetLocationCount(tp,LOCATION_MZONE)>0\n    and Duel.IsExistingMatchingCard(Card.IsAbleToRemoveAsCost,tp,LOCATION_GRAVE,0,1,nil)\nend\nfunction s.spop${idx}(e,tp,eg,ep,ev,re,r,rp,c)\n  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)\n  local g=Duel.SelectMatchingCard(tp,Card.IsAbleToRemoveAsCost,tp,LOCATION_GRAVE,0,1,1,nil)\n  Duel.Remove(g,POS_FACEUP,REASON_COST)\nend`);
    }
  }

  /**
   * 3. 发动式效果装配 (Trigger, Quick, Ignition)
   */
  assembleActivatedEffect(lines, logicFunctions, slot, idx, sym, slotIndex, cardData) {
    const timing = slot.timing || (slot.effectType === 'trigger' ? (slot.event || 'summon_both') : (slot.effectType === 'quick' ? (slot.quickTiming || 'quick_free') : 'ignition_omit'));
    let effectType = slot.effectType;
    if (!effectType) {
      if (timing.startsWith('quick_')) effectType = 'quick';
      else if (timing.startsWith('summon_') || timing.startsWith('to_grave_') || timing.startsWith('destroyed_') || timing.startsWith('banished_') || timing.startsWith('field_card_') || timing === 'battle_destroy_oppo') effectType = 'trigger';
      else effectType = 'ignition';
    }
    const action = slot.action || 'destroy_target';
    const isWhen = slot.timingMode === 'when';

    lines.push(`  local e${idx}=Effect.CreateEffect(c)`);
    lines.push(`  e${idx}:SetDescription(aux.Stringid(id,${slotIndex}))`);
    lines.push(`  e${idx}:SetCategory(${this.getCategoryCode(action, slot)})`);

    const properties = [];
    if (effectType === 'trigger' && !isWhen) {
      properties.push('EFFECT_FLAG_DELAY');
    }
    if (this.isTargetingAction(action, slot.target)) {
      properties.push('EFFECT_FLAG_CARD_TARGET');
    }

    const isSpell = (cardData && (cardData.type & 2)) || (cardData && cardData.mainType === 'spell');
    const isTrap = (cardData && (cardData.type & 4)) || (cardData && cardData.mainType === 'trap');
    const isContinuous = cardData && (cardData.type & 131072);
    const isField = cardData && (cardData.type & 524288);
    const isEquip = cardData && (cardData.type & 262144);
    const isCounter = cardData && (cardData.type & 1048576) && isTrap;
    const isQuickPlay = cardData && ((cardData.type & 65536) || (isSpell && (cardData.type & 1048576)));

    // 类型与事件映射
    if ((isSpell || isTrap) && !isContinuous && !isField && !isEquip && slotIndex === 0) {
      // 通常魔法/速攻魔法/仪式魔法/通常陷阱/反击陷阱 主发动效果
      lines.push(`  e${idx}:SetType(EFFECT_TYPE_ACTIVATE)`);
      if (isCounter || timing === 'quick_chain' || slot.quickTiming === 'quick_chain') {
        lines.push(`  e${idx}:SetCode(EVENT_CHAINING)`);
      } else {
        lines.push(`  e${idx}:SetCode(EVENT_FREE_CHAIN)`);
      }
      if (isQuickPlay || (isTrap && !isCounter)) {
        lines.push(`  e${idx}:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)`);
      }
    } else if (isContinuous) {
      const typeStr = effectType === 'quick' ? 'EFFECT_TYPE_QUICK_O' : effectType === 'trigger' ? 'EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O' : 'EFFECT_TYPE_IGNITION';
      lines.push(`  e${idx}:SetType(${typeStr})`);
      lines.push(`  e${idx}:SetRange(LOCATION_SZONE)`);
      if (effectType === 'quick') {
        lines.push(`  e${idx}:SetCode(EVENT_FREE_CHAIN)`);
        lines.push(`  e${idx}:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)`);
      }
    } else if (isField) {
      const typeStr = effectType === 'quick' ? 'EFFECT_TYPE_QUICK_O' : effectType === 'trigger' ? 'EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O' : 'EFFECT_TYPE_IGNITION';
      lines.push(`  e${idx}:SetType(${typeStr})`);
      lines.push(`  e${idx}:SetRange(LOCATION_FZONE)`);
      if (effectType === 'quick') {
        lines.push(`  e${idx}:SetCode(EVENT_FREE_CHAIN)`);
        lines.push(`  e${idx}:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)`);
      }
    } else if (isEquip) {
      lines.push(`  e${idx}:SetType(EFFECT_TYPE_EQUIP)`);
    } else if (slot.range === 'grave') {
      const typeStr = effectType === 'quick' ? 'EFFECT_TYPE_QUICK_O' : effectType === 'trigger' ? 'EFFECT_TYPE_TRIGGER_O' : 'EFFECT_TYPE_IGNITION';
      lines.push(`  e${idx}:SetType(${typeStr})`);
      lines.push(`  e${idx}:SetRange(LOCATION_GRAVE)`);
    } else if (effectType === 'trigger') {
      const isMandatory = slot.triggerType === 'mandatory';
      if (timing === 'field_card_destroyed') {
        lines.push(`  e${idx}:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)`);
        lines.push(`  e${idx}:SetCode(EVENT_DESTROYED)`);
        lines.push(`  e${idx}:SetRange(LOCATION_MZONE)`);
      } else if (timing === 'field_card_banished') {
        lines.push(`  e${idx}:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)`);
        lines.push(`  e${idx}:SetCode(EVENT_REMOVE)`);
        lines.push(`  e${idx}:SetRange(LOCATION_MZONE)`);
      } else {
        const typeStr = isMandatory ? 'EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F' : 'EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O';
        lines.push(`  e${idx}:SetType(${typeStr})`);

        if (timing === 'to_grave_general' || timing === 'to_grave' || timing === 'to_grave_from_field_summoned') {
          lines.push(`  e${idx}:SetCode(EVENT_TO_GRAVE)`);
        } else if (timing === 'destroyed_battle_or_effect' || timing === 'destroyed_by_oppo' || timing === 'destroyed') {
          lines.push(`  e${idx}:SetCode(EVENT_DESTROYED)`);
        } else if (timing === 'banished_self') {
          lines.push(`  e${idx}:SetCode(EVENT_REMOVE)`);
        } else if (timing === 'battle_destroy_oppo' || timing === 'battle_destroy') {
          lines.push(`  e${idx}:SetCode(EVENT_BATTLE_DESTROYING)`);
        } else if (timing === 'summon_ns') {
          lines.push(`  e${idx}:SetCode(EVENT_SUMMON_SUCCESS)`);
        } else if (timing === 'summon_ss' || timing.startsWith('summon_')) {
          lines.push(`  e${idx}:SetCode(EVENT_SPSUMMON_SUCCESS)`);
        } else { // summon_both or default
          lines.push(`  e${idx}:SetCode(EVENT_SUMMON_SUCCESS)`);
        }
      }
    } else if (effectType === 'quick') {
      lines.push(`  e${idx}:SetType(EFFECT_TYPE_QUICK_O)`);
      lines.push(`  e${idx}:SetRange(LOCATION_MZONE)`);
      if (timing === 'quick_chain' || slot.quickTiming === 'quick_chain') {
        lines.push(`  e${idx}:SetCode(EVENT_CHAINING)`);
      } else {
        lines.push(`  e${idx}:SetCode(EVENT_FREE_CHAIN)`);
        if (timing === 'quick_oppo_main') {
          lines.push(`  e${idx}:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_MAIN_END)`);
        } else {
          lines.push(`  e${idx}:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)`);
        }
      }
    } else { // ignition
      lines.push(`  e${idx}:SetType(EFFECT_TYPE_IGNITION)`);
      lines.push(`  e${idx}:SetRange(LOCATION_MZONE)`);
    }

    // 属性标志汇总设置，避免重复覆写
    if (properties.length > 0) {
      lines.push(`  e${idx}:SetProperty(${properties.join('+')})`);
    }

    // HOPT 频次限制规范：严格遵循 id, id+o, id+2*o...（支持自定义次数 N）
    const countNum = parseInt(slot.countNumber) || 1;
    if (slot.countLimit === 'hopt') {
      const hoptCode = slotIndex === 0 ? 'id' : slotIndex === 1 ? 'id+o' : `id+${slotIndex}*o`;
      lines.push(`  e${idx}:SetCountLimit(${countNum},${hoptCode})`);
    } else if (slot.countLimit === 'sopt') {
      lines.push(`  e${idx}:SetCountLimit(${countNum})`);
    } else if (slot.countLimit === 'duel') {
      const hoptCode = slotIndex === 0 ? 'id' : slotIndex === 1 ? 'id+o' : `id+${slotIndex}*o`;
      lines.push(`  e${idx}:SetCountLimit(${countNum},${hoptCode}+EFFECT_COUNT_CODE_DUEL)`);
    }

    // 条件判定
    if (this.needsCondition(slot)) {
      lines.push(`  e${idx}:SetCondition(s.con${idx})`);
    }

    // 代价
    if (slot.cost && slot.cost !== 'none') {
      lines.push(`  e${idx}:SetCost(s.cost${idx})`);
    }

    // 目标检查与操作
    lines.push(`  e${idx}:SetTarget(s.tg${idx})`);
    lines.push(`  e${idx}:SetOperation(s.op${idx})`);
    lines.push(`  c:RegisterEffect(e${idx})`);

    // 特殊触发克隆：召唤成功同时适配特殊召唤成功 (召/特召通用)
    if (effectType === 'trigger' && (timing === 'summon_both' || (!slot.timing && (slot.event === 'summon_success' || !slot.event)))) {
      lines.push(`  local e${idx}_sp=e${idx}:Clone()`);
      lines.push(`  e${idx}_sp:SetCode(EVENT_SPSUMMON_SUCCESS)`);
      lines.push(`  c:RegisterEffect(e${idx}_sp)`);
    }

    // 生成对应的 Con, Cost, Tg, Op 函数
    logicFunctions.push(this.generateActivatedLogic(idx, slot, sym, cardData));
  }

  isTargetingAction(action, target) {
    if (target === 'none' && action !== 'negate_punish') return false;
    return ['destroy_target', 'banish_target', 'to_hand_target', 'revive_grave', 'negate_target_monster', 'negate_punish'].includes(action);
  }

  needsCondition(slot) {
    if (slot.condition && slot.condition !== 'none') return true;
    const timing = slot.timing || '';
    if (['quick_chain', 'quick_oppo_turn', 'quick_oppo_main'].includes(timing)) return true;
    if (['summon_fusion', 'summon_ritual', 'summon_synchro', 'summon_xyz', 'summon_link', 'summon_with_mat'].includes(timing)) return true;
    if (['to_grave_from_field_summoned', 'destroyed_battle_or_effect', 'destroyed_by_oppo', 'field_card_destroyed', 'field_card_banished', 'battle_destroy_oppo'].includes(timing)) return true;
    if (['ignition_no_monsters', 'ignition_oppo_more_cards', 'ignition_oppo_monsters_count'].includes(timing)) return true;
    if (slot.effectType === 'quick' && slot.quickTiming === 'quick_chain') return true;
    if (slot.effectType === 'trigger' && slot.event === 'battle_destroy') return true;
    return false;
  }

  /**
   * 依 slot 的「代价筛选（字段 / 卡类）」生成代价用的卡片筛选函数。
   * 仅当用户填写了字段或卡类时才生成；返回 null 表示沿用内置 Card.IsXxx。
   */
  buildCostFilter(idx, slot) {
    const baseMap = {
      discard_n: 'c:IsDiscardable()',
      discard_one: 'c:IsDiscardable()',
      banish_gy_n: 'c:IsAbleToRemoveAsCost()',
      banish_one_gy: 'c:IsAbleToRemoveAsCost()',
      banish_hand_n: 'c:IsAbleToRemoveAsCost()',
      release_monster_n: 'c:IsReleasable()',
      send_to_grave_n: 'c:IsAbleToGraveAsCost()',
      mill_deck_n: 'c:IsAbleToGraveAsCost()'
    };
    const base = baseMap[slot.cost];
    if (!base) return null;

    const typeMap = { monster: 'TYPE_MONSTER', spell: 'TYPE_SPELL', trap: 'TYPE_TRAP' };
    const setcode = String(slot.costFilterSetcode || '').trim();
    const setcodeExpr = /^0x[0-9a-fA-F]+$/.test(setcode) || /^[0-9]+$/.test(setcode) ? setcode : null;
    const typeConst = typeMap[slot.costFilterType] || null;
    if (!setcodeExpr && !typeConst) return null;

    const conds = [base];
    if (typeConst) conds.push(`c:IsType(${typeConst})`);
    if (setcodeExpr) conds.push(`c:IsSetCard(${setcodeExpr})`);

    const name = `s.cstflt${idx}`;
    return {
      ref: name,
      lines: [`-- 代价筛选条件 (字段 / 卡类限制)`, `function ${name}(c)`, `  return ${conds.join(' and ')}`, `end`]
    };
  }

  /**
   * 依 slot 的「字段 / 系列 (Setcode)」与「卡类」限制生成筛选函数。
   * 返回 { ref, lines } 或 null（null 时调用方沿用内置 Card.IsXxx）。
   * force=true 的动作（如卡组特召）即使没有额外限制也会生成函数，以修正过滤条件。
   */
  buildActionFilter(idx, slot, action, tag) {
    const typeMap = { monster: 'TYPE_MONSTER', spell: 'TYPE_SPELL', trap: 'TYPE_TRAP' };
    const setcode = String(slot.filterSetcode || '').trim();
    const setcodeExpr = /^0x[0-9a-fA-F]+$/.test(setcode) || /^[0-9]+$/.test(setcode) ? setcode : null;
    const typeConst = typeMap[slot.filterType] || null;

    const specs = {
      search_deck: { params: 'c', base: ['c:IsAbleToHand()'] },
      dump_deck: { params: 'c', base: ['c:IsAbleToGrave()'] },
      special_summon_deck: {
        params: 'c,e,tp',
        base: ['c:IsCanBeSpecialSummoned(e,0,tp,false,false)'],
        addMonsterWhenNoType: true,
        force: true
      },
      salvage_extra: {
        params: 'c',
        base: ['c:IsFaceup()', 'c:IsAbleToHand()'],
        addPendulumWhenNoType: true,
        force: true
      },
      revive_grave: { params: 'c,e,tp', base: ['c:IsCanBeSpecialSummoned(e,0,tp,false,false)'] }
    };
    const spec = specs[action];
    const isTargetAction = ['destroy_target', 'banish_target', 'to_hand_target'].includes(action);
    if (!spec && !(isTargetAction && (setcodeExpr || typeConst))) return null;
    if (spec && !spec.force && !setcodeExpr && !typeConst) return null;

    const conds = spec ? [...spec.base] : [];
    const needType = !typeConst;
    if (typeConst) conds.push(`c:IsType(${typeConst})`);
    if (spec && spec.addMonsterWhenNoType && needType) conds.push('c:IsType(TYPE_MONSTER)');
    if (spec && spec.addPendulumWhenNoType && needType) conds.push('c:IsType(TYPE_PENDULUM)');
    if (setcodeExpr) conds.push(`c:IsSetCard(${setcodeExpr})`);
    if (conds.length === 0) return null;

    const name = `s.flt${idx}${tag || ''}`;
    return {
      ref: name,
      lines: [`-- 效果筛选条件 (字段 / 卡类限制)`, `function ${name}(${spec ? spec.params : 'c'})`, `  return ${conds.join(' and ')}`, `end`]
    };
  }

  /**
   * 通用「二选一自由组合」分支生成器。
   * 每个分支是独立配置 { action, filterType, filterSetcode, filterArchetype, count, value, target }，
   * 返回该分支的可用性表达式、分类码、SetOperationInfo 与效果处理代码。
   */
  buildChoiceBranch(idx, tag, sub) {
    const action = (sub && sub.action) || 'search_deck';
    const typeMap = { monster: 'TYPE_MONSTER', spell: 'TYPE_SPELL', trap: 'TYPE_TRAP' };
    const setcode = String((sub && sub.filterSetcode) || '').trim();
    const setcodeExpr = /^0x[0-9a-fA-F]+$/.test(setcode) || /^[0-9]+$/.test(setcode) ? setcode : null;
    const typeConst = typeMap[(sub && sub.filterType) || ''] || null;
    const filterName = `s.cflt${idx}${tag}`;
    const lines = [];

    // 生成筛选函数（OCGCore 要求传入可调用的 function，不能用表达式字符串）。
    // params 为筛选函数形参（如 'c' 或 'c,e,tp'），extra 为 Duel.* 调用在 nil 之后追加的实参。
    const mkFilter = (params, body, extra) => {
      const conds = [body];
      if (typeConst) conds.push(`c:IsType(${typeConst})`);
      if (setcodeExpr) conds.push(`c:IsSetCard(${setcodeExpr})`);
      lines.push(`-- 二选一分支${tag} 筛选条件`);
      lines.push(`function ${filterName}(${params})`);
      lines.push(`  return ${conds.join(' and ')}`);
      lines.push(`end`);
      return { ref: filterName, extra: extra || '' };
    };

    const r = { lines, category: 'CATEGORY_TOHAND', feasible: 'false', setOp: [], op: [] };

    if (action === 'search_deck') {
      const f = mkFilter('c', 'c:IsAbleToHand()');
      r.feasible = `Duel.IsExistingMatchingCard(${f.ref},tp,LOCATION_DECK,0,1,nil${f.extra})`;
      r.category = 'CATEGORY_TOHAND+CATEGORY_SEARCH';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)`];
      r.op = [
        `Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)`,
        `local g=Duel.SelectMatchingCard(tp,${f.ref},tp,LOCATION_DECK,0,1,1,nil${f.extra})`,
        `if #g>0 then Duel.SendtoHand(g,nil,REASON_EFFECT) Duel.ConfirmCards(1-tp,g) end`
      ];
    } else if (action === 'dump_deck') {
      const f = mkFilter('c', 'c:IsAbleToGrave()');
      r.feasible = `Duel.IsExistingMatchingCard(${f.ref},tp,LOCATION_DECK,0,1,nil${f.extra})`;
      r.category = 'CATEGORY_TOGRAVE+CATEGORY_DECKDES';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,tp,LOCATION_DECK)`];
      r.op = [
        `Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)`,
        `local g=Duel.SelectMatchingCard(tp,${f.ref},tp,LOCATION_DECK,0,1,1,nil${f.extra})`,
        `if #g>0 then Duel.SendtoGrave(g,REASON_EFFECT) end`
      ];
    } else if (action === 'special_summon_deck' || action === 'revive_grave' || action === 'special_summon_hand') {
      const loc = action === 'special_summon_deck' ? 'LOCATION_DECK' : (action === 'revive_grave' ? 'LOCATION_GRAVE' : 'LOCATION_HAND');
      const f = mkFilter('c,e,tp', 'c:IsCanBeSpecialSummoned(e,0,tp,false,false)', ',e,tp');
      r.feasible = `Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(${f.ref},tp,${loc},0,1,nil${f.extra})`;
      r.category = 'CATEGORY_SPECIAL_SUMMON';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,${loc})`];
      r.op = [
        `if Duel.GetLocationCount(tp,LOCATION_MZONE)>0 then`,
        `  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)`,
        `  local g=Duel.SelectMatchingCard(tp,${f.ref},tp,${loc},0,1,1,nil${f.extra})`,
        `  if #g>0 then Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP) end`,
        `end`
      ];
    } else if (action === 'destroy_target') {
      const f = mkFilter('c', 'c:IsDestructable()');
      r.feasible = `Duel.IsExistingMatchingCard(${f.ref},tp,0,LOCATION_ONFIELD,1,nil${f.extra})`;
      r.category = 'CATEGORY_DESTROY';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,1,0,0)`];
      r.op = [
        `Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)`,
        `local g=Duel.SelectMatchingCard(tp,${f.ref},tp,0,LOCATION_ONFIELD,1,1,nil${f.extra})`,
        `if #g>0 then Duel.Destroy(g,REASON_EFFECT) end`
      ];
    } else if (action === 'banish_target') {
      const f = mkFilter('c', 'c:IsAbleToRemove()');
      r.feasible = `Duel.IsExistingMatchingCard(${f.ref},tp,0,LOCATION_ONFIELD,1,nil${f.extra})`;
      r.category = 'CATEGORY_REMOVE';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,1,0,0)`];
      r.op = [
        `Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)`,
        `local g=Duel.SelectMatchingCard(tp,${f.ref},tp,0,LOCATION_ONFIELD,1,1,nil${f.extra})`,
        `if #g>0 then Duel.Remove(g,POS_FACEUP,REASON_EFFECT) end`
      ];
    } else if (action === 'to_hand_target') {
      const f = mkFilter('c', 'c:IsAbleToHand()');
      r.feasible = `Duel.IsExistingMatchingCard(${f.ref},tp,0,LOCATION_ONFIELD,1,nil${f.extra})`;
      r.category = 'CATEGORY_TOHAND';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,0,0)`];
      r.op = [
        `Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RTOHAND)`,
        `local g=Duel.SelectMatchingCard(tp,${f.ref},tp,0,LOCATION_ONFIELD,1,1,nil${f.extra})`,
        `if #g>0 then Duel.SendtoHand(g,nil,REASON_EFFECT) end`
      ];
    } else if (action === 'draw_cards') {
      const cnt = Math.max(1, parseInt(sub && sub.count) || 1);
      r.feasible = `Duel.IsPlayerCanDraw(tp,${cnt})`;
      r.category = 'CATEGORY_DRAW';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,${cnt})`];
      r.op = [`Duel.Draw(tp,${cnt},REASON_EFFECT)`];
    } else if (action === 'burn_damage') {
      const val = Math.max(0, parseInt(sub && sub.value) || 1000);
      const who = (sub && sub.target === 'self') ? 'tp' : '1-tp';
      r.feasible = 'true';
      r.category = 'CATEGORY_DAMAGE';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,${who},${val})`];
      r.op = [`Duel.Damage(${who},${val},REASON_EFFECT)`];
    } else if (action === 'gain_lp') {
      const val = Math.max(0, parseInt(sub && sub.value) || 1000);
      r.feasible = 'true';
      r.category = 'CATEGORY_RECOVER';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,${val})`];
      r.op = [`Duel.Recover(tp,${val},REASON_EFFECT)`];
    } else if (action === 'destroy_self_all') {
      r.feasible = `Duel.IsExistingMatchingCard(aux.TRUE,tp,LOCATION_ONFIELD,0,1,nil)`;
      r.category = 'CATEGORY_DESTROY';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,1,0,0)`];
      r.op = [
        `local g=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_ONFIELD,0,nil)`,
        `if #g>0 then Duel.Destroy(g,REASON_EFFECT) end`
      ];
    } else if (action === 'wipe_oppo_monsters') {
      r.feasible = `Duel.IsExistingMatchingCard(aux.TRUE,tp,0,LOCATION_MZONE,1,nil)`;
      r.category = 'CATEGORY_DESTROY';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,1,0,0)`];
      r.op = [
        `local g=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_MZONE,nil)`,
        `if #g>0 then Duel.Destroy(g,REASON_EFFECT) end`
      ];
    } else if (action === 'wipe_oppo_all') {
      r.feasible = `Duel.IsExistingMatchingCard(aux.TRUE,tp,0,LOCATION_ONFIELD,1,nil)`;
      r.category = 'CATEGORY_DESTROY';
      r.setOp = [`Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,1,0,0)`];
      r.op = [
        `local g=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_ONFIELD,nil)`,
        `if #g>0 then Duel.Destroy(g,REASON_EFFECT) end`
      ];
    }
    return r;
  }

  /** 二选一分支的卡文筛选短语 */
  getSubFilterPhrase(s, isJa) {
    const typeNameZh = { monster: '怪兽', spell: '魔法卡', trap: '陷阱卡' }[s.filterType] || '';
    const typeNameJa = { monster: 'モンスター', spell: '魔法カード', trap: '罠カード' }[s.filterType] || '';
    const arch = (s.filterArchetype || '').trim() || (s.filterSetcode ? '此系列' : '');
    const archTxt = arch ? `「${arch}」` : '';
    if (!archTxt && !typeNameZh) return '';
    return isJa ? `${archTxt}${typeNameJa}` : `${archTxt}${typeNameZh || '卡'}`;
  }

  /** 生成「二选一自由组合」单个分支的卡文短语 */
  getChoiceBranchText(sub, isJa) {
    const s = sub || {};
    const fp = this.getSubFilterPhrase(s, isJa);
    const n = Math.max(1, parseInt(s.count) || 1);
    const jaNum = { 1: '１', 2: '２', 3: '３', 4: '４', 5: '５', 6: '６' }[n] || String(n);
    const val = Math.max(0, parseInt(s.value) || 1000);
    const who = s.target === 'self' ? (isJa ? '自分' : '自己') : (isJa ? '相手' : '对方');
    // 中文量词：指定怪兽或动作隐含对象为怪兽时用「只」，其余用「张」
    const monsterDefault = ['special_summon_deck', 'special_summon_hand', 'revive_grave'].includes(s.action || '');
    const mw = (s.filterType === 'monster' || (!s.filterType && monsterDefault)) ? '只' : '张';
    const map = {
      search_deck: isJa ? `デッキから${fp || 'カード'}１枚を手札に加える。` : `从卡组把1${mw}${fp || '卡'}加入手牌。`,
      dump_deck: isJa ? `デッキから${fp || 'カード'}１枚を墓地へ送る。` : `从卡组把1${mw}${fp || '卡'}送去墓地。`,
      special_summon_deck: isJa ? `デッキから${fp || 'モンスター'}１体を特殊召喚する。` : `从卡组把1只${fp || '怪兽'}特殊召唤。`,
      special_summon_hand: isJa ? `手札から${fp || 'モンスター'}１体を特殊召喚する。` : `从手卡把1只${fp || '怪兽'}特殊召唤。`,
      revive_grave: isJa ? `自分の墓地から${fp || 'モンスター'}１体を特殊召喚する。` : `从自己墓地选1只${fp || '怪兽'}特殊召唤。`,
      destroy_target: isJa ? `相手フィールドの${fp || 'カード'}１枚を破壊する。` : `破坏对方场上1${mw}${fp || '卡'}。`,
      banish_target: isJa ? `相手フィールドの${fp || 'カード'}１枚を除外する。` : `把对方场上1${mw}${fp || '卡'}除外。`,
      to_hand_target: isJa ? `相手フィールドの${fp || 'カード'}１枚を持ち主の手札に戻す。` : `让对方场上1${mw}${fp || '卡'}回到持有者手牌。`,
      draw_cards: isJa ? `デッキから${jaNum}枚ドローする。` : `从卡组抽${n}张卡。`,
      burn_damage: isJa ? `${who}に${val}ダメージを与える。` : `给${who}造成${val}点伤害。`,
      gain_lp: isJa ? `自分は${val}ＬＰ回復する。` : `自己回复${val}点基本分。`,
      destroy_self_all: isJa ? '自分フィールドのカードを全て破壊する。' : '自己场上的卡全部破坏。',
      wipe_oppo_monsters: isJa ? '相手フィールドのモンスターを全て破壊する。' : '对方场上的怪兽全部破坏。',
      wipe_oppo_all: isJa ? '相手フィールドのカードを全て破壊する。' : '对方场上的卡全部破坏。'
    };
    return map[s.action || 'search_deck'] || (isJa ? '効果を適用する。' : '进行效果处理。');
  }

  generateActivatedLogic(idx, slot, sym, cardData) {
    const parts = [];
    const actionFilter = this.buildActionFilter(idx, slot, slot.action || 'destroy_target');
    if (actionFilter) parts.push(...actionFilter.lines);
    const fref = actionFilter ? actionFilter.ref : null;
    const timing = slot.timing || (slot.effectType === 'trigger' ? (slot.event || 'summon_both') : (slot.effectType === 'quick' ? (slot.quickTiming || 'quick_free') : 'ignition_omit'));
    let effectType = slot.effectType;
    if (!effectType) {
      if (timing.startsWith('quick_')) effectType = 'quick';
      else if (timing.startsWith('summon_') || timing.startsWith('to_grave_') || timing.startsWith('destroyed_') || timing.startsWith('banished_') || timing.startsWith('field_card_') || timing === 'battle_destroy_oppo') effectType = 'trigger';
      else effectType = 'ignition';
    }
    const action = slot.action || 'destroy_target';

    // 1. Condition
    if (this.needsCondition(slot)) {
      parts.push(`-- 效果${sym} 发动条件`);
      parts.push(`function s.con${idx}(e,tp,eg,ep,ev,re,r,rp)`);
      if (timing === 'ignition_no_monsters' || slot.condition === 'no_monsters') {
        parts.push(`  return Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)==0`);
      } else if (timing === 'ignition_oppo_more_cards') {
        parts.push(`  return Duel.GetFieldGroupCount(tp,0,LOCATION_ONFIELD)>Duel.GetFieldGroupCount(tp,LOCATION_ONFIELD,0)`);
      } else if (timing === 'ignition_oppo_monsters_count') {
        const count = parseInt(slot.oppoMonsterCount) || 2;
        parts.push(`  return Duel.GetFieldGroupCount(tp,0,LOCATION_MZONE)>=${count}`);
      } else if (timing === 'quick_chain' || (effectType === 'quick' && slot.quickTiming === 'quick_chain')) {
        parts.push(`  return rp==1-tp and Duel.IsChainNegatable(ev)`);
      } else if (timing === 'quick_oppo_turn') {
        parts.push(`  return Duel.GetTurnPlayer()~=tp`);
      } else if (timing === 'quick_oppo_main') {
        parts.push(`  return Duel.GetTurnPlayer()~=tp and Duel.IsMainPhase()`);
      } else if (timing === 'summon_fusion') {
        parts.push(`  return e:GetHandler():IsSummonType(SUMMON_TYPE_FUSION)`);
      } else if (timing === 'summon_ritual') {
        parts.push(`  return e:GetHandler():IsSummonType(SUMMON_TYPE_RITUAL)`);
      } else if (timing === 'summon_synchro') {
        parts.push(`  return e:GetHandler():IsSummonType(SUMMON_TYPE_SYNCHRO)`);
      } else if (timing === 'summon_xyz') {
        parts.push(`  return e:GetHandler():IsSummonType(SUMMON_TYPE_XYZ)`);
      } else if (timing === 'summon_link') {
        parts.push(`  return e:GetHandler():IsSummonType(SUMMON_TYPE_LINK)`);
      } else if (timing === 'summon_with_mat') {
        parts.push(`  local c=e:GetHandler()`);
        parts.push(`  local mg=c:GetMaterial()`);
        parts.push(`  return mg and #mg>0`);
      } else if (timing === 'to_grave_from_field_summoned') {
        const stype = slot.summonTypeParam || 'fusion';
        const typeConst = stype === 'synchro' ? 'SUMMON_TYPE_SYNCHRO' : stype === 'xyz' ? 'SUMMON_TYPE_XYZ' : stype === 'link' ? 'SUMMON_TYPE_LINK' : stype === 'ritual' ? 'SUMMON_TYPE_RITUAL' : 'SUMMON_TYPE_FUSION';
        parts.push(`  local c=e:GetHandler()`);
        parts.push(`  return c:IsPreviousLocation(LOCATION_MZONE) and c:IsSummonType(${typeConst})`);
      } else if (timing === 'destroyed_battle_or_effect') {
        parts.push(`  local c=e:GetHandler()`);
        parts.push(`  return c:IsReason(REASON_BATTLE+REASON_EFFECT)`);
      } else if (timing === 'destroyed_by_oppo' || slot.event === 'destroyed') {
        parts.push(`  local c=e:GetHandler()`);
        parts.push(`  return c:IsReason(REASON_BATTLE) or (rp==1-tp and c:IsReason(REASON_EFFECT) and c:IsPreviousControler(tp))`);
      } else if (timing === 'field_card_destroyed') {
        parts.push(`  return eg:IsExists(s.fcfilter${idx},1,nil,tp)`);
      } else if (timing === 'field_card_banished') {
        parts.push(`  return eg:IsExists(s.fcrmfilter${idx},1,nil,tp)`);
      } else if (timing === 'battle_destroy_oppo' || slot.event === 'battle_destroy') {
        parts.push(`  local c=e:GetHandler()`);
        parts.push(`  local bc=c:GetBattleTarget()`);
        parts.push(`  return c:IsRelateToBattle() and bc:IsLocation(LOCATION_GRAVE) and bc:IsType(TYPE_MONSTER)`);
      } else {
        parts.push(`  return true`);
      }
      parts.push(`end`);

      if (timing === 'field_card_destroyed') {
        parts.push(`function s.fcfilter${idx}(c,tp)`);
        parts.push(`  return c:IsPreviousControler(tp) and c:IsPreviousLocation(LOCATION_ONFIELD) and c:IsPreviousPosition(POS_FACEUP) and c:IsReason(REASON_BATTLE+REASON_EFFECT)`);
        parts.push(`end`);
      } else if (timing === 'field_card_banished') {
        parts.push(`function s.fcrmfilter${idx}(c,tp)`);
        parts.push(`  return c:IsPreviousControler(tp) and c:IsPreviousLocation(LOCATION_ONFIELD) and c:IsPreviousPosition(POS_FACEUP)`);
        parts.push(`end`);
      }
    }

    // 2. Cost（支持数量与字段/卡类自定义）
    if (slot.cost && slot.cost !== 'none') {
      const costCount = Math.max(1, parseInt(slot.costCount) || 1);
      const cflt = this.buildCostFilter(idx, slot);
      // 筛选函数必须定义在顶层，切勿嵌入 cost 函数体内
      if (cflt) parts.push(...cflt.lines);
      const cf = cflt ? cflt.ref : null;
      parts.push(`-- 效果${sym} 发动代价`);
      parts.push(`function s.cost${idx}(e,tp,eg,ep,ev,re,r,rp,chk)`);

      if (slot.cost === 'discard_self') {
        parts.push(`  if chk==0 then return e:GetHandler():IsDiscardable() end`);
        parts.push(`  Duel.SendtoGrave(e:GetHandler(),REASON_COST+REASON_DISCARD)`);
      } else if (slot.cost === 'release_self') {
        parts.push(`  if chk==0 then return e:GetHandler():IsReleasable() end`);
        parts.push(`  Duel.Release(e:GetHandler(),REASON_COST)`);
      } else if (slot.cost === 'discard_one' || slot.cost === 'discard_n') {
        const raw = slot.cost === 'discard_one' ? 1 : costCount;
        const f = cf || 'Card.IsDiscardable';
        parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(${f},tp,LOCATION_HAND,0,${raw},nil) end`);
        parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DISCARD)`);
        parts.push(`  Duel.DiscardHand(tp,${f},${raw},${raw},REASON_COST+REASON_DISCARD,nil)`);
      } else if (slot.cost === 'pay_1000' || slot.cost === 'pay_lp') {
        const lpVal = parseInt(slot.costLp) || 1000;
        parts.push(`  if chk==0 then return Duel.CheckLPCost(tp,${lpVal}) end`);
        parts.push(`  Duel.PayLPCost(tp,${lpVal})`);
      } else if (slot.cost === 'detach_xyz') {
        parts.push(`  if chk==0 then return e:GetHandler():CheckRemoveOverlayCard(tp,${costCount},REASON_COST) end`);
        parts.push(`  e:GetHandler():RemoveOverlayCard(tp,${costCount},${costCount},REASON_COST)`);
      } else if (slot.cost === 'banish_one_gy' || slot.cost === 'banish_gy_n') {
        const raw = slot.cost === 'banish_one_gy' ? 1 : costCount;
        const f = cf || 'Card.IsAbleToRemoveAsCost';
        parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(${f},tp,LOCATION_GRAVE,0,${raw},nil) end`);
        parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)`);
        parts.push(`  local g=Duel.SelectMatchingCard(tp,${f},tp,LOCATION_GRAVE,0,${raw},${raw},nil)`);
        parts.push(`  Duel.Remove(g,POS_FACEUP,REASON_COST)`);
      } else if (slot.cost === 'release_monster_n') {
        const f = cf || 'aux.TRUE';
        parts.push(`  if chk==0 then return Duel.CheckReleaseGroup(tp,${f},${costCount},nil) end`);
        parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RELEASE)`);
        parts.push(`  local g=Duel.SelectReleaseGroup(tp,${f},${costCount},${costCount},nil)`);
        parts.push(`  Duel.Release(g,REASON_COST)`);
      } else if (slot.cost === 'send_to_grave_n') {
        const f = cf || 'Card.IsAbleToGraveAsCost';
        parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(${f},tp,LOCATION_ONFIELD,0,${costCount},nil) end`);
        parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)`);
        parts.push(`  local g=Duel.SelectMatchingCard(tp,${f},tp,LOCATION_ONFIELD,0,${costCount},${costCount},nil)`);
        parts.push(`  Duel.SendtoGrave(g,REASON_COST)`);
      } else if (slot.cost === 'banish_hand_n') {
        const f = cf || 'Card.IsAbleToRemoveAsCost';
        parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(${f},tp,LOCATION_HAND,0,${costCount},nil) end`);
        parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)`);
        parts.push(`  local g=Duel.SelectMatchingCard(tp,${f},tp,LOCATION_HAND,0,${costCount},${costCount},nil)`);
        parts.push(`  Duel.Remove(g,POS_FACEUP,REASON_COST)`);
      } else if (slot.cost === 'mill_deck_n') {
        if (cf) {
          // 指定字段/卡类时，从卡组挑选并送去墓地作为代价
          parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(${cf},tp,LOCATION_DECK,0,${costCount},nil) end`);
          parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)`);
          parts.push(`  local g=Duel.SelectMatchingCard(tp,${cf},tp,LOCATION_DECK,0,${costCount},${costCount},nil)`);
          parts.push(`  Duel.SendtoGrave(g,REASON_COST)`);
        } else {
          parts.push(`  if chk==0 then return Duel.IsPlayerCanDiscardDeckAsCost(tp,${costCount}) end`);
          parts.push(`  Duel.DiscardDeck(tp,${costCount},REASON_COST)`);
        }
      }
      parts.push(`end`);
    }

    // 3. Target
    parts.push(`-- 效果${sym} 发动检查与取对象`);
    parts.push(`function s.tg${idx}(e,tp,eg,ep,ev,re,r,rp,chk,chkc)`);
    if (action === 'destroy_target') {
      const f = fref || 'aux.TRUE';
      parts.push(`  if chkc then return ${fref ? `${fref}(chkc)` : 'chkc:IsOnField()'} end`);
      parts.push(`  if chk==0 then return Duel.IsExistingTarget(${f},tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)`);
      parts.push(`  local g=Duel.SelectTarget(tp,${f},tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)`);
    } else if (action === 'banish_target') {
      const f = fref || 'Card.IsAbleToRemove';
      parts.push(`  if chkc then return ${fref ? `${fref}(chkc)` : 'chkc:IsAbleToRemove()'} and chkc:IsControler(1-tp) end`);
      parts.push(`  if chk==0 then return Duel.IsExistingTarget(${f},tp,0,LOCATION_ONFIELD+LOCATION_GRAVE,1,nil) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)`);
      parts.push(`  local g=Duel.SelectTarget(tp,${f},tp,0,LOCATION_ONFIELD+LOCATION_GRAVE,1,1,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,1,0,0)`);
    } else if (action === 'to_hand_target') {
      const f = fref || 'Card.IsAbleToHand';
      parts.push(`  if chkc then return ${fref ? `${fref}(chkc)` : 'chkc:IsOnField() and chkc:IsAbleToHand()'} end`);
      parts.push(`  if chk==0 then return Duel.IsExistingTarget(${f},tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RTOHAND)`);
      parts.push(`  local g=Duel.SelectTarget(tp,${f},tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_TOHAND,g,1,0,0)`);
    } else if (action === 'revive_grave') {
      const f = fref || 'Card.IsCanBeSpecialSummoned';
      const ex = fref ? ',e,tp' : ',e,0,tp,false,false';
      parts.push(`  if chkc then return chkc:IsLocation(LOCATION_GRAVE)${fref ? ` and ${fref}(chkc,e,tp)` : ` and chkc:IsCanBeSpecialSummoned(e,0,tp,false,false)`} end`);
      parts.push(`  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0`);
      parts.push(`    and Duel.IsExistingTarget(${f},tp,LOCATION_GRAVE,0,1,nil${ex}) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)`);
      parts.push(`  local g=Duel.SelectTarget(tp,${f},tp,LOCATION_GRAVE,0,1,1,nil${ex})`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,1,0,0)`);
    } else if (action === 'search_deck') {
      const f = fref || 'Card.IsAbleToHand';
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(${f},tp,LOCATION_DECK,0,1,nil) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)`);
    } else if (action === 'draw_cards') {
      parts.push(`  if chk==0 then return Duel.IsPlayerCanDraw(tp,2) end`);
      parts.push(`  Duel.SetTargetPlayer(tp)`);
      parts.push(`  Duel.SetTargetParam(2)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,2)`);
    } else if (action === 'wipe_oppo_all') {
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(aux.TRUE,tp,0,LOCATION_ONFIELD,1,nil) end`);
      parts.push(`  local g=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_ONFIELD,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)`);
    } else if (action === 'wipe_oppo_monsters') {
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(aux.TRUE,tp,0,LOCATION_MZONE,1,nil) end`);
      parts.push(`  local g=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_MZONE,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)`);
    } else if (action === 'wipe_oppo_spells') {
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(aux.TRUE,tp,0,LOCATION_SZONE,1,nil) end`);
      parts.push(`  local g=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_SZONE,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)`);
    } else if (action === 'negate_and_destroy') {
      parts.push(`  if chk==0 then return true end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)`);
      parts.push(`  if re:GetHandler():IsDestructable() and re:GetHandler():IsRelateToEffect(re) then`);
      parts.push(`    Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0)`);
      parts.push(`  end`);
    } else if (action === 'negate_activation') {
      parts.push(`  if chk==0 then return true end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)`);
    } else if (action === 'burn_battle_destroy') {
      parts.push(`  local bc=e:GetHandler():GetBattleTarget()`);
      parts.push(`  local dam=bc:GetBaseAttack()`);
      parts.push(`  if dam<0 then dam=0 end`);
      parts.push(`  Duel.SetTargetPlayer(1-tp)`);
      parts.push(`  Duel.SetTargetParam(dam)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,dam)`);
    } else if (action === 'burn_damage') {
      const burnVal = parseInt(slot.burnValue) || 1000;
      const burnTarget = slot.burnTargetPlayer === 'self' ? 'tp' : '1-tp';
      parts.push(`  if chk==0 then return true end`);
      parts.push(`  Duel.SetTargetPlayer(${burnTarget})`);
      parts.push(`  Duel.SetTargetParam(${burnVal})`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,${burnTarget},${burnVal})`);
    } else if (action === 'destroy_self_all') {
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(aux.TRUE,tp,LOCATION_ONFIELD,0,1,nil) end`);
      parts.push(`  local g=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_ONFIELD,0,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)`);
    } else if (action === 'negate_punish') {
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,PLAYER_ALL,1)`);
    } else if (action === 'special_summon_hand') {
      parts.push(`  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0`);
      parts.push(`    and Duel.IsExistingMatchingCard(Card.IsCanBeSpecialSummoned,tp,LOCATION_HAND,0,1,nil,e,0,tp,false,false) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_HAND)`);
    } else if (action === 'salvage_extra') {
      const f = fref || 'Card.IsAbleToHand';
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(${f},tp,LOCATION_EXTRA,0,1,nil) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_EXTRA)`);
    } else if (action === 'immune_all' || action === 'atk_boost') {
      parts.push(`  if chk==0 then return true end`);
    } else if (action === 'choice_free') {
      const subA = slot.choiceA || { action: 'search_deck' };
      const subB = slot.choiceB || { action: 'dump_deck' };
      const bA = this.buildChoiceBranch(idx, 'A', subA);
      const bB = this.buildChoiceBranch(idx, 'B', subB);
      parts.unshift(...bA.lines, ...bB.lines);
      parts.push(`  local b1=${bA.feasible}`);
      parts.push(`  local b2=${bB.feasible}`);
      parts.push(`  if chk==0 then return b1 or b2 end`);
      parts.push(`  local op=Duel.SelectEffect(tp,{b1,aux.Stringid(id,1)},{b2,aux.Stringid(id,2)})`);
      parts.push(`  e:SetLabel(op)`);
      parts.push(`  if op==1 then`);
      parts.push(`    e:SetCategory(${bA.category})`);
      for (const l of bA.setOp) parts.push(`    ${l}`);
      parts.push(`  else`);
      parts.push(`    e:SetCategory(${bB.category})`);
      for (const l of bB.setOp) parts.push(`    ${l}`);
      parts.push(`  end`);
    } else if (action === 'special_summon_self') {
      parts.push(`  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0`);
      parts.push(`    and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)`);
    } else if (action === 'dump_deck') {
      const f = fref || 'Card.IsAbleToGrave';
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(${f},tp,LOCATION_DECK,0,1,nil) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,tp,LOCATION_DECK)`);
    } else if (action === 'special_summon_deck') {
      const f = fref || 'Card.IsCanBeSpecialSummoned';
      const ex = fref ? ',e,tp' : ',e,0,tp,false,false';
      parts.push(`  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0`);
      parts.push(`    and Duel.IsExistingMatchingCard(${f},tp,LOCATION_DECK,0,1,nil${ex}) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)`);
    } else if (action === 'negate_punish') {
      parts.push(`  if chkc then return chkc:IsOnField() end`);
      parts.push(`  if chk==0 then return Duel.IsExistingTarget(aux.TRUE,tp,0,LOCATION_ONFIELD,1,nil) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)`);
      parts.push(`  local g=Duel.SelectTarget(tp,aux.TRUE,tp,0,LOCATION_ONFIELD,1,1,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,PLAYER_ALL,1)`);
    } else if (action === 'negate_target_monster') {
      parts.push(`  if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsControler(1-tp) and chkc:IsFaceup() end`);
      parts.push(`  if chk==0 then return Duel.IsExistingTarget(Card.IsFaceup,tp,0,LOCATION_MZONE,1,nil) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)`);
      parts.push(`  local g=Duel.SelectTarget(tp,Card.IsFaceup,tp,0,LOCATION_MZONE,1,1,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DISABLE,g,1,0,0)`);
    } else if (action === 'p_destroy_search') {
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(Card.IsAbleToHand,tp,LOCATION_DECK,0,1,nil) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DESTROY,e:GetHandler(),1,0,0)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)`);
    } else if (action === 'choice_search_or_dump') {
      parts.push(`  local b1=Duel.IsExistingMatchingCard(Card.IsAbleToHand,tp,LOCATION_DECK,0,1,nil)`);
      parts.push(`  local b2=Duel.IsExistingMatchingCard(Card.IsAbleToGrave,tp,LOCATION_DECK,0,1,nil)`);
      parts.push(`  if chk==0 then return b1 or b2 end`);
      parts.push(`  local op=Duel.SelectEffect(tp,{b1,aux.Stringid(id,1)},{b2,aux.Stringid(id,2)})`);
      parts.push(`  e:SetLabel(op)`);
      parts.push(`  if op==1 then`);
      parts.push(`    e:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)`);
      parts.push(`    Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)`);
      parts.push(`  else`);
      parts.push(`    e:SetCategory(CATEGORY_TOGRAVE)`);
      parts.push(`    Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,tp,LOCATION_DECK)`);
      parts.push(`  end`);
    } else if (action === 'choice_ss_or_search') {
      parts.push(`  local b1=Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(aux.TRUE,tp,LOCATION_DECK,0,1,nil,e,tp)`);
      parts.push(`  local b2=Duel.IsExistingMatchingCard(Card.IsAbleToHand,tp,LOCATION_DECK,0,1,nil)`);
      parts.push(`  if chk==0 then return b1 or b2 end`);
      parts.push(`  local op=Duel.SelectEffect(tp,{b1,aux.Stringid(id,1)},{b2,aux.Stringid(id,2)})`);
      parts.push(`  e:SetLabel(op)`);
      parts.push(`  if op==1 then`);
      parts.push(`    e:SetCategory(CATEGORY_SPECIAL_SUMMON)`);
      parts.push(`    Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)`);
      parts.push(`  else`);
      parts.push(`    e:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)`);
      parts.push(`    Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)`);
      parts.push(`  end`);
    } else if (action === 'choice_destroy_or_banish') {
      parts.push(`  local b1=Duel.IsExistingMatchingCard(aux.TRUE,tp,0,LOCATION_ONFIELD,1,nil)`);
      parts.push(`  local b2=Duel.IsExistingMatchingCard(Card.IsAbleToRemove,tp,0,LOCATION_ONFIELD,1,nil)`);
      parts.push(`  if chk==0 then return b1 or b2 end`);
      parts.push(`  local op=Duel.SelectEffect(tp,{b1,aux.Stringid(id,1)},{b2,aux.Stringid(id,2)})`);
      parts.push(`  e:SetLabel(op)`);
      parts.push(`  if op==1 then`);
      parts.push(`    e:SetCategory(CATEGORY_DESTROY)`);
      parts.push(`    Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,1,0,0)`);
      parts.push(`  else`);
      parts.push(`    e:SetCategory(CATEGORY_REMOVE)`);
      parts.push(`    Duel.SetOperationInfo(0,CATEGORY_REMOVE,nil,1,0,0)`);
      parts.push(`  end`);
    } else if (action === 'choice_draw_or_burn') {
      parts.push(`  local b1=Duel.IsPlayerCanDraw(tp,2)`);
      parts.push(`  local b2=true`);
      parts.push(`  if chk==0 then return b1 or b2 end`);
      parts.push(`  local op=Duel.SelectEffect(tp,{b1,aux.Stringid(id,1)},{b2,aux.Stringid(id,2)})`);
      parts.push(`  e:SetLabel(op)`);
      parts.push(`  if op==1 then`);
      parts.push(`    e:SetCategory(CATEGORY_DRAW)`);
      parts.push(`    Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,2)`);
      parts.push(`  else`);
      parts.push(`    e:SetCategory(CATEGORY_DAMAGE)`);
      parts.push(`    Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,2000)`);
      parts.push(`  end`);
    } else {
      parts.push(`  if chk==0 then return true end`);
    }
    parts.push(`end`);

    // 4. Operation
    parts.push(`-- 效果${sym} 效果连锁处理`);
    parts.push(`function s.op${idx}(e,tp,eg,ep,ev,re,r,rp)`);
    if (action === 'choice_free') {
      const subA = slot.choiceA || { action: 'search_deck' };
      const subB = slot.choiceB || { action: 'dump_deck' };
      const bA = this.buildChoiceBranch(idx, 'A', subA);
      const bB = this.buildChoiceBranch(idx, 'B', subB);
      parts.push(`  local op=e:GetLabel()`);
      parts.push(`  if op==1 then`);
      for (const l of bA.op) parts.push(`    ${l}`);
      parts.push(`  else`);
      for (const l of bB.op) parts.push(`    ${l}`);
      parts.push(`  end`);
    } else if (action === 'destroy_target') {
      parts.push(`  local tc=Duel.GetFirstTarget()`);
      parts.push(`  if tc and tc:IsRelateToEffect(e) then`);
      parts.push(`    Duel.Destroy(tc,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'banish_target') {
      parts.push(`  local tc=Duel.GetFirstTarget()`);
      parts.push(`  if tc and tc:IsRelateToEffect(e) then`);
      parts.push(`    Duel.Remove(tc,POS_FACEUP,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'to_hand_target') {
      parts.push(`  local tc=Duel.GetFirstTarget()`);
      parts.push(`  if tc and tc:IsRelateToEffect(e) then`);
      parts.push(`    Duel.SendtoHand(tc,nil,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'revive_grave') {
      parts.push(`  local tc=Duel.GetFirstTarget()`);
      parts.push(`  if tc and tc:IsRelateToEffect(e) then`);
      parts.push(`    Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)`);
      parts.push(`  end`);
    } else if (action === 'search_deck') {
      const f = fref || 'Card.IsAbleToHand';
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)`);
      parts.push(`  local g=Duel.SelectMatchingCard(tp,${f},tp,LOCATION_DECK,0,1,1,nil)`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.SendtoHand(g,nil,REASON_EFFECT)`);
      parts.push(`    Duel.ConfirmCards(1-tp,g)`);
      parts.push(`  end`);
    } else if (action === 'draw_cards') {
      parts.push(`  local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)`);
      parts.push(`  Duel.Draw(p,d,REASON_EFFECT)`);
    } else if (action === 'wipe_oppo_all') {
      parts.push(`  local g=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_ONFIELD,nil)`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.Destroy(g,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'wipe_oppo_monsters') {
      parts.push(`  local g=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_MZONE,nil)`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.Destroy(g,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'wipe_oppo_spells') {
      parts.push(`  local g=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_SZONE,nil)`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.Destroy(g,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'negate_and_destroy') {
      parts.push(`  if Duel.NegateActivation(ev) and re:GetHandler():IsRelateToEffect(re) then`);
      parts.push(`    Duel.Destroy(eg,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'negate_activation') {
      parts.push(`  Duel.NegateActivation(ev)`);
    } else if (action === 'burn_battle_destroy') {
      parts.push(`  local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)`);
      parts.push(`  Duel.Damage(p,d,REASON_EFFECT)`);
    } else if (action === 'burn_damage') {
      parts.push(`  local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)`);
      parts.push(`  Duel.Damage(p,d,REASON_EFFECT)`);
    } else if (action === 'destroy_self_all') {
      parts.push(`  local g=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_ONFIELD,0,nil)`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.Destroy(g,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'negate_punish') {
      const req = parseInt(slot.punishDiscardCount) || 2;
      const tgtName = slot.punishTarget === 'self' ? 'tp' : '1-tp';
      parts.push(`  local tc=Duel.GetFirstTarget()`);
      parts.push(`  if not (tc and tc:IsRelateToEffect(e)) then return end`);
      parts.push(`  local b=Duel.IsExistingMatchingCard(Card.IsDiscardable,${tgtName},LOCATION_HAND,0,${req},nil)`);
      parts.push(`  local op=0`);
      parts.push(`  if b then`);
      parts.push(`    op=Duel.SelectEffect(${tgtName},{true,aux.Stringid(id,0)},{false,aux.Stringid(id,1)})`);
      parts.push(`  end`);
      parts.push(`  Duel.BreakEffect()`);
      parts.push(`  if op==1 then`);
      parts.push(`    Duel.DiscardHand(${tgtName},Card.IsDiscardable,${req},${req},REASON_EFFECT+REASON_DISCARD,nil)`);
      parts.push(`    Duel.Draw(tp,1,REASON_EFFECT)`);
      parts.push(`    Duel.Draw(1-tp,1,REASON_EFFECT)`);
      parts.push(`  else`);
      parts.push(`    Duel.Destroy(tc,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'special_summon_hand') {
      parts.push(`  if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)`);
      parts.push(`  local g=Duel.SelectMatchingCard(tp,Card.IsCanBeSpecialSummoned,tp,LOCATION_HAND,0,1,1,nil,e,0,tp,false,false)`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)`);
      parts.push(`  end`);
    } else if (action === 'salvage_extra') {
      const f = fref || 'Card.IsAbleToHand';
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)`);
      parts.push(`  local g=Duel.SelectMatchingCard(tp,${f},tp,LOCATION_EXTRA,0,1,1,nil)`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.SendtoHand(g,nil,REASON_EFFECT)`);
      parts.push(`    Duel.ConfirmCards(1-tp,g)`);
      parts.push(`  end`);
    } else if (action === 'immune_all' || action === 'atk_boost') {
      // 常驻型动作：实际效果在 assembleContinuousEffect 中登记，这里无需连锁处理
    } else if (action === 'special_summon_self') {
      parts.push(`  local c=e:GetHandler()`);
      parts.push(`  if c:IsRelateToEffect(e) then`);
      parts.push(`    Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)`);
      parts.push(`  end`);
    } else if (action === 'dump_deck') {
      const f = fref || 'Card.IsAbleToGrave';
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)`);
      parts.push(`  local g=Duel.SelectMatchingCard(tp,${f},tp,LOCATION_DECK,0,1,1,nil)`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.SendtoGrave(g,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'special_summon_deck') {
      const f = fref || 'Card.IsCanBeSpecialSummoned';
      const ex = fref ? ',e,tp' : ',e,0,tp,false,false';
      parts.push(`  if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)`);
      parts.push(`  local g=Duel.SelectMatchingCard(tp,${f},tp,LOCATION_DECK,0,1,1,nil${ex})`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)`);
      parts.push(`  end`);
    } else if (action === 'negate_target_monster') {
      parts.push(`  local tc=Duel.GetFirstTarget()`);
      parts.push(`  if tc and tc:IsRelateToEffect(e) and tc:IsFaceup() and not tc:IsDisabled() then`);
      parts.push(`    Duel.NegateRelatedChain(tc,RESET_TURN_SET)`);
      parts.push(`    local e1=Effect.CreateEffect(e:GetHandler())`);
      parts.push(`    e1:SetType(EFFECT_TYPE_SINGLE)`);
      parts.push(`    e1:SetCode(EFFECT_DISABLE)`);
      parts.push(`    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)`);
      parts.push(`    tc:RegisterEffect(e1)`);
      parts.push(`    local e2=Effect.CreateEffect(e:GetHandler())`);
      parts.push(`    e2:SetType(EFFECT_TYPE_SINGLE)`);
      parts.push(`    e2:SetCode(EFFECT_DISABLE_EFFECT)`);
      parts.push(`    e2:SetValue(RESET_TURN_SET)`);
      parts.push(`    e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)`);
      parts.push(`    tc:RegisterEffect(e2)`);
      parts.push(`  end`);
    } else if (action === 'p_destroy_search') {
      parts.push(`  local c=e:GetHandler()`);
      parts.push(`  if c:IsRelateToEffect(e) and Duel.Destroy(c,REASON_EFFECT)~=0 then`);
      parts.push(`    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)`);
      parts.push(`    local g=Duel.SelectMatchingCard(tp,Card.IsAbleToHand,tp,LOCATION_DECK,0,1,1,nil)`);
      parts.push(`    if #g>0 then`);
      parts.push(`      Duel.SendtoHand(g,nil,REASON_EFFECT)`);
      parts.push(`      Duel.ConfirmCards(1-tp,g)`);
      parts.push(`    end`);
      parts.push(`  end`);
    } else if (action === 'choice_search_or_dump') {
      parts.push(`  local op=e:GetLabel()`);
      parts.push(`  if op==1 then`);
      parts.push(`    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)`);
      parts.push(`    local g=Duel.SelectMatchingCard(tp,Card.IsAbleToHand,tp,LOCATION_DECK,0,1,1,nil)`);
      parts.push(`    if #g>0 then Duel.SendtoHand(g,nil,REASON_EFFECT) Duel.ConfirmCards(1-tp,g) end`);
      parts.push(`  elseif op==2 then`);
      parts.push(`    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)`);
      parts.push(`    local g=Duel.SelectMatchingCard(tp,Card.IsAbleToGrave,tp,LOCATION_DECK,0,1,1,nil)`);
      parts.push(`    if #g>0 then Duel.SendtoGrave(g,REASON_EFFECT) end`);
      parts.push(`  end`);
    } else if (action === 'choice_ss_or_search') {
      parts.push(`  local op=e:GetLabel()`);
      parts.push(`  if op==1 then`);
      parts.push(`    if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end`);
      parts.push(`    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)`);
      parts.push(`    local g=Duel.SelectMatchingCard(tp,aux.TRUE,tp,LOCATION_DECK,0,1,1,nil,e,tp)`);
      parts.push(`    if #g>0 then Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP) end`);
      parts.push(`  elseif op==2 then`);
      parts.push(`    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)`);
      parts.push(`    local g=Duel.SelectMatchingCard(tp,Card.IsAbleToHand,tp,LOCATION_DECK,0,1,1,nil)`);
      parts.push(`    if #g>0 then Duel.SendtoHand(g,nil,REASON_EFFECT) Duel.ConfirmCards(1-tp,g) end`);
      parts.push(`  end`);
    } else if (action === 'choice_destroy_or_banish') {
      parts.push(`  local op=e:GetLabel()`);
      parts.push(`  if op==1 then`);
      parts.push(`    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)`);
      parts.push(`    local g=Duel.SelectMatchingCard(tp,aux.TRUE,tp,0,LOCATION_ONFIELD,1,1,nil)`);
      parts.push(`    if #g>0 then Duel.Destroy(g,REASON_EFFECT) end`);
      parts.push(`  elseif op==2 then`);
      parts.push(`    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)`);
      parts.push(`    local g=Duel.SelectMatchingCard(tp,Card.IsAbleToRemove,tp,0,LOCATION_ONFIELD,1,1,nil)`);
      parts.push(`    if #g>0 then Duel.Remove(g,POS_FACEUP,REASON_EFFECT) end`);
      parts.push(`  end`);
    } else if (action === 'choice_draw_or_burn') {
      parts.push(`  local op=e:GetLabel()`);
      parts.push(`  if op==1 then`);
      parts.push(`    Duel.Draw(tp,2,REASON_EFFECT)`);
      parts.push(`  elseif op==2 then`);
      parts.push(`    Duel.Damage(1-tp,2000,REASON_EFFECT)`);
      parts.push(`  end`);
    }

    // 那之后的后续动作处理
    if (slot.followup && slot.followup !== 'none') {
      parts.push(`  -- 那之后的动作处理`);
      parts.push(`  Duel.BreakEffect()`);
      if (slot.followup === 'draw_one') {
        parts.push(`  Duel.Draw(tp,1,REASON_EFFECT)`);
      } else if (slot.followup === 'banish_oppo') {
        parts.push(`  local bg=Duel.SelectMatchingCard(tp,Card.IsAbleToRemove,tp,0,LOCATION_ONFIELD,1,1,nil)`);
        parts.push(`  if #bg>0 then Duel.Remove(bg,POS_FACEUP,REASON_EFFECT) end`);
      } else if (slot.followup === 'send_oppo_gy') {
        parts.push(`  local bg=Duel.SelectMatchingCard(tp,aux.TRUE,tp,0,LOCATION_ONFIELD,1,1,nil)`);
        parts.push(`  if #bg>0 then Duel.SendtoGrave(bg,REASON_EFFECT) end`);
      } else if (slot.followup === 'damage_self') {
        parts.push(`  Duel.Damage(tp,1000,REASON_EFFECT)`);
      } else if (slot.followup === 'destroy_self') {
        parts.push(`  if e:GetHandler():IsRelateToEffect(e) then Duel.Destroy(e:GetHandler(),REASON_EFFECT) end`);
      }
    }
    parts.push(`end`);

    return parts.join('\n');
  }

  getCategoryCode(action, slot) {
    switch (action) {
      case 'choice_search_or_dump': return 'CATEGORY_TOHAND+CATEGORY_SEARCH+CATEGORY_TOGRAVE';
      case 'choice_ss_or_search': return 'CATEGORY_SPECIAL_SUMMON+CATEGORY_TOHAND+CATEGORY_SEARCH';
      case 'choice_destroy_or_banish': return 'CATEGORY_DESTROY+CATEGORY_REMOVE';
      case 'choice_draw_or_burn': return 'CATEGORY_DRAW+CATEGORY_DAMAGE';
      case 'choice_free': {
        // 两个分支的实际类别由取对象时 e:SetCategory 覆写；此处取并集便于脚本阅读与初值
        const codes = new Set();
        for (const sub of [(slot && slot.choiceA), (slot && slot.choiceB)]) {
          const a = (sub && sub.action) || 'search_deck';
          if (a === 'special_summon_deck' || a === 'special_summon_hand' || a === 'revive_grave') codes.add('CATEGORY_SPECIAL_SUMMON');
          else if (a === 'draw_cards') codes.add('CATEGORY_DRAW');
          else if (a === 'burn_damage') codes.add('CATEGORY_DAMAGE');
          else if (a === 'gain_lp') codes.add('CATEGORY_RECOVER');
          else if (a === 'banish_target') codes.add('CATEGORY_REMOVE');
          else if (a === 'to_hand_target') codes.add('CATEGORY_TOHAND');
          else if (a === 'destroy_self_all' || a === 'wipe_oppo_monsters' || a === 'wipe_oppo_all' || a === 'destroy_target') codes.add('CATEGORY_DESTROY');
          else if (a === 'dump_deck') { codes.add('CATEGORY_TOGRAVE'); codes.add('CATEGORY_DECKDES'); }
          else { codes.add('CATEGORY_TOHAND'); codes.add('CATEGORY_SEARCH'); }
        }
        return [...codes].join('+') || 'CATEGORY_TOHAND+CATEGORY_SEARCH';
      }
      case 'search_deck': return 'CATEGORY_TOHAND+CATEGORY_SEARCH';
      case 'salvage_extra': return 'CATEGORY_TOHAND+CATEGORY_SEARCH';
      case 'to_hand_target': return 'CATEGORY_TOHAND';
      case 'special_summon_self':
      case 'special_summon_hand':
      case 'special_summon_deck':
      case 'revive_grave': return 'CATEGORY_SPECIAL_SUMMON';
      case 'negate_and_destroy': return 'CATEGORY_NEGATE+CATEGORY_DESTROY';
      case 'negate_activation': return 'CATEGORY_NEGATE';
      case 'negate_punish': return 'CATEGORY_DESTROY+CATEGORY_DRAW';
      case 'banish_target': return 'CATEGORY_REMOVE';
      case 'destroy_target':
      case 'destroy_self_all':
      case 'wipe_oppo_all':
      case 'wipe_oppo_monsters':
      case 'wipe_oppo_spells': return 'CATEGORY_DESTROY';
      case 'draw_cards': return 'CATEGORY_DRAW';
      case 'burn_battle_destroy':
      case 'burn_damage': return 'CATEGORY_DAMAGE';
      case 'dump_deck': return 'CATEGORY_TOGRAVE+CATEGORY_DECKDES';
      case 'negate_target_monster': return 'CATEGORY_DISABLE';
      case 'p_destroy_search': return 'CATEGORY_DESTROY+CATEGORY_TOHAND+CATEGORY_SEARCH';
      case 'immune_all':
      case 'atk_boost': return '0';
      default: return 'CATEGORY_DESTROY';
    }
  }

  /**
   * 提取所有效果与分支选项的简要描述字符串数组，用于精准填充 CDB texts.str1..str16
   */
  getEffectStrings(slots, isJa = false) {
    const strings = [];
    slots.forEach((slot, index) => {
      const action = slot.action || 'destroy_target';
      let mainDesc = '';
      if (action === 'choice_search_or_dump') {
        mainDesc = isJa ? '効果を選択して発動' : '选择效果发动';
        strings.push(mainDesc);
        strings.push(isJa ? 'デッキから手札に加える' : '从卡组加入手牌');
        strings.push(isJa ? 'デッキから墓地へ送る' : '从卡组送去墓地');
      } else if (action === 'choice_ss_or_search') {
        mainDesc = isJa ? '効果を選択して発動' : '选择效果发动';
        strings.push(mainDesc);
        strings.push(isJa ? 'デッキから特殊召喚' : '从卡组特殊召唤');
        strings.push(isJa ? 'デッキから手札に加える' : '从卡组加入手牌');
      } else if (action === 'choice_destroy_or_banish') {
        mainDesc = isJa ? '効果を選択して発動' : '选择效果发动';
        strings.push(mainDesc);
        strings.push(isJa ? 'フィールドのカードを破壊' : '破坏场上的卡');
        strings.push(isJa ? 'フィールドのカードを除外' : '除外场上的卡');
      } else if (action === 'choice_draw_or_burn') {
        mainDesc = isJa ? '効果を選択して発動' : '选择效果发动';
        strings.push(mainDesc);
        strings.push(isJa ? 'デッキから２枚ドロー' : '从卡组抽2张卡');
        strings.push(isJa ? '相手に２０００ダメージ' : '造成2000点伤害');
      } else if (action === 'choice_free') {
        strings.push(isJa ? '効果を選択して発動' : '选择效果发动');
        strings.push(`●${this.getChoiceBranchText(slot.choiceA, isJa).replace(/。$/, '')}`);
        strings.push(`●${this.getChoiceBranchText(slot.choiceB, isJa).replace(/。$/, '')}`);
      } else {
        if (slot.name && slot.name.trim()) {
          mainDesc = slot.name.trim();
        } else if (action === 'search_deck') {
          mainDesc = isJa ? 'デッキから手札に加える' : '从卡组加入手牌';
        } else if (action === 'special_summon_deck' || action === 'special_summon_self' || action === 'special_summon_hand' || action === 'revive_grave') {
          mainDesc = isJa ? 'モンスターを特殊召喚' : '特殊召唤怪兽';
        } else if (action === 'destroy_target' || action === 'wipe_oppo_all' || action === 'wipe_oppo_monsters') {
          mainDesc = isJa ? 'カードを破壊' : '破坏场上卡片';
        } else if (action === 'banish_target') {
          mainDesc = isJa ? 'カードを除外' : '除外场上卡片';
        } else if (action === 'draw_cards') {
          mainDesc = isJa ? 'デッキからドロー' : '从卡组抽卡';
        } else if (action === 'dump_deck') {
          mainDesc = isJa ? 'デッキから墓地へ送る' : '从卡组送去墓地';
        } else if (action === 'salvage_extra') {
          mainDesc = isJa ? 'ＥＸデッキから手札に加える' : '从额外卡组加入手牌';
        } else if (action === 'burn_damage') {
          mainDesc = isJa ? 'ダメージを与える' : '造成伤害';
        } else if (action === 'destroy_self_all') {
          mainDesc = isJa ? '自分フィールドのカードを破壊' : '破坏自己场上的卡';
        } else if (action === 'negate_punish') {
          mainDesc = isJa ? '相手の選択により処理が変化' : '对方可选择处理方式';
        } else if (action === 'negate_and_destroy' || action === 'negate_activation') {
          mainDesc = isJa ? '発動を無効にする' : '无效卡片发动';
        } else {
          const type = slot.effectType || 'ignition';
          if (type === 'continuous') mainDesc = isJa ? '永続効果適用' : '永续效果适用';
          else if (type === 'procedure') mainDesc = isJa ? '特殊召喚手順' : '特殊召唤手续';
          else if (type === 'trigger') mainDesc = isJa ? '誘発効果発動' : '诱发效果发动';
          else if (type === 'quick') mainDesc = isJa ? '誘発即時効果発動' : '快速效果发动';
          else mainDesc = isJa ? '起動効果発動' : '起动效果发动';
        }
        strings.push(mainDesc);
      }
    });

    return strings.slice(0, 16);
  }

  getSummonTypeName(type, isJa = false) {
    const mapZh = { fusion: '融合', synchro: '同调', xyz: '超量', link: '连接', ritual: '仪式' };
    const mapJa = { fusion: '融合', synchro: 'Ｓ', xyz: 'Ｘ', link: 'Ｌ', ritual: '儀式' };
    return (isJa ? mapJa[type] : mapZh[type]) || (isJa ? '特殊' : '特殊');
  }

  getContinuousText(sub, isJa = false) {
    if (isJa) {
      if (sub === 'immune_all') return '相手のカードの効果を受けない。';
      if (sub === 'atk_boost_1000') return 'このカードの攻撃力・守備力は１０００アップする。';
      if (sub === 'indestructable_battle') return 'このカードは戦闘では破壊されない。';
      if (sub === 'indestructable_effect') return 'このカードは相手の効果では破壊されない。';
      if (sub === 'indestructable_both') return 'このカードは戦闘及び相手の効果では破壊されない。';
      if (sub === 'cannot_target') return 'このカードは相手の効果の対象にならない。';
      if (sub === 'lock_spsummon') return 'お互いにモンスターを特殊召喚できない。';
      if (sub === 'grave_substitute') return '自分フィールドのカードが戦闘・効果で破壊される場合、代わりに墓地のこのカードを除外できる。';
      return '効果が適用される。';
    }
    if (sub === 'immune_all') return '不受对方卡的效果影响。';
    if (sub === 'atk_boost_1000') return '这张卡的攻击力·守备力上升1000。';
    if (sub === 'indestructable_battle') return '这张卡不会被战斗破坏。';
    if (sub === 'indestructable_effect') return '这张卡不会被对方的效果破坏。';
    if (sub === 'indestructable_both') return '这张卡不会被战斗以及对方的效果破坏。';
    if (sub === 'cannot_target') return '这张卡不能成为对方卡的效果的对象。';
    if (sub === 'lock_spsummon') return '双方不能把怪兽特殊召唤。';
    if (sub === 'grave_substitute') return '自己场上的卡被战斗·效果破坏的场合，可以作为代替把墓地的这张卡除外。';
    return '效果适用。';
  }

  getProcedureText(proc, isJa = false) {
    if (isJa) {
      if (proc === 'no_monsters') return '自分フィールドにモンスターが存在しない場合、このカードは手札から特殊召喚できる。';
      if (proc === 'release_one') return '自分フィールドのモンスター１体をリリースした場合、このカードは手札から特殊召喚できる。';
      if (proc === 'banish_one_gy') return '自分の墓地のモンスター１体を除外した場合、这个卡は手札から特殊召喚できる。';
      return 'このカードは特殊召喚できる。';
    }
    if (proc === 'no_monsters') return '自己场上没有怪兽存在的场合，这张卡可以从手卡特殊召唤。';
    if (proc === 'release_one') return '把自己场上1只怪兽解放的场合，这张卡可以从手卡特殊召唤。';
    if (proc === 'banish_one_gy') return '把自己墓地1只怪兽除外的场合，这张卡可以从手卡特殊召唤。';
    return '这张卡可以特殊召唤。';
  }

  getTimingClause(timing, slot, isWhen, isJa, hasTargetOrCost) {
    const whenZh = isWhen ? '时' : '的场合';
    const whenJa = isWhen ? '時' : '場合';

    // 自身回合一速 / 起动效果
    if (timing === 'ignition_omit' || (!timing && slot.effectType === 'ignition')) {
      return ''; // 官方规范：默认省略「自己主要阶段才能发动」
    }
    if (timing === 'ignition_explicit') {
      if (isJa) return hasTargetOrCost ? '自分メインフェイズに、' : '自分メインフェイズに発動できる。';
      return hasTargetOrCost ? '自己主要阶段，' : '自己主要阶段才能发动。';
    }
    if (timing === 'ignition_no_monsters' || slot.condition === 'no_monsters') {
      if (isJa) return hasTargetOrCost ? `自分フィールドにモンスターが存在しない${whenJa}に、` : `自分フィールドにモンスターが存在しない${whenJa}に発動できる。`;
      return hasTargetOrCost ? `自己场上没有怪兽存在${whenZh}，` : `自己场上没有怪兽存在${whenZh}才能发动。`;
    }
    if (timing === 'ignition_oppo_more_cards') {
      if (isJa) return hasTargetOrCost ? `相手フィールドのカードの数が自分フィールドのカードより多い${whenJa}に、` : `相手フィールドのカードの数が自分フィールドのカードより多い${whenJa}に発動できる。`;
      return hasTargetOrCost ? `对方场上的卡数量比自己场上的卡多${whenZh}，` : `对方场上的卡数量比自己场上的卡多${whenZh}才能发动。`;
    }
    if (timing === 'ignition_oppo_monsters_count') {
      const count = parseInt(slot.oppoMonsterCount) || 2;
      if (isJa) return hasTargetOrCost ? `相手フィールドにモンスターが${count}体以上存在する${whenJa}に、` : `相手フィールドにモンスターが${count}体以上存在する${whenJa}に発動できる。`;
      return hasTargetOrCost ? `对方场上有怪兽${count}只以上存在${whenZh}，` : `对方场上有怪兽${count}只以上存在${whenZh}才能发动。`;
    }

    // 登场诱发 (召唤 / 特召 / 额外召唤)
    if (timing === 'summon_both' || (!timing && (slot.event === 'summon_success' || !slot.event))) {
      if (isJa) return hasTargetOrCost ? `このカードが召喚・特殊召喚した${whenJa}に、` : `このカードが召喚・特殊召喚した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡召唤·特殊召唤成功${whenZh}，` : `这张卡召唤·特殊召唤成功${whenZh}才能发动。`;
    }
    if (timing === 'summon_ns') {
      if (isJa) return hasTargetOrCost ? `このカードが召喚した${whenJa}に、` : `このカードが召喚した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡召唤成功${whenZh}，` : `这张卡召唤成功${whenZh}才能发动。`;
    }
    if (timing === 'summon_ss') {
      if (isJa) return hasTargetOrCost ? `このカードが特殊召喚した${whenJa}に、` : `このカードが特殊召喚した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡特殊召唤成功${whenZh}，` : `这张卡特殊召唤成功${whenZh}才能发动。`;
    }
    if (timing === 'summon_fusion') {
      if (isJa) return hasTargetOrCost ? `このカードが融合召喚した${whenJa}に、` : `このカードが融合召喚した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡融合召唤成功${whenZh}，` : `这张卡融合召唤成功${whenZh}才能发动。`;
    }
    if (timing === 'summon_ritual') {
      if (isJa) return hasTargetOrCost ? `このカードが儀式召喚した${whenJa}に、` : `このカードが儀式召喚した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡仪式召唤成功${whenZh}，` : `这张卡仪式召唤成功${whenZh}才能发动。`;
    }
    if (timing === 'summon_synchro') {
      if (isJa) return hasTargetOrCost ? `このカードがＳ召喚した${whenJa}に、` : `このカードがＳ召喚した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡同调召唤成功${whenZh}，` : `这张卡同调召唤成功${whenZh}才能发动。`;
    }
    if (timing === 'summon_xyz') {
      if (isJa) return hasTargetOrCost ? `このカードがＸ召喚した${whenJa}に、` : `このカードがＸ召喚した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡超量召唤成功${whenZh}，` : `这张卡超量召唤成功${whenZh}才能发动。`;
    }
    if (timing === 'summon_link') {
      if (isJa) return hasTargetOrCost ? `このカードがＬ召喚した${whenJa}に、` : `このカードがＬ召喚した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡连接召唤成功${whenZh}，` : `这张卡连接召唤成功${whenZh}才能发动。`;
    }
    if (timing === 'summon_with_mat') {
      const mat = slot.materialName || (isJa ? '特定モンスター' : '指定怪兽');
      const stype = this.getSummonTypeName(slot.summonTypeParam || 'fusion', isJa);
      if (isJa) return hasTargetOrCost ? `このカードが「${mat}」を素材として${stype}召喚した${whenJa}に、` : `このカードが「${mat}」を素材として${stype}召喚した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡以「${mat}」为素材${stype}召唤成功${whenZh}，` : `这张卡以「${mat}」为素材${stype}召唤成功${whenZh}才能发动。`;
    }

    // 离场·转移诱发 (送墓 / 除外 / 破坏)
    if (timing === 'to_grave_general' || (!timing && slot.event === 'to_grave')) {
      if (isJa) return hasTargetOrCost ? `このカードが墓地へ送られた${whenJa}に、` : `このカードが墓地へ送られた${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡被送去墓地${whenZh}，` : `这张卡被送去墓地${whenZh}才能发动。`;
    }
    if (timing === 'to_grave_from_field_summoned') {
      const stype = this.getSummonTypeName(slot.summonTypeParam || 'fusion', isJa);
      if (isJa) return hasTargetOrCost ? `${stype}召喚したこのカードがフィールドから墓地へ送られた${whenJa}に、` : `${stype}召喚したこのカードがフィールドから墓地へ送られた${whenJa}に発動できる。`;
      return hasTargetOrCost ? `${stype}召唤的这张卡从场上送去墓地${whenZh}，` : `${stype}召唤的这张卡从场上送去墓地${whenZh}才能发动。`;
    }
    if (timing === 'destroyed_battle_or_effect') {
      if (isJa) return hasTargetOrCost ? `このカードが戦闘・効果で破壊された${whenJa}に、` : `このカードが戦闘・効果で破壊された${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡被战斗·效果破坏${whenZh}，` : `这张卡被战斗·效果破坏${whenZh}才能发动。`;
    }
    if (timing === 'destroyed_by_oppo' || (!timing && slot.event === 'destroyed')) {
      if (isJa) return hasTargetOrCost ? `このカードが相手によって破壊された${whenJa}に、` : `このカードが相手によって破壊された${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡被对方破坏${whenZh}，` : `这张卡被对方破坏${whenZh}才能发动。`;
    }
    if (timing === 'banished_self') {
      if (isJa) return hasTargetOrCost ? `このカードが除外された${whenJa}に、` : `このカードが除外された${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡被除外${whenZh}，` : `这张卡被除外${whenZh}才能发动。`;
    }
    if (timing === 'field_card_destroyed') {
      if (isJa) return hasTargetOrCost ? `自分フィールドの表側表示のカードが戦闘・効果で破壊された${whenJa}に、` : `自分フィールドの表側表示のカードが戦闘・効果で破壊された${whenJa}に発動できる。`;
      return hasTargetOrCost ? `自己场上的表侧表示的卡被战斗·效果破坏${whenZh}，` : `自己场上的表侧表示的卡被战斗·效果破坏${whenZh}才能发动。`;
    }
    if (timing === 'field_card_banished') {
      if (isJa) return hasTargetOrCost ? `自分フィールドの表側表示のカードが除外された${whenJa}に、` : `自分フィールドの表側表示のカードが除外された${whenJa}に発動できる。`;
      return hasTargetOrCost ? `自己场上的表侧表示的卡被除外${whenZh}，` : `自己场上的表侧表示的卡被除外${whenZh}才能发动。`;
    }
    if (timing === 'battle_destroy_oppo' || (!timing && slot.event === 'battle_destroy')) {
      if (isJa) return hasTargetOrCost ? `このカードが戦闘で相手モンスターを破壊し墓地へ送った${whenJa}に、` : `このカードが戦闘で相手モンスターを破壊し墓地へ送った${whenJa}に発動できる。`;
      return hasTargetOrCost ? `这张卡战斗破坏对方怪兽送去墓地${whenZh}，` : `这张卡战斗破坏对方怪兽送去墓地${whenZh}才能发动。`;
    }

    // 二速即时 / 对方回合
    if (timing === 'quick_free' || (!timing && slot.effectType === 'quick' && slot.quickTiming !== 'quick_chain')) {
      if (isJa) return hasTargetOrCost ? '自分・相手ターンに、' : '自分・相手ターンに発動できる。';
      return hasTargetOrCost ? '自己·对方回合，' : '自己·对方回合才能发动。';
    }
    if (timing === 'quick_oppo_turn') {
      if (isJa) return hasTargetOrCost ? '相手ターンに、' : '相手ターンに発動できる。';
      return hasTargetOrCost ? '对方回合，' : '对方回合才能发动。';
    }
    if (timing === 'quick_oppo_main') {
      if (isJa) return hasTargetOrCost ? '相手メインフェイズに、' : '相手メインフェイズに発動できる。';
      return hasTargetOrCost ? '对方主要阶段，' : '对方主要阶段才能发动。';
    }
    if (timing === 'quick_chain' || (!timing && slot.effectType === 'quick' && slot.quickTiming === 'quick_chain')) {
      if (isJa) return hasTargetOrCost ? `相手がモンスターの効果・魔法・罠カードを発動した${whenJa}に、` : `相手がモンスターの効果・魔法・罠カードを発動した${whenJa}に発動できる。`;
      return hasTargetOrCost ? `对方把怪兽的效果·魔法·陷阱卡发动${whenZh}，` : `对方把怪兽的效果·魔法·陷阱卡发动${whenZh}才能发动。`;
    }

    // 魔法·陷阱专属
    if (timing === 'spell_trap_act') {
      if (isJa) return 'このカードの発動時の効果処理として、';
      return '作为这张卡的发动时的效果处理：';
    }

    // 默认回退
    if (isJa) return hasTargetOrCost ? '自分メインフェイズに、' : '自分メインフェイズに発動できる。';
    return hasTargetOrCost ? '自己主要阶段，' : '自己主要阶段才能发动。';
  }

  getCostClause(slot, hasTarget, isJa) {
    const cost = slot.cost;
    if (!cost || cost === 'none') return '';
    const n = Math.max(1, parseInt(slot.costCount) || 1);
    const cn = String(n);
    const jaNum = { 1: '１', 2: '２', 3: '３', 4: '４', 5: '５', 6: '６', 7: '７', 8: '８', 9: '９', 10: '１０' }[n] || cn;
    const fp = this.getCostFilterPhrase(slot, isJa);
    if (isJa) {
      if (cost === 'discard_self') return hasTarget ? '手札のこのカードを墓地へ送り、' : '手札のこのカードを墓地へ送って発動できる。';
      if (cost === 'release_self') return hasTarget ? 'フィールドのこのカードをリリースし、' : 'フィールドのこのカードをリリースして発動できる。';
      if (cost === 'pay_1000' || cost === 'pay_lp') {
        const lp = parseInt(slot.costLp) || 1000;
        return hasTarget ? `${lp}ＬＰを払い、` : `${lp}ＬＰを払って発動できる。`;
      }
      if (cost === 'discard_one') return hasTarget ? '手札を１枚墓地へ送り、' : '手札を１枚墓地へ送って発動できる。';
      if (cost === 'discard_n') return hasTarget ? `手札から${fp}${jaNum}枚を墓地へ送り、` : `手札から${fp}${jaNum}枚を墓地へ送って発動できる。`;
      if (cost === 'detach_xyz') return hasTarget ? `このカードのＸ素材を${jaNum}つ取り除き、` : `このカードのＸ素材を${jaNum}つ取り除いて発動できる。`;
      if (cost === 'banish_one_gy') return hasTarget ? '自分の墓地のカード１枚を除外し、' : '自分の墓地のカード１枚を除外して発動できる。';
      if (cost === 'banish_gy_n') return hasTarget ? `自分の墓地から${fp}${jaNum}枚を除外し、` : `自分の墓地から${fp}${jaNum}枚を除外して発動できる。`;
      if (cost === 'banish_hand_n') return hasTarget ? `手札から${fp}${jaNum}枚を除外し、` : `手札から${fp}${jaNum}枚を除外して発動できる。`;
      if (cost === 'release_monster_n') {
        const body = `自分フィールドの${fp || 'モンスター'}${jaNum}体をリリースし`;
        return hasTarget ? `${body}、` : `${body}て発動できる。`;
      }
      if (cost === 'send_to_grave_n') {
        const body = `自分フィールドの${fp || 'カード'}${jaNum}枚を墓地へ送`;
        return hasTarget ? `${body}り、` : `${body}って発動できる。`;
      }
      if (cost === 'mill_deck_n') {
        const fpJa = this.getCostFilterPhrase(slot, true);
        return hasTarget
          ? (fpJa ? `デッキから${fpJa}${jaNum}枚を墓地へ送り、` : `デッキの上から${jaNum}枚を墓地へ送り、`)
          : (fpJa ? `デッキから${fpJa}${jaNum}枚を墓地へ送って発動できる。` : `デッキの上から${jaNum}枚を墓地へ送って発動できる。`);
      }
      return '';
    }
    if (cost === 'discard_self') return hasTarget ? '把手卡的这张卡送去墓地，' : '把手卡的这张卡送去墓地才能发动。';
    if (cost === 'release_self') return hasTarget ? '把场上的这张卡解放，' : '把场上的这张卡解放才能发动。';
    if (cost === 'pay_1000' || cost === 'pay_lp') {
      const lp = parseInt(slot.costLp) || 1000;
      return hasTarget ? `支付${lp}基本分，` : `支付${lp}基本分才能发动。`;
    }
    if (cost === 'discard_one') return hasTarget ? '把1张手卡送去墓地，' : '把1张手卡送去墓地才能发动。';
    if (cost === 'discard_n') {
      const body = fp ? `从手卡把${n}张${fp}送去墓地` : `把${n}张手卡送去墓地`;
      return hasTarget ? `${body}，` : `${body}才能发动。`;
    }
    if (cost === 'detach_xyz') return hasTarget ? `去除此卡的${n}个超量素材，` : `去除此卡的${n}个超量素材才能发动。`;
    if (cost === 'banish_one_gy') return hasTarget ? '把自己墓地1张卡除外，' : '把自己墓地1张卡除外才能发动。';
    if (cost === 'banish_gy_n') {
      const body = fp ? `把自己墓地${n}张${fp}除外` : `把自己墓地${n}张卡除外`;
      return hasTarget ? `${body}，` : `${body}才能发动。`;
    }
    if (cost === 'banish_hand_n') {
      const body = fp ? `从手卡把${n}张${fp}除外` : `把${n}张手卡除外`;
      return hasTarget ? `${body}，` : `${body}才能发动。`;
    }
    if (cost === 'release_monster_n') {
      const body = fp ? `把自己场上${n}只${fp}解放` : `把自己场上${n}只怪兽解放`;
      return hasTarget ? `${body}，` : `${body}才能发动。`;
    }
    if (cost === 'send_to_grave_n') {
      const body = fp ? `把自己场上${n}张${fp}送去墓地` : `把自己场上${n}张卡送去墓地`;
      return hasTarget ? `${body}，` : `${body}才能发动。`;
    }
    if (cost === 'mill_deck_n') {
      const fpZh = this.getCostFilterPhrase(slot, false);
      return hasTarget
        ? (fpZh ? `从卡组把${n}张${fpZh}送去墓地，` : `从卡组上面把${n}张卡送去墓地，`)
        : (fpZh ? `从卡组把${n}张${fpZh}送去墓地才能发动。` : `从卡组上面把${n}张卡送去墓地才能发动。`);
    }
    return '';
  }

  /**
   * 生成代价筛选的卡文短语（如「「青眼」怪兽」「魔法卡」）
   */
  getCostFilterPhrase(slot, isJa, fallbackZh = '卡', fallbackJa = 'カード') {
    const typeNameZh = { monster: '怪兽', spell: '魔法卡', trap: '陷阱卡' }[slot.costFilterType] || '';
    const typeNameJa = { monster: 'モンスター', spell: '魔法カード', trap: '罠カード' }[slot.costFilterType] || '';
    const arch = (slot.costFilterArchetype || '').trim() || (slot.costFilterSetcode ? '此系列' : '');
    const archZh = arch ? `「${arch}」` : '';
    const archJa = arch ? `「${arch}」` : '';
    if (!archZh && !typeNameZh) return '';
    return isJa
      ? `${archJa}${typeNameJa || fallbackJa}`
      : `${archZh}${typeNameZh || '卡'}`;
  }

  /**
   * 生成「字段 / 卡类」筛选的卡文短语，如「青眼」怪兽 / 「ブルーアイズ」モンスター / 魔法卡。
   * 无筛选时返回空串。
   */
  getFilterPhrase(slot, isJa, fallbackZh = '卡') {
    const typeNameZh = { monster: '怪兽', spell: '魔法卡', trap: '陷阱卡' }[slot.filterType] || '';
    const typeNameJa = { monster: 'モンスター', spell: '魔法カード', trap: '罠カード' }[slot.filterType] || '';
    const arch = (slot.filterArchetype || '').trim() || (slot.filterSetcode ? '此系列' : '');
    const archZh = arch ? `「${arch}」` : '';
    const archJa = arch ? `「${arch}」` : '';
    if (!archZh && !typeNameZh) return '';
    return isJa ? `${archJa}${typeNameJa}` : `${archZh}${typeNameZh || fallbackZh}`;
  }

  getTargetClause(slot, isJa) {
    const target = slot.target;
    if (slot.action === 'negate_punish') {
      return isJa ? '相手フィールドのカード１枚を対象として発動できる。' : '以对方场上1张卡为对象才能发动。';
    }
    if (!target || target === 'none') return '';
    if (isJa) {
      if (target === 'target_field_card') return 'フィールドのカード１枚を対象として発動できる。';
      if (target === 'target_oppo_card') return '相手フィールドのカード１枚を対象として発動できる。';
      if (target === 'target_oppo_monster') return '相手フィールドのモンスター１体を対象として発動できる。';
      if (target === 'target_grave_monster') return '自分または相手の墓地のモンスター１体を対象として発動できる。';
      if (target === 'target_self_monster') return '自分フィールドのモンスター１体を対象として発動できる。';
      if (target === 'target_banished') return '除外されている自分のカード１枚を対象として発動できる。';
      return '';
    }
    if (target === 'target_field_card') return '以场上1张卡为对象才能发动。';
    if (target === 'target_oppo_card') return '以对方场上1张卡为对象才能发动。';
    if (target === 'target_oppo_monster') return '以对方场上1只怪兽为对象才能发动。';
    if (target === 'target_grave_monster') return '以自己或对方墓地1只怪兽为对象才能发动。';
    if (target === 'target_self_monster') return '以自己场上1只怪兽为对象才能发动。';
    if (target === 'target_banished') return '以除外状态的1张自己卡片为对象才能发动。';
    return '';
  }

  getActionClause(slot, isJa) {
    const action = slot.action || 'destroy_target';
    const hasTarget = slot.target && slot.target !== 'none';
    const fp = this.getFilterPhrase(slot, isJa);
    const fpMonster = this.getFilterPhrase(slot, isJa, '怪兽');
    // 二选一自由组合：由两个子分支各自生成卡文
    if (action === 'choice_free') {
      const tA = this.getChoiceBranchText(slot.choiceA, isJa);
      const tB = this.getChoiceBranchText(slot.choiceB, isJa);
      return isJa
        ? `以下の効果から１つを選択して発動できる。●${tA}●${tB}`
        : `从以下效果选择1个发动。●${tA}●${tB}`;
    }
    if (isJa) {
      if (action === 'search_deck') return `デッキから${fp || 'カード'}１枚を手札に加える。`;
      if (action === 'special_summon_self') return 'このカードを手札から特殊召喚する。';
      if (action === 'special_summon_hand') return '手札からモンスター１体を特殊召喚する。';
      if (action === 'revive_grave') return hasTarget ? 'そのモンスターを自分フィールドに特殊召喚する。' : '自分または相手の墓地のモンスター１体を自分フィールドに特殊召喚する。';
      if (action === 'destroy_target') return hasTarget ? 'そのカードを破壊する。' : 'フィールドのカード１枚を破壊する。';
      if (action === 'to_hand_target') return hasTarget ? 'そのカードを持ち主の手札に戻す。' : 'フィールドのカード１枚を持ち主の手札に戻す。';
      if (action === 'banish_target') return hasTarget ? 'そのカードを除外する。' : '相手フィールドのカード１枚を除外する。';
      if (action === 'negate_and_destroy') return 'その発動を無効にし破壊する。';
      if (action === 'negate_activation') return 'その発動を無効にする。';
      if (action === 'dump_deck') return `デッキから${fp || 'カード'}１枚を墓地へ送る。`;
      if (action === 'special_summon_deck') return `デッキから${fp || 'モンスター'}１体を特殊召喚する。`;
      if (action === 'negate_target_monster') return 'そのモンスターの効果をターン終了時まで無効にする。';
      if (action === 'p_destroy_search') return 'このカードを破壊し、デッキからカード１枚を手札に加える。';
      if (action === 'draw_cards') return 'デッキから２枚ドローする。';
      if (action === 'wipe_oppo_all') return '相手フィールドのカードを全て破壊する。';
      if (action === 'wipe_oppo_monsters') return '相手フィールドのモンスターを全て破壊する。';
      if (action === 'wipe_oppo_spells') return '相手フィールドの魔法・罠カードを全て破壊する。';
      if (action === 'burn_battle_destroy') return '相手に１０００ダメージを与える。';
      if (action === 'burn_damage') {
        const v = parseInt(slot.burnValue) || 1000;
        const who = slot.burnTargetPlayer === 'self' ? '自分' : '相手';
        return `${who}に${v}ダメージを与える。`;
      }
      if (action === 'destroy_self_all') return '自分フィールドのカードを全て破壊する。';
      if (action === 'negate_punish') {
        const n = parseInt(slot.punishDiscardCount) || 2;
        const tgt = slot.punishTarget === 'self' ? '自分' : '相手';
        return `${tgt}は手札を${n}枚捨てる事で、そのカードを破壊する代わりにお互いが１枚ドローする。`;
      }
      if (action === 'salvage_extra') return 'ＥＸデッキから表側表示のモンスター１体を手札に加える。';
      if (action === 'immune_all') return '相手のカードの効果を受けない。';
      if (action === 'atk_boost') return 'このカードの攻撃力・守備力は１０００アップする。';
      return '効果を適用する。';
    }
    if (action === 'search_deck') return `从卡组把1${fp && slot.filterType === 'monster' ? '只' : '张'}${fp || '卡'}加入手牌。`;
    if (action === 'special_summon_self') return '这张卡从手卡特殊召唤。';
    if (action === 'special_summon_hand') return '从手卡把1只怪兽特殊召唤。';
    if (action === 'revive_grave') return hasTarget ? '那只怪兽在自己场上特殊召唤。' : '以自己或对方墓地1只怪兽为对象才能发动。那只怪兽在自己场上特殊召唤。';
    if (action === 'destroy_target') return hasTarget ? '那张卡破坏。' : '以场上1张卡为对象才能发动。那张卡破坏。';
    if (action === 'to_hand_target') return hasTarget ? '那张卡回到持有者手牌。' : '以场上1张卡为对象才能发动。那张卡回到持有者手牌。';
    if (action === 'banish_target') return hasTarget ? '那张卡除外。' : '以对方场上1张卡为对象才能发动。那张卡除外。';
    if (action === 'negate_and_destroy') return '那个发动无效并破坏。';
    if (action === 'negate_activation') return '那个发动无效。';
    if (action === 'dump_deck') return `从卡组把1${fp && slot.filterType === 'monster' ? '只' : '张'}${fp || '卡'}送去墓地。`;
    if (action === 'special_summon_deck') return `从卡组把1只${fpMonster || '怪兽'}特殊召唤。`;    if (action === 'negate_target_monster') return '那只怪兽的效果直到回合结束时无效。';
    if (action === 'p_destroy_search') return '把这张卡破坏，从卡组把1张卡加入手牌。';
    if (action === 'draw_cards') return '从卡组抽2张卡。';
    if (action === 'wipe_oppo_all') return '对方场上的卡全部破坏。';
    if (action === 'wipe_oppo_monsters') return '对方场上的怪兽全部破坏。';
    if (action === 'wipe_oppo_spells') return '对方场上的魔法·陷阱卡全部破坏。';
    if (action === 'burn_battle_destroy') return '给对方造成1000点伤害。';
    if (action === 'burn_damage') {
      const v = parseInt(slot.burnValue) || 1000;
      const who = slot.burnTargetPlayer === 'self' ? '自己' : '对方';
      return `给${who}造成${v}点伤害。`;
    }
    if (action === 'destroy_self_all') return '自己场上的卡全部破坏。';
    if (action === 'negate_punish') {
      const n = parseInt(slot.punishDiscardCount) || 2;
      const tgt = slot.punishTarget === 'self' ? '自己' : '对方';
      return `${tgt}可以丢弃${n}张手卡，让这张卡破坏的效果变为双方各抽1张卡。`;
    }
    if (action === 'salvage_extra') return `从额外卡组把1${fp && slot.filterType === 'monster' ? '只' : '张'}${fp || '表侧表示的怪兽'}加入手牌。`;
    if (action === 'immune_all') return '不受对方卡的效果影响。';
    if (action === 'atk_boost') return '这张卡的攻击力·守备力上升1000。';
    return '进行效果处理。';
  }

  getFollowupClause(slot, isJa) {
    if (!slot.followup || slot.followup === 'none') return '';
    if (isJa) {
      if (slot.followup === 'draw_one') return 'その後、デッキから１枚ドローする。';
      if (slot.followup === 'banish_oppo') return 'その後、相手フィールドのカード１枚を選んで除外する。';
      if (slot.followup === 'send_oppo_gy') return 'その後、相手フィールドのカード１枚を選んで墓地へ送る。';
      if (slot.followup === 'damage_self') return 'その後、自分は１０００ダメージを受ける。';
      if (slot.followup === 'destroy_self') return 'その後、このカードを破壊する。';
      return '';
    }
    if (slot.followup === 'draw_one') return '那之后，从卡组抽1张卡。';
    if (slot.followup === 'banish_oppo') return '那之后，选对方场上1张卡除外。';
    if (slot.followup === 'send_oppo_gy') return '那之后，选对方场上1张卡送去墓地。';
    if (slot.followup === 'damage_self') return '那之后，自己受到1000点伤害。';
    if (slot.followup === 'destroy_self') return '那之后，这张卡破坏。';
    return '';
  }

  /**
   * 自动生成标准游戏王规范卡文
   */
  generateEffectText(slotIndex, slot, omitHopt = false, isJa = false) {
    const orderSymbols = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
    const sym = orderSymbols[slotIndex] || `(${slotIndex + 1})`;

    if (slot.language === 'ja') isJa = true;

    // 1. 永续效果
    if (slot.effectType === 'continuous' || (slot.timing && slot.timing.startsWith('continuous_'))) {
      const sub = slot.subType || 'immune_all';
      if (slot.timing === 'continuous_summoned_faceup') {
        const stype = this.getSummonTypeName(slot.summonTypeParam || 'fusion', isJa);
        if (isJa) {
          return `${sym}：${stype}召喚したこのカードがモンスターゾーンに表側表示で存在する限り、${this.getContinuousText(sub, isJa)}`;
        }
        return `${sym}：只要${stype}召唤的这张卡在怪兽区域表侧表示存在，${this.getContinuousText(sub, isJa)}`;
      }
      if (isJa) {
        return `${sym}：このカードがモンスターゾーンに表側表示で存在する限り、${this.getContinuousText(sub, isJa)}`;
      }
      return `${sym}：只要这张卡在怪兽区域表侧表示存在，${this.getContinuousText(sub, isJa)}`;
    }

    // 2. 特召手续
    if (slot.effectType === 'procedure') {
      return `${sym}：${this.getProcedureText(slot.procType || 'no_monsters', isJa)}`;
    }

    // 3. 发动式效果 (Trigger, Quick, Ignition)
    const countNum = parseInt(slot.countNumber) || 1;
    let limitText = '';
    if (!omitHopt) {
      if (slot.countLimit === 'hopt') {
        limitText = isJa
          ? (countNum === 1 ? `このカード名の${sym}の効果は1ターンに1度しか使用できない。` : `このカード名の${sym}の効果は1ターンに${countNum}度しか使用できない。`)
          : (countNum === 1 ? `这个卡名的${sym}的效果1回合只能使用1次。` : `这个卡名的${sym}的效果1回合可以使用${countNum}次。`);
      } else if (slot.countLimit === 'duel') {
        limitText = isJa
          ? `このカード名の${sym}の効果はデュエル中に${countNum}度しか使用できない。`
          : `这个卡名的${sym}的效果在决斗中只能使用${countNum}次。`;
      }
    }

    let soptText = '';
    if (slot.countLimit === 'sopt') {
      soptText = isJa
        ? (countNum === 1 ? '1ターンに1度、' : `1ターンに${countNum}度、`)
        : (countNum === 1 ? '1回合1次，' : `1回合${countNum}次，`);
    } else if (slot.countLimit === 'battle') {
      soptText = isJa
        ? `1回のバトルフェイズ中に${countNum}度しか使用できない、`
        : `1次战斗阶段中只能使用${countNum}次，`;
    }

    const timing = slot.timing || (slot.effectType === 'trigger' ? (slot.event || 'summon_both') : (slot.effectType === 'quick' ? (slot.quickTiming || 'quick_free') : 'ignition_omit'));
    const isWhen = slot.timingMode === 'when';
    const hasTarget = (slot.target && slot.target !== 'none') || slot.action === 'negate_punish';
    const hasCost = slot.cost && slot.cost !== 'none';
    const hasTargetOrCost = hasTarget || hasCost;

    const timingText = this.getTimingClause(timing, slot, isWhen, isJa, hasTargetOrCost);
    const costText = this.getCostClause(slot, hasTarget, isJa);
    const targetText = this.getTargetClause(slot, isJa);
    const actionText = this.getActionClause(slot, isJa);
    const followupText = this.getFollowupClause(slot, isJa);

    const bodyParts = [soptText, timingText, costText, targetText, actionText].filter(Boolean).join('');
    const fullEffect = followupText ? `${bodyParts} ${followupText}` : bodyParts;

    return `${limitText ? limitText : ''}${sym}：${fullEffect}`;
  }

  /**
   * 校验卡文是否符合官方 PSCT (Problem-Solving Card Text) 规范
   * 规范标准：时点 ： 代价及对象 ； 效果处理 。 那之后，后续处理 。
   */
  validatePSCT(text) {
    const issues = [];
    if (!text || !text.trim()) {
      issues.valid = true;
      return issues;
    }

    // 1. 全半角冒号与分号
    if (/[:;]/.test(text)) {
      issues.push({ type: 'warning', text: '检测到半角标点，建议统一使用全角“：”与“；”符合官方OCG排版' });
    }
    // 2. 引号规范
    if (/["']/.test(text)) {
      issues.push({ type: 'info', text: '卡名引用建议使用游戏王专属引号「」' });
    }
    // 3. 才能发动标点
    if (text.includes('才能发动') && !text.includes('：') && !text.includes(':')) {
      issues.push({ type: 'info', text: '“才能发动”后建议添加冒号“：”以明确时点与代价结构' });
    }
    // 4. 结尾句号
    if (!text.endsWith('。') && !text.endsWith('.')) {
      issues.push({ type: 'info', text: '效果语句结尾建议使用中文句号“。”' });
    }
    issues.valid = issues.length === 0;
    return issues;
  }

  /**
   * 自动生成发动频次合并总结行 (在效果 ①② 正上方单列一行)
   */
  generateAggregatedLimitLine(slots, isJa = false) {
    const orderSymbols = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
    const hoptSlots = [];
    const duelSlots = [];

    slots.forEach((slot, idx) => {
      if (!slot) return;
      if (slot.effectType === 'continuous' || slot.effectType === 'procedure') return;
      if (slot.countLimit === 'hopt') {
        hoptSlots.push({ idx, sym: orderSymbols[idx] || `(${idx + 1})`, count: parseInt(slot.countNumber) || 1 });
      } else if (slot.countLimit === 'duel') {
        duelSlots.push({ idx, sym: orderSymbols[idx] || `(${idx + 1})`, count: parseInt(slot.countNumber) || 1 });
      }
    });

    const lines = [];

    if (hoptSlots.length > 0) {
      const firstCount = hoptSlots[0].count;
      const allSame = hoptSlots.every(s => s.count === firstCount);

      if (isJa) {
        if (hoptSlots.length >= 2 && allSame) {
          const syms = hoptSlots.map(s => s.sym).join('');
          if (firstCount === 1) {
            lines.push(`このカード名の${syms}の効果はそれぞれ1ターンに1度しか使用できない。`);
          } else {
            lines.push(`このカード名の${syms}の効果はそれぞれ1ターンに${firstCount}度しか使用できない。`);
          }
        } else if (hoptSlots.length >= 2 && !allSame) {
          const parts = hoptSlots.map(s => {
            return s.count === 1 ? `${s.sym}の効果は1ターンに1度しか使用できない` : `${s.sym}の効果は1ターンに${s.count}度しか使用できない`;
          });
          lines.push(`このカード名の${parts.join('、')}。`);
        } else {
          const s = hoptSlots[0];
          if (s.count === 1) {
            lines.push(`このカード名の${s.sym}の効果は1ターンに1度しか使用できない。`);
          } else {
            lines.push(`このカード名の${s.sym}の効果は1ターンに${s.count}度しか使用できない。`);
          }
        }
      } else {
        if (hoptSlots.length >= 2 && allSame) {
          const syms = hoptSlots.map(s => s.sym).join('');
          if (firstCount === 1) {
            lines.push(`这个卡名的${syms}的效果1回合各能使用1次。`);
          } else {
            lines.push(`这个卡名的${syms}的效果1回合各能使用${firstCount}次。`);
          }
        } else if (hoptSlots.length >= 2 && !allSame) {
          const parts = hoptSlots.map(s => {
            return s.count === 1 ? `${s.sym}的效果1回合只能使用1次` : `${s.sym}的效果1回合可以使用${s.count}次`;
          });
          lines.push(`这个卡名的${parts.join('，')}。`);
        } else {
          const s = hoptSlots[0];
          if (s.count === 1) {
            lines.push(`这个卡名的${s.sym}的效果1回合只能使用1次。`);
          } else {
            lines.push(`这个卡名的${s.sym}的效果1回合可以使用${s.count}次。`);
          }
        }
      }
    }

    if (duelSlots.length > 0) {
      const syms = duelSlots.map(s => s.sym).join('');
      if (isJa) {
        lines.push(`このカード名の${syms}の効果はデュエル中に1度しか使用できない。`);
      } else {
        lines.push(`这个卡名的${syms}的效果在决斗中只能使用1次。`);
      }
    }

    return lines.join('');
  }

  /**
   * 自动生成独立灵摆效果卡文
   */
  generatePendulumText(slot, isJa = false) {
    if (!slot) return '';
    const countNum = parseInt(slot.countNumber) || 1;
    let limitText = '';
    if (slot.countLimit === 'hopt') {
      limitText = isJa
        ? (countNum === 1 ? 'このカード名のＰ効果は1ターンに1度しか使用できない。' : `このカード名のＰ効果は1ターンに${countNum}度しか使用できない。`)
        : (countNum === 1 ? '这个卡名的灵摆效果1回合只能使用1次。' : `这个卡名的灵摆效果1回合可以使用${countNum}次。`);
    } else if (slot.countLimit === 'sopt') {
      limitText = isJa
        ? (countNum === 1 ? '1ターンに1度、' : `1ターンに${countNum}度、`)
        : (countNum === 1 ? '1回合1次，' : `1回合${countNum}次，`);
    }

    let timingText = '';
    if (slot.timing === 'other_pzone') {
      timingText = isJa ? 'もう片方の自分のＰゾーンにカードが存在する場合に発動できる。' : '另一边的自己灵摆区域有卡存在的场合才能发动。';
    } else if (slot.timing === 'direct_atk') {
      timingText = isJa ? '相手モンスターの直接攻撃宣言時に発動できる。' : '对方怪兽直接攻击宣言时才能发动。';
    } else if (slot.timing === 'free') {
      timingText = isJa ? '自分・相手ターンに発動できる。' : '自己·对方回合才能发动。';
    } else {
      timingText = isJa ? '自分メインフェイズに発動できる。' : '自己主要阶段才能发动。';
    }

    let costText = '';
    if (slot.cost === 'destroy_self') {
      costText = isJa ? 'このカードを破壊し、' : '把这张卡破坏，';
    } else if (slot.cost === 'pay_lp') {
      costText = isJa ? `${parseInt(slot.costLp) || 1000}ＬＰを払い、` : `支付${parseInt(slot.costLp) || 1000}基本分，`;
    } else if (slot.cost === 'release_one') {
      costText = isJa ? '自分フィールドのモンスター１体をリリースし、' : '把自己场上1只怪兽解放，';
    }

    let targetText = '';
    if (slot.target === 'target_field') {
      targetText = isJa ? 'フィールドのカード１枚を対象として発動できる。' : '以场上1张卡为对象才能发动。';
    } else if (slot.target === 'target_oppo_monster') {
      targetText = isJa ? '相手フィールドのモンスター１体を対象として発動できる。' : '以对方场上1只怪兽为对象才能发动。';
    } else if (slot.target === 'target_self_monster') {
      targetText = isJa ? '自分フィールドのモンスター１体を対象として発動できる。' : '以自己场上1只怪兽为对象才能发动。';
    }

    let actionText = '';
    const action = slot.action || 'search_deck';
    if (action === 'search_deck') {
      actionText = isJa ? 'デッキからモンスター１体を手札に加える。' : '从卡组把1只怪兽加入手牌。';
    } else if (action === 'special_summon_self') {
      actionText = isJa ? 'このカードをモンスターゾーンに特殊召喚する。' : '这张卡在怪兽区域特殊召唤。';
    } else if (action === 'destroy_target') {
      actionText = isJa ? (slot.target ? 'そのカードを破壊する。' : 'フィールドのカード１枚を破壊する。') : (slot.target ? '那张卡破坏。' : '选场上1张卡破坏。');
    } else if (action === 'salvage_extra') {
      actionText = isJa ? '自分のＥＸデッキから表側表示のＰモンスター１体を手札に加える。' : '从自己的额外卡组把1只表侧表示灵摆怪兽加入手牌。';
    } else {
      actionText = isJa ? '効果を適用する。' : '进行效果处理。';
    }

    let followupText = '';
    if (slot.followup === 'draw_one') {
      followupText = isJa ? 'その後、デッキから１枚ドローする。' : '那之后，从卡组抽1张卡。';
    } else if (slot.followup === 'destroy_oppo') {
      followupText = isJa ? 'その後、相手フィールドのカード１枚を選んで破壊する。' : '那之后，选对方场上1张卡破坏。';
    }

    return `${limitText}${timingText}${costText}${targetText}${actionText}${followupText ? ' ' + followupText : ''}`;
  }
}

// 导出全局
window.EFFECT_PRESETS = EFFECT_PRESETS;
window.EFFECT_MODULES = EFFECT_PRESETS;
window.EFFECT_TYPES = EFFECT_TYPES;
window.ClientScriptAssembler = ClientScriptAssembler;
