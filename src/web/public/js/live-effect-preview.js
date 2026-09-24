/**
 * Phase 11: 效果预览实时渲染引擎
 * 实时监听效果向导变化，自动生成预览文本和 Lua 脚本
 */

class LiveEffectPreview {
  constructor() {
    this.previewContainer = null;
    this.debounceTimer = null;
    this.debounceDelay = 300; // 300ms 防抖
    this.lastPreviewText = '';
    this.lastPreviewScript = '';
  }

  /**
   * 初始化实时预览系统
   */
  init() {
    // 创建预览容器（如果不存在）
    this.createPreviewContainer();
    
    // 绑定所有效果向导输入事件
    this.bindEffectInputEvents();
    
    // 首次渲染
    this.updatePreview();
  }

  /**
   * 创建预览容器
   */
  createPreviewContainer() {
    const existingContainer = document.getElementById('liveEffectPreview');
    if (existingContainer) {
      this.previewContainer = existingContainer;
      return;
    }

    // 在效果向导区域添加实时预览面板
    const wizardContainer = document.querySelector('.effect-wizard-container');
    if (!wizardContainer) return;

    // 使用 DOM API 安全创建面板（避免 innerHTML + onclick）
    const previewPanel = document.createElement('div');
    previewPanel.id = 'liveEffectPreview';
    previewPanel.className = 'live-preview-panel';
    
    // 创建 header
    const header = document.createElement('div');
    header.className = 'preview-header';
    
    const title = document.createElement('h3');
    title.textContent = '📝 实时预览';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'preview-toggle-btn';
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon';
    toggleIcon.textContent = '▼';
    toggleBtn.appendChild(toggleIcon);
    // 使用事件监听器替代 onclick
    toggleBtn.addEventListener('click', () => this.togglePanel());
    
    header.appendChild(title);
    header.appendChild(toggleBtn);
    
    // 创建 body
    const body = document.createElement('div');
    body.className = 'preview-body';
    
    // 效果文本部分
    const textSection = document.createElement('div');
    textSection.className = 'preview-section';
    const textTitle = document.createElement('h4');
    textTitle.textContent = '效果文本';
    const textOutput = document.createElement('div');
    textOutput.className = 'preview-text-output';
    textOutput.id = 'previewTextOutput';
    textOutput.textContent = '暂无效果';
    textSection.appendChild(textTitle);
    textSection.appendChild(textOutput);
    
    // Lua 脚本部分
    const scriptSection = document.createElement('div');
    scriptSection.className = 'preview-section';
    const scriptTitle = document.createElement('h4');
    scriptTitle.textContent = 'Lua 脚本片段';
    const scriptOutput = document.createElement('pre');
    scriptOutput.className = 'preview-script-output';
    scriptOutput.id = 'previewScriptOutput';
    scriptOutput.textContent = '-- 暂无脚本';
    scriptSection.appendChild(scriptTitle);
    scriptSection.appendChild(scriptOutput);
    
    body.appendChild(textSection);
    body.appendChild(scriptSection);
    
    previewPanel.appendChild(header);
    previewPanel.appendChild(body);
    
    wizardContainer.appendChild(previewPanel);
    this.previewContainer = previewPanel;
  }
  
  /**
   * 切换面板展开/折叠
   */
  togglePanel() {
    const panel = document.getElementById('liveEffectPreview');
    if (!panel) return;
    
    panel.classList.toggle('collapsed');
    const icon = panel.querySelector('.toggle-icon');
    if (icon) {
      icon.textContent = panel.classList.contains('collapsed') ? '▶' : '▼';
    }
  }

  /**
   * 绑定效果向导输入事件
   */
  bindEffectInputEvents() {
    // 监听所有效果向导的 input/select/change 事件
    const wizardContainer = document.querySelector('.effect-wizard-container');
    if (!wizardContainer) return;

    // 使用事件委托监听所有输入变化
    wizardContainer.addEventListener('input', (e) => {
      if (e.target.matches('input, select, textarea')) {
        this.scheduleUpdate();
      }
    });

    wizardContainer.addEventListener('change', (e) => {
      if (e.target.matches('input, select')) {
        this.scheduleUpdate();
      }
    });
  }

  /**
   * 防抖调度更新
   */
  scheduleUpdate() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.updatePreview();
    }, this.debounceDelay);
  }

  /**
   * 更新预览内容
   */
  async updatePreview() {
    try {
      // 收集当前效果配置
      const effectConfig = this.collectEffectConfig();
      
      // 生成效果文本
      const effectText = this.generateEffectText(effectConfig);
      
      // 生成 Lua 脚本片段
      const luaScript = await this.generateLuaScript(effectConfig);
      
      // 更新 UI
      this.renderPreview(effectText, luaScript);
      
      // 触发自定义事件，通知其他组件
      this.dispatchPreviewUpdateEvent(effectText, luaScript);
      
    } catch (error) {
      console.warn('[LiveEffectPreview] Update error:', error);
    }
  }

  /**
   * 收集当前效果配置
   */
  collectEffectConfig() {
    // 从 state.wizardEffects 获取当前配置
    if (typeof state === 'undefined' || !state.wizardEffects) {
      return [];
    }

    return state.wizardEffects.map((effect, index) => ({
      index,
      ...effect
    }));
  }

  /**
   * 生成效果文本描述
   */
  generateEffectText(effectConfig) {
    if (!effectConfig || effectConfig.length === 0) {
      return '暂无效果';
    }

    const effectTexts = effectConfig.map((effect, index) => {
      const circleNum = ['①', '②', '③', '④', '⑤'][index] || `⑥`;
      
      // 时机描述
      const timingMap = {
        'summon_success': '这张卡召唤成功时',
        'ignition': '主要阶段可以发动',
        'quick': '对方回合也能发动',
        'trigger': '满足条件时发动',
        'field': '这张卡在场上表侧表示存在的场合'
      };
      const timingText = timingMap[effect.timing] || '效果发动时';

      // 行动描述
      const actionMap = {
        'search_deck': '从卡组把1张卡加入手卡',
        'destroy_target': '把1张卡破坏',
        'special_summon': '特殊召唤1只怪兽',
        'draw_cards': '抽卡',
        'negate': '无效'
      };
      const actionText = actionMap[effect.action] || '执行效果';

      return `${circleNum}：${timingText}，${actionText}。`;
    });

    return effectTexts.join('\n');
  }

  /**
   * 生成 Lua 脚本片段
   */
  async generateLuaScript(effectConfig) {
    if (!effectConfig || effectConfig.length === 0) {
      return '-- 暂无脚本';
    }

    // 使用 ClientScriptAssembler 生成完整脚本
    if (typeof state !== 'undefined' && state.assembler) {
      try {
        const fullScript = await state.assembler.generateScript(state.cardData, state.effectConfig);
        
        // 提取关键片段（前 20 行）
        const lines = fullScript.split('\n').slice(0, 20);
        return lines.join('\n') + '\n-- ... (完整脚本已生成)';
      } catch (error) {
        return '-- 脚本生成失败：' + error.message;
      }
    }

    // 降级：生成简单的占位脚本
    return effectConfig.map((effect, index) => {
      return `-- 效果 ${index + 1}: ${effect.action}\nfunction s.e${index + 1}con(e,tp,eg,ep,ev,re,r,rp)\n  return true\nend`;
    }).join('\n\n');
  }

  /**
   * 渲染预览内容
   */
  renderPreview(effectText, luaScript) {
    const textOutput = document.getElementById('previewTextOutput');
    const scriptOutput = document.getElementById('previewScriptOutput');

    if (textOutput && effectText !== this.lastPreviewText) {
      textOutput.textContent = effectText;
      textOutput.classList.add('preview-updating');
      setTimeout(() => textOutput.classList.remove('preview-updating'), 300);
      this.lastPreviewText = effectText;
    }

    if (scriptOutput && luaScript !== this.lastPreviewScript) {
      scriptOutput.textContent = luaScript;
      scriptOutput.classList.add('preview-updating');
      setTimeout(() => scriptOutput.classList.remove('preview-updating'), 300);
      this.lastPreviewScript = luaScript;
    }
  }

  /**
   * 派发预览更新事件
   */
  dispatchPreviewUpdateEvent(effectText, luaScript) {
    const event = new CustomEvent('effectPreviewUpdate', {
      detail: { effectText, luaScript }
    });
    document.dispatchEvent(event);
  }
}

// 全局实例
let liveEffectPreview = null;

// 初始化函数（在 DOMContentLoaded 后调用）
function initLiveEffectPreview() {
  if (!liveEffectPreview) {
    liveEffectPreview = new LiveEffectPreview();
    liveEffectPreview.init();
    console.log('[Phase 11] Live Effect Preview initialized');
  }
}

// 切换预览面板展开/折叠（已废弃，保留向后兼容）
function togglePreviewPanel() {
  console.warn('[Deprecated] togglePreviewPanel() is deprecated. Use LiveEffectPreview.togglePanel() instead.');
  if (liveEffectPreview) {
    liveEffectPreview.togglePanel();
  }
}

// 导出到全局（兼容现有代码）
if (typeof window !== 'undefined') {
  window.LiveEffectPreview = LiveEffectPreview;
  window.initLiveEffectPreview = initLiveEffectPreview;
  window.togglePreviewPanel = togglePreviewPanel;
}
