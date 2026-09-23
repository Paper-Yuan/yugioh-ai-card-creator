/**
 * 测试动态数值功能
 * 验证 atk_def_change/inflict_damage/gain_lp 模块的动态数值生成
 */

const testCases = [
  {
    name: '场上卡数×500攻击力上升',
    module: 'atk_def_change',
    parameters: {
      stat_type: 'atk',
      valueMode: 'count_times',
      multiplier: 500,
      countLocation: 'LOCATION_MZONE',
      countController: 'tp',
      reset: 'STANDARD'
    },
    expectedLua: [
      'function s.atkval(e,c)',
      'local ct=Duel.GetMatchingGroupCount',
      'return ct*500',
      'e1:SetValue(s.atkval)',
      'e1:SetReset(RESET_EVENT+RESETS_STANDARD)'
    ]
  },
  {
    name: '等级×200伤害',
    module: 'inflict_damage',
    parameters: {
      valueMode: 'level_ref',
      multiplier: 200,
      target_player: '1-tp'
    },
    expectedLua: [
      'function s.damval(e,tp)',
      'return c:GetLevel()*200',
      'local dam=s.damval(e,tp)'
    ]
  },
  {
    name: '墓地怪兽数×300回复',
    module: 'gain_lp',
    parameters: {
      valueMode: 'grave_count',
      multiplier: 300,
      countLocation: 'LOCATION_GRAVE',
      target_player: 'tp'
    },
    expectedLua: [
      'function s.recval(e,tp)',
      'local ct=Duel.GetMatchingGroupCount',
      'return ct*300',
      'local rec=s.recval(e,tp)'
    ]
  },
  {
    name: '回合结束失效的攻击力变化',
    module: 'atk_def_change',
    parameters: {
      stat_type: 'atk',
      valueMode: 'fixed',
      fixedValue: 1000,
      reset: 'TURN_END'
    },
    expectedLua: [
      'e1:SetValue(1000)',
      'e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)'
    ]
  },
  {
    name: '阶段结束失效的效果无效',
    module: 'disable_effect',
    parameters: {
      target_location: 'LOCATION_MZONE',
      scope: 'all',
      targeted: true,
      reset: 'PHASE_END'
    },
    expectedLua: [
      'e1:SetCode(EFFECT_DISABLE)',
      'e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)',
      'e2:SetCode(EFFECT_DISABLE_EFFECT)'
    ]
  }
];

console.log('========================================');
console.log('动态数值和Reset系统测试用例');
console.log('========================================\n');

testCases.forEach((tc, index) => {
  console.log(`测试 ${index + 1}: ${tc.name}`);
  console.log('  模块:', tc.module);
  console.log('  参数:', JSON.stringify(tc.parameters, null, 2));
  console.log('  预期Lua片段:');
  tc.expectedLua.forEach(lua => console.log(`    - ${lua}`));
  console.log('');
});

console.log('========================================');
console.log('测试说明:');
console.log('1. 使用以上参数在UI中创建效果');
console.log('2. 生成Lua脚本');
console.log('3. 验证生成的代码包含预期的Lua片段');
console.log('4. 导入YGOPro测试实际运行效果');
console.log('========================================');
