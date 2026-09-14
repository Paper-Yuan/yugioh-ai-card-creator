/**
 * 游戏王 AI 制卡工作室 - 移动端专属 UI 交互与多页面流转系统 (MobileUIManager & MobileFlowManager v2.0)
 * 专为手机、平板与触控屏幕深度设计：
 * 1. 自动环境侦测 (UA + 屏幕宽度 + 触屏) 零延迟自动切换手机端专属流
 * 2. 独创移动端多页面依次递进设计流 (卡面数据 -> 效果外规则 -> 逐个效果拆分成独立页面 -> 卡面配图 -> 发布打包)
 * 3. 顶部微型动态卡片胶囊与流向进度指示条 (Flow Tracker)
 * 4. 底部大靶区吸底操作条 (← 上一步 / 🎴 查卡 / 下一步 →)
 * 5. 电脑端 (宽屏) 彻底隔离，不造成任何样式或逻辑污染
 */

class MobileFlowManager {
  constructor(mobileUIManager) {
    this.mobileUIManager = mobileUIManager;
    this.currentStepIndex = 0;
    this.steps = [];
  }

  init() {
    this.rebuildSteps();
    this.bindEvents();
    if (this.mobileUIManager.isMobile) {
      this.syncStep(this.currentStepIndex);
    }
  }

  /**
   * 动态构建移动端子页面队列 (效果按数量严格拆分为独立单页)
   */
  rebuildSteps() {
    const orderSymbols = ['①', '②', '③', '④'];
    const totalEffects = (window.state && window.state.effectConfig && window.state.effectConfig.totalEffects) || 2;
    const isPendulum = (window.state && window.state.cardData && (window.state.cardData.type & 16777216)) || 
                       document.getElementById('chkIsPendulum')?.checked || false;

    this.steps = [
      {
        key: 'card-data',
        title: '卡面基础数据',
        shortTitle: '卡面基础',
        icon: '🏷️',
        mainStep: 1,
        desc: '卡名、密码、属性、攻防、星级与种族特性'
      },
      {
        key: 'effect-rules',
        title: '效果规则与数量',
        shortTitle: '效果规则',
        icon: '📜',
        mainStep: 2,
        subType: 'rules',
        desc: '特殊召唤限制、同名卡1次限制与总效果数量'
      }
    ];

    // 若为灵摆怪兽，追加独立的灵摆效果页面
    if (isPendulum) {
      this.steps.push({
        key: 'pendulum-effect',
        title: '灵摆效果独立设计',
        shortTitle: '灵摆效果',
        icon: '⚖️',
        mainStep: 2,
        subType: 'pendulum',
        desc: '灵摆区域专属魔法效果、代价与发动时机'
      });
    }

    // 核心：每一个效果拆分成一个独立页面！
    for (let i = 0; i < totalEffects; i++) {
      this.steps.push({
        key: `effect-${i}`,
        title: `效果 ${orderSymbols[i] || (i + 1)} 独立设计`,
        shortTitle: `效果 ${orderSymbols[i] || (i + 1)}`,
        icon: '✨',
        mainStep: 2,
        subType: 'effect',
        effectIndex: i,
        desc: `配置第 ${orderSymbols[i] || (i + 1)} 个效果的时点场合、代价、对象与动作`
      });
    }

    this.steps.push({
      key: 'card-art',
      title: '卡面配图与工艺',
      shortTitle: '卡面配图',
      icon: '🎨',
      mainStep: 3,
      desc: '原画插图裁剪、全画扩展与烫金工艺'
    });

    this.steps.push({
      key: 'card-export',
      title: '一键发布与导出',
      shortTitle: '发布打包',
      icon: '📦',
      mainStep: 4,
      desc: 'Lua 脚本检视、高清单图与 MDPro3 卡包'
    });

    // 纠正超出边界的索引
    if (this.currentStepIndex >= this.steps.length) {
      this.currentStepIndex = this.steps.length - 1;
    }
  }

  bindEvents() {
    // 监听效果数量变化事件，实时重构子页面
    window.addEventListener('effectCountChanged', () => {
      this.rebuildSteps();
      if (this.mobileUIManager.isMobile) {
        this.syncStep(this.currentStepIndex);
      }
    });
  }

  /**
   * 同步展示指定的移动端子页面
   */
  syncStep(index) {
    this.rebuildSteps();
    index = Math.max(0, Math.min(this.steps.length - 1, index));
    this.currentStepIndex = index;
    const cur = this.steps[index];
    if (!cur) return;

    // 1. 同步底层数据状态
    if (window.state) {
      window.state.currentStep = cur.mainStep;
      if (cur.subType === 'effect' && typeof cur.effectIndex === 'number') {
        window.state.currentWizardIndex = cur.effectIndex;
        if (typeof window.renderWizardStep === 'function') {
          window.renderWizardStep();
        }
      }
    }

    // 2. 隐藏全部桌面大步骤，仅展示当前子页面所属的主分区
    for (let i = 1; i <= 4; i++) {
      const sec = document.getElementById(`step${i}-content`);
      if (sec) {
        if (i === cur.mainStep) {
          sec.classList.add('active');
          sec.style.display = 'block';
        } else {
          sec.classList.remove('active');
          sec.style.display = 'none';
        }
      }
    }

    // 3. 步骤 2 内部子模块严格互斥隔离展示 (独占单页面)
    const pRule = document.getElementById('panelRuleTexts');
    const pGlobal = document.getElementById('globalPreRulesCard');
    const pPen = document.getElementById('panelPendulumWizard');
    const pWizard = document.getElementById('stepByStepWizardCard');

    if (cur.mainStep === 2) {
      if (cur.subType === 'rules') {
        // 规则页面：显示规则条款与数量频次限制，隐藏灵摆与单个效果卡片
        if (pRule) pRule.style.display = 'block';
        if (pGlobal) pGlobal.style.display = 'block';
        if (pPen) pPen.style.display = 'none';
        if (pWizard) pWizard.style.display = 'none';
      } else if (cur.subType === 'pendulum') {
        // 灵摆页面：仅显示灵摆独立设计器
        if (pRule) pRule.style.display = 'none';
        if (pGlobal) pGlobal.style.display = 'none';
        if (pPen) pPen.style.display = 'block';
        if (pWizard) pWizard.style.display = 'none';
      } else if (cur.subType === 'effect') {
        // 单效果独立页面：仅展示当前效果向导卡片，彻底隐藏其他干扰
        if (pRule) pRule.style.display = 'none';
        if (pGlobal) pGlobal.style.display = 'none';
        if (pPen) pPen.style.display = 'none';
        if (pWizard) pWizard.style.display = 'block';
      }
    } else {
      // 非步骤 2 时恢复默认
      if (pRule) pRule.style.display = '';
      if (pGlobal) pGlobal.style.display = '';
      if (pWizard) pWizard.style.display = '';
    }

    // 4. 处于发布打包页面时，自动触发 Lua 实时编译
    if (cur.mainStep === 4 && typeof window.compileLuaPreview === 'function') {
      window.compileLuaPreview();
    }

    // 5. 渲染顶部流动式进度条
    this.renderTracker();

    // 6. 渲染底部吸底操作栏文案与状态
    this.renderActionBar();

    // 7. 更新微缩吸顶卡片
    if (this.mobileUIManager) {
      this.mobileUIManager.updateStickyMiniCard();
    }
  }

  /**
   * 渲染顶部多页面进度条
   */
  renderTracker() {
    const badgeEl = document.getElementById('flowStepBadge');
    const titleEl = document.getElementById('flowStepTitle');
    const dotsEl = document.getElementById('flowTrackerDots');
    const cur = this.steps[this.currentStepIndex];
    if (!cur) return;

    if (badgeEl) {
      badgeEl.textContent = `第 ${this.currentStepIndex + 1} / ${this.steps.length} 步`;
    }

    if (titleEl) {
      titleEl.innerHTML = `<span class="step-icon">${cur.icon}</span> ${cur.title}`;
    }

    if (dotsEl) {
      dotsEl.innerHTML = this.steps.map((s, idx) => {
        const isCurrent = idx === this.currentStepIndex;
        const isDone = idx < this.currentStepIndex;
        const cls = isCurrent ? 'dot active' : (isDone ? 'dot completed' : 'dot');
        return `
          <button type="button" class="${cls}" onclick="mobileFlowJump(${idx})" title="${s.title}">
            <span class="dot-inner"></span>
            <span class="dot-label">${s.shortTitle}</span>
          </button>
        `;
      }).join('');
      
      // 自动使当前活跃点在可横滑指示条中居中可见
      const activeDot = dotsEl.querySelector('.dot.active');
      if (activeDot) {
        activeDot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }

  /**
   * 渲染底部吸底流向操作栏
   */
  renderActionBar() {
    const btnPrev = document.getElementById('btnMobileFlowPrev');
    const btnNext = document.getElementById('btnMobileFlowNext');
    const curIdx = this.currentStepIndex;
    const total = this.steps.length;

    if (btnPrev) {
      if (curIdx === 0) {
        btnPrev.style.display = 'none';
      } else {
        btnPrev.style.display = 'inline-flex';
        const prevStep = this.steps[curIdx - 1];
        btnPrev.innerHTML = `<span>← ${prevStep.shortTitle}</span>`;
      }
    }

    if (btnNext) {
      if (curIdx < total - 1) {
        const nextStep = this.steps[curIdx + 1];
        btnNext.innerHTML = `<span>${nextStep.title} →</span>`;
        btnNext.className = 'btn btn-gold mobile-flow-btn-next';
      } else {
        btnNext.innerHTML = `<span>🎉 完成制卡 · 检视大图</span>`;
        btnNext.className = 'btn btn-emerald mobile-flow-btn-next';
      }
    }
  }

  /**
   * 进入下一步
   */
  goNext() {
    this.mobileUIManager.triggerHaptic('medium');
    if (this.currentStepIndex < this.steps.length - 1) {
      this.syncStep(this.currentStepIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // 已经到最后一步，直接打开卡面大图抽屉
      if (typeof window.openMobileCardDrawer === 'function') {
        window.openMobileCardDrawer();
      }
    }
  }

  /**
   * 返回上一步
   */
  goPrev() {
    this.mobileUIManager.triggerHaptic('light');
    if (this.currentStepIndex > 0) {
      this.syncStep(this.currentStepIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * 点击圆点跳转
   */
  jump(idx) {
    this.mobileUIManager.triggerHaptic('light');
    this.syncStep(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * 从主步骤跳转到对应的移动端首个子页面
   */
  jumpToMainStep(mainStep) {
    this.rebuildSteps();
    const targetIdx = this.steps.findIndex(s => s.mainStep === mainStep);
    if (targetIdx !== -1) {
      this.syncStep(targetIdx);
    }
  }

  /**
   * 恢复电脑端状态
   */
  resetDesktop() {
    const pRule = document.getElementById('panelRuleTexts');
    const pGlobal = document.getElementById('globalPreRulesCard');
    const pPen = document.getElementById('panelPendulumWizard');
    const pWizard = document.getElementById('stepByStepWizardCard');

    if (pRule) pRule.style.display = '';
    if (pGlobal) pGlobal.style.display = '';
    if (pPen) pPen.style.display = '';
    if (pWizard) pWizard.style.display = '';

    for (let i = 1; i <= 4; i++) {
      const sec = document.getElementById(`step${i}-content`);
      if (sec) {
        sec.style.display = '';
      }
    }

    if (typeof window.updateStepDisplay === 'function') {
      window.updateStepDisplay();
    }
  }
}

class MobileUIManager {
  constructor() {
    this.STORAGE_KEY = 'ygo_mobile_ui_config';
    this.config = this.loadConfig();
    this.isMobile = this.detectMobile();
    this.flowManager = new MobileFlowManager(this);

    // 默认绑定与初始化
    if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', () => this.init());
      window.addEventListener('resize', () => this.onResize());
    }
  }

  /**
   * 默认手机端配置
   */
  getDefaultConfig() {
    return {
      layoutMode: 'tabs',       // 'tabs' (单手分页) | 'scroll' (长卷轴) | 'split' (上下分屏)
      stickyHeader: true,       // 编辑时常驻吸顶卡片小窗
      haptics: true,            // 触觉微震反馈
      renderScale: 1,           // 1: 极速省电 | 2: 视网膜极清
      drawerStyle: 'sheet'      // 'sheet' (底部半屏抽屉) | 'fullscreen' (全屏沉浸)
    };
  }

  /**
   * 读取本地持久化配置
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return Object.assign(this.getDefaultConfig(), JSON.parse(saved));
      }
    } catch (e) {
      console.warn('[MobileUIManager] Failed to read config from localStorage:', e);
    }
    return this.getDefaultConfig();
  }

  /**
   * 保存配置
   */
  saveConfig(newConfig = {}) {
    this.config = Object.assign(this.config, newConfig);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('[MobileUIManager] Failed to save config:', e);
    }
    this.applyConfig();
  }

  /**
   * 全自动手机端环境检测 (结合 UA、触控、屏幕宽度，绝不漏判)
   */
  detectMobile() {
    if (typeof window === 'undefined') return false;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isNarrow = window.innerWidth <= 768;
    return isMobileUA || (isTouch && isNarrow) || isNarrow;
  }

  /**
   * 初始化界面装载
   */
  init() {
    this.isMobile = this.detectMobile();
    this.applyConfig();
    this.flowManager.init();
    this.bindBottomNav();
    this.updateStickyMiniCard();
    this.populateSettingsModal();
  }

  /**
   * 窗口变化响应
   */
  onResize() {
    const wasMobile = this.isMobile;
    this.isMobile = this.detectMobile();
    if (wasMobile !== this.isMobile) {
      this.applyConfig();
    }
  }

  /**
   * 将配置应用到 DOM 结构和样式类 (手机端激活，电脑端严格重置)
   */
  applyConfig() {
    if (typeof document === 'undefined') return;

    const body = document.body;

    body.classList.remove('mobile-mode-tabs', 'mobile-mode-scroll', 'mobile-mode-split', 'mobile-flow-active');
    
    if (this.isMobile) {
      // 手机端：全自动开启移动多页面流向与布局
      body.classList.add('mobile-flow-active');
      body.classList.add(`mobile-mode-${this.config.layoutMode}`);
      if (this.flowManager) {
        this.flowManager.syncStep(this.flowManager.currentStepIndex);
      }
    } else {
      // 电脑端：彻底重置，恢复桌面双栏完整界面并隐藏手机特化设置
      this.closeSettingsModal();
      if (this.flowManager) {
        this.flowManager.resetDesktop();
      }
    }

    // 吸顶微缩卡片控制
    const stickyPill = document.getElementById('mobileStickyCardPill');
    if (stickyPill) {
      stickyPill.style.display = (this.isMobile && this.config.stickyHeader) ? 'flex' : 'none';
    }

    // 抽屉样式
    const drawer = document.getElementById('mobileCardDrawer');
    if (drawer) {
      if (this.config.drawerStyle === 'fullscreen') {
        drawer.classList.add('style-fullscreen');
      } else {
        drawer.classList.remove('style-fullscreen');
      }
    }
  }

  /**
   * 触发移动端轻微触觉微震反馈
   */
  triggerHaptic(type = 'light') {
    if (!this.config.haptics || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      if (type === 'medium') {
        navigator.vibrate(15);
      } else if (type === 'heavy') {
        navigator.vibrate([20, 30, 20]);
      } else {
        navigator.vibrate(8);
      }
    } catch (e) {}
  }

  /**
   * 绑定底部单手触控导航栏点击事件 (兼顾传统标签模式)
   */
  bindBottomNav() {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerHaptic('light');

        const step = parseInt(item.getAttribute('data-step') || '1');
        const action = item.getAttribute('data-action');

        if (action === 'preview') {
          if (typeof openMobileCardDrawer === 'function') {
            openMobileCardDrawer();
          }
          return;
        }

        if (this.flowManager) {
          this.flowManager.jumpToMainStep(step);
        } else if (typeof window.jumpToStep === 'function') {
          window.jumpToStep(step);
        }
      });
    });
  }

  /**
   * 当步骤切换时，高亮更新底部导航项
   */
  updateActiveStep(currentStep) {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(item => {
      const step = parseInt(item.getAttribute('data-step') || '1');
      const action = item.getAttribute('data-action');
      if (action !== 'preview') {
        if (step === currentStep) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      }
    });
  }

  /**
   * 实时刷新吸顶卡片小窗上的内容与属性徽标
   */
  updateStickyMiniCard() {
    if (!this.isMobile || !this.config.stickyHeader) return;

    const card = (window.state && window.state.cardData) ? window.state.cardData : null;
    if (!card) return;

    const nameEl = document.getElementById('stickyCardName');
    const attrEl = document.getElementById('stickyCardAttr');
    const levelEl = document.getElementById('stickyCardLevel');
    const statsEl = document.getElementById('stickyCardStats');

    if (nameEl) {
      nameEl.textContent = card.name || '未命名卡片';
    }

    if (attrEl) {
      const attrNames = { 32: '暗', 16: '光', 1: '地', 2: '水', 4: '炎', 8: '风', 64: '神' };
      attrEl.textContent = attrNames[card.attribute] || '暗';
      attrEl.className = `sticky-attr-badge attr-${card.attribute}`;
    }

    if (levelEl) {
      const isXyz = !!(card.type & 8388608);
      const isLink = !!(card.type & 67108864);
      if (isLink) {
        levelEl.textContent = `LINK-${card.linkRating || 1}`;
      } else if (isXyz) {
        levelEl.textContent = `★ 阶级 ${card.level || 4}`;
      } else if (!(card.type & (2 | 4))) {
        levelEl.textContent = `★ 等级 ${card.level || 4}`;
      } else {
        levelEl.textContent = (card.type & 2) ? '魔法' : '陷阱';
      }
    }

    if (statsEl) {
      if (!(card.type & (2 | 4))) {
        statsEl.style.display = 'inline-block';
        statsEl.textContent = `${card.atk ?? 0} / ${card.def ?? 0}`;
      } else {
        statsEl.style.display = 'none';
      }
    }
  }

  /**
   * 打开移动端专属 UI 设置弹窗
   */
  openSettingsModal() {
    if (!this.isMobile) return;
    this.triggerHaptic('light');
    const modal = document.getElementById('mobileUiSettingsModal');
    if (modal) {
      this.populateSettingsModal();
      modal.classList.add('active');
    }
  }

  /**
   * 关闭移动端专属 UI 设置弹窗
   */
  closeSettingsModal() {
    this.triggerHaptic('light');
    const modal = document.getElementById('mobileUiSettingsModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  /**
   * 将当前配置填充到设置弹窗的控件中
   */
  populateSettingsModal() {
    const getEl = id => document.getElementById(id);

    const layoutRadio = document.querySelector(`input[name="mobileLayoutOption"][value="${this.config.layoutMode}"]`);
    if (layoutRadio) layoutRadio.checked = true;

    if (getEl('chkMobileStickyHeader')) getEl('chkMobileStickyHeader').checked = !!this.config.stickyHeader;
    if (getEl('chkMobileHaptics')) getEl('chkMobileHaptics').checked = !!this.config.haptics;

    const scaleRadio = document.querySelector(`input[name="mobileRenderOption"][value="${this.config.renderScale}"]`);
    if (scaleRadio) scaleRadio.checked = true;

    const drawerRadio = document.querySelector(`input[name="mobileDrawerOption"][value="${this.config.drawerStyle}"]`);
    if (drawerRadio) drawerRadio.checked = true;
  }

  /**
   * 从设置弹窗保存并即时应用配置
   */
  saveSettingsFromModal() {
    const getEl = id => document.getElementById(id);

    const selectedLayout = document.querySelector('input[name="mobileLayoutOption"]:checked');
    const selectedScale = document.querySelector('input[name="mobileRenderOption"]:checked');
    const selectedDrawer = document.querySelector('input[name="mobileDrawerOption"]:checked');

    const newConf = {
      layoutMode: selectedLayout ? selectedLayout.value : 'tabs',
      stickyHeader: getEl('chkMobileStickyHeader') ? getEl('chkMobileStickyHeader').checked : true,
      haptics: getEl('chkMobileHaptics') ? getEl('chkMobileHaptics').checked : true,
      renderScale: selectedScale ? parseInt(selectedScale.value, 10) : 1,
      drawerStyle: selectedDrawer ? selectedDrawer.value : 'sheet'
    };

    this.saveConfig(newConf);
    this.closeSettingsModal();
    if (typeof showNotification === 'function') {
      showNotification('📱 手机端专属 UI 配置已保存并实时生效！');
    }
  }
}

// 实例化并挂载全局变量
const mobileUIManager = new MobileUIManager();
if (typeof window !== 'undefined') {
  window.MobileUIManager = MobileUIManager;
  window.MobileFlowManager = MobileFlowManager;
  window.mobileUIManager = mobileUIManager;
  window.mobileFlowNext = () => mobileUIManager.flowManager?.goNext();
  window.mobileFlowPrev = () => mobileUIManager.flowManager?.goPrev();
  window.mobileFlowJump = (idx) => mobileUIManager.flowManager?.jump(idx);
  window.openMobileUiSettings = () => mobileUIManager.openSettingsModal();
  window.closeMobileUiSettings = () => mobileUIManager.closeSettingsModal();
  window.saveMobileUiSettings = () => mobileUIManager.saveSettingsFromModal();
}
