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
