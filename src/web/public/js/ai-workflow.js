// ========== AI工作流 ==========

// 显示AI工作流弹窗
function showAIWorkflow() {
  document.getElementById('aiWorkflowModal').classList.add('show');
}

// 关闭AI工作流弹窗
function closeAIWorkflow() {
  document.getElementById('aiWorkflowModal').classList.remove('show');
}

// 开始AI生成
async function startAIGeneration() {
  const prompt = document.getElementById('aiPrompt').value;
  const cardType = document.getElementById('aiCardType').value;
  const theme = document.getElementById('aiTheme').value;
  const generateImage = document.getElementById('aiGenerateImage').checked;

  if (!prompt || prompt.trim() === '') {
    showNotification('请输入卡片描述', 'error');
    return;
  }

  // 检查API设置
  const aiConfig = settings.getAIConfig();
  if (!aiConfig.apiKey) {
    showNotification('请先在设置中配置AI API', 'error');
    navigateTo('settings');
    return;
  }

  closeAIWorkflow();
  showLoading(true, '正在使用AI生成卡片...');

  try {
    // 调用AI生成API
    const response = await fetch('/api/ai-generate-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        cardType,
        theme,
        generateImage,
        aiConfig
      })
    });

    if (!response.ok) {
      throw new Error('AI生成失败');
    }

    const result = await response.json();

    // 填充到制卡器
    fillCardMakerWithAIData(result);

    showNotification('✨ AI生成成功！请检查并调整卡片信息', 'success');
    navigateTo('card-maker');

  } catch (error) {
    console.error('AI generation error:', error);
    showNotification('AI生成失败: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

// 填充AI生成的数据到制卡器
function fillCardMakerWithAIData(data) {
  // 填充基本信息
  if (data.id) document.getElementById('cardId').value = data.id;
  if (data.name) document.getElementById('cardName').value = data.name;
  if (data.type) {
    document.getElementById('cardType').value = data.type;
    updateCardTypeFields();
  }

  // 怪兽卡专有字段
  if (data.type === 1 || data.type === '1') {
    if (data.race) document.getElementById('cardRace').value = data.race;
    if (data.attribute) document.getElementById('cardAttribute').value = data.attribute;
    if (data.level) document.getElementById('cardLevel').value = data.level;
    if (data.atk !== undefined) document.getElementById('cardAtk').value = data.atk;
    if (data.def !== undefined) document.getElementById('cardDef').value = data.def;
  }

  if (data.description) {
    document.getElementById('cardDesc').value = data.description;
  }

  // 填充效果模块
  if (data.effects && Array.isArray(data.effects)) {
    state.selectedEffects = data.effects.map((effect, index) => ({
      moduleId: effect.moduleId,
      parameters: effect.parameters || {},
      order: index
    }));
    renderSelectedEffects();
  }

  // 如果生成了图片，加载图片
  if (data.imageBase64) {
    state.imageBase64 = data.imageBase64;
    state.uploadedImage = true;
    
    const previewImage = document.getElementById('previewImage');
    const uploadPreview = document.getElementById('uploadPreview');
    
    previewImage.src = data.imageBase64;
    uploadPreview.classList.add('show');
  }

  // 保存到状态
  state.cardData = {
    id: data.id,
    name: data.name,
    type: parseInt(data.type),
    race: parseInt(data.race) || 1,
    attribute: parseInt(data.attribute) || 1,
    level: parseInt(data.level) || 4,
    atk: parseInt(data.atk) || 0,
    def: parseInt(data.def) || 0,
    description: data.description || ''
  };

  // 标记步骤1和步骤2为已完成
  document.querySelectorAll('.progress-step')[0].classList.add('completed');
  if (data.imageBase64) {
    document.querySelectorAll('.progress-step')[1].classList.add('completed');
  }
}

// AI智能推荐效果
async function suggestEffects() {
  const cardName = document.getElementById('cardName').value;
  const cardDesc = document.getElementById('cardDesc').value;
  const cardType = parseInt(document.getElementById('cardType').value);

  if (!cardName && !cardDesc) {
    showNotification('请先填写卡片名称或描述', 'error');
    return;
  }

  const aiConfig = settings.getAIConfig();
  if (!aiConfig.apiKey) {
    showNotification('请先在设置中配置AI API', 'error');
    return;
  }

  showLoading(true, 'AI正在分析并推荐效果...');

  try {
    const response = await fetch('/api/ai-suggest-effects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardName,
        cardDesc,
        cardType,
        aiConfig
      })
    });

    if (!response.ok) {
      throw new Error('效果推荐失败');
    }

    const result = await response.json();

    if (result.effects && result.effects.length > 0) {
      // 显示推荐的效果供用户选择
      showEffectSuggestions(result.effects);
    } else {
      showNotification('未找到合适的效果推荐', 'error');
    }

  } catch (error) {
    console.error('AI suggest error:', error);
    showNotification('效果推荐失败: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

// 显示效果推荐
function showEffectSuggestions(effects) {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>🤖 AI推荐的效果</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 16px; color: #666;">根据卡片信息，AI推荐以下效果：</p>
        ${effects.map((effect, index) => `
          <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <input type="checkbox" id="suggest_${index}" style="margin-right: 8px;">
              <label for="suggest_${index}" style="font-weight: 600; margin: 0;">
                ${state.modules.find(m => m.id === effect.moduleId)?.name || effect.moduleId}
              </label>
            </div>
            <p style="font-size: 13px; color: #666; margin: 0;">
              ${state.modules.find(m => m.id === effect.moduleId)?.description || ''}
            </p>
          </div>
        `).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
        <button class="btn btn-primary" onclick="applySuggestedEffects(${JSON.stringify(effects).replace(/"/g, '&quot;')})">
          应用选中的效果
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// 应用推荐的效果
function applySuggestedEffects(effects) {
  const modal = event.target.closest('.modal');
  const selected = [];

  effects.forEach((effect, index) => {
    const checkbox = document.getElementById(`suggest_${index}`);
    if (checkbox && checkbox.checked) {
      selected.push(effect);
    }
  });

  if (selected.length === 0) {
    showNotification('请至少选择一个效果', 'error');
    return;
  }

  // 添加到已选效果
  selected.forEach(effect => {
    state.selectedEffects.push({
      moduleId: effect.moduleId,
      parameters: effect.parameters || {},
      order: state.selectedEffects.length
    });
  });

  renderSelectedEffects();
  modal.remove();
  showNotification(`已添加 ${selected.length} 个效果`, 'success');
}

// 在步骤3中添加AI推荐按钮
document.addEventListener('DOMContentLoaded', () => {
  const step3 = document.querySelector('[data-step="3"]');
  if (step3) {
    const selectedEffectsHeader = step3.querySelector('.selected-effects h3');
    if (selectedEffectsHeader) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sm';
      btn.style.marginLeft = '12px';
      btn.textContent = '🤖 AI推荐';
      btn.onclick = suggestEffects;
      selectedEffectsHeader.appendChild(btn);
    }
  }
});
