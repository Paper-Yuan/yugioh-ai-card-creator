/**
 * Phase 1A: 效果选择器初始化脚本
 * 连接新的模块选择器到现有的效果向导系统
 */

// 全局模块选择器实例
let moduleSelectorManager = null;
let conditionalDisplayManager = null;
let parameterValidator = null;

// 模块数据映射（从 module-library.ts 的20个模块映射到UI）
const EFFECT_MODULES_DATA = [
  { id: 'special_summon_from_hand', name: '从手卡特殊召唤', nameEn: 'Special Summon from Hand', category: 'summon', description: '在满足特定条件时，可以从手卡特殊召唤此卡', tags: ['特召', '手卡', '条件召唤'] },
  { id: 'special_summon_from_grave', name: '从墓地特殊召唤', nameEn: 'Special Summon from Graveyard', category: 'summon', description: '从墓地特殊召唤怪兽', tags: ['特召', '墓地', '复活'] },
  { id: 'search_deck', name: '从卡组检索', nameEn: 'Search from Deck', category: 'search', description: '从卡组检索特定卡片加入手牌', tags: ['检索', '卡组', '加入手牌'] },
  { id: 'add_from_deck_to_hand', name: '卡组加入手牌', nameEn: 'Add from Deck to Hand', category: 'search', description: '将卡组特定卡片加入手牌（不选择对象）', tags: ['检索', '加入手牌'] },
  { id: 'destroy_card', name: '破坏卡片', nameEn: 'Destroy Card', category: 'destroy', description: '破坏场上或其他区域的卡片', tags: ['破坏', '场上'] },
  { id: 'draw_card', name: '抽卡效果', nameEn: 'Draw Card', category: 'draw', description: '从卡组抽取指定数量的卡片', tags: ['抽卡', '卡组'] },
  { id: 'inflict_damage', name: '造成伤害', nameEn: 'Inflict Damage', category: 'damage', description: '给对手造成指定数值的伤害', tags: ['伤害', '效果伤害'] },
  { id: 'gain_lp', name: '回复生命值', nameEn: 'Gain Life Points', category: 'damage', description: '回复指定数值的生命值', tags: ['回复', '生命值'] },
  { id: 'negate_effect', name: '无效效果', nameEn: 'Negate Effect', category: 'negate', description: '无效对手发动的卡片效果', tags: ['无效', '反制'] },
  { id: 'banish_card', name: '除外卡片', nameEn: 'Banish Card', category: 'banish', description: '将卡片从场上或其他区域除外', tags: ['除外', '移除'] },
  { id: 'atk_def_change', name: '攻守变化', nameEn: 'ATK/DEF Change', category: 'stat', description: '改变怪兽的攻击力或守备力', tags: ['攻守', '变化'] },
  { id: 'send_to_grave', name: '送去墓地', nameEn: 'Send to Graveyard', category: 'effect', description: '将卡片从卡组或场上送去墓地', tags: ['送墓', '堆墓'] },
  { id: 'token_summon', name: '衍生物生成', nameEn: 'Token Generation', category: 'summon', description: '特殊召唤衍生物到场上', tags: ['衍生物', '特召', '生成'] },
  { id: 'disable_effect', name: '使效果无效化', nameEn: 'Disable Effect', category: 'negate', description: '使怪兽的效果无效化', tags: ['无效化', '效果'] },
  { id: 'change_control', name: '控制权转移', nameEn: 'Change Control', category: 'effect', description: '改变怪兽的控制权', tags: ['控制', '夺取'] },
  { id: 'change_position', name: '表示形式变更', nameEn: 'Change Position', category: 'effect', description: '改变怪兽的表示形式', tags: ['表示', '翻转', '守备'] },
  { id: 'to_deck', name: '返回卡组', nameEn: 'Return to Deck', category: 'effect', description: '将卡片返回卡组（顶部/底部/洗入）', tags: ['返回', '卡组', '洗牌'] },
  { id: 'attach_xyz_material', name: '超量素材附加', nameEn: 'Attach Xyz Material', category: 'effect', description: '将卡片作为超量素材附加到超量怪兽', tags: ['超量', '素材', '附加'] }
];

/**
 * 初始化效果模块选择器（页面加载后调用）
 */
function initializeModuleSelector() {
  const container = document.getElementById('enhancedModuleSelectorContainer');
  if (!container) {
    console.warn('模块选择器容器未找到，跳过初始化');
    return;
  }

  // 创建模块选择器实例
  moduleSelectorManager = new ModuleSelectorManager(EFFECT_MODULES_DATA, container);
  
  // 设置模块选择回调
  moduleSelectorManager.onModuleSelected = function(moduleId) {
    console.log('选择了模块:', moduleId);
    
    // 同步到传统下拉菜单（向后兼容）
    const legacySelect = document.getElementById('wizardAction');
    if (legacySelect) {
      legacySelect.value = moduleId;
      legacySelect.dispatchEvent(new Event('change'));
    }
    
    // 触发参数加载
    loadModuleParameters(moduleId);
  };

  // 初始化条件显示管理器
  conditionalDisplayManager = new ConditionalDisplayManager();
  
  // 初始化参数验证器
  parameterValidator = new ParameterValidator();

  console.log('✅ 模块选择器初始化完成');
}

/**
 * 切换模块选择器显示模式
 */
function toggleModuleSelector() {
  const enhancedContainer = document.getElementById('enhancedModuleSelectorContainer');
  const legacySelector = document.getElementById('legacyActionSelector');
  
  if (!enhancedContainer || !legacySelector) return;

  const isEnhancedVisible = enhancedContainer.style.display !== 'none';
  
  if (isEnhancedVisible) {
    // 切换到传统模式
    enhancedContainer.style.display = 'none';
    legacySelector.style.display = 'block';
    console.log('切换到传统选择器');
  } else {
    // 切换到增强模式
    enhancedContainer.style.display = 'block';
    legacySelector.style.display = 'none';
    console.log('切换到模块选择器');
    
    // 首次显示时初始化
    if (!moduleSelectorManager) {
      initializeModuleSelector();
    }
  }
}

/**
 * 加载模块参数配置
 * @param {string} moduleId - 模块ID
 */
function loadModuleParameters(moduleId) {
  const module = EFFECT_MODULES_DATA.find(m => m.id === moduleId);
  if (!module) {
    console.warn('未找到模块:', moduleId);
    return;
  }

  // 这里可以扩展为动态加载模块的参数配置界面
  console.log('加载模块参数:', module.name);
  
  // 触发现有的参数加载逻辑（如果存在）
  if (typeof onWizardActionChanged === 'function') {
    onWizardActionChanged(moduleId);
  }
}

/**
 * 示例：快捷数值按钮使用
 */
function setupQuickValueButtons() {
  // 为攻击力/守备力字段添加快捷按钮
  const atkInput = document.getElementById('param_token_atk');
  if (atkInput) {
    const container = atkInput.closest('.param-field');
    if (container) {
      const quickButtonsHtml = QuickValueManager.renderQuickButtons(
        [0, 500, 1000, 1500, 2000, 2500, 3000],
        'param_token_atk'
      );
      
      const wrapper = document.createElement('div');
      wrapper.className = 'quick-values';
      wrapper.innerHTML = quickButtonsHtml;
      
      atkInput.parentNode.insertBefore(wrapper, atkInput.nextSibling);
    }
  }
}

/**
 * 页面加载后自动初始化
 */
if (typeof document !== 'undefined') {
  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('📦 Phase 1A 效果选择器准备就绪');
      // 不自动初始化，等待用户点击"切换到模块选择器"按钮
    });
  } else {
    console.log('📦 Phase 1A 效果选择器准备就绪');
  }
}

// 导出供全局使用
window.initializeModuleSelector = initializeModuleSelector;
window.toggleModuleSelector = toggleModuleSelector;
window.loadModuleParameters = loadModuleParameters;
