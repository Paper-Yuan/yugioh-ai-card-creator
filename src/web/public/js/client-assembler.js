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
    const ruleTexts = cardData.ruleTexts || {};
    if (ruleTexts.ruleAlias && ruleTexts.ruleAliasName) {
      lines.push(`  -- 规则视作其他卡名`);
      lines.push(`  local e_alias=Effect.CreateEffect(c)`);
      lines.push(`  e_alias:SetType(EFFECT_TYPE_SINGLE)`);
      lines.push(`  e_alias:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)`);
      lines.push(`  e_alias:SetCode(EFFECT_ADD_CODE)`);
      const aliasId = parseInt(ruleTexts.ruleAliasId) || 89631139;
      lines.push(`  e_alias:SetValue(${aliasId})`);
      lines.push(`  c:RegisterEffect(e_alias)`);
    }
    if (ruleTexts.ssOncePerTurn) {
      lines.push(`  -- 同名卡1回合只能特殊召唤1次`);
      lines.push(`  c:SetSPSummonOnce(id)`);
    }
    if (ruleTexts.cannotNormalSummon) {
      lines.push(`  -- 特殊召唤怪兽限制 (不能通常召唤)`);
      lines.push(`  c:EnableReviveLimit()`);
      lines.push(`  local e_nomi=Effect.CreateEffect(c)`);
      lines.push(`  e_nomi:SetType(EFFECT_TYPE_SINGLE)`);
      lines.push(`  e_nomi:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)`);
      lines.push(`  e_nomi:SetCode(EFFECT_CANNOT_SUMMON)`);
      lines.push(`  c:RegisterEffect(e_nomi)`);
    }
    if (ruleTexts.materialRestriction) {
      lines.push(`  -- 额外卡组特殊召唤素材限制`);
      lines.push(`  local e_mat=Effect.CreateEffect(c)`);
      lines.push(`  e_mat:SetType(EFFECT_TYPE_SINGLE)`);
      lines.push(`  e_mat:SetProperty(EFFECT_FLAG_CANNOT_DISABLE+EFFECT_FLAG_UNCOPYABLE)`);
      lines.push(`  e_mat:SetCode(EFFECT_CANNOT_BE_FUSION_MATERIAL)`);
      lines.push(`  e_mat:SetValue(1)`);
      lines.push(`  c:RegisterEffect(e_mat)`);
      lines.push(`  local e_mat_s=e_mat:Clone() e_mat_s:SetCode(EFFECT_CANNOT_BE_SYNCHRO_MATERIAL) c:RegisterEffect(e_mat_s)`);
      lines.push(`  local e_mat_x=e_mat:Clone() e_mat_x:SetCode(EFFECT_CANNOT_BE_XYZ_MATERIAL) c:RegisterEffect(e_mat_x)`);
      lines.push(`  local e_mat_l=e_mat:Clone() e_mat_l:SetCode(EFFECT_CANNOT_BE_LINK_MATERIAL) c:RegisterEffect(e_mat_l)`);
    }

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
   * 1. 永续效果装配 (Continuous)
   * 规则：不进连锁、无代价、不取对象、无 operation 链
   */
  assembleContinuousEffect(lines, logicFunctions, slot, idx, sym) {
    const subType = slot.subType || 'immune_all';
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
    lines.push(`  e${idx}:SetCategory(${this.getCategoryCode(action)})`);

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
    if (target === 'none') return false;
    return ['destroy_target', 'banish_target', 'to_hand_target', 'revive_grave', 'negate_target_monster'].includes(action);
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

  generateActivatedLogic(idx, slot, sym, cardData) {
    const parts = [];
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

    // 2. Cost
    if (slot.cost && slot.cost !== 'none') {
      parts.push(`-- 效果${sym} 发动代价`);
      parts.push(`function s.cost${idx}(e,tp,eg,ep,ev,re,r,rp,chk)`);
      if (slot.cost === 'discard_self') {
        parts.push(`  if chk==0 then return e:GetHandler():IsDiscardable() end`);
        parts.push(`  Duel.SendtoGrave(e:GetHandler(),REASON_COST+REASON_DISCARD)`);
      } else if (slot.cost === 'release_self') {
        parts.push(`  if chk==0 then return e:GetHandler():IsReleasable() end`);
        parts.push(`  Duel.Release(e:GetHandler(),REASON_COST)`);
      } else if (slot.cost === 'discard_one') {
        parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(Card.IsDiscardable,tp,LOCATION_HAND,0,1,nil) end`);
        parts.push(`  Duel.DiscardHand(tp,Card.IsDiscardable,1,1,REASON_COST+REASON_DISCARD,nil)`);
      } else if (slot.cost === 'pay_1000' || slot.cost === 'pay_lp') {
        const lpVal = parseInt(slot.costLp) || 1000;
        parts.push(`  if chk==0 then return Duel.CheckLPCost(tp,${lpVal}) end`);
        parts.push(`  Duel.PayLPCost(tp,${lpVal})`);
      } else if (slot.cost === 'detach_xyz') {
        parts.push(`  if chk==0 then return e:GetHandler():CheckRemoveOverlayCard(tp,1,REASON_COST) end`);
        parts.push(`  e:GetHandler():RemoveOverlayCard(tp,1,1,REASON_COST)`);
      } else if (slot.cost === 'banish_one_gy') {
        parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(Card.IsAbleToRemoveAsCost,tp,LOCATION_GRAVE,0,1,nil) end`);
        parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)`);
        parts.push(`  local g=Duel.SelectMatchingCard(tp,Card.IsAbleToRemoveAsCost,tp,LOCATION_GRAVE,0,1,1,nil)`);
        parts.push(`  Duel.Remove(g,POS_FACEUP,REASON_COST)`);
      }
      parts.push(`end`);
    }

    // 3. Target
    parts.push(`-- 效果${sym} 发动检查与取对象`);
    parts.push(`function s.tg${idx}(e,tp,eg,ep,ev,re,r,rp,chk,chkc)`);
    if (action === 'destroy_target') {
      parts.push(`  if chkc then return chkc:IsOnField() end`);
      parts.push(`  if chk==0 then return Duel.IsExistingTarget(aux.TRUE,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)`);
      parts.push(`  local g=Duel.SelectTarget(tp,aux.TRUE,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,1,0,0)`);
    } else if (action === 'banish_target') {
      parts.push(`  if chkc then return chkc:IsAbleToRemove() and chkc:IsControler(1-tp) end`);
      parts.push(`  if chk==0 then return Duel.IsExistingTarget(Card.IsAbleToRemove,tp,0,LOCATION_ONFIELD+LOCATION_GRAVE,1,nil) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)`);
      parts.push(`  local g=Duel.SelectTarget(tp,Card.IsAbleToRemove,tp,0,LOCATION_ONFIELD+LOCATION_GRAVE,1,1,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,1,0,0)`);
    } else if (action === 'to_hand_target') {
      parts.push(`  if chkc then return chkc:IsOnField() and chkc:IsAbleToHand() end`);
      parts.push(`  if chk==0 then return Duel.IsExistingTarget(Card.IsAbleToHand,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RTOHAND)`);
      parts.push(`  local g=Duel.SelectTarget(tp,Card.IsAbleToHand,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_TOHAND,g,1,0,0)`);
    } else if (action === 'revive_grave') {
      parts.push(`  if chkc then return chkc:IsLocation(LOCATION_GRAVE) and chkc:IsCanBeSpecialSummoned(e,0,tp,false,false) end`);
      parts.push(`  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0`);
      parts.push(`    and Duel.IsExistingTarget(Card.IsCanBeSpecialSummoned,tp,LOCATION_GRAVE,0,1,nil,e,0,tp,false,false) end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)`);
      parts.push(`  local g=Duel.SelectTarget(tp,Card.IsCanBeSpecialSummoned,tp,LOCATION_GRAVE,0,1,1,nil,e,0,tp,false,false)`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,1,0,0)`);
    } else if (action === 'search_deck') {
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(Card.IsAbleToHand,tp,LOCATION_DECK,0,1,nil) end`);
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
    } else if (action === 'special_summon_self') {
      parts.push(`  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0`);
      parts.push(`    and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)`);
    } else if (action === 'dump_deck') {
      parts.push(`  if chk==0 then return Duel.IsExistingMatchingCard(Card.IsAbleToGrave,tp,LOCATION_DECK,0,1,nil) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,1,tp,LOCATION_DECK)`);
    } else if (action === 'special_summon_deck') {
      parts.push(`  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0`);
      parts.push(`    and Duel.IsExistingMatchingCard(aux.TRUE,tp,LOCATION_DECK,0,1,nil,e,tp) end`);
      parts.push(`  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)`);
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
    if (action === 'destroy_target') {
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
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)`);
      parts.push(`  local g=Duel.SelectMatchingCard(tp,Card.IsAbleToHand,tp,LOCATION_DECK,0,1,1,nil)`);
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
    } else if (action === 'special_summon_self') {
      parts.push(`  local c=e:GetHandler()`);
      parts.push(`  if c:IsRelateToEffect(e) then`);
      parts.push(`    Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)`);
      parts.push(`  end`);
    } else if (action === 'dump_deck') {
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)`);
      parts.push(`  local g=Duel.SelectMatchingCard(tp,Card.IsAbleToGrave,tp,LOCATION_DECK,0,1,1,nil)`);
      parts.push(`  if #g>0 then`);
      parts.push(`    Duel.SendtoGrave(g,REASON_EFFECT)`);
      parts.push(`  end`);
    } else if (action === 'special_summon_deck') {
      parts.push(`  if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end`);
      parts.push(`  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)`);
      parts.push(`  local g=Duel.SelectMatchingCard(tp,aux.TRUE,tp,LOCATION_DECK,0,1,1,nil,e,tp)`);
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

  getCategoryCode(action) {
    switch (action) {
      case 'choice_search_or_dump': return 'CATEGORY_TOHAND+CATEGORY_SEARCH+CATEGORY_TOGRAVE';
      case 'choice_ss_or_search': return 'CATEGORY_SPECIAL_SUMMON+CATEGORY_TOHAND+CATEGORY_SEARCH';
      case 'choice_destroy_or_banish': return 'CATEGORY_DESTROY+CATEGORY_REMOVE';
      case 'choice_draw_or_burn': return 'CATEGORY_DRAW+CATEGORY_DAMAGE';
      case 'search_deck': return 'CATEGORY_TOHAND+CATEGORY_SEARCH';
      case 'to_hand_target': return 'CATEGORY_TOHAND';
      case 'special_summon_self':
      case 'special_summon_hand':
      case 'revive_grave': return 'CATEGORY_SPECIAL_SUMMON';
      case 'negate_and_destroy': return 'CATEGORY_NEGATE+CATEGORY_DESTROY';
      case 'negate_activation': return 'CATEGORY_NEGATE';
      case 'banish_target': return 'CATEGORY_REMOVE';
      case 'destroy_target':
      case 'wipe_oppo_all':
      case 'wipe_oppo_monsters':
      case 'wipe_oppo_spells': return 'CATEGORY_DESTROY';
      case 'draw_cards': return 'CATEGORY_DRAW';
      case 'burn_battle_destroy': return 'CATEGORY_DAMAGE';
      case 'dump_deck': return 'CATEGORY_TOGRAVE+CATEGORY_DECKDES';
      case 'special_summon_deck': return 'CATEGORY_SPECIAL_SUMMON';
      case 'negate_target_monster': return 'CATEGORY_DISABLE';
      case 'p_destroy_search': return 'CATEGORY_DESTROY+CATEGORY_TOHAND+CATEGORY_SEARCH';
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
    if (isJa) {
      if (cost === 'discard_self') return hasTarget ? '手札のこのカードを墓地へ送り、' : '手札のこのカードを墓地へ送って発動できる。';
      if (cost === 'release_self') return hasTarget ? 'フィールドのこのカードをリリースし、' : 'フィールドのこのカードをリリースして発動できる。';
      if (cost === 'pay_1000' || cost === 'pay_lp') {
        const lp = parseInt(slot.costLp) || 1000;
        return hasTarget ? `${lp}ＬＰを払い、` : `${lp}ＬＰを払って発動できる。`;
      }
      if (cost === 'discard_one') return hasTarget ? '手札を１枚墓地へ送り、' : '手札を１枚墓地へ送って発動できる。';
      if (cost === 'detach_xyz') return hasTarget ? 'このカードのＸ素材を１つ取り除き、' : 'このカードのＸ素材を１つ取り除いて発動できる。';
      if (cost === 'banish_one_gy') return hasTarget ? '自分の墓地のカード１枚を除外し、' : '自分の墓地のカード１枚を除外して発動できる。';
      return '';
    }
    if (cost === 'discard_self') return hasTarget ? '把手卡的这张卡送去墓地，' : '把手卡的这张卡送去墓地才能发动。';
    if (cost === 'release_self') return hasTarget ? '把场上的这张卡解放，' : '把场上的这张卡解放才能发动。';
    if (cost === 'pay_1000' || cost === 'pay_lp') {
      const lp = parseInt(slot.costLp) || 1000;
      return hasTarget ? `支付${lp}基本分，` : `支付${lp}基本分才能发动。`;
    }
    if (cost === 'discard_one') return hasTarget ? '把1张手卡送去墓地，' : '把1张手卡送去墓地才能发动。';
    if (cost === 'detach_xyz') return hasTarget ? '去除此卡的1个超量素材，' : '去除此卡的1个超量素材才能发动。';
    if (cost === 'banish_one_gy') return hasTarget ? '把自己墓地1张卡除外，' : '把自己墓地1张卡除外才能发动。';
    return '';
  }

  getTargetClause(slot, isJa) {
    const target = slot.target;
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
    if (isJa) {
      if (action === 'search_deck') return 'デッキからカード１枚を手札に加える。';
      if (action === 'special_summon_self') return 'このカードを手札から特殊召喚する。';
      if (action === 'special_summon_hand') return '手札からモンスター１体を特殊召喚する。';
      if (action === 'revive_grave') return hasTarget ? 'そのモンスターを自分フィールドに特殊召喚する。' : '自分または相手の墓地のモンスター１体を自分フィールドに特殊召喚する。';
      if (action === 'destroy_target') return hasTarget ? 'そのカードを破壊する。' : 'フィールドのカード１枚を破壊する。';
      if (action === 'to_hand_target') return hasTarget ? 'そのカードを持ち主の手札に戻す。' : 'フィールドのカード１枚を持ち主の手札に戻す。';
      if (action === 'banish_target') return hasTarget ? 'そのカードを除外する。' : '相手フィールドのカード１枚を除外する。';
      if (action === 'negate_and_destroy') return 'その発動を無効にし破壊する。';
      if (action === 'negate_activation') return 'その発動を無効にする。';
      if (action === 'dump_deck') return 'デッキからカード１枚を墓地へ送る。';
      if (action === 'special_summon_deck') return 'デッキからモンスター１体を特殊召喚する。';
      if (action === 'negate_target_monster') return 'そのモンスターの効果をターン終了時まで無効にする。';
      if (action === 'p_destroy_search') return 'このカードを破壊し、デッキからカード１枚を手札に加える。';
      if (action === 'draw_cards') return 'デッキから２枚ドローする。';
      if (action === 'wipe_oppo_all') return '相手フィールドのカードを全て破壊する。';
      if (action === 'wipe_oppo_monsters') return '相手フィールドのモンスターを全て破壊する。';
      if (action === 'wipe_oppo_spells') return '相手フィールドの魔法・罠カードを全て破壊する。';
      if (action === 'burn_battle_destroy' || action === 'burn_damage') return '相手に１０００ダメージを与える。';
      if (action === 'immune_all') return '相手のカードの効果を受けない。';
      if (action === 'atk_boost') return 'このカードの攻撃力・守備力は１０００アップする。';
      return '効果を適用する。';
    }
    if (action === 'search_deck') return '从卡组把1张卡加入手牌。';
    if (action === 'special_summon_self') return '这张卡从手卡特殊召唤。';
    if (action === 'special_summon_hand') return '从手卡把1只怪兽特殊召唤。';
    if (action === 'revive_grave') return hasTarget ? '那只怪兽在自己场上特殊召唤。' : '以自己或对方墓地1只怪兽为对象才能发动。那只怪兽在自己场上特殊召唤。';
    if (action === 'destroy_target') return hasTarget ? '那张卡破坏。' : '以场上1张卡为对象才能发动。那张卡破坏。';
    if (action === 'to_hand_target') return hasTarget ? '那张卡回到持有者手牌。' : '以场上1张卡为对象才能发动。那张卡回到持有者手牌。';
    if (action === 'banish_target') return hasTarget ? '那张卡除外。' : '以对方场上1张卡为对象才能发动。那张卡除外。';
    if (action === 'negate_and_destroy') return '那个发动无效并破坏。';
    if (action === 'negate_activation') return '那个发动无效。';
    if (action === 'dump_deck') return '从卡组把1张卡送去墓地。';
    if (action === 'special_summon_deck') return '从卡组把1只怪兽特殊召唤。';
    if (action === 'negate_target_monster') return '那只怪兽的效果直到回合结束时无效。';
    if (action === 'p_destroy_search') return '把这张卡破坏，从卡组把1张卡加入手牌。';
    if (action === 'draw_cards') return '从卡组抽2张卡。';
    if (action === 'wipe_oppo_all') return '对方场上的卡全部破坏。';
    if (action === 'wipe_oppo_monsters') return '对方场上的怪兽全部破坏。';
    if (action === 'wipe_oppo_spells') return '对方场上的魔法·陷阱卡全部破坏。';
    if (action === 'burn_battle_destroy' || action === 'burn_damage') return '给对方造成1000点伤害。';
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
    const hasTarget = slot.target && slot.target !== 'none';
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
