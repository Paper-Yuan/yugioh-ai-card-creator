# 现有制卡器「效果设计器」已支持的能力（用于比对覆盖情况）

本项目是 E:\Workbox\Web\yugioh-ai-card-creator（游戏王 DIY 制卡器，前端向导生成 YGOPro Lua）。

## 效果性质 effectType
continuous / procedure / trigger / quick / ignition

## 起效场合 timing（节选）
ignition_omit, ignition_explicit, ignition_no_monsters, ignition_oppo_more_cards,
ignition_oppo_monsters_count, summon_both, summon_ns, summon_ss, summon_fusion,
summon_ritual, summon_synchro, summon_xyz, summon_link, summon_with_mat,
to_grave_general, to_grave_from_field_summoned, destroyed_battle_or_effect,
destroyed_by_oppo, banished_self, field_card_destroyed, field_card_banished,
battle_destroy_oppo, quick_free, quick_oppo_turn, quick_oppo_main, quick_chain,
continuous_faceup, continuous_summoned_faceup, spell_trap_act, spell_trap_continuous

## 发动代价 cost
pay_lp, discard_self, release_self, detach_xyz, discard_one, discard_n,
banish_one_gy, banish_gy_n, banish_hand_n, release_monster_n,
send_to_grave_n, mill_deck_n
（数量与「字段/卡类」均可自定义）

## 效果本体 action
- 检索/调度类：search_deck, dump_deck, salvage_extra
- 特殊召唤类：special_summon_self, special_summon_hand, special_summon_deck, revive_grave
- 除去类：destroy_target, banish_target, to_hand_target, destroy_self_all,
  wipe_oppo_monsters, wipe_oppo_spells, wipe_oppo_all
- 数值类：draw_cards, burn_damage, gain_lp
- 反制类：negate_and_destroy, negate_activation, negate_punish
- 常驻类：immune_all, atk_boost
- 二选一：choice_search_or_dump, choice_ss_or_search, choice_destroy_or_banish,
  choice_draw_or_burn, choice_free（自由组合两个分支）

## 效果外文本 ruleTexts（可生成脚本）
alias(ADD_CODE), ssOncePerTurn, cannotNormalSummon(EnableReviveLimit),
cannotSpecialSummon, cannotMSet, cannotTrigger, materialRestriction,
cannotBeReleased, cannotChangePosition, cannotAttack, cannotBeAttacked,
canDirectAttack, addMonsterType, ruleAttribute, ruleRace, ruleLevel,
procSummonType(fusion/synchro/xyz/link/ritual), customRule(仅卡面不入脚本)

## 其他
- 灵摆效果独立设计器（摆区效果）
- 频次限制：HOPT / SOPT / 决斗一次
- 字段/卡类筛选（官方 595 字段库 + 自定义 Setcode）

## 明确未支持（需重点统计）
上面未列出的任何机制都属于待补充能力。
