/**
 * 脚本效果模块类型定义
 * 用于图形化编辑器的效果分类和选择
 */

/**
 * 效果段落 - 支持多段结算
 */
export interface EffectSegment {
  action: string;           // 动作ID
  parameters: Record<string, any>;
  breakEffect?: boolean;    // 是否在此段前调用 Duel.BreakEffect()
}

/**
 * 效果参数 - 支持标签传参 (SetLabel/GetChainInfo)
 */
export interface EffectParam {
  name: string;             // 参数名
  source: 'count' | 'player' | 'card' | 'value';
  setIn: 'target' | 'cost'; // 在哪个阶段设置
  useIn: 'operation';       // 在哪个阶段使用
}

export interface EffectModule {
  id: string;
  name: string;
  nameEn: string;
  category: EffectCategory;
  subcategory?: string;
  description: string;
  parameters: EffectParameter[];
  luaTemplate: string;
  compatibility: CompatibilityRule[];
  examples: string[];
  tags: string[];
  segments?: EffectSegment[];  // 多段效果配置
  params?: EffectParam[];      // 标签传参配置
}

export enum EffectCategory {
  SUMMON = 'summon',           // 召唤相关
  ACTIVATION = 'activation',   // 发动条件
  COST = 'cost',              // Cost
  TARGET = 'target',          // 对象选择
  EFFECT = 'effect',          // 效果处理
  TRIGGER = 'trigger',        // 触发效果
  QUICK = 'quick',            // 速攻效果
  CONTINUOUS = 'continuous',  // 持续效果
  MATERIAL = 'material',      // 素材相关
  SEARCH = 'search',          // 检索
  DESTROY = 'destroy',        // 破坏
  BANISH = 'banish',          // 除外
  DRAW = 'draw',              // 抽卡
  DAMAGE = 'damage',          // 伤害
  NEGATE = 'negate',          // 无效
  STAT_CHANGE = 'stat_change' // 攻守变化
}

export interface EffectParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'multiselect' | 'group' | 'object';
  label: string;
  description?: string;
  defaultValue?: any;
  options?: ParameterOption[];
  parameters?: EffectParameter[]; // For nested group parameters
  min?: number;
  max?: number;
  required: boolean;
  conditionalOn?: { // Show this parameter only when another parameter has a specific value
    parameter: string;
    value: string | string[];
  };
}

export interface ParameterOption {
  value: string | number;
  label: string;
}

export interface CompatibilityRule {
  type: 'requires' | 'conflicts' | 'suggests';
  moduleIds: string[];
  reason: string;
}

export interface ScriptTemplate {
  effectModules: SelectedEffectModule[];
  cardData: {
    id: number;
    name: string;
    type: number;
    race: number;
    attribute?: number;
    level?: number;
  };
}

export interface SelectedEffectModule {
  moduleId: string;
  parameters: Record<string, any>;
  order: number;
}

export interface GeneratedScript {
  lua: string;
  warnings: string[];
  suggestions: string[];
  complexity: number;
  coverage: string[];
}

/**
 * 动态数值来源系统
 * 支持固定值、计数、等级参照、攻守参照等多种数值生成模式
 */
export interface ValueSource {
  mode: 'fixed' | 'count_times' | 'level_ref' | 'atk_ref' | 'def_ref' | 'grave_count' | 'overlay_count' | 'battle_count';
  
  // 固定值模式 (mode: 'fixed')
  fixedValue?: number;
  
  // 计数倍率模式 (mode: 'count_times', 'grave_count', 'overlay_count')
  multiplier?: number; // 每个单位的倍率
  countFilter?: CountFilter; // 计数过滤条件
  
  // 参照模式 (mode: 'level_ref', 'atk_ref', 'def_ref')
  refStat?: 'level' | 'atk' | 'def' | 'rank'; // 参照的属性
  refTarget?: 'self' | 'target' | 'opponent_monster'; // 参照目标
  refOperation?: 'multiply' | 'divide' | 'half' | 'double' | 'same'; // 参照运算
  refMultiplier?: number; // 参照倍率 (用于 multiply)
  refDivisor?: number; // 参照除数 (用于 divide)
  
  // 战斗计数模式 (mode: 'battle_count')
  battleMultiplier?: number;
}

export interface CountFilter {
  location: 'LOCATION_MZONE' | 'LOCATION_GRAVE' | 'LOCATION_REMOVED' | 'LOCATION_HAND' | 'LOCATION_DECK';
  controller: 'tp' | '1-tp' | 'LOCATION_ONFIELD'; // tp=自己, 1-tp=对手, LOCATION_ONFIELD=双方
  cardType?: 'TYPE_MONSTER' | 'TYPE_SPELL' | 'TYPE_TRAP';
  race?: string; // RACE_WARRIOR, RACE_DRAGON, etc.
  attribute?: string; // ATTRIBUTE_LIGHT, ATTRIBUTE_DARK, etc.
  levelCondition?: {
    operator: 'eq' | 'ge' | 'le';
    value: number;
  };
}

/**
 * Reset Mode - 效果持续时长类型
 * 基于 YGOPro RESET_* 常量系统
 */
export type ResetMode = 
  | 'STANDARD'      // 标准重置 (RESET_EVENT+RESETS_STANDARD) - 离场重置
  | 'PHASE_END'     // 回合结束阶段 (RESET_PHASE+PHASE_END)
  | 'TURN_END'      // 回合结束 (RESET_PHASE+PHASE_END,2)
  | 'OPPO_TURN'     // 对手回合结束 (RESET_OPPO_TURN)
  | 'SELF_TURN'     // 自己回合结束 (RESET_SELF_TURN)
  | 'CHAIN'         // 连锁结束 (RESET_CHAIN)
  | 'NEVER';        // 永久 (0 - 不设置reset)

/**
 * Reset 配置
 */
export interface ResetConfig {
  mode: ResetMode;
  turnCount?: number; // 持续回合数 (用于 PHASE_END/TURN_END)
}
