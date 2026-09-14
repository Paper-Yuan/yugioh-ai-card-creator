/**
 * 从 kooriookami/yugioh-card (MIT) 补充拉取可选卡面素材。
 *
 * 注意：项目已随仓库提供卡面主体所需的卡框 / 图标 / 箭头与开源字体，通常无需运行本脚本。
 * 本脚本用于补齐上游仓库中更多的变体素材（如 astral 灵摆、各语言属性图标等）。
 * 商业字体与 YGOLD 衍生的官方工艺素材不在本脚本范围内，也无法自动获取，
 * 详见 docs/ASSETS.md。
 */
import fs from 'fs';
import path from 'path';

const BASE = 'https://raw.githubusercontent.com/kooriookami/yugioh-card/master/src/assets/yugioh-card/yugioh/';
const BASE_URL_IMG = BASE + 'image/';
const BASE_URL_FONT = BASE + 'font/';

const DEST_IMG = 'src/web/public/assets/yugioh/image';
const DEST_FONT = 'src/web/public/assets/yugioh/font';

fs.mkdirSync(DEST_IMG, { recursive: true });
fs.mkdirSync(DEST_FONT, { recursive: true });

const IMAGES = [
  // 卡框
  'card-normal.png', 'card-effect.png', 'card-ritual.png', 'card-fusion.png',
  'card-synchro.png', 'card-xyz.png', 'card-link.png', 'card-mask.png',
  'card-spell.png', 'card-trap.png', 'card-token.png',
  'card-normal-pendulum.png', 'card-effect-pendulum.png', 'card-ritual-pendulum.png',
  'card-fusion-pendulum.png', 'card-synchro-pendulum.png', 'card-xyz-pendulum.png',
  'card-mask-pendulum.png',
  // 属性
  'attribute-dark.png', 'attribute-light.png', 'attribute-earth.png', 'attribute-water.png',
  'attribute-fire.png', 'attribute-wind.png', 'attribute-divine.png',
  'attribute-spell.png', 'attribute-trap.png',
  // 等级 / 阶级 / 数值
  'level.png', 'rank.png', 'atk-def.svg', 'atk-link.svg', 'laser1.png', 'laser2.png',
  // 魔法 / 陷阱图标
  'icon-continuous.png', 'icon-counter.png', 'icon-equip.png', 'icon-field.png',
  'icon-quick-play.png', 'icon-ritual.png',
  // LINK 箭头
  'arrow-up-on.png', 'arrow-up-off.png',
  'arrow-right-up-on.png', 'arrow-right-up-off.png',
  'arrow-right-on.png', 'arrow-right-off.png',
  'arrow-right-down-on.png', 'arrow-right-down-off.png',
  'arrow-down-on.png', 'arrow-down-off.png',
  'arrow-left-down-on.png', 'arrow-left-down-off.png',
  'arrow-left-on.png', 'arrow-left-off.png',
  'arrow-left-up-on.png', 'arrow-left-up-off.png'
];

const FONTS = [
  'ygo-atk-def.woff2', 'ygo-link.woff2', 'ygo-password.woff2', 'ygo-sc.woff2'
];

async function downloadFile(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log(`[SKIP] ${path.basename(dest)}`);
    return;
  }
  console.log(`[GET ] ${path.basename(dest)}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[FAIL] ${path.basename(dest)}: HTTP ${res.status}`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function main() {
  console.log('拉取 kooriookami/yugioh-card 公开素材...\n[卡框 / 图标 / 箭头]');
  for (const img of IMAGES) {
    await downloadFile(BASE_URL_IMG + img, path.join(DEST_IMG, img));
  }
  console.log('\n[基础字体]');
  for (const font of FONTS) {
    await downloadFile(BASE_URL_FONT + font, path.join(DEST_FONT, font));
  }
  console.log('\n完成。');
  console.log('提醒：商业字体与 YGOLD 衍生的官方工艺素材无法自动获取，');
  console.log('      请按 docs/ASSETS.md 的说明自行准备。');
}

main().catch(err => {
  console.error('下载失败:', err);
  process.exit(1);
});
