/**
 * 时点事件定义 - 扩展的触发时点支持
 * 包含战斗相关、阶段相关、送墓/除外细分等时点
 */

export interface TimingEvent {
  id: string;
  name: string;
  nameEn: string;
  category: 'battle' | 'phase' | 'summon' | 'grave' | 'removal' | 'field';
  eventCode: string;
  description: string;
  additionalConditions?: string; // 额外的条件判断代码
}

export const TIMING_EVENTS: TimingEvent[] = [
  // ===== 战斗相关时点 =====
  {
    id: 'attack_announce',
    name: '攻击宣言时',
    nameEn: 'When Attack is Declared',
    category: 'battle',
    eventCode: 'EVENT_ATTACK_ANNOUNCE',
    description: '怪兽进行攻击宣言的时点'
  },
  {
    id: 'be_battle_target',
    name: '成为攻击对象时',
    nameEn: 'When Targeted for Attack',
    category: 'battle',
    eventCode: 'EVENT_BE_BATTLE_TARGET',
    description: '此卡成为攻击对象时'
  },
  {
    id: 'pre_damage_calculate',
    name: '伤害计算前',
    nameEn: 'Before Damage Calculation',
    category: 'battle',
    eventCode: 'EVENT_PRE_DAMAGE_CALCULATE',
    description: '伤害计算步骤开始前'
  },
  {
    id: 'battle_damage',
    name: '造成战斗伤害时',
    nameEn: 'When Battle Damage is Inflicted',
    category: 'battle',
    eventCode: 'EVENT_BATTLE_DAMAGE',
    description: '战斗伤害被给予的时点'
  },
  {
    id: 'battled',
    name: '战斗结束时',
    nameEn: 'After Battle',
    category: 'battle',
    eventCode: 'EVENT_BATTLED',
    description: '此卡进行战斗后'
  },
  {
    id: 'damage_step_end',
    name: '伤害步骤结束时',
    nameEn: 'At the End of Damage Step',
    category: 'battle',
    eventCode: 'EVENT_DAMAGE_STEP_END',
    description: '伤害步骤结束时点'
  },
  {
    id: 'battle_destroying',
    name: '战斗破坏对方怪兽时',
    nameEn: 'When Destroying Monster by Battle',
    category: 'battle',
    eventCode: 'EVENT_BATTLE_DESTROYING',
    description: '此卡战斗破坏对方怪兽送去墓地时',
    additionalConditions: `local c=e:GetHandler()
  local bc=c:GetBattleTarget()
  return c:IsRelateToBattle() and bc:IsLocation(LOCATION_GRAVE) and bc:IsType(TYPE_MONSTER)`
  },

  // ===== 阶段相关时点 =====
  {
    id: 'standby_phase',
    name: '准备阶段',
    nameEn: 'Standby Phase',
    category: 'phase',
    eventCode: 'EVENT_PHASE+PHASE_STANDBY',
    description: '准备阶段时'
  },
  {
    id: 'main_phase',
    name: '主要阶段',
    nameEn: 'Main Phase',
    category: 'phase',
    eventCode: 'EVENT_PHASE+PHASE_MAIN1',
    description: '主要阶段时'
  },
  {
    id: 'battle_phase',
    name: '战斗阶段',
    nameEn: 'Battle Phase',
    category: 'phase',
    eventCode: 'EVENT_PHASE+PHASE_BATTLE',
    description: '战斗阶段开始时'
  },
  {
    id: 'end_phase',
    name: '结束阶段',
    nameEn: 'End Phase',
    category: 'phase',
    eventCode: 'EVENT_PHASE+PHASE_END',
    description: '结束阶段时'
  },

  // ===== 送墓细分时点 =====
  {
    id: 'to_grave_general',
    name: '被送去墓地时',
    nameEn: 'When Sent to Graveyard',
    category: 'grave',
    eventCode: 'EVENT_TO_GRAVE',
    description: '此卡被送去墓地时'
  },
  {
    id: 'to_grave_from_field',
    name: '从场上送去墓地时',
    nameEn: 'When Sent from Field to Graveyard',
    category: 'grave',
    eventCode: 'EVENT_TO_GRAVE',
    description: '此卡从场上送去墓地时',
    additionalConditions: 'return e:GetHandler():IsPreviousLocation(LOCATION_ONFIELD)'
  },
  {
    id: 'to_grave_by_effect',
    name: '被效果送去墓地时',
    nameEn: 'When Sent to Graveyard by Effect',
    category: 'grave',
    eventCode: 'EVENT_TO_GRAVE',
    description: '此卡被卡的效果送去墓地时',
    additionalConditions: 'return e:GetHandler():IsReason(REASON_EFFECT)'
  },
  {
    id: 'deck_to_grave',
    name: '从卡组送去墓地时',
    nameEn: 'When Milled',
    category: 'grave',
    eventCode: 'EVENT_TO_GRAVE',
    description: '此卡从卡组送去墓地时',
    additionalConditions: 'return e:GetHandler():IsPreviousLocation(LOCATION_DECK)'
  },

  // ===== 场地离开相关 =====
  {
    id: 'leave_field',
    name: '离开场上时',
    nameEn: 'When Leaves Field',
    category: 'field',
    eventCode: 'EVENT_LEAVE_FIELD',
    description: '此卡从场上离开时'
  },
  {
    id: 'destroyed',
    name: '被破坏时',
    nameEn: 'When Destroyed',
    category: 'field',
    eventCode: 'EVENT_DESTROYED',
    description: '此卡被破坏时'
  },
  {
    id: 'removed',
    name: '被除外时',
    nameEn: 'When Banished',
    category: 'removal',
    eventCode: 'EVENT_REMOVE',
    description: '此卡被除外时'
  },

  // ===== 召唤相关 =====
  {
    id: 'summon_success',
    name: '召唤成功时',
    nameEn: 'When Summoned',
    category: 'summon',
    eventCode: 'EVENT_SUMMON_SUCCESS',
    description: '此卡召唤成功时'
  },
  {
    id: 'spsummon_success',
    name: '特殊召唤成功时',
    nameEn: 'When Special Summoned',
    category: 'summon',
    eventCode: 'EVENT_SPSUMMON_SUCCESS',
    description: '此卡特殊召唤成功时'
  },
  {
    id: 'flip',
    name: '反转时',
    nameEn: 'When Flipped',
    category: 'summon',
    eventCode: 'EVENT_FLIP',
    description: '此卡反转时'
  }
];

/**
 * 根据时点ID获取时点事件配置
 */
export function getTimingEvent(id: string): TimingEvent | undefined {
  return TIMING_EVENTS.find(event => event.id === id);
}

/**
 * 根据类别获取时点事件列表
 */
export function getTimingEventsByCategory(category: string): TimingEvent[] {
  return TIMING_EVENTS.filter(event => event.category === category);
}
