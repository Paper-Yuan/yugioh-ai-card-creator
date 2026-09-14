const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');

GlobalFonts.registerFromPath('src/web/public/assets/yugioh/font/ygo-sc.woff2', 'ygo-sc');
GlobalFonts.registerFromPath('src/web/public/assets/yugioh/font/ygo-atk-def.woff2', 'ygo-atk-def');
GlobalFonts.registerFromPath('src/web/public/assets/yugioh/font/ygo-password.woff2', 'ygo-password');
GlobalFonts.registerFromPath('src/web/public/assets/yugioh/font/ygo-link.woff2', 'ygo-link');

async function test() {
  const canvas = createCanvas(1394, 2031);
  const ctx = canvas.getContext('2d');

  // Load official effect monster frame
  const frame = await loadImage('src/web/public/assets/yugioh/image/card-effect.png');
  ctx.drawImage(frame, 0, 0, 1394, 2031);

  // Artwork placeholder
  const artX = 170, artY = 375, artW = 1054, artH = 1054;
  const grad = ctx.createRadialGradient(artX + artW/2, artY + artH/2, 40, artX + artW/2, artY + artH/2, artW/1.1);
  grad.addColorStop(0, '#1a1e36');
  grad.addColorStop(0.5, '#0f172a');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(artX, artY, artW, artH);

  // Gold Millennium ring
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(artX + artW/2, artY + artH/2 - 30, 150, 0, Math.PI * 2);
  ctx.stroke();

  // Load official 3D mask
  const mask = await loadImage('src/web/public/assets/yugioh/image/card-mask.png');
  ctx.drawImage(mask, 117, 322, 1162, 1162);

  // Load attribute dark gem
  const attr = await loadImage('src/web/public/assets/yugioh/image/attribute-dark.png');
  ctx.drawImage(attr, 1163, 96, 128, 128);

  // Load level stars
  const star = await loadImage('src/web/public/assets/yugioh/image/level.png');
  for (let i = 0; i < 10; i++) {
    ctx.drawImage(star, 1394 - 147 - 88 - i * 92, 247, 88, 88);
  }

  // Draw Card Name with auto horizontal compression
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 108px ygo-sc';
  ctx.textBaseline = 'alphabetic';
  const name = '究极创世神 艾克佐迪亚';
  const textW = ctx.measureText(name).width;
  const maxW = 1033; // stops before attribute gem at 1163
  if (textW > maxW) {
    ctx.save();
    ctx.translate(116, 0);
    ctx.scale(maxW / textW, 1);
    ctx.fillText(name, 0, 185);
    ctx.restore();
  } else {
    ctx.fillText(name, 116, 185);
  }

  // Type header
  ctx.font = 'bold 44px ygo-sc';
  ctx.fillText('【魔法师族／效果】', 109, 1572);

  // Effect text
  ctx.font = '34px ygo-sc';
  ctx.textBaseline = 'top';
  ctx.fillText('①：只要这张卡在场上表侧表示存在，不受对方卡的效果影响。', 109, 1600);
  ctx.fillText('②：一回合一次，可以破坏对方场上所有卡片。', 109, 1650);
  ctx.fillText('③：这张卡战斗破坏怪兽送去墓地时，给予对方4000点伤害。', 109, 1700);

  // ATK / DEF bar
  const atkDef = await loadImage('src/web/public/assets/yugioh/image/atk-def.svg');
  ctx.drawImage(atkDef, 109, 1844, 1175, 52);

  // ATK / DEF numbers - baseline aligned to 1895
  ctx.font = 'bold 62px ygo-atk-def';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('4000', 999, 1895);
  ctx.fillText('4000', 1282, 1895);

  // Laser stamp
  const laser = await loadImage('src/web/public/assets/yugioh/image/laser1.png');
  ctx.drawImage(laser, 1276, 1913, 72, 72);

  // Passcode
  ctx.font = '40px ygo-password';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('100000001', 66, 1968);

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync('release/test-card-output.png', buf);
  console.log('✅ Successfully rendered official card! Size:', (buf.length / 1024).toFixed(1), 'KB');
}
test();
