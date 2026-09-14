import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const srcImage = await loadImage('assets/icon.png');
  const resDir = 'android/app/src/main/res';

  const densities = [
    { name: 'mipmap-mdpi', legacySize: 48, adaptiveSize: 108 },
    { name: 'mipmap-hdpi', legacySize: 72, adaptiveSize: 162 },
    { name: 'mipmap-xhdpi', legacySize: 96, adaptiveSize: 216 },
    { name: 'mipmap-xxhdpi', legacySize: 144, adaptiveSize: 324 },
    { name: 'mipmap-xxxhdpi', legacySize: 192, adaptiveSize: 432 }
  ];

  for (const d of densities) {
    const dirPath = path.join(resDir, d.name);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 1. 生成自适应图标前景 (ic_launcher_foreground.png)
    // 尺寸: adaptiveSize x adaptiveSize，图标居中处于 72/108 (66.7%) 安全区内
    {
      const canvas = createCanvas(d.adaptiveSize, d.adaptiveSize);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const iconSize = Math.round(d.adaptiveSize * 0.72);
      const offset = Math.round((d.adaptiveSize - iconSize) / 2);
      ctx.drawImage(srcImage, offset, offset, iconSize, iconSize);

      const buf = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(dirPath, 'ic_launcher_foreground.png'), buf);
    }

    // 2. 生成传统标准启动图标 (ic_launcher.png)
    {
      const canvas = createCanvas(d.legacySize, d.legacySize);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 绘制圆角背景
      const r = d.legacySize * 0.18;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(d.legacySize - r, 0);
      ctx.quadraticCurveTo(d.legacySize, 0, d.legacySize, r);
      ctx.lineTo(d.legacySize, d.legacySize - r);
      ctx.quadraticCurveTo(d.legacySize, d.legacySize, d.legacySize - r, d.legacySize);
      ctx.lineTo(r, d.legacySize);
      ctx.quadraticCurveTo(0, d.legacySize, 0, d.legacySize - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();

      ctx.fillStyle = '#101524';
      ctx.fill();

      // 边框微光
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = Math.max(1, Math.round(d.legacySize * 0.02));
      ctx.stroke();

      // 绘制 YGOPro 图标居中
      const padding = Math.round(d.legacySize * 0.05);
      ctx.drawImage(srcImage, padding, padding, d.legacySize - padding * 2, d.legacySize - padding * 2);

      const buf = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), buf);
    }

    // 3. 生成传统圆形启动图标 (ic_launcher_round.png)
    {
      const canvas = createCanvas(d.legacySize, d.legacySize);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 圆形裁切与背景
      ctx.beginPath();
      ctx.arc(d.legacySize / 2, d.legacySize / 2, d.legacySize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#101524';
      ctx.fillRect(0, 0, d.legacySize, d.legacySize);

      // 绘制 YGOPro 图标
      const padding = Math.round(d.legacySize * 0.04);
      ctx.drawImage(srcImage, padding, padding, d.legacySize - padding * 2, d.legacySize - padding * 2);

      const buf = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), buf);
    }

    console.log(`✅ 已生成 ${d.name} 图标集 (ic_launcher, ic_launcher_round, ic_launcher_foreground)`);
  }

  // 4. 清理旧冲突文件
  const conflictFore = 'android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml';
  if (fs.existsSync(conflictFore)) {
    fs.unlinkSync(conflictFore);
    console.log('✅ 已清理覆盖冲突的旧机器人矢量: drawable-v24/ic_launcher_foreground.xml');
  }

  // 5. 更新背景颜色配置 values/ic_launcher_background.xml 为官方深曜石黑
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#101524</color>
</resources>
`;
  fs.writeFileSync('android/app/src/main/res/values/ic_launcher_background.xml', bgXml, 'utf8');
  console.log('✅ 已更新 values/ic_launcher_background.xml 为 #101524');

  // 6. 确保 drawable/ic_launcher_background.xml 不阻碍自适应色彩
  const drawBg = 'android/app/src/main/res/drawable/ic_launcher_background.xml';
  if (fs.existsSync(drawBg)) {
    fs.unlinkSync(drawBg);
    console.log('✅ 已清理旧网格矢量背景: drawable/ic_launcher_background.xml');
  }

  // 7. 同步 favicon.ico 和 assets/icon.png 到 web
  fs.copyFileSync('assets/icon.ico', 'src/web/public/favicon.ico');
  fs.copyFileSync('assets/icon.ico', 'dist/web/public/favicon.ico');
  fs.copyFileSync('assets/icon.png', 'src/web/public/assets/icon.png');
  fs.copyFileSync('assets/icon.png', 'dist/web/public/assets/icon.png');
  console.log('✅ 已同步 web/public favicon 与 icon.png');

  console.log('\n🎉 Android 端的 YGOPro 原生图标体系升级全部完成！');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
