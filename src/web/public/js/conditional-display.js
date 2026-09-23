/**
 * 条件显示管理器
 * Phase 1A: 统一管理参数的条件显示逻辑
 */

class ConditionalDisplayManager {
  constructor() {
    this.rules = new Map(); // 存储所有条件规则
    this.currentValues = {}; // 当前表单值
    this.animations = true; // 是否启用动画
  }

  /**
   * 注册参数的条件显示规则
   * @param {string} paramName - 参数名称
   * @param {object} condition - 条件对象 { parameter, value }
   */
  register(paramName, condition) {
    this.rules.set(paramName, condition);
  }

  /**
   * 批量注册规则
   * @param {Array} rules - 规则数组 [{param, condition}, ...]
   */
  registerBatch(rules) {
    rules.forEach(rule => {
      this.register(rule.param, rule.condition);
    });
  }

  /**
   * 检查参数是否应该显示
   * @param {string} paramName - 参数名称
   * @param {object} currentValues - 当前表单值
   * @returns {boolean}
   */
  shouldDisplay(paramName, currentValues) {
    const rule = this.rules.get(paramName);
    if (!rule) return true; // 无条件则始终显示

    const { parameter, value } = rule;
    const currentVal = currentValues[parameter];

    // 处理数组值（多选）
    if (Array.isArray(value)) {
      return value.includes(currentVal);
    }

    // 处理单值
    return currentVal === value;
  }

  /**
   * 更新UI显示状态（带动画）
   * @param {string} paramName - 参数名称
   * @param {boolean} shouldShow - 是否显示
   */
  updateDisplay(paramName, shouldShow) {
    const element = document.getElementById(`param_${paramName}`);
    if (!element) return;

    const parentGroup = element.closest('.param-group, .param-field');
    if (!parentGroup) return;

    if (shouldShow) {
      parentGroup.classList.remove('hidden');
      parentGroup.classList.add('visible');
      
      // 动画效果
      if (this.animations) {
        parentGroup.style.maxHeight = '1000px';
        parentGroup.style.opacity = '1';
      }
    } else {
      parentGroup.classList.add('hidden');
      parentGroup.classList.remove('visible');
      
      // 动画效果
      if (this.animations) {
        parentGroup.style.maxHeight = '0';
        parentGroup.style.opacity = '0';
      }
      
      // 清空隐藏参数的值（避免提交无效数据）
      const input = element.querySelector('input, select, textarea');
      if (input) {
        input.value = '';
      }
    }
  }

  /**
   * 更新所有参数的显示状态
   * @param {object} currentValues - 当前表单值
   */
  updateAll(currentValues) {
    this.currentValues = currentValues;
    
    this.rules.forEach((condition, paramName) => {
      const shouldShow = this.shouldDisplay(paramName, currentValues);
      this.updateDisplay(paramName, shouldShow);
    });
  }

  /**
   * 监听表单变化
   * @param {HTMLElement} formEl - 表单元素
   */
  observe(formEl) {
    if (!formEl) return;

    // 监听所有输入变化
    formEl.addEventListener('change', (e) => {
      const target = e.target;
      if (!target.name && !target.id) return;

      // 收集当前所有表单值
      const values = this.collectFormValues(formEl);
      this.updateAll(values);
    });

    // 监听输入事件（实时更新）
    formEl.addEventListener('input', this.debounce((e) => {
      const values = this.collectFormValues(formEl);
      this.updateAll(values);
    }, 300));
  }

  /**
   * 收集表单所有值
   * @param {HTMLElement} formEl - 表单元素
   * @returns {object}
   */
  collectFormValues(formEl) {
    const values = {};
    const inputs = formEl.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const name = input.name || input.id.replace('param_', '');
      if (!name) return;

      if (input.type === 'checkbox') {
        values[name] = input.checked;
      } else if (input.type === 'radio') {
        if (input.checked) {
          values[name] = input.value;
        }
      } else {
        values[name] = input.value;
      }
    });

    return values;
  }

  /**
   * 清空所有规则
   */
  clear() {
    this.rules.clear();
    this.currentValues = {};
  }

  /**
   * 获取所有规则（调试用）
   */
  getAllRules() {
    return Array.from(this.rules.entries());
  }

  /**
   * 工具函数：防抖
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

/**
 * 数值验证器
 */
class ParameterValidator {
  constructor() {
    this.validators = new Map();
  }

  /**
   * 注册验证规则
   * @param {string} paramName - 参数名称
   * @param {object} rules - 验证规则 { min, max, required, type }
   */
  register(paramName, rules) {
    this.validators.set(paramName, rules);
  }

  /**
   * 验证参数值
   * @param {string} paramName - 参数名称
   * @param {any} value - 参数值
   * @returns {object} { valid, message, type }
   */
  validate(paramName, value) {
    const rules = this.validators.get(paramName);
    if (!rules) return { valid: true, message: '', type: 'info' };

    // 必填验证
    if (rules.required && !value && value !== 0) {
      return { valid: false, message: '此字段为必填项', type: 'error' };
    }

    // 类型验证
    if (rules.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, message: '请输入数字', type: 'error' };
      }

      // 范围验证
      if (rules.min !== undefined && num < rules.min) {
        return { valid: false, message: `最小值为 ${rules.min}`, type: 'warn' };
      }
      if (rules.max !== undefined && num > rules.max) {
        return { valid: false, message: `最大值为 ${rules.max}`, type: 'warn' };
      }
    }

    // 自定义验证函数
    if (rules.customValidator) {
      return rules.customValidator(value);
    }

    return { valid: true, message: '数值有效', type: 'info' };
  }

  /**
   * 实时验证并更新UI
   * @param {HTMLInputElement} inputEl - 输入元素
   */
  validateInput(inputEl) {
    const paramName = inputEl.id.replace('param_', '');
    const value = inputEl.value;
    const result = this.validate(paramName, value);

    // 更新输入框状态
    inputEl.classList.remove('invalid', 'warn');
    if (!result.valid) {
      if (result.type === 'error') {
        inputEl.classList.add('invalid');
      } else if (result.type === 'warn') {
        inputEl.classList.add('warn');
      }
    }

    // 更新状态提示
    const statusEl = document.getElementById(`status_${paramName}`);
    if (statusEl) {
      const iconMap = {
        error: '✗',
        warn: '⚠',
        info: 'ℹ'
      };
      const icon = iconMap[result.type] || '✓';
      
      statusEl.innerHTML = `
        <span class="status-icon ${result.type}">${icon}</span>
        <span class="status-text">${result.message}</span>
      `;
    }

    return result;
  }

  /**
   * 验证所有参数
   * @param {HTMLElement} formEl - 表单元素
   * @returns {boolean} - 是否全部有效
   */
  validateAll(formEl) {
    const inputs = formEl.querySelectorAll('input[type="number"], input[type="text"]');
    let allValid = true;

    inputs.forEach(input => {
      const result = this.validateInput(input);
      if (!result.valid && result.type === 'error') {
        allValid = false;
      }
    });

    return allValid;
  }
}

/**
 * 快捷数值按钮管理器
 */
class QuickValueManager {
  /**
   * 设置快捷值
   * @param {string} inputId - 输入框ID
   * @param {number} value - 数值
   */
  static setQuickValue(inputId, value) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // 更新按钮激活状态
    const container = input.closest('.number-input-wrapper, .param-field');
    if (container) {
      const buttons = container.querySelectorAll('.quick-btn');
      buttons.forEach(btn => {
        btn.classList.remove('active');
        const btnValue = parseInt(btn.textContent);
        if (btnValue === value) {
          btn.classList.add('active');
        }
      });
    }
  }

  /**
   * 渲染快捷按钮组
   * @param {Array} values - 快捷值数组
   * @param {string} inputId - 关联的输入框ID
   * @returns {string} HTML
   */
  static renderQuickButtons(values, inputId) {
    return values.map(val => `
      <button type="button" 
              class="quick-btn" 
              onclick="QuickValueManager.setQuickValue('${inputId}', ${val})">
        ${val > 0 ? '+' : ''}${val}
      </button>
    `).join('');
  }
}

// 导出供全局使用
window.ConditionalDisplayManager = ConditionalDisplayManager;
window.ParameterValidator = ParameterValidator;
window.QuickValueManager = QuickValueManager;
