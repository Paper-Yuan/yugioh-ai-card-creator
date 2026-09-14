// ========== 设置管理 ==========

// 各服务方默认端点与模型（与后端 src/ai-generator.ts 的 AI_PROVIDER_DEFAULTS 保持一致）
const AI_PROVIDER_DEFAULTS = {
  openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  zhipu: { endpoint: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  anthropic: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
  custom: { endpoint: '', model: '' }
};

class Settings {
  constructor() {
    this.settings = this.loadSettings();
    this.applySettings();
  }

  // 加载设置（与默认值合并，避免旧版本缺失字段）
  loadSettings() {
    const defaults = this.getDefaultSettings();
    const saved = localStorage.getItem('yugioh_settings');
    if (!saved) return defaults;

    try {
      const parsed = JSON.parse(saved);
      return {
        ai: { ...defaults.ai, ...(parsed.ai || {}) },
        ui: { ...defaults.ui, ...(parsed.ui || {}) },
        workspace: { ...defaults.workspace, ...(parsed.workspace || {}) }
      };
    } catch {
      return defaults;
    }
  }

  // 默认设置
  getDefaultSettings() {
    return {
      ai: {
        provider: 'openai',
        apiKey: '',
        endpoint: AI_PROVIDER_DEFAULTS.openai.endpoint,
        model: AI_PROVIDER_DEFAULTS.openai.model
      },
      ui: {
        theme: 'dark',
        language: 'zh-CN'
      },
      workspace: {
        dir: ''
      }
    };
  }

  // 保存设置
  saveSettings() {
    localStorage.setItem('yugioh_settings', JSON.stringify(this.settings));
    this.applySettings();
  }

  // 应用设置（所有控件访问前判空，页面上不存在的控件跳过即可）
  applySettings() {
    // 应用主题
    if (this.settings.ui.theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    const setVal = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    };

    setVal('aiProvider', this.settings.ai.provider);
    setVal('apiKey', this.settings.ai.apiKey);
    setVal('apiEndpoint', this.settings.ai.endpoint);
    setVal('modelName', this.settings.ai.model);
    setVal('theme', this.settings.ui.theme);
    setVal('language', this.settings.ui.language);
    setVal('workspaceDir', this.settings.workspace.dir);
  }

  // 获取AI配置
  getAIConfig() {
    return this.settings.ai;
  }
}

// 初始化设置
const settings = new Settings();

// 保存API设置
function saveApiSettings() {
  const provider = document.getElementById('aiProvider').value;
  const apiKey = document.getElementById('apiKey').value.trim();
  const endpointEl = document.getElementById('apiEndpoint');
  const modelEl = document.getElementById('modelName');
  const endpoint = endpointEl ? endpointEl.value.trim() : '';
  const model = modelEl ? modelEl.value.trim() : '';

  if (!apiKey) {
    showNotification('请输入 API Key', 'error');
    return;
  }

  settings.settings.ai = {
    provider,
    apiKey,
    endpoint: endpoint || (AI_PROVIDER_DEFAULTS[provider] || {}).endpoint || '',
    model: model || (AI_PROVIDER_DEFAULTS[provider] || {}).model || ''
  };

  settings.saveSettings();
  showNotification('API 设置已保存', 'success');
}

// 测试API连接（由后端发起真实请求）
async function testApiConnection() {
  // 先采用当前表单值，避免用户改了输入却没保存导致测的是旧配置
  const provider = document.getElementById('aiProvider').value;
  const apiKey = document.getElementById('apiKey').value.trim();
  const endpointEl = document.getElementById('apiEndpoint');
  const modelEl = document.getElementById('modelName');
  const config = {
    provider,
    apiKey,
    endpoint: (endpointEl ? endpointEl.value.trim() : '') ||
      (AI_PROVIDER_DEFAULTS[provider] || {}).endpoint || '',
    model: (modelEl ? modelEl.value.trim() : '') ||
      (AI_PROVIDER_DEFAULTS[provider] || {}).model || ''
  };

  if (!config.apiKey) {
    showNotification('请先填写 API Key', 'error');
    return;
  }

  showLoading(true, '正在测试连接...');

  try {
    const response = await fetch('/api/test-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const result = await response.json();

    if (result.success) {
      showNotification('✅ API 连接成功！', 'success');
    } else {
      showNotification('❌ 连接失败: ' + (result.error || result.message || '未知错误'), 'error');
    }
  } catch (error) {
    showNotification('❌ 连接失败: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

// 切换API Key显示
function toggleApiKeyVisibility() {
  const input = document.getElementById('apiKey');
  const btn = document.getElementById('btnToggleApiKey');
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = '🔒 隐藏';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = '👁️ 显示';
  }
}

// 更改主题
function changeTheme() {
  const el = document.getElementById('theme');
  if (!el) return;
  settings.settings.ui.theme = el.value;
  settings.saveSettings();
  showNotification('主题已更改', 'success');
}

// 选择工作目录
async function selectWorkspaceDir() {
  // 在Electron环境中可以使用dialog
  // 这里使用简单的输入提示
  const dir = await mobileEnhancements.showPrompt(
    '请输入工作目录路径：',
    settings.settings.workspace.dir,
    '设置工作目录'
  );
  if (dir) {
    settings.settings.workspace.dir = dir;
    settings.saveSettings();
    showNotification('工作目录已设置', 'success');
  }
}

// AI Provider变化时更新默认配置
document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('aiProvider');
  if (providerSelect) {
    providerSelect.addEventListener('change', (e) => {
      const provider = e.target.value;
      const endpointInput = document.getElementById('apiEndpoint');
      const modelInput = document.getElementById('modelName');
      const defaults = AI_PROVIDER_DEFAULTS[provider];

      if (defaults) {
        if (endpointInput) endpointInput.value = defaults.endpoint;
        if (modelInput) modelInput.value = defaults.model;
      }
    });
  }
});
