import Handlebars from 'handlebars';
import { 
  ScriptTemplate, 
  GeneratedScript, 
  SelectedEffectModule,
  EffectModule 
} from './types.js';
import { EFFECT_MODULES, getModulesForCardType } from './module-library.js';

/**
 * YGOPro 脚本组装引擎
 * 将选中的效果模块组装成完整的 Lua 脚本
 */
export class ScriptAssembler {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * 从模板生成完整脚本
   */
  generateScript(template: ScriptTemplate): GeneratedScript {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const coverage: string[] = [];

    // 验证模块兼容性
    const compatibilityIssues = this.checkCompatibility(template.effectModules);
    warnings.push(...compatibilityIssues);

    // 排序效果模块
    const sortedModules = this.sortModules(template.effectModules);

    // 生成脚本头部
    const header = this.generateHeader(template.cardData);

    // 生成初始化函数
    const initialFunction = this.generateInitialFunction(template.cardData, sortedModules);

    // 生成各个效果函数
    const effectFunctions = sortedModules.map((selected, index) => {
      const module = EFFECT_MODULES.find(m => m.id === selected.moduleId);
      if (!module) {
        warnings.push(`未找到模块: ${selected.moduleId}`);
        return '';
      }

      coverage.push(module.name);
      return this.generateEffectFunction(module, selected.parameters, index + 1);
    }).join('\n\n');

    // 组装完整脚本
    const lua = `${header}\n\n${initialFunction}\n\n${effectFunctions}`;

    // 计算复杂度
    const complexity = this.calculateComplexity(sortedModules);

    // 生成建议
    if (sortedModules.length === 0) {
      suggestions.push('建议至少添加一个效果');
    }
    if (complexity > 10) {
      suggestions.push('脚本较为复杂，建议添加测试用例');
    }

    return {
      lua,
      warnings,
      suggestions,
      complexity,
      coverage
    };
  }

  /**
   * 生成脚本头部
   */
  private generateHeader(cardData: any): string {
    return `--[[
卡片名称: ${cardData.name}
卡片ID: ${cardData.id}
自动生成于: ${new Date().toISOString()}
]]
local s,id,o=GetID()`;
  }

  /**
   * 生成初始化函数
   */
  private generateInitialFunction(cardData: any, modules: SelectedEffectModule[]): string {
    const effects: string[] = [];

    modules.forEach((selected, index) => {
      const module = EFFECT_MODULES.find(m => m.id === selected.moduleId);
      if (!module) return;

      const effectNum = index + 1;
      
      // 根据效果类型生成不同的注册代码
      if (module.category === 'summon') {
        effects.push(`  --特殊召唤效果
  local e${effectNum}=Effect.CreateEffect(c)
  e${effectNum}:SetDescription(aux.Stringid(id,${index}))
  e${effectNum}:SetCategory(CATEGORY_SPECIAL_SUMMON)
  e${effectNum}:SetType(EFFECT_TYPE_IGNITION)
  e${effectNum}:SetRange(LOCATION_HAND)
  e${effectNum}:SetCountLimit(1,id)
  e${effectNum}:SetCondition(s.spcon)
  e${effectNum}:SetTarget(s.sptg)
  e${effectNum}:SetOperation(s.spop)
  c:RegisterEffect(e${effectNum})`);
      } else if (module.category === 'search') {
        effects.push(`  --检索效果
  local e${effectNum}=Effect.CreateEffect(c)
  e${effectNum}:SetDescription(aux.Stringid(id,${index}))
  e${effectNum}:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
  e${effectNum}:SetType(EFFECT_TYPE_IGNITION)
  e${effectNum}:SetRange(LOCATION_MZONE)
  e${effectNum}:SetCountLimit(1,id+100)
  e${effectNum}:SetTarget(s.thtg)
  e${effectNum}:SetOperation(s.thop)
  c:RegisterEffect(e${effectNum})`);
      } else if (module.category === 'destroy') {
        effects.push(`  --破坏效果
  local e${effectNum}=Effect.CreateEffect(c)
  e${effectNum}:SetDescription(aux.Stringid(id,${index}))
  e${effectNum}:SetCategory(CATEGORY_DESTROY)
  e${effectNum}:SetType(EFFECT_TYPE_IGNITION)
  e${effectNum}:SetRange(LOCATION_MZONE)
  e${effectNum}:SetCountLimit(1)
  e${effectNum}:SetTarget(s.destg)
  e${effectNum}:SetOperation(s.desop)
  c:RegisterEffect(e${effectNum})`);
      } else if (module.category === 'draw') {
        effects.push(`  --抽卡效果
  local e${effectNum}=Effect.CreateEffect(c)
  e${effectNum}:SetDescription(aux.Stringid(id,${index}))
  e${effectNum}:SetCategory(CATEGORY_DRAW)
  e${effectNum}:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
  e${effectNum}:SetCode(EVENT_SPSUMMON_SUCCESS)
  e${effectNum}:SetTarget(s.drawtg)
  e${effectNum}:SetOperation(s.drawop)
  c:RegisterEffect(e${effectNum})`);
      } else if (module.category === 'damage') {
        effects.push(`  --伤害效果
  local e${effectNum}=Effect.CreateEffect(c)
  e${effectNum}:SetDescription(aux.Stringid(id,${index}))
  e${effectNum}:SetCategory(CATEGORY_DAMAGE)
  e${effectNum}:SetType(EFFECT_TYPE_IGNITION)
  e${effectNum}:SetRange(LOCATION_MZONE)
  e${effectNum}:SetCountLimit(1)
  e${effectNum}:SetTarget(s.damtg)
  e${effectNum}:SetOperation(s.damop)
  c:RegisterEffect(e${effectNum})`);
      } else if (module.category === 'negate') {
        effects.push(`  --无效效果
  local e${effectNum}=Effect.CreateEffect(c)
  e${effectNum}:SetDescription(aux.Stringid(id,${index}))
  e${effectNum}:SetCategory(CATEGORY_NEGATE)
  e${effectNum}:SetType(EFFECT_TYPE_QUICK_O)
  e${effectNum}:SetCode(EVENT_CHAINING)
  e${effectNum}:SetRange(LOCATION_MZONE)
  e${effectNum}:SetCondition(s.negcon)
  e${effectNum}:SetTarget(s.negtg)
  e${effectNum}:SetOperation(s.negop)
  c:RegisterEffect(e${effectNum})`);
      }
    });

    return `function s.initial_effect(c)
${effects.join('\n')}
end`;
  }

  /**
   * 生成单个效果函数
   */
  private generateEffectFunction(
    module: EffectModule, 
    parameters: Record<string, any>,
    index: number
  ): string {
    // 编译 Handlebars 模板
    const template = this.handlebars.compile(module.luaTemplate);
    
    // 生成参数上下文
    const context = this.buildContext(parameters);
    
    // 渲染模板
    return template(context);
  }

  /**
   * 构建模板上下文
   */
  private buildContext(parameters: Record<string, any>): any {
    const context: any = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        // 处理选项值
        context[key] = { [value]: true };
      } else {
        context[key] = value;
      }
    }
    
    return context;
  }

  /**
   * 注册 Handlebars 辅助函数
   */
  private registerHelpers(): void {
    this.handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });

    this.handlebars.registerHelper('or', function(...args) {
      return args.slice(0, -1).some(Boolean);
    });

    this.handlebars.registerHelper('and', function(...args) {
      return args.slice(0, -1).every(Boolean);
    });
  }

  /**
   * 检查模块兼容性
   */
  private checkCompatibility(modules: SelectedEffectModule[]): string[] {
    const warnings: string[] = [];
    const moduleIds = modules.map(m => m.moduleId);

    for (const selected of modules) {
      const module = EFFECT_MODULES.find(m => m.id === selected.moduleId);
      if (!module) continue;

      for (const rule of module.compatibility) {
        const hasConflict = rule.moduleIds.some(id => moduleIds.includes(id));
        
        if (rule.type === 'conflicts' && hasConflict) {
          warnings.push(`冲突: ${module.name} - ${rule.reason}`);
        } else if (rule.type === 'requires' && !hasConflict) {
          warnings.push(`依赖: ${module.name} - ${rule.reason}`);
        }
      }
    }

    return warnings;
  }

  /**
   * 排序效果模块
   */
  private sortModules(modules: SelectedEffectModule[]): SelectedEffectModule[] {
    return [...modules].sort((a, b) => a.order - b.order);
  }

  /**
   * 计算脚本复杂度
   */
  private calculateComplexity(modules: SelectedEffectModule[]): number {
    let complexity = 0;
    
    for (const selected of modules) {
      const module = EFFECT_MODULES.find(m => m.id === selected.moduleId);
      if (!module) continue;

      // 基础复杂度
      complexity += 1;

      // 参数复杂度
      complexity += Object.keys(selected.parameters).length * 0.5;

      // 兼容性规则复杂度
      complexity += module.compatibility.length * 0.3;
    }

    return Math.round(complexity * 10) / 10;
  }

  /**
   * 验证生成的脚本
   */
  validateScript(lua: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查基本结构
    if (!lua.includes('local s,id,o=GetID()')) {
      errors.push('缺少标准脚本头部');
    }

    if (!lua.includes('function s.initial_effect(c)')) {
      errors.push('缺少初始化函数');
    }

    // 检查常见错误
    if (lua.includes('e:SetTarget') && !lua.includes('e:SetOperation')) {
      errors.push('有 SetTarget 但缺少 SetOperation');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
