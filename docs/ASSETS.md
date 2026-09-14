# 卡面素材说明

仓库**不包含**卡面素材（`src/web/public/assets/yugioh/image/` 与 `.../font/`，合计约 205 MB）。
原因有两点：体积过大；且其中的卡框、图标、字体等版权归 Konami 及各字体厂商所有，不宜再分发。

新克隆仓库后需要自行准备素材，否则卡面渲染会缺少背景 / 边框 / 特殊工艺（字体缺失时程序会自动回退到系统字体，不会崩溃）。

## 目录约定

素材放在 `src/web/public/assets/yugioh/` 下：

```
assets/yugioh/
├── image/
│   ├── card-*.png, attribute-*.png, arrow-*.png,
│   │   level.png, rank.png, atk-*.svg, icon-*.png, laser1.png, laser2.png
│   ├── frame/        # 特殊卡框（三幻神、Zack 灵摆等）
│   ├── overframe/    # 出框（Overframe）工艺
│   ├── rare/         # 罕贵度工艺叠层
│   ├── holo/         # 镭射 / 全息
│   └── watermark/    # 水印
├── font/
│   ├── AtkDef.ttf, ygo-cardkey.ttf, RenderFontChineseSimplified.ttf,
│   ├── FOT-Rodin Pro.ttf, YGOLDDFLeisho3.ttf, YGOLDDFGLeisho4.ttf,
│   ├── LXGWWenKai-*.ttf, SourceHanSansSC-*.otf
│   └── ...
├── official-cardnames.json      # 官方卡名（防重 / 校验用，已随仓库提供）
├── official-passcodes.json      # 官方 Passcode（已随仓库提供）
├── official-archetypes.json     # 官方系列字段（已随仓库提供）
└── ja-card-names.json           # 日文卡名（已随仓库提供）
```

> `official-*.json` 与 `ja-card-names.json` 由 `scripts/extract-ygopro-resources.js`
> 从本机 YGOPro 的 `cards.cdb` / `strings.conf` 提取，**已包含在仓库中**，无需自行生成。

## 可自动获取的部分

```bash
node scripts/download-assets.js
```

该脚本从开源项目 [kooriookami/yugioh-card](https://github.com/kooriookami/yugioh-card)
拉取其公开的卡框 / 属性图标 / LINK 箭头 / 基础字体等素材（`image/` 根目录的扁平文件与 `font/` 下的 woff2）。

## 无法自动获取的部分

以下素材来自 **YGOLD 制卡器**（第三方工具，未开源），本项目仅参考其素材组织方式，需要你**自行准备**：

- `image/rare/`、`image/holo/`、`image/overframe/`、`image/watermark/`、`image/frame/` 各子目录
- 部分 TTF 字体（`RenderFontChineseSimplified.ttf`、`AtkDef.ttf`、`FOT-Rodin Pro.ttf`、`YGOLDDFLeisho*.ttf` 等）

YGOLD 制卡器可从其发布页下载：

- https://gitee.com/scutlzl/game-king-card-maker

从其中取得所需素材后，按上表的目录与文件名放入对应位置即可；渲染代码按**固定文件名**加载，替换时保持文件名一致。请遵守该工具自身的授权与使用条款。

## 相关参考项目

- YGOPro 脚本编写工作流：https://code.moenext.com/nanahira/ygopro-scripting-workflow
- 卡面素材与渲染参考：https://github.com/kooriookami/yugioh-card

## 开源字体

以下字体以 SIL Open Font License (OFL) 授权，可自由获取：

- **霞鹜文楷（LXGW WenKai）**：https://github.com/lxgw/LxgwWenKai
- **思源黑体（Source Han Sans）**：https://github.com/adobe-fonts/source-han-sans

## 版权提示

《游戏王》卡框、卡图、图标等素材版权归 Konami 所有，官方卡面字体及各 TTF 字体版权归各自厂商所有。
请仅用于个人学习与 DIY 制卡，**不要**在公开仓库中再分发这些素材，也不要用于商业用途。
