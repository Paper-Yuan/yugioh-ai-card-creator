/**
 * Phase 9: 灵摆面板条件显示控制器
 * 只有选择灵摆类型时才显示灵摆效果设计面板
 */

/**
 * 更新灵摆面板的显示状态
 * @param {number} typeCode - 卡片类型代码
 */
function updatePendulumPanelVisibility(typeCode) {
  const isPendulum = !!(typeCode & 0x1000000); // 16777216 = 0x1000000
  
  const scaleWrap = document.getElementById('pendulumScaleWrap');
  const penWizard = document.getElementById('panelPendulumWizard');
  
  if (scaleWrap) {
    scaleWrap.style.display = isPendulum ? 'grid' : 'none';
  }
  
  if (penWizard) {
    penWizard.style.display = isPendulum ? 'block' : 'none';
    
    // 添加平滑过渡动画
    if (isPendulum) {
      penWizard.style.opacity = '0';
      penWizard.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        penWizard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        penWizard.style.opacity = '1';
        penWizard.style.transform = 'translateY(0)';
      }, 10);
    }
  }
  
  // 同步灵摆效果模块的可见性
  syncPendulumEffectModules(isPendulum);
}

/**
 * 同步灵摆效果模块的显示
 * @param {boolean} isPendulum - 是否为灵摆怪兽
 */
function syncPendulumEffectModules(isPendulum) {
  // 如果效果模块选择器已初始化
  if (window.moduleSelectorManager) {
    const pendulumModule = window.moduleSelectorManager.modules.find(
      m => m.id === 'pendulum_summon'
    );
    
    if (pendulumModule) {
      // 根据灵摆状态动态显示/隐藏灵摆召唤模块
      const moduleElement = document.querySelector(`[data-module-id="pendulum_summon"]`);
      if (moduleElement) {
        moduleElement.style.display = isPendulum ? 'block' : 'none';
      }
    }
  }
}

/**
 * 检查当前卡片是否为灵摆怪兽
 * @returns {boolean}
 */
function isPendulumMonster() {
  if (!window.state || !window.state.cardData) return false;
  const typeCode = window.state.cardData.type || 0;
  return !!(typeCode & 0x1000000);
}

/**
 * 初始化灵摆面板控制
 */
function initPendulumPanelControl() {
  // 监听卡片类型变化
  const typeInput = document.getElementById('cardType');
  if (typeInput) {
    typeInput.addEventListener('change', (e) => {
      const typeCode = parseInt(e.target.value) || 0;
      updatePendulumPanelVisibility(typeCode);
    });
  }
  
  // 监听怪兽分类变化
  const categorySelect = document.getElementById('monsterCategory');
  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      setTimeout(() => {
        if (window.state && window.state.cardData) {
          updatePendulumPanelVisibility(window.state.cardData.type || 0);
        }
      }, 100);
    });
  }
  
  // 监听灵摆复选框
  const chkPendulum = document.getElementById('chkIsPendulum');
  if (chkPendulum) {
    chkPendulum.addEventListener('change', (e) => {
      if (window.state && window.state.cardData) {
        let typeCode = window.state.cardData.type || 33;
        if (e.target.checked) {
          typeCode |= 0x1000000;
        } else {
          typeCode &= ~0x1000000;
        }
        window.state.cardData.type = typeCode;
        updatePendulumPanelVisibility(typeCode);
      }
    });
  }
  
  // 初始化时检查当前状态
  if (window.state && window.state.cardData) {
    updatePendulumPanelVisibility(window.state.cardData.type || 0);
  }
}

// 页面加载完成后初始化
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPendulumPanelControl);
  } else {
    initPendulumPanelControl();
  }
}

// 导出给全局使用
window.updatePendulumPanelVisibility = updatePendulumPanelVisibility;
window.isPendulumMonster = isPendulumMonster;
