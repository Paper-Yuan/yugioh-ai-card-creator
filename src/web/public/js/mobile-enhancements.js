/**
 * Mobile UI Enhancements Module
 * Android-specific optimizations: haptics, native dialogs replacement, back button handling
 */

class MobileEnhancements {
  constructor() {
    this.isAndroid = /Android/i.test(navigator.userAgent);
    this.isCapacitor = typeof window.Capacitor !== 'undefined';
    this.haptics = null;
    this.statusBar = null;
    this.share = null;
    this.initPlugins();
    this.initBackButton();
    this.initDebounce();
  }

  async initPlugins() {
    if (!this.isCapacitor) return;
    
    try {
      // Initialize Capacitor Haptics
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
        this.haptics = window.Capacitor.Plugins.Haptics;
      }
      
      // Initialize StatusBar
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
        this.statusBar = window.Capacitor.Plugins.StatusBar;
        await this.configureStatusBar();
      }
      
      // Initialize Share API
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
        this.share = window.Capacitor.Plugins.Share;
      }
    } catch (e) {
      console.warn('[MobileEnhancements] Plugin initialization:', e);
    }
  }

  async configureStatusBar() {
    if (!this.statusBar) return;
    
    try {
      await this.statusBar.setBackgroundColor({ color: '#0a0e17' });
      await this.statusBar.setStyle({ style: 'DARK' });
    } catch (e) {
      console.warn('[MobileEnhancements] StatusBar config:', e);
    }
  }

  initBackButton() {
    if (!this.isCapacitor || !window.Capacitor || !window.Capacitor.Plugins) return;
    
    try {
      const App = window.Capacitor.Plugins.App;
      if (App && App.addListener) {
        App.addListener('backButton', (event) => {
          this.handleBackButton(event);
        });
      }
    } catch (e) {
      console.warn('[MobileEnhancements] Back button handler:', e);
    }
  }

  handleBackButton(event) {
    // Check if modal is open
    const activeModal = document.querySelector('.modal-backdrop.show, .mobile-settings-modal.active, .mobile-card-drawer.active');
    if (activeModal) {
      this.triggerHaptic('light');
      // Close the topmost modal
      if (activeModal.classList.contains('mobile-card-drawer')) {
        if (typeof window.closeMobileCardDrawer === 'function') {
          window.closeMobileCardDrawer();
        }
      } else if (activeModal.classList.contains('mobile-settings-modal')) {
        if (typeof window.closeMobileUiSettings === 'function') {
          window.closeMobileUiSettings();
        }
      } else {
        const closeBtn = activeModal.querySelector('.btn-close-modal, .drawer-close-btn');
        if (closeBtn) closeBtn.click();
      }
      return;
    }

    // Check if mobile flow is active and not on first step
    if (window.mobileUIManager && window.mobileUIManager.flowManager) {
      const flowMgr = window.mobileUIManager.flowManager;
      if (flowMgr.currentStepIndex > 0) {
        this.triggerHaptic('light');
        flowMgr.goPrev();
        return;
      }
    }

    // Check if not on main step
    if (window.state && window.state.currentStep > 1) {
      this.triggerHaptic('light');
      if (typeof window.stepPrev === 'function') {
        window.stepPrev();
      }
      return;
    }

    // Exit app
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.exitApp();
    }
  }

  triggerHaptic(type = 'light') {
    if (!this.haptics) {
      // Fallback to Vibration API
      if (navigator.vibrate) {
        const duration = type === 'heavy' ? 20 : type === 'medium' ? 10 : 5;
        navigator.vibrate(duration);
      }
      return;
    }

    try {
      if (type === 'success') {
        this.haptics.notification({ type: 'SUCCESS' });
      } else if (type === 'warning') {
        this.haptics.notification({ type: 'WARNING' });
      } else if (type === 'error') {
        this.haptics.notification({ type: 'ERROR' });
      } else if (type === 'heavy') {
        this.haptics.impact({ style: 'HEAVY' });
      } else if (type === 'medium') {
        this.haptics.impact({ style: 'MEDIUM' });
      } else {
        this.haptics.impact({ style: 'LIGHT' });
      }
    } catch (e) {
      console.warn('[MobileEnhancements] Haptic feedback:', e);
    }
  }

  initDebounce() {
    this.debounceTimers = new Map();
  }

  debounce(fn, delay = 300, key = 'default') {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    const timer = setTimeout(() => {
      fn();
      this.debounceTimers.delete(key);
    }, delay);
    
    this.debounceTimers.set(key, timer);
  }

  // Toast notification system (replacement for alert/confirm)
  showToast(message, duration = 3000, type = 'info') {
    this.triggerHaptic('light');
    
    const toast = document.createElement('div');
    toast.className = `mobile-toast mobile-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: calc(80px + env(safe-area-inset-bottom, 16px));
      left: 16px;
      right: 16px;
      background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#1e293b'};
      color: #fff;
      padding: 14px 18px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 10000;
      animation: slideUpFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideDownFadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Confirmation dialog (replacement for confirm())
  async showConfirm(message, title = '确认操作', confirmText = '确定', cancelText = '取消') {
    return new Promise((resolve) => {
      this.triggerHaptic('medium');
      
      const backdrop = document.createElement('div');
      backdrop.className = 'mobile-confirm-backdrop';
      backdrop.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(8px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease;
      `;

      const dialog = document.createElement('div');
      dialog.className = 'mobile-confirm-dialog';
      dialog.style.cssText = `
        background: #0f172a;
        border: 1px solid rgba(245,158,11,0.3);
        border-radius: 16px;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 20px 40px rgba(0,0,0,0.8);
        animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      dialog.innerHTML = `
        <div style="padding: 20px 20px 16px;">
          <h3 style="font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0 0 12px;">${title}</h3>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0;">${message}</p>
        </div>
        <div style="display: flex; gap: 10px; padding: 0 20px 20px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; margin-top: 16px;">
          <button class="btn-cancel" style="flex: 1; min-height: 46px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;">${cancelText}</button>
          <button class="btn-confirm" style="flex: 1; min-height: 46px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: #000; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer;">${confirmText}</button>
        </div>
      `;

      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        backdrop.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => {
          backdrop.remove();
          document.body.style.overflow = '';
        }, 200);
      };

      dialog.querySelector('.btn-cancel').addEventListener('click', () => {
        this.triggerHaptic('light');
        cleanup();
        resolve(false);
      });

      dialog.querySelector('.btn-confirm').addEventListener('click', () => {
        this.triggerHaptic('success');
        cleanup();
        resolve(true);
      });

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.triggerHaptic('light');
          cleanup();
          resolve(false);
        }
      });
    });
  }

  // Input prompt dialog (replacement for prompt())
  async showPrompt(message, title = '输入', defaultValue = '', placeholder = '') {
    return new Promise((resolve) => {
      this.triggerHaptic('medium');
      
      const backdrop = document.createElement('div');
      backdrop.className = 'mobile-prompt-backdrop';
      backdrop.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(8px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease;
      `;

      const dialog = document.createElement('div');
      dialog.className = 'mobile-prompt-dialog';
      dialog.style.cssText = `
        background: #0f172a;
        border: 1px solid rgba(245,158,11,0.3);
        border-radius: 16px;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 20px 40px rgba(0,0,0,0.8);
        animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      dialog.innerHTML = `
        <div style="padding: 20px 20px 16px;">
          <h3 style="font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0 0 12px;">${title}</h3>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 16px;">${message}</p>
          <input type="text" class="prompt-input" value="${defaultValue}" placeholder="${placeholder}" style="width: 100%; background: #0c101a; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 14px; font-size: 16px; color: #f8fafc; outline: none;">
        </div>
        <div style="display: flex; gap: 10px; padding: 0 20px 20px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; margin-top: 16px;">
          <button class="btn-cancel" style="flex: 1; min-height: 46px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;">取消</button>
          <button class="btn-confirm" style="flex: 1; min-height: 46px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: #000; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer;">确定</button>
        </div>
      `;

      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);
      document.body.style.overflow = 'hidden';

      const input = dialog.querySelector('.prompt-input');
      setTimeout(() => input.focus(), 100);

      const cleanup = () => {
        backdrop.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => {
          backdrop.remove();
          document.body.style.overflow = '';
        }, 200);
      };

      dialog.querySelector('.btn-cancel').addEventListener('click', () => {
        this.triggerHaptic('light');
        cleanup();
        resolve(null);
      });

      dialog.querySelector('.btn-confirm').addEventListener('click', () => {
        this.triggerHaptic('success');
        const value = input.value.trim();
        cleanup();
        resolve(value);
      });

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.triggerHaptic('light');
          cleanup();
          resolve(null);
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.triggerHaptic('success');
          const value = input.value.trim();
          cleanup();
          resolve(value);
        }
      });
    });
  }

  // Share API wrapper
  async shareCard(title, text, files) {
    if (!this.share) {
      this.showToast('分享功能在当前环境不可用', 2000, 'warning');
      return false;
    }

    try {
      await this.share.share({
        title: title,
        text: text,
        files: files,
        dialogTitle: '分享卡片'
      });
      this.triggerHaptic('success');
      return true;
    } catch (e) {
      console.warn('[MobileEnhancements] Share failed:', e);
      this.showToast('分享失败', 2000, 'error');
      return false;
    }
  }

  // Add loading overlay
  showLoading(message = '处理中...') {
    let overlay = document.getElementById('mobile-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mobile-loading-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(8px);
        z-index: 10002;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      `;
      overlay.innerHTML = `
        <div style="width: 48px; height: 48px; border: 4px solid rgba(245,158,11,0.2); border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p class="loading-message" style="color: #f8fafc; font-size: 15px; font-weight: 600;"></p>
      `;
      document.body.appendChild(overlay);
    }
    overlay.querySelector('.loading-message').textContent = message;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  hideLoading() {
    const overlay = document.getElementById('mobile-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUpFadeIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideDownFadeOut {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(20px); opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes zoomIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Initialize and expose globally
const mobileEnhancements = new MobileEnhancements();
if (typeof window !== 'undefined') {
  window.mobileEnhancements = mobileEnhancements;
}
