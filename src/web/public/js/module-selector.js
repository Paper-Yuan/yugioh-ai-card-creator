/**
 * 效果模块选择器管理器
 * Phase 1A: 搜索优先 + 分类折叠
 */

class ModuleSelectorManager {
  constructor(modules, containerEl) {
    this.modules = modules; // 20个效果模块（17个原有 + 3个新增）
    this.containerEl = containerEl;
    this.selectedModuleId = null;
    this.recentModules = this.loadRecentModules();
    this.searchEngine = new ModuleSearchEngine(modules);
    
    // 分类定义
    this.categories = {
      summon: { name: '召唤相关', icon: '🚀', ids: [] },
      search: { name: '检索效果', icon: '🔍', ids: [] },
      destroy: { name: '破坏效果', icon: '💥', ids: [] },
      draw: { name: '抽卡效果', icon: '📝', ids: [] },
      damage: { name: '伤害效果', icon: '⚡', ids: [] },
      negate: { name: '无效效果', icon: '🚫', ids: [] },
      banish: { name: '除外效果', icon: '⛔', ids: [] },
      stat: { name: '攻守变化', icon: '📊', ids: [] },
      effect: { name: '其他效果', icon: '📦', ids: [] }
    };
    
    this.init();
  }

  init() {
    this.categorizeModules();
    this.render();
    this.attachEventListeners();
  }

  categorizeModules() {
    this.modules.forEach(module => {
      const category = this.getCategoryForModule(module);
      if (this.categories[category]) {
        this.categories[category].ids.push(module.id);
      }
    });
  }

  getCategoryForModule(module) {
    // Phase 10: 完整分类逻辑，支持 P0/P1/P2 全部 60 个模块
    
    // 召唤相关（包括融合/同调/超量/连接详细）
    if (module.id.includes('summon') || module.id === 'token_summon' || 
        module.id === 'pendulum_summon' || module.id.includes('fusion') || 
        module.id.includes('synchro') || module.id.includes('xyz') ||
        module.id.includes('link') || module.id === 'double_summon') return 'summon';
    
    // 检索效果（包括种族/属性/场地检索）
    if (module.id.includes('search') || module.id.includes('add_from') ||
        module.id === 'race_support' || module.id === 'attribute_support' ||
        module.id === 'field_spell_related' || module.id === 'card_name_reference') return 'search';
    
    // 破坏效果（包括抗性）
    if (module.id.includes('destroy') || module.id === 'battle_indestructible' || 
        module.id === 'effect_indestructible') return 'destroy';
    
    // 抽卡效果（包括 mill）
    if (module.id.includes('draw') || module.id === 'mill_cards') return 'draw';
    
    // 伤害效果（包括直接攻击/穿透）
    if (module.id.includes('damage') || module.id.includes('gain_lp') || 
        module.id === 'direct_attack_pierce' || module.id === 'multiple_attacks') return 'damage';
    
    // 无效效果（包括手卡诱发、召唤限制）
    if (module.id.includes('negate') || module.id.includes('disable') || 
        module.id === 'hand_deck_trigger_effect' || module.id === 'summon_limit') return 'negate';
    
    // 除外效果
    if (module.id.includes('banish')) return 'banish';
    
    // 攻守变化（包括永续效果、表示形式变更）
    if (module.id.includes('atk_def') || module.id === 'continuous_effect' ||
        module.id === 'position_change') return 'stat';
    
    // 其他效果（P2 特殊机制）
    if (module.id === 'special_victory' || module.id === 'pendulum_scale_modify' ||
        module.id === 'control_exchange' || module.id === 'continuous_spell_counter' ||
        module.id === 'equip_transfer' || module.id === 'special_status_mark' ||
        module.id === 'copy_effect' || module.id === 'card_declaration' ||
        module.id === 'reveal_cards' || module.id === 'deck_top_manipulation' ||
        module.id === 'activation_condition') return 'effect';
    
    return 'effect';
  }

  render() {
    const html = `
      <div class="module-selector-container">
        ${this.renderSearchBox()}
        ${this.renderRecentModules()}
        ${this.renderCategoryList()}
      </div>
    `;
    this.containerEl.innerHTML = html;
  }

  renderSearchBox() {
    return `
      <div class="module-search-box">
        <span class="module-search-icon">🔍</span>
        <input 
          type="text" 
          id="moduleSearchInput" 
          class="module-search-input" 
          placeholder="搜索效果模块..."
          autocomplete="off"
        >
        <div class="module-search-hint">
          提示：输入"检索"、"search"、"攻守"等关键词
        </div>
      </div>
    `;
  }

  renderRecentModules() {
    if (this.recentModules.length === 0) return '';
    
    const recentHtml = this.recentModules
      .map(recent => {
        const module = this.modules.find(m => m.id === recent.id);
        if (!module) return '';
        return `
          <div class="recent-module-card" data-module-id="${module.id}">
            <div class="recent-module-name">${module.name}</div>
            <div class="recent-module-config">${recent.summary || '上次配置'}</div>
          </div>
        `;
      })
      .filter(h => h)
      .join('');

    if (!recentHtml) return '';

    return `
      <div class="recent-modules-section">
        <div class="section-header">
          <span>━━━</span> 最近使用 <span>━━━</span>
        </div>
        <div class="recent-modules-grid">
          ${recentHtml}
        </div>
      </div>
    `;
  }

  renderCategoryList() {
    const categoriesHtml = Object.entries(this.categories)
      .filter(([_, cat]) => cat.ids.length > 0)
      .map(([key, cat]) => this.renderCategoryGroup(key, cat))
      .join('');

    return `
      <div class="all-modules-section">
        <div class="section-header">
          <span>━━━</span> 全部效果模块 <span>━━━</span>
        </div>
        <div class="category-list">
          ${categoriesHtml}
        </div>
      </div>
    `;
  }

  renderCategoryGroup(key, category) {
    const modulesHtml = category.ids
      .map(id => {
        const module = this.modules.find(m => m.id === id);
        return module ? this.renderModuleCard(module) : '';
      })
      .join('');

    // 默认展开前3个分类
    const defaultExpanded = ['summon', 'search', 'destroy'].includes(key);
    const collapsedClass = defaultExpanded ? '' : 'collapsed';

    return `
      <div class="category-group ${collapsedClass}" data-category="${key}">
        <div class="category-header">
          <span class="category-icon">${category.icon}</span>
          <span class="category-name">${category.name}</span>
          <span class="category-count">(${category.ids.length}个)</span>
          <span class="toggle-icon">▼</span>
        </div>
        <div class="category-modules">
          ${modulesHtml}
        </div>
      </div>
    `;
  }

  renderModuleCard(module) {
    const tags = (module.tags || []).slice(0, 3);
    const tagsHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    return `
      <div class="module-card" data-module-id="${module.id}">
        <div class="module-header">
          <span class="module-name">${module.name}</span>
          <span class="module-name-en">${module.nameEn}</span>
        </div>
        <div class="module-desc">${module.description}</div>
        ${tagsHtml ? `<div class="module-tags">${tagsHtml}</div>` : ''}
      </div>
    `;
  }

  attachEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('moduleSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce((e) => {
        this.handleSearch(e.target.value);
      }, 300));
    }

    // 分类折叠
    this.containerEl.addEventListener('click', (e) => {
      const categoryHeader = e.target.closest('.category-header');
      if (categoryHeader) {
        const categoryGroup = categoryHeader.closest('.category-group');
        categoryGroup.classList.toggle('collapsed');
      }

      // 模块选择
      const moduleCard = e.target.closest('.module-card, .recent-module-card');
      if (moduleCard) {
        const moduleId = moduleCard.dataset.moduleId;
        this.selectModule(moduleId);
      }
    });
  }

  handleSearch(query) {
    const results = this.searchEngine.search(query);
    
    if (!query.trim()) {
      // 清空搜索：恢复原始分类显示
      this.render();
      this.attachEventListeners();
      this.highlightSelectedModule();
      return;
    }

    // 显示搜索结果
    const resultIds = results.map(m => m.id);
    
    // 隐藏不匹配的模块，展开包含匹配的分类
    document.querySelectorAll('.category-group').forEach(catGroup => {
      const categoryKey = catGroup.dataset.category;
      const category = this.categories[categoryKey];
      const matchingIds = category.ids.filter(id => resultIds.includes(id));
      
      if (matchingIds.length > 0) {
        catGroup.classList.remove('collapsed');
        // 隐藏不匹配的模块卡片
        catGroup.querySelectorAll('.module-card').forEach(card => {
          const moduleId = card.dataset.moduleId;
          if (resultIds.includes(moduleId)) {
            card.style.display = '';
            this.highlightSearchText(card, query);
          } else {
            card.style.display = 'none';
          }
        });
      } else {
        catGroup.style.display = 'none';
      }
    });
  }

  highlightSearchText(element, query) {
    // 简单的文本高亮（可扩展为更复杂的高亮算法）
    const textElements = element.querySelectorAll('.module-name, .module-desc, .tag');
    textElements.forEach(el => {
      const text = el.textContent;
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      if (lowerText.includes(lowerQuery)) {
        el.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
      }
    });
  }

  selectModule(moduleId) {
    this.selectedModuleId = moduleId;
    this.saveToRecent(moduleId);
    this.highlightSelectedModule();
    
    // 触发外部回调（加载模块参数）
    if (this.onModuleSelected) {
      this.onModuleSelected(moduleId);
    }
    
    // 通知原有系统（兼容性）
    const selectEl = document.getElementById('wizardAction');
    if (selectEl) {
      selectEl.value = moduleId;
      selectEl.dispatchEvent(new Event('change'));
    }
  }

  highlightSelectedModule() {
    document.querySelectorAll('.module-card').forEach(card => {
      card.classList.remove('selected');
    });
    if (this.selectedModuleId) {
      const selectedCard = document.querySelector(`.module-card[data-module-id="${this.selectedModuleId}"]`);
      if (selectedCard) {
        selectedCard.classList.add('selected');
      }
    }
  }

  // 最近使用记录（LocalStorage）
  loadRecentModules() {
    try {
      const stored = localStorage.getItem('yugioh_recent_modules');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveToRecent(moduleId) {
    let recent = this.loadRecentModules();
    recent = recent.filter(r => r.id !== moduleId);
    recent.unshift({ id: moduleId, timestamp: Date.now() });
    recent = recent.slice(0, 5); // 保留最近5个
    
    try {
      localStorage.setItem('yugioh_recent_modules', JSON.stringify(recent));
    } catch (e) {
      // LocalStorage满了或禁用，静默失败
    }
  }

  // 工具函数
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

// 搜索引擎
class ModuleSearchEngine {
  constructor(modules) {
    this.modules = modules;
    this.index = this.buildIndex();
  }

  buildIndex() {
    return this.modules.map(module => ({
      id: module.id,
      searchText: [
        module.name,
        module.nameEn.toLowerCase(),
        module.description,
        ...(module.tags || [])
      ].join(' ').toLowerCase()
    }));
  }

  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.modules;

    const matchingIds = this.index
      .filter(item => item.searchText.includes(q))
      .map(item => item.id);

    return this.modules.filter(m => matchingIds.includes(m.id));
  }
}

// 导出供全局使用
window.ModuleSelectorManager = ModuleSelectorManager;
