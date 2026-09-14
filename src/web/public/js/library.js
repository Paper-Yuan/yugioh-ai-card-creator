// ========== 卡牌库管理（优化版：支持字段分类）==========
class CardLibrary {
  constructor() {
    this.cards = [];
    this.filteredCards = [];
    this.selectedCards = new Set();
    this.currentArchetype = 'all';
    this.loadCards();
  }

  // 从localStorage加载卡片
  loadCards() {
    const saved = localStorage.getItem('yugioh_cards');
    if (saved) {
      this.cards = JSON.parse(saved);
      this.filteredCards = [...this.cards];
      this.updateStats();
      this.renderCards();
      this.updateArchetypeFilter();
    }
  }

  // 保存卡片
  saveCard(card) {
    const index = this.cards.findIndex(c => c.id === card.id);
    if (index >= 0) {
      this.cards[index] = card;
    } else {
      this.cards.push(card);
    }
    localStorage.setItem('yugioh_cards', JSON.stringify(this.cards));
    this.loadCards();
  }

  // 删除卡片
  async deleteCard(cardId) {
    const confirmed = await mobileEnhancements.showConfirm('确定要删除这张卡片吗？', '删除卡片');
    if (confirmed) {
      this.cards = this.cards.filter(c => c.id !== cardId);
      localStorage.setItem('yugioh_cards', JSON.stringify(this.cards));
      this.selectedCards.delete(cardId);
      this.loadCards();
      showNotification('卡片已删除', 'success');
    }
  }

  // 更新统计（包含字段统计）
  updateStats() {
    // 总卡片数
    document.getElementById('totalCards').textContent = this.cards.length;
    
    // 获取所有字段
    const archetypes = new Set();
    let genericCount = 0;
    
    this.cards.forEach(card => {
      if (card.archetype && card.archetype.trim() !== '') {
        archetypes.add(card.archetype.trim());
      } else {
        genericCount++;
      }
    });
    
    // 字段数量
    document.getElementById('archetypeCount').textContent = archetypes.size;
    
    // 泛用卡数量
    document.getElementById('genericCount').textContent = genericCount;
    
    // 已选择数量
    document.getElementById('selectedCount').textContent = this.selectedCards.size;
  }

  // 更新字段过滤器选项
  updateArchetypeFilter() {
    const select = document.getElementById('filterArchetype');
    const archetypes = new Set();
    
    this.cards.forEach(card => {
      if (card.archetype && card.archetype.trim() !== '') {
        archetypes.add(card.archetype.trim());
      }
    });
    
    // 保存当前选中值
    const currentValue = select.value;
    
    // 重建选项
    let html = '<option value="all">全部字段</option>';
    html += '<option value="generic">泛用卡</option>';
    
    Array.from(archetypes).sort().forEach(archetype => {
      html += `<option value="${archetype}">${archetype}</option>`;
    });
    
    select.innerHTML = html;
    
    // 恢复选中值
    if (currentValue) {
      select.value = currentValue;
    }
  }

  // 渲染卡片列表
  renderCards() {
    const grid = document.getElementById('cardGrid');
    
    if (this.filteredCards.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <p>暂无卡片</p>
          <button class="btn btn-primary" onclick="navigateTo('card-maker')">开始制作</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.filteredCards.map(card => {
      const isSelected = this.selectedCards.has(card.id);
      return `
        <div class="card-item ${isSelected ? 'selected' : ''}" data-card-id="${card.id}">
          <div class="card-select-checkbox">
            <input type="checkbox" 
                   ${isSelected ? 'checked' : ''} 
                   onclick="library.toggleSelect(${card.id}, event)">
          </div>
          <img class="card-item-image" 
               src="${card.imageBase64 || '/img/placeholder.png'}" 
               alt="${card.name}"
               onclick="viewCardDetail(${card.id})"
               onerror="this.src='/img/placeholder.png'">
          <div class="card-item-info">
            <div class="card-item-name">${card.name}</div>
            <div class="card-item-archetype">${card.archetype || '泛用'}</div>
            <div class="card-item-type">${this.getTypeName(card.type)}</div>
            <div style="margin-top: 8px; display: flex; gap: 4px;">
              <button class="btn btn-sm btn-secondary" onclick="editCard(${card.id})">
                ✏️
              </button>
              <button class="btn btn-sm btn-danger" onclick="library.deleteCard(${card.id})">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 切换卡片选中状态
  toggleSelect(cardId, event) {
    event.stopPropagation();
    
    if (this.selectedCards.has(cardId)) {
      this.selectedCards.delete(cardId);
    } else {
      this.selectedCards.add(cardId);
    }
    
    this.updateStats();
    this.renderCards();
  }

  // 全选
  selectAll() {
    this.filteredCards.forEach(card => {
      this.selectedCards.add(card.id);
    });
    this.updateStats();
    this.renderCards();
  }

  // 取消选择
  clearSelection() {
    this.selectedCards.clear();
    this.updateStats();
    this.renderCards();
  }

  // 按字段过滤
  filterByArchetype() {
    const archetype = document.getElementById('filterArchetype').value;
    this.currentArchetype = archetype;
    
    if (archetype === 'all') {
      this.filteredCards = [...this.cards];
    } else if (archetype === 'generic') {
      this.filteredCards = this.cards.filter(c => !c.archetype || c.archetype.trim() === '');
    } else {
      this.filteredCards = this.cards.filter(c => c.archetype === archetype);
    }
    
    this.renderCards();
  }

  // 搜索卡片
  searchCards(query) {
    query = query.toLowerCase();
    
    let baseCards = this.cards;
    
    // 如果有字段过滤，先应用
    if (this.currentArchetype !== 'all') {
      if (this.currentArchetype === 'generic') {
        baseCards = this.cards.filter(c => !c.archetype || c.archetype.trim() === '');
      } else {
        baseCards = this.cards.filter(c => c.archetype === this.currentArchetype);
      }
    }
    
    this.filteredCards = baseCards.filter(card => 
      card.name.toLowerCase().includes(query) ||
      (card.description && card.description.toLowerCase().includes(query)) ||
      (card.archetype && card.archetype.toLowerCase().includes(query))
    );
    
    this.renderCards();
  }

  // 过滤卡片类型
  filterCards(type) {
    let baseCards = this.cards;
    
    // 先应用字段过滤
    if (this.currentArchetype !== 'all') {
      if (this.currentArchetype === 'generic') {
        baseCards = this.cards.filter(c => !c.archetype || c.archetype.trim() === '');
      } else {
        baseCards = this.cards.filter(c => c.archetype === this.currentArchetype);
      }
    }
    
    if (type === 'all') {
      this.filteredCards = baseCards;
    } else {
      this.filteredCards = baseCards.filter(c => c.type === parseInt(type));
    }
    
    this.renderCards();
  }

  // 导出选中的卡片
  async exportSelected() {
    if (this.selectedCards.size === 0) {
      showNotification('请先选择要导出的卡片', 'error');
      return;
    }

    showLoading(true, '正在导出选中卡片...');

    try {
      const selectedCardData = this.cards.filter(c => this.selectedCards.has(c.id));
      
      const formData = new FormData();
      formData.append('cards', JSON.stringify(selectedCardData));
      
      const response = await fetch('/api/export-cards', {
        method: 'POST',
        body: formData
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yugioh_cards_selected_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      showNotification(`✅ 已导出 ${this.selectedCards.size} 张卡片`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('导出失败', 'error');
    } finally {
      showLoading(false);
    }
  }

  // 导出当前字段的所有卡片
  async exportByArchetype() {
    if (this.currentArchetype === 'all') {
      showNotification('请先选择一个字段', 'error');
      return;
    }

    const archetypeName = this.currentArchetype === 'generic' ? '泛用' : this.currentArchetype;
    
    const confirmed = await mobileEnhancements.showConfirm(
      `确定要导出"${archetypeName}"字段的所有卡片吗？`,
      '导出字段卡片'
    );
    if (!confirmed) {
      return;
    }

    showLoading(true, `正在导出"${archetypeName}"字段...`);

    try {
      let cardsToExport;
      
      if (this.currentArchetype === 'generic') {
        cardsToExport = this.cards.filter(c => !c.archetype || c.archetype.trim() === '');
      } else {
        cardsToExport = this.cards.filter(c => c.archetype === this.currentArchetype);
      }

      if (cardsToExport.length === 0) {
        showNotification('该字段下没有卡片', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('cards', JSON.stringify(cardsToExport));
      formData.append('archetype', archetypeName);
      
      const response = await fetch('/api/export-archetype', {
        method: 'POST',
        body: formData
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yugioh_${archetypeName}_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      showNotification(`✅ 已导出"${archetypeName}"字段 ${cardsToExport.length} 张卡片`, 'success');
    } catch (error) {
      console.error('Export archetype error:', error);
      showNotification('导出失败', 'error');
    } finally {
      showLoading(false);
    }
  }

  // 导出所有卡片
  async exportAll() {
    if (this.cards.length === 0) {
      showNotification('没有可导出的卡片', 'error');
      return;
    }

    const data = JSON.stringify(this.cards, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yugioh_cards_all_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('卡片库已导出', 'success');
  }

  // 导入卡片
  async importCards(file) {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid format');
      }

      let addedCount = 0;
      let skippedCount = 0;

      for (const card of imported) {
        const exists = this.cards.find(c => c.id === card.id);
        if (exists) {
          const confirmed = await mobileEnhancements.showConfirm(
            `卡片 ${card.name} (ID: ${card.id}) 已存在，是否覆盖？`,
            '覆盖确认'
          );
          if (confirmed) {
            this.saveCard(card);
            addedCount++;
          } else {
            skippedCount++;
          }
        } else {
          this.saveCard(card);
          addedCount++;
        }
      }

      showNotification(`成功导入 ${addedCount} 张卡片${skippedCount > 0 ? `，跳过 ${skippedCount} 张` : ''}`, 'success');
    } catch (error) {
      showNotification('导入失败：文件格式错误', 'error');
    }
  }

  getTypeName(type) {
    const types = {
      1: '怪兽卡',
      2: '魔法卡',
      4: '陷阱卡'
    };
    return types[type] || '未知';
  }
}

// 初始化卡牌库
const library = new CardLibrary();

// 全局函数
function searchCards() {
  const query = document.getElementById('searchInput').value;
  library.searchCards(query);
}

function filterByArchetype() {
  library.filterByArchetype();
}

function filterCards() {
  const type = document.getElementById('filterType').value;
  library.filterCards(type);
}

function selectAllCards() {
  library.selectAll();
}

function clearSelection() {
  library.clearSelection();
}

function exportSelected() {
  library.exportSelected();
}

function exportByArchetype() {
  library.exportByArchetype();
}

function viewCardDetail(cardId) {
  const card = library.cards.find(c => c.id === cardId);
  if (!card) return;

  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${card.name}</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="modal-body">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${card.imageBase64 || '/img/placeholder.png'}" 
               style="max-width: 100%; max-height: 400px; border-radius: 8px;">
        </div>
        <div>
          <p><strong>卡片ID：</strong>${card.id}</p>
          <p><strong>名称：</strong>${card.name}</p>
          <p><strong>字段：</strong>${card.archetype || '泛用'}</p>
          <p><strong>类型：</strong>${library.getTypeName(card.type)}</p>
          ${card.type === 1 ? `
            <p><strong>等级：</strong>${card.level || 0}</p>
            <p><strong>攻击力/守备力：</strong>${card.atk || 0} / ${card.def || 0}</p>
          ` : ''}
          ${card.description ? `<p><strong>描述：</strong>${card.description}</p>` : ''}
          <p><strong>创建时间：</strong>${new Date(card.createdAt).toLocaleString()}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="editCard(${card.id})">✏️ 编辑</button>
        <button class="btn btn-primary" onclick="downloadSingleCard(${card.id})">📥 下载</button>
        <button class="btn btn-danger" onclick="library.deleteCard(${card.id}); this.closest('.modal').remove()">
          🗑️ 删除
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function editCard(cardId) {
  const card = library.cards.find(c => c.id === cardId);
  if (!card) return;

  navigateTo('card-maker');
  
  // 重置步骤
  state.currentStep = 1;
  updateStepDisplay();
  
  // 填充基本信息
  document.getElementById('cardId').value = card.id;
  document.getElementById('cardName').value = card.name;
  document.getElementById('cardArchetype').value = card.archetype || '';
  document.getElementById('cardType').value = card.type;
  
  if (card.type === 1) {
    document.getElementById('cardRace').value = card.race || 1;
    document.getElementById('cardAttribute').value = card.attribute || 1;
    document.getElementById('cardLevel').value = card.level || 4;
    document.getElementById('cardAtk').value = card.atk || 0;
    document.getElementById('cardDef').value = card.def || 0;
  }
  
  if (card.description) {
    document.getElementById('cardDesc').value = card.description;
  }

  // 恢复效果
  if (card.effects && card.scriptMethod === 'visual') {
    state.selectedEffects = card.effects;
    state.scriptMethod = 'visual';
  } else if (card.scriptCode) {
    state.manualScript = card.scriptCode;
    state.scriptMethod = 'manual';
  }

  // 恢复图片
  if (card.imageBase64) {
    state.imageBase64 = card.imageBase64;
    state.uploadedImage = true;
  }

  showNotification('卡片数据已加载，可以开始编辑', 'success');
  if (typeof markCardSaved === 'function') {
    markCardSaved();
  }
}

async function downloadSingleCard(cardId) {
  const card = library.cards.find(c => c.id === cardId);
  if (!card) return;

  showLoading(true, '正在打包卡片文件...');

  try {
    const formData = new FormData();
    formData.append('card', JSON.stringify(card));
    
    const response = await fetch('/api/export-single-card', {
      method: 'POST',
      body: formData
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.id}_${card.name}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('卡片文件已下载', 'success');
  } catch (error) {
    console.error('Download error:', error);
    showNotification('下载失败', 'error');
  } finally {
    showLoading(false);
  }
}

function exportAllCards() {
  library.exportAll();
}

function importCards() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      library.importCards(file);
    }
  };
  input.click();
}

async function clearAllData() {
  const confirmed1 = await mobileEnhancements.showConfirm(
    '⚠️ 警告：这将删除所有卡片数据，且无法恢复！\n\n确定要继续吗？',
    '清除所有数据'
  );
  if (confirmed1) {
    const confirmed2 = await mobileEnhancements.showConfirm(
      '再次确认：真的要删除所有数据吗？',
      '最终确认'
    );
    if (confirmed2) {
      localStorage.removeItem('yugioh_cards');
      localStorage.removeItem('yugioh_settings');
      library.cards = [];
      library.filteredCards = [];
      library.selectedCards.clear();
      library.updateStats();
      library.renderCards();
      showNotification('所有数据已清除', 'success');
    }
  }
}
