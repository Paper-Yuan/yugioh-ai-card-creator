// ============================================================
// 游戏王 AI 制卡工作室 - 客户端核心驱动引擎 (Client-Side Core)
// ============================================================

const state = {
  currentStep: 1,
  scriptMethod: 'visual', // 'visual', 'manual', 'ai'
  cardData: {
    id: 100000001,
    name: '究极创世神 艾克佐迪亚',
    archetype: '',
    mainType: 'monster',
    type: 33, // 效果怪兽
    race: 1,  // 战士族
    attribute: 32, // 暗属性
    level: 10,
    atk: 4000,
    def: 4000,
    linkArrows: [4, 5, 6],
    scale: 1,
    effectRuby: false, // 是否为日文效果文本注入振假名
    description: '①：只要这张卡在场上表侧表示存在，不受对方卡的效果影响。\n②：一回合一次，可以破坏对方场上所有卡片。\n③：这张卡战斗破坏怪兽送去墓地时，给予对方4000点基本分伤害。'
  },
  effectConfig: {
    aliasEnabled: false,
    aliasName: '',
    totalEffects: 2,
    summonRestriction: 'none',
    countLimits: [
      { countLimit: 'hopt', countNumber: 1 },
      { countLimit: 'hopt', countNumber: 1 },
      { countLimit: 'sopt', countNumber: 1 },
      { countLimit: 'none', countNumber: 1 }
    ]
  },
  currentWizardIndex: 0,
  wizardEffects: [
    {
      timing: 'summon_success',
      cost: 'none',
      costLp: 1000,
      target: 'none',
      action: 'search_deck',
      followup: 'none',
      countLimit: 'hopt',
      countNumber: 1
    },
    {
      timing: 'ignition',
      cost: 'none',
      costLp: 1000,
      target: 'target_oppo_card',
      action: 'destroy_target',
      followup: 'none',
      countLimit: 'hopt',
      countNumber: 1
    }
  ],
  uploadedImageElement: null,
  selectedEffects: [],
  manualScript: '',
  generatedScript: '',
  renderer: null,
  assembler: null,
  cdbManager: null,
  cardSet: [],
  currentCardIndex: 0,
  setName: '自定义扩展系列 #1'
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  state.renderer = new CardRenderer();
  state.assembler = new ClientScriptAssembler();
  state.cdbManager = new ClientCDBManager();

  // 绑定所有表单变更事件实现实时渲染
  bindLiveFormEvents();

  // 绑定图片拖拽上传
  bindArtworkDropzone();

  // 绑定导航
  bindNavigation();

  // 初始化效果向导与频次限制配置
  renderEffectLimitsGrid();
  renderWizardStep();
  syncWizardToCardDescription();

  // 默认激活怪兽卡
  selectMainCardType('monster');

  // 初始化多卡卡包系列工程
  initCardSet();

  // 初始化本机原卡池自动侦测与防冲突引擎
  initCdbDetection();

  // 首屏实时绘制
  refreshLiveCard();
  updateStepDisplay();
  if (typeof markCardSaved === 'function') {
    markCardSaved();
  }
});

// ========== 实时双向绑定与 Canvas 重绘 ==========

function readFormToState() {
  const c = state.cardData;
  const idEl = document.getElementById('cardId');
  if (idEl) c.id = parseInt(idEl.value) || 100000001;
  const nameEl = document.getElementById('cardName');
  if (nameEl) c.name = nameEl.value.trim() || '未命名卡片';
  const langEl = document.getElementById('cardLanguage');
  if (langEl) c.language = langEl.value || 'zh';
  const rubyEl = document.getElementById('cardRuby');
  if (rubyEl) c.ruby = rubyEl.value.trim();
  const archEl = document.getElementById('cardArchetype');
  if (archEl) c.archetype = archEl.value.trim();
  const setcodeEl = document.getElementById('cardSetcode');
  if (setcodeEl) c.setcode = setcodeEl.value.trim();
  const typeEl = document.getElementById('cardType');
  if (typeEl) c.type = parseInt(typeEl.value) || 33;
  const raceEl = document.getElementById('cardRace');
  if (raceEl) c.race = parseInt(raceEl.value) || 1;
  const attrEl = document.getElementById('cardAttribute');
  if (attrEl) c.attribute = parseInt(attrEl.value) || 32;
  const lvlEl = document.getElementById('cardLevel');
  if (lvlEl) c.level = parseInt(lvlEl.value) || 4;
  const atkEl = document.getElementById('cardAtk');
  if (atkEl) c.atk = parseInt(atkEl.value);
  const defEl = document.getElementById('cardDef');
  if (defEl) c.def = parseInt(defEl.value);
  const descEl = document.getElementById('cardDesc');
  if (descEl) c.description = descEl.value || '';
  const typeHeaderEl = document.getElementById('cardTypeHeader');
  if (typeHeaderEl) c.typeHeader = typeHeaderEl.value.trim();

  // 效果外文本 / 独立规则条款 (Rule Texts)
  c.ruleTexts = {
    ruleAlias: document.getElementById('ruleAliasEnabled')?.checked || false,
    ruleAliasName: document.getElementById('ruleAliasName')?.value.trim() || '',
    ruleAliasId: document.getElementById('ruleAliasId')?.value.trim() || '',
    ssOncePerTurn: document.getElementById('ruleSsOnceEnabled')?.checked || false,
    cannotNormalSummon: document.getElementById('ruleNomiEnabled')?.checked || false,
    nomiType: document.getElementById('ruleNomiType')?.value || 'self_effect',
    cannotSpecialSummon: document.getElementById('ruleNoSpecialSummon')?.checked || false,
    materialRestriction: document.getElementById('ruleMaterialLimitEnabled')?.checked || false,
    materialType: document.getElementById('ruleMaterialType')?.value || 'all_extra',
    deckLimitOne: document.getElementById('ruleDeckLimitOne')?.checked || false,
    cannotBeReleased: document.getElementById('ruleCannotBeReleased')?.checked || false,
    cannotMSet: document.getElementById('ruleCannotMSet')?.checked || false,
    cannotTrigger: document.getElementById('ruleCannotTrigger')?.checked || false,
    cannotChangePosition: document.getElementById('ruleCannotChangePosition')?.checked || false,
    cannotAttack: document.getElementById('ruleCannotAttack')?.checked || false,
    cannotBeAttacked: document.getElementById('ruleCannotBeAttacked')?.checked || false,
    canDirectAttack: document.getElementById('ruleDirectAttack')?.checked || false,
    addMonsterType: document.getElementById('ruleAddMonsterType')?.value || '',
    ruleAttribute: document.getElementById('ruleAttribute')?.value || '',
    ruleRace: document.getElementById('ruleRace')?.value || '',
    ruleLevel: document.getElementById('ruleLevel')?.value.trim() || '',
    // 召唤方式手续：默认跟随怪兽种类自动适配；用户显式勾选后可覆盖召唤方式与素材数量
    autoSummonProcedure: true,
    procSummonType: document.getElementById('ruleSummonProcEnabled')?.checked
      ? (document.getElementById('ruleProcSummonType')?.value || '')
      : '',
    procMaterialCount: document.getElementById('ruleProcMaterialCount')?.value.trim() || '',
    customRule: document.getElementById('ruleCustomEnabled')?.checked || false,
    customRuleText: document.getElementById('ruleCustomText')?.value.trim() || ''
  };

  // Step 3: 原生整合 YGOLD 工艺参数与插图变换
  const overframeEl = document.getElementById('cardOverframeSelect');
  if (overframeEl) c.isOverframe = (overframeEl.value === 'overframe');
  const foilNameEl = document.getElementById('cardFoilNameSelect');
  if (foilNameEl) c.foilName = foilNameEl.value || 'auto';
  const scaleEl = document.getElementById('artScaleInput');
  if (scaleEl) c.artScale = parseInt(scaleEl.value) || 100;
  const offXEl = document.getElementById('artOffsetXInput');
  if (offXEl) c.artOffsetX = parseInt(offXEl.value) || 0;
  const offYEl = document.getElementById('artOffsetYInput');
  if (offYEl) c.artOffsetY = parseInt(offYEl.value) || 0;
  const fitEl = document.getElementById('artFitSelect');
  if (fitEl) c.artFit = fitEl.value || 'cover';
  const packCodeEl = document.getElementById('cardPackCodeInput');
  if (packCodeEl) c.packCode = packCodeEl.value.trim();
  const rareEl = document.getElementById('cardRareSelect');
  if (rareEl) c.rare = rareEl.value || 'none';
  const rareOpEl = document.getElementById('cardRareOpacityInput');
  if (rareOpEl) c.rareOpacity = (parseInt(rareOpEl.value) || 65) / 100;
  const wmEl = document.getElementById('cardWatermarkSelect');
  if (wmEl) c.watermark = wmEl.value || 'none';
  const wmOpEl = document.getElementById('cardWatermarkOpacityInput');
  if (wmOpEl) c.watermarkOpacity = (parseInt(wmOpEl.value) || 22) / 100;
  const holoEl = document.getElementById('cardHoloSelect');
  if (holoEl) c.holoStyle = holoEl.value || 'laser1';

  // 更新 Step 4 中的 ID 提示
  document.querySelectorAll('.cur-card-id').forEach(el => el.textContent = c.id);
}

async function refreshLiveCard() {
  readFormToState();
  if (window.mobileUIManager) {
    window.mobileUIManager.updateStickyMiniCard();
  }
  const canvas = document.getElementById('liveCardCanvas');
  if (canvas && state.renderer) {
    await state.renderer.render(canvas, state.cardData, state.uploadedImageElement);
    syncDrawerCanvas();
  }
}

function openMobileCardDrawer() {
  const drawer = document.getElementById('mobileCardDrawer');
  const backdrop = document.getElementById('mobileCardDrawerBackdrop');
  const titleEl = document.getElementById('drawerCardName');
  if (titleEl) {
    titleEl.textContent = state.cardData.name || '未命名卡片';
  }

  if (drawer) drawer.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';

  syncDrawerCanvas();
}

function closeMobileCardDrawer() {
  const drawer = document.getElementById('mobileCardDrawer');
  const backdrop = document.getElementById('mobileCardDrawerBackdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

function syncDrawerCanvas() {
  const liveCanvas = document.getElementById('liveCardCanvas');
  const drawerCanvas = document.getElementById('mobileDrawerCanvas');
  if (!liveCanvas || !drawerCanvas) return;

  if (drawerCanvas.width !== liveCanvas.width || drawerCanvas.height !== liveCanvas.height) {
    drawerCanvas.width = liveCanvas.width;
    drawerCanvas.height = liveCanvas.height;
  }
  const ctx = drawerCanvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, drawerCanvas.width, drawerCanvas.height);
    ctx.drawImage(liveCanvas, 0, 0);
  }
}

function bindLiveFormEvents() {
  const formIds = [
    'cardId', 'cardName', 'cardRuby', 'cardLanguage', 'cardArchetype', 'cardType', 
    'cardRace', 'cardAttribute', 'cardLevel', 'cardAtk', 'cardDef', 'cardDesc', 'cardTypeHeader'
  ];

  formIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      refreshLiveCard();
      compileLuaPreview();
      if (id === 'cardName' || id === 'cardId') {
        saveCurrentCardIntoSetSlot();
        renderCardSetBar();
      }
      if (id === 'cardId') {
        validateCardIdConflict();
      }
      if (id === 'cardArchetype') {
        state.cardData.archetype = el.value.trim();
        saveCurrentCardIntoSetSlot();
      }
      if (id === 'cardTypeHeader') {
        state.cardData.typeHeader = el.value.trim();
        state.cardData.hasManuallyEditedTypeHeader = true;
        saveCurrentCardIntoSetSlot();
      }
    });
    el.addEventListener('change', () => {
      refreshLiveCard();
      compileLuaPreview();
      saveCurrentCardIntoSetSlot();
      if (id === 'cardName' || id === 'cardId') {
        renderCardSetBar();
      }
      if (id === 'cardId') {
        validateCardIdConflict();
      }
      if (id === 'cardArchetype') {
        onCardArchetypeChanged(el.value);
      }
      if (id === 'cardRace') {
        if (!state.cardData.hasManuallyEditedTypeHeader) {
          const lang = state.cardData.language === 'ja' ? 'ja' : 'zh';
          const newUpper = computeUpperText(lang);
          state.cardData.typeHeader = newUpper;
          const headerEl = document.getElementById('cardTypeHeader');
          if (headerEl) headerEl.value = newUpper;
          refreshLiveCard();
        }
      }
    });
  });

  const ygoldInputIds = [
    'cardOverframeSelect', 'cardFoilNameSelect',
    'artScaleInput', 'artOffsetXInput', 'artOffsetYInput', 'artFitSelect',
    'cardPackCodeInput', 'cardRareSelect', 'cardRareOpacityInput',
    'cardWatermarkSelect', 'cardWatermarkOpacityInput', 'cardHoloSelect'
  ];
  ygoldInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      readFormToState();
      saveCurrentCardIntoSetSlot();
      refreshLiveCard();
    });
    el.addEventListener('change', () => {
      readFormToState();
      saveCurrentCardIntoSetSlot();
      refreshLiveCard();
    });
  });
}

function generateRandomId() {
  const curArch = (state.cardData.archetype || '').trim();
  const curId = Number(state.cardData.id);
  let safeId;

  // 1. 若当前卡片已归属某个字段，且存在同字段已有 DIY 卡，直接自动顺延同字段空闲序号
  const sameArchCards = curArch ? getDiyCardsByArchetype(curArch).filter(c => Number(c.id) !== curId) : [];
  if (sameArchCards.length > 0) {
    safeId = findNextSafePasscode(curArch, null, curId);
    showNotification(`🎴 已自动延续同字段「${curArch}」下一可用卡密: #${safeId}`);
  } else {
    // 2. 收集所有 DIY 占用的卡密
    const occupiedDiyIds = new Set();
    getAllDiyCards().forEach(c => {
      if (c && c.id && Number(c.id) !== curId) occupiedDiyIds.add(Number(c.id));
    });

    // 3. 从随机卡密池中彻底排除 YGOPro 14,981 张官方实卡与已有 DIY 卡
    if (state.cdbManager && typeof state.cdbManager.generateRandomSafePasscode === 'function') {
      safeId = state.cdbManager.generateRandomSafePasscode(occupiedDiyIds);
    } else {
      const randBase = Math.floor(100000000 + Math.random() * 800000000);
      safeId = findNextSafePasscode('', randBase, curId);
    }
    showNotification(`🎲 已生成专属无冲突安全卡密: #${safeId}`);
  }

  const idEl = document.getElementById('cardId');
  if (idEl) idEl.value = safeId;
  state.cardData.id = safeId;
  readFormToState();
  saveCurrentCardIntoSetSlot();
  validateCardIdConflict();
  refreshLiveCard();
  compileLuaPreview();
  renderCardSetBar();
}

// ========== 步骤流转导航 ==========

function jumpToStep(step) {
  state.currentStep = step;
  updateStepDisplay();
  if (window.mobileUIManager) {
    window.mobileUIManager.updateActiveStep(step);
    if (window.mobileUIManager.isMobile && window.mobileUIManager.flowManager) {
      window.mobileUIManager.flowManager.jumpToMainStep(step);
    }
  }
}

function stepNext() {
  if (state.currentStep < 4) {
    state.currentStep++;
    updateStepDisplay();
  }
}

function stepPrev() {
  if (state.currentStep > 1) {
    state.currentStep--;
    updateStepDisplay();
  }
}

function updateStepDisplay() {
  // 更新顶部大栏与步骤按钮高亮
  document.querySelectorAll('.header-step-btn, .step-indicator').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'completed');
    if (s === state.currentStep) {
      el.classList.add('active');
    } else if (s < state.currentStep) {
      el.classList.add('completed');
    }
  });

  // 更新内容分区展示
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step${i}-content`);
    if (el) el.classList.toggle('active', i === state.currentStep);
  }

  // 更新底部按钮
  const btnPrev = document.getElementById('btnPrevStep');
  const btnNext = document.getElementById('btnNextStep');

  if (btnPrev) btnPrev.style.display = state.currentStep === 1 ? 'none' : 'inline-flex';
  if (btnNext) btnNext.style.display = state.currentStep === 4 ? 'none' : 'inline-flex';

  // 步骤 4 自动生成脚本预览
  if (state.currentStep === 4) {
    compileLuaPreview();
  }

  // 联动移动端专属底部导航栏
  if (window.mobileUIManager) {
    window.mobileUIManager.updateActiveStep(state.currentStep);
  }
}

// ========== 步骤1：卡牌信息录入逻辑 (怪兽/魔法/陷阱三大类型与连接怪兽九宫格) ==========

function selectMainCardType(mainType) {
  state.cardData.mainType = mainType;
  
  // 更新三个大卡片按钮的高亮
  ['monster', 'spell', 'trap'].forEach(t => {
    const btn = document.getElementById(`btnMainType${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) btn.classList.toggle('active', t === mainType);
  });

  const pMonster = document.getElementById('panelMonsterFields');
  const pSpell = document.getElementById('panelSpellFields');
  const pTrap = document.getElementById('panelTrapFields');
  const summonRestrWrap = document.getElementById('summonRestrictionWrap');

  if (pMonster) pMonster.style.display = mainType === 'monster' ? 'block' : 'none';
  if (pSpell) pSpell.style.display = mainType === 'spell' ? 'block' : 'none';
  if (pTrap) pTrap.style.display = mainType === 'trap' ? 'block' : 'none';
  if (summonRestrWrap) summonRestrWrap.style.display = mainType === 'monster' ? 'block' : 'none';

  if (mainType === 'monster') {
    onMonsterCategoryChanged();
  } else if (mainType === 'spell') {
    const activeSpellBtn = document.querySelector('#panelSpellFields .sub-type-btn.active');
    const typeCode = activeSpellBtn ? parseInt(activeSpellBtn.dataset.type) : 2;
    document.getElementById('cardType').value = typeCode;
    state.cardData.type = typeCode;
    refreshLiveCard();
  } else if (mainType === 'trap') {
    const activeTrapBtn = document.querySelector('#panelTrapFields .sub-type-btn.active');
    const typeCode = activeTrapBtn ? parseInt(activeTrapBtn.dataset.type) : 4;
    document.getElementById('cardType').value = typeCode;
    state.cardData.type = typeCode;
    refreshLiveCard();
  }

  if (typeof applyRuleTextAdaptation === 'function') applyRuleTextAdaptation();
  syncWizardToCardDescription();
}

function syncTraitChipsFromType(typeCode) {
  const isEffect = !!(typeCode & 32);
  const isTuner = !!(typeCode & 4096);
  const isSpSummon = !!(typeCode & 33554432);
  const isPendulum = !!(typeCode & 16777216);
  const isFlip = !!(typeCode & 2097152);
  const isToon = !!(typeCode & 4194304);
  const isSpirit = !!(typeCode & 512);
  const isUnion = !!(typeCode & 1024);
  const isDual = !!(typeCode & 2048);

  const setChip = (id, active) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', !!active);
  };

  setChip('chip_trait_32', isEffect);
  setChip('chip_trait_4096', isTuner);
  setChip('chip_trait_33554432', isSpSummon);
  setChip('chip_trait_16777216', isPendulum);
  setChip('chip_trait_2097152', isFlip);
  setChip('chip_trait_4194304', isToon);
  setChip('chip_trait_512', isSpirit);
  setChip('chip_trait_1024', isUnion);
  setChip('chip_trait_2048', isDual);

  const chkPendulum = document.getElementById('chkIsPendulum');
  if (chkPendulum) chkPendulum.checked = isPendulum;

  const scaleWrap = document.getElementById('pendulumScaleWrap');
  const penWizard = document.getElementById('panelPendulumWizard');
  if (scaleWrap) scaleWrap.style.display = isPendulum ? 'grid' : 'none';
  if (penWizard) penWizard.style.display = isPendulum ? 'block' : 'none';
}

function toggleMonsterTrait(traitMask) {
  traitMask = parseInt(traitMask);
  let curType = state.cardData.type || 33;

  if (traitMask === 32) {
    // 效果与通常切换
    if (curType & 32) {
      curType = (curType & ~32) | 16;
    } else {
      curType = (curType & ~16) | 32;
    }
  } else if (traitMask === 16777216) {
    // 灵摆特性
    if (curType & 16777216) {
      curType = curType & ~16777216;
    } else {
      curType = curType | 16777216;
      if (!state.pendulumEffect) {
        onPendulumFieldChanged('init', true);
      }
    }
  } else {
    // 调整、特殊召唤、反转、卡通、灵魂、同盟、二重等
    if (curType & traitMask) {
      curType = curType & ~traitMask;
    } else {
      curType = curType | traitMask;
    }
  }

  // 保证怪兽卡基本标记 0x1
  curType = curType | 1;

  document.getElementById('cardType').value = curType;
  state.cardData.type = curType;

  syncTraitChipsFromType(curType);

  if (!state.cardData.hasManuallyEditedTypeHeader) {
    const lang = state.cardData.language === 'ja' ? 'ja' : 'zh';
    const newUpper = computeUpperText(lang);
    state.cardData.typeHeader = newUpper;
    const headerEl = document.getElementById('cardTypeHeader');
    if (headerEl) headerEl.value = newUpper;
  }

  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
  compileLuaPreview();
}

function onMonsterCategoryChanged(preserveTraits = false) {
  const catEl = document.getElementById('monsterCategory');
  if (!catEl) return;
  const baseCategory = parseInt(catEl.value) || 33;
  
  let typeCode;
  if (preserveTraits) {
    typeCode = state.cardData.type || baseCategory;
  } else {
    // 提取当前已激活的复合特性（调整、特殊召唤、反转、卡通、灵魂、同盟、二重）
    const activeTraits = (state.cardData.type || 0) & (4096 | 33554432 | 2097152 | 4194304 | 512 | 1024 | 2048);
    const chkPendulum = document.getElementById('chkIsPendulum');
    const isPendulum = (baseCategory === 16777249) || !!(chkPendulum && chkPendulum.checked) || !!((state.cardData.type || 0) & 16777216);

    typeCode = baseCategory | activeTraits | 1;
    if (isPendulum) {
      typeCode |= 16777216;
    } else {
      typeCode &= ~16777216;
    }

    if (baseCategory === 1) {
      // 纯通常怪兽
      typeCode = (typeCode & ~32) | 16;
    } else {
      typeCode = (typeCode & ~16) | 32;
    }
  }

  document.getElementById('cardType').value = typeCode;
  state.cardData.type = typeCode;

  syncTraitChipsFromType(typeCode);

  // 怪兽种类变化 → 重新适配效果外文本中「仅怪兽适用」的条款
  if (typeof applyRuleTextAdaptation === 'function') applyRuleTextAdaptation();

  if (!state.cardData.hasManuallyEditedTypeHeader) {
    const lang = state.cardData.language === 'ja' ? 'ja' : 'zh';
    const newUpper = computeUpperText(lang);
    state.cardData.typeHeader = newUpper;
    const headerEl = document.getElementById('cardTypeHeader');
    if (headerEl) headerEl.value = newUpper;
  }

  const isLink = !!(typeCode & 67108864);
  const isXyz = !!(typeCode & 8388608);
  const isPendulum = !!(typeCode & 16777216);

  const defWrap = document.getElementById('defFieldWrap');
  const linkWrap = document.getElementById('linkMonsterArrowsWrap');
  const levelLabel = document.getElementById('levelLabel');

  if (isLink) {
    if (defWrap) defWrap.style.display = 'none';
    if (linkWrap) linkWrap.style.display = 'block';
    if (levelLabel) levelLabel.textContent = '连接数 (Link Rating)';
    updateLinkRatingDisplay();
  } else {
    if (defWrap) defWrap.style.display = 'block';
    if (linkWrap) linkWrap.style.display = 'none';
    if (levelLabel) levelLabel.textContent = isXyz ? '阶级 (Rank)' : '等级 (Level)';
  }

  if (isPendulum && !state.pendulumEffect) {
    onPendulumFieldChanged('init', true);
  }

  refreshLiveCard();
  compileLuaPreview();
}

// ========== LD制卡器标准：上部文本 (種族／分類／能力／効果) 自动计算与一键适配 ==========

function computeUpperText(lang = 'ja') {
  const isJa = lang === 'ja';
  const c = state.cardData || {};
  const isMon = (c.type & 1) || (c.mainType === 'monster') || !(c.type & (2 | 4));
  if (!isMon) return '';

  if (isJa) {
    const jaRaceMap = {
      1: '戦士族', 2: '魔法使い族', 4: '天使族', 8: '悪魔族', 16: 'アンデット族',
      32: '機械族', 64: '水族', 128: '炎族', 256: '岩石族', 512: '鳥獣族',
      1024: '植物族', 2048: '昆虫族', 4096: '雷族', 8192: 'ドラゴン族', 16384: '獣族',
      32768: '獣戦士族', 65536: '恐竜族', 131072: '魚族', 262144: '海竜族',
      524288: '爬虫類族', 1048576: 'サイキック族', 2097152: '幻神獣族', 4194304: '幻竜族',
      8388608: 'サイバース族', 16777216: '幻想魔族', 33554432: '創造神族'
    };
    const race = jaRaceMap[c.race] || '戦士族';
    const tags = [race];

    // 1. 召唤主分类 (融合/儀式/シンクロ/エクシーズ/リンク)
    if (c.type & 64) tags.push('融合');
    if (c.type & 128) tags.push('儀式');
    if (c.type & 8192) tags.push('シンクロ');
    if (c.type & 8388608) tags.push('エクシーズ');
    if (c.type & 67108864) tags.push('リンク');

    // 2. 灵摆
    if (c.type & 16777216) tags.push('ペンデュラム');

    // 3. 特殊召唤
    if (c.type & 33554432) tags.push('特殊召喚');

    // 4. 复合特性能力
    if (c.type & 4194304) tags.push('トゥーン');
    if (c.type & 512) tags.push('スピリット');
    if (c.type & 1024) tags.push('ユニオン');
    if (c.type & 2048) tags.push('デュアル');
    if (c.type & 2097152) tags.push('リバース');
    if (c.type & 4096) tags.push('チューナー');

    // 5. 结尾
    if (c.type & 16384) {
      tags.push('トークン');
    } else if (c.type & 32) {
      tags.push('効果');
    } else if ((c.type & 16) || (c.type & 1)) {
      tags.push('通常');
    } else {
      tags.push('効果');
    }

    return `【${tags.join('／')}】`;
  } else {
    const zhRaceMap = {
      1: '战士族', 2: '魔法师族', 4: '天使族', 8: '恶魔族', 16: '不死族',
      32: '机械族', 64: '水族', 128: '炎族', 256: '岩石族', 512: '鸟兽族',
      1024: '植物族', 2048: '昆虫族', 4096: '雷族', 8192: '龙族', 16384: '兽族',
      32768: '兽战士族', 65536: '恐龙族', 131072: '鱼族', 262144: '海龙族',
      524288: '爬虫族', 1048576: '念动力族', 2097152: '幻神兽族', 4194304: '幻龙族',
      8388608: '电子界族', 16777216: '幻想魔族', 33554432: '创造神族'
    };
    const race = zhRaceMap[c.race] || '战士族';
    const tags = [race];

    if (c.type & 64) tags.push('融合');
    if (c.type & 128) tags.push('仪式');
    if (c.type & 8192) tags.push('同调');
    if (c.type & 8388608) tags.push('超量');
    if (c.type & 67108864) tags.push('连接');
    if (c.type & 16777216) tags.push('灵摆');
    if (c.type & 33554432) tags.push('特殊召唤');
    if (c.type & 4194304) tags.push('卡通');
    if (c.type & 512) tags.push('灵魂');
    if (c.type & 1024) tags.push('同盟');
    if (c.type & 2048) tags.push('二重');
    if (c.type & 2097152) tags.push('反转');
    if (c.type & 4096) tags.push('调整');

    if (c.type & 16384) {
      tags.push('衍生物');
    } else if (c.type & 32) {
      tags.push('效果');
    } else if ((c.type & 16) || (c.type & 1)) {
      tags.push('通常');
    } else {
      tags.push('效果');
    }

    return `【${tags.join('／')}】`;
  }
}

function autoAdaptUpperText(notify = true) {
  readFormToState();
  state.cardData.hasManuallyEditedTypeHeader = false;
  const lang = state.cardData.language === 'ja' ? 'ja' : 'zh';
  const upper = computeUpperText(lang);
  state.cardData.typeHeader = upper;
  const inputEl = document.getElementById('cardTypeHeader');
  if (inputEl) inputEl.value = upper;
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
  if (notify) {
    showNotification(`⚡ 已根据当前种族特性一键适配上部文本：${upper}`);
  }
}

function autoAdaptJapaneseCard(notify = true) {
  readFormToState();
  state.cardData.language = 'ja';
  const langSelect = document.getElementById('cardLanguage');
  if (langSelect) langSelect.value = 'ja';

  // 1. 自动提取或适配卡名注音 (Ruby)
  let name = state.cardData.name || '';
  const rubyMatch = name.match(/^(.*?)\[(.*?)\]$/) || name.match(/^(.*?)\((.*?)\)$/);
  if (rubyMatch) {
    const baseName = rubyMatch[1].trim();
    const rubyText = rubyMatch[2].trim();
    state.cardData.name = baseName;
    state.cardData.ruby = rubyText;
    const nameEl = document.getElementById('cardName');
    if (nameEl) nameEl.value = baseName;
    const rubyEl = document.getElementById('cardRuby');
    if (rubyEl) rubyEl.value = rubyText;
  }

  // 2. 自动适配上部文本 (日文)
  state.cardData.hasManuallyEditedTypeHeader = false;
  const upperJa = computeUpperText('ja');
  state.cardData.typeHeader = upperJa;
  const upperEl = document.getElementById('cardTypeHeader');
  if (upperEl) upperEl.value = upperJa;

  // 3. 同步效果向导文本，生成日文卡面描述
  syncWizardToCardDescription();
  syncPendulumToCard();
  renderWizardStep();
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();

  if (notify) {
    showNotification(`🇯🇵 已完成日文 OCG 一键适配！卡面已直接呈现官方日文排版。`);
  }
}

function onCardTypeHeaderChanged(val) {
  state.cardData.typeHeader = val;
  state.cardData.hasManuallyEditedTypeHeader = true;
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

function toggleLinkArrow(arrowId) {
  arrowId = parseInt(arrowId);
  if (!state.cardData.linkArrows) {
    state.cardData.linkArrows = [4, 5, 6];
  }
  const idx = state.cardData.linkArrows.indexOf(arrowId);
  if (idx >= 0) {
    state.cardData.linkArrows.splice(idx, 1);
  } else {
    state.cardData.linkArrows.push(arrowId);
  }
  updateLinkRatingDisplay();
  refreshLiveCard();
}

function updateLinkRatingDisplay() {
  const arrows = state.cardData.linkArrows || [];
  for (let i = 1; i <= 8; i++) {
    const btn = document.getElementById(`larr_${i}`);
    if (btn) btn.classList.toggle('active', arrows.includes(i));
  }
  const badge = document.getElementById('linkRatingBadge');
  if (badge) badge.textContent = `LINK-${arrows.length}`;
  
  const lvlInput = document.getElementById('cardLevel');
  if (lvlInput && (state.cardData.type & 67108864)) {
    lvlInput.value = arrows.length;
    state.cardData.level = arrows.length;
  }
}

function selectSpellSubtype(typeCode, typeName) {
  document.querySelectorAll('#panelSpellFields .sub-type-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.type) === typeCode);
  });
  document.getElementById('cardType').value = typeCode;
  state.cardData.type = typeCode;
  refreshLiveCard();
  showNotification(`已设定为: ${typeName}，右上角自动显示标识`);
}

function selectTrapSubtype(typeCode, typeName) {
  document.querySelectorAll('#panelTrapFields .sub-type-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.type) === typeCode);
  });
  document.getElementById('cardType').value = typeCode;
  state.cardData.type = typeCode;
  refreshLiveCard();
  showNotification(`已设定为: ${typeName}，右上角自动显示标识`);
}

function togglePendulumMode(checked) {
  onMonsterCategoryChanged();
}

function onScaleChanged(val) {
  const scale = Math.max(0, Math.min(13, parseInt(val) || 0));
  state.cardData.scale = scale;
  refreshLiveCard();
}

function onPendulumFieldChanged(field, value) {
  if (!state.pendulumEffect) {
    state.pendulumEffect = {
      countLimit: 'hopt',
      countNumber: 1,
      timing: 'ignition',
      cost: 'destroy_self',
      costLp: 1000,
      target: 'none',
      action: 'search_deck',
      followup: 'none'
    };
  }
  if (field !== 'init') {
    state.pendulumEffect[field] = value;
  }
  syncPendulumToCard();
}

function onPendulumCostChanged(costType) {
  const lpWrap = document.getElementById('penLpWrap');
  if (lpWrap) lpWrap.style.display = costType === 'pay_lp' ? 'block' : 'none';
  onPendulumFieldChanged('cost', costType);
}

function syncPendulumToCard() {
  if (!state.assembler || !state.pendulumEffect) return;
  const penTextZh = state.assembler.generatePendulumText(state.pendulumEffect, false);
  const penTextJa = state.assembler.generatePendulumText(state.pendulumEffect, true);

  const prevEl = document.getElementById('pendulumEffectTextPreview');
  if (prevEl) prevEl.textContent = penTextZh;

  const jaWrap = document.getElementById('pendulumJaEffectTextPreviewWrap');
  const jaPrevEl = document.getElementById('pendulumJaEffectTextPreview');
  if (jaWrap && jaPrevEl) {
    if (state.cardData.language === 'ja') {
      jaWrap.style.display = 'block';
      jaPrevEl.textContent = penTextJa;
    } else {
      jaWrap.style.display = 'none';
    }
  }

  const descInput = document.getElementById('pendulumDesc');
  if (descInput) descInput.value = penTextZh;

  state.cardData.pendulumDescription = penTextZh;
  state.cardData.jaPendulumDescription = state.cardData.effectRuby
    ? applyEffectRuby(penTextJa)
    : penTextJa;
  state.cardData.pendulumEffect = state.pendulumEffect;
  refreshLiveCard();
  compileLuaPreview();
}

/**
 * 为日文效果文本注入振假名 (受 state.cardData.effectRuby 开关控制)
 */
function applyEffectRuby(jaText) {
  const srv = window.furiganaService || null;
  if (!srv || typeof srv.injectEffectFurigana !== 'function') return jaText;
  if (srv.hasEffectFurigana && srv.hasEffectFurigana(jaText)) return jaText;
  return srv.injectEffectFurigana(jaText);
}

/**
 * 切换「日文效果文注音」开关：重新生成日文效果文本并注入/移除振假名
 */
function toggleEffectRuby() {
  state.cardData.effectRuby = !state.cardData.effectRuby;
  syncWizardToCardDescription();
  syncPendulumToCard();
  const el = document.getElementById('btnEffectRuby');
  if (el) {
    el.textContent = state.cardData.effectRuby ? '⚡ 效果文注音：已开启' : '⚡ 效果文注音';
    el.style.color = state.cardData.effectRuby ? '#34d399' : '#38bdf8';
  }
  showNotification(state.cardData.effectRuby
    ? '已为日文效果文注入振假名（可再次点击关闭）'
    : '已关闭日文效果文注音');
}

// ========== 步骤2：效果设计逻辑 (前置规则 + 顺次单效果独立设计向导) ==========

function setTotalEffectsCount(count) {
  state.effectConfig.totalEffects = count;
  document.querySelectorAll('.effect-count-buttons .count-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
  });

  while (state.wizardEffects.length < count) {
    state.wizardEffects.push({
      timing: 'ignition',
      cost: 'none',
      costLp: 1000,
      target: 'target_oppo_card',
      action: 'destroy_target',
      followup: 'none',
      countLimit: 'hopt',
      countNumber: 1
    });
  }

  renderEffectLimitsGrid();
  if (state.currentWizardIndex >= count) {
    state.currentWizardIndex = count - 1;
  }
  renderWizardStep();
  syncWizardToCardDescription();
  window.dispatchEvent(new CustomEvent('effectCountChanged', { detail: { count } }));
}

function onPreRulesChanged() {
  const chkAlias = document.getElementById('aliasEnabled');
  const aliasWrap = document.getElementById('aliasInputWrap');
  if (chkAlias && aliasWrap) {
    aliasWrap.style.display = chkAlias.checked ? 'block' : 'none';
    state.effectConfig.aliasEnabled = chkAlias.checked;
  }
  const aliasInput = document.getElementById('aliasName');
  if (aliasInput) {
    state.effectConfig.aliasName = aliasInput.value.trim();
  }
  const summonRestr = document.getElementById('summonRestriction');
  if (summonRestr) {
    state.effectConfig.summonRestriction = summonRestr.value;
  }
  syncWizardToCardDescription();
}

function renderEffectLimitsGrid() {
  const grid = document.getElementById('effectLimitsConfigGrid');
  if (!grid) return;
  const count = state.effectConfig.totalEffects || 2;
  const orderSymbols = ['①', '②', '③', '④'];

  let html = '';
  for (let i = 0; i < count; i++) {
    const sym = orderSymbols[i] || `(${i + 1})`;
    const eff = state.wizardEffects[i] || { countLimit: 'hopt', countNumber: 1 };
    html += `
      <div class="limit-slot-card">
        <div class="limit-slot-header">
          <span class="limit-slot-badge">效果 ${sym} 频次限制</span>
          <span style="font-size:11px;color:var(--text-dim)">次数数字可改</span>
        </div>
        <div class="limit-slot-controls">
          <select class="form-select" onchange="onEffectLimitTypeChanged(${i}, this.value)" style="flex:1;">
            <option value="hopt" ${eff.countLimit === 'hopt' ? 'selected' : ''}>卡名 1 回合 (HOPT)</option>
            <option value="sopt" ${eff.countLimit === 'sopt' ? 'selected' : ''}>场上卡片 1 回合 (SOPT)</option>
            <option value="duel" ${eff.countLimit === 'duel' ? 'selected' : ''}>一场决斗中仅</option>
            <option value="battle" ${eff.countLimit === 'battle' ? 'selected' : ''}>一场战斗阶段仅</option>
            <option value="none" ${eff.countLimit === 'none' ? 'selected' : ''}>无次数限制</option>
          </select>
          <input type="number" class="limit-number-input" value="${eff.countNumber || 1}" min="1" max="9" title="使用次数 (可自由修改数字 N)" onchange="onEffectLimitNumberChanged(${i}, this.value)">
          <span style="font-size:12px;color:var(--text-muted)">次</span>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
}

function onEffectLimitTypeChanged(index, type) {
  if (state.wizardEffects[index]) {
    state.wizardEffects[index].countLimit = type;
  }
  renderWizardStep();
  syncWizardToCardDescription();
}

function onEffectLimitNumberChanged(index, num) {
  const n = parseInt(num) || 1;
  if (state.wizardEffects[index]) {
    state.wizardEffects[index].countNumber = n;
  }
  renderWizardStep();
  syncWizardToCardDescription();
}

function renderWizardStep() {
  const total = state.effectConfig.totalEffects || 2;
  const curIdx = state.currentWizardIndex || 0;
  const orderSymbols = ['①', '②', '③', '④'];
  const sym = orderSymbols[curIdx] || `(${curIdx + 1})`;

  // 1. 顶部 Badge 与标题
  const badge = document.getElementById('wizardOrdinalBadge');
  if (badge) badge.textContent = `效果 ${sym}`;
  const title = document.getElementById('wizardStepTitle');
  if (title) title.textContent = `当前设计：效果 ${sym} (第 ${curIdx + 1} / ${total} 个)`;

  // 2. 进度 Chips
  const navChips = document.getElementById('wizardNavChips');
  if (navChips) {
    let chipsHtml = '';
    for (let i = 0; i < total; i++) {
      const s = orderSymbols[i] || `(${i + 1})`;
      const isActive = i === curIdx;
      const isDone = i < curIdx;
      chipsHtml += `
        <button type="button" class="wizard-chip ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}" onclick="goToWizardEffect(${i})">
          ${isDone ? '✓ ' : ''}效果 ${s}
        </button>
      `;
    }
    navChips.innerHTML = chipsHtml;
  }

  // 3. 回显表单字段
  const eff = state.wizardEffects[curIdx] || {
    timing: 'ignition_omit',
    timingMode: 'if',
    summonTypeParam: 'fusion',
    materialName: '',
    oppoMonsterCount: 2,
    cost: 'none',
    costLp: 1000,
    target: 'none',
    action: 'search_deck',
    followup: 'none'
  };

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('wizardTiming', eff.timing || 'ignition_omit');
  setVal('wizardTimingMode', eff.timingMode || 'if');
  setVal('wizardSummonType', eff.summonTypeParam || 'fusion');
  setVal('wizardMaterialName', eff.materialName || '');
  setVal('wizardOppoMonsterCount', eff.oppoMonsterCount || 2);
  setVal('wizardCost', eff.cost || 'none');
  setVal('wizardCostLpVal', eff.costLp || 1000);
  setVal('wizardCostCount', eff.costCount || 1);
  setVal('wizardCostFilterArchetype', eff.costFilterArchetype || '');
  setVal('wizardCostFilterType', eff.costFilterType || '');
  setVal('wizardTarget', eff.target || 'none');
  setVal('wizardAction', eff.action || 'search_deck');
  setVal('wizardFollowup', eff.followup || 'none');
  setVal('wizardFilterArchetype', eff.filterArchetype || '');
  setVal('wizardFilterType', eff.filterType || '');
  setVal('wizardBurnValue', eff.burnValue || 1000);
  setVal('wizardBurnTarget', eff.burnTargetPlayer || 'opponent');
  setVal('wizardPunishCount', eff.punishDiscardCount || 2);
  setVal('wizardPunishTarget', eff.punishTarget || 'opponent');

  updateWizardTimingVisibility(eff.timing || 'ignition_omit');
  updateWizardCostParamsVisibility(eff.cost || 'none');
  updateWizardActionParamsVisibility(eff.action || 'search_deck');
  renderChoiceBranchEditors(eff);

  const lpWrap = document.getElementById('wizardLpCostWrap');
  if (lpWrap) {
    lpWrap.style.display = (eff.cost === 'pay_lp' || eff.cost === 'pay_1000') ? 'block' : 'none';
  }

  // 4. 生成单效果实时卡文预览 (中文向导显示，日文模式同时展示卡面对应日文副标题)
  if (state.assembler) {
    const isJa = state.cardData.language === 'ja';
    const singleTextZh = state.assembler.generateEffectText(curIdx, eff, false, false);
    const prevEl = document.getElementById('wizardEffectTextPreview');
    if (prevEl) prevEl.textContent = singleTextZh;

    const jaWrap = document.getElementById('wizardJaEffectTextPreviewWrap');
    const jaTextEl = document.getElementById('wizardJaEffectTextPreview');
    if (jaWrap && jaTextEl) {
      if (isJa) {
        jaWrap.style.display = 'block';
        let singleTextJa = state.assembler.generateEffectText(curIdx, eff, false, true);
        if (state.cardData.effectRuby) singleTextJa = applyEffectRuby(singleTextJa);
        jaTextEl.textContent = singleTextJa;
      } else {
        jaWrap.style.display = 'none';
      }
    }
    // 同步效果文注音开关按钮状态
    const rubyBtn = document.getElementById('btnEffectRuby');
    if (rubyBtn) {
      rubyBtn.textContent = state.cardData.effectRuby ? '⚡ 效果文注音：已开启' : '⚡ 效果文注音';
      rubyBtn.style.color = state.cardData.effectRuby ? '#34d399' : '#38bdf8';
    }
  }

  // 5. 下一步 / 确认按钮文案
  const btnPrev = document.getElementById('btnWizardPrev');
  if (btnPrev) btnPrev.style.display = curIdx > 0 ? 'inline-flex' : 'none';

  const btnNext = document.getElementById('btnWizardNext');
  if (btnNext) {
    if (curIdx < total - 1) {
      const nextSym = orderSymbols[curIdx + 1] || `(${curIdx + 2})`;
      btnNext.innerHTML = `<span>✅ 确定效果 ${sym}，进入效果 ${nextSym} 设计 →</span>`;
      btnNext.className = 'btn btn-gold';
    } else {
      btnNext.innerHTML = `<span>🎉 确认并完成全部效果设计，下一步上传卡图 →</span>`;
      btnNext.className = 'btn btn-emerald';
    }
  }
}

function updateWizardTimingVisibility(timingVal) {
  const wrapContextual = document.getElementById('timingContextualParamsWrap');
  const wrapSummonType = document.getElementById('wrapSummonType');
  const wrapMaterialName = document.getElementById('wrapMaterialName');
  const wrapOppoMonsterCount = document.getElementById('wrapOppoMonsterCount');
  const wrapTimingMode = document.getElementById('wrapTimingMode');

  const needSummonType = ['summon_with_mat', 'to_grave_from_field_summoned', 'continuous_summoned_faceup'].includes(timingVal);
  const needMaterialName = timingVal === 'summon_with_mat';
  const needOppoMonsterCount = timingVal === 'ignition_oppo_monsters_count';

  if (wrapSummonType) wrapSummonType.style.display = needSummonType ? 'block' : 'none';
  if (wrapMaterialName) wrapMaterialName.style.display = needMaterialName ? 'block' : 'none';
  if (wrapOppoMonsterCount) wrapOppoMonsterCount.style.display = needOppoMonsterCount ? 'block' : 'none';

  if (wrapContextual) {
    wrapContextual.style.display = (needSummonType || needMaterialName || needOppoMonsterCount) ? 'grid' : 'none';
  }

  const isTriggerLike = timingVal.startsWith('summon_') || timingVal.startsWith('to_grave_') || 
                        timingVal.startsWith('destroyed_') || timingVal.startsWith('banished_') || 
                        timingVal.startsWith('field_card_') || timingVal === 'battle_destroy_oppo' ||
                        timingVal === 'quick_chain';
  if (wrapTimingMode) {
    wrapTimingMode.style.display = isTriggerLike ? 'block' : 'none';
  }
}

function onWizardTimingChanged(val) {
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) {
    state.wizardEffects[curIdx] = {};
  }
  const eff = state.wizardEffects[curIdx];
  eff.timing = val;

  // 自动推断并配置底层属性
  if (val.startsWith('continuous_')) {
    eff.effectType = 'continuous';
  } else if (val.startsWith('quick_')) {
    eff.effectType = 'quick';
    eff.quickTiming = val;
  } else if (val.startsWith('summon_') || val.startsWith('to_grave_') || val.startsWith('destroyed_') || val.startsWith('banished_') || val.startsWith('field_card_') || val === 'battle_destroy_oppo') {
    eff.effectType = 'trigger';
    eff.event = val;
  } else {
    eff.effectType = 'ignition';
  }

  updateWizardTimingVisibility(val);
  onWizardFieldChanged('timing', val);
}

// 依所选「发动代价(Cost)」动态显示数量 / 字段 / 卡类控件
function updateWizardCostParamsVisibility(costVal) {
  const setDisp = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? 'block' : 'none'; };
  const needLp = costVal === 'pay_lp' || costVal === 'pay_1000';
  const needCount = ['discard_n', 'banish_gy_n', 'banish_hand_n', 'release_monster_n', 'send_to_grave_n', 'mill_deck_n', 'detach_xyz'].includes(costVal);
  const needFilter = ['discard_n', 'banish_gy_n', 'banish_hand_n', 'release_monster_n', 'send_to_grave_n', 'mill_deck_n'].includes(costVal);

  setDisp('wizardLpCostWrap', needLp);
  setDisp('wizardCostCountWrap', needCount);
  setDisp('wizardCostFilterArchetypeWrap', needFilter);
  setDisp('wizardCostFilterTypeWrap', needFilter);
}

// 代价涉及的字段输入：匹配字段库并保存 setcode
function onWizardCostFilterArchetypeInput(val) {
  const clean = (val || '').trim();
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) state.wizardEffects[curIdx] = {};
  const eff = state.wizardEffects[curIdx];
  eff.costFilterArchetype = clean;
  const hint = document.getElementById('wizardCostFilterArchetypeHint');
  const match = typeof findArchetypeMatch === 'function' ? findArchetypeMatch(clean) : null;
  if (match) {
    eff.costFilterSetcode = match.hex;
    eff.costFilterArchetype = match.nameZh;
    if (hint) hint.innerHTML = `<span style="color:#38bdf8;">✓ 已匹配字段 <b>${escapeHtml(match.nameZh)}</b> [${match.hex}]</span>`;
  } else {
    eff.costFilterSetcode = '';
    if (hint) hint.innerHTML = clean ? '<span style="color:#f59e0b;">未匹配到字段库</span>' : '仅用于限定代价涉及的卡（如「把「青眼」怪兽送去墓地」）';
  }
  onWizardFieldChanged('costFilterArchetype', eff.costFilterArchetype);
}

// 代价一键套用当前卡字段
function useCurrentCardArchetypeForCostFilter() {
  const hex = state.cardData.setcode || (document.getElementById('cardSetcode') || {}).value || '';
  const name = state.cardData.archetype || (document.getElementById('cardArchetype') || {}).value || '';
  if (!hex) { showNotification('当前卡片尚未设置字段 / Setcode', 'error'); return; }
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) state.wizardEffects[curIdx] = {};
  const eff = state.wizardEffects[curIdx];
  eff.costFilterSetcode = hex;
  eff.costFilterArchetype = name;
  const input = document.getElementById('wizardCostFilterArchetype');
  if (input) input.value = name;
  const hint = document.getElementById('wizardCostFilterArchetypeHint');
  if (hint) hint.innerHTML = `<span style="color:#34d399;">✓ 已套用当前卡字段 <b>${escapeHtml(name || '自定义')}</b> [${hex}]</span>`;
  onWizardFieldChanged('costFilterArchetype', name);
}

// 依所选「效果本体(Action)」动态显示筛选与参数控件
function updateWizardActionParamsVisibility(actionVal) {
  const wrap = document.getElementById('wizardActionParamsWrap');
  const choiceWrap = document.getElementById('wizardChoiceFreeWrap');
  if (!wrap) return;

  const filterActions = ['search_deck', 'dump_deck', 'special_summon_deck', 'special_summon_hand', 'salvage_extra', 'revive_grave', 'destroy_target', 'banish_target', 'to_hand_target'];
  const needFilter = filterActions.includes(actionVal);
  const needBurn = actionVal === 'burn_damage';
  const needPunish = actionVal === 'negate_punish';
  const needChoice = actionVal === 'choice_free';

  const setDisp = (id, show) => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  };
  setDisp('wrapFilterArchetype', needFilter);
  setDisp('wrapFilterType', needFilter);
  setDisp('wrapBurnValue', needBurn);
  setDisp('wrapBurnTarget', needBurn);
  setDisp('wrapPunishCount', needPunish);
  setDisp('wrapPunishTarget', needPunish);

  wrap.style.display = (needFilter || needBurn || needPunish) ? 'grid' : 'none';
  if (choiceWrap) {
    choiceWrap.style.display = needChoice ? 'block' : 'none';
    if (needChoice) ensureChoiceBranchDefaults();
  }
}

// 二选一分支可选动作（供两个分支下拉共用）
const CHOICE_BRANCH_ACTIONS = [
  { value: 'search_deck', label: '检索：从卡组把卡加入手牌' },
  { value: 'dump_deck', label: '堆墓：从卡组把卡送去墓地' },
  { value: 'special_summon_deck', label: '特召：从卡组把怪兽特殊召唤' },
  { value: 'special_summon_hand', label: '特召：从手卡把怪兽特殊召唤' },
  { value: 'revive_grave', label: '苏生：从自己墓地特殊召唤' },
  { value: 'destroy_target', label: '破坏：对方场上的卡破坏' },
  { value: 'banish_target', label: '除外：对方场上的卡除外' },
  { value: 'to_hand_target', label: '弹手：对方场上的卡回到手牌' },
  { value: 'draw_cards', label: '抽卡：从卡组抽卡（数量可调）' },
  { value: 'burn_damage', label: '伤害：造成伤害（数值可调）' },
  { value: 'gain_lp', label: '回复：自己回复基本分（数值可调）' },
  { value: 'destroy_self_all', label: '自爆：自己场上的卡全部破坏' },
  { value: 'wipe_oppo_monsters', label: '全灭：对方场上的怪兽全部破坏' },
  { value: 'wipe_oppo_all', label: '全场灭：对方场上的卡全部破坏' }
];

// 分支动作是否需要「数量/数值」输入框
function choiceBranchNeedsCount(action) {
  return ['draw_cards', 'burn_damage', 'gain_lp'].includes(action);
}
// 分支动作是否需要「字段/卡类」筛选
function choiceBranchNeedsFilter(action) {
  return ['search_deck', 'dump_deck', 'special_summon_deck', 'special_summon_hand', 'revive_grave', 'destroy_target', 'banish_target', 'to_hand_target'].includes(action);
}

function ensureChoiceBranchDefaults() {
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) state.wizardEffects[curIdx] = {};
  const eff = state.wizardEffects[curIdx];
  if (!eff.choiceA) eff.choiceA = { action: 'search_deck' };
  if (!eff.choiceB) eff.choiceB = { action: 'dump_deck' };
}

// 初始化二选一分支的下拉与回显
function renderChoiceBranchEditors(eff) {
  ensureChoiceBranchDefaults();
  const fillOptions = (selectId) => {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = CHOICE_BRANCH_ACTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  };
  fillOptions('wizardChoiceAAction');
  fillOptions('wizardChoiceBAction');

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setVal('wizardChoiceAAction', eff.choiceA.action || 'search_deck');
  setVal('wizardChoiceBAction', eff.choiceB.action || 'dump_deck');
  setVal('wizardChoiceAFilterArchetype', eff.choiceA.filterArchetype || '');
  setVal('wizardChoiceBFilterArchetype', eff.choiceB.filterArchetype || '');
  setVal('wizardChoiceAFilterType', eff.choiceA.filterType || '');
  setVal('wizardChoiceBFilterType', eff.choiceB.filterType || '');
  setVal('wizardChoiceACount', eff.choiceA.count || eff.choiceA.value || 1);
  setVal('wizardChoiceBCount', eff.choiceB.count || eff.choiceB.value || 1);

  const setDisp = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? 'block' : 'none'; };
  setDisp('wizardChoiceACountWrap', choiceBranchNeedsCount(eff.choiceA.action));
  setDisp('wizardChoiceBCountWrap', choiceBranchNeedsCount(eff.choiceB.action));
  setDisp('wizardChoiceAFilterArchetypeWrap', choiceBranchNeedsFilter(eff.choiceA.action));
  setDisp('wizardChoiceBFilterArchetypeWrap', choiceBranchNeedsFilter(eff.choiceB.action));
  setDisp('wizardChoiceAFilterTypeWrap', choiceBranchNeedsFilter(eff.choiceA.action));
  setDisp('wizardChoiceBFilterTypeWrap', choiceBranchNeedsFilter(eff.choiceB.action));
}

// 分支字段变更
function onChoiceBranchChanged(branch, field, value) {
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) state.wizardEffects[curIdx] = {};
  const eff = state.wizardEffects[curIdx];
  const key = branch === 'A' ? 'choiceA' : 'choiceB';
  if (!eff[key]) eff[key] = {};
  const sub = eff[key];

  if (field === 'count') {
    const n = parseInt(value) || 1;
    // 伤害 / 回复用 value，抽卡用 count
    if (sub.action === 'burn_damage' || sub.action === 'gain_lp') sub.value = n;
    else sub.count = n;
  } else {
    sub[field] = value;
    // 切换动作时按需重置字段
    if (field === 'action') {
      if (!choiceBranchNeedsFilter(value)) { sub.filterArchetype = ''; sub.filterSetcode = ''; sub.filterType = ''; }
      const setDisp = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? 'block' : 'none'; };
      setDisp(`wizardChoice${branch}CountWrap`, choiceBranchNeedsCount(value));
    }
  }

  if (field === 'action') {
    renderChoiceBranchEditors(eff);
  }
  onWizardFieldChanged(key, sub);
}

// 分支字段弹窗匹配
function onChoiceFilterArchetypeInput(branch, val) {
  const clean = (val || '').trim();
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) state.wizardEffects[curIdx] = {};
  const eff = state.wizardEffects[curIdx];
  const key = branch === 'A' ? 'choiceA' : 'choiceB';
  if (!eff[key]) eff[key] = {};
  const sub = eff[key];
  sub.filterArchetype = clean;

  const hint = document.getElementById(`wizardChoice${branch}FilterHint`);
  const match = typeof findArchetypeMatch === 'function' ? findArchetypeMatch(clean) : null;
  if (match) {
    sub.filterSetcode = match.hex;
    sub.filterArchetype = match.nameZh;
    if (hint) hint.innerHTML = `<span style="color:#38bdf8;">✓ ${escapeHtml(match.nameZh)} [${match.hex}]</span>`;
  } else {
    sub.filterSetcode = '';
    if (hint) hint.innerHTML = clean ? '<span style="color:#f59e0b;">未匹配到字段库</span>' : '';
  }
  onWizardFieldChanged(key, sub);
}

// 分支套用当前卡字段
function useCurrentCardArchetypeForChoiceFilter(branch) {
  const hex = state.cardData.setcode || (document.getElementById('cardSetcode') || {}).value || '';
  const name = state.cardData.archetype || (document.getElementById('cardArchetype') || {}).value || '';
  if (!hex) { showNotification('当前卡片尚未设置字段 / Setcode', 'error'); return; }
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) state.wizardEffects[curIdx] = {};
  const eff = state.wizardEffects[curIdx];
  const key = branch === 'A' ? 'choiceA' : 'choiceB';
  if (!eff[key]) eff[key] = {};
  eff[key].filterSetcode = hex;
  eff[key].filterArchetype = name;
  const input = document.getElementById(`wizardChoice${branch}FilterArchetype`);
  if (input) input.value = name;
  const hint = document.getElementById(`wizardChoice${branch}FilterHint`);
  if (hint) hint.innerHTML = `<span style="color:#34d399;">✓ ${escapeHtml(name || '自定义')} [${hex}]</span>`;
  onWizardFieldChanged(key, eff[key]);
}

function onWizardActionChanged(val) {
  updateWizardActionParamsVisibility(val);
  onWizardFieldChanged('action', val);
}

// 检索/特召的字段输入：匹配官方或自定义字段库，取回 Setcode 并保存
function onWizardFilterArchetypeInput(val) {
  const clean = (val || '').trim();
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) state.wizardEffects[curIdx] = {};
  const eff = state.wizardEffects[curIdx];
  eff.filterArchetype = clean;

  const hint = document.getElementById('wizardFilterArchetypeHint');
  const match = typeof findArchetypeMatch === 'function' ? findArchetypeMatch(clean) : null;
  if (match) {
    eff.filterSetcode = match.hex;
    eff.filterArchetype = match.nameZh;
    if (hint) hint.innerHTML = `<span style="color:#38bdf8;">✓ 已匹配字段 <b>${escapeHtml(match.nameZh)}</b> [${match.hex}]</span>`;
  } else {
    eff.filterSetcode = '';
    if (hint) {
      hint.innerHTML = clean
        ? `<span style="color:#f59e0b;">未匹配到字段库，可改用下方「当前卡字段」按钮或留空</span>`
        : '留空则不限字段';
    }
  }

  onWizardFieldChanged('filterArchetype', eff.filterArchetype);
}

// 一键套用当前卡片自身的字段（Setcode）
function useCurrentCardArchetypeForFilter() {
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) state.wizardEffects[curIdx] = {};
  const eff = state.wizardEffects[curIdx];
  const hex = state.cardData.setcode || (document.getElementById('cardSetcode') || {}).value || '';
  const name = state.cardData.archetype || (document.getElementById('cardArchetype') || {}).value || '';
  if (!hex) {
    showNotification('当前卡片尚未设置字段 / Setcode', 'error');
    return;
  }
  eff.filterSetcode = hex;
  eff.filterArchetype = name;
  const input = document.getElementById('wizardFilterArchetype');
  if (input) input.value = name;
  const hint = document.getElementById('wizardFilterArchetypeHint');
  if (hint) hint.innerHTML = `<span style="color:#34d399;">✓ 已套用当前卡字段 <b>${escapeHtml(name || '自定义')}</b> [${hex}]</span>`;
  onWizardFieldChanged('filterArchetype', name);
}

function onWizardFieldChanged(field, value) {
  const curIdx = state.currentWizardIndex || 0;
  if (!state.wizardEffects[curIdx]) state.wizardEffects[curIdx] = {};
  state.wizardEffects[curIdx][field] = value;
  
  if (state.assembler) {
    const isJa = state.cardData.language === 'ja';
    const singleText = state.assembler.generateEffectText(curIdx, state.wizardEffects[curIdx], false, isJa);
    const prevEl = document.getElementById('wizardEffectTextPreview');
    if (prevEl) prevEl.textContent = singleText;
  }

  syncWizardToCardDescription();
}

function onWizardCostChanged(costType) {
  updateWizardCostParamsVisibility(costType);
  onWizardFieldChanged('cost', costType);
}

function confirmCurrentWizardEffect() {
  const total = state.effectConfig.totalEffects || 2;
  const curIdx = state.currentWizardIndex || 0;
  const orderSymbols = ['①', '②', '③', '④'];

  syncWizardToCardDescription();

  // 若处于移动端多页面流转模式，直接委托给移动端流调度器
  if (window.mobileUIManager && window.mobileUIManager.isMobile && window.mobileUIManager.flowManager) {
    window.mobileUIManager.flowManager.goNext();
    return;
  }

  if (curIdx < total - 1) {
    state.currentWizardIndex++;
    renderWizardStep();
    showNotification(`已确定效果 ${orderSymbols[curIdx]}，进入效果 ${orderSymbols[curIdx + 1]} 设计`);
  } else {
    // 全部效果完成！进入步骤 3 卡图上传
    jumpToStep(3);
    showNotification(`🎉 恭喜！全部 ${total} 个卡片效果已设计完成！已进入卡面配图`);
  }
}

function prevWizardEffect() {
  if (state.currentWizardIndex > 0) {
    state.currentWizardIndex--;
    renderWizardStep();
  }
}

function goToWizardEffect(idx) {
  const total = state.effectConfig.totalEffects || 2;
  if (idx >= 0 && idx < total) {
    state.currentWizardIndex = idx;
    renderWizardStep();
  }
}

function onRuleTextsChanged() {
  const setDisp = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? 'block' : 'none'; };

  const aliasChk = document.getElementById('ruleAliasEnabled');
  setDisp('wrapRuleAliasInput', !!(aliasChk && aliasChk.checked));

  const nomiChk = document.getElementById('ruleNomiEnabled');
  setDisp('wrapRuleNomiSelect', !!(nomiChk && nomiChk.checked));

  const matChk = document.getElementById('ruleMaterialLimitEnabled');
  setDisp('wrapRuleMaterialSelect', !!(matChk && matChk.checked));

  const procChk = document.getElementById('ruleSummonProcEnabled');
  setDisp('wrapRuleSummonProc', !!(procChk && procChk.checked));

  const customChk = document.getElementById('ruleCustomEnabled');
  setDisp('wrapRuleCustomInput', !!(customChk && customChk.checked));

  applyRuleTextAdaptation();
  readFormToState();
  syncWizardToCardDescription();
  compileLuaPreview();
}

/**
 * 依当前卡片的「召唤方式 / 怪兽种类」自动适配效果外文本条款：
 * - 非怪兽卡：隐藏仅怪兽适用的条款（不能特召/不能解放/表示形式/攻击相关/召唤手续/规则变更）
 * - 融合·同调·超量·连接·仪式怪兽：自动预选对应召唤方式手续并显示
 */
function applyRuleTextAdaptation() {
  const type = state.cardData.type || 0;
  const isMonster = (type & 1) || state.cardData.mainType === 'monster' || !(type & (2 | 4));

  document.querySelectorAll('[data-rule-scope="monster"]').forEach(el => {
    el.style.display = isMonster ? 'block' : 'none';
  });

  const hint = document.getElementById('ruleTextsAdaptHint');
  if (hint) {
    hint.textContent = isMonster
      ? '已依召唤方式与怪兽种类自动适配'
      : '魔陷卡不适用怪兽专属条款，相关项已隐藏';
  }

  // 依怪兽种类推断召唤方式，自动预选（不勾选启用开关，避免替用户做决定）
  const procSel = document.getElementById('ruleProcSummonType');
  if (procSel) {
    let inferred = '';
    if (type & 64) inferred = 'fusion';
    else if (type & 8192) inferred = 'synchro';
    else if (type & 8388608) inferred = 'xyz';
    else if (type & 67108864) inferred = 'link';
    else if (type & 128) inferred = 'ritual';
    if (inferred) procSel.value = inferred;
  }
  const procWrap = document.getElementById('wrapRuleSummonProc');
  const procChk = document.getElementById('ruleSummonProcEnabled');
  if (procWrap && procChk) procWrap.style.display = procChk.checked ? 'block' : 'none';
}

function syncWizardToCardDescription() {
  const cfg = state.effectConfig;
  const r = state.cardData.ruleTexts || {};
  const total = cfg.totalEffects || 2;
  const activeSlots = [];
  for (let i = 0; i < total; i++) {
    if (state.wizardEffects[i]) activeSlots.push(state.wizardEffects[i]);
  }

  // --- 1. 中文效果文本 (用于向导界面、表单卡文与中文卡面渲染) ---
  const linesZh = [];
  const isMonsterZh = state.cardData.mainType === 'monster' || !!((state.cardData.type || 0) & 1);
  if (r.ruleAlias && r.ruleAliasName) {
    linesZh.push(`这张卡的卡名在规则上也当作「${r.ruleAliasName}」使用。`);
  } else if (cfg.aliasEnabled && cfg.aliasName) {
    linesZh.push(`规则上，这张卡的卡名也当作「${cfg.aliasName}」使用。`);
  }

  if (isMonsterZh && r.ssOncePerTurn) {
    const cardName = state.cardData.name || '此卡名';
    linesZh.push(`自己对「${cardName}」1回合只能特殊召唤1次。`);
  }

  if (isMonsterZh && r.cannotNormalSummon) {
    if (r.nomiType === 'extra_only') {
      linesZh.push(`这张卡不能通常召唤。只能以原本的召唤方式特殊召唤。`);
    } else if (r.nomiType === 'cannot_ns_any') {
      linesZh.push(`这张卡不能通常召唤。`);
    } else {
      linesZh.push(`这张卡不能通常召唤。只有用自身的效果才能特殊召唤。`);
    }
  } else if (state.cardData.mainType === 'monster' && cfg.summonRestriction && cfg.summonRestriction !== 'none') {
    if (cfg.summonRestriction === 'semi_nomi') {
      linesZh.push(`这张卡不能通常召唤。只有特殊召唤才能特殊召唤。`);
    } else if (cfg.summonRestriction === 'extra_only') {
      linesZh.push(`这张卡只能以自身召唤方式特殊召唤。`);
    } else if (cfg.summonRestriction === 'once_per_turn_ss') {
      const cardName = state.cardData.name || '此卡名';
      linesZh.push(`自己对「${cardName}」1回合只能有1次特殊召唤。`);
    }
  }

  if (r.materialRestriction) {
    if (r.materialType === 'synchro_only') {
      linesZh.push(`这张卡不能作为同调召唤的素材。`);
    } else if (r.materialType === 'xyz_only') {
      linesZh.push(`这张卡不能作为超量召唤的素材。`);
    } else if (r.materialType === 'link_only') {
      linesZh.push(`这张卡不能作为连接召唤的素材。`);
    } else {
      linesZh.push(`这张卡不能作为融合·同调·超量·连接召唤的素材。`);
    }
  }

  if (r.deckLimitOne) {
    linesZh.push(`同名卡在卡组中最多只能投入1张。`);
  }

  // --- 新增规则条款卡文 (仅怪兽适用) ---
  if (isMonsterZh) {
    if (r.cannotSpecialSummon && !r.cannotNormalSummon) {
      linesZh.push(`这张卡不能特殊召唤。`);
    }
    if (r.cannotBeReleased) {
      linesZh.push(`这张卡不能解放。`);
    }
    if (r.cannotMSet) {
      linesZh.push(`这张卡不能里侧表示盖放。`);
    }
    if (r.cannotTrigger) {
      linesZh.push(`这张卡的效果不能发动。`);
    }
    if (r.cannotChangePosition) {
      linesZh.push(`这张卡不能变更表示形式。`);
    }
    if (r.cannotAttack) {
      linesZh.push(`这张卡不能攻击。`);
    }
    if (r.cannotBeAttacked) {
      linesZh.push(`这张卡不能成为攻击对象。`);
    }
    if (r.canDirectAttack) {
      linesZh.push(`这张卡可以直接攻击。`);
    }
    const typeNameZh = { effect: '效果', fusion: '融合', synchro: '同调', xyz: '超量', link: '连接', ritual: '仪式', pendulum: '灵摆' }[r.addMonsterType];
    if (typeNameZh) {
      linesZh.push(`这张卡在规则上也当作「${typeNameZh}怪兽」使用。`);
    }
    const attrZh = { dark: '暗', light: '光', earth: '地', water: '水', fire: '炎', wind: '风', divine: '神' }[r.ruleAttribute];
    if (attrZh) {
      linesZh.push(`这张卡在规则上也当作「${attrZh}属性」使用。`);
    }
    const raceZh = {
      warrior: '战士族', spellcaster: '魔法师族', fairy: '天使族', fiend: '恶魔族', zombie: '不死族',
      machine: '机械族', dragon: '龙族', cyberse: '电子界族', illusion: '幻想魔族'
    }[r.ruleRace];
    if (raceZh) {
      linesZh.push(`这张卡在规则上也当作「${raceZh}」使用。`);
    }
    const rl = parseInt(r.ruleLevel) || 0;
    if (rl > 0) {
      linesZh.push(`这张卡在规则上的等级变成${rl}。`);
    }
  }

  if (r.customRule && r.customRuleText) {
    linesZh.push(r.customRuleText);
  }

  let hasAggregatedZh = false;
  if (state.assembler) {
    const limitSummaryZh = state.assembler.generateAggregatedLimitLine(activeSlots, false);
    if (limitSummaryZh) {
      linesZh.push(limitSummaryZh);
      hasAggregatedZh = true;
    }
  }

  const selectedSlots = [];
  for (let i = 0; i < total; i++) {
    const eff = state.wizardEffects[i];
    if (eff && state.assembler) {
      const omitHopt = hasAggregatedZh && (eff.countLimit === 'hopt' || eff.countLimit === 'duel');
      linesZh.push(state.assembler.generateEffectText(i, eff, omitHopt, false));
      selectedSlots.push(eff);
    }
  }

  state.selectedEffects = selectedSlots;
  const fullDescZh = linesZh.join('\n');

  // --- 2. 对应日文 OCG 效果文本 (直接渲染至日文卡面，实现向导中文选择/卡面日文呈现) ---
  const linesJa = [];
  const isMonsterJa = state.cardData.mainType === 'monster' || !!((state.cardData.type || 0) & 1);
  if (r.ruleAlias && r.ruleAliasName) {
    linesJa.push(`ルール上、このカードのカード名は「${r.ruleAliasName}」としても扱う。`);
  } else if (cfg.aliasEnabled && cfg.aliasName) {
    linesJa.push(`ルール上、このカードのカード名は「${cfg.aliasName}」としても扱う。`);
  }

  if (isMonsterJa && r.ssOncePerTurn) {
    const cardName = state.cardData.name || 'このカード名';
    linesJa.push(`自分は「${cardName}」を１ターンに１度しか特殊召喚できない。`);
  }

  if (isMonsterJa && r.cannotNormalSummon) {
    if (r.nomiType === 'extra_only') {
      linesJa.push(`このカードは通常召喚できない。本来の召喚方法でのみ特殊召喚できる。`);
    } else if (r.nomiType === 'cannot_ns_any') {
      linesJa.push(`このカードは通常召喚できない。`);
    } else {
      linesJa.push(`このカードは通常召喚できない。自身の効果でのみ特殊召喚できる。`);
    }
  } else if (state.cardData.mainType === 'monster' && cfg.summonRestriction && cfg.summonRestriction !== 'none') {
    if (cfg.summonRestriction === 'semi_nomi') {
      linesJa.push(`このカードは通常召喚できない。自身の召喚条件でのみ特殊召喚できる。`);
    } else if (cfg.summonRestriction === 'extra_only') {
      linesJa.push(`このカードは自身の召喚方法でのみ特殊召喚できる。`);
    } else if (cfg.summonRestriction === 'once_per_turn_ss') {
      const cardName = state.cardData.name || 'このカード名';
      linesJa.push(`自分は「${cardName}」を１ターンに１度しか特殊召喚できない。`);
    }
  }

  if (r.materialRestriction) {
    if (r.materialType === 'synchro_only') {
      linesJa.push(`このカードはＳ召喚の素材にできない。`);
    } else if (r.materialType === 'xyz_only') {
      linesJa.push(`このカードはＸ召喚の素材にできない。`);
    } else if (r.materialType === 'link_only') {
      linesJa.push(`このカードはＬ召喚の素材にできない。`);
    } else {
      linesJa.push(`このカードは融合・Ｓ・Ｘ・Ｌ召喚の素材にできない。`);
    }
  }

  if (r.deckLimitOne) {
    linesJa.push(`同名カードはデッキに１枚しか投入できない。`);
  }

  // --- 新增规则条款卡文 (仅怪兽适用) ---
  if (isMonsterJa) {
    if (r.cannotSpecialSummon && !r.cannotNormalSummon) {
      linesJa.push(`このカードは特殊召喚できない。`);
    }
    if (r.cannotBeReleased) {
      linesJa.push(`このカードはリリースできない。`);
    }
    if (r.cannotMSet) {
      linesJa.push(`このカードは裏側表示でセットできない。`);
    }
    if (r.cannotTrigger) {
      linesJa.push(`このカードの効果は発動できない。`);
    }
    if (r.cannotChangePosition) {
      linesJa.push(`このカードは表示形式を変更できない。`);
    }
    if (r.cannotAttack) {
      linesJa.push(`このカードは攻撃できない。`);
    }
    if (r.cannotBeAttacked) {
      linesJa.push(`このカードは攻撃対象にできない。`);
    }
    if (r.canDirectAttack) {
      linesJa.push(`このカードは直接攻撃できる。`);
    }
    const typeNameJa = { effect: '効果', fusion: '融合', synchro: 'Ｓ', xyz: 'Ｘ', link: 'Ｌ', ritual: '儀式', pendulum: 'Ｐ' }[r.addMonsterType];
    if (typeNameJa) {
      linesJa.push(`このカードはルール上「${typeNameJa}モンスター」としても扱う。`);
    }
    const attrJa = { dark: '闇', light: '光', earth: '地', water: '水', fire: '炎', wind: '風', divine: '神' }[r.ruleAttribute];
    if (attrJa) {
      linesJa.push(`このカードはルール上「${attrJa}属性」としても扱う。`);
    }
    const raceJa = {
      warrior: '戦士族', spellcaster: '魔法使い族', fairy: '天使族', fiend: '悪魔族', zombie: 'アンデット族',
      machine: '機械族', dragon: 'ドラゴン族', cyberse: 'サイバース族', illusion: '幻想魔族'
    }[r.ruleRace];
    if (raceJa) {
      linesJa.push(`このカードはルール上「${raceJa}」としても扱う。`);
    }
    const rlJa = parseInt(r.ruleLevel) || 0;
    if (rlJa > 0) {
      linesJa.push(`このカードのルール上のレベルは${rlJa}になる。`);
    }
  }

  if (r.customRule && r.customRuleText) {
    linesJa.push(r.customRuleText);
  }

  let hasAggregatedJa = false;
  if (state.assembler) {
    const limitSummaryJa = state.assembler.generateAggregatedLimitLine(activeSlots, true);
    if (limitSummaryJa) {
      linesJa.push(limitSummaryJa);
      hasAggregatedJa = true;
    }
  }

  for (let i = 0; i < total; i++) {
    const eff = state.wizardEffects[i];
    if (eff && state.assembler) {
      const omitHopt = hasAggregatedJa && (eff.countLimit === 'hopt' || eff.countLimit === 'duel');
      linesJa.push(state.assembler.generateEffectText(i, eff, omitHopt, true));
    }
  }

  const fullDescJa = linesJa.join('\n');

  state.cardData.description = fullDescZh;
  state.cardData.jaDescription = state.cardData.effectRuby
    ? applyEffectRuby(fullDescJa)
    : fullDescJa;

  // 界面文本框显示中文（方便用户查看与修改）
  const descEl = document.getElementById('cardDesc');
  if (descEl) descEl.value = fullDescZh;

  refreshLiveCard();
  compileLuaPreview();
}

// 历史兼容与外部挂载
window.selectMainCardType = selectMainCardType;
window.onMonsterCategoryChanged = onMonsterCategoryChanged;
window.toggleLinkArrow = toggleLinkArrow;
window.selectSpellSubtype = selectSpellSubtype;
window.selectTrapSubtype = selectTrapSubtype;
window.togglePendulumMode = togglePendulumMode;
window.onScaleChanged = onScaleChanged;
window.onPendulumFieldChanged = onPendulumFieldChanged;
window.onPendulumCostChanged = onPendulumCostChanged;
window.setTotalEffectsCount = setTotalEffectsCount;
window.onPreRulesChanged = onPreRulesChanged;
window.onEffectLimitTypeChanged = onEffectLimitTypeChanged;
window.onEffectLimitNumberChanged = onEffectLimitNumberChanged;
window.onWizardFieldChanged = onWizardFieldChanged;
window.onWizardCostChanged = onWizardCostChanged;
window.onWizardTimingChanged = onWizardTimingChanged;
window.updateWizardTimingVisibility = updateWizardTimingVisibility;
window.confirmCurrentWizardEffect = confirmCurrentWizardEffect;
window.prevWizardEffect = prevWizardEffect;
window.goToWizardEffect = goToWizardEffect;
window.syncWizardToCardDescription = syncWizardToCardDescription;
window.onRuleTextsChanged = onRuleTextsChanged;
window.applyRuleTextAdaptation = applyRuleTextAdaptation;

function compileLuaPreview() {
  readFormToState();
  if (state.assembler && state.selectedEffects) {
    state.cardData.effectStrings = state.assembler.getEffectStrings(state.selectedEffects, state.cardData.language === 'ja');
  }
  let code = '';
  if (state.scriptMethod === 'visual') {
    code = state.assembler.generateScript(state.cardData, state.selectedEffects);
  } else if (state.scriptMethod === 'manual') {
    code = document.getElementById('manualScriptArea').value || state.assembler.generateScript(state.cardData, []);
  } else {
    code = state.manualScript || state.assembler.generateScript(state.cardData, state.selectedEffects);
  }

  state.generatedScript = code;
  const previewEl = document.getElementById('liveGeneratedLuaPreview');
  if (previewEl) previewEl.textContent = code;
}

// ========== 步骤3：卡面配图拖拽上传 ==========

function bindArtworkDropzone() {
  const dropArea = document.getElementById('artworkDropArea');
  const fileInput = document.getElementById('artworkFileInput');

  if (!dropArea || !fileInput) return;

  dropArea.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
  });

  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('drag-over');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('drag-over');
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });
}

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showNotification('请上传 PNG、JPG 或 WEBP 图片格式', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.uploadedImageElement = img;
      saveCurrentCardIntoSetSlot();
      refreshLiveCard();

      const metaWrap = document.getElementById('uploadedImagePreviewWrap');
      const metaText = document.getElementById('imageMetaText');
      if (metaWrap && metaText) {
        metaWrap.style.display = 'flex';
        metaText.textContent = `🖼️ 配图已载入 (${img.naturalWidth} × ${img.naturalHeight}px)`;
      }
      showNotification('✅ 高清卡图已载入并同步渲染！');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearUploadedImage() {
  state.uploadedImageElement = null;
  saveCurrentCardIntoSetSlot();
  const metaWrap = document.getElementById('uploadedImagePreviewWrap');
  if (metaWrap) metaWrap.style.display = 'none';
  const fileInput = document.getElementById('artworkFileInput');
  if (fileInput) fileInput.value = '';
  refreshLiveCard();
  showNotification('已重置为默认神圣符文卡图');
}

// ========== 步骤3: YGOLD 工艺与插图交互控制 ==========

function loadDemoArtwork() {
  const demoUrl = './assets/yugioh/image/demo_card.png';
  const img = new Image();
  img.onload = () => {
    state.uploadedImageElement = img;
    saveCurrentCardIntoSetSlot();
    refreshLiveCard();

    const metaWrap = document.getElementById('uploadedImagePreviewWrap');
    const metaText = document.getElementById('imageMetaText');
    if (metaWrap && metaText) {
      metaWrap.style.display = 'flex';
      metaText.textContent = `🖼️ YGOLD 官方示例原画已载入 (${img.naturalWidth} × ${img.naturalHeight}px)`;
    }
    showNotification('✅ 已成功载入 YGOLD 官方母版示例插图！');
  };
  img.onerror = () => {
    showNotification('未能读取预设卡图，请检查本地资源', 'error');
  };
  img.src = demoUrl;
}

function onArtTransformChanged() {
  const scaleEl = document.getElementById('artScaleInput');
  const offXEl = document.getElementById('artOffsetXInput');
  const offYEl = document.getElementById('artOffsetYInput');
  const fitEl = document.getElementById('artFitSelect');

  const scale = scaleEl ? parseInt(scaleEl.value) : 100;
  const offX = offXEl ? parseInt(offXEl.value) : 0;
  const offY = offYEl ? parseInt(offYEl.value) : 0;
  const fit = fitEl ? fitEl.value : 'cover';

  const scaleVal = document.getElementById('artScaleVal');
  if (scaleVal) scaleVal.textContent = `${scale}%`;
  const offXVal = document.getElementById('artOffsetXVal');
  if (offXVal) offXVal.textContent = `${offX > 0 ? '+' : ''}${offX}px`;
  const offYVal = document.getElementById('artOffsetYVal');
  if (offYVal) offYVal.textContent = `${offY > 0 ? '+' : ''}${offY}px`;

  state.cardData.artScale = scale;
  state.cardData.artOffsetX = offX;
  state.cardData.artOffsetY = offY;
  state.cardData.artFit = fit;

  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

function resetArtworkTransform() {
  const scaleEl = document.getElementById('artScaleInput');
  const offXEl = document.getElementById('artOffsetXInput');
  const offYEl = document.getElementById('artOffsetYInput');
  const fitEl = document.getElementById('artFitSelect');

  if (scaleEl) scaleEl.value = 100;
  if (offXEl) offXEl.value = 0;
  if (offYEl) offYEl.value = 0;
  if (fitEl) fitEl.value = 'cover';

  onArtTransformChanged();
  showNotification('已重置卡图缩放与偏移');
}

function onCardLanguageChanged(val) {
  state.cardData.language = val || 'zh';
  if (!state.cardData.hasManuallyEditedTypeHeader) {
    const newUpper = computeUpperText(state.cardData.language);
    state.cardData.typeHeader = newUpper;
    const headerEl = document.getElementById('cardTypeHeader');
    if (headerEl) headerEl.value = newUpper;
  }
  syncWizardToCardDescription();
  syncPendulumToCard();
  renderWizardStep();
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

function onCardRubyChanged(val) {
  state.cardData.ruby = (val || '').trim();
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

/**
 * 智能一键注音触发器 (对齐 LD 制卡器规范与官方 OCG 振假名)
 */
async function triggerAutoFurigana() {
  const nameEl = document.getElementById('cardName');
  const rubyEl = document.getElementById('cardRuby');
  const rawName = nameEl ? nameEl.value.trim() : (state.cardData.name || '');
  const rawRuby = rubyEl ? rubyEl.value.trim() : (state.cardData.ruby || '');

  if (!rawName) {
    showNotification('⚠️ 请先输入卡片名称');
    return;
  }

  const srv = window.furiganaService || (window.FuriganaService ? new window.FuriganaService() : null);
  if (!srv) {
    showNotification('⚠️ 注音引擎初始化中，请稍候');
    return;
  }

  await srv.loadDictionary();

  const formatted = srv.injectFurigana(rawName, rawRuby);
  if (nameEl) {
    nameEl.value = formatted;
  }
  state.cardData.name = formatted;

  if (rubyEl && rawRuby && formatted.includes('(')) {
    rubyEl.value = '';
    state.cardData.ruby = '';
  }

  const langEl = document.getElementById('cardLanguage');
  if (langEl && langEl.value !== 'ja') {
    langEl.value = 'ja';
    state.cardData.language = 'ja';
    if (!state.cardData.hasManuallyEditedTypeHeader) {
      const newUpper = computeUpperText('ja');
      state.cardData.typeHeader = newUpper;
      const headerEl = document.getElementById('cardTypeHeader');
      if (headerEl) headerEl.value = newUpper;
    }
  }

  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
  showNotification('⚡ 一键注音完成！已自动应用 LD 规范振假名排版');
}

function onPackCodeChanged(val) {
  state.cardData.packCode = (val || '').trim();
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

function onRareFoilChanged() {
  const rareEl = document.getElementById('cardRareSelect');
  state.cardData.rare = rareEl ? rareEl.value : 'none';
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

function onRareOpacityChanged() {
  const opEl = document.getElementById('cardRareOpacityInput');
  const val = opEl ? parseInt(opEl.value) : 65;
  const dispEl = document.getElementById('rareOpacityVal');
  if (dispEl) dispEl.textContent = `${val}%`;
  state.cardData.rareOpacity = val / 100;
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

function onWatermarkChanged() {
  const wmEl = document.getElementById('cardWatermarkSelect');
  state.cardData.watermark = wmEl ? wmEl.value : 'none';
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

function onWatermarkOpacityChanged() {
  const opEl = document.getElementById('cardWatermarkOpacityInput');
  const val = opEl ? parseInt(opEl.value) : 22;
  const dispEl = document.getElementById('watermarkOpacityVal');
  if (dispEl) dispEl.textContent = `${val}%`;
  state.cardData.watermarkOpacity = val / 100;
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

function onHoloChanged() {
  const holoEl = document.getElementById('cardHoloSelect');
  state.cardData.holoStyle = holoEl ? holoEl.value : 'laser1';
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

function onOverframeChanged() {
  const el = document.getElementById('cardOverframeSelect');
  state.cardData.isOverframe = el ? (el.value === 'overframe') : false;
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
  showNotification(state.cardData.isOverframe ? '📐 已切换至艺术出框全画模式 (Overframe)' : '📐 已切换至官方标准框模式');
}

function onFoilNameChanged() {
  const el = document.getElementById('cardFoilNameSelect');
  state.cardData.foilName = el ? el.value : 'auto';
  saveCurrentCardIntoSetSlot();
  refreshLiveCard();
}

/**
 * 图片清晰度变更事件处理
 */
function onImageQualityChanged() {
  const quality = document.getElementById('imageQualitySelect')?.value || 'high';
  if (window.cardRenderer && typeof window.cardRenderer.setImageQuality === 'function') {
    window.cardRenderer.setImageQuality(quality);
    console.log(`[App] Image quality changed to: ${quality}`);
    
    // 重新渲染卡片预览
    refreshLiveCard();
  }
}

// ========== 全局页面导航与工具 ==========

function bindNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageName);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  if (pageName === 'card-library' && typeof library !== 'undefined') {
    library.loadCards();
  }
  if (pageName === 'card-library' && typeof renderCustomArchetypeLists === 'function') {
    renderCustomArchetypeLists();
  }
}

function showNotification(msg) {
  const toast = document.getElementById('notification');
  const text = document.getElementById('notificationText');
  if (!toast || !text) return;

  text.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showLoading(show, text = '正在实时编译渲染...') {
  const overlay = document.getElementById('loading');
  const textEl = document.querySelector('.loading-overlay .loading-text');
  if (!overlay) return;
  if (textEl) textEl.textContent = text;
  overlay.classList.toggle('show', show);
}

// ========== 保存至本地卡牌库 ==========
function saveCurrentCardToLibrary() {
  readFormToState();
  compileLuaPreview();

  const canvas = document.getElementById('liveCardCanvas');
  const thumbUrl = canvas ? canvas.toDataURL('image/jpeg', 0.8) : '';

  const cardRecord = {
    ...state.cardData,
    scriptCode: state.generatedScript,
    imageBase64: thumbUrl,
    createdAt: new Date().toISOString()
  };

  if (typeof library !== 'undefined' && library.saveCard) {
    library.saveCard(cardRecord);
    showNotification('💾 已成功保存至本地卡牌库！');
  } else {
    // 独立 localStorage 备份
    const stored = JSON.parse(localStorage.getItem('yugioh_cards') || '[]');
    stored.unshift(cardRecord);
    localStorage.setItem('yugioh_cards', JSON.stringify(stored));
    showNotification('💾 已成功保存至本地卡牌库！');
  }
  if (typeof markCardSaved === 'function') {
    markCardSaved();
  }
}

// ============================================================
// 多卡卡包工程管理器 (Card Set Manager) 核心驱动
// ============================================================

function initCardSet() {
  if (!state.cardSet || state.cardSet.length === 0) {
    const initialSlot = JSON.parse(JSON.stringify(state.cardData));
    initialSlot.effectConfig = JSON.parse(JSON.stringify(state.effectConfig));
    initialSlot.wizardEffects = JSON.parse(JSON.stringify(state.wizardEffects));
    initialSlot.currentWizardIndex = state.currentWizardIndex || 0;
    initialSlot.uploadedImageElement = state.uploadedImageElement;
    state.cardSet = [initialSlot];
    state.currentCardIndex = 0;
  }
  renderCardSetBar();
  updateArchetypeDatalist();
}

function saveCurrentCardIntoSetSlot() {
  readFormToState();
  if (!state.cardSet || state.currentCardIndex < 0) return;
  const currentSlot = state.cardSet[state.currentCardIndex];
  if (!currentSlot) return;

  Object.assign(currentSlot, JSON.parse(JSON.stringify(state.cardData)));
  currentSlot.effectConfig = JSON.parse(JSON.stringify(state.effectConfig));
  currentSlot.wizardEffects = JSON.parse(JSON.stringify(state.wizardEffects));
  currentSlot.currentWizardIndex = state.currentWizardIndex || 0;
  currentSlot.pendulumEffect = state.pendulumEffect ? JSON.parse(JSON.stringify(state.pendulumEffect)) : null;
  currentSlot.uploadedImageElement = state.uploadedImageElement;
}

function loadCardFromSetSlot(slot) {
  if (!slot) return;
  state.cardData = JSON.parse(JSON.stringify(slot));
  delete state.cardData.effectConfig;
  delete state.cardData.wizardEffects;
  delete state.cardData.uploadedImageElement;
  delete state.cardData.currentWizardIndex;

  if (slot.effectConfig) {
    state.effectConfig = JSON.parse(JSON.stringify(slot.effectConfig));
  }
  if (slot.wizardEffects) {
    state.wizardEffects = JSON.parse(JSON.stringify(slot.wizardEffects));
  }
  state.currentWizardIndex = slot.currentWizardIndex || 0;
  state.pendulumEffect = slot.pendulumEffect ? JSON.parse(JSON.stringify(slot.pendulumEffect)) : null;
  state.uploadedImageElement = slot.uploadedImageElement || null;

  fillFormFromState();
  if (typeof markCardSaved === 'function') {
    markCardSaved();
  }
}

function fillFormFromState() {
  const c = state.cardData;
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
  };

  setEl('cardId', c.id);
  setEl('cardName', c.name);
  setEl('cardLanguage', c.language || 'zh');
  setEl('cardRuby', c.ruby || '');
  setEl('cardArchetype', c.archetype);
  setEl('cardType', c.type);
  setEl('cardRace', c.race);
  setEl('cardAttribute', c.attribute);
  setEl('cardLevel', c.level);
  setEl('cardAtk', c.atk);
  setEl('cardDef', c.def);
  setEl('cardDesc', c.description);
  setEl('cardTypeHeader', c.typeHeader || '');
  setEl('pendulumScale', c.scale || 1);

  // 1. 切换大类 (怪兽/魔法/陷阱)
  const mainType = c.mainType || 'monster';
  selectMainCardType(mainType);

  // 2. 若是怪兽，还原怪兽子类别、复合特性与灵摆状态
  if (mainType === 'monster') {
    let primaryCat = '33';
    if (c.type & 67108864) primaryCat = '67108865';
    else if (c.type & 8388608) primaryCat = '8388609';
    else if (c.type & 8192) primaryCat = '8193';
    else if (c.type & 64) primaryCat = '65';
    else if (c.type & 128) primaryCat = '129';
    else if (c.type & 16384) primaryCat = '16385';
    else if (c.type & 16777216) primaryCat = '16777249';
    else if ((c.type & 16) || !(c.type & 32)) primaryCat = '1';
    else primaryCat = '33';

    const catEl = document.getElementById('monsterCategory');
    if (catEl) catEl.value = primaryCat;

    syncTraitChipsFromType(c.type);
    onMonsterCategoryChanged(true);

    if (c.linkArrows) {
      updateLinkRatingDisplay();
    }
  } else if (mainType === 'spell') {
    document.querySelectorAll('#panelSpellFields .sub-type-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.type) === c.type);
    });
  } else if (mainType === 'trap') {
    document.querySelectorAll('#panelTrapFields .sub-type-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.type) === c.type);
    });
  }

  // 3. 还原配图状态与 YGOLD 交互工艺参数
  const metaWrap = document.getElementById('uploadedImagePreviewWrap');
  const metaText = document.getElementById('imageMetaText');
  if (state.uploadedImageElement) {
    if (metaWrap) metaWrap.style.display = 'flex';
    if (metaText) metaText.textContent = `🖼️ 配图已载入 (${state.uploadedImageElement.naturalWidth} × ${state.uploadedImageElement.naturalHeight}px)`;
  } else {
    if (metaWrap) metaWrap.style.display = 'none';
  }

  setEl('cardOverframeSelect', c.isOverframe ? 'overframe' : 'standard');
  setEl('cardFoilNameSelect', c.foilName || 'auto');
  setEl('artScaleInput', c.artScale !== undefined ? c.artScale : 100);
  setEl('artOffsetXInput', c.artOffsetX !== undefined ? c.artOffsetX : 0);
  setEl('artOffsetYInput', c.artOffsetY !== undefined ? c.artOffsetY : 0);
  setEl('artFitSelect', c.artFit || 'cover');
  setEl('cardPackCodeInput', c.packCode || '');
  setEl('cardRareSelect', c.rare || 'none');
  setEl('cardRareOpacityInput', c.rareOpacity !== undefined ? Math.round(c.rareOpacity * 100) : 65);
  setEl('cardWatermarkSelect', c.watermark || 'none');
  setEl('cardWatermarkOpacityInput', c.watermarkOpacity !== undefined ? Math.round(c.watermarkOpacity * 100) : 22);
  setEl('cardHoloSelect', c.holoStyle || 'laser1');

  const scaleVal = document.getElementById('artScaleVal');
  if (scaleVal) scaleVal.textContent = `${c.artScale !== undefined ? c.artScale : 100}%`;
  const offXVal = document.getElementById('artOffsetXVal');
  if (offXVal) offXVal.textContent = `${(c.artOffsetX || 0) > 0 ? '+' : ''}${c.artOffsetX || 0}px`;
  const offYVal = document.getElementById('artOffsetYVal');
  if (offYVal) offYVal.textContent = `${(c.artOffsetY || 0) > 0 ? '+' : ''}${c.artOffsetY || 0}px`;
  const rareOpVal = document.getElementById('rareOpacityVal');
  if (rareOpVal) rareOpVal.textContent = `${c.rareOpacity !== undefined ? Math.round(c.rareOpacity * 100) : 65}%`;
  const wmOpVal = document.getElementById('watermarkOpacityVal');
  if (wmOpVal) wmOpVal.textContent = `${c.watermarkOpacity !== undefined ? Math.round(c.watermarkOpacity * 100) : 22}%`;

  // 4. 还原前置规则表单
  const cfg = state.effectConfig;
  const chkAlias = document.getElementById('aliasEnabled');
  const aliasWrap = document.getElementById('aliasInputWrap');
  const aliasInput = document.getElementById('aliasName');
  const summonRestr = document.getElementById('summonRestriction');

  if (chkAlias) chkAlias.checked = !!cfg.aliasEnabled;
  if (aliasWrap) aliasWrap.style.display = cfg.aliasEnabled ? 'block' : 'none';
  if (aliasInput) aliasInput.value = cfg.aliasName || '';
  if (summonRestr) summonRestr.value = cfg.summonRestriction || 'none';

  // 4.5 还原效果外文本 / 独立规则条款
  const rt = c.ruleTexts || {};
  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
  setChk('ruleAliasEnabled', rt.ruleAlias);
  setEl('ruleAliasName', rt.ruleAliasName || '');
  setEl('ruleAliasId', rt.ruleAliasId || '');
  setChk('ruleSsOnceEnabled', rt.ssOncePerTurn);
  setChk('ruleNomiEnabled', rt.cannotNormalSummon);
  setEl('ruleNomiType', rt.nomiType || 'self_effect');
  setChk('ruleNoSpecialSummon', rt.cannotSpecialSummon);
  setChk('ruleMaterialLimitEnabled', rt.materialRestriction);
  setEl('ruleMaterialType', rt.materialType || 'all_extra');
  setChk('ruleDeckLimitOne', rt.deckLimitOne);
  setChk('ruleCannotBeReleased', rt.cannotBeReleased);
  setChk('ruleCannotMSet', rt.cannotMSet);
  setChk('ruleCannotTrigger', rt.cannotTrigger);
  setChk('ruleCannotChangePosition', rt.cannotChangePosition);
  setChk('ruleCannotAttack', rt.cannotAttack);
  setChk('ruleCannotBeAttacked', rt.cannotBeAttacked);
  setChk('ruleDirectAttack', rt.canDirectAttack);
  setEl('ruleAddMonsterType', rt.addMonsterType || '');
  setEl('ruleAttribute', rt.ruleAttribute || '');
  setEl('ruleRace', rt.ruleRace || '');
  setEl('ruleLevel', rt.ruleLevel || '');
  const procEnabled = !!(rt.procSummonType);
  setChk('ruleSummonProcEnabled', procEnabled);
  if (rt.procSummonType) setEl('ruleProcSummonType', rt.procSummonType);
  if (rt.procMaterialCount) setEl('ruleProcMaterialCount', rt.procMaterialCount);
  setChk('ruleCustomEnabled', rt.customRule);
  setEl('ruleCustomText', rt.customRuleText || '');
  if (typeof onRuleTextsChanged === 'function') onRuleTextsChanged();

  // 5. 还原效果总数按钮高亮与频次限制卡片
  const count = cfg.totalEffects || 1;
  document.querySelectorAll('.effect-count-buttons .count-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
  });
  renderEffectLimitsGrid();
  renderWizardStep();
}

function renderCardSetBar() {
  const tabsList = document.getElementById('cardSetTabsList');
  const countBadge = document.getElementById('cardSetCountBadge');
  const nameInput = document.getElementById('cardSetNameInput');

  if (countBadge) {
    countBadge.textContent = `${state.cardSet.length} 张卡`;
  }
  if (nameInput && !nameInput.matches(':focus')) {
    nameInput.value = state.setName || '自定义扩展系列 #1';
  }

  if (!tabsList) return;

  let html = '';
  state.cardSet.forEach((card, idx) => {
    const isActive = idx === state.currentCardIndex;
    const displayName = card.name || '未命名卡片';
    const cardId = card.id || '---';

    html += `
      <div class="card-set-tab-item" style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: ${isActive ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.06)'};
        border: 1px solid ${isActive ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)'};
        color: ${isActive ? '#fbbf24' : '#cbd5e1'};
        padding: 5px 12px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
        box-shadow: ${isActive ? '0 0 10px rgba(245, 158, 11, 0.2)' : 'none'};
        transition: all 0.2s;
      " onclick="switchToCardInSet(${idx})">
        <span style="font-weight:700;">#${idx + 1}</span>
        <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(displayName)}</span>
        <span style="font-size: 11px; opacity: 0.6; font-family: monospace;">(${cardId})</span>
        ${state.cardSet.length > 1 ? `
          <button type="button" onclick="deleteCardFromSet(${idx}, event)" title="从卡包删除" style="
            background: transparent;
            border: none;
            color: #ef4444;
            cursor: pointer;
            padding: 0 4px;
            font-size: 13px;
            margin-left: 4px;
            opacity: 0.8;
          " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">✕</button>
        ` : ''}
      </div>
    `;
  });

  tabsList.innerHTML = html;
}

function switchToCardInSet(idx) {
  if (idx < 0 || idx >= state.cardSet.length) return;
  if (idx === state.currentCardIndex) {
    renderCardSetBar();
    return;
  }

  saveCurrentCardIntoSetSlot();
  state.currentCardIndex = idx;
  loadCardFromSetSlot(state.cardSet[idx]);

  renderCardSetBar();
  refreshLiveCard();
  compileLuaPreview();
  validateCardIdConflict();
}

function addNewCardToSet() {
  saveCurrentCardIntoSetSlot();

  const curArch = (state.cardData.archetype || '').trim();
  const nextId = findNextSafePasscode(curArch);

  const newIdx = state.cardSet.length + 1;
  const newCard = {
    id: nextId,
    name: `新卡片 #${newIdx}`,
    archetype: curArch,
    mainType: 'monster',
    type: 33,
    race: 1,
    attribute: 32,
    level: 4,
    atk: 1500,
    def: 1500,
    linkArrows: [4, 5, 6],
    scale: 1,
    description: '',
    effectConfig: {
      aliasEnabled: false,
      aliasName: '',
      totalEffects: 1,
      summonRestriction: 'none',
      countLimits: [
        { countLimit: 'hopt', countNumber: 1 }
      ]
    },
    wizardEffects: [
      {
        timing: 'summon_success',
        cost: 'none',
        costLp: 1000,
        target: 'none',
        action: 'search_deck',
        followup: 'none',
        countLimit: 'hopt',
        countNumber: 1
      }
    ],
    uploadedImageElement: null
  };

  state.cardSet.push(newCard);
  switchToCardInSet(state.cardSet.length - 1);
  updateArchetypeDatalist();
  showNotification(`🎴 已添加新卡片: ${newCard.name} (卡密 #${nextId})`);
}

function cloneCurrentCard() {
  saveCurrentCardIntoSetSlot();
  const curSlot = state.cardSet[state.currentCardIndex] || state.cardData;
  const curArch = (curSlot.archetype || '').trim();
  const nextId = findNextSafePasscode(curArch);

  const cloned = JSON.parse(JSON.stringify(curSlot));
  cloned.id = nextId;
  cloned.name = `${curSlot.name || '卡片'} (克隆)`;
  cloned.uploadedImageElement = curSlot.uploadedImageElement || null;

  state.cardSet.push(cloned);
  switchToCardInSet(state.cardSet.length - 1);
  updateArchetypeDatalist();
  showNotification(`📑 已成功克隆卡片: ${cloned.name} (卡密 #${nextId})`);
}

function deleteCardFromSet(idx, e) {
  if (e) e.stopPropagation();
  if (state.cardSet.length <= 1) {
    showNotification('卡包至少保留 1 张卡片', 'error');
    return;
  }

  const deletedName = state.cardSet[idx]?.name || '卡片';
  state.cardSet.splice(idx, 1);

  if (state.currentCardIndex === idx) {
    state.currentCardIndex = Math.min(idx, state.cardSet.length - 1);
    loadCardFromSetSlot(state.cardSet[state.currentCardIndex]);
  } else if (state.currentCardIndex > idx) {
    state.currentCardIndex--;
  }

  renderCardSetBar();
  refreshLiveCard();
  compileLuaPreview();
  validateCardIdConflict();
  showNotification(`已从卡包中移除: ${deletedName}`);
}

function onSetNameChanged(val) {
  state.setName = (val || '').trim() || '自定义扩展系列 #1';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// 原卡池自动探测、卡密冲突拦截与自动安全分配引擎
// ============================================================

async function initCdbDetection() {
  const dot = document.getElementById('cdbStatusDot');
  const text = document.getElementById('cdbStatusText');

  // 1. 预先载入内置提炼的 14,981 张官方原卡数据库黑名单与 595 官方字段
  if (state.cdbManager) {
    await state.cdbManager.loadOfficialResources();
  }
  await loadOfficialArchetypes();

  if (!dot || !text) return;

  try {
    const resp = await fetch('/api/detect-local-ygopro');
    if (resp.ok) {
      const info = await resp.json();
      if (info.found && info.path) {
        text.textContent = `检测到本机原卡池 (${info.path})，正在同步...`;
        dot.style.background = '#f59e0b';

        const cdbResp = await fetch('/api/local-cdb');
        if (cdbResp.ok) {
          const buffer = await cdbResp.arrayBuffer();
          const res = await state.cdbManager.loadCdbFromBuffer(buffer, info.path);
          if (res.success) {
            dot.style.background = '#10b981';
            text.textContent = `✓ 已连接本机原卡池 (${res.count} 张卡，路径: ${info.path})`;
            // 若当前卡密与原卡池冲突，直接自动避开并顺延，不呈现红字冲突
            if (state.cdbManager && state.cdbManager.occupiedPasscodes.has(Number(state.cardData.id))) {
              assignSafePasscode();
            } else {
              validateCardIdConflict();
            }
            return;
          }
        }
      }
    }
  } catch (err) {
    console.log('[CDBDetection] Standalone / Mobile mode active');
  }

  // 若无本地 YGOPro 后端探测，官方 14,981 原卡库已加载生效
  if (state.cdbManager && state.cdbManager.isPoolLoaded) {
    dot.style.background = '#10b981';
    text.textContent = `✓ ${state.cdbManager.poolSourceInfo} · 安全防重引擎已就绪`;
  } else {
    dot.style.background = '#64748b';
    text.textContent = '未检测到本机游戏卡池 (支持点击右侧载入 cards.cdb 防重校验)';
  }
  validateCardIdConflict();
}

async function onManualCdbUploaded(e) {
  const file = e.target.files[0];
  if (!file) return;

  const dot = document.getElementById('cdbStatusDot');
  const text = document.getElementById('cdbStatusText');

  try {
    showLoading(true, `正在解析原卡池 ${file.name}...`);
    const buffer = await file.arrayBuffer();
    const res = await state.cdbManager.loadCdbFromBuffer(buffer, file.name);
    if (res.success) {
      if (dot) dot.style.background = '#10b981';
      if (text) text.textContent = `✓ 已手动载入 ${file.name} (${res.count} 张卡)`;
      showNotification(`✅ 成功索引 ${file.name} 原卡池，共 ${res.count} 张卡！`);
      if (state.cdbManager && state.cdbManager.occupiedPasscodes.has(Number(state.cardData.id))) {
        assignSafePasscode();
      } else {
        validateCardIdConflict();
      }
    } else {
      showNotification('解析 CDB 失败: ' + res.error, 'error');
    }
  } catch (err) {
    showNotification('读取文件失败: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

function onCardIdInput(val) {
  readFormToState();
  saveCurrentCardIntoSetSlot();
  validateCardIdConflict();
  renderCardSetBar();
}

function validateCardIdConflict() {
  const badge = document.getElementById('cdbConflictBadge');
  const msg = document.getElementById('cdbConflictMsg');
  const btnSafe = document.getElementById('btnAutoSafeId');
  const idInput = document.getElementById('cardId');
  const curId = parseInt(state.cardData.id) || 0;

  const setStatus = (type, badgeText, messageText, showAutoBtn) => {
    if (badge) {
      badge.style.display = 'inline-block';
      badge.textContent = badgeText;
      if (type === 'error') {
        badge.style.background = '#ef4444';
        badge.style.color = '#fff';
      } else if (type === 'warning') {
        badge.style.background = '#f59e0b';
        badge.style.color = '#fff';
      } else {
        badge.style.background = '#10b981';
        badge.style.color = '#fff';
      }
    }
    if (msg) {
      msg.textContent = messageText;
      msg.style.color = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981';
    }
    if (btnSafe) {
      btnSafe.style.display = showAutoBtn ? 'inline-block' : 'none';
    }
    if (idInput) {
      idInput.style.borderColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : 'rgba(255,255,255,0.15)';
    }
  };

  if (!curId || curId <= 0) {
    setStatus('warning', '⚠️ 请输入有效卡密', '卡密需为正整数数字', true);
    return;
  }

  // 1. 检查当前卡包内是否有其他卡片使用了相同卡密
  const dupCardInSet = state.cardSet && state.cardSet.find((c, idx) => idx !== state.currentCardIndex && Number(c.id) === curId);
  if (dupCardInSet) {
    setStatus('error', '⚠️ 卡包内卡密重复', `当前卡包内已有其他卡片【${dupCardInSet.name || '未命名'}】占用卡密 #${curId}，请点击右侧按钮重新分配！`, true);
    return;
  }

  // 2. 检查 CDB 原卡池冲突 (官方实卡或本机已载入原卡池)
  if (state.cdbManager) {
    const check = state.cdbManager.checkPasscodeConflict(curId);
    if (check.conflict) {
      setStatus('error', '🚨 与原卡池冲突', check.message, true);
      return;
    }
    if (check.warning) {
      setStatus('warning', '⚡ 官方号段提示', check.message, false);
      return;
    }
  }

  // 3. 检查本地卡牌库中是否已有其他卡占用了该卡密
  const allDiy = getAllDiyCards();
  const dupInLib = allDiy.find(c => Number(c.id) === curId && (!state.cardSet || !state.cardSet.some(sc => Number(sc.id) === curId)));
  if (dupInLib) {
    setStatus('warning', '⚠️ 与本地库已有卡重复', `本地卡牌库中已有卡片【${dupInLib.name || '未命名'}】使用此卡密，继续保存将覆盖`, true);
    return;
  }

  // 4. 完全安全可用
  const curArch = (state.cardData.archetype || '').trim();
  const safeMsg = curArch 
    ? `✓ 卡密安全可用，已对齐「${curArch}」同字段可用卡密序列`
    : '✓ 卡密在原卡池、当前卡包与本地库中均完全可用，安全无冲突';
  setStatus('success', '✓ 卡密唯一安全', safeMsg, false);
}

// ============================================================
// DIY 卡与同字段序列卡密智能分配引擎
// ============================================================

/**
 * 获取当前所有 DIY 卡片集合（合并当前工程 cardSet 与本地卡牌库）
 */
function getAllDiyCards() {
  const cardsMap = new Map();
  // 1. 本地卡牌库
  try {
    const saved = localStorage.getItem('yugioh_cards');
    if (saved) {
      const libCards = JSON.parse(saved);
      if (Array.isArray(libCards)) {
        libCards.forEach(c => {
          if (c && c.id) cardsMap.set(Number(c.id), c);
        });
      }
    }
  } catch (e) {
    console.warn('Load libCards error:', e);
  }

  // 2. 当前工程卡包
  if (state.cardSet && Array.isArray(state.cardSet)) {
    state.cardSet.forEach(c => {
      if (c && c.id) cardsMap.set(Number(c.id), c);
    });
  }

  return Array.from(cardsMap.values());
}

/**
 * 根据字段名筛选已有 DIY 卡
 */
function getDiyCardsByArchetype(archetype) {
  if (!archetype || !archetype.trim()) return [];
  const archName = archetype.trim().toLowerCase();
  const all = getAllDiyCards();
  return all.filter(c => c && c.archetype && c.archetype.trim().toLowerCase() === archName);
}

/**
 * 寻找下一个绝对空闲的安全卡密
 * 1. 若指定字段且已有同字段 DIY 卡，自动延续该字段最大卡密的下一个未占用卡密
 * 2. 彻底避开原卡池 cards.cdb 已占用卡密、当前卡包内卡密、本地卡牌库卡密
 * 3. 彻底避开官方实卡号段 (10000 ~ 99999999)
 */
function findNextSafePasscode(archetype = '', startCandidate = null, excludeCurrentCardId = null) {
  const allDiyCards = getAllDiyCards();

  const occupiedDiyIds = new Set();
  allDiyCards.forEach(c => {
    if (c && c.id && Number(c.id) !== Number(excludeCurrentCardId)) {
      occupiedDiyIds.add(Number(c.id));
    }
  });

  let baseId = null;
  const cleanArch = (archetype || '').trim().toLowerCase();

  // 1. 若有字段，优先在同字段已有 DIY 卡中提取最大卡密顺延
  if (cleanArch) {
    const sameArchCards = allDiyCards.filter(c => 
      c && Number(c.id) !== Number(excludeCurrentCardId) &&
      c.archetype && c.archetype.trim().toLowerCase() === cleanArch
    );

    if (sameArchCards.length > 0) {
      let maxArchId = 0;
      sameArchCards.forEach(c => {
        const idNum = Number(c.id);
        if (idNum > maxArchId) maxArchId = idNum;
      });
      if (maxArchId > 0) {
        baseId = maxArchId + 1;
      }
    }
  }

  // 2. 若无同字段已有卡，则使用传入的起始候选值或从现有卡包最大值顺延
  if (!baseId) {
    if (startCandidate && startCandidate > 0) {
      baseId = parseInt(startCandidate);
    } else {
      let maxSetId = 100000000;
      if (state.cardSet && state.cardSet.length > 0) {
        state.cardSet.forEach(c => {
          if (c && c.id && Number(c.id) !== Number(excludeCurrentCardId)) {
            const idNum = Number(c.id);
            if (idNum > maxSetId) maxSetId = idNum;
          }
        });
      }
      baseId = maxSetId + 1;
    }
  }

  // 3. 规范自制卡起号区间：从 100000001 起
  if (baseId < 100000001) {
    baseId = 100000001;
  }

  // 4. 循环向上寻找完全空闲的卡密（原卡池未占用 且 DIY 未占用）
  let candidate = baseId;
  while (true) {
    const inPool = state.cdbManager ? state.cdbManager.occupiedPasscodes.has(candidate) : false;
    const inDiy = occupiedDiyIds.has(candidate);

    if (!inPool && !inDiy) {
      return candidate;
    }
    candidate++;
  }
}

// ============================================================
// 官方 595 字段库与自定义系列字段管理引擎
// ============================================================

let officialArchetypesList = [];
let customArchetypesList = [];

function loadCustomArchetypesFromStorage() {
  try {
    const saved = localStorage.getItem('yugioh_custom_archetypes');
    if (saved) {
      customArchetypesList = JSON.parse(saved);
      if (!Array.isArray(customArchetypesList)) customArchetypesList = [];
    }
  } catch (e) {
    customArchetypesList = [];
  }
}

function saveCustomArchetypesToStorage() {
  try {
    localStorage.setItem('yugioh_custom_archetypes', JSON.stringify(customArchetypesList));
  } catch (e) {
    console.warn('Save custom archetypes error:', e);
  }
}

async function loadOfficialArchetypes() {
  loadCustomArchetypesFromStorage();
  try {
    const resp = await fetch('./assets/yugioh/official-archetypes.json');
    if (resp.ok) {
      officialArchetypesList = await resp.json();
    }
  } catch (err) {
    console.warn('Failed to load official-archetypes.json:', err);
  }
  updateArchetypeDatalist();
}

/**
 * 更新字段下拉建议列表 (融合 595 官方字段 + 用户自制字段 + 本地工程提取字段)
 */
function updateArchetypeDatalist() {
  const datalist = document.getElementById('archetypeDatalist');
  if (!datalist) return;

  const combined = [];
  const addedNames = new Set();

  // 1. 自定义字段 (置顶提示)
  customArchetypesList.forEach(item => {
    if (!addedNames.has(item.nameZh)) {
      addedNames.add(item.nameZh);
      combined.push({
        label: `⭐ [自制] ${item.nameZh}${item.nameJa ? ' (' + item.nameJa + ')' : ''} [${item.hex}]`,
        value: item.nameZh,
        hex: item.hex,
        code: item.code,
        nameZh: item.nameZh,
        nameJa: item.nameJa || ''
      });
    }
  });

  // 2. 官方 595 字段
  officialArchetypesList.forEach(item => {
    if (!addedNames.has(item.nameZh)) {
      addedNames.add(item.nameZh);
      combined.push({
        label: `${item.nameZh}${item.nameJa ? ' (' + item.nameJa + ')' : ''} [${item.hex}]`,
        value: item.nameZh,
        hex: item.hex,
        code: item.code,
        nameZh: item.nameZh,
        nameJa: item.nameJa || ''
      });
    }
  });

  // 3. 当前工程中已有卡片的字段
  getAllDiyCards().forEach(c => {
    if (c && c.archetype && c.archetype.trim() && !addedNames.has(c.archetype.trim())) {
      addedNames.add(c.archetype.trim());
      combined.push({
        label: `🎴 ${c.archetype.trim()}`,
        value: c.archetype.trim(),
        hex: c.setcode || '',
        nameZh: c.archetype.trim()
      });
    }
  });

  let optionsHtml = '';
  combined.forEach(opt => {
    optionsHtml += `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`;
  });
  datalist.innerHTML = optionsHtml;
}

function findArchetypeMatch(val) {
  if (!val || !val.trim()) return null;
  const q = val.trim().toLowerCase();

  // 1. 自定义字段匹配
  const diyMatch = customArchetypesList.find(a => 
    a.nameZh.toLowerCase() === q ||
    (a.nameJa && a.nameJa.toLowerCase() === q) ||
    a.hex.toLowerCase() === q
  );
  if (diyMatch) return { ...diyMatch, isCustom: true };

  // 2. 官方字段精确匹配
  const exactOfficial = officialArchetypesList.find(a => 
    a.nameZh.toLowerCase() === q ||
    (a.nameJa && a.nameJa.toLowerCase() === q) ||
    a.hex.toLowerCase() === q
  );
  if (exactOfficial) return { ...exactOfficial, isCustom: false };

  // 3. 官方字段模糊包含匹配
  const fuzzy = officialArchetypesList.find(a => 
    a.nameZh.toLowerCase().includes(q) ||
    (a.nameJa && a.nameJa.toLowerCase().includes(q))
  );
  if (fuzzy) return { ...fuzzy, isCustom: false };

  return null;
}

function onCardArchetypeInput(val) {
  const clean = (val || '').trim();
  const match = findArchetypeMatch(clean);
  const setcodeEl = document.getElementById('cardSetcode');
  const hintEl = document.getElementById('archetypeInfoHint');

  if (match) {
    if (setcodeEl) setcodeEl.value = match.hex;
    state.cardData.setcode = match.hex;
    state.cardData.archetype = match.nameZh;
    if (hintEl) {
      hintEl.innerHTML = `<span style="color:#38bdf8;">✓ 已匹配${match.isCustom ? '自制' : '官方'}字段：<b>${escapeHtml(match.nameZh)}</b> ${match.nameJa ? '(' + escapeHtml(match.nameJa) + ')' : ''} [${match.hex}]</span>`;
    }
  } else {
    state.cardData.archetype = clean;
    if (hintEl) {
      if (clean) {
        hintEl.innerHTML = `<span style="color:#f59e0b;">未匹配到官方字段，将作为自定义系列（可输入 Setcode 或点击右侧新建分配）</span>`;
      } else {
        hintEl.textContent = '可直接输入筛选官方 595 种原有字段，或点击右侧新建自定义字段';
        if (setcodeEl) setcodeEl.value = '';
        state.cardData.setcode = '';
      }
    }
  }

  onCardArchetypeChanged(clean);
}

function onSetcodeManualInput(val) {
  state.cardData.setcode = (val || '').trim();
}

function generateNextDiySetcode() {
  let maxCode = 0x7f00;
  customArchetypesList.forEach(a => {
    const c = parseInt(a.hex, 16);
    if (c > maxCode && c <= 0x7fff) maxCode = c;
  });
  const next = maxCode + 1;
  return {
    hex: '0x' + next.toString(16),
    code: next
  };
}

function openCustomArchetypeModal() {
  const modal = document.getElementById('customArchetypeModal');
  const backdrop = document.getElementById('customArchetypeModalBackdrop');
  const hexInput = document.getElementById('diyArchetypeHex');
  const decInput = document.getElementById('diyArchetypeDec');
  const zhInput = document.getElementById('diyArchetypeNameZh');
  const jaInput = document.getElementById('diyArchetypeNameJa');
  const tip = document.getElementById('diyArchetypeConflictTip');

  const curArch = document.getElementById('cardArchetype')?.value.trim() || '';
  if (zhInput) zhInput.value = curArch;
  if (jaInput) jaInput.value = '';

  const nextCode = generateNextDiySetcode();
  if (hexInput) hexInput.value = nextCode.hex;
  if (decInput) decInput.value = nextCode.code;
  if (tip) tip.style.display = 'none';

  if (modal) modal.classList.add('show');
  if (backdrop) backdrop.classList.add('show');
  renderCustomArchetypeLists();
}

function closeCustomArchetypeModal() {
  const modal = document.getElementById('customArchetypeModal');
  const backdrop = document.getElementById('customArchetypeModalBackdrop');
  if (modal) modal.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
}

function renderCustomArchetypeLists() {
  loadCustomArchetypesFromStorage();

  // 1. 渲染模态框内的小列表
  const modalList = document.getElementById('modalCustomArchetypesList');
  const modalCount = document.getElementById('modalArchetypeCount');
  if (modalCount) modalCount.textContent = `${customArchetypesList.length} 个字段`;

  if (modalList) {
    if (customArchetypesList.length === 0) {
      modalList.innerHTML = `
        <div style="font-size:12px;color:#64748b;padding:6px;text-align:center;">
          暂无已保存的自制字段，填写上方表单即可创建
        </div>
      `;
    } else {
      modalList.innerHTML = customArchetypesList.map(item => `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:5px 10px;font-size:12px;">
          <div style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            <span style="font-weight:600;color:#f0f6fc;">${escapeHtml(item.nameZh)}</span>
            ${item.nameJa ? `<span style="color:#8b949e;">(${escapeHtml(item.nameJa)})</span>` : ''}
            <span style="color:#38bdf8;font-family:monospace;">[${item.hex}]</span>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button type="button" class="btn-sm btn-outline" onclick="selectCustomArchetype('${escapeHtml(item.nameZh)}', '${item.hex}')" style="font-size:11px;padding:1px 6px;">选用</button>
            <button type="button" class="btn-sm btn-danger" onclick="deleteCustomArchetype('${escapeHtml(item.nameZh)}', '${item.hex}')" style="font-size:11px;padding:1px 6px;">🗑️</button>
          </div>
        </div>
      `).join('');
    }
  }

  // 2. 渲染卡牌库页面专属管理卡片（自定义字段统一在卡牌库管理）
  const libraryList = document.getElementById('libraryArchetypeList');
  if (libraryList) {
    if (customArchetypesList.length === 0) {
      libraryList.innerHTML = `
        <div style="padding:16px;text-align:center;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.15);border-radius:8px;color:#8b949e;font-size:13px;">
          暂无自定义系列字段。点击下方「+ 新建自定义字段」创建专属系列，系统将自动分配防冲突的 Setcode 代码。
        </div>
      `;
    } else {
      libraryList.innerHTML = customArchetypesList.map(item => `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:18px;">🏷️</span>
            <div>
              <div style="font-weight:600;color:#f0f6fc;font-size:14px;">
                ${escapeHtml(item.nameZh)}
                ${item.nameJa ? `<span style="color:#8b949e;font-size:12px;margin-left:6px;">(${escapeHtml(item.nameJa)})</span>` : ''}
              </div>
              <div style="font-size:12px;color:#38bdf8;font-family:monospace;margin-top:2px;">
                Setcode: <strong>${item.hex}</strong> <span style="color:#64748b;">(十进制: ${item.code})</span>
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="btn btn-sm btn-outline" onclick="selectCustomArchetype('${escapeHtml(item.nameZh)}', '${item.hex}')" title="将此字段应用到当前正在编辑的卡片">应用到卡片</button>
            <button type="button" class="btn btn-sm btn-danger" onclick="deleteCustomArchetype('${escapeHtml(item.nameZh)}', '${item.hex}')" title="删除此自定义字段">🗑️ 删除</button>
          </div>
        </div>
      `).join('');
    }
  }
}

function deleteCustomArchetype(zh, hex) {
  if (!confirm(`确定要删除自制系列字段「${zh}」[${hex}] 吗？`)) return;
  customArchetypesList = customArchetypesList.filter(a => a.nameZh !== zh || a.hex !== hex);
  saveCustomArchetypesToStorage();
  updateArchetypeDatalist();
  renderCustomArchetypeLists();
  showNotification(`已删除自定义字段「${zh}」`);
}

function selectCustomArchetype(zh, hex) {
  const archEl = document.getElementById('cardArchetype');
  const setcodeEl = document.getElementById('cardSetcode');
  if (archEl) archEl.value = zh;
  if (setcodeEl) setcodeEl.value = hex;

  state.cardData.archetype = zh;
  state.cardData.setcode = hex;

  const hintEl = document.getElementById('archetypeInfoHint');
  if (hintEl) {
    hintEl.innerHTML = `<span style="color:#10b981;">✓ 已选用自制字段：<b>${escapeHtml(zh)}</b> [${hex}]</span>`;
  }

  closeCustomArchetypeModal();
  onCardArchetypeChanged(zh);

  // 如果在其他页面，切回制卡工作台第一步
  const curPage = document.querySelector('.page.active');
  if (curPage && curPage.id !== 'card-maker') {
    navigateTo('card-maker');
  }
  if (typeof jumpToStep === 'function') {
    jumpToStep(1);
  }

  showNotification(`✓ 已为当前卡片设置系列字段「${zh}」[${hex}]`);
}

function onDiyArchetypeInput() {
  const nameZh = document.getElementById('diyArchetypeNameZh')?.value.trim() || '';
  const tip = document.getElementById('diyArchetypeConflictTip');
  if (!nameZh) {
    if (tip) tip.style.display = 'none';
    return;
  }
  const match = findArchetypeMatch(nameZh);
  if (match && tip) {
    tip.style.display = 'block';
    tip.style.background = 'rgba(245, 158, 11, 0.15)';
    tip.style.color = '#f59e0b';
    tip.innerHTML = `⚠️ 注意：该名称与已有字段【${escapeHtml(match.nameZh)}】(${match.hex}) 冲突！`;
  } else if (tip) {
    tip.style.display = 'none';
  }
}

function onDiyHexInput(val) {
  const decInput = document.getElementById('diyArchetypeDec');
  const hex = (val || '').trim();
  const num = parseInt(hex, 16);
  if (decInput) {
    decInput.value = isNaN(num) ? '无效代码' : num;
  }
}

function saveCustomArchetype() {
  const zh = document.getElementById('diyArchetypeNameZh')?.value.trim();
  const ja = document.getElementById('diyArchetypeNameJa')?.value.trim() || '';
  let hex = document.getElementById('diyArchetypeHex')?.value.trim();

  if (!zh) {
    showNotification('请输入自定义字段中文名称', 'error');
    return;
  }

  if (!hex || !hex.startsWith('0x')) {
    const next = generateNextDiySetcode();
    hex = next.hex;
  }

  const code = parseInt(hex, 16);
  const newArch = { hex, code, nameZh: zh, nameJa: ja };

  customArchetypesList = customArchetypesList.filter(a => a.nameZh !== zh && a.hex !== hex);
  customArchetypesList.push(newArch);
  saveCustomArchetypesToStorage();
  updateArchetypeDatalist();
  renderCustomArchetypeLists();

  const archEl = document.getElementById('cardArchetype');
  const setcodeEl = document.getElementById('cardSetcode');
  if (archEl) archEl.value = zh;
  if (setcodeEl) setcodeEl.value = hex;

  state.cardData.archetype = zh;
  state.cardData.setcode = hex;

  const hintEl = document.getElementById('archetypeInfoHint');
  if (hintEl) {
    hintEl.innerHTML = `<span style="color:#10b981;">✓ 已保存并应用自制字段：<b>${escapeHtml(zh)}</b> [${hex}]</span>`;
  }

  closeCustomArchetypeModal();
  onCardArchetypeChanged(zh);
  showNotification(`✅ 已成功创建并应用自制字段「${zh}」[${hex}]！`);
}

/**
 * 当字段输入框修改完成时触发：若有同字段已存在的卡片，自动延续空闲卡密
 */
function onCardArchetypeChanged(archVal) {
  const cleanArch = (archVal || '').trim();
  state.cardData.archetype = cleanArch;
  saveCurrentCardIntoSetSlot();
  updateArchetypeDatalist();

  if (!cleanArch) return;

  const allDiyCards = getAllDiyCards();
  const curId = Number(state.cardData.id);
  const sameArchCards = allDiyCards.filter(c => 
    c && Number(c.id) !== curId &&
    c.archetype && c.archetype.trim().toLowerCase() === cleanArch.toLowerCase()
  );

  if (sameArchCards.length > 0) {
    const nextSafeId = findNextSafePasscode(cleanArch, null, curId);
    if (nextSafeId !== curId) {
      const idEl = document.getElementById('cardId');
      if (idEl) idEl.value = nextSafeId;
      state.cardData.id = nextSafeId;
      readFormToState();
      saveCurrentCardIntoSetSlot();
      validateCardIdConflict();
      refreshLiveCard();
      compileLuaPreview();
      renderCardSetBar();
      showNotification(`🎴 检测到已有同字段「${cleanArch}」DIY卡，已自动延续可用卡密: #${nextSafeId}`);
    }
  }
}

function assignSafePasscode() {
  const curArch = (state.cardData.archetype || '').trim();
  const curId = Number(state.cardData.id);
  const safeId = findNextSafePasscode(curArch, null, curId);

  const idEl = document.getElementById('cardId');
  if (idEl) idEl.value = safeId;
  state.cardData.id = safeId;
  readFormToState();
  saveCurrentCardIntoSetSlot();
  validateCardIdConflict();
  refreshLiveCard();
  compileLuaPreview();
  renderCardSetBar();
  showNotification(`⚡ 已自动分配安全空闲卡密: #${safeId}`);
}

// 导出全局接口
window.initCardSet = initCardSet;
window.renderCardSetBar = renderCardSetBar;
window.addNewCardToSet = addNewCardToSet;
window.cloneCurrentCard = cloneCurrentCard;
window.deleteCardFromSet = deleteCardFromSet;
window.switchToCardInSet = switchToCardInSet;
window.onSetNameChanged = onSetNameChanged;
window.initCdbDetection = initCdbDetection;
window.onManualCdbUploaded = onManualCdbUploaded;
window.validateCardIdConflict = validateCardIdConflict;
window.assignSafePasscode = assignSafePasscode;
window.onCardIdInput = onCardIdInput;
window.saveCurrentCardIntoSetSlot = saveCurrentCardIntoSetSlot;
window.getAllDiyCards = getAllDiyCards;
window.getDiyCardsByArchetype = getDiyCardsByArchetype;
window.findNextSafePasscode = findNextSafePasscode;
window.loadOfficialArchetypes = loadOfficialArchetypes;
window.updateArchetypeDatalist = updateArchetypeDatalist;
window.onCardArchetypeInput = onCardArchetypeInput;
window.onSetcodeManualInput = onSetcodeManualInput;
window.openCustomArchetypeModal = openCustomArchetypeModal;
window.closeCustomArchetypeModal = closeCustomArchetypeModal;
window.onDiyArchetypeInput = onDiyArchetypeInput;
window.onDiyHexInput = onDiyHexInput;
window.saveCustomArchetype = saveCustomArchetype;
window.renderCustomArchetypeLists = renderCustomArchetypeLists;
window.deleteCustomArchetype = deleteCustomArchetype;
window.selectCustomArchetype = selectCustomArchetype;
window.onCardArchetypeChanged = onCardArchetypeChanged;
window.toggleMonsterTrait = toggleMonsterTrait;
window.syncTraitChipsFromType = syncTraitChipsFromType;
window.openMobileCardDrawer = openMobileCardDrawer;
window.closeMobileCardDrawer = closeMobileCardDrawer;
window.syncDrawerCanvas = syncDrawerCanvas;
window.computeUpperText = computeUpperText;
window.autoAdaptUpperText = autoAdaptUpperText;
window.autoAdaptJapaneseCard = autoAdaptJapaneseCard;
window.onCardTypeHeaderChanged = onCardTypeHeaderChanged;
window.syncPendulumToCard = syncPendulumToCard;
window.jumpToStep = jumpToStep;
window.stepNext = stepNext;
window.stepPrev = stepPrev;

// ============================================================
// 卡片修改状态追踪引擎 (Unsaved Changes Detection Engine)
// ============================================================

function getCardSnapshotString() {
  if (typeof readFormToState === 'function') {
    readFormToState();
  }
  const c = state.cardData || {};
  return JSON.stringify({
    id: c.id,
    name: c.name,
    language: c.language,
    ruby: c.ruby,
    archetype: c.archetype,
    setcode: c.setcode,
    type: c.type,
    race: c.race,
    attribute: c.attribute,
    level: c.level,
    atk: c.atk,
    def: c.def,
    description: c.description,
    typeHeader: c.typeHeader,
    ruleTexts: c.ruleTexts,
    effectConfig: state.effectConfig,
    wizardEffects: state.wizardEffects,
    manualScript: state.manualScript,
    hasImage: !!state.uploadedImageElement || !!state.imageBase64
  });
}

function markCardSaved() {
  state.lastSavedSnapshot = getCardSnapshotString();
}

function checkUnsavedChanges() {
  if (!state.lastSavedSnapshot) {
    return { hasUnsaved: false, cardName: state.cardData?.name || '' };
  }
  const current = getCardSnapshotString();
  return {
    hasUnsaved: current !== state.lastSavedSnapshot,
    cardName: state.cardData?.name || '未命名卡片'
  };
}

window.getCardSnapshotString = getCardSnapshotString;
window.markCardSaved = markCardSaved;
window.checkUnsavedChanges = checkUnsavedChanges;

// 监听浏览器原生离开与刷新事件 (防止误关未保存工作)
window.addEventListener('beforeunload', (e) => {
  const status = checkUnsavedChanges();
  if (status.hasUnsaved) {
    e.preventDefault();
    e.returnValue = '检测到当前卡片有未保存的修改，直接退出将丢失编辑内容。确定要离开吗？';
    return e.returnValue;
  }
});

// 电脑端专属应用退出请求
async function requestAppExit() {
  const status = checkUnsavedChanges();
  const modal = document.getElementById('desktopExitModal');
  const title = document.getElementById('exitModalTitle');
  const msg = document.getElementById('exitModalMsg');
  const saveBtn = document.getElementById('exitSaveAndQuitBtn');

  if (status.hasUnsaved) {
    if (title) title.innerHTML = '⚠️ 未保存修改提示';
    if (msg) {
      msg.innerHTML = `检测到当前卡片【<strong style="color:#f85149;">${escapeHtml(status.cardName)}</strong>】有尚未保存的修改！<br><br>直接退出将丢失本次编辑的内容。您希望保存后再退出，还是直接放弃修改退出？`;
    }
    if (saveBtn) saveBtn.style.display = 'inline-flex';
  } else {
    if (title) title.innerHTML = '🚪 退出程序确认';
    if (msg) {
      msg.innerHTML = '确定要关闭并退出游戏王AI制卡器吗？<br><br><span style="color:#8b949e;">退出后将完全关闭客户端并杀死后台服务与桌面进程，释放系统资源。</span>';
    }
    if (saveBtn) saveBtn.style.display = 'none';
  }

  if (modal) modal.style.display = 'flex';
}

function closeExitModal() {
  const modal = document.getElementById('desktopExitModal');
  if (modal) modal.style.display = 'none';
}

async function confirmExitApp(shouldSave) {
  if (shouldSave) {
    saveCurrentCardToLibrary();
  }

  closeExitModal();

  // 1. Electron 桌面客户端环境直接通知主进程
  if (window.electronAPI && typeof window.electronAPI.exitApp === 'function') {
    window.electronAPI.exitApp();
    return;
  }

  // 2. 向后台服务发送终止通知（Node.js / C# AppLauncher）
  try {
    await fetch('/api/shutdown', { method: 'POST', keepalive: true }).catch(() => {});
  } catch (e) {}

  // 3. 尝试关闭当前窗口
  window.close();

  // 4. 若 window.close() 在普通浏览器被安全限制，展示终止页面
  setTimeout(() => {
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#fff;font-family:sans-serif;">
        <div style="font-size:48px;margin-bottom:16px;">🚪</div>
        <h2 style="margin:0;font-size:22px;color:#f0f6fc;">制卡器后台进程已完全终止</h2>
        <p style="color:#8b949e;margin-top:10px;font-size:14px;">所有后台监听服务与系统资源已全部释放，您可以直接关闭此标签页。</p>
      </div>
    `;
  }, 250);
}

window.requestAppExit = requestAppExit;
window.closeExitModal = closeExitModal;
window.confirmExitApp = confirmExitApp;

