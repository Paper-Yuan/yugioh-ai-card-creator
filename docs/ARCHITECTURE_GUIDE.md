# 🎮 游戏王 AI 制卡器 v2.3.0 - 功能总览与架构说明

**项目类型：** 本地运行的游戏王 DIY 制卡工具  
**最新版本：** v2.3.0（2026-09-24）  
**核心能力：** 浏览器编辑 + 30 个效果模块，产出 YGOPro / MDPro3 可用的 Lua、CDB 与 .ypk 扩展包

---

## 📚 完整文档索引

### 核心文档
1. **[完整功能说明](./COMPLETE_FEATURES.md)** - 25,000 字详尽文档
   - 涵盖 30 个效果模块完整说明
   - 4 步制卡流程详细教程
   - 多平台部署指南

2. **[用户指南](./USER_GUIDE.md)** - 快速上手教程

3. **[项目概述](./PROJECT_SUMMARY.md)** - 项目背景与目标

### 技术文档
4. **[当前实现效果报告](./CURRENT_IMPLEMENTED_EFFECTS.md)** - 30 个模块详细分析

5. **[v2.3.0 优化报告](./v2.3.0-optimization-report.md)** - 最新版本优化详情

6. **[打包说明](./PACKAGING.md)** - Windows/Android 打包指南

### 可视化架构图
7. **[架构图网页](E:\Workbox\_archify\out\yugioh-card-creator.html)** - 可交互的 SVG 架构图
   - 自包含 HTML 文件（794 KB）
   - 支持暗/亮主题切换（快捷键 `T`）
   - 支持搜索功能（快捷键 `/`）
   - 支持导出 SVG/PNG（快捷键 `E`）
   - 无需服务器，双击即可在浏览器中打开

---

## 🎯 核心功能一览

### 1. 30 个效果模块系统

**Phase 8 最新更新：**
- ✨ **Cost 代价机制**（3 个）：discard_cost / pay_lp_cost / tribute_cost
- ✨ **召唤程序**（4 个）：fusion_summon / contact_fusion / synchro_summon / xyz_summon
- ✨ **连锁与时点**（2 个）：chain_link_check / timing_miss_check

**覆盖率统计：**
- 模块数量：30 个
- 覆盖率：75-80%
- 覆盖卡片：约 10,300 张
- Phase 8 新增：约 5,300 张

---

### 2. 效果向导 UI（v2.3.0 新增）

**模块化效果设计：**
- 支持多效果组合（最多 4 个效果）
- 每个效果独立配置参数
- 自动生成标准 Lua 脚本

**✨ 一键整合规则文本：**
- 按 OCG 官方规范顺序自动排序
- 支持中日双语
- 自动去重和矛盾检测

**效果性质类型：**
1. 👑 永续效果 (Continuous)
2. 🚀 特召手续 (Procedure)
3. ⚡ 诱发效果 (Trigger)
4. 🛡️ 二速/快速效果 (Quick)
5. 🌟 起动效果 (Ignition)

---

### 3. 卡面渲染引擎

**支持的卡框类型（18 种）：**
- **怪兽卡**（9 种）：通常/效果/融合/同调/超量/灵摆/连接/仪式/Token
- **魔法卡**（6 种）：通常/速攻/装备/场地/永续/仪式
- **陷阱卡**（3 种）：通常/反击/永续

**渲染清晰度（4 档）：**
- 预览模式：407×593 像素
- 标准清晰度：813×1185 像素（默认）
- 高清模式：1626×2370 像素（2K）
- 超高清模式：3252×4740 像素（4K）

**字体系统（18 个字体文件）：**
- 商业字体（Personal 版）：游戏王官方字体
- 开源字体（Public 版）：思源黑体系列
- Web 字体：攻守图标、连接箭头等

---

### 4. 多平台支持

**Windows 桌面版：**
- 一键启动（游戏王AI制卡器.exe）
- 文件大小：169 MB
- 系统要求：Windows 10/11 x64

**Android 移动版：**
- 触控优化界面
- 文件大小：182 MB
- 系统要求：Android 7.0+
- 符合 WCAG 2.1 AA 无障碍标准

**Web 浏览器版：**
- 支持 Chrome/Edge/Firefox/Safari
- 启动方式：`npm start`
- 访问地址：http://localhost:3000

---

## 🏗️ 架构设计

### 组件层次结构

```
┌─────────────────────────────────────────────────────────────────┐
│                      浏览器编辑器 (Browser UI)                      │
│                Canvas 卡面 + 四步流程 + 效果向导                      │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                   Express 服务端 (Node.js)                        │
│                     REST API + WebSocket                         │
└──┬────────┬──────┬────────┬─────────┬──────────┬───────────────┘
   │        │      │        │         │          │
   ▼        ▼      ▼        ▼         ▼          ▼
┌────┐  ┌─────┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌─────────┐
│ AI │  │脚本 │ │效果  │ │卡面  │ │CDB    │ │输出     │
│生成│  │装配 │ │模块  │ │渲染  │ │管理   │ │打包     │
│器  │  │器   │ │库    │ │器    │ │器     │ │         │
└────┘  └─────┘ └──────┘ └──────┘ └────────┘ └─────────┘
   │                                              │
   ▼                                              ▼
┌────────────────┐                      ┌─────────────────┐
│ LLM 提供商      │                      │ YGOPro 卡包      │
│ (可选外部依赖)  │                      │ .ypk / ZIP       │
└────────────────┘                      └─────────────────┘
```

---

## 📦 产物与流程

### 四步制卡流程

**步骤 1：基本信息**
- 卡片 ID / 名称 / 类型
- 怪兽属性（种族/属性/等级/攻守）
- 字段/系列（自动匹配 Setcode）

**步骤 2：效果设计**
- 效果外文本（规则条款）
- 效果模块选择（30 个模块）
- 参数配置（筛选/数值/限制）
- 一键整合规则文本 🆕

**步骤 3：卡图上传**
- 支持格式：JPG/PNG/WebP/GIF
- 推荐尺寸：421×614 像素
- 自动裁剪居中

**步骤 4：生成与导出**
- 实时预览（卡面/脚本/效果文本）
- 导出选项（卡片图片/脚本文件/完整卡包）
- 保存到卡牌库

---

### 产出文件结构

**单卡 ZIP：**
```
📦 青眼白龙.zip
├── script/
│   └── c89631139.lua        # Lua 脚本
├── images/
│   └── 89631139.jpg         # 卡图
└── 89631139.cdb             # CDB 数据库
```

**YGOPro 卡包（.ypk）：**
```
📦 青眼卡包.ypk
├── expansions/
│   ├── pics/
│   │   ├── 10000001.jpg
│   │   ├── 10000002.jpg
│   │   └── thumbnail/
│   │       ├── 10000001.jpg
│   │       └── 10000002.jpg
│   ├── script/
│   │   ├── c10000001.lua
│   │   └── c10000002.lua
│   └── 青眼卡包.cdb
└── README.txt
```

---

## 🎨 效果模块完整列表

| 序号 | 模块 ID | 中文名称 | 分类 | Phase | 覆盖卡片数 |
|------|---------|---------|------|-------|----------|
| 1 | special_summon_from_hand | 从手卡特殊召唤 | SUMMON | 基础 | ~800 |
| 2 | special_summon_from_grave | 从墓地特殊召唤 | SUMMON | 基础 | ~1,200 |
| 3 | token_summon | 衍生物生成 | SUMMON | Phase 1 | ~450 |
| 4 | attach_xyz_material | 叠放超量素材 | SUMMON | Phase 1 | ~350 |
| 5 | **fusion_summon** | **融合召唤** | SUMMON | **Phase 8** | **~600** |
| 6 | **contact_fusion** | **接触融合** | SUMMON | **Phase 8** | **~400** |
| 7 | **synchro_summon** | **同调召唤** | SUMMON | **Phase 8** | **~700** |
| 8 | **xyz_summon** | **超量召唤** | SUMMON | **Phase 8** | **~500** |
| 9 | search_deck | 从卡组检索 | SEARCH | 基础 | ~2,000 |
| 10 | salvage_grave | 从墓地回收 | SEARCH | 基础 | ~800 |
| 11 | destroy_target | 破坏对象 | DESTROY | 基础 | ~1,500 |
| 12 | draw_cards | 抽卡 | DRAW | 基础 | ~600 |
| 13 | inflict_damage | 效果伤害 | DAMAGE | 基础 | ~800 |
| 14 | burn_lp | LP 损失 | DAMAGE | 基础 | ~400 |
| 15 | negate_activation | 无效发动 | NEGATE | 基础 | ~700 |
| 16 | negate_effect | 无效效果 | NEGATE | 基础 | ~500 |
| 17 | banish_target | 除外对象 | BANISH | 基础 | ~800 |
| 18 | atk_def_change | 攻守变化 | STAT_CHANGE | 基础 | ~1,200 |
| 19 | to_deck | 返回卡组 | EFFECT | Phase 1 | ~700 |
| 20 | change_position | 变更表示形式 | EFFECT | 基础 | ~300 |
| 21 | equip_card | 装备卡 | EFFECT | 基础 | ~400 |
| 22 | **discard_cost** | **丢弃手卡代价** | EFFECT | **Phase 8** | **~800** |
| 23 | **pay_lp_cost** | **支付生命值代价** | EFFECT | **Phase 8** | **~800** |
| 24 | **tribute_cost** | **解放怪兽代价** | EFFECT | **Phase 8** | **~800** |
| 25 | **chain_link_check** | **连锁位置判定** | EFFECT | **Phase 8** | **~500** |
| 26 | **timing_miss_check** | **时点检测** | EFFECT | **Phase 8** | **~500** |
| 27 | excavate | 确认并选择 | EFFECT | Phase 5 | ~350 |
| 28 | counter | 指示物操作 | EFFECT | Phase 5 | ~300 |
| 29 | equipment | 装备操作 | EFFECT | Phase 5 | ~350 |
| 30 | dump_deck | 从卡组堆墓 | EFFECT | 基础 | ~600 |

**总覆盖：** 约 10,300 张卡片  
**Phase 8 新增：** 约 5,300 张卡片  
**覆盖率：** 75-80%（OCG 全卡池）

---

## 🚀 快速启动

### Windows 桌面版
```bash
# 方式 1：直接启动 EXE
双击：游戏王AI制卡器.exe

# 方式 2：源码启动
npm install
npm run package:win
```

### Android 移动版
```bash
# 编译 APK
npm run build:mobile
npm run cap:sync
npm run cap:build
```

### Web 浏览器版
```bash
# 安装依赖
npm install

# 启动服务
npm start

# 访问地址
http://localhost:3000
```

---

## 📊 性能优化

### 内存优化
- **CDB 对象池复用**：节省 60-140MB 内存
- **SQL.js 单例模式**：避免重复实例化
- **Canvas 及时释放**：防止内存泄漏

### 渲染优化
- **离屏 Canvas 预渲染**：提升渲染速度
- **图片缓存机制**：减少重复渲染
- **WebP 格式支持**：减小文件体积
- **多级清晰度选择**：平衡质量与性能

### 加载优化
- **字体按需加载**：减少初始加载时间
- **代码分割**：优化首屏加载
- **Service Worker 缓存**：支持离线使用

---

## 📄 许可协议

### 代码许可
本项目代码采用 **MIT 许可协议** 开源。

### 字体许可

**开源字体（Public 版）：**
- 思源黑体：SIL Open Font License 1.1
- 可用于商业用途

**商业字体（Personal 版）：**
- 游戏王官方字体：仅限个人非商业使用
- 不可公开分发或商业使用

### 免责声明
本工具仅供学习研究使用，不得用于任何商业用途。  
游戏王及相关商标归 KONAMI 所有。

---

## 📞 技术支持

### 问题反馈
- GitHub Issues：https://github.com/your-repo/issues
- 邮件支持：support@example.com

### 相关链接
- 项目主页：https://github.com/your-repo
- 在线文档：https://docs.example.com
- 架构图：[yugioh-card-creator.html](E:\Workbox\_archify\out\yugioh-card-creator.html)

---

## 📈 版本历史

### v2.3.0（2026-09-24）- 最新版本
- ✨ Phase 8 新增 9 个 P0 高优先级效果模块
- ✨ 一键整合规则文本功能
- ✨ EXE 一键启动支持
- ✨ 移动端体验优化（WCAG 2.1 AA）
- ✨ 完善字体管理（18 个字体文件）

### v2.2.0（2026-09-23）
- 清理重复模块定义
- 内存优化（CDB 对象池、SQL.js 单例）
- Electron 最小化到托盘

### v2.1.0（2026-09-23）
- Phase 5 P1 模块（excavate/counter/equipment）
- Phase 2 动态值扩展（16 种模式）
- 双平台打包（Windows + Android）

### v2.0.0（2026-09-14）
- Phase 1A：效果选择器 UI
- Phase 1B：P0 模块实现
- 覆盖约 1,919 张卡

---

**文档生成时间：** 2026-09-24  
**文档维护者：** 游戏王 AI 制卡器开发团队  
**文档版本：** v2.3.0
