import { ValueSource } from './types.js';

/**
 * 动态数值来源生成器
 * 根据 ValueSource 配置生成对应的 Lua 代码
 */
export class ValueSourceGenerator {
  /**
   * 生成数值计算的 Lua 代码
   * @param valueSource 数值来源配置
   * @param contextVar 上下文变量名（例如 'e', 'tc'）
   * @returns Lua 代码字符串
   */
  static generateValueCode(valueSource: ValueSource, contextVar: string = 'e'): string {
    switch (valueSource.mode) {
      case 'fixed':
        return `local val=${valueSource.fixedValue || 0}`;
      
      case 'count_times':
        return this.generateCountTimesCode(valueSource);
      
      case 'grave_count':
        return this.generateGraveCountCode(valueSource);
      
      case 'overlay_count':
        return this.generateOverlayCountCode(contextVar);
      
      case 'level_ref':
        return this.generateLevelRefCode(valueSource, contextVar);
      
      case 'atk_ref':
        return this.generateAtkRefCode(valueSource, contextVar);
      
      case 'def_ref':
        return this.generateDefRefCode(valueSource, contextVar);
      
      case 'battle_count':
        return this.generateBattleCountCode(valueSource);
      
      default:
        return 'local val=0';
    }
  }

  /**
   * Phase 2 扩展：生成生命值差值模式的代码
   * 用于「双方基本分差值的一半」等效果
   */
  static generateLpDiffCode(mode: 'half' | 'full' | 'quarter' = 'half'): string {
    const expressions = {
      half: 'math.abs(Duel.GetLP(tp)-Duel.GetLP(1-tp))/2',
      full: 'math.abs(Duel.GetLP(tp)-Duel.GetLP(1-tp))',
      quarter: 'math.abs(Duel.GetLP(tp)-Duel.GetLP(1-tp))/4'
    };
    return `local val=math.floor(${expressions[mode]})`;
  }

  /**
   * Phase 2 扩展：生成战斗伤害关联代码
   * 用于「战斗造成的伤害数值」效果
   */
  static generateBattleDamageCode(): string {
    return `local val=e:GetLabel() -- 战斗伤害数值由 e:SetLabel(dam) 存储`;
  }

  /**
   * Phase 2 扩展：生成除外区计数代码
   * 用于「双方除外区的卡片总数×100」等效果
   */
  static generateRemovedCountCode(controller: 'tp' | '1-tp' | 'both' = 'both', multiplier: number = 100): string {
    let countCode = '';
    if (controller === 'both') {
      countCode = 'Duel.GetFieldGroupCount(tp,LOCATION_REMOVED,LOCATION_REMOVED)';
    } else if (controller === 'tp') {
      countCode = 'Duel.GetFieldGroupCount(tp,LOCATION_REMOVED,0)';
    } else {
      countCode = 'Duel.GetFieldGroupCount(tp,0,LOCATION_REMOVED)';
    }
    return `local ct=${countCode}\n  local val=ct*${multiplier}`;
  }

  /**
   * Phase 2 扩展：生成手牌数差值代码
   * 用于「对方手牌数量－自己手牌数量」等效果
   */
  static generateHandDiffCode(mode: 'opp_minus_self' | 'self_minus_opp' = 'opp_minus_self', multiplier: number = 1): string {
    if (mode === 'opp_minus_self') {
      return `local diff=Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)-Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)\n  local val=math.max(0,diff*${multiplier})`;
    } else {
      return `local diff=Duel.GetFieldGroupCount(tp,LOCATION_HAND,0)-Duel.GetFieldGroupCount(tp,0,LOCATION_HAND)\n  local val=math.max(0,diff*${multiplier})`;
    }
  }

  /**
   * Phase 2 扩展：生成回合数关联代码
   * 用于「回合数×100」等效果
   */
  static generateTurnCountCode(multiplier: number = 100): string {
    return `local val=Duel.GetTurnCount()*${multiplier}`;
  }

  /**
   * Phase 2 扩展：生成卡组剩余数关联代码
   * 用于「卡组剩余卡片数量×200」等效果
   */
  static generateDeckCountCode(controller: 'tp' | '1-tp' = 'tp', multiplier: number = 200): string {
    const ctrlParam = controller === 'tp' ? 'tp,LOCATION_DECK,0' : 'tp,0,LOCATION_DECK';
    return `local ct=Duel.GetFieldGroupCount(${ctrlParam})\n  local val=ct*${multiplier}`;
  }

  /**
   * Phase 2 扩展：生成代价数量关联代码
   * 用于「作为 cost 送去墓地的卡片数量×500」等效果
   */
  static generateCostCountCode(costType: 'material' | 'release' | 'discard' = 'discard', multiplier: number = 500): string {
    return `local ct=e:GetLabel() -- cost 数量由 e:SetLabel(ct) 存储\n  local val=ct*${multiplier}`;
  }

  /**
   * 生成计数×倍率模式的代码
   */
  private static generateCountTimesCode(valueSource: ValueSource): string {
    const filter = valueSource.countFilter;
    if (!filter) return 'local val=0';

    const location = filter.location || 'LOCATION_MZONE';
    const multiplier = valueSource.multiplier || 500;
    
    // 生成过滤函数
    let filterFunc = 'function(c) return c:IsFaceup()';
    
    if (filter.cardType) {
      filterFunc += ` and c:IsType(${filter.cardType})`;
    }
    if (filter.race) {
      filterFunc += ` and c:IsRace(RACE_${filter.race})`;
    }
    if (filter.attribute) {
      filterFunc += ` and c:IsAttribute(ATTRIBUTE_${filter.attribute})`;
    }
    if (filter.levelCondition) {
      const op = filter.levelCondition.operator === 'eq' ? '==' : 
                 filter.levelCondition.operator === 'ge' ? '>=' : '<=';
      filterFunc += ` and c:GetLevel()${op}${filter.levelCondition.value}`;
    }
    
    filterFunc += ' end';

    // 生成控制者参数
    let controllerParams = 'tp,LOCATION_MZONE,0';
    if (filter.controller === '1-tp') {
      controllerParams = 'tp,0,LOCATION_MZONE';
    } else if (filter.controller === 'LOCATION_ONFIELD') {
      controllerParams = 'tp,LOCATION_MZONE,LOCATION_MZONE';
    }

    return `local ct=Duel.GetMatchingGroupCount(${filterFunc},${controllerParams},nil)
  local val=ct*${multiplier}`;
  }

  /**
   * 生成墓地计数模式的代码
   */
  private static generateGraveCountCode(valueSource: ValueSource): string {
    const filter = valueSource.countFilter;
    const multiplier = valueSource.multiplier || 500;
    
    let filterFunc = 'function(c) return true';
    
    if (filter?.cardType) {
      filterFunc = `function(c) return c:IsType(${filter.cardType})`;
    }
    if (filter?.race) {
      filterFunc += ` and c:IsRace(RACE_${filter.race})`;
    }
    
    filterFunc += ' end';

    let controllerParams = 'tp,LOCATION_GRAVE,0';
    if (filter?.controller === '1-tp') {
      controllerParams = 'tp,0,LOCATION_GRAVE';
    } else if (filter?.controller === 'LOCATION_ONFIELD') {
      controllerParams = 'tp,LOCATION_GRAVE,LOCATION_GRAVE';
    }

    return `local ct=Duel.GetMatchingGroupCount(${filterFunc},${controllerParams},nil)
  local val=ct*${multiplier}`;
  }

  /**
   * 生成超量素材计数模式的代码
   */
  private static generateOverlayCountCode(contextVar: string): string {
    return `local val=${contextVar}:GetOverlayCount()*{{multiplier}}`;
  }

  /**
   * 生成等级参照模式的代码
   */
  private static generateLevelRefCode(valueSource: ValueSource, contextVar: string): string {
    const multiplier = valueSource.multiplier || 200;
    const target = valueSource.refTarget === 'self' ? 'e:GetHandler()' : 'tc';
    
    return `local val=${target}:GetLevel()*${multiplier}`;
  }

  /**
   * 生成攻击力参照模式的代码
   */
  private static generateAtkRefCode(valueSource: ValueSource, contextVar: string): string {
    const target = valueSource.refTarget === 'self' ? 'e:GetHandler()' : 'tc';
    const operation = valueSource.refOperation || 'multiply';
    const multiplier = valueSource.refMultiplier || 1;
    
    let code = `local baseVal=${target}:GetAttack()\n`;
    
    switch (operation) {
      case 'multiply':
        code += `  local val=baseVal*${multiplier}`;
        break;
      case 'half':
        code += '  local val=math.floor(baseVal/2)';
        break;
      case 'double':
        code += '  local val=baseVal*2';
        break;
      case 'same':
        code += '  local val=baseVal';
        break;
      default:
        code += '  local val=baseVal';
    }
    
    return code;
  }

  /**
   * 生成守备力参照模式的代码
   */
  private static generateDefRefCode(valueSource: ValueSource, contextVar: string): string {
    const target = valueSource.refTarget === 'self' ? 'e:GetHandler()' : 'tc';
    const operation = valueSource.refOperation || 'multiply';
    const multiplier = valueSource.refMultiplier || 1;
    
    let code = `local baseVal=${target}:GetDefense()\n`;
    
    switch (operation) {
      case 'multiply':
        code += `  local val=baseVal*${multiplier}`;
        break;
      case 'half':
        code += '  local val=math.floor(baseVal/2)';
        break;
      case 'double':
        code += '  local val=baseVal*2';
        break;
      case 'same':
        code += '  local val=baseVal';
        break;
      default:
        code += '  local val=baseVal';
    }
    
    return code;
  }

  /**
   * 生成战斗计数模式的代码
   */
  private static generateBattleCountCode(valueSource: ValueSource): string {
    const multiplier = valueSource.battleMultiplier || 500;
    return `local ct=e:GetHandler():GetBattledGroupCount()
  local val=ct*${multiplier}`;
  }

  /**
   * 生成需要过滤函数的辅助函数代码
   */
  static generateFilterFunction(valueSource: ValueSource, functionName: string = 'atkfilter'): string {
    if (valueSource.mode === 'count_times' || valueSource.mode === 'grave_count') {
      const filter = valueSource.countFilter;
      if (!filter) return '';

      let filterBody = 'return c:IsFaceup()';
      
      if (filter.cardType) {
        filterBody += ` and c:IsType(${filter.cardType})`;
      }
      if (filter.race) {
        filterBody += ` and c:IsRace(RACE_${filter.race})`;
      }
      if (filter.attribute) {
        filterBody += ` and c:IsAttribute(ATTRIBUTE_${filter.attribute})`;
      }
      if (filter.levelCondition) {
        const op = filter.levelCondition.operator === 'eq' ? '==' : 
                   filter.levelCondition.operator === 'ge' ? '>=' : '<=';
        filterBody += ` and c:GetLevel()${op}${filter.levelCondition.value}`;
      }

      return `function s.${functionName}(c)
  ${filterBody}
end`;
    }
    
    return '';
  }
}
