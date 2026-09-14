# 卡面素材与授权说明

本仓库**只包含可自由再分发的卡面素材**（约 79 MB），克隆后卡面主体即可正常渲染。
出于版权原因，少部分**商业字体**与 **Konami 官方工艺素材**未入库，需自行准备；缺失时程序会自动回退，不会崩溃。

## 已随仓库提供（可直接使用）

### 卡框 / 图标 / 箭头等图片

来源：[kooriookami/yugioh-card](https://github.com/kooriookami/yugioh-card)（**MIT 许可**）。

`src/web/public/assets/yugioh/image/` 根目录下 55 个文件：普通 / 效果 / 仪式 / 融合 / 同调 / 超量 / 连接 /
灵摆卡框、属性图标、LINK 箭头、等级 / 阶级、魔法陷阱类型图标、`laser1/2` 等。

### 开源字体

| 字体 | 用途 | 许可 |
| --- | --- | --- |
| Source Han Sans SC 思源黑体（Bold / Medium） | 卡名、效果文、标头、ATK/DEF、等级、密码等数字 | SIL OFL 1.1 |

许可证随文件放在 `font/` 目录下（`LICENSE-SourceHanSans.txt`）。

> 公开克隆缺少原作字体时，全部卡面字族都会回退到思源黑体。若你本机安装了方正楷体、
> Fontworks FOT-Rodin 等原作字体，程序会通过 `local()` 与 canvas 回退链优先使用，以获得更贴近官方卡面的字形。
>
> 说明：早期版本曾使用霞鹜文楷（LXGW WenKai）作为回退字体，但其随仓库分发的文件已损坏
> （GPOS 表偏移越界，部分渲染器下会输出空白），现已移除并统一改用思源黑体。

### 卡片数据 JSON

`official-cardnames.json`、`official-passcodes.json`、`official-archetypes.json`、`ja-card-names.json`
由 `scripts/extract-ygopro-resources.js` 从本机 YGOPro 的 `cards.cdb` / `strings.conf` 提取，已随仓库提供。

## 未随仓库提供（需自行准备）

### 1. 商业字体（版权归各字体厂商，不可再分发）

| 文件 | 版权方 |
| --- | --- |
| `RenderFontChineseSimplified.ttf` | 方正 FZBeiWeiKaiShu-S19S（Founder ©2002） |
| `FZZYJW.ttf` | 方正 FZZongYi-M05S（Founder ©2002） |
| `FOT-Rodin Pro.ttf`、`Yu-Gi-Oh! FOT-Rodin ProN DB.ttf` | Fontworks Japan ©2002 |
| `YGOLDDFLeisho3.ttf`、`YGOLDDFGLeisho4.ttf` | 华康 DynaLab ©1997 |
| `Yu-Gi-Oh-ITC-Stone-Serif-M.ttf` | ITC / Monotype |
| `AtkDef.ttf`、`ygo-cardkey.ttf`、`ygo-matrix.ttf` | 官方 / 第三方字体 |

这些字体受版权保护，**请自行取得授权后**放入 `font/` 目录；未放置时卡面会使用上面的 OFL 字体替代，字形会有差异但可正常显示。

### 2. YGOLD 制卡器衍生素材

`image/` 下的 `rare/`（罕贵度）、`holo/`（镭射）、`overframe/`（出框）、`watermark/`（水印）、
`frame/`（三幻神、Zack 等特殊框）以及根目录的 `card-obelisk.png` 等，来自 **YGOLD 制卡器**。

- YGOLD 发布页：https://gitee.com/scutlzl/game-king-card-maker （MulanPSL-2.0）

> 说明：MulanPSL-2.0 只覆盖 YGOLD 作者拥有版权的内容；其打包的第三方商业字体与
> Konami 角色 / 防伪素材并不在该许可范围内，故本项目不再分发这些素材。
> 请遵守 YGOLD 自身的授权条款，并自行确认其中素材的可分发性。

放入时保持**固定文件名**不变即可，渲染代码按文件名加载。

## 素材版权提示

《游戏王》卡框、卡图、图标、防伪水印等版权归 **Konami** 所有；各商业字体版权归对应厂商所有。
请仅用于个人学习与 DIY 制卡，**不要**公开再分发这些素材，也不要用于商业用途。
