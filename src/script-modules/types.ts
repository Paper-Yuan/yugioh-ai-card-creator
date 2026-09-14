/**
 * 脚本效果模块类型定义
 * 用于图形化编辑器的效果分类和选择
 */

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
  type: 'number' | 'string' | 'boolean' | 'select' | 'multiselect';
  label: string;
  description?: string;
  defaultValue?: any;
  options?: ParameterOption[];
  min?: number;
  max?: number;
  required: boolean;
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
