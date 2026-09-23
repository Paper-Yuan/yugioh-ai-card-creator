import { createCanvas, loadImage, GlobalFonts, SKRSContext2D } from '@napi-rs/canvas';
import { CardData, CardType, Attribute, CardImageOptions } from './types.js';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * MDPro3 风格卡面字体注册 (服务端 @napi-rs/canvas 渲染)
 * 字体来源与选择依据见 src/web/public/css/main.css 顶部说明：
 *  - 卡名 / 标头 / 效果文本：原作方正楷体优先，缺失时回退思源黑体
 *  - ATK / DEF 等数字：思源黑体 Bold
 *
 * 注意：早期版本使用霞鹜文楷（LXGWWenKai），但该字体文件在本仓库中已损坏
 * （GPOS 表偏移越界，@napi-rs/canvas 下完全无法渲染），故统一改用思源黑体。
 */
const FONT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'web/public/assets/yugioh/font'
);
try {
  // 逐字体独立注册：原作楷体若存在则优先，思源黑体作为随仓库分发的回退
  const fontFiles: Array<[string, string]> = [
    ['RenderFontChineseSimplified.ttf', 'YgoMDKaiFZ'],
    ['SourceHanSansSC-Medium.otf', 'YgoMDKaiSHS'],
    ['SourceHanSansSC-Bold.otf', 'YgoMDGothic']
  ];
  for (const [file, name] of fontFiles) {
    try {
      GlobalFonts.registerFromPath(path.join(FONT_DIR, file), name);
    } catch { /* 个别字体缺失不影响其余注册 */ }
  }
} catch (e) {
  console.warn('[ImageGenerator] font registration failed, using system fonts:', e);
}

/** 卡名 / 标头 / 效果文本的字体栈：原作楷体优先，缺失时回退思源黑体 */
const CJK_FONT_STACK = '"YgoMDKaiFZ", "YgoMDKaiSHS", "Microsoft YaHei", Arial';

/**
 * 卡片图片生成器
 * 使用Canvas生成完整的游戏王卡片图像，无水印
 */
export class CardImageGenerator {
  private readonly CARD_WIDTH = 421;
  private readonly CARD_HEIGHT = 614;
  private imageCache: Map<string, Buffer> = new Map(); // 图片资源缓存
  private readonly MAX_CACHE_SIZE = 20; // 最多缓存 20 张图片

  async generateCardImage(
    card: CardData,
    options: CardImageOptions,
    outputPath: string
  ): Promise<string> {
    const canvas = createCanvas(this.CARD_WIDTH, this.CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    try {
      // 绘制卡片框架（根据卡片类型选择颜色）
      await this.drawCardFrame(ctx, card, options);

      // 绘制卡片图片
      if (options.imageUrl || options.imagePath) {
        await this.drawCardArtwork(ctx, card, options);
      } else {
        // 绘制默认占位符
        this.drawPlaceholderArtwork(ctx, card);
      }

      // 绘制卡片名称
      this.drawCardName(ctx, card);

      // 怪兽卡专有元素
      if (card.type & CardType.MONSTER) {
        this.drawAttribute(ctx, card);
        this.drawLevel(ctx, card);
        this.drawStats(ctx, card);
      }

      // 绘制卡片效果文字
      this.drawCardText(ctx, card);

      // 保存图片 - 优化：直接使用默认压缩
      const buffer = canvas.toBuffer('image/png');
      await writeFile(outputPath, buffer);

      // 清理画布引用，帮助 GC
      ctx.clearRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);

      return outputPath;
    } catch (error) {
      console.error('Card image generation failed:', error);
      throw error;
    }
  }

  async generateMultipleCardImages(
    cards: CardData[],
    options: CardImageOptions,
    outputDir: string
  ): Promise<string[]> {
    const paths: string[] = [];

    for (const card of cards) {
      try {
        const filename = `${card.id}_${this.sanitizeFilename(card.name)}.png`;
        const outputPath = path.join(outputDir, filename);
        await this.generateCardImage(card, options, outputPath);
        paths.push(outputPath);
      } catch (error) {
        console.error(`Failed to generate image for card ${card.id}:`, error);
      }
    }

    return paths;
  }

  private async drawCardFrame(
    ctx: SKRSContext2D,
    card: CardData,
    options: CardImageOptions
  ): Promise<void> {
    // 绘制背景色
    const color = this.getFrameColor(card);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);

    // 绘制外边框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, this.CARD_WIDTH - 4, this.CARD_HEIGHT - 4);

    // 绘制内框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, this.CARD_WIDTH - 20, this.CARD_HEIGHT - 20);
  }

  private async drawCardArtwork(
    ctx: SKRSContext2D,
    card: CardData,
    options: CardImageOptions
  ): Promise<void> {
    try {
      const imagePath = options.imagePath || options.imageUrl;
      if (!imagePath) return;

      const image = await loadImage(imagePath);
      
      // 卡图区域
      const artX = 30;
      const artY = 60;
      const artWidth = this.CARD_WIDTH - 60;
      const artHeight = card.type & CardType.MONSTER ? 220 : 220;

      // 计算居中裁剪
      const scale = Math.max(artWidth / image.width, artHeight / image.height);
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      const offsetX = (scaledWidth - artWidth) / 2;
      const offsetY = (scaledHeight - artHeight) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(artX, artY, artWidth, artHeight);
      ctx.clip();
      ctx.drawImage(
        image as any,
        artX - offsetX,
        artY - offsetY,
        scaledWidth,
        scaledHeight
      );
      ctx.restore();
    } catch (error) {
      console.error('Failed to load card artwork:', error);
      this.drawPlaceholderArtwork(ctx, card);
    }
  }

  private drawPlaceholderArtwork(
    ctx: SKRSContext2D,
    card: CardData
  ): void {
    const artX = 30;
    const artY = 60;
    const artWidth = this.CARD_WIDTH - 60;
    const artHeight = 220;

    // 渐变背景
    const gradient = ctx.createLinearGradient(artX, artY, artX, artY + artHeight);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(artX, artY, artWidth, artHeight);

    // 卡片名称水印
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `bold 32px ${CJK_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.name, artX + artWidth / 2, artY + artHeight / 2);
  }

  private drawCardName(ctx: SKRSContext2D, card: CardData): void {
    // 名称框背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 20, this.CARD_WIDTH - 100, 35);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, this.CARD_WIDTH - 100, 35);

    // 卡片名称
    ctx.fillStyle = '#000000';
    ctx.font = `bold 20px ${CJK_FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // 文字过长时缩小
    let fontSize = 20;
    ctx.font = `bold ${fontSize}px ${CJK_FONT_STACK}`;
    while (ctx.measureText(card.name).width > this.CARD_WIDTH - 110 && fontSize > 12) {
      fontSize--;
      ctx.font = `bold ${fontSize}px ${CJK_FONT_STACK}`;
    }
    
    ctx.fillText(card.name, 28, 37);
  }

  private drawAttribute(ctx: SKRSContext2D, card: CardData): void {
    if (!card.attribute) return;

    const attributeNames = {
      [Attribute.EARTH]: '地',
      [Attribute.WATER]: '水',
      [Attribute.FIRE]: '炎',
      [Attribute.WIND]: '风',
      [Attribute.LIGHT]: '光',
      [Attribute.DARK]: '暗',
      [Attribute.DIVINE]: '神'
    };

    const attrName = attributeNames[card.attribute] || '';
    
    // 属性图标背景
    ctx.fillStyle = this.getAttributeColor(card.attribute);
    ctx.beginPath();
    ctx.arc(this.CARD_WIDTH - 40, 37, 20, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 属性文字
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 16px ${CJK_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(attrName, this.CARD_WIDTH - 40, 37);
  }

  private drawLevel(ctx: SKRSContext2D, card: CardData): void {
    if (!card.level) return;

    const level = card.level & 0xFFFF;
    const starY = 295;
    const starSize = 18;
    const starSpacing = 20;
    const startX = this.CARD_WIDTH - 35 - (level * starSpacing);

    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < level && i < 12; i++) {
      const x = startX + (i * starSpacing);
      this.drawStar(ctx, x, starY, starSize / 2);
    }
  }

  private drawStar(ctx: SKRSContext2D, cx: number, cy: number, radius: number): void {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawCardText(ctx: SKRSContext2D, card: CardData): void {
    const textX = 30;
    const textY = card.type & CardType.MONSTER ? 320 : 295;
    const textWidth = this.CARD_WIDTH - 60;
    const textHeight = card.type & CardType.MONSTER ? 210 : 245;

    // 文字框背景
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(textX, textY, textWidth, textHeight);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(textX, textY, textWidth, textHeight);

    // 怪兽类型信息
    if (card.type & CardType.MONSTER) {
      ctx.fillStyle = '#000000';
      ctx.font = `11px ${CJK_FONT_STACK}`;
      ctx.textAlign = 'left';
      const typeText = this.getTypeText(card);
      ctx.fillText(typeText, textX + 8, textY + 15);
    }

    // 效果文字
    ctx.fillStyle = '#000000';
    ctx.font = `10px ${CJK_FONT_STACK}`;
    ctx.textAlign = 'left';
    
    const startY = textY + (card.type & CardType.MONSTER ? 30 : 15);
    this.wrapText(ctx, card.description, textX + 8, startY, textWidth - 16, 13);
  }

  private drawStats(ctx: SKRSContext2D, card: CardData): void {
    const statsY = 555;
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px "YgoMDGothic", Arial';
    ctx.textAlign = 'left';

    // ATK
    const atkText = card.atk !== undefined ? `ATK/${card.atk}` : 'ATK/?';
    ctx.fillText(atkText, 160, statsY);

    // DEF or LINK
    if (card.type & CardType.LINK) {
      const linkValue = (card.level ?? 0) & 0xFFFF;
      ctx.fillText(`LINK-${linkValue}`, 280, statsY);
    } else {
      const defText = card.def !== undefined ? `DEF/${card.def}` : 'DEF/?';
      ctx.fillText(defText, 280, statsY);
    }
  }

  private wrapText(
    ctx: SKRSContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const lines = text.split('\n');
    let currentY = y;

    for (const line of lines) {
      const words = line.split('');
      let currentLine = '';

      for (const char of words) {
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine !== '') {
          ctx.fillText(currentLine, x, currentY);
          currentLine = char;
          currentY += lineHeight;
        } else {
          currentLine = testLine;
        }
      }

      ctx.fillText(currentLine, x, currentY);
      currentY += lineHeight;
    }
  }

  private getFrameColor(card: CardData): string {
    if (card.type & CardType.SPELL) return '#1D9E74';
    if (card.type & CardType.TRAP) return '#BC5A84';
    if (card.type & CardType.FUSION) return '#A086B7';
    if (card.type & CardType.SYNCHRO) return '#CCCCCC';
    if (card.type & CardType.XYZ) return '#000000';
    if (card.type & CardType.LINK) return '#00008B';
    if (card.type & CardType.EFFECT) return '#FF8B53';
    return '#FDE68A';
  }

  private getAttributeColor(attribute: number): string {
    const colors: Record<number, string> = {
      [Attribute.EARTH]: '#8B4513',
      [Attribute.WATER]: '#1E90FF',
      [Attribute.FIRE]: '#FF4500',
      [Attribute.WIND]: '#00CED1',
      [Attribute.LIGHT]: '#FFD700',
      [Attribute.DARK]: '#4B0082',
      [Attribute.DIVINE]: '#FF69B4'
    };
    return colors[attribute] || '#808080';
  }

  private getTypeText(card: CardData): string {
    const raceNames = [
      '', '战士族', '魔法师族', '天使族', '恶魔族', '不死族', '机械族',
      '水族', '炎族', '岩石族', '鸟兽族', '植物族', '昆虫族', '雷族',
      '龙族', '兽族', '兽战士族', '恐龙族', '鱼族', '海龙族',
      '爬虫族', '念动力族', '幻神兽族', '创造神族', '幻龙族', '电子界族'
    ];

    const raceIndex = Math.log2(card.race);
    const raceName = raceNames[raceIndex] || '未知';

    const types: string[] = [raceName];
    
    if (card.type & CardType.EFFECT) types.push('效果');
    if (card.type & CardType.FUSION) types.push('融合');
    if (card.type & CardType.SYNCHRO) types.push('同调');
    if (card.type & CardType.XYZ) types.push('超量');
    if (card.type & CardType.LINK) types.push('连接');
    if (card.type & CardType.PENDULUM) types.push('灵摆');
    
    return `[ ${types.join(' / ')} ]`;
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
  }
}
