/**
 * Phase 11: 智能效果推荐系统
 * 基于当前卡片类型和已选效果，推荐相关效果模块
 */

class SmartEffectRecommender {
  constructor() {
    this.recommendations = [];
    this.moduleLibrary = [];
    this.currentCardType = 'monster';
    this.selectedModules = [];
  }

  /**
   * 初始化推荐系统
   */
  async init() {
    await this.loadModuleLibrary();
    this.bindCardTypeChange();
    this.createRecommendationPanel();
    this.updateRecommendations();
    console.log('[Phase 11] Smart Effect Recommender initialized');
  }

  /**
   * 加载效果模块库
   */
  async loadModuleLibrary() {
    // 从 ModuleSelector 获取模块库
    if (typeof window.effectModules !== 'undefined') {
      this.moduleLibrary = window.effectModules || [];
    } else if (typeof moduleSelector !== 'undefined') {
      this.moduleLibrary = moduleSelector.modules || [];
    }

    console.log('[SmartEffectRecommender] Loaded', this.moduleLibrary.length, 'modules');
  }

  /**
   * 监听卡片类型变化
   */
  bindCardTypeChange() {
    // 监听主卡类型变化
    document.addEventListener('cardTypeChange', (e) => {
      this.currentCardType = e.detail.type;
      this.updateRecommendations();
    });

    // 监听效果添加/移除
    document.addEventListener('effectModuleChange', (e) => {
      this.selectedModules = e.detail.modules || [];
      this.updateRecommendations();
    });
  }

  /**
   * 创建推荐面板
   */
  createRecommendationPanel() {
    const existingPanel = document.getElementById('smartRecommendationPanel');
    if (existingPanel) return;

    const wizardContainer = document.querySelector('.effect-wizard-container');
    if (!wizardContainer) return;

    // 使用 DOM API 安全创建面板（避免 innerHTML）
    const panel = document.createElement('div');
    panel.id = 'smartRecommendationPanel';
    panel.className = 'smart-recommendation-panel';
    
    const header = document.createElement('div');
    header.className = 'recommendation-header';
    
    const title = document.createElement('h3');
    title.textContent = '💡 智能推荐';
    
    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'recommendation-refresh-btn';
    refreshBtn.textContent = '🔄 刷新';
    // 使用事件监听器替代 onclick
    refreshBtn.addEventListener('click', () => this.updateRecommendations());
    
    header.appendChild(title);
    header.appendChild(refreshBtn);
    
    const body = document.createElement('div');
    body.className = 'recommendation-body';
    
    const list = document.createElement('div');
    list.className = 'recommendation-list';
    list.id = 'recommendationList';
    
    const loadingMsg = document.createElement('p');
    loadingMsg.className = 'recommendation-empty';
    loadingMsg.textContent = '正在分析...';
    list.appendChild(loadingMsg);
    
    body.appendChild(list);
    panel.appendChild(header);
    panel.appendChild(body);
    
    wizardContainer.insertBefore(panel, wizardContainer.firstChild);
  }

  /**
   * 更新推荐列表
   */
  updateRecommendations() {
    this.recommendations = this.generateRecommendations();
    this.renderRecommendations();
  }

  /**
   * 生成推荐效果
   */
  generateRecommendations() {
    const recommendations = [];

    // 规则 1: 基于卡片类型推荐
    const typeBasedRecs = this.getTypeBasedRecommendations();
    recommendations.push(...typeBasedRecs);

    // 规则 2: 基于已选效果推荐相关效果
    const relatedRecs = this.getRelatedRecommendations();
    recommendations.push(...relatedRecs);

    // 规则 3: 推荐常用组合
    const comboRecs = this.getComboRecommendations();
    recommendations.push(...comboRecs);

    // 去重并按优先级排序
    return this.deduplicateAndSort(recommendations);
  }

  /**
   * 基于卡片类型的推荐
   */
  getTypeBasedRecommendations() {
    const recommendations = [];

    if (this.currentCardType === 'monster') {
      // 怪兽卡推荐：召唤、检索、破坏、特召
      const monsterPriority = ['search_deck', 'destroy_target', 'special_summon_self', 'negate_effect'];
      monsterPriority.forEach((id, index) => {
        const module = this.moduleLibrary.find(m => m.id === id);
        if (module && !this.isSelected(id)) {
          recommendations.push({
            module,
            reason: '怪兽卡常用效果',
            priority: 10 - index
          });
        }
      });
    } else if (this.currentCardType === 'spell') {
      // 魔法卡推荐：检索、抽卡、破坏
      const spellPriority = ['search_deck', 'draw_cards', 'destroy_target'];
      spellPriority.forEach((id, index) => {
        const module = this.moduleLibrary.find(m => m.id === id);
        if (module && !this.isSelected(id)) {
          recommendations.push({
            module,
            reason: '魔法卡常用效果',
            priority: 10 - index
          });
        }
      });
    } else if (this.currentCardType === 'trap') {
      // 陷阱卡推荐：无效、破坏、保护
      const trapPriority = ['negate_effect', 'destroy_target', 'battle_indestructible'];
      trapPriority.forEach((id, index) => {
        const module = this.moduleLibrary.find(m => m.id === id);
        if (module && !this.isSelected(id)) {
          recommendations.push({
            module,
            reason: '陷阱卡常用效果',
            priority: 10 - index
          });
        }
      });
    }

    return recommendations;
  }

  /**
   * 基于已选效果的相关推荐
   */
  getRelatedRecommendations() {
    const recommendations = [];

    // 效果关联规则
    const relatedRules = {
      'search_deck': ['add_from_deck', 'special_summon_from_deck'],
      'destroy_target': ['target_protection', 'battle_indestructible'],
      'special_summon_self': ['summon_restriction', 'fusion_summon'],
      'draw_cards': ['mill_cards', 'deck_top_manipulation'],
      'negate_effect': ['hand_deck_trigger_effect', 'chain_block']
    };

    this.selectedModules.forEach(selectedId => {
      const related = relatedRules[selectedId] || [];
      related.forEach(relatedId => {
        const module = this.moduleLibrary.find(m => m.id === relatedId);
        if (module && !this.isSelected(relatedId)) {
          recommendations.push({
            module,
            reason: `与「${this.getModuleName(selectedId)}」相关`,
            priority: 7
          });
        }
      });
    });

    return recommendations;
  }

  /**
   * 推荐常用组合
   */
  getComboRecommendations() {
    const recommendations = [];

    // 常用组合规则
    const combos = [
      { modules: ['search_deck', 'special_summon_from_hand'], reason: '检索+特召组合' },
      { modules: ['destroy_target', 'draw_cards'], reason: '破坏+抽卡组合' },
      { modules: ['negate_effect', 'destroy_target'], reason: '无效+破坏组合' }
    ];

    combos.forEach(combo => {
      const hasFirst = this.isSelected(combo.modules[0]);
      const hasSecond = this.isSelected(combo.modules[1]);

      if (hasFirst && !hasSecond) {
        const module = this.moduleLibrary.find(m => m.id === combo.modules[1]);
        if (module) {
          recommendations.push({ module, reason: combo.reason, priority: 8 });
        }
      } else if (!hasFirst && hasSecond) {
        const module = this.moduleLibrary.find(m => m.id === combo.modules[0]);
        if (module) {
          recommendations.push({ module, reason: combo.reason, priority: 8 });
        }
      }
    });

    return recommendations;
  }

  /**
   * 去重并排序
   */
  deduplicateAndSort(recommendations) {
    const seen = new Set();
    const unique = recommendations.filter(rec => {
      if (seen.has(rec.module.id)) return false;
      seen.add(rec.module.id);
      return true;
    });

    return unique.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }

  /**
   * 渲染推荐列表
   */
  renderRecommendations() {
    const list = document.getElementById('recommendationList');
    if (!list) return;

    if (this.recommendations.length === 0) {
      list.textContent = ''; // 清空现有内容
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'recommendation-empty';
      emptyMsg.textContent = '暂无推荐效果';
      list.appendChild(emptyMsg);
      return;
    }

    // 使用 DOM API 安全创建元素（防止 XSS）
    list.textContent = ''; // 清空现有内容
    
    this.recommendations.forEach((rec, index) => {
      const item = document.createElement('div');
      item.className = 'recommendation-item';
      item.dataset.moduleId = this.sanitizeModuleId(rec.module.id);
      
      const content = document.createElement('div');
      content.className = 'recommendation-content';
      
      const title = document.createElement('h4');
      title.className = 'recommendation-title';
      title.textContent = rec.module.name; // 安全插入文本
      
      const reason = document.createElement('p');
      reason.className = 'recommendation-reason';
      reason.textContent = rec.reason; // 安全插入文本
      
      content.appendChild(title);
      content.appendChild(reason);
      
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'recommendation-add-btn';
      addBtn.textContent = '➕ 添加';
      // 使用事件监听器替代 onclick（更安全且符合 CSP）
      addBtn.addEventListener('click', () => this.handleAddEffect(rec.module.id));
      
      item.appendChild(content);
      item.appendChild(addBtn);
      list.appendChild(item);
    });
  }
  
  /**
   * 清理模块 ID（防止注入）
   */
  sanitizeModuleId(moduleId) {
    if (typeof moduleId !== 'string') return '';
    // 只允许字母、数字、下划线、连字符
    return moduleId.replace(/[^a-zA-Z0-9_-]/g, '');
  }
  
  /**
   * 处理添加效果（内部方法）
   */
  handleAddEffect(moduleId) {
    const sanitizedId = this.sanitizeModuleId(moduleId);
    if (!sanitizedId) {
      console.warn('[SmartEffectRecommender] Invalid module ID:', moduleId);
      return;
    }
    
    // 调用现有的效果添加逻辑
    if (typeof addEffectModule === 'function') {
      addEffectModule(sanitizedId);
    }
    
    // 更新推荐
    if (!this.selectedModules.includes(sanitizedId)) {
      this.selectedModules.push(sanitizedId);
    }
    this.updateRecommendations();
  }

  /**
   * 检查模块是否已选
   */
  isSelected(moduleId) {
    return this.selectedModules.includes(moduleId);
  }

  /**
   * 获取模块名称
   */
  getModuleName(moduleId) {
    const module = this.moduleLibrary.find(m => m.id === moduleId);
    return module ? module.name : moduleId;
  }
}

// 全局实例
let smartEffectRecommender = null;

// 初始化函数
async function initSmartEffectRecommender() {
  if (!smartEffectRecommender) {
    smartEffectRecommender = new SmartEffectRecommender();
    await smartEffectRecommender.init();
  }
}

// 刷新推荐
function refreshRecommendations() {
  if (smartEffectRecommender) {
    smartEffectRecommender.updateRecommendations();
  }
}

// 添加推荐效果（已废弃，保留向后兼容）
function addRecommendedEffect(moduleId) {
  console.warn('[Deprecated] addRecommendedEffect() is deprecated. Use SmartEffectRecommender.handleAddEffect() instead.');
  if (smartEffectRecommender) {
    smartEffectRecommender.handleAddEffect(moduleId);
  }
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.SmartEffectRecommender = SmartEffectRecommender;
  window.initSmartEffectRecommender = initSmartEffectRecommender;
  window.refreshRecommendations = refreshRecommendations;
  window.addRecommendedEffect = addRecommendedEffect;
}
