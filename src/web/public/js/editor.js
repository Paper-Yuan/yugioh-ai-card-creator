// 独立编辑器状态 (避免与主应用 state 冲突)
window.legacyEditorState = window.legacyEditorState || {
  cardId: 100000001,
  cardName: '新卡片',
  cardType: 1,
  selectedEffects: [],
  currentCategory: 'all',
  modules: []
};

// 初始化
async function initLegacyEditor() {
  await loadModules();
  renderModuleList();
  bindEvents();
}

// 加载效果模块
async function loadModules() {
  try {
    if (window.EFFECT_MODULES) {
      window.legacyEditorState.modules = window.EFFECT_MODULES;
      return;
    }
    const response = await fetch(`/api/modules?cardType=${window.legacyEditorState.cardType}`);
    window.legacyEditorState.modules = await response.json();
  } catch (error) {
    // 离线/静默回退
    if (window.EFFECT_MODULES) {
      window.legacyEditorState.modules = window.EFFECT_MODULES;
    }
  }
}

// 渲染模块列表
function renderModuleList() {
  const container = document.getElementById('moduleList');
  const filteredModules = state.currentCategory === 'all' 
    ? state.modules 
    : state.modules.filter(m => m.category === state.currentCategory);

  if (filteredModules.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">暂无可用模块</div>';
    return;
  }

  container.innerHTML = filteredModules.map(module => `
    <div class="module-item" data-module-id="${module.id}">
      <h3>${module.name}</h3>
      <p>${module.description}</p>
      <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
        ${module.tags.map(tag => `<span style="background: #e0e0e0; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${tag}</span>`).join('')}
      </div>
    </div>
  `).join('');

  // 绑定点击事件
  container.querySelectorAll('.module-item').forEach(item => {
    item.addEventListener('click', () => {
      const moduleId = item.dataset.moduleId;
      addEffect(moduleId);
    });
  });
}

// 添加效果
function addEffect(moduleId) {
  const module = state.modules.find(m => m.id === moduleId);
  if (!module) return;

  // 创建默认参数
  const parameters = {};
  module.parameters.forEach(param => {
    if (param.defaultValue !== undefined) {
      parameters[param.name] = param.defaultValue;
    } else if (param.type === 'boolean') {
      parameters[param.name] = false;
    } else if (param.type === 'number') {
      parameters[param.name] = param.min || 0;
    } else if (param.type === 'select' && param.options && param.options.length > 0) {
      parameters[param.name] = param.options[0].value;
    } else {
      parameters[param.name] = '';
    }
  });

  state.selectedEffects.push({
    moduleId,
    parameters,
    order: state.selectedEffects.length
  });

  renderSelectedEffects();
}

// 渲染已选效果
function renderSelectedEffects() {
  const container = document.getElementById('selectedEffects');

  if (state.selectedEffects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>从左侧选择效果模块开始编辑</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.selectedEffects.map((effect, index) => {
    const module = state.modules.find(m => m.id === effect.moduleId);
    if (!module) return '';

    return `
      <div class="effect-card" data-index="${index}">
        <div class="effect-card-header">
          <div class="effect-card-title">${index + 1}. ${module.name}</div>
          <div class="effect-card-actions">
            <button class="btn-icon move-up" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn-icon move-down" ${index === state.selectedEffects.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn-icon remove">✕</button>
          </div>
        </div>
        ${renderParameters(module, effect.parameters, index)}
      </div>
    `;
  }).join('');

  // 绑定事件
  container.querySelectorAll('.remove').forEach((btn, index) => {
    btn.addEventListener('click', () => removeEffect(index));
  });

  container.querySelectorAll('.move-up').forEach((btn, index) => {
    btn.addEventListener('click', () => moveEffect(index, -1));
  });

  container.querySelectorAll('.move-down').forEach((btn, index) => {
    btn.addEventListener('click', () => moveEffect(index, 1));
  });

  // 绑定参数变化事件
  container.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('change', (e) => {
      const effectIndex = parseInt(e.target.dataset.effectIndex);
      const paramName = e.target.dataset.paramName;
      let value = e.target.value;

      if (e.target.type === 'checkbox') {
        value = e.target.checked;
      } else if (e.target.type === 'number') {
        value = parseInt(value);
      }

      state.selectedEffects[effectIndex].parameters[paramName] = value;
    });
  });
}

// 渲染参数表单
function renderParameters(module, parameters, effectIndex) {
  return `
    <div style="margin-top: 10px;">
      ${module.parameters.map(param => {
        const value = parameters[param.name];
        
        if (param.type === 'boolean') {
          return `
            <div class="parameter-group">
              <label>
                <input type="checkbox" 
                       data-effect-index="${effectIndex}" 
                       data-param-name="${param.name}"
                       ${value ? 'checked' : ''}>
                ${param.label}
              </label>
              <div style="font-size: 11px; color: #666; margin-top: 2px;">${param.description}</div>
            </div>
          `;
        } else if (param.type === 'number') {
          return `
            <div class="parameter-group">
              <label>${param.label}</label>
              <input type="number" 
                     value="${value}" 
                     min="${param.min || 0}" 
                     max="${param.max || 999999}"
                     data-effect-index="${effectIndex}" 
                     data-param-name="${param.name}">
              <div style="font-size: 11px; color: #666; margin-top: 2px;">${param.description}</div>
            </div>
          `;
        } else if (param.type === 'select') {
          return `
            <div class="parameter-group">
              <label>${param.label}</label>
              <select data-effect-index="${effectIndex}" data-param-name="${param.name}">
                ${param.options.map(opt => `
                  <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>
                `).join('')}
              </select>
              <div style="font-size: 11px; color: #666; margin-top: 2px;">${param.description}</div>
            </div>
          `;
        } else {
          return `
            <div class="parameter-group">
              <label>${param.label}</label>
              <input type="text" 
                     value="${value}" 
                     data-effect-index="${effectIndex}" 
                     data-param-name="${param.name}">
              <div style="font-size: 11px; color: #666; margin-top: 2px;">${param.description}</div>
            </div>
          `;
        }
      }).join('')}
    </div>
  `;
}

// 移除效果
function removeEffect(index) {
  state.selectedEffects.splice(index, 1);
  // 重新排序
  state.selectedEffects.forEach((effect, i) => {
    effect.order = i;
  });
  renderSelectedEffects();
}

// 移动效果
function moveEffect(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.selectedEffects.length) return;

  const temp = state.selectedEffects[index];
  state.selectedEffects[index] = state.selectedEffects[newIndex];
  state.selectedEffects[newIndex] = temp;

  // 更新order
  state.selectedEffects.forEach((effect, i) => {
    effect.order = i;
  });

  renderSelectedEffects();
}

// 生成脚本
async function generateScript() {
  const cardId = parseInt(document.getElementById('cardId').value);
  const cardName = document.getElementById('cardName').value;
  const cardType = parseInt(document.getElementById('cardType').value);

  const template = {
    effectModules: state.selectedEffects,
    cardData: {
      id: cardId,
      name: cardName,
      type: cardType,
      race: 1,
      attribute: 1,
      level: 4
    }
  };

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });

    const result = await response.json();
    
    // 显示代码
    document.getElementById('codePreview').textContent = result.lua;

    // 显示警告
    const warningsContainer = document.getElementById('warningsContainer');
    if (result.warnings && result.warnings.length > 0) {
      warningsContainer.innerHTML = `
        <div class="warnings">
          <h3>⚠️ 警告</h3>
          <ul>${result.warnings.map(w => `<li>${w}</li>`).join('')}</ul>
        </div>
      `;
    } else {
      warningsContainer.innerHTML = '';
    }

    // 显示建议
    const suggestionsContainer = document.getElementById('suggestionsContainer');
    if (result.suggestions && result.suggestions.length > 0) {
      suggestionsContainer.innerHTML = `
        <div class="suggestions">
          <h3>💡 建议</h3>
          <ul>${result.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      `;
    } else {
      suggestionsContainer.innerHTML = '';
    }

    // 显示验证错误
    if (result.validation && !result.validation.valid) {
      warningsContainer.innerHTML += `
        <div class="warnings">
          <h3>❌ 验证错误</h3>
          <ul>${result.validation.errors.map(e => `<li>${e}</li>`).join('')}</ul>
        </div>
      `;
    }

  } catch (error) {
    console.error('Failed to generate script:', error);
    showError('生成脚本失败');
  }
}

// 下载脚本
function downloadScript() {
  const code = document.getElementById('codePreview').textContent;
  const cardId = document.getElementById('cardId').value;
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `c${cardId}.lua`;
  a.click();
  URL.revokeObjectURL(url);
}

// 复制代码
function copyScript() {
  const code = document.getElementById('codePreview').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showSuccess('代码已复制到剪贴板');
  });
}

// 显示错误
function showError(message) {
  mobileEnhancements.showToast('错误: ' + message, 4000);
}

// 显示成功
function showSuccess(message) {
  const btn = document.getElementById('copyBtn');
  const originalText = btn.textContent;
  btn.textContent = '✓ ' + message;
  setTimeout(() => {
    btn.textContent = originalText;
  }, 2000);
}

// 绑定事件
function bindEvents() {
  // 卡片类型变化
  document.getElementById('cardType').addEventListener('change', async (e) => {
    state.cardType = parseInt(e.target.value);
    await loadModules();
    renderModuleList();
  });

  // 分类标签
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      state.currentCategory = e.target.dataset.category;
      renderModuleList();
    });
  });

  // 生成脚本按钮
  document.getElementById('generateBtn').addEventListener('click', generateScript);

  // 下载按钮
  document.getElementById('downloadBtn').addEventListener('click', downloadScript);

  // 复制按钮
  document.getElementById('copyBtn').addEventListener('click', copyScript);

  // 卡片信息变化
  document.getElementById('cardId').addEventListener('change', (e) => {
    state.cardId = parseInt(e.target.value);
  });

  document.getElementById('cardName').addEventListener('change', (e) => {
    state.cardName = e.target.value;
  });
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
