// ========== 设置管理 ==========
class Settings {
  constructor() {
    this.settings = this.loadSettings();
    this.applySettings();
  }

  // 加载设置
  loadSettings() {
    const saved = localStorage.getItem('yugioh_settings');
    if (saved) {
      return JSON.parse(saved);
    }
    return this.getDefaultSettings();
  }

  // 默认设置
  getDefaultSettings() {
    return {
      ai: {
        provider: 'openai',
        apiKey: '',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-4'
      },
      ui: {
        theme: 'light',
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

  // 应用设置
  applySettings() {
    // 应用主题
    if (this.settings.ui.theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    // 填充表单
    if (document.getElementById('aiProvider')) {
      document.getElementById('aiProvider').value = this.settings.ai.provider;
      document.getElementById('apiKey').value = this.settings.ai.apiKey;
      document.getElementById('apiEndpoint').value = this.settings.ai.endpoint;
      document.getElementById('modelName').value = this.settings.ai.model;
      document.getElementById('theme').value = this.settings.ui.theme;
      document.getElementById('language').value = this.settings.ui.language;
      document.getElementById('workspaceDir').value = this.settings.workspace.dir;
    }
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
  const apiKey = document.getElementById('apiKey').value;
  const endpoint = document.getElementById('apiEndpoint').value;
  const model = document.getElementById('modelName').value;

  if (!apiKey) {
    showNotification('请输入API Key', 'error');
    return;
  }

  settings.settings.ai = {
    provider,
    apiKey,
    endpoint,
    model
  };

  settings.saveSettings();
  showNotification('API设置已保存', 'success');
}

// 测试API连接
async function testApiConnection() {
  const config = settings.getAIConfig();
  
  if (!config.apiKey) {
    showNotification('请先设置API Key', 'error');
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
      showNotification('✅ API连接成功！', 'success');
    } else {
      showNotification('❌ 连接失败: ' + result.error, 'error');
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
  const btn = event.target;
  
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🔒 隐藏';
  } else {
    input.type = 'password';
    btn.textContent = '👁️ 显示';
  }
}

// 更改主题
function changeTheme() {
  const theme = document.getElementById('theme').value;
  settings.settings.ui.theme = theme;
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
    document.getElementById('workspaceDir').value = dir;
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

      // 根据提供商设置默认值
      const defaults = {
        openai: {
          endpoint: 'https://api.openai.com/v1',
          model: 'gpt-4'
        },
        anthropic: {
          endpoint: 'https://api.anthropic.com/v1',
          model: 'claude-3-sonnet-20240229'
        },
        zhipu: {
          endpoint: 'https://open.bigmodel.cn/api/paas/v4',
          model: 'glm-4'
        },
        custom: {
          endpoint: '',
          model: ''
        }
      };

      if (defaults[provider]) {
        endpointInput.value = defaults[provider].endpoint;
        modelInput.value = defaults[provider].model;
      }
    });
  }
});
