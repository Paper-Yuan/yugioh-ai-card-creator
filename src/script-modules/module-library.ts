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
    description: '对玩家造成伤害（支持固定值和动态计算）',
    parameters: [
      {
        name: 'valueMode',
        type: 'select',
        label: '数值模式',
        options: [
          { value: 'fixed', label: '固定数值' },
          { value: 'count_times', label: '场上卡数×倍率' },
          { value: 'grave_count', label: '墓地卡数×倍率' },
          { value: 'level_ref', label: '等级×倍率' },
          { value: 'atk_ref', label: '攻击力参照' }
        ],
        defaultValue: 'fixed',
        required: true
      },
      {
        name: 'damage_value',
        type: 'number',
        label: '固定伤害值',
        defaultValue: 500,
        min: 100,
        max: 8000,
        required: false,
        conditionalOn: { parameter: 'valueMode', value: 'fixed' }
      },
      {
        name: 'multiplier',
        type: 'number',
        label: '倍率',
        defaultValue: 500,
        min: 100,
        max: 2000,
        required: false,
        conditionalOn: { parameter: 'valueMode', value: ['count_times', 'grave_count', 'level_ref'] }
      },
      {
        name: 'countLocation',
        type: 'select',
        label: '计数位置',
        options: [
          { value: 'LOCATION_MZONE', label: '怪兽区' },
          { value: 'LOCATION_GRAVE', label: '墓地' }
        ],
        defaultValue: 'LOCATION_MZONE',
        required: false,
        conditionalOn: { parameter: 'valueMode', value: ['count_times', 'grave_count'] }
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
{{#if valueMode.count_times}}
function s.damval(e,tp)
  local ct=Duel.GetMatchingGroupCount(Card.IsFaceup,tp,{{countLocation}},0,nil)
  return ct*{{multiplier}}
end
{{/if}}
{{#if valueMode.grave_count}}
function s.damval(e,tp)
  local ct=Duel.GetMatchingGroupCount(Card.IsType,tp,{{countLocation}},0,nil,TYPE_MONSTER)
  return ct*{{multiplier}}
end
{{/if}}
function s.damtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return true end
  Duel.SetTargetPlayer({{target_player}})
  {{#if valueMode.fixed}}
  Duel.SetTargetParam({{damage_value}})
  Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,{{target_player}},{{damage_value}})
  {{else}}
  local dam=s.damval(e,tp)
  Duel.SetTargetParam(dam)
  Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,{{target_player}},dam)
  {{/if}}
end
function s.damop(e,tp,eg,ep,ev,re,r,rp)
  local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
  Duel.Damage(p,d,REASON_EFFECT)
end`,
    compatibility: [],
    examples: ['火球', '魔法筒', '光之护封剑'],
    tags: ['伤害', 'burn']
  },

  {
    id: 'gain_lp',
    name: '回复生命值',
    nameEn: 'Gain LP',
    category: EffectCategory.DAMAGE,
    description: '回复生命值（支持固定值和动态计算）',
    parameters: [
      {
        name: 'valueMode',
        type: 'select',
        label: '数值模式',
        options: [
          { value: 'fixed', label: '固定数值' },
          { value: 'count_times', label: '场上卡数×倍率' },
          { value: 'grave_count', label: '墓地卡数×倍率' }
        ],
        defaultValue: 'fixed',
        required: true
      },
      {
        name: 'lp_value',
        type: 'number',
        label: '固定回复值',
        defaultValue: 1000,
        min: 100,
        max: 8000,
        required: false,
        conditionalOn: { parameter: 'valueMode', value: 'fixed' }
      },
      {
        name: 'multiplier',
        type: 'number',
        label: '倍率',
        defaultValue: 500,
        min: 100,
        max: 2000,
        required: false,
        conditionalOn: { parameter: 'valueMode', value: ['count_times', 'grave_count'] }
      },
      {
        name: 'countLocation',
        type: 'select',
        label: '计数位置',
        options: [
          { value: 'LOCATION_MZONE', label: '怪兽区' },
          { value: 'LOCATION_GRAVE', label: '墓地' }
        ],
        defaultValue: 'LOCATION_MZONE',
        required: false,
        conditionalOn: { parameter: 'valueMode', value: ['count_times', 'grave_count'] }
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
{{#if valueMode.count_times}}
function s.recval(e,tp)
  local ct=Duel.GetMatchingGroupCount(Card.IsFaceup,tp,{{countLocation}},0,nil)
  return ct*{{multiplier}}
end
{{/if}}
{{#if valueMode.grave_count}}
function s.recval(e,tp)
  local ct=Duel.GetMatchingGroupCount(Card.IsType,tp,{{countLocation}},0,nil,TYPE_MONSTER)
  return ct*{{multiplier}}
end
{{/if}}
function s.rectg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return true end
  Duel.SetTargetPlayer({{target_player}})
  {{#if valueMode.fixed}}
  Duel.SetTargetParam({{lp_value}})
  Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,{{target_player}},{{lp_value}})
  {{else}}
  local rec=s.recval(e,tp)
  Duel.SetTargetParam(rec)
  Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,{{target_player}},rec)
  {{/if}}
end
function s.recop(e,tp,eg,ep,ev,re,r,rp)
  local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
  Duel.Recover(p,d,REASON_EFFECT)
end`,
    compatibility: [],
    examples: ['治疗之神 迪安凯特', '一滴的加护'],
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
    description: '改变怪兽的攻击力或守备力（支持固定值和动态计算）',
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
        name: 'valueMode',
        type: 'select',
        label: '数值模式',
        description: '选择固定值或动态计算方式',
        options: [
          { value: 'fixed', label: '固定数值' },
          { value: 'count_times', label: '场上卡数×倍率' },
          { value: 'grave_count', label: '墓地卡数×倍率' },
          { value: 'level_ref', label: '等级×倍率' },
          { value: 'atk_ref', label: '攻击力参照' },
          { value: 'overlay_count', label: '超量素材数×倍率' }
        ],
        defaultValue: 'fixed',
        required: true
      },
      {
        name: 'fixedValue',
        type: 'number',
        label: '固定数值',
        defaultValue: 500,
        min: -3000,
        max: 3000,
        required: false,
        conditionalOn: { parameter: 'valueMode', value: 'fixed' }
      },
      {
        name: 'multiplier',
        type: 'number',
        label: '倍率',
        description: '每个单位的数值变化量',
        defaultValue: 500,
        min: 1,
        max: 2000,
        required: false,
        conditionalOn: { parameter: 'valueMode', value: ['count_times', 'grave_count', 'level_ref', 'overlay_count'] }
      },
      {
        name: 'countLocation',
        type: 'select',
        label: '计数位置',
        options: [
          { value: 'LOCATION_MZONE', label: '怪兽区' },
          { value: 'LOCATION_GRAVE', label: '墓地' },
          { value: 'LOCATION_REMOVED', label: '除外区' }
        ],
        defaultValue: 'LOCATION_MZONE',
        required: false,
        conditionalOn: { parameter: 'valueMode', value: ['count_times', 'grave_count'] }
      },
      {
        name: 'countController',
        type: 'select',
        label: '计数归属',
        options: [
          { value: 'tp', label: '自己' },
          { value: '1-tp', label: '对手' }
        ],
        defaultValue: 'tp',
        required: false,
        conditionalOn: { parameter: 'valueMode', value: ['count_times', 'grave_count'] }
      },
      {
        name: 'refOperation',
        type: 'select',
        label: '参照运算',
        options: [
          { value: 'same', label: '相同数值' },
          { value: 'half', label: '一半' },
          { value: 'double', label: '两倍' }
        ],
        defaultValue: 'same',
        required: false,
        conditionalOn: { parameter: 'valueMode', value: 'atk_ref' }
      },
      {
        name: 'reset',
        type: 'select',
        label: '持续时长',
        description: '效果的重置时机',
        options: [
          { value: 'STANDARD', label: '永久(离场重置)' },
          { value: 'PHASE_END', label: '阶段结束' },
          { value: 'TURN_END', label: '回合结束' },
          { value: 'OPPO_TURN', label: '对手回合结束' }
        ],
        defaultValue: 'STANDARD',
        required: true
      }
    ],
    luaTemplate: `
--攻守数值变化
function s.atkfilter(c)
  return c:IsFaceup() and c:IsType(TYPE_MONSTER)
end
{{#if valueMode}}
{{#if valueMode.count_times}}
function s.atkval(e,c)
  local ct=Duel.GetMatchingGroupCount(s.atkfilter,e:GetHandlerPlayer(),{{countLocation}},0,nil)
  return ct*{{multiplier}}
end
{{/if}}
{{#if valueMode.grave_count}}
function s.atkval(e,c)
  local ct=Duel.GetMatchingGroupCount(Card.IsType,e:GetHandlerPlayer(),{{countLocation}},0,nil,TYPE_MONSTER)
  return ct*{{multiplier}}
end
{{/if}}
{{#if valueMode.level_ref}}
function s.atkval(e,c)
  return c:GetLevel()*{{multiplier}}
end
{{/if}}
{{#if valueMode.atk_ref}}
function s.atkval(e,c)
  local baseVal=c:GetAttack()
  {{#if refOperation.half}}
  return math.floor(baseVal/2)
  {{/if}}
  {{#if refOperation.double}}
  return baseVal*2
  {{/if}}
  {{#if refOperation.same}}
  return baseVal
  {{/if}}
end
{{/if}}
{{#if valueMode.overlay_count}}
function s.atkval(e,c)
  return c:GetOverlayCount()*{{multiplier}}
end
{{/if}}
{{/if}}
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
    {{#if valueMode.fixed}}
    e1:SetValue({{fixedValue}})
    {{else}}
    e1:SetValue(s.atkval)
    {{/if}}
    {{#if reset.STANDARD}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD)
    {{/if}}
    {{#if reset.PHASE_END}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.TURN_END}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.OPPO_TURN}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END+RESET_OPPO_TURN)
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
  },

  // ===== 效果无效化 =====
  {
    id: 'disable_effect',
    name: '效果无效化',
    nameEn: 'Disable Effect',
    category: EffectCategory.NEGATE,
    description: '无效怪兽的效果（持续性）',
    parameters: [
      {
        name: 'target_location',
        type: 'select',
        label: '目标位置',
        options: [
          { value: 'LOCATION_MZONE', label: '怪兽区域' },
          { value: 'LOCATION_ONFIELD', label: '场上全部' }
        ],
        required: true
      },
      {
        name: 'reset',
        type: 'select',
        label: '持续时长',
        description: '效果的重置时机',
        options: [
          { value: 'STANDARD', label: '永久(离场重置)' },
          { value: 'PHASE_END', label: '阶段结束' },
          { value: 'TURN_END', label: '回合结束' },
          { value: 'OPPO_TURN', label: '对手回合结束' }
        ],
        defaultValue: 'STANDARD',
        required: true
      },
      {
        name: 'scope',
        type: 'select',
        label: '无效范围',
        options: [
          { value: 'all', label: '全部效果' },
          { value: 'activation', label: '仅发动' }
        ],
        defaultValue: 'all',
        required: true
      },
      {
        name: 'targeted',
        type: 'boolean',
        label: '选择对象',
        defaultValue: true,
        required: false
      }
    ],
    luaTemplate: `
--效果无效化
function s.disfilter(c)
  return c:IsFaceup() and c:IsType(TYPE_MONSTER)
end
{{#if targeted}}
function s.distg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return chkc:IsLocation({{target_location}}) and s.disfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.disfilter,tp,{{target_location}},{{target_location}},1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
  Duel.SelectTarget(tp,s.disfilter,tp,{{target_location}},{{target_location}},1,1,nil)
end
function s.disop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  local tc=Duel.GetFirstTarget()
  if tc:IsRelateToEffect(e) and tc:IsFaceup() then
    local e1=Effect.CreateEffect(c)
    e1:SetType(EFFECT_TYPE_SINGLE)
    e1:SetCode(EFFECT_DISABLE)
    {{#if reset.STANDARD}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD)
    {{/if}}
    {{#if reset.PHASE_END}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.TURN_END}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.OPPO_TURN}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END+RESET_OPPO_TURN)
    {{/if}}
    tc:RegisterEffect(e1)
    {{#if scope.all}}
    local e2=Effect.CreateEffect(c)
    e2:SetType(EFFECT_TYPE_SINGLE)
    e2:SetCode(EFFECT_DISABLE_EFFECT)
    {{#if reset.STANDARD}}
    e2:SetReset(RESET_EVENT+RESETS_STANDARD)
    {{/if}}
    {{#if reset.PHASE_END}}
    e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.TURN_END}}
    e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.OPPO_TURN}}
    e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END+RESET_OPPO_TURN)
    {{/if}}
    tc:RegisterEffect(e2)
    {{/if}}
  end
end
{{else}}
function s.distg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(s.disfilter,tp,{{target_location}},{{target_location}},1,nil) end
end
function s.disop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
  local g=Duel.SelectMatchingCard(tp,s.disfilter,tp,{{target_location}},{{target_location}},1,1,nil)
  local tc=g:GetFirst()
  if tc then
    local e1=Effect.CreateEffect(c)
    e1:SetType(EFFECT_TYPE_SINGLE)
    e1:SetCode(EFFECT_DISABLE)
    {{#if reset.STANDARD}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD)
    {{/if}}
    {{#if reset.PHASE_END}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.TURN_END}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.OPPO_TURN}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END+RESET_OPPO_TURN)
    {{/if}}
    tc:RegisterEffect(e1)
    {{#if scope.all}}
    local e2=Effect.CreateEffect(c)
    e2:SetType(EFFECT_TYPE_SINGLE)
    e2:SetCode(EFFECT_DISABLE_EFFECT)
    {{#if reset.STANDARD}}
    e2:SetReset(RESET_EVENT+RESETS_STANDARD)
    {{/if}}
    {{#if reset.PHASE_END}}
    e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.TURN_END}}
    e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    {{#if reset.OPPO_TURN}}
    e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END+RESET_OPPO_TURN)
    {{/if}}
    tc:RegisterEffect(e2)
    {{/if}}
  end
end
{{/if}}`,
    compatibility: [],
    examples: ['技能抽取', '禁忌的圣衣'],
    tags: ['无效', '效果', '封锁']
  },

  // ===== 控制权转移 =====
  {
    id: 'change_control',
    name: '控制权转移',
    nameEn: 'Change Control',
    category: EffectCategory.EFFECT,
    description: '改变怪兽的控制权',
    parameters: [
      {
        name: 'duration',
        type: 'select',
        label: '持续时间',
        options: [
          { value: 'permanent', label: '永久' },
          { value: 'phase_end', label: '阶段结束' },
          { value: 'turn_end', label: '回合结束' }
        ],
        defaultValue: 'turn_end',
        required: true
      },
      {
        name: 'target_controller',
        type: 'select',
        label: '目标控制者',
        options: [
          { value: 'opponent', label: '对手怪兽' },
          { value: 'self', label: '自己怪兽' }
        ],
        defaultValue: 'opponent',
        required: true
      },
      {
        name: 'cannot_attack',
        type: 'boolean',
        label: '不能攻击',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--控制权转移
function s.ctfilter(c)
  return c:IsFaceup() and c:IsControlerCanBeChanged()
end
function s.cttg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  {{#if target_controller.opponent}}
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsControler(1-tp) and s.ctfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.ctfilter,tp,0,LOCATION_MZONE,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONTROL)
  local g=Duel.SelectTarget(tp,s.ctfilter,tp,0,LOCATION_MZONE,1,1,nil)
  {{else}}
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsControler(tp) and s.ctfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.ctfilter,tp,LOCATION_MZONE,0,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONTROL)
  local g=Duel.SelectTarget(tp,s.ctfilter,tp,LOCATION_MZONE,0,1,1,nil)
  {{/if}}
  Duel.SetOperationInfo(0,CATEGORY_CONTROL,g,1,0,0)
end
function s.ctop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  local tc=Duel.GetFirstTarget()
  if tc:IsRelateToEffect(e) then
    {{#if target_controller.opponent}}
    if Duel.GetControl(tc,tp{{#if duration.phase_end}},PHASE_END,1{{/if}}{{#if duration.turn_end}},PHASE_END,2{{/if}})~=0 then
    {{else}}
    if Duel.GetControl(tc,1-tp{{#if duration.phase_end}},PHASE_END,1{{/if}}{{#if duration.turn_end}},PHASE_END,2{{/if}})~=0 then
    {{/if}}
      {{#if cannot_attack}}
      local e1=Effect.CreateEffect(c)
      e1:SetType(EFFECT_TYPE_SINGLE)
      e1:SetCode(EFFECT_CANNOT_ATTACK)
      {{#if duration.permanent}}
      e1:SetReset(RESET_EVENT+RESETS_STANDARD)
      {{/if}}
      {{#if duration.phase_end}}
      e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
      {{/if}}
      {{#if duration.turn_end}}
      e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END,2)
      {{/if}}
      tc:RegisterEffect(e1)
      {{/if}}
    end
  end
end`,
    compatibility: [],
    examples: ['强夺', '敌人操纵器'],
    tags: ['控制', '夺取']
  },

  // ===== 表示形式变更 =====
  {
    id: 'change_position',
    name: '表示形式变更',
    nameEn: 'Change Position',
    category: EffectCategory.EFFECT,
    description: '改变怪兽的表示形式',
    parameters: [
      {
        name: 'target_position',
        type: 'select',
        label: '目标表示',
        options: [
          { value: 'POS_FACEUP_ATTACK', label: '表侧攻击表示' },
          { value: 'POS_FACEUP_DEFENSE', label: '表侧守备表示' },
          { value: 'POS_FACEDOWN_DEFENSE', label: '里侧守备表示' }
        ],
        required: true
      },
      {
        name: 'target_controller',
        type: 'select',
        label: '目标控制者',
        options: [
          { value: '0,LOCATION_MZONE', label: '对手' },
          { value: 'LOCATION_MZONE,0', label: '自己' },
          { value: 'LOCATION_MZONE,LOCATION_MZONE', label: '双方' }
        ],
        required: true
      },
      {
        name: 'count',
        type: 'number',
        label: '变更数量',
        defaultValue: 1,
        min: 1,
        max: 5,
        required: true
      },
      {
        name: 'targeted',
        type: 'boolean',
        label: '选择对象',
        defaultValue: true,
        required: false
      }
    ],
    luaTemplate: `
--表示形式变更
function s.posfilter(c)
  return c:IsFaceup() and c:IsCanChangePosition()
end
{{#if targeted}}
function s.postg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and s.posfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.posfilter,tp,{{target_controller}},1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_POSCHANGE)
  local g=Duel.SelectTarget(tp,s.posfilter,tp,{{target_controller}},1,{{count}},nil)
  Duel.SetOperationInfo(0,CATEGORY_POSITION,g,#g,0,0)
end
function s.posop(e,tp,eg,ep,ev,re,r,rp)
  local g=Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS):Filter(Card.IsRelateToEffect,nil,e)
  if #g>0 then
    Duel.ChangePosition(g,{{target_position}})
  end
end
{{else}}
function s.postg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(s.posfilter,tp,{{target_controller}},1,nil) end
  local g=Duel.GetMatchingGroup(s.posfilter,tp,{{target_controller}},nil)
  Duel.SetOperationInfo(0,CATEGORY_POSITION,g,{{count}},0,0)
end
function s.posop(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_POSCHANGE)
  local g=Duel.SelectMatchingCard(tp,s.posfilter,tp,{{target_controller}},1,{{count}},nil)
  if #g>0 then
    Duel.ChangePosition(g,{{target_position}})
  end
end
{{/if}}`,
    compatibility: [],
    examples: ['月之书', '敌人操纵器'],
    tags: ['表示', '翻转', '守备']
  },

  // ===== 返回卡组 (P0新增) =====
  {
    id: 'to_deck',
    name: '返回卡组',
    nameEn: 'Return to Deck',
    category: EffectCategory.EFFECT,
    description: '将卡片返回卡组（顶部/底部/洗入）',
    parameters: [
      {
        name: 'target_location',
        type: 'select',
        label: '目标位置',
        options: [
          { value: 'LOCATION_HAND', label: '手卡' },
          { value: 'LOCATION_GRAVE', label: '墓地' },
          { value: 'LOCATION_REMOVED', label: '除外区' },
          { value: 'LOCATION_MZONE', label: '怪兽区域' },
          { value: 'LOCATION_ONFIELD', label: '场上' }
        ],
        required: true
      },
      {
        name: 'target_controller',
        type: 'select',
        label: '目标控制者',
        options: [
          { value: 'tp', label: '自己' },
          { value: '1-tp', label: '对手' },
          { value: 'both', label: '双方' }
        ],
        required: true
      },
      {
        name: 'deck_position',
        type: 'select',
        label: '卡组位置',
        options: [
          { value: 'top', label: '卡组顶部' },
          { value: 'bottom', label: '卡组底部' },
          { value: 'shuffle', label: '洗入卡组' }
        ],
        required: true,
        defaultValue: 'shuffle'
      },
      {
        name: 'count',
        type: 'number',
        label: '返回数量',
        defaultValue: 1,
        min: 1,
        max: 5,
        required: true
      },
      {
        name: 'targeted',
        type: 'boolean',
        label: '选择对象',
        defaultValue: true,
        required: false
      }
    ],
    luaTemplate: `
--返回卡组
function s.tdfilter(c)
  return c:IsAbleToDeck()
end
function s.tdtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  {{#if targeted}}
  local location={{target_location}}
  {{#if target_controller.tp}}
  if chkc then return chkc:IsLocation(location) and chkc:IsControler(tp) and s.tdfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.tdfilter,tp,location,0,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
  local g=Duel.SelectTarget(tp,s.tdfilter,tp,location,0,1,{{count}},nil)
  {{else}}
  if chkc then return chkc:IsLocation(location) and chkc:IsControler(1-tp) and s.tdfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.tdfilter,tp,0,location,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
  local g=Duel.SelectTarget(tp,s.tdfilter,tp,0,location,1,{{count}},nil)
  {{/if}}
  Duel.SetOperationInfo(0,CATEGORY_TODECK,g,#g,0,0)
  {{else}}
  if chk==0 then return Duel.IsExistingMatchingCard(s.tdfilter,tp,{{target_location}},0,1,nil) end
  Duel.SetOperationInfo(0,CATEGORY_TODECK,nil,{{count}},tp,{{target_location}})
  {{/if}}
end
function s.tdop(e,tp,eg,ep,ev,re,r,rp)
  {{#if targeted}}
  local g=Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS):Filter(Card.IsRelateToEffect,nil,e)
  {{else}}
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
  local g=Duel.SelectMatchingCard(tp,s.tdfilter,tp,{{target_location}},0,1,{{count}},nil)
  {{/if}}
  if #g>0 then
    {{#if deck_position.shuffle}}
    Duel.SendtoDeck(g,nil,SEQ_DECKSHUFFLE,REASON_EFFECT)
    {{/if}}
    {{#if deck_position.top}}
    Duel.SendtoDeck(g,nil,SEQ_DECKTOP,REASON_EFFECT)
    {{/if}}
    {{#if deck_position.bottom}}
    Duel.SendtoDeck(g,nil,SEQ_DECKBOTTOM,REASON_EFFECT)
    {{/if}}
  end
end`,
    compatibility: [],
    examples: ['强欲而谦虚之壶', '凤凰神的羽毛'],
    tags: ['返回', '卡组', '洗牌']
  },

  // ===== 衍生物生成 (P0完善) =====
  {
    id: 'token_summon',
    name: '衍生物生成',
    nameEn: 'Token Generation',
    category: EffectCategory.SUMMON,
    description: '特殊召唤衍生物到场上',
    parameters: [
      {
        name: 'token_atk',
        type: 'number',
        label: '衍生物攻击力',
        defaultValue: 0,
        min: 0,
        max: 5000,
        required: true
      },
      {
        name: 'token_def',
        type: 'number',
        label: '衍生物守备力',
        defaultValue: 0,
        min: 0,
        max: 5000,
        required: true
      },
      {
        name: 'token_level',
        type: 'number',
        label: '衍生物等级',
        defaultValue: 1,
        min: 1,
        max: 12,
        required: true
      },
      {
        name: 'token_race',
        type: 'select',
        label: '衍生物种族',
        options: [
          { value: 'WARRIOR', label: '战士族' },
          { value: 'SPELLCASTER', label: '魔法师族' },
          { value: 'DRAGON', label: '龙族' },
          { value: 'FIEND', label: '恶魔族' },
          { value: 'MACHINE', label: '机械族' },
          { value: 'FAIRY', label: '天使族' },
          { value: 'BEAST', label: '兽族' },
          { value: 'PLANT', label: '植物族' }
        ],
        required: true
      },
      {
        name: 'token_attribute',
        type: 'select',
        label: '衍生物属性',
        options: [
          { value: 'LIGHT', label: '光' },
          { value: 'DARK', label: '暗' },
          { value: 'EARTH', label: '地' },
          { value: 'WATER', label: '水' },
          { value: 'FIRE', label: '炎' },
          { value: 'WIND', label: '风' },
          { value: 'DIVINE', label: '神' }
        ],
        required: true
      },
      {
        name: 'token_count',
        type: 'number',
        label: '生成数量',
        defaultValue: 1,
        min: 1,
        max: 5,
        required: true
      },
      {
        name: 'token_position',
        type: 'select',
        label: '表示形式',
        options: [
          { value: 'POS_FACEUP_ATTACK', label: '表侧攻击表示' },
          { value: 'POS_FACEUP_DEFENSE', label: '表侧守备表示' },
          { value: 'POS_FACEDOWN_DEFENSE', label: '里侧守备表示' }
        ],
        required: true,
        defaultValue: 'POS_FACEUP_ATTACK'
      },
      {
        name: 'cannot_attack',
        type: 'boolean',
        label: '不能攻击',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--衍生物生成
function s.tktg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>=1
    and Duel.IsPlayerCanSpecialSummonMonster(tp,id+1,0,TYPES_TOKEN,{{token_atk}},{{token_def}},{{token_level}},RACE_{{token_race}},ATTRIBUTE_{{token_attribute}}) end
  Duel.SetOperationInfo(0,CATEGORY_TOKEN,nil,{{token_count}},0,0)
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,{{token_count}},tp,0)
end
function s.tkop(e,tp,eg,ep,ev,re,r,rp)
  local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
  if ft<=0 then return end
  if ft>{{token_count}} then ft={{token_count}} end
  if Duel.IsPlayerAffectedByEffect(tp,CARD_BLUEEYES_SPIRIT) then ft=1 end
  local c=e:GetHandler()
  for i=1,ft do
    local token=Duel.CreateToken(tp,id+1)
    if Duel.SpecialSummonStep(token,0,tp,tp,false,false,{{token_position}}) then
      {{#if cannot_attack}}
      local e1=Effect.CreateEffect(c)
      e1:SetType(EFFECT_TYPE_SINGLE)
      e1:SetCode(EFFECT_CANNOT_ATTACK)
      e1:SetReset(RESET_EVENT+RESETS_STANDARD)
      token:RegisterEffect(e1)
      {{/if}}
    end
  end
  Duel.SpecialSummonComplete()
end`,
    compatibility: [],
    examples: ['替罪羊', '星遗物的守护龙'],
    tags: ['衍生物', '特召', '生成']
  },

  // ===== 超量素材附加 (P0新增) =====
  {
    id: 'attach_xyz_material',
    name: '超量素材附加',
    nameEn: 'Attach Xyz Material',
    category: EffectCategory.EFFECT,
    description: '将卡片作为超量素材附加到超量怪兽',
    parameters: [
      {
        name: 'source_zone',
        type: 'select',
        label: '素材来源',
        options: [
          { value: 'LOCATION_HAND', label: '手卡' },
          { value: 'LOCATION_GRAVE', label: '墓地' },
          { value: 'LOCATION_REMOVED', label: '除外区' },
          { value: 'LOCATION_DECK', label: '卡组' },
          { value: 'LOCATION_MZONE', label: '场上' }
        ],
        required: true
      },
      {
        name: 'material_count',
        type: 'number',
        label: '附加数量',
        defaultValue: 1,
        min: 1,
        max: 3,
        required: true
      },
      {
        name: 'target_xyz',
        type: 'select',
        label: '目标超量怪兽',
        options: [
          { value: 'self', label: '此卡自身' },
          { value: 'field_xyz', label: '场上超量怪兽' }
        ],
        required: true
      },
      {
        name: 'material_filter',
        type: 'select',
        label: '素材限制',
        options: [
          { value: 'any', label: '任意卡片' },
          { value: 'monster', label: '怪兽卡' },
          { value: 'same_type', label: '同种族怪兽' }
        ],
        required: false
      }
    ],
    luaTemplate: `
--超量素材附加
{{#if target_xyz.self}}
function s.xyzmatfilter(c)
  {{#if material_filter.monster}}
  return c:IsType(TYPE_MONSTER)
  {{else}}
  return true
  {{/if}}
end
function s.xyzmattg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  local c=e:GetHandler()
  if chkc then return chkc:IsLocation({{source_zone}}) and chkc:IsControler(tp) and s.xyzmatfilter(chkc) end
  if chk==0 then return c:IsType(TYPE_XYZ) 
    and Duel.IsExistingTarget(s.xyzmatfilter,tp,{{source_zone}},0,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_XMATERIAL)
  local g=Duel.SelectTarget(tp,s.xyzmatfilter,tp,{{source_zone}},0,1,{{material_count}},nil)
end
function s.xyzmatop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  local g=Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS):Filter(Card.IsRelateToEffect,nil,e)
  if c:IsRelateToEffect(e) and c:IsFaceup() and #g>0 then
    Duel.Overlay(c,g)
  end
end
{{/if}}
{{#if target_xyz.field_xyz}}
function s.xyzfilter(c)
  return c:IsFaceup() and c:IsType(TYPE_XYZ)
end
function s.xyzmatfilter(c)
  {{#if material_filter.monster}}
  return c:IsType(TYPE_MONSTER)
  {{else}}
  return true
  {{/if}}
end
function s.xyzmattg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return false end
  if chk==0 then return Duel.IsExistingTarget(s.xyzfilter,tp,LOCATION_MZONE,0,1,nil)
    and Duel.IsExistingTarget(s.xyzmatfilter,tp,{{source_zone}},0,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
  local g1=Duel.SelectTarget(tp,s.xyzfilter,tp,LOCATION_MZONE,0,1,1,nil)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_XMATERIAL)
  local g2=Duel.SelectTarget(tp,s.xyzmatfilter,tp,{{source_zone}},0,1,{{material_count}},nil)
end
function s.xyzmatop(e,tp,eg,ep,ev,re,r,rp)
  local g=Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS)
  local tc=g:Filter(s.xyzfilter,nil):GetFirst()
  local mg=g-tc
  if tc and tc:IsRelateToEffect(e) and tc:IsFaceup() and #mg>0 then
    mg=mg:Filter(Card.IsRelateToEffect,nil,e)
    Duel.Overlay(tc,mg)
  end
end
{{/if}}`,
    compatibility: [],
    examples: ['No.101 寂静荣誉方舟骑士', '超量单位'],
    tags: ['超量', '素材', '附加']
  },

  // ===== Phase 5: P1 效果模块 =====
  {
    id: 'excavate',
    name: '挖掘机制',
    nameEn: 'Excavate',
    category: EffectCategory.EFFECT,
    description: '翻开卡组顶部指定数量的卡片，根据条件进行后续操作',
    parameters: [
      {
        name: 'count',
        type: 'number',
        label: '挖掘数量',
        description: '翻开卡组顶部的卡片数量',
        defaultValue: 3,
        min: 1,
        max: 10,
        required: true
      },
      {
        name: 'filter_type',
        type: 'select',
        label: '筛选类型',
        description: '挖掘后筛选的卡片类型',
        options: [
          { value: 'monster', label: '怪兽卡' },
          { value: 'spell', label: '魔法卡' },
          { value: 'trap', label: '陷阱卡' },
          { value: 'any', label: '任意卡片' },
          { value: 'archetype', label: '特定字段' }
        ],
        defaultValue: 'monster',
        required: true
      },
      {
        name: 'action',
        type: 'select',
        label: '后续操作',
        description: '对筛选出的卡片进行的操作',
        options: [
          { value: 'add_to_hand', label: '加入手牌' },
          { value: 'special_summon', label: '特殊召唤' },
          { value: 'send_to_grave', label: '送去墓地' }
        ],
        defaultValue: 'add_to_hand',
        required: true
      }
    ],
    luaTemplate: `
--挖掘机制效果
function s.exctg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)>=3 end
end
function s.excop(e,tp,eg,ep,ev,re,r,rp)
  Duel.ConfirmDecktop(tp,3)
  local g=Duel.GetDecktopGroup(tp,3)
  local sg=g:Filter(Card.IsType,nil,TYPE_MONSTER)
  if #sg>0 then
    Duel.SendtoHand(sg,nil,REASON_EFFECT)
    Duel.ConfirmCards(1-tp,sg)
  end
  Duel.ShuffleDeck(tp)
end`,
    compatibility: [],
    examples: ['强欲而谦虚之壶', '命运抽卡'],
    tags: ['挖掘', '翻开', '卡组']
  },

  {
    id: 'counter_system',
    name: '指示物系统',
    nameEn: 'Counter System',
    category: EffectCategory.EFFECT,
    description: '放置、移除或使用指示物进行效果',
    parameters: [
      {
        name: 'counter_type',
        type: 'select',
        label: '指示物类型',
        options: [
          { value: 'spell', label: '魔力指示物' },
          { value: 'predator', label: '捕食指示物' },
          { value: 'custom', label: '自定义指示物' }
        ],
        defaultValue: 'spell',
        required: true
      },
      {
        name: 'action',
        type: 'select',
        label: '指示物操作',
        options: [
          { value: 'add', label: '放置指示物' },
          { value: 'remove', label: '移除指示物' }
        ],
        defaultValue: 'add',
        required: true
      },
      {
        name: 'count',
        type: 'number',
        label: '数量',
        defaultValue: 1,
        min: 1,
        max: 10,
        required: true
      }
    ],
    luaTemplate: `
--指示物系统效果
function s.ctop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  if c:IsRelateToEffect(e) and c:IsFaceup() then
    c:AddCounter(0x1,1)
  end
end`,
    compatibility: [],
    examples: ['魔法都市 恩底弥翁', '捕食植物'],
    tags: ['指示物', 'counter']
  },

  {
    id: 'equipment',
    name: '装备系统',
    nameEn: 'Equipment System',
    category: EffectCategory.EFFECT,
    description: '装备魔法卡或怪兽装备效果',
    parameters: [
      {
        name: 'target_filter',
        type: 'select',
        label: '装备目标限制',
        options: [
          { value: 'any', label: '任意怪兽' },
          { value: 'own_only', label: '仅自己怪兽' }
        ],
        defaultValue: 'any',
        required: true
      },
      {
        name: 'effect_type',
        type: 'select',
        label: '装备效果类型',
        options: [
          { value: 'atk_boost', label: '攻击力上升' },
          { value: 'atk_def_boost', label: '攻守上升' }
        ],
        defaultValue: 'atk_boost',
        required: true
      },
      {
        name: 'atk_value',
        type: 'number',
        label: '攻击力上升值',
        defaultValue: 500,
        min: 0,
        max: 5000,
        required: true
      }
    ],
    luaTemplate: `
--装备系统效果
function s.eqtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsFaceup() end
  if chk==0 then return Duel.IsExistingTarget(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil) end
  Duel.SelectTarget(tp,Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
end
function s.eqop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  local tc=Duel.GetFirstTarget()
  if c:IsRelateToEffect(e) and tc and tc:IsFaceup() then
    Duel.Equip(tp,c,tc)
  end
end`,
    compatibility: [],
    examples: ['团结之力', '同盟机械'],
    tags: ['装备', 'equip']
  },

  // ===== Phase 8: Cost 代价机制 =====
  {
    id: 'discard_cost',
    name: '丢弃手卡代价',
    nameEn: 'Discard Cost',
    category: EffectCategory.EFFECT,
    description: '发动效果时，需要丢弃指定数量的手卡作为代价',
    parameters: [
      {
        name: 'count',
        type: 'number',
        label: '丢弃数量',
        description: '需要丢弃的手卡数量',
        defaultValue: 1,
        required: true
      },
      {
        name: 'specific',
        type: 'boolean',
        label: '指定卡片类型',
        description: '是否限定丢弃的卡片类型',
        defaultValue: false,
        required: false
      },
      {
        name: 'card_type',
        type: 'select',
        label: '卡片类型',
        description: '限定丢弃的卡片类型',
        options: [
          { value: 'monster', label: '怪兽卡' },
          { value: 'spell', label: '魔法卡' },
          { value: 'trap', label: '陷阱卡' }
        ],
        required: false
      }
    ],
    luaTemplate: `
--丢弃手卡代价
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
  {{#if specific}}
  if chk==0 then return Duel.IsExistingMatchingCard(s.cfilter,tp,LOCATION_HAND,0,{{count}},nil) end
  Duel.DiscardHand(tp,s.cfilter,{{count}},{{count}},REASON_COST+REASON_DISCARD)
  {{else}}
  if chk==0 then return Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)>={{count}} end
  Duel.DiscardHand(tp,aux.TRUE,{{count}},{{count}},REASON_COST+REASON_DISCARD)
  {{/if}}
end
{{#if specific}}
function s.cfilter(c)
  {{#if card_type.monster}}
  return c:IsType(TYPE_MONSTER)
  {{/if}}
  {{#if card_type.spell}}
  return c:IsType(TYPE_SPELL)
  {{/if}}
  {{#if card_type.trap}}
  return c:IsType(TYPE_TRAP)
  {{/if}}
end
{{/if}}`,
    compatibility: [],
    examples: ['凤凰神的羽毛', '真红眼融合'],
    tags: ['cost', '代价', '手卡']
  },

  {
    id: 'pay_lp_cost',
    name: '支付生命值代价',
    nameEn: 'Pay LP Cost',
    category: EffectCategory.EFFECT,
    description: '发动效果时，需要支付指定数量的生命值作为代价',
    parameters: [
      {
        name: 'amount',
        type: 'number',
        label: '支付数值',
        description: '需要支付的生命值数量',
        defaultValue: 500,
        required: true
      },
      {
        name: 'percentage',
        type: 'boolean',
        label: '百分比支付',
        description: '是否按生命值百分比支付',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--支付生命值代价
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
  {{#if percentage}}
  local lp=Duel.GetLP(tp)
  local cost=math.floor(lp*{{amount}}/100)
  if chk==0 then return Duel.CheckLPCost(tp,cost) end
  Duel.PayLPCost(tp,cost)
  {{else}}
  if chk==0 then return Duel.CheckLPCost(tp,{{amount}}) end
  Duel.PayLPCost(tp,{{amount}})
  {{/if}}
end`,
    compatibility: [],
    examples: ['双重召唤', '强欲之壶'],
    tags: ['cost', '代价', 'LP']
  },

  {
    id: 'tribute_cost',
    name: '解放怪兽代价',
    nameEn: 'Tribute Cost',
    category: EffectCategory.EFFECT,
    description: '发动效果时，需要解放场上的怪兽作为代价',
    parameters: [
      {
        name: 'count',
        type: 'number',
        label: '解放数量',
        description: '需要解放的怪兽数量',
        defaultValue: 1,
        required: true
      },
      {
        name: 'self_only',
        type: 'boolean',
        label: '仅限自己',
        description: '是否只能解放自己场上的怪兽',
        defaultValue: true,
        required: false
      },
      {
        name: 'specific_type',
        type: 'boolean',
        label: '指定种族',
        description: '是否限定解放的怪兽种族',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--解放怪兽代价
{{#if specific_type}}
function s.cfilter(c)
  return c:IsRace(RACE_DRAGON) and c:IsReleasable()
end
{{/if}}
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
  {{#if self_only}}
  local loc=LOCATION_MZONE
  {{else}}
  local loc=LOCATION_MZONE
  {{/if}}
  {{#if specific_type}}
  if chk==0 then return Duel.IsExistingMatchingCard(s.cfilter,tp,loc,0,{{count}},nil) end
  local g=Duel.SelectMatchingCard(tp,s.cfilter,tp,loc,0,{{count}},{{count}},nil)
  {{else}}
  if chk==0 then return Duel.CheckReleaseGroupCost(tp,aux.TRUE,{{count}},false,nil,nil) end
  local g=Duel.SelectReleaseGroupCost(tp,aux.TRUE,{{count}},{{count}},false,nil,nil)
  {{/if}}
  Duel.Release(g,REASON_COST)
end`,
    compatibility: [],
    examples: ['死者苏生', '真红眼黑龙'],
    tags: ['cost', '代价', '解放']
  },

  // ===== Phase 8: Fusion 召唤程序 =====
  {
    id: 'fusion_summon',
    name: '融合召唤',
    nameEn: 'Fusion Summon',
    category: EffectCategory.SUMMON,
    description: '从额外卡组融合召唤指定的融合怪兽',
    parameters: [
      {
        name: 'material_location',
        type: 'select',
        label: '素材位置',
        description: '融合素材的来源位置',
        options: [
          { value: 'hand_field', label: '手卡+场上' },
          { value: 'grave', label: '墓地' },
          { value: 'banished', label: '除外区' },
          { value: 'deck', label: '卡组' }
        ],
        required: true
      },
      {
        name: 'opponent_material',
        type: 'boolean',
        label: '使用对手怪兽',
        description: '是否可以使用对手的怪兽作为素材',
        defaultValue: false,
        required: false
      },
      {
        name: 'specific_fusion',
        type: 'boolean',
        label: '指定融合怪兽',
        description: '是否限定融合召唤特定的怪兽',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--融合召唤
function s.filter(c,e,tp)
  return c:IsType(TYPE_FUSION) and c:IsCanBeSpecialSummoned(e,SUMMON_TYPE_FUSION,tp,false,false)
    {{#if specific_fusion}}
    and c:IsSetCard(0x...)  -- 特定系列
    {{/if}}
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then
    {{#if material_location.hand_field}}
    local loc=LOCATION_HAND+LOCATION_MZONE
    {{/if}}
    {{#if material_location.grave}}
    local loc=LOCATION_GRAVE
    {{/if}}
    {{#if material_location.banished}}
    local loc=LOCATION_REMOVED
    {{/if}}
    {{#if opponent_material}}
    return Duel.IsExistingMatchingCard(s.filter,tp,LOCATION_EXTRA,0,1,nil,e,tp)
      and Duel.IsExistingMatchingCard(aux.TRUE,tp,loc,loc,2,nil)
    {{else}}
    return Duel.IsExistingMatchingCard(s.filter,tp,LOCATION_EXTRA,0,1,nil,e,tp)
      and Duel.IsExistingMatchingCard(aux.TRUE,tp,loc,0,2,nil)
    {{/if}}
  end
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA)
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  {{#if material_location.hand_field}}
  local loc=LOCATION_HAND+LOCATION_MZONE
  {{/if}}
  {{#if material_location.grave}}
  local loc=LOCATION_GRAVE
  {{/if}}
  {{#if opponent_material}}
  local mg=Duel.GetMatchingGroup(aux.TRUE,tp,loc,loc,nil)
  {{else}}
  local mg=Duel.GetMatchingGroup(aux.TRUE,tp,loc,0,nil)
  {{/if}}
  local sg=Duel.GetMatchingGroup(s.filter,tp,LOCATION_EXTRA,0,nil,e,tp)
  if #sg>0 then
    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
    local tc=sg:Select(tp,1,1,nil):GetFirst()
    if tc then
      local mat=mg:Select(tp,2,99,nil)
      tc:SetMaterial(mat)
      Duel.SendtoGrave(mat,REASON_EFFECT+REASON_MATERIAL+REASON_FUSION)
      Duel.SpecialSummon(tc,SUMMON_TYPE_FUSION,tp,tp,false,false,POS_FACEUP)
      tc:CompleteProcedure()
    end
  end
end`,
    compatibility: [],
    examples: ['融合', '未来融合', '捕食植物'],
    tags: ['融合', 'fusion', '额外卡组']
  },

  {
    id: 'contact_fusion',
    name: '接触融合',
    nameEn: 'Contact Fusion',
    category: EffectCategory.SUMMON,
    description: '不使用融合魔法卡，将素材返回卡组进行融合召唤',
    parameters: [
      {
        name: 'return_to_deck',
        type: 'boolean',
        label: '返回卡组',
        description: '素材是否返回卡组而非送去墓地',
        defaultValue: true,
        required: false
      },
      {
        name: 'shuffle',
        type: 'boolean',
        label: '洗牌',
        description: '返回卡组后是否洗牌',
        defaultValue: true,
        required: false
      }
    ],
    luaTemplate: `
--接触融合
function s.filter(c,e,tp)
  return c:IsType(TYPE_FUSION) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then
    return Duel.IsExistingMatchingCard(s.filter,tp,LOCATION_EXTRA,0,1,nil,e,tp)
      and Duel.IsExistingMatchingCard(aux.TRUE,tp,LOCATION_MZONE,0,2,nil)
  end
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA)
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  local mg=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_MZONE,0,nil)
  local sg=Duel.GetMatchingGroup(s.filter,tp,LOCATION_EXTRA,0,nil,e,tp)
  if #sg>0 then
    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
    local tc=sg:Select(tp,1,1,nil):GetFirst()
    if tc then
      Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
      local mat=mg:Select(tp,2,99,nil)
      tc:SetMaterial(mat)
      {{#if return_to_deck}}
      Duel.SendtoDeck(mat,nil,SEQ_DECKSHUFFLE,REASON_EFFECT+REASON_MATERIAL+REASON_FUSION)
      {{#if shuffle}}
      Duel.ShuffleDeck(tp)
      {{/if}}
      {{else}}
      Duel.SendtoGrave(mat,REASON_EFFECT+REASON_MATERIAL+REASON_FUSION)
      {{/if}}
      Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)
    end
  end
end`,
    compatibility: [],
    examples: ['新宇侠', '剑斗兽'],
    tags: ['融合', '接触', '返回卡组']
  },

  {
    id: 'synchro_summon',
    name: '同调召唤',
    nameEn: 'Synchro Summon',
    category: EffectCategory.SUMMON,
    description: '从额外卡组同调召唤指定等级的同调怪兽',
    parameters: [
      {
        name: 'tuner_count',
        type: 'number',
        label: '调整者数量',
        description: '需要的调整者怪兽数量',
        defaultValue: 1,
        required: true
      },
      {
        name: 'non_tuner_min',
        type: 'number',
        label: '非调整者最小数',
        description: '非调整者怪兽的最小数量',
        defaultValue: 1,
        required: true
      },
      {
        name: 'material_grave',
        type: 'boolean',
        label: '墓地素材',
        description: '是否可以使用墓地的怪兽作为素材',
        defaultValue: false,
        required: false
      },
      {
        name: 'specific_type',
        type: 'boolean',
        label: '指定种族',
        description: '是否限定同调召唤特定种族的怪兽',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--同调召唤
function s.synfilter(c,e,tp)
  return c:IsType(TYPE_SYNCHRO) and c:IsCanBeSpecialSummoned(e,SUMMON_TYPE_SYNCHRO,tp,false,false)
    {{#if specific_type}}
    and c:IsRace(RACE_DRAGON)  -- 特定种族
    {{/if}}
end
function s.matfilter(c)
  return c:IsFaceup() and c:IsAbleToGraveAsCost()
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then
    {{#if material_grave}}
    local loc=LOCATION_MZONE+LOCATION_GRAVE
    {{else}}
    local loc=LOCATION_MZONE
    {{/if}}
    local tg=Duel.GetMatchingGroup(s.matfilter,tp,loc,0,nil)
    return Duel.IsExistingMatchingCard(s.synfilter,tp,LOCATION_EXTRA,0,1,nil,e,tp)
      and #tg>={{tuner_count}}+{{non_tuner_min}}
  end
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA)
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  {{#if material_grave}}
  local loc=LOCATION_MZONE+LOCATION_GRAVE
  {{else}}
  local loc=LOCATION_MZONE
  {{/if}}
  local sg=Duel.GetMatchingGroup(s.synfilter,tp,LOCATION_EXTRA,0,nil,e,tp)
  if #sg>0 then
    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
    local sc=sg:Select(tp,1,1,nil):GetFirst()
    if sc then
      local lv=sc:GetLevel()
      Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
      local mg=Duel.GetMatchingGroup(s.matfilter,tp,loc,0,nil)
      local mat=Group.CreateGroup()
      -- 选择调整者
      local tuner=mg:FilterSelect(tp,Card.IsType,{{tuner_count}},{{tuner_count}},nil,TYPE_TUNER)
      mat:Merge(tuner)
      local tlv=tuner:GetSum(Card.GetLevel)
      -- 选择非调整者
      mg:Sub(tuner)
      local non_tuner=mg:Select(tp,{{non_tuner_min}},99,nil)
      mat:Merge(non_tuner)
      local sumlv=mat:GetSum(Card.GetLevel)
      if sumlv==lv then
        sc:SetMaterial(mat)
        Duel.SendtoGrave(mat,REASON_EFFECT+REASON_MATERIAL+REASON_SYNCHRO)
        Duel.SpecialSummon(sc,SUMMON_TYPE_SYNCHRO,tp,tp,false,false,POS_FACEUP)
        sc:CompleteProcedure()
      end
    end
  end
end`,
    compatibility: [],
    examples: ['星尘龙', '流星龙', '一击瞬杀虫'],
    tags: ['同调', 'synchro', '额外卡组', '调整者']
  },

  {
    id: 'xyz_summon',
    name: '超量召唤',
    nameEn: 'Xyz Summon',
    category: EffectCategory.SUMMON,
    description: '从额外卡组超量召唤指定阶级的超量怪兽',
    parameters: [
      {
        name: 'rank',
        type: 'number',
        label: '阶级',
        description: '超量怪兽的阶级',
        defaultValue: 4,
        required: true
      },
      {
        name: 'material_count',
        type: 'number',
        label: '素材数量',
        description: '需要的超量素材数量',
        defaultValue: 2,
        required: true
      },
      {
        name: 'level_match',
        type: 'boolean',
        label: '等级匹配',
        description: '素材等级是否必须与阶级相同',
        defaultValue: true,
        required: false
      },
      {
        name: 'xyz_overlay',
        type: 'boolean',
        label: '叠放超量怪兽',
        description: '是否可以叠放超量怪兽作为素材',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--超量召唤
function s.xyzfilter(c,e,tp)
  return c:IsType(TYPE_XYZ) and c:IsRank({{rank}})
    and c:IsCanBeSpecialSummoned(e,SUMMON_TYPE_XYZ,tp,false,false)
end
function s.matfilter(c)
  {{#if xyz_overlay}}
  return c:IsFaceup() and (c:IsLevel({{rank}}) or c:IsType(TYPE_XYZ))
  {{else}}
  {{#if level_match}}
  return c:IsFaceup() and c:IsLevel({{rank}})
  {{else}}
  return c:IsFaceup()
  {{/if}}
  {{/if}}
end
function s.target(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then
    local mg=Duel.GetMatchingGroup(s.matfilter,tp,LOCATION_MZONE,0,nil)
    return Duel.IsExistingMatchingCard(s.xyzfilter,tp,LOCATION_EXTRA,0,1,nil,e,tp)
      and #mg>={{material_count}}
  end
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA)
end
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  local sg=Duel.GetMatchingGroup(s.xyzfilter,tp,LOCATION_EXTRA,0,nil,e,tp)
  if #sg>0 then
    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
    local xc=sg:Select(tp,1,1,nil):GetFirst()
    if xc then
      Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_XMATERIAL)
      local mg=Duel.GetMatchingGroup(s.matfilter,tp,LOCATION_MZONE,0,nil)
      local mat=mg:Select(tp,{{material_count}},{{material_count}},nil)
      xc:SetMaterial(mat)
      Duel.Overlay(xc,mat)
      Duel.SpecialSummon(xc,SUMMON_TYPE_XYZ,tp,tp,false,false,POS_FACEUP)
      xc:CompleteProcedure()
    end
  end
end`,
    compatibility: [],
    examples: ['No.39 希望皇 霍普', 'CNo.39 希望皇 霍普雷', '超量单位'],
    tags: ['超量', 'xyz', '额外卡组', '阶级']
  },

  // ===== Phase 8: Chain 连锁处理 =====
  {
    id: 'chain_link_check',
    name: '连锁位置判定',
    nameEn: 'Chain Link Check',
    category: EffectCategory.EFFECT,
    description: '检测当前连锁的位置，仅在特定连锁位置才能发动',
    parameters: [
      {
        name: 'min_chain',
        type: 'number',
        label: '最小连锁数',
        description: '至少需要在连锁几以上才能发动',
        defaultValue: 2,
        required: true
      },
      {
        name: 'exact_chain',
        type: 'boolean',
        label: '精确连锁位置',
        description: '是否必须是特定连锁位置',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--连锁位置判定
function s.condition(e,tp,eg,ep,ev,re,r,rp)
  {{#if exact_chain}}
  return Duel.GetCurrentChain()=={{min_chain}}
  {{else}}
  return Duel.GetCurrentChain()>={{min_chain}}
  {{/if}}
end`,
    compatibility: [],
    examples: ['幻变骚灵协议', '王宫的弹压'],
    tags: ['连锁', 'chain', '时点']
  },

  {
    id: 'timing_miss_check',
    name: '时点检测',
    nameEn: 'Timing Miss Check',
    category: EffectCategory.EFFECT,
    description: '检测效果发动的时点，实现"当...时"与"如果...那么"的区别',
    parameters: [
      {
        name: 'timing_type',
        type: 'select',
        label: '时点类型',
        description: '效果的时点判定类型',
        options: [
          { value: 'when', label: '当...时（可能错过时点）' },
          { value: 'if', label: '如果...那么（不会错过时点）' }
        ],
        required: true
      },
      {
        name: 'trigger_event',
        type: 'select',
        label: '触发事件',
        description: '触发效果的事件类型',
        options: [
          { value: 'summon', label: '召唤成功时' },
          { value: 'destroyed', label: '被破坏时' },
          { value: 'sent_grave', label: '送去墓地时' },
          { value: 'banished', label: '被除外时' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--时点检测
{{#if timing_type.when}}
-- "当...时" - EFFECT_TYPE_TRIGGER_O (选发，可能错过时点)
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_TRIGGER_O+EFFECT_TYPE_SINGLE)
{{#if trigger_event.summon}}
e1:SetCode(EVENT_SPSUMMON_SUCCESS)
{{/if}}
{{#if trigger_event.destroyed}}
e1:SetCode(EVENT_DESTROYED)
{{/if}}
{{#if trigger_event.sent_grave}}
e1:SetCode(EVENT_TO_GRAVE)
{{/if}}
e1:SetProperty(EFFECT_FLAG_DELAY)  -- 延迟发动，容易错过时点
{{else}}
-- "如果...那么" - EFFECT_TYPE_TRIGGER_F (必发，不会错过时点)
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_TRIGGER_F+EFFECT_TYPE_SINGLE)
{{#if trigger_event.summon}}
e1:SetCode(EVENT_SPSUMMON_SUCCESS)
{{/if}}
{{#if trigger_event.destroyed}}
e1:SetCode(EVENT_DESTROYED)
{{/if}}
{{#if trigger_event.sent_grave}}
e1:SetCode(EVENT_TO_GRAVE)
{{/if}}
e1:SetProperty(0)  -- 必发效果，不会错过时点
{{/if}}
e1:SetCondition(s.condition)
e1:SetTarget(s.target)
e1:SetOperation(s.operation)
c:RegisterEffect(e1)`,
    compatibility: [],
    examples: ['星尘龙', '炎星侯-豹乐天'],
    tags: ['时点', 'timing', '错过时点']
  },

  // ===== Phase 9: 核心机制突破 =====
  
  // P区与灵摆召唤
  {
    id: 'pendulum_summon',
    name: 'P区灵摆召唤',
    nameEn: 'Pendulum Summon',
    category: EffectCategory.SUMMON,
    description: '将此卡放置到P区，并通过P刻度进行灵摆召唤',
    parameters: [
      {
        name: 'left_scale',
        type: 'number',
        label: '左P刻度',
        description: 'P区左侧的刻度值',
        min: 0,
        max: 13,
        defaultValue: 1,
        required: true
      },
      {
        name: 'right_scale',
        type: 'number',
        label: '右P刻度',
        description: 'P区右侧的刻度值',
        min: 0,
        max: 13,
        defaultValue: 1,
        required: true
      },
      {
        name: 'pendulum_effect_type',
        type: 'select',
        label: 'P区效果类型',
        description: 'P区效果的触发类型',
        options: [
          { value: 'continuous', label: '永续效果' },
          { value: 'trigger', label: '诱发效果' },
          { value: 'ignition', label: '起动效果' },
          { value: 'quick', label: '快速效果' }
        ],
        required: true
      },
      {
        name: 'scale_modification',
        type: 'boolean',
        label: '可以修改P刻度',
        description: 'P区效果是否可以修改自己或其他卡的P刻度',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--P区灵摆召唤
{{#if pendulum_effect_type.continuous}}
-- P区永续效果
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
e1:SetCode(EFFECT_UPDATE_ATTACK)
e1:SetRange(LOCATION_PZONE)
e1:SetTargetRange(LOCATION_MZONE,0)
e1:SetValue(500)
c:RegisterEffect(e1)
{{/if}}
{{#if pendulum_effect_type.trigger}}
-- P区诱发效果
local e2=Effect.CreateEffect(c)
e2:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
e2:SetType(EFFECT_TYPE_TRIGGER_O+EFFECT_TYPE_FIELD)
e2:SetCode(EVENT_PHASE+PHASE_END)
e2:SetRange(LOCATION_PZONE)
e2:SetCountLimit(1,id)
e2:SetTarget(s.thtg)
e2:SetOperation(s.thop)
c:RegisterEffect(e2)
{{/if}}
{{#if scale_modification}}
-- 修改P刻度
local e3=Effect.CreateEffect(c)
e3:SetType(EFFECT_TYPE_SINGLE)
e3:SetCode(EFFECT_CHANGE_LSCALE)
e3:SetValue({{left_scale}}+1)
c:RegisterEffect(e3)
{{/if}}`,
    compatibility: [],
    examples: ['异色眼灵摆龙', '虹彩之魔术师', '星光大道'],
    tags: ['灵摆', 'pendulum', 'P区', 'P刻度']
  },

  // 手卡/卡组诱发效果
  {
    id: 'hand_deck_trigger_effect',
    name: '手卡/卡组诱发效果',
    nameEn: 'Hand/Deck Trigger Effect',
    category: EffectCategory.EFFECT,
    description: '从手卡或卡组发动的快速效果（俗称"手坑"），可在对手回合响应特定事件',
    parameters: [
      {
        name: 'trigger_location',
        type: 'select',
        label: '发动位置',
        description: '从哪里发动此效果',
        options: [
          { value: 'hand', label: '手卡' },
          { value: 'deck', label: '卡组' },
          { value: 'hand_deck', label: '手卡或卡组' }
        ],
        required: true
      },
      {
        name: 'trigger_event',
        type: 'select',
        label: '触发事件',
        description: '什么情况下可以发动',
        options: [
          { value: 'EVENT_SUMMON', label: '对手召唤时' },
          { value: 'EVENT_SPSUMMON', label: '对手特殊召唤时' },
          { value: 'EVENT_CHAINING', label: '对手发动效果时' },
          { value: 'EVENT_SEARCH', label: '对手检索时' },
          { value: 'EVENT_DRAW', label: '对手抽卡时' },
          { value: 'EVENT_ATTACK_ANNOUNCE', label: '对手宣言攻击时' }
        ],
        required: true
      },
      {
        name: 'effect_type',
        type: 'select',
        label: '效果类型',
        description: '手卡发动后的效果',
        options: [
          { value: 'negate', label: '无效对手行动' },
          { value: 'destroy', label: '破坏对手卡片' },
          { value: 'special_summon_self', label: '特殊召唤此卡' },
          { value: 'draw', label: '抽卡' },
          { value: 'protection', label: '保护己方卡片' }
        ],
        required: true
      },
      {
        name: 'discard_cost',
        type: 'boolean',
        label: '丢弃此卡作为代价',
        description: '发动时需要丢弃此卡',
        defaultValue: true,
        required: false
      }
    ],
    luaTemplate: `
--手卡/卡组诱发效果
local e1=Effect.CreateEffect(c)
{{#if effect_type.negate}}
e1:SetCategory(CATEGORY_NEGATE+CATEGORY_DESTROY)
{{/if}}
{{#if effect_type.special_summon_self}}
e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
{{/if}}
e1:SetType(EFFECT_TYPE_QUICK_O)
e1:SetCode({{trigger_event}})
{{#if trigger_location.hand}}
e1:SetRange(LOCATION_HAND)
{{/if}}
{{#if trigger_location.deck}}
e1:SetRange(LOCATION_DECK)
{{/if}}
{{#if trigger_location.hand_deck}}
e1:SetRange(LOCATION_HAND+LOCATION_DECK)
{{/if}}
e1:SetCountLimit(1,id)
{{#if discard_cost}}
e1:SetCost(s.handcost)
{{/if}}
e1:SetTarget(s.handtg)
e1:SetOperation(s.handop)
c:RegisterEffect(e1)

{{#if discard_cost}}
function s.handcost(e,tp,eg,ep,ev,re,r,rp,chk)
  local c=e:GetHandler()
  if chk==0 then return c:IsDiscardable() or c:IsAbleToGraveAsCost() end
  Duel.SendtoGrave(c,REASON_COST+REASON_DISCARD)
end
{{/if}}

function s.handtg(e,tp,eg,ep,ev,re,r,rp,chk)
  {{#if effect_type.negate}}
  if chk==0 then return true end
  Duel.SetOperationInfo(0,CATEGORY_NEGATE,eg,1,0,0)
  {{/if}}
  {{#if effect_type.special_summon_self}}
  if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
    and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end
  Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
  {{/if}}
end

function s.handop(e,tp,eg,ep,ev,re,r,rp)
  {{#if effect_type.negate}}
  if Duel.NegateActivation(ev) and re:GetHandler():IsRelateToEffect(re) then
    Duel.Destroy(eg,REASON_EFFECT)
  end
  {{/if}}
  {{#if effect_type.special_summon_self}}
  local c=e:GetHandler()
  if c:IsRelateToEffect(e) then
    Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
  end
  {{/if}}
end`,
    compatibility: [],
    examples: ['增殖的G', '灰流丽', 'PSY骨架装备·γ', '效果遮蒙者'],
    tags: ['手坑', '手卡', '卡组', '诱发', '快速效果', '无效']
  },

  // ===== P1 中优先级效果 =====
  
  // 永续效果
  {
    id: 'continuous_effect',
    name: '永续效果',
    nameEn: 'Continuous Effect',
    category: EffectCategory.EFFECT,
    description: '无需发动即持续生效的被动效果，可以是场地持续效果或怪兽自身效果',
    parameters: [
      {
        name: 'effect_scope',
        type: 'select',
        label: '效果范围',
        options: [
          { value: 'field', label: '场地效果（影响全场）' },
          { value: 'self', label: '自身效果（仅影响此卡）' }
        ],
        required: true
      },
      {
        name: 'continuous_type',
        type: 'select',
        label: '永续效果类型',
        options: [
          { value: 'atk_boost', label: '攻击力上升' },
          { value: 'def_boost', label: '守备力上升' },
          { value: 'disable_effect', label: '无效效果' },
          { value: 'protection', label: '保护效果' },
          { value: 'limit_action', label: '限制行动' }
        ],
        required: true
      },
      {
        name: 'target_range',
        type: 'select',
        label: '作用范围',
        options: [
          { value: 'own', label: '己方' },
          { value: 'opponent', label: '对手' },
          { value: 'both', label: '双方' }
        ],
        required: true
      },
      {
        name: 'value',
        type: 'number',
        label: '数值（攻守变化）',
        defaultValue: 500,
        min: -3000,
        max: 3000,
        required: false
      }
    ],
    luaTemplate: `
--永续效果
{{#if effect_scope.field}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
{{#if continuous_type.atk_boost}}
e1:SetCode(EFFECT_UPDATE_ATTACK)
e1:SetValue({{value}})
{{/if}}
{{#if continuous_type.def_boost}}
e1:SetCode(EFFECT_UPDATE_DEFENSE)
e1:SetValue({{value}})
{{/if}}
{{#if continuous_type.disable_effect}}
e1:SetCode(EFFECT_DISABLE)
{{/if}}
e1:SetRange(LOCATION_MZONE)
{{#if target_range.own}}
e1:SetTargetRange(LOCATION_MZONE,0)
{{/if}}
{{#if target_range.opponent}}
e1:SetTargetRange(0,LOCATION_MZONE)
{{/if}}
{{#if target_range.both}}
e1:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
{{/if}}
c:RegisterEffect(e1)
{{/if}}
{{#if effect_scope.self}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
{{#if continuous_type.atk_boost}}
e1:SetCode(EFFECT_UPDATE_ATTACK)
e1:SetValue({{value}})
{{/if}}
{{#if continuous_type.protection}}
e1:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
e1:SetValue(1)
{{/if}}
c:RegisterEffect(e1)
{{/if}}`,
    compatibility: [],
    examples: ['技能抽取', '王宫的敕命', '真龙皇 V.F.D.'],
    tags: ['永续', 'continuous', '被动', '场地效果']
  },

  // 战斗破坏抗性
  {
    id: 'battle_indestructible',
    name: '战斗破坏抗性',
    nameEn: 'Battle Indestructible',
    category: EffectCategory.EFFECT,
    description: '此卡不会被战斗破坏',
    parameters: [
      {
        name: 'condition',
        type: 'select',
        label: '抗性条件',
        options: [
          { value: 'always', label: '无条件抗性' },
          { value: 'once_per_turn', label: '一回合一次' },
          { value: 'specific_monster', label: '对特定怪兽有抗性' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--战斗破坏抗性
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_INDESTRUCTABLE_BATTLE)
{{#if condition.always}}
e1:SetValue(1)
{{/if}}
{{#if condition.once_per_turn}}
e1:SetValue(1)
e1:SetCountLimit(1)
{{/if}}
c:RegisterEffect(e1)`,
    compatibility: [],
    examples: ['棉花糖', '星尘龙'],
    tags: ['抗性', '战斗', '破坏保护']
  },

  // 效果破坏抗性
  {
    id: 'effect_indestructible',
    name: '效果破坏抗性',
    nameEn: 'Effect Indestructible',
    category: EffectCategory.EFFECT,
    description: '此卡不会被效果破坏',
    parameters: [
      {
        name: 'condition',
        type: 'select',
        label: '抗性条件',
        options: [
          { value: 'always', label: '无条件抗性' },
          { value: 'once_per_turn', label: '一回合一次' },
          { value: 'card_effect', label: '卡片效果不受影响' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--效果破坏抗性
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
e1:SetRange(LOCATION_MZONE)
{{#if condition.always}}
e1:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
e1:SetValue(1)
{{/if}}
{{#if condition.card_effect}}
e1:SetCode(EFFECT_IMMUNE_EFFECT)
e1:SetValue(s.efilter)
{{/if}}
c:RegisterEffect(e1)

{{#if condition.card_effect}}
function s.efilter(e,te)
  return te:GetOwner()~=e:GetOwner()
end
{{/if}}`,
    compatibility: [],
    examples: ['真龙皇 V.F.D.', '黑羽龙'],
    tags: ['抗性', '效果', '破坏保护', '不受影响']
  },

  // 直接攻击/穿透伤害
  {
    id: 'direct_attack_pierce',
    name: '直接攻击/穿透伤害',
    nameEn: 'Direct Attack/Pierce',
    category: EffectCategory.EFFECT,
    description: '可以直接攻击玩家或穿透守备表示怪兽造成伤害',
    parameters: [
      {
        name: 'attack_type',
        type: 'select',
        label: '攻击类型',
        options: [
          { value: 'direct', label: '直接攻击' },
          { value: 'pierce', label: '穿透伤害' },
          { value: 'both', label: '两者皆有' }
        ],
        required: true
      },
      {
        name: 'condition',
        type: 'select',
        label: '发动条件',
        options: [
          { value: 'always', label: '无条件' },
          { value: 'no_other_monsters', label: '对手场上没有其他怪兽' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--直接攻击/穿透伤害
{{#if attack_type.direct}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_DIRECT_ATTACK)
c:RegisterEffect(e1)
{{/if}}
{{#if attack_type.pierce}}
local e2=Effect.CreateEffect(c)
e2:SetType(EFFECT_TYPE_SINGLE)
e2:SetCode(EFFECT_PIERCE)
c:RegisterEffect(e2)
{{/if}}
{{#if attack_type.both}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_DIRECT_ATTACK)
c:RegisterEffect(e1)
local e2=Effect.CreateEffect(c)
e2:SetType(EFFECT_TYPE_SINGLE)
e2:SetCode(EFFECT_PIERCE)
c:RegisterEffect(e2)
{{/if}}`,
    compatibility: [],
    examples: ['大革命', '地球巨人 盖亚板块', '暗黑界的龙神 格拉法'],
    tags: ['直接攻击', '穿透', '伤害']
  },

  // 连锁攻击/多次攻击
  {
    id: 'multiple_attacks',
    name: '连锁攻击/多次攻击',
    nameEn: 'Multiple Attacks',
    category: EffectCategory.EFFECT,
    description: '此卡可以进行多次攻击',
    parameters: [
      {
        name: 'attack_count',
        type: 'number',
        label: '攻击次数',
        defaultValue: 2,
        min: 2,
        max: 5,
        required: true
      },
      {
        name: 'attack_all',
        type: 'boolean',
        label: '可以攻击所有对手怪兽',
        defaultValue: false,
        required: false
      }
    ],
    luaTemplate: `
--多次攻击
{{#if attack_all}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_ATTACK_ALL)
e1:SetValue(1)
c:RegisterEffect(e1)
{{else}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_EXTRA_ATTACK)
e1:SetValue({{attack_count}}-1)
c:RegisterEffect(e1)
{{/if}}`,
    compatibility: [],
    examples: ['钢核', '真红眼暗铁龙', '混沌战士 -开辟的使者-'],
    tags: ['多次攻击', '连锁攻击', '攻击全体']
  },

  // 召唤/特召限制
  {
    id: 'summon_limit',
    name: '召唤/特召限制',
    nameEn: 'Summon Restriction',
    category: EffectCategory.EFFECT,
    description: '限制对手的召唤或特殊召唤',
    parameters: [
      {
        name: 'limit_type',
        type: 'select',
        label: '限制类型',
        options: [
          { value: 'no_special_summon', label: '不能特殊召唤' },
          { value: 'no_normal_summon', label: '不能通常召唤' },
          { value: 'cannot_attack', label: '不能攻击' }
        ],
        required: true
      },
      {
        name: 'target',
        type: 'select',
        label: '限制目标',
        options: [
          { value: 'opponent', label: '对手' },
          { value: 'both', label: '双方' },
          { value: 'self', label: '自己' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--召唤/特召限制
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
{{#if limit_type.no_special_summon}}
e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
{{/if}}
{{#if limit_type.no_normal_summon}}
e1:SetCode(EFFECT_CANNOT_SUMMON)
{{/if}}
{{#if limit_type.cannot_attack}}
e1:SetCode(EFFECT_CANNOT_ATTACK_ANNOUNCE)
{{/if}}
{{#if target.opponent}}
e1:SetTargetRange(0,1)
{{/if}}
{{#if target.both}}
e1:SetTargetRange(1,1)
{{/if}}
{{#if target.self}}
e1:SetTargetRange(1,0)
{{/if}}
e1:SetRange(LOCATION_MZONE)
Duel.RegisterEffect(e1,tp)`,
    compatibility: [],
    examples: ['王宫的弹压', '血鬼术-不死之秘法', '重力网'],
    tags: ['限制', '召唤限制', '攻击限制']
  },

  // 卡片宣言
  {
    id: 'card_declaration',
    name: '卡片类型/属性宣言',
    nameEn: 'Card Declaration',
    category: EffectCategory.EFFECT,
    description: '宣言卡片类型、属性或种族',
    parameters: [
      {
        name: 'declare_type',
        type: 'select',
        label: '宣言类型',
        options: [
          { value: 'attribute', label: '属性' },
          { value: 'race', label: '种族' },
          { value: 'type', label: '卡片类型' },
          { value: 'card_name', label: '卡名' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--卡片宣言
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  {{#if declare_type.attribute}}
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATTRIBUTE)
  local att=Duel.AnnounceAttribute(tp,1,0xff)
  -- 后续效果使用 att
  {{/if}}
  {{#if declare_type.race}}
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RACE)
  local race=Duel.AnnounceRace(tp,1,0xffffff)
  -- 后续效果使用 race
  {{/if}}
  {{#if declare_type.card_name}}
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CODE)
  local code=Duel.AnnounceCard(tp)
  -- 后续效果使用 code
  {{/if}}
end`,
    compatibility: [],
    examples: ['宣告者的神巫', '真龙皇 V.F.D.', 'DNA 改造手术'],
    tags: ['宣言', '属性', '种族', '卡名']
  },

  // 卡片公开
  {
    id: 'reveal_cards',
    name: '卡片公开',
    nameEn: 'Reveal Cards',
    category: EffectCategory.EFFECT,
    description: '公开手卡、卡组或额外卡组的卡片',
    parameters: [
      {
        name: 'reveal_location',
        type: 'select',
        label: '公开位置',
        options: [
          { value: 'hand', label: '手卡' },
          { value: 'deck', label: '卡组' },
          { value: 'extra', label: '额外卡组' }
        ],
        required: true
      },
      {
        name: 'target_player',
        type: 'select',
        label: '公开对象',
        options: [
          { value: 'self', label: '自己' },
          { value: 'opponent', label: '对手' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--卡片公开
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  {{#if target_player.opponent}}
  local p=1-tp
  {{else}}
  local p=tp
  {{/if}}
  {{#if reveal_location.hand}}
  local g=Duel.GetFieldGroup(p,LOCATION_HAND,0)
  if #g>0 then
    Duel.ConfirmCards(tp,g)
  end
  {{/if}}
  {{#if reveal_location.deck}}
  Duel.ConfirmDecktop(p,3)
  {{/if}}
  {{#if reveal_location.extra}}
  local g=Duel.GetFieldGroup(p,LOCATION_EXTRA,0)
  if #g>0 then
    Duel.ConfirmCards(tp,g)
  end
  {{/if}}
end`,
    compatibility: [],
    examples: ['心灵崩坏', '六武众的荒行', 'E·HERO 天空侠'],
    tags: ['公开', 'reveal', '手卡', '卡组']
  },

  // 卡组顶操作
  {
    id: 'deck_top_manipulation',
    name: '卡组顶操作',
    nameEn: 'Deck Top Manipulation',
    category: EffectCategory.EFFECT,
    description: '查看、调整或放置卡组顶部的卡片',
    parameters: [
      {
        name: 'operation_type',
        type: 'select',
        label: '操作类型',
        options: [
          { value: 'view', label: '查看卡组顶' },
          { value: 'sort', label: '调整顺序' },
          { value: 'place_top', label: '放置到卡组顶' }
        ],
        required: true
      },
      {
        name: 'card_count',
        type: 'number',
        label: '卡片数量',
        defaultValue: 3,
        min: 1,
        max: 5,
        required: true
      }
    ],
    luaTemplate: `
--卡组顶操作
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  {{#if operation_type.view}}
  Duel.ConfirmDecktop(tp,{{card_count}})
  {{/if}}
  {{#if operation_type.sort}}
  Duel.SortDecktop(tp,tp,{{card_count}})
  {{/if}}
  {{#if operation_type.place_top}}
  -- 将选中的卡片放回卡组顶
  Duel.SendtoDeck(tc,nil,SEQ_DECKTOP,REASON_EFFECT)
  {{/if}}
end`,
    compatibility: [],
    examples: ['突进的旋风', '接下来是你的回合', '命运抽卡'],
    tags: ['卡组顶', '调整顺序', '查看']
  },

  // 墓地堆叠（Mill）
  {
    id: 'mill_cards',
    name: '墓地堆叠（Mill）',
    nameEn: 'Mill Cards',
    category: EffectCategory.EFFECT,
    description: '从卡组顶送去墓地指定数量的卡片',
    parameters: [
      {
        name: 'mill_count',
        type: 'number',
        label: '送墓数量',
        defaultValue: 3,
        min: 1,
        max: 10,
        required: true
      },
      {
        name: 'target_player',
        type: 'select',
        label: '目标玩家',
        options: [
          { value: 'self', label: '自己' },
          { value: 'opponent', label: '对手' },
          { value: 'both', label: '双方' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--墓地堆叠（Mill）
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  {{#if target_player.self}}
  Duel.DiscardDeck(tp,{{mill_count}},REASON_EFFECT)
  {{/if}}
  {{#if target_player.opponent}}
  Duel.DiscardDeck(1-tp,{{mill_count}},REASON_EFFECT)
  {{/if}}
  {{#if target_player.both}}
  Duel.DiscardDeck(tp,{{mill_count}},REASON_EFFECT)
  Duel.DiscardDeck(1-tp,{{mill_count}},REASON_EFFECT)
  {{/if}}
end`,
    compatibility: [],
    examples: ['愚蠢的埋葬', '针虫的巢穴', '光之护封灵剑'],
    tags: ['mill', '送墓', '卡组堆叠']
  },

  // 连锁限制与发动条件
  {
    id: 'activation_condition',
    name: '连锁限制与发动条件',
    nameEn: 'Activation Condition',
    category: EffectCategory.EFFECT,
    description: '限定在特定阶段或时机才能发动',
    parameters: [
      {
        name: 'phase_limit',
        type: 'select',
        label: '阶段限制',
        options: [
          { value: 'battle', label: '战斗阶段' },
          { value: 'main', label: '主要阶段' },
          { value: 'end', label: '结束阶段' },
          { value: 'opponent_turn', label: '对手回合' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--连锁限制与发动条件
function s.condition(e,tp,eg,ep,ev,re,r,rp)
  {{#if phase_limit.battle}}
  return Duel.GetCurrentPhase()==PHASE_BATTLE
  {{/if}}
  {{#if phase_limit.main}}
  return Duel.GetCurrentPhase()==PHASE_MAIN1 or Duel.GetCurrentPhase()==PHASE_MAIN2
  {{/if}}
  {{#if phase_limit.end}}
  return Duel.GetCurrentPhase()==PHASE_END
  {{/if}}
  {{#if phase_limit.opponent_turn}}
  return Duel.GetTurnPlayer()==1-tp
  {{/if}}
end`,
    compatibility: [],
    examples: ['战斗狂', '圣防护罩 -反射镜力-', '虚空的黑暗迪克雷亚'],
    tags: ['发动条件', '阶段限制', '时机']
  },

  // ===== P2 低优先级效果（长期规划）=====
  
  // 特殊胜利条件
  {
    id: 'special_victory',
    name: '特殊胜利条件',
    nameEn: 'Special Victory Condition',
    category: EffectCategory.EFFECT,
    description: '满足特定条件时直接获得决斗胜利',
    parameters: [
      {
        name: 'victory_type',
        type: 'select',
        label: '胜利条件类型',
        options: [
          { value: 'exodia', label: 'Exodia 五体集齐' },
          { value: 'final_countdown', label: '最终倒计时（20回合后）' },
          { value: 'destiny_board', label: '死亡信息板（D-E-A-T-H）' },
          { value: 'card_count', label: '卡片数量达标' },
          { value: 'life_points', label: '基本分达到指定值' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--特殊胜利条件
{{#if victory_type.exodia}}
function s.wincon(e,tp,eg,ep,ev,re,r,rp)
  local g=Duel.GetMatchingGroup(Card.IsCode,tp,LOCATION_HAND,0,nil,33396948,08124921,44519536,70903634,07902349)
  if g:GetClassCount(Card.GetCode)==5 then
    Duel.Win(tp,0x01) -- Exodia 胜利
  end
end
{{/if}}
{{#if victory_type.final_countdown}}
function s.wincon(e,tp,eg,ep,ev,re,r,rp)
  if Duel.GetTurnCount()>=20 then
    Duel.Win(tp,0x10) -- 最终倒计时胜利
  end
end
{{/if}}
{{#if victory_type.destiny_board}}
function s.wincon(e,tp,eg,ep,ev,re,r,rp)
  local g=Duel.GetMatchingGroup(Card.IsCode,tp,LOCATION_SZONE,0,nil,94212438,67270095,30170981,42015635,94772232)
  if g:GetClassCount(Card.GetCode)==5 then
    Duel.Win(tp,0x11) -- 死亡信息板胜利
  end
end
{{/if}}`,
    compatibility: [],
    examples: ['被封印的艾克佐迪亚', '最终倒计时', '死亡信息-死灵板'],
    tags: ['特殊胜利', 'win condition', 'exodia', '最终倒计时']
  },

  // 种族特定支援
  {
    id: 'race_support',
    name: '种族特定支援',
    nameEn: 'Race-Specific Support',
    category: EffectCategory.EFFECT,
    description: '强化或支援特定种族的怪兽',
    parameters: [
      {
        name: 'target_race',
        type: 'select',
        label: '目标种族',
        options: [
          { value: 'RACE_DRAGON', label: '龙族' },
          { value: 'RACE_SPELLCASTER', label: '魔法师族' },
          { value: 'RACE_WARRIOR', label: '战士族' },
          { value: 'RACE_FIEND', label: '恶魔族' },
          { value: 'RACE_ZOMBIE', label: '不死族' },
          { value: 'RACE_MACHINE', label: '机械族' },
          { value: 'RACE_AQUA', label: '水族' },
          { value: 'RACE_PYRO', label: '炎族' },
          { value: 'RACE_ROCK', label: '岩石族' },
          { value: 'RACE_WINDBEAST', label: '鸟兽族' },
          { value: 'RACE_PLANT', label: '植物族' },
          { value: 'RACE_INSECT', label: '昆虫族' },
          { value: 'RACE_THUNDER', label: '雷族' },
          { value: 'RACE_BEAST', label: '兽族' },
          { value: 'RACE_BEASTWARRIOR', label: '兽战士族' },
          { value: 'RACE_DINOSAUR', label: '恐龙族' },
          { value: 'RACE_FISH', label: '鱼族' },
          { value: 'RACE_SEASERPENT', label: '海龙族' },
          { value: 'RACE_REPTILE', label: '爬虫类族' },
          { value: 'RACE_PSYCHIC', label: '念动力族' },
          { value: 'RACE_FAIRY', label: '天使族' },
          { value: 'RACE_WYRM', label: '幻龙族' },
          { value: 'RACE_CYBERSE', label: '电子界族' }
        ],
        required: true
      },
      {
        name: 'support_type',
        type: 'select',
        label: '支援类型',
        options: [
          { value: 'atk_boost', label: '攻击力上升' },
          { value: 'search', label: '检索同种族' },
          { value: 'special_summon', label: '特殊召唤同种族' },
          { value: 'protection', label: '保护同种族' }
        ],
        required: true
      },
      {
        name: 'boost_value',
        type: 'number',
        label: '攻击力提升值',
        defaultValue: 500,
        min: 0,
        max: 2000,
        required: false
      }
    ],
    luaTemplate: `
--种族特定支援
{{#if support_type.atk_boost}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
e1:SetCode(EFFECT_UPDATE_ATTACK)
e1:SetRange(LOCATION_MZONE)
e1:SetTargetRange(LOCATION_MZONE,0)
e1:SetTarget(s.racetg)
e1:SetValue({{boost_value}})
c:RegisterEffect(e1)
function s.racetg(e,c)
  return c:IsRace({{target_race}})
end
{{/if}}
{{#if support_type.search}}
function s.searchfilter(c)
  return c:IsRace({{target_race}}) and c:IsAbleToHand()
end
function s.searchtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(s.searchfilter,tp,LOCATION_DECK,0,1,nil) end
  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.searchop(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
  local g=Duel.SelectMatchingCard(tp,s.searchfilter,tp,LOCATION_DECK,0,1,1,nil)
  if #g>0 then
    Duel.SendtoHand(g,nil,REASON_EFFECT)
    Duel.ConfirmCards(1-tp,g)
  end
end
{{/if}}`,
    compatibility: [],
    examples: ['龙之溪谷', '六武众之门', '不死世界'],
    tags: ['种族支援', 'race support', '强化', '检索']
  },

  // 属性特定支援
  {
    id: 'attribute_support',
    name: '属性特定支援',
    nameEn: 'Attribute-Specific Support',
    category: EffectCategory.EFFECT,
    description: '强化或支援特定属性的怪兽',
    parameters: [
      {
        name: 'target_attribute',
        type: 'select',
        label: '目标属性',
        options: [
          { value: 'ATTRIBUTE_DARK', label: '暗' },
          { value: 'ATTRIBUTE_LIGHT', label: '光' },
          { value: 'ATTRIBUTE_WATER', label: '水' },
          { value: 'ATTRIBUTE_FIRE', label: '炎' },
          { value: 'ATTRIBUTE_EARTH', label: '地' },
          { value: 'ATTRIBUTE_WIND', label: '风' },
          { value: 'ATTRIBUTE_DIVINE', label: '神' }
        ],
        required: true
      },
      {
        name: 'support_type',
        type: 'select',
        label: '支援类型',
        options: [
          { value: 'atk_boost', label: '攻击力上升' },
          { value: 'def_boost', label: '守备力上升' },
          { value: 'protection', label: '保护效果' },
          { value: 'search', label: '检索同属性' }
        ],
        required: true
      },
      {
        name: 'boost_value',
        type: 'number',
        label: '攻守提升值',
        defaultValue: 500,
        min: 0,
        max: 2000,
        required: false
      }
    ],
    luaTemplate: `
--属性特定支援
{{#if support_type.atk_boost}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
e1:SetCode(EFFECT_UPDATE_ATTACK)
e1:SetRange(LOCATION_MZONE)
e1:SetTargetRange(LOCATION_MZONE,0)
e1:SetTarget(s.attrtg)
e1:SetValue({{boost_value}})
c:RegisterEffect(e1)
function s.attrtg(e,c)
  return c:IsAttribute({{target_attribute}})
end
{{/if}}
{{#if support_type.protection}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
e1:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
e1:SetRange(LOCATION_MZONE)
e1:SetTargetRange(LOCATION_MZONE,0)
e1:SetTarget(s.attrtg)
e1:SetValue(1)
c:RegisterEffect(e1)
function s.attrtg(e,c)
  return c:IsAttribute({{target_attribute}})
end
{{/if}}`,
    compatibility: [],
    examples: ['混沌领域', '光之护封剑', '暗黑界的指导者 瑟莉'],
    tags: ['属性支援', 'attribute support', '强化']
  },

  // 融合召唤详细
  {
    id: 'fusion_summon_detailed',
    name: '融合召唤详细',
    nameEn: 'Fusion Summon Detailed',
    category: EffectCategory.SUMMON,
    description: '融合召唤的详细参数（素材指定、融合置换）',
    parameters: [
      {
        name: 'fusion_type',
        type: 'select',
        label: '融合类型',
        options: [
          { value: 'standard', label: '标准融合（融合魔法）' },
          { value: 'contact', label: '接触融合（不需要融合魔法）' },
          { value: 'super_poly', label: '超融合（无法连锁）' },
          { value: 'substitute', label: '融合置换（用其他卡代替素材）' }
        ],
        required: true
      },
      {
        name: 'material_count',
        type: 'number',
        label: '融合素材数量',
        defaultValue: 2,
        min: 1,
        max: 5,
        required: true
      },
      {
        name: 'material_location',
        type: 'select',
        label: '素材来源',
        options: [
          { value: 'hand_field', label: '手卡+场上' },
          { value: 'field_only', label: '仅场上' },
          { value: 'hand_field_grave', label: '手卡+场上+墓地' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--融合召唤详细
{{#if fusion_type.standard}}
function s.fusionop(e,tp,eg,ep,ev,re,r,rp)
  local g=Duel.GetMatchingGroup(Card.IsFusionMaterial,tp,LOCATION_HAND+LOCATION_MZONE,0,nil)
  if #g>=2 then
    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FMATERIAL)
    local mat=g:Select(tp,{{material_count}},{{material_count}},nil)
    local fc=Duel.GetFirstTarget()
    Duel.SendtoGrave(mat,REASON_FUSION+REASON_MATERIAL)
    Duel.SpecialSummon(fc,SUMMON_TYPE_FUSION,tp,tp,false,false,POS_FACEUP)
  end
end
{{/if}}
{{#if fusion_type.contact}}
-- 接触融合（不需要融合魔法）
function s.contactop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  local g=Duel.GetMatchingGroup(Card.IsAbleToDeckOrExtraAsCost,tp,LOCATION_MZONE,0,nil)
  if #g>=2 then
    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
    local mat=g:Select(tp,{{material_count}},{{material_count}},nil)
    Duel.SendtoDeck(mat,nil,SEQ_DECKSHUFFLE,REASON_COST)
    Duel.SpecialSummon(c,SUMMON_TYPE_SPECIAL,tp,tp,false,false,POS_FACEUP)
  end
end
{{/if}}`,
    compatibility: [],
    examples: ['融合', '超融合', 'E·HERO 新星领主', '剑斗兽系列'],
    tags: ['融合', 'fusion', '融合召唤', '素材']
  },

  // 同调召唤详细
  {
    id: 'synchro_summon_detailed',
    name: '同调召唤详细',
    nameEn: 'Synchro Summon Detailed',
    category: EffectCategory.SUMMON,
    description: '同调召唤的详细参数（调整/非调整限制）',
    parameters: [
      {
        name: 'tuner_count',
        type: 'number',
        label: '调整怪兽数量',
        defaultValue: 1,
        min: 1,
        max: 3,
        required: true
      },
      {
        name: 'non_tuner_count',
        type: 'number',
        label: '非调整怪兽数量',
        defaultValue: 1,
        min: 1,
        max: 4,
        required: true
      },
      {
        name: 'material_restriction',
        type: 'select',
        label: '素材限制',
        options: [
          { value: 'none', label: '无限制' },
          { value: 'specific_race', label: '特定种族' },
          { value: 'specific_attribute', label: '特定属性' },
          { value: 'specific_name', label: '特定卡名' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--同调召唤详细
function s.synchrocon(e,c,smat,mg,min,max)
  if c==nil then return true end
  if c:IsType(TYPE_PENDULUM) and c:IsFaceup() then return false end
  local minc={{tuner_count}}+{{non_tuner_count}}
  local maxc=c:IsLocation(LOCATION_EXTRA) and 99 or minc
  if min and min>minc then return false end
  if max and max<minc then return false end
  if smat and smat:IsTuner(c) and (not min or min<=maxc) then
    return true
  end
  if mg then
    return mg:CheckSubGroup(s.syngroup,minc,maxc,tp,c,smat)
  else
    local mg=Duel.GetSynchroMaterial(tp)
    return mg:CheckSubGroup(s.syngroup,minc,maxc,tp,c,smat)
  end
end

function s.syngroup(g,tp,syncard,smat)
  local ct=g:GetCount()
  local tg=g:Filter(Card.IsTuner,nil,syncard)
  local ntg=g:Filter(aux.NOT(Card.IsTuner),nil,syncard)
  return tg:GetCount()=={{tuner_count}} and ntg:GetCount()=={{non_tuner_count}}
    and g:GetSum(Card.GetSynchroLevel,syncard)==syncard:GetLevel()
end`,
    compatibility: [],
    examples: ['星尘龙', '废品战士', '流天类星龙'],
    tags: ['同调', 'synchro', '调整', 'tuner']
  },

  // 超量召唤详细
  {
    id: 'xyz_summon_detailed',
    name: '超量召唤详细',
    nameEn: 'Xyz Summon Detailed',
    category: EffectCategory.SUMMON,
    description: '超量召唤的详细参数（阶级、素材类型）',
    parameters: [
      {
        name: 'xyz_rank',
        type: 'number',
        label: 'X阶级（Rank）',
        defaultValue: 4,
        min: 1,
        max: 12,
        required: true
      },
      {
        name: 'material_count',
        type: 'number',
        label: '超量素材数量',
        defaultValue: 2,
        min: 2,
        max: 5,
        required: true
      },
      {
        name: 'material_restriction',
        type: 'select',
        label: '素材限制',
        options: [
          { value: 'none', label: '无限制' },
          { value: 'specific_race', label: '特定种族' },
          { value: 'specific_attribute', label: '特定属性' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--超量召唤详细
function s.xyzcon(e,c,og,min,max)
  if c==nil then return true end
  local tp=c:GetControler()
  local mg=nil
  if og then
    mg=og:Filter(s.xyzfilter,nil,c)
  else
    mg=Duel.GetFieldGroup(tp,LOCATION_MZONE,0):Filter(s.xyzfilter,nil,c)
  end
  local minc={{material_count}}
  local maxc={{material_count}}
  if min and min>minc then return false end
  if max and max<maxc then return false end
  return mg:CheckSubGroup(aux.mzctcheck,minc,maxc,tp)
end

function s.xyzfilter(c,xyzc)
  return c:IsFaceup() and c:IsType(TYPE_MONSTER) 
    and c:GetLevel()=={{xyz_rank}} and c:IsCanBeXyzMaterial(xyzc)
end`,
    compatibility: [],
    examples: ['No.39 希望皇 霍普', 'No.101 寂静荣誉方舟骑士', 'CNo.39 希望皇 霍普雷'],
    tags: ['超量', 'xyz', 'rank', '阶级']
  },

  // 连接召唤详细
  {
    id: 'link_summon_detailed',
    name: '连接召唤详细',
    nameEn: 'Link Summon Detailed',
    category: EffectCategory.SUMMON,
    description: '连接召唤的详细参数（连接标记、素材类型）',
    parameters: [
      {
        name: 'link_rating',
        type: 'number',
        label: 'LINK数值',
        defaultValue: 2,
        min: 1,
        max: 6,
        required: true
      },
      {
        name: 'link_markers',
        type: 'multiselect',
        label: '连接标记',
        options: [
          { value: 'LINK_MARKER_TOP_LEFT', label: '左上' },
          { value: 'LINK_MARKER_TOP', label: '上' },
          { value: 'LINK_MARKER_TOP_RIGHT', label: '右上' },
          { value: 'LINK_MARKER_LEFT', label: '左' },
          { value: 'LINK_MARKER_RIGHT', label: '右' },
          { value: 'LINK_MARKER_BOTTOM_LEFT', label: '左下' },
          { value: 'LINK_MARKER_BOTTOM', label: '下' },
          { value: 'LINK_MARKER_BOTTOM_RIGHT', label: '右下' }
        ],
        required: true
      },
      {
        name: 'material_restriction',
        type: 'select',
        label: '素材限制',
        options: [
          { value: 'none', label: '无限制' },
          { value: 'specific_race', label: '特定种族' },
          { value: 'specific_attribute', label: '特定属性' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--连接召唤详细
function s.linkcon(e,c,og,min,max)
  if c==nil then return true end
  local tp=c:GetControler()
  local mg=nil
  if og then
    mg=og:Filter(s.linkfilter,nil,c)
  else
    mg=Duel.GetFieldGroup(tp,LOCATION_MZONE,0):Filter(s.linkfilter,nil,c)
  end
  local minc={{link_rating}}
  local maxc={{link_rating}}
  if min and min>minc then return false end
  if max and max<maxc then return false end
  return mg:CheckSubGroup(aux.mzctcheck,minc,maxc,tp)
end

function s.linkfilter(c,linkc)
  return c:IsFaceup() and c:IsType(TYPE_MONSTER) and c:IsCanBeLinkMaterial(linkc)
end`,
    compatibility: [],
    examples: ['解码语者', '防火龙', '三眼怪'],
    tags: ['连接', 'link', 'link marker', '连接标记']
  },

  // 灵摆刻度修改
  {
    id: 'pendulum_scale_modify',
    name: '灵摆刻度修改',
    nameEn: 'Pendulum Scale Modification',
    category: EffectCategory.EFFECT,
    description: '动态修改P刻度的效果',
    parameters: [
      {
        name: 'modify_target',
        type: 'select',
        label: '修改目标',
        options: [
          { value: 'self', label: '自己的P刻度' },
          { value: 'all_own', label: '己方所有P卡' },
          { value: 'opponent', label: '对手的P卡' }
        ],
        required: true
      },
      {
        name: 'modify_value',
        type: 'number',
        label: '修改数值',
        defaultValue: 1,
        min: -5,
        max: 5,
        required: true
      }
    ],
    luaTemplate: `
--灵摆刻度修改
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
e1:SetRange(LOCATION_PZONE)
{{#if modify_target.self}}
e1:SetCode(EFFECT_UPDATE_LSCALE)
e1:SetValue({{modify_value}})
c:RegisterEffect(e1)
local e2=e1:Clone()
e2:SetCode(EFFECT_UPDATE_RSCALE)
c:RegisterEffect(e2)
{{/if}}
{{#if modify_target.all_own}}
e1:SetCode(EFFECT_UPDATE_LSCALE)
e1:SetTargetRange(LOCATION_PZONE,0)
e1:SetValue({{modify_value}})
c:RegisterEffect(e1)
{{/if}}`,
    compatibility: [],
    examples: ['虹彩之魔术师', '灵摆刻度调整', '星光大道'],
    tags: ['灵摆刻度', 'pendulum scale', 'P刻度']
  },

  // 表示形式变更
  {
    id: 'position_change',
    name: '表示形式变更',
    nameEn: 'Position Change',
    category: EffectCategory.EFFECT,
    description: '改变怪兽的表示形式（攻击/守备/表侧/里侧）',
    parameters: [
      {
        name: 'change_type',
        type: 'select',
        label: '变更类型',
        options: [
          { value: 'to_attack', label: '变为攻击表示' },
          { value: 'to_defense', label: '变为守备表示' },
          { value: 'flip', label: '翻转' },
          { value: 'set', label: '放置（里侧守备）' }
        ],
        required: true
      },
      {
        name: 'target_player',
        type: 'select',
        label: '目标玩家',
        options: [
          { value: 'self', label: '己方怪兽' },
          { value: 'opponent', label: '对手怪兽' },
          { value: 'both', label: '全场怪兽' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--表示形式变更
function s.postg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  {{#if target_player.opponent}}
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsControler(1-tp) and chkc:IsFaceup() end
  if chk==0 then return Duel.IsExistingTarget(Card.IsFaceup,tp,0,LOCATION_MZONE,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
  Duel.SelectTarget(tp,Card.IsFaceup,tp,0,LOCATION_MZONE,1,1,nil)
  {{/if}}
  {{#if target_player.self}}
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsControler(tp) and chkc:IsFaceup() end
  if chk==0 then return Duel.IsExistingTarget(Card.IsFaceup,tp,LOCATION_MZONE,0,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
  Duel.SelectTarget(tp,Card.IsFaceup,tp,LOCATION_MZONE,0,1,1,nil)
  {{/if}}
end

function s.posop(e,tp,eg,ep,ev,re,r,rp)
  local tc=Duel.GetFirstTarget()
  if tc and tc:IsRelateToEffect(e) and tc:IsFaceup() then
    {{#if change_type.to_attack}}
    Duel.ChangePosition(tc,POS_FACEUP_ATTACK)
    {{/if}}
    {{#if change_type.to_defense}}
    Duel.ChangePosition(tc,POS_FACEUP_DEFENSE)
    {{/if}}
    {{#if change_type.flip}}
    Duel.ChangePosition(tc,POS_FACEUP_ATTACK)
    {{/if}}
  end
end`,
    compatibility: [],
    examples: ['敌人控制器', '月之书', '重力网'],
    tags: ['表示形式', 'position', '攻击表示', '守备表示']
  },

  // 卡片交换/控制权转移
  {
    id: 'control_exchange',
    name: '卡片交换/控制权转移',
    nameEn: 'Control Exchange',
    category: EffectCategory.EFFECT,
    description: '与对手交换怪兽的控制权',
    parameters: [
      {
        name: 'exchange_type',
        type: 'select',
        label: '交换类型',
        options: [
          { value: 'permanent', label: '永久转移' },
          { value: 'temporary', label: '临时转移（结束阶段返还）' },
          { value: 'mutual', label: '双方交换' }
        ],
        required: true
      },
      {
        name: 'duration',
        type: 'select',
        label: '持续时间',
        options: [
          { value: 'permanent', label: '永久' },
          { value: 'end_phase', label: '结束阶段' },
          { value: 'one_turn', label: '一回合' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--控制权转移
function s.cttg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsControler(1-tp) and chkc:IsControlerCanBeChanged() end
  if chk==0 then return Duel.IsExistingTarget(Card.IsControlerCanBeChanged,tp,0,LOCATION_MZONE,1,nil) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_CONTROL)
  local g=Duel.SelectTarget(tp,Card.IsControlerCanBeChanged,tp,0,LOCATION_MZONE,1,1,nil)
  Duel.SetOperationInfo(0,CATEGORY_CONTROL,g,1,0,0)
end

function s.ctop(e,tp,eg,ep,ev,re,r,rp)
  local tc=Duel.GetFirstTarget()
  if tc and tc:IsRelateToEffect(e) then
    {{#if duration.permanent}}
    Duel.GetControl(tc,tp)
    {{/if}}
    {{#if duration.end_phase}}
    Duel.GetControl(tc,tp,PHASE_END,1)
    {{/if}}
    {{#if duration.one_turn}}
    Duel.GetControl(tc,tp,PHASE_END,2)
    {{/if}}
  end
end`,
    compatibility: [],
    examples: ['敌人控制器', '洗脑', '精神操作'],
    tags: ['控制权', 'control', '交换', '夺取']
  },

  // 场地魔法相关
  {
    id: 'field_spell_related',
    name: '场地魔法相关',
    nameEn: 'Field Spell Related',
    category: EffectCategory.EFFECT,
    description: '依赖场地魔法的效果',
    parameters: [
      {
        name: 'field_dependency',
        type: 'select',
        label: '场地依赖类型',
        options: [
          { value: 'any_field', label: '任意场地魔法存在' },
          { value: 'specific_field', label: '特定场地魔法' },
          { value: 'own_field', label: '自己的场地魔法' }
        ],
        required: true
      },
      {
        name: 'effect_type',
        type: 'select',
        label: '效果类型',
        options: [
          { value: 'atk_boost', label: '攻击力提升' },
          { value: 'protection', label: '场地保护' },
          { value: 'search', label: '检索场地魔法' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--场地魔法相关
{{#if field_dependency.any_field}}
function s.fieldcon(e)
  return Duel.IsExistingMatchingCard(Card.IsType,e:GetHandlerPlayer(),LOCATION_FZONE,LOCATION_FZONE,1,nil,TYPE_FIELD)
end
{{/if}}
{{#if effect_type.search}}
function s.searchfilter(c)
  return c:IsType(TYPE_FIELD) and c:IsAbleToHand()
end
function s.searchtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(s.searchfilter,tp,LOCATION_DECK,0,1,nil) end
  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.searchop(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
  local g=Duel.SelectMatchingCard(tp,s.searchfilter,tp,LOCATION_DECK,0,1,1,nil)
  if #g>0 then
    Duel.SendtoHand(g,nil,REASON_EFFECT)
    Duel.ConfirmCards(1-tp,g)
  end
end
{{/if}}`,
    compatibility: [],
    examples: ['大地崩坏', '地碎', '星光大道'],
    tags: ['场地魔法', 'field spell', '场地依赖']
  },

  // 永续魔法/陷阱指示物
  {
    id: 'continuous_spell_counter',
    name: '永续魔法/陷阱指示物',
    nameEn: 'Continuous Spell/Trap Counter',
    category: EffectCategory.EFFECT,
    description: '永续魔法或陷阱卡的指示物系统',
    parameters: [
      {
        name: 'counter_type',
        type: 'select',
        label: '指示物类型',
        options: [
          { value: '0x1', label: '魔力指示物' },
          { value: '0x1001', label: '宝玉指示物' },
          { value: '0x1002', label: '楔指示物' },
          { value: '0x1003', label: '时钟指示物' }
        ],
        required: true
      },
      {
        name: 'counter_gain',
        type: 'select',
        label: '获得时机',
        options: [
          { value: 'on_activate', label: '发动时' },
          { value: 'standby_phase', label: '准备阶段' },
          { value: 'spell_activate', label: '魔法卡发动时' }
        ],
        required: true
      },
      {
        name: 'counter_use',
        type: 'select',
        label: '使用方式',
        options: [
          { value: 'remove_for_effect', label: '移除发动效果' },
          { value: 'count_condition', label: '数量达标触发' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--永续魔法/陷阱指示物
{{#if counter_gain.on_activate}}
-- 发动时放置指示物
function s.operation(e,tp,eg,ep,ev,re,r,rp)
  if e:GetHandler():IsRelateToEffect(e) then
    e:GetHandler():AddCounter({{counter_type}},1)
  end
end
{{/if}}
{{#if counter_gain.standby_phase}}
-- 准备阶段放置指示物
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
e1:SetCode(EVENT_PHASE+PHASE_STANDBY)
e1:SetRange(LOCATION_SZONE)
e1:SetCountLimit(1)
e1:SetOperation(s.ctop)
c:RegisterEffect(e1)
function s.ctop(e,tp,eg,ep,ev,re,r,rp)
  e:GetHandler():AddCounter({{counter_type}},1)
end
{{/if}}
{{#if counter_use.remove_for_effect}}
-- 移除指示物发动效果
function s.cost(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return e:GetHandler():IsCanRemoveCounter(tp,{{counter_type}},1,REASON_COST) end
  e:GetHandler():RemoveCounter(tp,{{counter_type}},1,REASON_COST)
end
{{/if}}`,
    compatibility: [],
    examples: ['魔力指示物', '魔法都市 恩底弥翁', '宝玉的祈祷'],
    tags: ['指示物', 'counter', '魔力指示物', '永续魔法']
  },

  // 装备卡转移
  {
    id: 'equip_transfer',
    name: '装备卡转移',
    nameEn: 'Equip Transfer',
    category: EffectCategory.EFFECT,
    description: '将装备卡转移到其他怪兽',
    parameters: [
      {
        name: 'transfer_target',
        type: 'select',
        label: '转移目标',
        options: [
          { value: 'own_monster', label: '己方其他怪兽' },
          { value: 'opponent_monster', label: '对手怪兽' },
          { value: 'any_monster', label: '任意怪兽' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--装备卡转移
function s.eqtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsFaceup() end
  if chk==0 then return Duel.IsExistingTarget(Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil) 
    and Duel.IsExistingMatchingCard(Card.IsType,tp,LOCATION_SZONE,0,1,nil,TYPE_EQUIP) end
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_EQUIP)
  local g=Duel.SelectTarget(tp,Card.IsFaceup,tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
end

function s.eqop(e,tp,eg,ep,ev,re,r,rp)
  local tc=Duel.GetFirstTarget()
  if tc and tc:IsRelateToEffect(e) and tc:IsFaceup() then
    Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_EQUIP)
    local ec=Duel.SelectMatchingCard(tp,Card.IsType,tp,LOCATION_SZONE,0,1,1,nil,TYPE_EQUIP):GetFirst()
    if ec then
      Duel.Equip(tp,ec,tc)
    end
  end
end`,
    compatibility: [],
    examples: ['装备交换', '装备转移', '古代机械城塞'],
    tags: ['装备卡', 'equip', '转移', 'transfer']
  },

  // 二重召唤/设置
  {
    id: 'double_summon',
    name: '二重召唤/设置',
    nameEn: 'Double Summon',
    category: EffectCategory.EFFECT,
    description: '一回合可以进行额外的通常召唤',
    parameters: [
      {
        name: 'summon_type',
        type: 'select',
        label: '额外召唤类型',
        options: [
          { value: 'normal_summon', label: '通常召唤' },
          { value: 'set', label: '放置（盖伏）' },
          { value: 'both', label: '两者皆可' }
        ],
        required: true
      },
      {
        name: 'restriction',
        type: 'select',
        label: '使用限制',
        options: [
          { value: 'none', label: '无限制' },
          { value: 'specific_race', label: '特定种族' },
          { value: 'specific_attribute', label: '特定属性' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--二重召唤/设置
local e1=Effect.CreateEffect(c)
e1:SetDescription(aux.Stringid(id,0))
e1:SetType(EFFECT_TYPE_IGNITION)
e1:SetRange(LOCATION_HAND)
e1:SetCountLimit(1,id)
e1:SetCost(s.sumcost)
e1:SetTarget(s.sumtg)
e1:SetOperation(s.sumop)
c:RegisterEffect(e1)

function s.sumcost(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return e:GetHandler():IsAbleToGraveAsCost() end
  Duel.SendtoGrave(e:GetHandler(),REASON_COST)
end

function s.sumtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.GetFlagEffect(tp,id)==0 end
end

function s.sumop(e,tp,eg,ep,ev,re,r,rp)
  if Duel.GetFlagEffect(tp,id)~=0 then return end
  local e1=Effect.CreateEffect(e:GetHandler())
  e1:SetDescription(aux.Stringid(id,1))
  e1:SetType(EFFECT_TYPE_FIELD)
  e1:SetCode(EFFECT_EXTRA_SUMMON_COUNT)
  e1:SetTargetRange(LOCATION_HAND+LOCATION_MZONE,0)
  e1:SetValue(1)
  e1:SetReset(RESET_PHASE+PHASE_END)
  Duel.RegisterEffect(e1,tp)
  Duel.RegisterFlagEffect(tp,id,RESET_PHASE+PHASE_END,0,1)
end`,
    compatibility: [],
    examples: ['二重召唤', '召唤师之技', '龙之溪谷'],
    tags: ['二重召唤', 'double summon', '额外召唤']
  },

  // 特殊状态标记
  {
    id: 'special_status_mark',
    name: '特殊状态标记',
    nameEn: 'Special Status Mark',
    category: EffectCategory.EFFECT,
    description: '给怪兽添加特殊状态（不能攻击、不能特召等）',
    parameters: [
      {
        name: 'status_type',
        type: 'select',
        label: '状态类型',
        options: [
          { value: 'cannot_attack', label: '不能攻击' },
          { value: 'cannot_special_summon', label: '不能特殊召唤' },
          { value: 'cannot_be_target', label: '不会成为效果对象' },
          { value: 'cannot_be_destroyed', label: '不会被战斗/效果破坏' }
        ],
        required: true
      },
      {
        name: 'duration',
        type: 'select',
        label: '持续时间',
        options: [
          { value: 'this_turn', label: '本回合' },
          { value: 'permanent', label: '永久' },
          { value: 'end_phase', label: '结束阶段' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--特殊状态标记
{{#if status_type.cannot_attack}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_CANNOT_ATTACK)
{{#if duration.this_turn}}
e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
{{/if}}
c:RegisterEffect(e1)
{{/if}}
{{#if status_type.cannot_special_summon}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_FIELD)
e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
e1:SetTargetRange(1,0)
{{#if duration.this_turn}}
e1:SetReset(RESET_PHASE+PHASE_END)
{{/if}}
Duel.RegisterEffect(e1,tp)
{{/if}}
{{#if status_type.cannot_be_target}}
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET)
e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
e1:SetRange(LOCATION_MZONE)
e1:SetValue(aux.tgoval)
{{#if duration.this_turn}}
e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
{{/if}}
c:RegisterEffect(e1)
{{/if}}`,
    compatibility: [],
    examples: ['和睦的使者', '强制脱出装置', '禁止令'],
    tags: ['状态', 'status', '限制', '不能攻击']
  },

  // 卡片名称引用
  {
    id: 'card_name_reference',
    name: '卡片名称引用',
    nameEn: 'Card Name Reference',
    category: EffectCategory.EFFECT,
    description: '指定特定卡名的效果（如"青眼白龙"）',
    parameters: [
      {
        name: 'card_code',
        type: 'number',
        label: '卡片密码（8位数字）',
        defaultValue: 89631139,
        min: 10000000,
        max: 99999999,
        required: true
      },
      {
        name: 'reference_type',
        type: 'select',
        label: '引用类型',
        options: [
          { value: 'search', label: '检索指定卡片' },
          { value: 'special_summon', label: '特殊召唤指定卡片' },
          { value: 'name_treated_as', label: '当作指定卡名使用' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--卡片名称引用
{{#if reference_type.search}}
function s.searchfilter(c)
  return c:IsCode({{card_code}}) and c:IsAbleToHand()
end
function s.searchtg(e,tp,eg,ep,ev,re,r,rp,chk)
  if chk==0 then return Duel.IsExistingMatchingCard(s.searchfilter,tp,LOCATION_DECK,0,1,nil) end
  Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.searchop(e,tp,eg,ep,ev,re,r,rp)
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
  local g=Duel.SelectMatchingCard(tp,s.searchfilter,tp,LOCATION_DECK,0,1,1,nil)
  if #g>0 then
    Duel.SendtoHand(g,nil,REASON_EFFECT)
    Duel.ConfirmCards(1-tp,g)
  end
end
{{/if}}
{{#if reference_type.name_treated_as}}
-- 当作指定卡名使用
local e1=Effect.CreateEffect(c)
e1:SetType(EFFECT_TYPE_SINGLE)
e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
e1:SetCode(EFFECT_CHANGE_CODE)
e1:SetRange(LOCATION_MZONE+LOCATION_GRAVE)
e1:SetValue({{card_code}})
c:RegisterEffect(e1)
{{/if}}`,
    compatibility: [],
    examples: ['青眼精灵龙', '黑魔导女孩', '哈比的狩猎场'],
    tags: ['卡名引用', 'card code', '指定卡名']
  },

  // 复制效果
  {
    id: 'copy_effect',
    name: '复制效果',
    nameEn: 'Copy Effect',
    category: EffectCategory.EFFECT,
    description: '复制其他卡片的效果',
    parameters: [
      {
        name: 'copy_source',
        type: 'select',
        label: '复制来源',
        options: [
          { value: 'field', label: '场上的怪兽' },
          { value: 'grave', label: '墓地的怪兽' },
          { value: 'banished', label: '除外区的怪兽' }
        ],
        required: true
      },
      {
        name: 'copy_duration',
        type: 'select',
        label: '复制持续时间',
        options: [
          { value: 'this_turn', label: '本回合' },
          { value: 'permanent', label: '永久' },
          { value: 'end_phase', label: '结束阶段' }
        ],
        required: true
      }
    ],
    luaTemplate: `
--复制效果
function s.copyfilter(c)
  {{#if copy_source.field}}
  return c:IsFaceup() and c:IsType(TYPE_MONSTER)
  {{/if}}
  {{#if copy_source.grave}}
  return c:IsType(TYPE_MONSTER)
  {{/if}}
end

function s.copytg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
  {{#if copy_source.field}}
  if chkc then return chkc:IsLocation(LOCATION_MZONE) and s.copyfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.copyfilter,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil) end
  {{/if}}
  {{#if copy_source.grave}}
  if chkc then return chkc:IsLocation(LOCATION_GRAVE) and s.copyfilter(chkc) end
  if chk==0 then return Duel.IsExistingTarget(s.copyfilter,tp,LOCATION_GRAVE,LOCATION_GRAVE,1,nil) end
  {{/if}}
  Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
  Duel.SelectTarget(tp,s.copyfilter,tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
end

function s.copyop(e,tp,eg,ep,ev,re,r,rp)
  local c=e:GetHandler()
  local tc=Duel.GetFirstTarget()
  if tc and c:IsRelateToEffect(e) and c:IsFaceup() and tc:IsRelateToEffect(e) and tc:IsFaceup() then
    local code=tc:GetOriginalCode()
    local e1=Effect.CreateEffect(c)
    e1:SetType(EFFECT_TYPE_SINGLE)
    e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
    e1:SetCode(EFFECT_CHANGE_CODE)
    e1:SetValue(code)
    {{#if copy_duration.this_turn}}
    e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
    {{/if}}
    c:RegisterEffect(e1)
    c:CopyEffect(code,RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END,1)
  end
end`,
    compatibility: [],
    examples: ['复制植物', '机壳的再生', '死者苏生'],
    tags: ['复制', 'copy', '效果复制']
  }
];

/**
 * 根据卡片类型获取适用的效果模块
 */
export function getModulesForCardType(cardType: number): EffectModule[] {
  // 怪兽卡 - 包含所有类型的效果
  if (cardType & 0x1) {
    return EFFECT_MODULES.filter(m => 
      [EffectCategory.SUMMON, EffectCategory.SEARCH, EffectCategory.DESTROY,
       EffectCategory.DRAW, EffectCategory.DAMAGE, EffectCategory.NEGATE,
       EffectCategory.STAT_CHANGE, EffectCategory.BANISH, EffectCategory.EFFECT].includes(m.category)
    );
  }
  // 魔法卡 - 包含检索、破坏、特召等常见魔法效果
  if (cardType & 0x2) {
    return EFFECT_MODULES.filter(m =>
      [EffectCategory.SEARCH, EffectCategory.DESTROY, EffectCategory.DRAW,
       EffectCategory.DAMAGE, EffectCategory.STAT_CHANGE, EffectCategory.SUMMON,
       EffectCategory.BANISH, EffectCategory.EFFECT].includes(m.category)
    );
  }
  // 陷阱卡 - 侧重于破坏、无效、干扰类效果
  if (cardType & 0x4) {
    return EFFECT_MODULES.filter(m =>
      [EffectCategory.DESTROY, EffectCategory.NEGATE, EffectCategory.DAMAGE,
       EffectCategory.BANISH, EffectCategory.STAT_CHANGE, EffectCategory.EFFECT].includes(m.category)
    );
  }
  return EFFECT_MODULES;
}

/**
 * 获取所有可用的效果模块ID列表（用于验证）
 */
export function getAllModuleIds(): string[] {
  return EFFECT_MODULES.map(m => m.id);
}

/**
 * 根据ID获取单个效果模块
 */
export function getModuleById(id: string): EffectModule | undefined {
  return EFFECT_MODULES.find(m => m.id === id);
}
