import { EffectModule, EffectCategory } from './types.js';

/**
 * YGOPro 完整效果模块库
 * 基于官方脚本提取的常见效果模式
 */
export const EFFECT_MODULES: EffectModule[] = [
  // ===== 召唤相关 =====
  {
    id: 'special_summon_from_hand',
    name: '从手卡特殊召唤',
    nameEn: 'Special Summon from Hand',
    category: EffectCategory.SUMMON,
    description: '在满足特定条件时，可以从手卡特殊召唤此卡',
    parameters: [
      {
        name: 'condition',
        type: 'select',
        label: '召唤条件',
        description: '触发特殊召唤的条件',
        options: [
          { value: 'no_monsters', label: '自己场上没有怪兽' },
          { value: 'opponent_monsters', label: '对手场上有怪兽' },
          { value: 'specific_type', label: '场上有特定类型怪兽' },
          { value: 'life_difference', label: '生命值差距' }
        ],
        required: true
      },
      {
        name: 'once_per_turn',
        type: 'boolean',
        label: '一回合一次',
        description: '此效果一回合只能使用一次',
        defaultValue: true,
        required: false
      }
    ],
    luaTemplate: `
--从手卡特殊召唤
function s.spcon(e,tp,eg,ep,ev,re,r,rp)
  {{#if condition.no_monsters}}
  return Duel.GetFieldGroupCount(tp,LOCATION_MZONE,0)==0
  {{/if}}
  {{#if condition.opponent_monsters}}
  return Duel.GetFieldGroupCount(tp,0,LOCATION_MZONE)>0
  {{/if}}
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
    and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  if c:IsRelateToEffect(e) then
    Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
  end
end`,
    compatibility: [],
    examples: ['青眼白龙', '暗黑界系列'],
    tags: ['特召', '手卡', '条件召唤']
  },

  {
    id: 'special_summon_from_grave',
    name: '从墓地特殊召唤',
    nameEn: 'Special Summon from Graveyard',
    category: EffectCategory.SUMMON,
    description: '从墓地特殊召唤怪兽',
    parameters: [
      {
        name: 'target',
        type: 'select',
        label: '召唤目标',
        options: [
          { value: 'self', label: '召唤此卡自身' },
          { value: 'any', label: '召唤任意怪兽' },
          { value: 'specific_type', label: '召唤特定类型怪兽' }
        ],
        required: true
      },
      {
        name: 'cost',
        type: 'select',
        label: '发动代价',
        options: [
          { value: 'none', label: '无代价' },
          { value: 'discard', label: '舍弃手卡' },
          { value: 'banish', label: '除外卡片' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--从墓地特殊召唤
{{#if target.self}}
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
    and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  if c:IsRelateToEffect(e) then
    Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
  end
end
{{/if}}
{{#if target.any}}
function s.spfilter(c,e,tp)
  return c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return chkc:IsLocation(LOCATION_GRAVE) and chkc:IsControler(tp) and s.spfilter(chkc,e,tp) end
  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
    and Duel.IsExistingTarget(s.spfilter,tp,LOCATION_GRAVE,0,1,nil,e,tp) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
  local g=Duel.SelectTarget(tp,s.spfilter,tp,LOCATION_GRAVE,0,1,1,nil,e,tp)
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,1,0,0)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
  local tc=Duel.GetFirstTarget()
  if tc:IsRelateToEffect(e) then
    Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)
  end
end
{{/if}}`,
    compatibility: [],
    examples: ['早埋', '死者苏生'],
    tags: ['特召', '墓地', '复活']
  },

  // ===== 检索效果 =====
  {
    id: 'search_deck',
    name: '从卡组检索',
    nameEn: 'Search from Deck',
    category: EffectCategory.SEARCH,
    description: '从卡组检索特定卡片加入手牌',
    parameters: [
      {
        name: 'search_type',
        type: 'select',
        label: '检索类型',
        options: [
          { value: 'monster', label: '怪兽卡' },
          { value: 'spell', label: '魔法卡' },
          { value: 'trap', label: '陷阱卡' },
          { value: 'any', label: '任意卡片' }
        ],
        required: true
      },
      {
        name: 'count',
        type: 'number',
        label: '检索数量',
        defaultValue: 1,
        min: 1,
        max: 3,
        required: true
      },
      {
        name: 'race_filter',
        type: 'select',
        label: '种族限制',
        options: [
          { value: '', label: '无限制' },
          { value: 'WARRIOR', label: '战士族' },
          { value: 'SPELLCASTER', label: '魔法师族' },
          { value: 'DRAGON', label: '龙族' },
          { value: 'FIEND', label: '恶魔族' },
          { value: 'MACHINE', label: '机械族' }
        ],
        required: false
      }
    ],
    luaTemplate: `
--从卡组检索
function s.thfilter(c)
  {{#if search_type.monster}}
  return c:IsType(TYPE_MONSTER) 
    {{#if race_filter}}and c:IsRace(RACE_{{race_filter}}){{/if}}
    and c:IsAbleToHand()
  {{/if}}
  {{#if search_type.spell}}
  return c:IsType(TYPE_SPELL) and c:IsAbleToHand()
  {{/if}}
  {{#if search_type.trap}}
  return c:IsType(TYPE_TRAP) and c:IsAbleToHand()
  {{/if}}
  {{#if search_type.any}}
  return c:IsAbleToHand()
  {{/if}}
end
function s.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil) end
  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,{{count}},tp,LOCATION_DECK)
end
function s.thop(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
  local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,{{count}},nil)
  if #g>0 then
    Duel.SendtoHand(g,nil,REASON_EFFECT)
    Duel.ConfirmCards(1-tp,g)
  end
end`,
    compatibility: [],
    examples: ['增援', '愚蠢的埋葬'],
    tags: ['检索', '卡组', '加入手牌']
  },

  {
    id: 'add_from_deck_to_hand',
    name: '卡组加入手牌',
    nameEn: 'Add from Deck to Hand',
    category: EffectCategory.SEARCH,
    description: '将卡组特定卡片加入手牌（不选择对象）',
    parameters: [
      {
        name: 'card_name',
        type: 'string',
        label: '卡片名称',
        description: '指定要加入手牌的卡片名称（留空则可选择）',
        required: false
      },
      {
        name: 'reveal',
        type: 'boolean',
        label: '公开给对手',
        defaultValue: true,
        required: false
      }
    ],
    luaTemplate: `
--卡组加入手牌
function s.thfilter(c)
  {{#if card_name}}
  return c:IsCode({{card_name}}) and c:IsAbleToHand()
  {{else}}
  return c:IsAbleToHand()
  {{/if}}
end
function s.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil) end
  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.thop(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
  local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,1,nil)
  if #g>0 then
    Duel.SendtoHand(g,nil,REASON_EFFECT)
    {{#if reveal}}
    Duel.ConfirmCards(1-tp,g)
    {{/if}}
  end
end`,
    compatibility: [],
    examples: ['星光大道', '融合'],
    tags: ['检索', '加入手牌']
  },

  // ===== 破坏效果 =====
  {
    id: 'destroy_card',
    name: '破坏卡片',
    nameEn: 'Destroy Card',
    category: EffectCategory.DESTROY,
    description: '破坏场上或其他区域的卡片',
    parameters: [
      {
        name: 'target_location',
        type: 'select',
        label: '目标位置',
        options: [
          { value: 'LOCATION_MZONE', label: '怪兽区域' },
          { value: 'LOCATION_SZONE', label: '魔陷区域' },
          { value: 'LOCATION_ONFIELD', label: '场上' }
        ],
        required: true
      },
      {
        name: 'target_controller',
        type: 'select',
        label: '目标控制者',
        options: [
          { value: '0,LOCATION_ONFIELD', label: '对手' },
          { value: 'LOCATION_ONFIELD,0', label: '自己' },
          { value: 'LOCATION_ONFIELD,LOCATION_ONFIELD', label: '双方' }
        ],
        required: true
      },
      {
        name: 'count',
        type: 'number',
        label: '破坏数量',
        defaultValue: 1,
        min: 1,
        max: 5,
        required: true
      },
      {
        name: 'target_required',
        type: 'boolean',
        label: '需要选择对象',
        defaultValue: true,
        required: true
      }
    ],
    luaTemplate: `
--破坏卡片
{{#if target_required}}
function s.desfilter(c)
  return c:IsFaceup()
end
function s.destg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return chkc:IsOnField() end
  if chk==0 then return Duel.IsExistingTarget(s.desfilter,tp,{{target_controller}},1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
  local g=Duel.SelectTarget(tp,s.desfilter,tp,{{target_controller}},1,{{count}},nil)
  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,#g,0,0)
end
function s.desop(e,tp,eg,ep,ev,re,r,rp)
  local g=Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS):Filter(Card.IsRelateToEffect,nil,e)
  if #g>0 then
    Duel.Destroy(g,REASON_EFFECT)
  end
end
{{else}}
function s.destg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(aux.TRUE,tp,{{target_controller}},1,nil) end
  local g=Duel.GetMatchingGroup(aux.TRUE,tp,{{target_controller}},nil)
  Duel.SetOperationInfo(0,CATEGORY_DESTROY,g,{{count}},0,0)
end
function s.desop(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DESTROY)
  local g=Duel.SelectMatchingCard(tp,aux.TRUE,tp,{{target_controller}},1,{{count}},nil)
  if #g>0 then
    Duel.Destroy(g,REASON_EFFECT)
  end
end
{{/if}}`,
    compatibility: [],
    examples: ['月之书', '旋风'],
    tags: ['破坏', '去除']
  },

  // ===== 抽卡效果 =====
  {
    id: 'draw_card',
    name: '抽卡',
    nameEn: 'Draw Cards',
    category: EffectCategory.DRAW,
    description: '从卡组抽卡',
    parameters: [
      {
        name: 'count',
        type: 'number',
        label: '抽卡数量',
        defaultValue: 1,
        min: 1,
        max: 3,
        required: true
      },
      {
        name: 'player',
        type: 'select',
        label: '抽卡玩家',
        options: [
          { value: 'tp', label: '自己' },
          { value: '1-tp', label: '对手' },
          { value: 'both', label: '双方' }
        ],
        defaultValue: 'tp',
        required: true
      }
    ],
    luaTemplate: `
--抽卡
function s.drawtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsPlayerCanDraw({{#if player.both}}tp,{{count}}) and Duel.IsPlayerCanDraw(1-tp,{{count}}){{else}}{{player}},{{count}}){{/if}} end
  {{#if player.both}}
  Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,PLAYER_ALL,{{count}})
  {{else}}
  Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,{{player}},{{count}})
  {{/if}}
end
function s.drawop(e,tp,eg,ep,ev,re,r,rp)
  {{#if player.both}}
  Duel.Draw(tp,{{count}},REASON_EFFECT)
  Duel.Draw(1-tp,{{count}},REASON_EFFECT)
  {{else}}
  Duel.Draw({{player}},{{count}},REASON_EFFECT)
  {{/if}}
end`,
    compatibility: [],
    examples: ['贪欲之壶', '强欲之壶'],
    tags: ['抽卡', '手牌优势']
  },

  // ===== 伤害效果 =====
  {
    id: 'inflict_damage',
    name: '造成伤害',
    nameEn: 'Inflict Damage',
    category: EffectCategory.DAMAGE,
    description: '对玩家造成伤害',
    parameters: [
      {
        name: 'damage_value',
        type: 'number',
        label: '伤害数值',
        defaultValue: 500,
        min: 100,
        max: 8000,
        required: true
      },
      {
        name: 'target_player',
        type: 'select',
        label: '目标玩家',
        options: [
          { value: '1-tp', label: '对手' },
          { value: 'tp', label: '自己' }
        ],
        defaultValue: '1-tp',
        required: true
      }
    ],
    luaTemplate: `
--造成伤害
function s.damtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return true end
  Duel.SetTargetPlayer({{target_player}})
  Duel.SetTargetParam({{damage_value}})
  Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,{{target_player}},{{damage_value}})
end
function s.damop(e,tp,eg,ep,ev,re,r,rp)
  local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
  Duel.Damage(p,d,REASON_EFFECT)
end`,
    compatibility: [],
    examples: ['火球', '魔法筒'],
    tags: ['伤害', 'burn']
  },

  {
    id: 'gain_lp',
    name: '回复生命值',
    nameEn: 'Gain LP',
    category: EffectCategory.DAMAGE,
    description: '回复生命值',
    parameters: [
      {
        name: 'lp_value',
        type: 'number',
        label: '回复数值',
        defaultValue: 1000,
        min: 100,
        max: 8000,
        required: true
      },
      {
        name: 'target_player',
        type: 'select',
        label: '目标玩家',
        options: [
          { value: 'tp', label: '自己' },
          { value: '1-tp', label: '对手' }
        ],
        defaultValue: 'tp',
        required: true
      }
    ],
    luaTemplate: `
--回复生命值
function s.rectg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return true end
  Duel.SetTargetPlayer({{target_player}})
  Duel.SetTargetParam({{lp_value}})
  Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,{{target_player}},{{lp_value}})
end
function s.recop(e,tp,eg,ep,ev,re,r,rp)
  local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
  Duel.Recover(p,d,REASON_EFFECT)
end`,
    compatibility: [],
    examples: ['治疗之神 迪安凯特'],
    tags: ['回复', '生命值']
  },

  // ===== 无效效果 =====
  {
    id: 'negate_effect',
    name: '无效化',
    nameEn: 'Negate Effect',
    category: EffectCategory.NEGATE,
    description: '无效卡片的发动或效果',
    parameters: [
      {
        name: 'negate_type',
        type: 'select',
        label: '无效类型',
        options: [
          { value: 'activation', label: '无效发动' },
          { value: 'effect', label: '无效效果' },
          { value: 'summon', label: '无效召唤' }
        ],
        required: true
      },
      {
        name: 'destroy_after',
        type: 'boolean',
        label: '无效后破坏',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--无效化
function s.negcon(e,tp,eg,ep,ev,re,r,rp)
  {{#if negate_type.activation}}
  return re:IsActiveType(TYPE_MONSTER+TYPE_SPELL+TYPE_TRAP) and Duel.IsChainNegatable(ev)
  {{/if}}
  {{#if negate_type.summon}}
  return Duel.GetCurrentChain()==0
  {{/if}}
end
function s.negtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return true end
  Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
  {{#if destroy_after}}
  if re:GetHandler():IsDestructable() and re:GetHandler():IsRelateToEffect(re) then
    Duel.SetOperationInfo(0,CATEGORY_DESTROY,eg,1,0,0)
  end
  {{/if}}
end
function s.negop(e,tp,eg,ep,ev,re,r,rp)
  {{#if negate_type.activation}}
  if Duel.NegateActivation(ev) {{#if destroy_after}}and re:GetHandler():IsRelateToEffect(re){{/if}} then
    {{#if destroy_after}}
    Duel.Destroy(eg,REASON_EFFECT)
    {{/if}}
  end
  {{/if}}
end`,
    compatibility: [],
    examples: ['灰流丽', '效果遮蒙者'],
    tags: ['无效', '干扰', '康']
  },

  // ===== 除外效果 =====
  {
    id: 'banish_card',
    name: '除外卡片',
    nameEn: 'Banish Card',
    category: EffectCategory.BANISH,
    description: '将卡片除外',
    parameters: [
      {
        name: 'location',
        type: 'select',
        label: '除外位置',
        options: [
          { value: 'LOCATION_GRAVE', label: '墓地' },
          { value: 'LOCATION_HAND', label: '手卡' },
          { value: 'LOCATION_ONFIELD', label: '场上' },
          { value: 'LOCATION_DECK', label: '卡组顶' }
        ],
        required: true
      },
      {
        name: 'count',
        type: 'number',
        label: '除外数量',
        defaultValue: 1,
        min: 1,
        max: 5,
        required: true
      },
      {
        name: 'face_down',
        type: 'boolean',
        label: '里侧除外',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--除外卡片
function s.rmfilter(c)
  return c:IsAbleToRemove()
end
function s.rmtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return chkc:IsLocation({{location}}) and chkc:IsControler(1-tp) and s.rmfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.rmfilter,tp,0,{{location}},1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
  local g=Duel.SelectTarget(tp,s.rmfilter,tp,0,{{location}},1,{{count}},nil)
  Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,#g,0,0)
end
function s.rmop(e,tp,eg,ep,ev,re,r,rp)
  local g=Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS):Filter(Card.IsRelateToEffect,nil,e)
  if #g>0 then
    Duel.Remove(g,{{#if face_down}}POS_FACEDOWN{{else}}POS_FACEUP{{/if}},REASON_EFFECT)
  end
end`,
    compatibility: [],
    examples: ['次元幽闭', 'D.D.乌鸦'],
    tags: ['除外', '去除']
  },

  // ===== 攻守变化 =====
  {
    id: 'atk_def_change',
    name: '攻守数值变化',
    nameEn: 'ATK/DEF Change',
    category: EffectCategory.STAT_CHANGE,
    description: '改变怪兽的攻击力或守备力',
    parameters: [
      {
        name: 'stat_type',
        type: 'select',
        label: '变化类型',
        options: [
          { value: 'atk', label: '仅攻击力' },
          { value: 'def', label: '仅守备力' },
          { value: 'both', label: '攻击力和守备力' }
        ],
        required: true
      },
      {
        name: 'value',
        type: 'number',
        label: '变化数值',
        defaultValue: 500,
        min: -3000,
        max: 3000,
        required: true
      },
      {
        name: 'duration',
        type: 'select',
        label: '持续时间',
        options: [
          { value: 'permanent', label: '永久' },
          { value: 'end_phase', label: '回合结束' },
          { value: 'while_face_up', label: '表侧表示期间' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--攻守数值变化
function s.atkfilter(c)
  return c:IsFaceup() and c:IsType(TYPE_MONSTER)
end
function s.atktg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and s.atkfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.atkfilter,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
  Duel.SelectTarget(tp,s.atkfilter,tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
end
function s.atkop(e,tp,eg,ep,ev,re,r,rp)
  local tc=Duel.GetFirstTarget()
  if tc:IsRelateToEffect(e) and tc:IsFaceup() then
    local e1=Effect.CreateEffect(e:GetHandler())
    {{#if stat_type.atk}}
    e1:SetType(EFFECT_TYPE_SINGLE)
    e1:SetCode(EFFECT_UPDATE_ATTACK)
    {{/if}}
    {{#if stat_type.def}}
    e1:SetType(EFFECT_TYPE_SINGLE)
    e1:SetCode(EFFECT_UPDATE_DEFENSE)
    {{/if}}
    {{#if stat_type.both}}
    e1:SetType(EFFECT_TYPE_SINGLE)
    e1:SetCode(EFFECT_UPDATE_ATTACK)
    {{/if}}
    e1:SetValue({{value}})
    {{#if duration.permanent}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD)
    {{/if}}
    {{#if duration.end_phase}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if duration.while_face_up}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_DISABLE)
    {{/if}}
    tc:RegisterEffect(e1)
    {{#if stat_type.both}}
    local e2=e1:Clone()
    e2:SetCode(EFFECT_UPDATE_DEFENSE)
    tc:RegisterEffect(e2)
    {{/if}}
  end
end`,
    compatibility: [],
    examples: ['收缩', '月之书'],
    tags: ['攻守', '数值', '强化']
  },

  // ===== 送去墓地 =====
  {
    id: 'send_to_grave',
    name: '送去墓地',
    nameEn: 'Send to Graveyard',
    category: EffectCategory.EFFECT,
    description: '将卡片送去墓地',
    parameters: [
      {
        name: 'location',
        type: 'select',
        label: '来源位置',
        options: [
          { value: 'LOCATION_DECK', label: '卡组' },
          { value: 'LOCATION_HAND', label: '手卡' },
          { value: 'LOCATION_ONFIELD', label: '场上' }
        ],
        required: true
      },
      {
        name: 'count',
        type: 'number',
        label: '数量',
        defaultValue: 1,
        min: 1,
        max: 5,
        required: true
      },
      {
        name: 'card_type',
        type: 'select',
        label: '卡片类型',
        options: [
          { value: 'any', label: '任意卡片' },
          { value: 'monster', label: '怪兽卡' },
          { value: 'spell', label: '魔法卡' },
          { value: 'trap', label: '陷阱卡' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--送去墓地
function s.tgfilter(c)
  {{#if card_type.monster}}
  return c:IsType(TYPE_MONSTER) and c:IsAbleToGrave()
  {{/if}}
  {{#if card_type.spell}}
  return c:IsType(TYPE_SPELL) and c:IsAbleToGrave()
  {{/if}}
  {{#if card_type.trap}}
  return c:IsType(TYPE_TRAP) and c:IsAbleToGrave()
  {{/if}}
  {{#if card_type.any}}
  return c:IsAbleToGrave()
  {{/if}}
end
function s.tgtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(s.tgfilter,tp,{{location}},0,1,nil) end
  Duel.SetOperationInfo(0,CATEGORY_TOGRAVE,nil,{{count}},tp,{{location}})
end
function s.tgop(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
  local g=Duel.SelectMatchingCard(tp,s.tgfilter,tp,{{location}},0,1,{{count}},nil)
  if #g>0 then
    Duel.SendtoGrave(g,REASON_EFFECT)
  end
end`,
    compatibility: [],
    examples: ['愚蠢的埋葬', '痛苦的选择'],
    tags: ['墓地', '堆墓']
  }
];

/**
 * 根据卡片类型获取适用的效果模块
 */
export function getModulesForCardType(cardType: number): EffectModule[] {
  // 怪兽卡
  if (cardType & 0x1) {
    return EFFECT_MODULES.filter(m => 
      [EffectCategory.SUMMON, EffectCategory.SEARCH, EffectCategory.DESTROY,
       EffectCategory.DRAW, EffectCategory.DAMAGE, EffectCategory.NEGATE,
       EffectCategory.STAT_CHANGE, EffectCategory.BANISH, EffectCategory.EFFECT].includes(m.category)
    );
  }
  // 魔法卡
  if (cardType & 0x2) {
    return EFFECT_MODULES.filter(m =>
      [EffectCategory.SEARCH, EffectCategory.DESTROY, EffectCategory.DRAW,
       EffectCategory.DAMAGE, EffectCategory.STAT_CHANGE, EffectCategory.SUMMON,
       EffectCategory.BANISH, EffectCategory.EFFECT].includes(m.category)
    );
  }
  // 陷阱卡
  if (cardType & 0x4) {
    return EFFECT_MODULES.filter(m =>
      [EffectCategory.DESTROY, EffectCategory.NEGATE, EffectCategory.DAMAGE,
       EffectCategory.BANISH, EffectCategory.STAT_CHANGE, EffectCategory.EFFECT].includes(m.category)
    );
  }
  return EFFECT_MODULES;
}
