# yugioh-ai-card-creator（游戏王 AI 制卡器）

一个本地运行的游戏王 DIY 制卡工具：在浏览器里完成卡片编辑与卡面渲染，并导出 YGOPro / MDPro3 可直接使用的 Lua 脚本、卡图、CDB 数据库与 `.ypk` 扩展包。可选接入大模型 API 来辅助生成卡片信息与脚本。

> 本项目是个人向的制卡辅助工具，不是官方产品，也不追求"完整复刻"任何商业制卡软件。功能以本机自用为主，覆盖面有限，可参考下方[已知限制](#已知限制)。
> 使用中遇到问题或有改进想法，欢迎[提 Issue](https://github.com/Paper-Yuan/yugioh-ai-card-creator/issues)（见[反馈与贡献](#反馈与贡献)）。

![Version](https://img.shields.io/badge/version-2.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933)

---

## 功能

### 制卡主流程

四步式编辑：**基本信息 → 效果脚本 → 卡图 → 预览导出**。支持怪兽 / 魔法 / 陷阱三大类，含仪式、融合、同调、超量、连接、灵摆以及复合框型。

### 卡面渲染

对齐 MDPro3 与官方卡面的排版思路，前端 Canvas 渲染：

- 属性图标、等级 / 阶级 / LINK 箭头、ATK / DEF、卡片密码
- 罕贵度工艺（UR / SER / PSER / GR / DT 等）、镭射 / 全息、卡名烫金
- 水印、出框（Overframe）效果
- 卡图构图微调（缩放、位移、画幅模式）

> 卡面还原度取决于所放置的素材，详见 [docs/ASSETS.md](docs/ASSETS.md)。

### 效果脚本

- **图形化向导**：按「时点 → 代价 → 对象 → 效果本体 → 后续处理」逐步配置，内置检索、特召（手卡 / 卡组 / 墓地 / 额外）、破坏、除外、弹手、抽卡、伤害、无效、攻守变化、送墓等动作，可组装为符合 YGOPro 规范的 Lua
- **字段 / 卡类筛选**：检索、特召、回收等效果可限定「字段系列（Setcode）」与「怪兽 / 魔法 / 陷阱」，卡文与 Lua 筛选条件同步生成（`IsSetCard` / `IsType`）
- **条件分支效果**：支持「对方可丢弃 N 张手卡使效果变为双方抽 1 张，否则破坏」这类由对方选择的处理
- **手写**：独立的脚本设计器，含基础 / 怪兽 / 魔法模板、代码统计与语法校验
- 生成脚本按 YGOPro 规范组织（`local s,id,o=GetID()`、`s.initial_effect` 等），并同步生成中文 / 日文卡文

### 日文 OCG 适配

- 上部文本按 OCG 标头格式生成（种族 / 召唤分类 / 能力 / 效果）
- **卡名注音**：一键为日文卡名注入振假名（`[漢字(ルビ)]`）
- **效果文注音**：可开关地为日文效果文本自动加振假名，卡面按官方版式将注音排布在汉字上方（导出 CDB 时会自动剥离注音标记，只保留纯文本）

### 卡包工程与导出

- 多卡组成卡包工程，统一管理字段（Setcode）
- 导出整包 `.ypk`（MDPro3 扩展包）、CDB 数据库、单卡 ZIP
- 单卡 ZIP 结构：

```
card_100000001/
├── script/c100000001.lua
├── images/artwork.png
├── images/100000001_卡名.png
└── 100000001.cdb
```

### 防重校验

可读取本机 YGOPro 的 `cards.cdb`（或手动载入），检查 Passcode 与官方卡是否冲突。

### AI 辅助（可选）

在设置中配置服务方与 API Key，支持 **OpenAI / DeepSeek / 智谱 GLM / Anthropic Claude / 自定义端点**，用于根据自然语言描述生成卡片基本信息与效果。设置里可指定模型名与端点，并用「测试连接」发起真实请求校验配置。

需要填入自己的 API Key（仅保存在本机浏览器）。以下两点请注意：

- 请求经本地服务端转发，因此**纯静态部署或手机 APK 下不可用**。
- 本项目**不包含 AI 生图**，卡图需自行上传。

「AI 推荐效果」目前是按卡片类型从内置效果模块中筛选，**未接入 AI 生成**。

### 卡牌库

基于浏览器 LocalStorage 的本地卡片管理：搜索、按类型 / 字段筛选、排序、详情查看、JSON 批量导入导出。

---

## 快速开始

### 环境要求

- Node.js ≥ 18
- 卡面素材已随仓库提供（卡框图片 + 开源字体）；部分商业字体与官方工艺素材需自行准备，见 [docs/ASSETS.md](docs/ASSETS.md)。

### Web 版

```bash
npm install
npm run web
```

打开 http://localhost:3000

### 桌面版（Electron）

```bash
npm install
npm run build
npm run package:win     # 产物在 release/
```

### Android 版（Capacitor）

```bash
npm run build:mobile
npx cap sync android
npx cap open android
```

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run web` | 启动 Web 服务（开发） |
| `npm run web:dev` | 启动并监听文件变化 |
| `npm run build` | TypeScript 编译 + 复制前端资源到 `dist/` |
| `npm run package:win` | 打包 Windows 桌面应用 |
| `npm run build:mobile` | 构建移动端资源 |

---

## 技术栈

- **后端**：TypeScript + Express + Node.js
- **卡面渲染**：浏览器 Canvas（前端）/ `@napi-rs/canvas`（服务端）
- **脚本组装**：Handlebars 模板
- **数据库**：`sql.js`（读写 CDB）
- **打包**：archiver / jszip
- **桌面 / 移动**：Electron、Capacitor（Android）

## 项目结构

```
yugioh-ai-card-creator/
├── src/
│   ├── web/
│   │   ├── server.ts              # Express 服务与 API
│   │   └── public/
│   │       ├── index.html
│   │       ├── css/main.css
│   │       ├── js/                # 前端逻辑（app / card-renderer / library ...）
│   │       └── assets/yugioh/     # 卡面素材（图片 MIT + OFL 字体，见 docs/ASSETS.md）
│   ├── script-modules/            # 效果模块库与 Lua 组装引擎
│   ├── image-generator.ts         # 服务端卡面渲染
│   ├── cdb-manager.ts             # CDB 读写
│   ├── ai-generator.ts            # AI 生成
│   └── desktop/                   # C# 启动器 / 安装向导
├── electron/                      # Electron 主进程
├── scripts/                       # 资源下载 / 提取 / 打包脚本
│   ├── mine-rule-texts.js         # 扫描 YGOPro 全量卡脚本，统计效果外文本机制
│   └── split-corpus-by-type.js    # 依 cards.cdb 将卡脚本切分为怪兽/魔法/陷阱
└── docs/
    ├── RULE_TEXTS.md              # 效果外文本支持范围与语料库统计依据
    ├── EFFECT_CAPABILITY_CATALOG.md  # 效果能力全集与参数规范（基于全量语料库）
    └── effect-reports/            # 怪兽/魔法/陷阱三份原始分析报告
```

---

## 已知限制

- **部分素材需自行准备**。卡框 / 图标 / LINK 箭头等图片（MIT）与两款开源字体（OFL）已随仓库提供，克隆后卡面主体即可渲染；商业字体和罕贵度 / 出框 / 水印等 Konami 官方工艺素材因版权原因未入库，需按 [docs/ASSETS.md](docs/ASSETS.md) 自备（缺失时会自动回退，不影响运行）。
- **AI 功能依赖你自备的 API Key**，生成质量与稳定性取决于所选模型与网络，建议生成后人工校对。
- 脚本组装覆盖常见效果，**复杂或非标准效果仍需手写 Lua**。
- 仅为个人 DIY / 学习用途，未做生产级并发与安全加固。
- 移动端为横屏适配，功能与桌面端基本一致但交互有简化。

---

## 反馈与贡献

这个项目由个人维护，能力和精力都有限，很多细节未必考虑周全。非常欢迎你通过 [Issue](https://github.com/Paper-Yuan/yugioh-ai-card-creator/issues) 反馈问题或提出建议，例如：

- **Bug 反馈**：报错、卡面渲染异常、脚本生成错误、导出文件无法被 MDPro3 / YGOPro 识别等
- **功能建议**：希望新增的效果模块、卡面工艺、导出格式，或对现有交互的改进
- **使用问题**：安装、素材准备、打包过程中遇到的困难
- **素材补充**：其他可自由再分发的卡面素材来源（请附授权说明）

为了更快定位，反馈 Bug 时建议附上：你的操作步骤、操作系统与浏览器 / Node 版本、控制台报错或截图。

如果这个项目对你有帮助，也欢迎点个 Star。Pull Request 同样欢迎。

---

## 致谢

本项目的实现参考了以下三个开源项目，特此感谢原作者：

1. **[ygopro-scripting-workflow](https://code.moenext.com/nanahira/ygopro-scripting-workflow)** — 作者 nanahira
   参考了 YGOPro 脚本的编写工作流与脚本规范，效果模块与 Lua 模板的组织方式受其启发。

2. **[game-king-card-maker](https://gitee.com/scutlzl/game-king-card-maker)** — 作者 scutlzl（YGOLD 制卡器的发布页）
   参考了卡面工艺（罕贵度、镭射、出框、水印等）与素材的组织方式；罕贵度 / 出框 / 水印等素材可从该页下载的 YGOLD 工具中获取。

3. **[kooriookami/yugioh-card](https://github.com/kooriookami/yugioh-card)** — 作者 kooriookami
   参考了卡框、属性图标、LINK 箭头等素材与卡面渲染的实现思路；`scripts/download-assets.js` 从该项目拉取可公开获取的素材。

此外使用了 [思源黑体 Source Han Sans（OFL）](https://github.com/adobe-fonts/source-han-sans) 作为随仓库分发的开源字体。

---

## 免责声明

本项目仅供个人学习与 DIY 制卡使用，与 Konami、《游戏王》官方及任何制卡软件官方均无关联，也未获其授权或赞助。项目涉及的《游戏王》卡框、图标、字体等素材，版权归各自权利人所有。

**关于 Release 中提供的安装包：**

- 为保证可公开再分发，Release 内的安装包已**移除全部第三方商业字体**（方正、Fontworks、华康、ITC 等）。缺失时程序会自动回退到开源字体思源黑体（SIL OFL 1.1），字形略有差异但功能完整。
- 安装包内仍包含的卡面素材（卡框、属性图标、LINK 箭头等）来自 [kooriookami/yugioh-card](https://github.com/kooriookami/yugioh-card)（MIT），以及 YGOLD 制卡器衍生的工艺素材（其发布方为 MulanPSL-2.0）。若你是相关权利人并认为此处使用不当，请通过 Issue 联系，我们会立即移除。
- **请勿将本工具及其素材用于商业用途**，也不要自行再分发其中的第三方素材。使用本工具生成的内容由使用者自行负责。

## 开源协议

本项目**自身代码**采用 [MIT](LICENSE) 协议开源。第三方素材与字体不适用该协议，其权利归各自所有者，详见 [docs/ASSETS.md](docs/ASSETS.md)。
