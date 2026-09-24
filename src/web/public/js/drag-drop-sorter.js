/**
 * Phase 11: 拖拽式效果排序系统
 * 支持通过拖拽调整效果顺序，提升用户体验
 */

class DragDropEffectSorter {
  constructor() {
    this.draggedItem = null;
    this.draggedIndex = -1;
    this.dropZones = [];
    this.enabled = true;
  }

  /**
   * 初始化拖拽排序系统
   */
  init() {
    this.bindDragEvents();
    this.addDragHandles();
    console.log('[Phase 11] Drag-Drop Effect Sorter initialized');
  }

  /**
   * 为每个效果项添加拖拽手柄
   */
  addDragHandles() {
    const effectItems = document.querySelectorAll('.wizard-effect-item');
    effectItems.forEach((item, index) => {
      if (item.querySelector('.drag-handle')) return; // 已存在

      const handle = document.createElement('div');
      handle.className = 'drag-handle';
      handle.innerHTML = '⋮⋮';
      handle.title = '拖拽调整顺序';
      handle.draggable = true;
      handle.dataset.effectIndex = index;

      item.insertBefore(handle, item.firstChild);
    });
  }

  /**
   * 绑定拖拽事件
   */
  bindDragEvents() {
    document.addEventListener('dragstart', (e) => this.handleDragStart(e), true);
    document.addEventListener('dragover', (e) => this.handleDragOver(e), true);
    document.addEventListener('drop', (e) => this.handleDrop(e), true);
    document.addEventListener('dragend', (e) => this.handleDragEnd(e), true);
  }

  /**
   * 拖拽开始
   */
  handleDragStart(e) {
    const handle = e.target.closest('.drag-handle');
    if (!handle || !this.enabled) return;

    const indexStr = handle.dataset.effectIndex;
    // 验证索引是否为有效数字
    if (!indexStr || isNaN(parseInt(indexStr))) {
      console.warn('[DragDropEffectSorter] Invalid effect index:', indexStr);
      return;
    }

    this.draggedIndex = parseInt(indexStr);
    this.draggedItem = handle.parentElement;

    this.draggedItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // 安全：只传递索引，不传递 HTML 内容
    e.dataTransfer.setData('text/plain', this.draggedIndex.toString());
  }

  /**
   * 拖拽经过
   */
  handleDragOver(e) {
    if (!this.draggedItem) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.target.closest('.wizard-effect-item');
    if (!target || target === this.draggedItem) return;

    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    // 判断插入位置（上方或下方）
    if (e.clientY < midpoint) {
      target.parentNode.insertBefore(this.draggedItem, target);
    } else {
      target.parentNode.insertBefore(this.draggedItem, target.nextSibling);
    }
  }

  /**
   * 拖拽放下
   */
  handleDrop(e) {
    if (!this.draggedItem) return;

    e.stopPropagation();
    e.preventDefault();

    // 更新状态数组
    this.updateEffectOrder();
    
    // 触发保存
    this.saveEffectOrder();
  }

  /**
   * 拖拽结束
   */
  handleDragEnd(e) {
    if (this.draggedItem) {
      this.draggedItem.classList.remove('dragging');
    }

    // 清除所有拖拽状态
    document.querySelectorAll('.wizard-effect-item').forEach(item => {
      item.classList.remove('drag-over');
    });

    this.draggedItem = null;
    this.draggedIndex = -1;
  }

  /**
   * 更新效果顺序
   */
  updateEffectOrder() {
    const effectItems = document.querySelectorAll('.wizard-effect-item');
    const newOrder = [];

    effectItems.forEach((item, newIndex) => {
      const handle = item.querySelector('.drag-handle');
      if (handle) {
        const oldIndex = parseInt(handle.dataset.effectIndex);
        handle.dataset.effectIndex = newIndex;
        
        // 更新序号显示
        const numberLabel = item.querySelector('.effect-number');
        if (numberLabel) {
          numberLabel.textContent = ['①', '②', '③', '④', '⑤'][newIndex] || `⑥`;
        }
      }
    });
  }

  /**
   * 保存效果顺序到状态
   */
  saveEffectOrder() {
    if (typeof state === 'undefined' || !state.wizardEffects) return;

    const effectItems = document.querySelectorAll('.wizard-effect-item');
    const newEffects = [];

    effectItems.forEach(item => {
      const handle = item.querySelector('.drag-handle');
      if (handle) {
        const index = parseInt(handle.dataset.effectIndex);
        if (state.wizardEffects[index]) {
          newEffects.push({ ...state.wizardEffects[index] });
        }
      }
    });

    // 更新状态
    state.wizardEffects = newEffects;

    // 触发效果同步
    if (typeof syncWizardToCardDescription === 'function') {
      syncWizardToCardDescription();
    }

    // 触发实时预览更新
    if (typeof liveEffectPreview !== 'undefined' && liveEffectPreview) {
      liveEffectPreview.updatePreview();
    }

    console.log('[DragDropEffectSorter] Effect order saved:', newEffects.length, 'effects');
  }

  /**
   * 启用/禁用拖拽
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    const handles = document.querySelectorAll('.drag-handle');
    handles.forEach(handle => {
      handle.style.opacity = enabled ? '1' : '0.3';
      handle.style.cursor = enabled ? 'grab' : 'not-allowed';
    });
  }
}

// 全局实例
let dragDropEffectSorter = null;

// 初始化函数
function initDragDropEffectSorter() {
  if (!dragDropEffectSorter) {
    dragDropEffectSorter = new DragDropEffectSorter();
    dragDropEffectSorter.init();
  }
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.DragDropEffectSorter = DragDropEffectSorter;
  window.initDragDropEffectSorter = initDragDropEffectSorter;
}
