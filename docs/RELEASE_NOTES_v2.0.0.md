本地运行的游戏王 DIY 制卡工具：在浏览器里完成卡片编辑与卡面渲染，并导出 YGOPro / MDPro3 可直接使用的 Lua 脚本、卡图、CDB 数据库与 `.ypk` 扩展包。可选接入大模型 API 辅助生成卡片信息与脚本。

> 个人向的制卡辅助工具，非官方产品，功能以本机自用为主。

## 主要功能

- **制卡主流程**：基本信息 → 效果脚本 → 卡图 → 预览导出，支持怪兽 / 魔法 / 陷阱及仪式、融合、同调、超量、连接、灵摆等框型
- **卡面渲染**：属性图标、等级 / 阶级 / LINK 箭头、ATK / DEF、卡片密码、卡名烫金、构图微调
- **效果脚本**：12 个图形化效果模块 + 手写编辑器，组装为符合 YGOPro 规范的 Lua
- **日文 OCG 适配**：上部文本按 OCG 标头生成，卡名与效果文一键振假名注音
- **卡包工程与导出**：`.ypk` 扩展包、CDB、单卡 ZIP；可读取本机 `cards.cdb` 做防重校验
- **AI 辅助（可选）**：OpenAI / Claude / 智谱 GLM / 自定义端点
- **卡牌库**：基于 LocalStorage 的本地卡片管理与 JSON 导入导出
- **多端打包**：Web / Electron 桌面 / Capacitor Android

## 本版本说明

- 代码部分采用 **MIT** 协议开源。
- 仓库已包含**可自由再分发的卡面素材**：卡框 / 属性图标 / LINK 箭头等图片（来自 kooriookami/yugioh-card，MIT）与两款开源字体（霞鹜文楷、思源黑体，SIL OFL 1.1）。克隆后卡面主体即可渲染。
- **未包含**商业字体（方正、Fontworks、华康等）与 Konami 官方工艺素材（罕贵度 / 出框 / 水印等），因版权原因需自行准备，缺失时程序会自动回退。详见 [docs/ASSETS.md](https://github.com/Paper-Yuan/yugioh-ai-card-creator/blob/main/docs/ASSETS.md)。
- 本 Release **仅提供源码**，不含预编译二进制。需要桌面版 / APK 可参照 [README](https://github.com/Paper-Yuan/yugioh-ai-card-creator#readme) 自行构建。

## 快速开始

```bash
npm install
npm run web        # 打开 http://localhost:3000
```

## 已知限制

- 部分商业字体与官方工艺素材需自备，见 `docs/ASSETS.md`
- AI 功能依赖自备的 API Key，生成结果建议人工校对
- 复杂或非标准效果仍需手写 Lua
- 仅为个人 DIY / 学习用途，未做生产级并发与安全加固

## 反馈

欢迎通过 [Issue](https://github.com/Paper-Yuan/yugioh-ai-card-creator/issues) 反馈 Bug、提出建议或补充可自由再分发的素材来源。详见 README 的[反馈与贡献](https://github.com/Paper-Yuan/yugioh-ai-card-creator#反馈与贡献)。

## 致谢

实现过程参考了以下开源项目，感谢原作者：

- [ygopro-scripting-workflow](https://code.moenext.com/nanahira/ygopro-scripting-workflow)（nanahira）— 脚本工作流与规范
- [game-king-card-maker](https://gitee.com/scutlzl/game-king-card-maker)（scutlzl，YGOLD）— 卡面工艺与素材组织
- [kooriookami/yugioh-card](https://github.com/kooriookami/yugioh-card) — 卡框 / 图标等素材与渲染思路

## 免责声明

本项目仅供个人学习与 DIY 制卡使用，与 Konami 及《游戏王》官方无任何关联。项目涉及的《游戏王》卡框、图标、字体等素材版权归各自权利人所有，请勿用于商业用途；使用本工具生成的内容由使用者自行负责。
