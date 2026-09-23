// AI Generation System Analysis Script
// This script analyzes the AI generation capabilities

const EFFECT_MODULES = [
  'special_summon_from_hand',
  'special_summon_from_grave',
  'search_deck',
  'add_from_deck_to_hand',
  'destroy_card',
  'draw_card',
  'inflict_damage',
  'gain_lp',
  'negate_effect',
  'banish_card',
  'atk_def_change',
  'send_to_grave'
];

const TEST_SCENARIOS = {
  complex_effects: [
    {
      description: "召唤并检索",
      expected_modules: ['special_summon_from_hand', 'search_deck'],
      complexity: "medium",
      notes: "需要理解多步骤效果链"
    },
    {
      description: "破坏后特殊召唤",
      expected_modules: ['destroy_card', 'special_summon_from_grave'],
      complexity: "medium",
      notes: "需要理解效果的触发顺序"
    },
    {
      description: "无效并破坏",
      expected_modules: ['negate_effect'],
      complexity: "high",
      notes: "需要理解negate_effect模块的destroy_after参数"
    }
  ],
  
  multi_condition_effects: [
    {
      description: "场上没有怪兽时从手卡特召，特召成功时检索",
      expected_modules: ['special_summon_from_hand', 'search_deck'],
      conditions: ["no_monsters", "EVENT_SPSUMMON_SUCCESS"],
      complexity: "high",
      notes: "需要理解条件触发和效果链"
    },
    {
      description: "每回合一次，以场上1只怪兽为对象发动。那只怪兽的攻击力上升500",
      expected_modules: ['atk_def_change'],
      conditions: ["once_per_turn", "target_required"],
      complexity: "medium",
      notes: "需要正确设置once_per_turn和target参数"
    }
  ],
  
  ambiguous_descriptions: [
    {
      description: "从卡组加入手卡",
      possible_modules: ['search_deck', 'add_from_deck_to_hand'],
      ambiguity: "两个模块功能相似，AI需要理解细微差别",
      notes: "search_deck需要选择，add_from_deck_to_hand可能指定卡名"
    },
    {
      description: "去除对方的怪兽",
      possible_modules: ['destroy_card', 'banish_card', 'send_to_grave'],
      ambiguity: "三种不同的去除方式",
      notes: "需要根据上下文判断是破坏、除外还是送墓"
    },
    {
      description: "回复生命值",
      possible_modules: ['gain_lp'],
      ambiguity: "描述不完整，缺少数值",
      notes: "AI需要推断合理的默认值"
    }
  ],
  
  edge_cases: [
    {
      description: "这张卡不能通常召唤",
      expected_modules: [],
      complexity: "low",
      notes: "这是召唤限制，不是效果模块，AI应该识别并跳过"
    },
    {
      description: "抽2张卡，然后舍弃1张手卡",
      expected_modules: ['draw_card'],
      complexity: "high",
      notes: "抽卡+cost，当前模块库可能无法完整表达cost部分"
    },
    {
      description: "以对方场上全部怪兽为对象发动",
      expected_modules: ['destroy_card'],
      complexity: "high",
      notes: "需要正确设置count参数为动态值，模块可能不支持"
    }
  ]
};

const MODULE_CONFUSION_MATRIX = {
  "special_summon vs search": {
    similarity: 0.3,
    confusion_risk: "medium",
    differentiation: "召唤是从某处特召怪兽，检索是加入手牌"
  },
  "destroy vs banish vs send_to_grave": {
    similarity: 0.7,
    confusion_risk: "high",
    differentiation: "破坏(destroy)、除外(banish)、送墓(send)是三种不同的去除方式，效果完全不同"
  },
  "search_deck vs add_from_deck_to_hand": {
    similarity: 0.9,
    confusion_risk: "very high",
    differentiation: "search允许选择，add可能指定卡名，功能重叠度高"
  },
  "inflict_damage vs gain_lp": {
    similarity: 0.4,
    confusion_risk: "low",
    differentiation: "伤害和回复是相反的效果，容易区分"
  }
};

console.log("AI Generation System Analysis");
console.log("===============================\n");

console.log("1. 效果模块库 (12个模块)");
console.log("---------------------------");
EFFECT_MODULES.forEach((mod, idx) => {
  console.log(`${idx + 1}. ${mod}`);
});

console.log("\n2. 测试场景分析");
console.log("---------------------------");
console.log(`复杂效果场景: ${TEST_SCENARIOS.complex_effects.length}`);
console.log(`多条件效果场景: ${TEST_SCENARIOS.multi_condition_effects.length}`);
console.log(`模糊描述场景: ${TEST_SCENARIOS.ambiguous_descriptions.length}`);
console.log(`边界情况: ${TEST_SCENARIOS.edge_cases.length}`);

console.log("\n3. 易混淆模块对");
console.log("---------------------------");
Object.entries(MODULE_CONFUSION_MATRIX).forEach(([pair, info]) => {
  console.log(`${pair}:`);
  console.log(`  相似度: ${info.similarity}`);
  console.log(`  混淆风险: ${info.confusion_risk}`);
  console.log(`  区分点: ${info.differentiation}`);
});

console.log("\n分析完成!");
