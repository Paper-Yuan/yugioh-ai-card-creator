/**
 * 游戏王卡片客户端高清渲染引擎 (CardRenderer v2.1 - MDPro3 Style Edition)
 * 采用白羽幸鸟 / OCG 官方 1394×2031 印刷级母版美术素材与 MDPro3 风格字库硬件加速渲染
 * 卡面字体对齐 MDPro3 (开源 Master Duel 风格启动器)：
 *   卡名/标头 = 原作方正楷体（本机安装或本地打包时优先），否则回退思源黑体；
 *   效果文 = 同上；ATK/DEF 等数字 = 思源黑体 Bold (对应 MDPro3 AtkDef 黑体数字)；
 *   MDPro3 卡名为纯色文字无描边，本渲染器保持一致。
 * 100% 离线脱机，完美兼容 Windows 客户端与 Android APK
 */

class CardRenderer {
  constructor() {
    this.CARD_WIDTH = 1394;
    this.CARD_HEIGHT = 2031;
    this.baseImage = './assets/yugioh/image';
    this.baseFont = './assets/yugioh/font';
    this.imageCache = new Map();
    this.fontsLoaded = false;
  }

  /**
   * 异步预热并确保官方字体已加载
   */
  async ensureFonts() {
    if (this.fontsLoaded) return;
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await Promise.allSettled([
          document.fonts.load('bold 102px "ygo-cardname"', '究极创世神 艾克佐迪亚 青眼白龙 １２３４５６７８９０ ＡＢＣＤＥＦＧ'),
          document.fonts.load('44px "ygo-cardtext"', '【魔法师族／效果】召唤·特殊召唤 １２３４５６７８９０ ①②③'),
          document.fonts.load('bold 102px "ygo-md-bold"', '究极创世神 艾克佐迪亚 青眼白龙'),
          document.fonts.load('44px "ygo-md-text"', '【魔法师族／效果】召唤·特殊召唤'),
          document.fonts.load('64px "ygo-matrix"', '0123456789?'),
          document.fonts.load('40px "ygo-cardkey"', '100000001'),
          document.fonts.load('64px "ygo-atk-def"', '0123456789?'),
          document.fonts.load('64px "ygo-link"', '0123456789?'),
          document.fonts.load('bold 102px "ygo-jp-name"', '青眼の白龍 ブルーアイズ・ホワイト・ドラゴン 灰流うらら'),
          document.fonts.load('bold 30px "ygo-jp-ruby"', 'ブルーアイズ ホワイト・ドラゴン ししゃそせい ちょうまどうけんし'),
          document.fonts.load('bold 44px "ygo-jp-detail"', '【ドラゴン族／シンクロ／効果】特殊召喚 【戦士族】'),
          document.fonts.load('44px "ygo-jp-text"', '【ドラゴン族／シンクロ／効果】特殊召喚 ①②③')
        ]);
        await document.fonts.ready;
        this.fontsLoaded = true;
      } catch (e) {
        console.warn('[CardRenderer] Font preload notice:', e);
      }
    }
  }

  /**
   * 判断卡片是否为日文版 (通过 language === 'ja' 或自动匹配平假名/片假名)
   */
  isJapanese(card) {
    if (card.language === 'ja') return true;
    if (card.language === 'zh' || card.language === 'en') return false;
    const text = (card.name || '') + (card.ruby || '') + (card.description || '');
    return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  }

  /**
   * 将半角 ASCII 字符转换为全角官方字形编码
   * Master Duel 官方简中卡面字库 (方正北魏楷书) 的西文字符与数字全部位于全角 Unicode 区间 (0xFF01~0xFF5E)
   * 自动转换半角字母、数字与符号，杜绝缺字框 (ToFu) 现象，确保字形 100% 官方正统纯正
   */
  toYgoText(str) {
    if (!str) return '';
    return String(str).replace(/[\u0021-\u007E]/g, (ch) => {
      return String.fromCharCode(ch.charCodeAt(0) + 0xFEE0);
    });
  }

  /**
   * 异步加载并缓存图像资源
   */
  loadImage(url) {
    if (!url) return Promise.resolve(null);
    if (this.imageCache.has(url)) {
      const cached = this.imageCache.get(url);
      if (cached.complete && cached.naturalWidth > 0) {
        return Promise.resolve(cached);
      }
    }

    return new Promise((resolve) => {
      const img = new Image();
      // 仅在明确为远程 http/https 资源时设置 anonymous，杜绝本地相对路径被浏览器跨域拦截造成画布污染
      if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`[CardRenderer] Failed to load asset: ${url}`);
        resolve(null);
      };
      img.src = url;
    });
  }

  /**
   * 核心渲染主流程
   */
  async render(canvas, cardData, uploadedImg = null, renderScale = 1) {
    if (!canvas || !cardData) return;

    // 确保字体就绪
    await this.ensureFonts();

    // 设置画布物理像素（支持 1x 标清 1394×2031 或 2x 极清 2788×4062 超采样）
    const targetW = Math.round(this.CARD_WIDTH * renderScale);
    const targetH = Math.round(this.CARD_HEIGHT * renderScale);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 全局强制启用最高品质双三次抗锯齿插值
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    ctx.clearRect(0, 0, targetW, targetH);

    if (renderScale !== 1) {
      ctx.scale(renderScale, renderScale);
    }

    // 1. 绘制官方高清卡身底框 (card-*.png)
    await this.drawCardFrame(ctx, cardData);

    // 2. 绘制卡图视口与官方金属立体遮罩 (card-mask.png)
    await this.drawArtwork(ctx, cardData, uploadedImg);

    // 3. 绘制防伪与限定纪念水印 (置于文字底层)
    await this.drawWatermark(ctx, cardData);

    // 4. 绘制卡名 (Master Duel 官方楷体，上部突出框垂直中心居中)
    this.drawCardName(ctx, cardData);

    // 5. 绘制官方属性宝珠宝石 (attribute-*.png)
    await this.drawAttributeBadge(ctx, cardData);

    // 6. 绘制星级/阶级 (level.png / rank.png) 或魔陷分类条
    await this.drawStarsOrHeader(ctx, cardData);

    // 7. 绘制 YGOLD 规范卡包编号 (packCode)
    this.drawPackCode(ctx, cardData);

    // 8. 灵摆专属刻度与摆区效果 (如果为灵摆卡)
    if (cardData.type & 16777216) {
      this.drawPendulumElements(ctx, cardData);
    }

    // 9. 绘制种族 / 效果标识与效果卡文 (MD 风格楷体, 自动排版防溢出)
    this.drawCardText(ctx, cardData);

    // 10. 怪兽攻守数值与官方标尺 (atk-def.svg / ygo-atk-def)
    if (this.isMonster(cardData.type)) {
      await this.drawStats(ctx, cardData);
    }

    // 11. 绘制卡密、全息防伪镭射标签 (laser1~7) 与版权信息
    await this.drawBottomDetails(ctx, cardData);

    // 12. 叠加 YGOLD 罕贵度闪膜与工艺特效 (SER/UR/PSER/CR/HR/MR 等)
    await this.drawRareFoil(ctx, cardData);

    ctx.restore();
  }

  isMonster(type) {
    return !((type & 2) || (type & 4)); // 非魔法(2)且非陷阱(4)
  }

  /**
   * 1. 绘制官方卡身底框
   */
  async drawCardFrame(ctx, card) {
    const frameName = this.getFrameFileName(card.type);
    const frameUrl = `${this.baseImage}/${frameName}`;
    const frameImg = await this.loadImage(frameUrl);

    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);
    } else {
      // 备用纯色保底
      ctx.fillStyle = (card.type & 4) ? '#be185d' : (card.type & 2) ? '#047857' : '#c2410c';
      ctx.fillRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);
    }
  }

  getFrameFileName(type) {
    // 魔法 / 陷阱
    if (type & 2) return 'card-spell.png';
    if (type & 4) return 'card-trap.png';

    // 灵摆怪兽
    if (type & 16777216) {
      if (type & 8388608) return 'card-xyz-pendulum.png';
      if (type & 8192) return 'card-synchro-pendulum.png';
      if (type & 64) return 'card-fusion-pendulum.png';
      if (type & 128) return 'card-ritual-pendulum.png';
      if (type & 32) return 'card-effect-pendulum.png';
      return 'card-normal-pendulum.png';
    }

    // 普通怪兽及额外怪兽
    if (type & 67108864) return 'card-link.png';
    if (type & 8388608) return 'card-xyz.png';
    if (type & 8192) return 'card-synchro.png';
    if (type & 64) return 'card-fusion.png';
    if (type & 128) return 'card-ritual.png';
    if (type & 32) return 'card-effect.png';
    if (type & 16384) return 'card-token.png';
    return 'card-normal.png';
  }
  /**
   * 获取出框全画对应的 YGOLD 模板前缀
   */
  getOverframeKey(type) {
    if (type & 2) return 'Magic';
    if (type & 4) return 'Trap';
    if (type & 16777216) return 'LB';
    if (type & 67108864) return 'LJ';
    if (type & 8388608) return 'CL';
    if (type & 8192) return 'TD';
    if (type & 64) return 'RH';
    if (type & 128) return 'YS';
    if (type & 32) return 'XG';
    if (type & 16384) return 'YSW';
    return 'TC';
  }

  /**
   * 2. 绘制卡面配图与立体金属内边框 (支持官方标准画框与 YGOLD 艺术出框全画 Overframe 模式)
   */
  async drawArtwork(ctx, card, uploadedImg) {
    const isPendulum = !!(card.type & 16777216);
    const isOverframe = !!card.isOverframe;
    
    // 官方标准插画裁切视口 vs 艺术出框全画视口 (突破常规 1054×1054 边框)
    let artX = isPendulum ? 94 : 170;
    let artY = isPendulum ? 364 : 375;
    let artW = isPendulum ? 1205 : 1054;
    let artH = isPendulum ? 1205 : 1054;

    if (isOverframe) {
      artX = 70;
      artY = 220;
      artW = 1254;
      artH = 1660;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(artX, artY, artW, artH);
    ctx.clip();

    if (uploadedImg && uploadedImg.complete && uploadedImg.naturalWidth > 0) {
      // 居中智能等比裁剪 (cover / contain) + YGOLD 风格构图精细微调
      const nw = uploadedImg.naturalWidth;
      const nh = uploadedImg.naturalHeight;
      const fit = card.artFit || 'cover';
      const baseScale = (fit === 'contain') 
        ? Math.min(artW / nw, artH / nh)
        : Math.max(artW / nw, artH / nh);
      const userScale = (card.artScale !== undefined && card.artScale !== null) ? Number(card.artScale) / 100 : 1.0;
      const finalScale = baseScale * userScale;
      const sw = nw * finalScale;
      const sh = nh * finalScale;
      const offsetX = (card.artOffsetX !== undefined && card.artOffsetX !== null) ? Number(card.artOffsetX) : 0;
      const offsetY = (card.artOffsetY !== undefined && card.artOffsetY !== null) ? Number(card.artOffsetY) : 0;
      const sx = artX + (artW - sw) / 2 + offsetX;
      const sy = artY + (artH - sh) / 2 + offsetY;
      ctx.drawImage(uploadedImg, sx, sy, sw, sh);
    } else {
      // 原版典雅深邃星空底图 + 千年眼黄金徽章
      const grad = ctx.createRadialGradient(
        artX + artW / 2, artY + artH / 2, 40,
        artX + artW / 2, artY + artH / 2, artW / 1.1
      );
      grad.addColorStop(0, '#1a1e36');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(artX, artY, artW, artH);

      // 黄金千年眼装饰环
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(artX + artW / 2, artY + artH / 2 - 30, 150, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '120px "Segoe UI Symbol", "Arial", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('𓂀', artX + artW / 2, artY + artH / 2 - 40);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 36px "ygo-sc", "Microsoft YaHei", sans-serif';
      ctx.fillText('点击上传或生成专属高清卡图', artX + artW / 2, artY + artH / 2 + 105);
    }
    ctx.restore();

    // 绘制边框遮罩：出框全画使用 YGOLD 原生 Overframe 双层遮罩，标准框使用立体浮雕金属遮罩
    if (isOverframe) {
      const ofKey = this.getOverframeKey(card.type);
      const innerUrl = `${this.baseImage}/overframe/${ofKey}_OF_inner.png`;
      const ofUrl = `${this.baseImage}/overframe/${ofKey}_OF.png`;

      const [innerImg, ofImg] = await Promise.all([
        this.loadImage(innerUrl),
        this.loadImage(ofUrl)
      ]);

      if (innerImg) {
        ctx.drawImage(innerImg, 0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);
      }
      if (ofImg) {
        ctx.drawImage(ofImg, 0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);
      }
    } else {
      const maskFile = isPendulum ? 'card-mask-pendulum.png' : 'card-mask.png';
      const maskUrl = `${this.baseImage}/${maskFile}`;
      const maskImg = await this.loadImage(maskUrl);

      if (maskImg) {
        if (isPendulum) {
          ctx.drawImage(maskImg, 68, 342, 1257, 1595);
        } else {
          ctx.drawImage(maskImg, 117, 322, 1162, 1162);
        }
      }
    }
  }

  /**
   * 解析日文注音分词 (对齐 LD 制卡器标准语法 `[Base(Ruby)]` 与全局注音)
   */
  parseRubySegments(rawName = '', rubyText = '') {
    rawName = String(rawName || '').trim();
    rubyText = String(rubyText || '').trim();

    // 1. 兼容单行整体中括号语法，如 "青眼の白龍[ブルーアイズ・ホワイト・ドラゴン]"
    const fullBracketMatch = rawName.match(/^(.*?)[\[【](.*?)[\]】]$/);
    if (fullBracketMatch && !rawName.includes('(') && !rawName.includes('（')) {
      rawName = fullBracketMatch[1].trim();
      if (!rubyText) rubyText = fullBracketMatch[2].trim();
    }

    // 2. LD 制卡器标准嵌套分词语法：`[Base(Ruby)]` 或 `[Base（Ruby）]`
    if (/\[.*?[\(（].*?[\)）]\]/.test(rawName)) {
      const segments = [];
      const regex = /\[(.*?)[\(（](.*?)[\)）]\]|([^\[]+)/g;
      let match;
      while ((match = regex.exec(rawName)) !== null) {
        if (match[1] !== undefined) {
          segments.push({ base: match[1], ruby: match[2] });
        } else if (match[3]) {
          segments.push({ base: match[3], ruby: '' });
        }
      }
      return segments;
    }

    // 3. 传入独立 rubyText
    if (rubyText) {
      if (/\[.*?[\(（].*?[\)）]\]/.test(rubyText)) {
        return this.parseRubySegments(rubyText, '');
      }
      // 助词 'の' 与间隔号 '・' 智能对齐拆分 (如 青眼の白龍 + ブルーアイズ・ホワイト・ドラゴン)
      if (rawName.includes('の') && rubyText.includes('・')) {
        const nameParts = rawName.split('の');
        const rubyParts = rubyText.split('・');
        if (nameParts.length === 2 && rubyParts.length === 2) {
          return [
            { base: nameParts[0], ruby: rubyParts[0] },
            { base: 'の', ruby: '' },
            { base: nameParts[1], ruby: rubyParts[1] }
          ];
        }
      }
      return [{ base: rawName, ruby: rubyText }];
    }

    return [{ base: rawName, ruby: '' }];
  }

  /**
   * 3. 绘制卡名 (Master Duel 简中楷体 / OCG 官方日文隶书体 + LD 制卡器规范分词注音振假名 + YGOLD 罕贵度立体烫金/闪银/幻彩工艺)
   */
  drawCardName(ctx, card) {
    let rawName = card.name || '未命名卡片';
    let rubyText = (card.ruby || '').trim();

    const segments = this.parseRubySegments(rawName, rubyText);
    const hasRuby = segments.some(s => s.ruby && s.ruby.trim().length > 0);

    const isXyz = !!(card.type & 8388608);
    const isLink = !!(card.type & 67108864);
    const isJa = this.isJapanese(card);
    const rare = (card.rare || 'none').toUpperCase();

    // 解析卡名工艺风格
    let foilStyle = card.foilName || 'auto';
    if (foilStyle === 'auto') {
      if (['UR', 'GR', 'GSER'].includes(rare)) {
        foilStyle = 'gold';
      } else if (['PSER2', '20TH', '20TH_RED'].includes(rare)) {
        foilStyle = 'red';
      } else if (['BLUE', 'SBV', 'SBPR'].includes(rare)) {
        foilStyle = 'blue';
      } else if (['SER', 'PSER', 'CR', 'ESR', 'PP'].includes(rare)) {
        foilStyle = 'silver';
      } else if (['HR'].includes(rare)) {
        foilStyle = 'holo';
      } else {
        foilStyle = 'none';
      }
    }

    const startX = 116;
    // 若有日文振假名(ruby)，基线微调留出顶部注音呼吸间距 (对齐 LD 制卡器 YGOLDDFGLeisho 规范)
    const baselineY = hasRuby ? 202 : 196;
    const rubyY = 120; // 悬浮于日文汉字正上方
    const maxWidth = 1022; // 预留右侧属性宝石位置与舒适间距

    ctx.save();
    const nameFontFamily = isJa
      ? '"ygo-jp-name", "YGOLDDFGLeisho4", "DFGLeisho", "ygo-cardname", "ygo-md-bold", sans-serif'
      : '"ygo-cardname", "ygo-md-bold", "RenderFontChineseSimplified", "FZBeiWeiKaiShu-S19S", sans-serif';
    const rubyFontFamily = '"ygo-jp-ruby", "Yu-Gi-Oh! FOT-Rodin ProN DB", "FOT-Rodin Pro", sans-serif';

    // 1. 测量各分词底文与注音尺寸，精密对齐排版 (紧凑凝缩排版，无不自然间隔)
    let currentX = 0;
    for (const seg of segments) {
      seg.base = isJa ? seg.base : this.toYgoText(seg.base);
      ctx.font = `bold 102px ${nameFontFamily}`;
      seg.baseWidth = ctx.measureText(seg.base).width;

      if (seg.ruby && seg.ruby.trim()) {
        ctx.font = `bold 30px ${rubyFontFamily}`;
        seg.rubyWidth = ctx.measureText(seg.ruby).width;

        // OCG 官方规范与 LD 制卡器：允许注音微超底文两端 (15%)，超出部分水平轻微压缩
        const maxAllowedRubyW = seg.baseWidth * 1.15;
        if (seg.rubyWidth > maxAllowedRubyW) {
          seg.rubyScale = maxAllowedRubyW / seg.rubyWidth;
        } else {
          seg.rubyScale = 1;
        }

        seg.width = seg.baseWidth;
        seg.baseX = currentX;
        seg.rubyX = currentX + seg.baseWidth / 2;
        currentX += seg.baseWidth;
      } else {
        seg.rubyWidth = 0;
        seg.rubyScale = 1;
        seg.width = seg.baseWidth;
        seg.baseX = currentX;
        seg.rubyX = currentX + seg.baseWidth / 2;
        currentX += seg.baseWidth;
      }
    }

    const totalWidth = currentX;
    const scale = totalWidth > maxWidth ? (maxWidth / totalWidth) : 1;

    ctx.translate(startX, 0);
    if (scale !== 1) {
      ctx.scale(scale, 1);
    }

    // 2. 绘制振假名 / 注音图层 (Furigana Layer)
    if (hasRuby) {
      for (const seg of segments) {
        if (seg.ruby && seg.ruby.trim()) {
          ctx.save();
          ctx.font = `bold 30px ${rubyFontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';

          if (foilStyle === 'gold') ctx.fillStyle = '#f59e0b';
          else if (foilStyle === 'silver') ctx.fillStyle = '#e2e8f0';
          else if (foilStyle === 'red') ctx.fillStyle = '#ef4444';
          else if (foilStyle === 'blue') ctx.fillStyle = '#38bdf8';
          else if (foilStyle === 'holo') ctx.fillStyle = '#a78bfa';
          else if (isXyz || isLink) ctx.fillStyle = '#ffffff';
          else ctx.fillStyle = '#111827';

          ctx.translate(seg.rubyX, rubyY);
          if (seg.rubyScale !== 1) {
            ctx.scale(seg.rubyScale, 1);
          }
          ctx.fillText(seg.ruby, 0, 0);
          ctx.restore();
        }
      }
    }

    // 3. 绘制底文卡名图层 (Base Name Layer，含全套立体工艺特效)
    ctx.font = `bold 102px ${nameFontFamily}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    if (foilStyle === 'gold') {
      // 官方金字烫金 (UR/GR 奢华金属折光与立体暗部投影)
      const grad = ctx.createLinearGradient(0, baselineY - 100, 0, baselineY + 10);
      grad.addColorStop(0.0, '#fff6b0');
      grad.addColorStop(0.2, '#ffd54f');
      grad.addColorStop(0.45, '#d48806');
      grad.addColorStop(0.7, '#fff9c4');
      grad.addColorStop(0.85, '#f59e0b');
      grad.addColorStop(1.0, '#b45309');

      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.shadowBlur = 4;

      ctx.strokeStyle = 'rgba(80, 40, 0, 0.4)';
      ctx.lineWidth = 2;
      for (const seg of segments) {
        ctx.strokeText(seg.base, seg.baseX, baselineY);
      }

      ctx.fillStyle = grad;
      for (const seg of segments) {
        ctx.fillText(seg.base, seg.baseX, baselineY);
      }
    } else if (foilStyle === 'silver') {
      // 官方银字闪烁 (SER/CR 碎闪白金高光折射与浮雕阴影)
      const grad = ctx.createLinearGradient(0, baselineY - 100, 0, baselineY + 10);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.25, '#e2e8f0');
      grad.addColorStop(0.5, '#94a3b8');
      grad.addColorStop(0.75, '#ffffff');
      grad.addColorStop(1.0, '#64748b');

      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 3;

      ctx.strokeStyle = 'rgba(20, 30, 40, 0.4)';
      ctx.lineWidth = 2;
      for (const seg of segments) {
        ctx.strokeText(seg.base, seg.baseX, baselineY);
      }

      ctx.fillStyle = grad;
      for (const seg of segments) {
        ctx.fillText(seg.base, seg.baseX, baselineY);
      }
    } else if (foilStyle === 'red') {
      // 官方 20th 纪念红碎 / 红字立体烫印 (20th Secret Rare 绯红金属折光与立体暗部投影)
      const grad = ctx.createLinearGradient(0, baselineY - 100, 0, baselineY + 10);
      grad.addColorStop(0.0, '#ffccd5');
      grad.addColorStop(0.2, '#ff3366');
      grad.addColorStop(0.45, '#e11d48');
      grad.addColorStop(0.7, '#ff8099');
      grad.addColorStop(0.85, '#be123c');
      grad.addColorStop(1.0, '#4c0519');

      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.shadowBlur = 4;

      ctx.strokeStyle = 'rgba(180, 20, 50, 0.45)';
      ctx.lineWidth = 2;
      for (const seg of segments) {
        ctx.strokeText(seg.base, seg.baseX, baselineY);
      }

      ctx.fillStyle = grad;
      for (const seg of segments) {
        ctx.fillText(seg.base, seg.baseX, baselineY);
      }
    } else if (foilStyle === 'blue') {
      // 官方限定蓝碎 / 蓝字立体烫印 (Special Blue Version / SBV 皇家电光蓝宝石金属折光与倒角高光)
      const grad = ctx.createLinearGradient(0, baselineY - 100, 0, baselineY + 10);
      grad.addColorStop(0.0, '#f0f9ff');
      grad.addColorStop(0.12, '#bae6fd');
      grad.addColorStop(0.32, '#38bdf8');
      grad.addColorStop(0.52, '#0284c7');
      grad.addColorStop(0.72, '#1d4ed8');
      grad.addColorStop(0.88, '#1e40af');
      grad.addColorStop(1.0, '#0f2b5c');

      ctx.shadowColor = 'rgba(2, 6, 23, 0.8)';
      ctx.shadowOffsetX = 2.5;
      ctx.shadowOffsetY = 2.5;
      ctx.shadowBlur = 4;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      for (const seg of segments) {
        ctx.strokeText(seg.base, seg.baseX, baselineY);
      }

      ctx.fillStyle = grad;
      for (const seg of segments) {
        ctx.fillText(seg.base, seg.baseX, baselineY);
      }
    } else if (foilStyle === 'holo') {
      // 全息彩虹光谱渐变
      const grad = ctx.createLinearGradient(0, 0, totalWidth, 0);
      grad.addColorStop(0.0, '#f472b6');
      grad.addColorStop(0.25, '#60a5fa');
      grad.addColorStop(0.5, '#34d399');
      grad.addColorStop(0.75, '#fbbf24');
      grad.addColorStop(1.0, '#c084fc');

      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 4;

      ctx.fillStyle = grad;
      for (const seg of segments) {
        ctx.fillText(seg.base, seg.baseX, baselineY);
      }
    } else {
      // 纯色文字：超量与连接因深黑底框采用纯白字，其余均采用纯黑字
      const isLightText = isXyz || isLink;
      ctx.fillStyle = isLightText ? '#ffffff' : '#000000';
      for (const seg of segments) {
        ctx.fillText(seg.base, seg.baseX, baselineY);
      }
    }

    ctx.restore();
  }

  /**
   * 4. 绘制官方属性宝珠宝石 (attribute-*.png)
   */
  async drawAttributeBadge(ctx, card) {
    let attrFile = 'attribute-dark.png';

    if (card.type & 2) {
      attrFile = 'attribute-spell.png';
    } else if (card.type & 4) {
      attrFile = 'attribute-trap.png';
    } else {
      const attrMap = {
        32: 'attribute-dark.png',
        16: 'attribute-light.png',
        1: 'attribute-earth.png',
        2: 'attribute-water.png',
        4: 'attribute-fire.png',
        8: 'attribute-wind.png',
        64: 'attribute-divine.png'
      };
      attrFile = attrMap[card.attribute] || 'attribute-dark.png';
    }

    const attrImg = await this.loadImage(`${this.baseImage}/${attrFile}`);
    if (attrImg) {
      // 官方标准位置与尺寸
      ctx.drawImage(attrImg, 1163, 96, 128, 128);
    }
  }

  /**
   * 5. 绘制立体等级/阶级星，或魔陷分类标识条
   */
  async drawStarsOrHeader(ctx, card) {
    // 魔法 / 陷阱：右侧绘制【魔法卡】/【陷阱卡】及官方类型图标
    if (!this.isMonster(card.type)) {
      await this.drawSpellTrapHeader(ctx, card);
      return;
    }

    // 连接怪兽无星级
    if (card.type & 67108864) {
      return;
    }

    const level = Math.min(Math.max(card.level || 4, 1), 13);
    const isXyz = !!(card.type & 8388608);

    if (isXyz) {
      // 超量阶级：从左至右排列 (rank.png, 88×88)
      const rankImg = await this.loadImage(`${this.baseImage}/rank.png`);
      if (rankImg) {
        const left = level < 13 ? 147 : 101;
        for (let i = 0; i < level; i++) {
          const x = left + i * 92;
          ctx.drawImage(rankImg, x, 247, 88, 88);
        }
      }
    } else {
      // 普通等级：从右至左排列 (level.png, 88×88)
      const levelImg = await this.loadImage(`${this.baseImage}/level.png`);
      if (levelImg) {
        const right = level < 13 ? 147 : 101;
        for (let i = 0; i < level; i++) {
          const x = this.CARD_WIDTH - right - 88 - i * 92;
          ctx.drawImage(levelImg, x, 247, 88, 88);
        }
      }
    }
  }

  /**
   * 绘制魔法 / 陷阱分类标题与图标
   */
  async drawSpellTrapHeader(ctx, card) {
    const isSpell = !!(card.type & 2);
    const isJa = this.isJapanese(card);
    const baseText = isJa ? (isSpell ? '魔法カード' : '罠カード') : (isSpell ? '魔法卡' : '陷阱卡');
    const endX = this.CARD_WIDTH - 134;
    const baselineY = 320;

    ctx.save();
    ctx.fillStyle = '#000000';
    const fontFam = isJa
      ? '"ygo-jp-name", "YGOLDDFGLeisho4", "DFGLeisho", "ygo-cardname", "ygo-md-bold", sans-serif'
      : '"ygo-cardname", "ygo-md-bold", "RenderFontChineseSimplified", "FZBeiWeiKaiShu-S19S", sans-serif';
    ctx.font = `bold 76px ${fontFam}`;
    ctx.textBaseline = 'alphabetic';

    // 检查是否有类型子图标
    let iconFile = null;
    if (card.type & 131072) iconFile = 'icon-continuous.png';    // 永续
    else if (card.type & 1048576) {
      iconFile = isSpell ? 'icon-quick-play.png' : 'icon-counter.png'; // 速攻 / 反击
    }
    else if (card.type & 262144) iconFile = 'icon-equip.png';    // 装备
    else if (card.type & 524288) iconFile = 'icon-field.png';    // 场地
    else if (card.type & 128) iconFile = 'icon-ritual.png';      // 仪式

    if (iconFile) {
      const iconImg = await this.loadImage(`${this.baseImage}/${iconFile}`);
      const rightBracket = '】';
      const rightW = ctx.measureText(rightBracket).width;
      const rightX = endX - rightW;

      // 绘制右括号
      ctx.fillText(rightBracket, rightX, baselineY);

      // 绘制官方图标 (72×72)
      const iconX = rightX - 8 - 72;
      const iconY = 254 + 4;
      if (iconImg) {
        ctx.drawImage(iconImg, iconX, iconY, 72, 72);
      }

      // 绘制前段文字 【魔法卡 / 【魔法カード
      const leftText = `【${baseText}`;
      const leftW = ctx.measureText(leftText).width;
      const leftX = iconX - 10 - leftW;
      ctx.fillText(leftText, leftX, baselineY);
    } else {
      const fullText = `【${baseText}】`;
      const fullW = ctx.measureText(fullText).width;
      ctx.fillText(fullText, endX - fullW, baselineY);
    }

    ctx.restore();
  }

  /**
   * 智能提取灵摆效果文本
   */
  getPendulumDescription(card) {
    const isJa = this.isJapanese(card);
    const specificPen = (isJa && card.jaPendulumDescription)
      ? card.jaPendulumDescription.trim()
      : (card.pendulumDescription && card.pendulumDescription.trim());
    if (specificPen) {
      return specificPen;
    }
    const desc = (isJa && card.jaDescription) ? card.jaDescription : (card.description || '');
    // 匹配 【灵摆效果】...【怪兽效果】 或 【ペンデュラム効果】...【モンスター効果】
    const match = desc.match(/【(?:灵摆效果|ペンデュラム効果|Pendulum Effect)】([\s\S]*?)(?:【(?:怪兽效果|モンスター効果|Monster Effect)】|$)/i);
    if (match) {
      return match[1].trim();
    }
    return '';
  }

  /**
   * 智能提取怪兽效果文本 (过滤掉灵摆头部)
   */
  getMonsterDescription(card) {
    const isJa = this.isJapanese(card);
    const desc = (isJa && card.jaDescription) ? card.jaDescription : (card.description || '');
    const isPendulum = !!(card.type & 16777216);
    if (!isPendulum) return desc;

    // 匹配 【怪兽效果】 或 【モンスター効果】 之后的内容
    const match = desc.match(/【(?:怪兽效果|モンスター効果|Monster Effect)】([\s\S]*)$/i);
    if (match) {
      return match[1].trim();
    }
    const penDesc = (isJa && card.jaPendulumDescription) ? card.jaPendulumDescription : card.pendulumDescription;
    if (penDesc && desc.startsWith(penDesc)) {
      return desc.slice(penDesc.length).trim();
    }
    return desc;
  }

  /**
   * 6. 灵摆专属刻度与摆区效果独立排版
   */
  drawPendulumElements(ctx, card) {
    const scale = (card.scale !== undefined && card.scale !== null) 
      ? card.scale 
      : ((card.level || 1) & 0xFFFF);

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 98px "ygo-atk-def", "AtkDef", Consolas, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 左侧蓝色刻度宝石数值
    ctx.fillText(String(scale), 145, 1420);

    // 右侧红色刻度宝石数值
    ctx.fillText(String(scale), 1249, 1420);

    ctx.restore();

    // 独立绘制灵摆框效果卡文 (x=221, y=1300, w=950, h=205)
    // 垂直居中对齐 (isCenterY=true)，彻底修复文本靠顶偏上的问题
    const penDesc = this.getPendulumDescription(card);
    if (penDesc) {
      const isJa = this.isJapanese(card);
      const customFont = isJa
        ? '"ygo-jp-text", "Yu-Gi-Oh! FOT-Rodin ProN DB", "FOT-Rodin Pro", sans-serif'
        : null;
      this.renderAutoWrappedText(ctx, penDesc, 221, 1300, 950, 205, true, customFont);
    }
  }

  /**
   * 7. 绘制种族 / 类型标识栏与效果卡文 (方正北魏楷书简 / 日文 Rodin DB，自动排版)
   */
  drawCardText(ctx, card) {
    const isMonster = this.isMonster(card.type);
    const isJa = this.isJapanese(card);
    const boxX = 109;
    const boxW = 1175;

    ctx.save();

    // 怪兽卡：绘制【种族／效果】等分类标头 (支持上部文本 card.typeHeader 自动适配与自定义)
    let effectStartY = 1585;
    let availableHeight = 255;

    if (isMonster) {
      let raceStr = (card.typeHeader && card.typeHeader.trim())
        ? card.typeHeader.trim()
        : this.getMonsterTypeHeader(card);
      if (!isJa && !raceStr.startsWith('【')) {
        raceStr = `【${raceStr}】`;
      }
      ctx.fillStyle = '#000000';
      let headerFontSize = isJa ? 40 : 44;
      const headerFont = isJa
        ? '"ygo-jp-text", "Yu-Gi-Oh! FOT-Rodin ProN DB", "FOT-Rodin Pro", sans-serif'
        : '"ygo-cardname", "ygo-md-bold", "RenderFontChineseSimplified", "FZBeiWeiKaiShu-S19S", sans-serif';
      ctx.font = `bold ${headerFontSize}px ${headerFont}`;

      // 自适应排版：若包含多个复合特性标头较长，平滑等比缩小防超出文字框
      while (headerFontSize > 26 && ctx.measureText(raceStr).width > boxW) {
        headerFontSize -= 1;
        ctx.font = `bold ${headerFontSize}px ${headerFont}`;
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(raceStr, boxX, 1572);

      effectStartY = 1600;
      availableHeight = (card.type & 16777216) ? 245 : 255;
    } else {
      effectStartY = 1530;
      availableHeight = 350;
    }

    // 绘制多行效果文本 (动态缩小字体防溢出)
    // 日文卡图优先使用日文效果文本 jaDescription，使中文配置直接在卡面上呈现纯正日文 OCG 排版
    const rawDesc = isMonster 
      ? this.getMonsterDescription(card) 
      : ((isJa && card.jaDescription) ? card.jaDescription : (card.description || ''));
    const desc = rawDesc || (isJa ? '効果テキストなし' : '暂无效果描述');
    const customFont = isJa
      ? '"ygo-jp-text", "Yu-Gi-Oh! FOT-Rodin ProN DB", "FOT-Rodin Pro", sans-serif'
      : null;
    this.renderAutoWrappedText(ctx, desc, boxX, effectStartY, boxW, availableHeight, false, customFont);

    ctx.restore();
  }

  renderAutoWrappedText(ctx, text, x, startY, maxWidth, maxHeight, isCenterY = false, customFontFamily = null) {
    const isJa = (typeof customFontFamily === 'string' && customFontFamily.includes('jp')) || /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
    const formattedText = isJa ? String(text || '') : this.toYgoText(text);

    const defaultFontFamily = '"ygo-cardtext", "ygo-md-text", "RenderFontChineseSimplified", "FZBeiWeiKaiShu-S19S", sans-serif';
    const fontFam = customFontFamily || (isJa
      ? '"ygo-jp-text", "Yu-Gi-Oh! FOT-Rodin ProN DB", "FOT-Rodin Pro", sans-serif'
      : defaultFontFamily);

    // 效果文本内联注音：`[漢字(ルビ)]` -> 汉字上方绘制小号振假名
    if (/\[[^\]]*[\(（][^\)）]*[\)）]\]/.test(formattedText)) {
      this.renderRubyWrappedText(ctx, formattedText, x, startY, maxWidth, maxHeight, isCenterY, fontFam);
      return;
    }

    let fontSize = 36;
    let lineHeight = Math.round(fontSize * 1.25);
    let wrappedLines = [];

    // 自适应缩小字号保证完全容纳，最低 18px，细化步长 fontSize -= 1 保持排版美观
    while (fontSize >= 18) {
      ctx.font = `${fontSize}px ${fontFam}`;
      wrappedLines = this.calculateWrappedLines(ctx, formattedText, maxWidth);
      if (wrappedLines.length * lineHeight <= maxHeight) {
        break;
      }
      fontSize -= 1;
      lineHeight = Math.round(fontSize * 1.25);
    }

    ctx.fillStyle = '#000000';
    ctx.font = `${fontSize}px ${fontFam}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const totalHeight = wrappedLines.length * lineHeight;
    let curY = startY;
    if (isCenterY && totalHeight < maxHeight) {
      curY = startY + Math.floor((maxHeight - totalHeight) / 2);
    }

    for (const line of wrappedLines) {
      ctx.fillText(line, x, curY);
      curY += lineHeight;
    }
  }

  /**
   * 解析效果文本中的注音标记，返回线性 token 列表。
   * `[漢字(ルビ)]` -> { base, ruby }；其余每个字符 -> { base, ruby: '' }
   */
  parseEffectRubyTokens(text) {
    const tokens = [];
    const regex = /\[([^\[\]]*?)[\(（]([^\(\)（）]*?)[\)）]\]|([^\[\]]+)/g;
    let m;
    while ((m = regex.exec(String(text || ''))) !== null) {
      if (m[1] !== undefined) {
        tokens.push({ base: m[1] || '', ruby: m[2] || '' });
      } else if (m[3] !== undefined) {
        for (const ch of m[3]) tokens.push({ base: ch, ruby: '' });
      }
    }
    return tokens;
  }

  /**
   * 带内联振假名的效果文本排版 (汉字上方绘制小号注音，对齐官方 OCG 印刷版式)
   */
  renderRubyWrappedText(ctx, text, x, startY, maxWidth, maxHeight, isCenterY, fontFam) {
    const rawTokens = this.parseEffectRubyTokens(text);
    const hasRuby = rawTokens.some(t => t.ruby);
    if (!hasRuby) {
      const plain = rawTokens.map(t => t.base).join('');
      this.renderAutoWrappedText(ctx, plain, x, startY, maxWidth, maxHeight, isCenterY, fontFam);
      return;
    }

    let fontSize = 36;
    let rubyFontSize = Math.max(11, Math.round(fontSize * 0.42));
    let lines = [];
    const lineHeightFor = (fs) => Math.round(fs * 1.62);

    const layout = () => {
      ctx.font = `${fontSize}px ${fontFam}`;
      const tokenW = rawTokens.map(t => ({ ...t, w: ctx.measureText(t.base).width }));
      const out = [];
      let cur = [];
      let curW = 0;
      for (const t of tokenW) {
        if (t.base === '\n') {
          out.push(cur);
          cur = [];
          curW = 0;
          continue;
        }
        if (curW + t.w > maxWidth && cur.length > 0) {
          out.push(cur);
          cur = [];
          curW = 0;
        }
        cur.push(t);
        curW += t.w;
      }
      out.push(cur);
      return out;
    };

    while (fontSize >= 18) {
      lines = layout();
      if (lines.length * lineHeightFor(fontSize) <= maxHeight) break;
      fontSize -= 1;
      rubyFontSize = Math.max(11, Math.round(fontSize * 0.42));
    }

    const lineHeight = lineHeightFor(fontSize);
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000000';

    const totalHeight = lines.length * lineHeight;
    let curY = startY;
    if (isCenterY && totalHeight < maxHeight) {
      curY = startY + Math.floor((maxHeight - totalHeight) / 2);
    }

    // 首行基线：为上方注音预留空间
    const firstBaseline = curY + Math.round(fontSize * 1.0);

    lines.forEach((line, li) => {
      const baseline = firstBaseline + li * lineHeight;
      let cx = x;
      for (const t of line) {
        if (t.base === '\n') continue;
        ctx.font = `${fontSize}px ${fontFam}`;
        ctx.textAlign = 'left';
        ctx.fillText(t.base, cx, baseline);
        if (t.ruby) {
          ctx.font = `${rubyFontSize}px ${fontFam}`;
          ctx.textAlign = 'center';
          ctx.fillText(t.ruby, cx + t.w / 2, baseline - fontSize - 2);
          ctx.textAlign = 'left';
        }
        cx += t.w;
      }
    });

    ctx.restore();
  }

  calculateWrappedLines(ctx, text, maxWidth) {
    const paragraphs = String(text || '').replace(/\r\n/g, '\n').split('\n');
    const allLines = [];
    // 避头标点（不能出现在行首的符号）
    const NO_START = '、，。？！：；）〕］｝》〉』」’”‰℃％！，。？：；）】』」”’！·、…';

    for (const p of paragraphs) {
      if (!p) {
        allLines.push('');
        continue;
      }
      let currentLine = '';
      for (let i = 0; i < p.length; i++) {
        const ch = p[i];
        const testLine = currentLine + ch;
        if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') {
          // 避头尾处理：如果当前字符 ch 不能作为行首，且当前行有可回退字符
          if (NO_START.includes(ch) && currentLine.length > 1) {
            let rollback = '';
            while (currentLine.length > 1 && (rollback === '' || NO_START.includes(rollback[0]))) {
              rollback = currentLine.slice(-1) + rollback;
              currentLine = currentLine.slice(0, -1);
            }
            allLines.push(currentLine);
            currentLine = rollback + ch;
          } else {
            allLines.push(currentLine);
            currentLine = ch;
          }
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        allLines.push(currentLine);
      }
    }
    return allLines;
  }

  getMonsterTypeHeader(card) {
    const isJa = this.isJapanese(card);

    if (isJa) {
      const jaRaceMap = {
        1: '戦士族', 2: '魔法使い族', 4: '天使族', 8: '悪魔族', 16: 'アンデット族',
        32: '機械族', 64: '水族', 128: '炎族', 256: '岩石族', 512: '鳥獣族',
        1024: '植物族', 2048: '昆虫族', 4096: '雷族', 8192: 'ドラゴン族', 16384: '獣族',
        32768: '獣戦士族', 65536: '恐竜族', 131072: '魚族', 262144: '海竜族',
        524288: '爬虫類族', 1048576: 'サイキック族', 2097152: '幻神獣族', 4194304: '幻竜族',
        8388608: 'サイバース族', 16777216: '幻想魔族', 33554432: '創造神族'
      };
      const race = jaRaceMap[card.race] || '戦士族';
      const tags = [race];

      // 1. 主召唤类别 (融合/儀式/シンクロ/エクシーズ/リンク)
      if (card.type & 64) tags.push('融合');
      if (card.type & 128) tags.push('儀式');
      if (card.type & 8192) tags.push('シンクロ');
      if (card.type & 8388608) tags.push('エクシーズ');
      if (card.type & 67108864) tags.push('リンク');

      // 2. 灵摆特性
      if (card.type & 16777216) tags.push('ペンデュラム');

      // 3. 复合怪兽特性
      if (card.type & 33554432) tags.push('特殊召喚');
      if (card.type & 4194304) tags.push('トゥーン');
      if (card.type & 512) tags.push('スピリット');
      if (card.type & 1024) tags.push('ユニオン');
      if (card.type & 2048) tags.push('デュアル');
      if (card.type & 2097152) tags.push('リバース');
      if (card.type & 4096) tags.push('チューナー');

      // 4. 结尾标头 (トークン / 効果 / 通常)
      if (card.type & 16384) {
        tags.push('トークン');
      } else if (card.type & 32) {
        tags.push('効果');
      } else if ((card.type & 16) || (card.type & 1)) {
        tags.push('通常');
      } else {
        tags.push('効果');
      }

      return `【${tags.join('／')}】`;
    }

    const raceMap = {
      1: '战士族', 2: '魔法师族', 4: '天使族', 8: '恶魔族', 16: '不死族',
      32: '机械族', 64: '水族', 128: '炎族', 256: '岩石族', 512: '鸟兽族',
      1024: '植物族', 2048: '昆虫族', 4096: '雷族', 8192: '龙族', 16384: '兽族',
      32768: '兽战士族', 65536: '恐龙族', 131072: '鱼族', 262144: '海龙族',
      524288: '爬虫族', 1048576: '念动力族', 2097152: '幻神兽族', 4194304: '幻龙族',
      8388608: '电子界族', 16777216: '幻想魔族', 33554432: '创造神族'
    };
    const race = raceMap[card.race] || '战士族';

    const tags = [race];

    // 1. 主召唤类别 (融合/仪式/同调/超量/连接)
    if (card.type & 64) tags.push('融合');
    if (card.type & 128) tags.push('仪式');
    if (card.type & 8192) tags.push('同调');
    if (card.type & 8388608) tags.push('超量');
    if (card.type & 67108864) tags.push('连接');

    // 2. 灵摆特性 (半怪兽半魔陷)
    if (card.type & 16777216) tags.push('灵摆');

    // 3. 复合怪兽特性（支持多个同时并存）
    if (card.type & 33554432) tags.push('特殊召唤'); // 0x2000000 TYPE_SPSUMMON
    if (card.type & 4194304) tags.push('卡通');      // 0x400000 TYPE_TOON
    if (card.type & 512) tags.push('灵魂');          // 0x200 TYPE_SPIRIT
    if (card.type & 1024) tags.push('同盟');         // 0x400 TYPE_UNION
    if (card.type & 2048) tags.push('二重');         // 0x800 TYPE_DUAL
    if (card.type & 2097152) tags.push('反转');      // 0x200000 TYPE_FLIP
    if (card.type & 4096) tags.push('调整');         // 0x1000 TYPE_TUNER

    // 4. 结尾标头 (衍生物 / 效果 / 通常)
    if (card.type & 16384) {
      tags.push('衍生物');
    } else if (card.type & 32) {
      tags.push('效果');
    } else if ((card.type & 16) || (card.type & 1)) {
      tags.push('通常');
    } else {
      tags.push('效果');
    }

    return this.toYgoText(`【${tags.join('／')}】`);
  }

  /**
   * 8. 怪兽攻守数值与官方标尺 (atk-def.svg / ygo-atk-def)
   */
  async drawStats(ctx, card) {
    const isLink = !!(card.type & 67108864);
    const barFile = isLink ? 'atk-link.svg' : 'atk-def.svg';
    const barImg = await this.loadImage(`${this.baseImage}/${barFile}`);

    // 绘制官方底栏标尺线
    if (barImg) {
      ctx.drawImage(barImg, 109, 1844, 1175, 52);
    }

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';

    // ATK 数值 - 基线精确对齐官方标尺 (y = 1895)
    // 攻守数字必须保持半角 ASCII，以完全匹配 AtkDef.ttf 官方黑体字形
    const atkVal = card.atk === -1 ? '?' : (card.atk >= 0 ? card.atk : 0);
    ctx.font = 'bold 64px "ygo-matrix", "ygo-atk-def", "AtkDef", Consolas, monospace';
    ctx.fillText(String(atkVal), 999, 1895);

    if (isLink) {
      // LINK 阶级
      const linkVal = card.level || 1;
      ctx.font = 'bold 52px "ygo-matrix", "ygo-link", "AtkDef", Consolas, monospace';
      ctx.fillText(String(linkVal), 1280, 1895);

      // 绘制 8 方向连接箭头 (默认高亮 Link 箭头)
      await this.drawLinkArrows(ctx, card);
    } else {
      // DEF 数值
      const defVal = card.def === -1 ? '?' : (card.def >= 0 ? card.def : 0);
      ctx.font = 'bold 64px "ygo-matrix", "ygo-atk-def", "AtkDef", Consolas, monospace';
      ctx.fillText(String(defVal), 1282, 1895);
    }

    ctx.restore();
  }

  async drawLinkArrows(ctx, card) {
    const arrowMap = [
      { id: 1, dir: 'top', x: 555, y: 278, on: 'arrow-up-on.png', off: 'arrow-up-off.png' },
      { id: 2, dir: 'top-right', x: 1130, y: 299, on: 'arrow-right-up-on.png', off: 'arrow-right-up-off.png' },
      { id: 3, dir: 'right', x: 1223, y: 761, on: 'arrow-right-on.png', off: 'arrow-right-off.png' },
      { id: 4, dir: 'bottom-right', x: 1130, y: 1336, on: 'arrow-right-down-on.png', off: 'arrow-right-down-off.png' },
      { id: 5, dir: 'bottom', x: 555, y: 1428, on: 'arrow-down-on.png', off: 'arrow-down-off.png' },
      { id: 6, dir: 'bottom-left', x: 95, y: 1336, on: 'arrow-left-down-on.png', off: 'arrow-left-down-off.png' },
      { id: 7, dir: 'left', x: 71, y: 758, on: 'arrow-left-on.png', off: 'arrow-left-off.png' },
      { id: 8, dir: 'top-left', x: 95, y: 299, on: 'arrow-left-up-on.png', off: 'arrow-left-up-off.png' },
    ];

    let activeArrows = card.linkArrows || [4, 5, 6];
    if (typeof activeArrows === 'number') {
      const mask = activeArrows;
      activeArrows = [];
      if (mask & 0x040) activeArrows.push(8);
      if (mask & 0x080) activeArrows.push(1);
      if (mask & 0x100) activeArrows.push(2);
      if (mask & 0x008) activeArrows.push(7);
      if (mask & 0x020) activeArrows.push(3);
      if (mask & 0x001) activeArrows.push(6);
      if (mask & 0x002) activeArrows.push(5);
      if (mask & 0x004) activeArrows.push(4);
    }

    for (const arr of arrowMap) {
      const isActive = activeArrows.includes(arr.id) || activeArrows.includes(arr.dir) || activeArrows.includes(String(arr.id));
      const file = isActive ? arr.on : arr.off;
      const img = await this.loadImage(`${this.baseImage}/${file}`);
      if (img) {
        ctx.drawImage(img, arr.x, arr.y);
      }
    }
  }

  /**
   * 9. 绘制卡密、全息防伪镭射标签 (laser1.png) 与版权信息
   */
  async drawBottomDetails(ctx, card) {
    const isXyz = !!(card.type & 8388608);
    const isJa = this.isJapanese(card);
    const textColor = isXyz ? '#ffffff' : '#000000';

    ctx.save();
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'alphabetic';

    // 左下角官方卡密密码 (8 位数字，官方字体 ygo-cardkey)
    const cardId = String(card.id || '00000000').padStart(8, '0');
    ctx.font = '40px "ygo-cardkey", "ygo-password", "AtkDef", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(cardId, 66, 1968);

    // 右下角版权印记 (使用系统无衬线字库确保 © 字符完美渲染)
    ctx.font = '24px Arial, "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = isXyz ? '#cbd5e1' : '#475569';
    ctx.textAlign = 'right';
    const copyrightText = isJa
      ? '©高橋和希 スタジオ・ダイス/集英社'
      : '©高桥和希 摄影工作室/集英社';
    ctx.fillText(copyrightText, 1240, 1968);

    // 右下角官方立体防伪镭射标签 (支持 YGOLD laser1~7 款式)
    const holoName = card.holoStyle || 'laser1';
    let laserImg = await this.loadImage(`${this.baseImage}/holo/${holoName}.png`);
    if (!laserImg) laserImg = await this.loadImage(`${this.baseImage}/${holoName}.png`);
    if (!laserImg) laserImg = await this.loadImage(`${this.baseImage}/laser1.png`);
    if (laserImg) {
      ctx.drawImage(laserImg, 1276, 1913, 72, 72);
    }

    ctx.restore();
  }

  /**
   * 绘制 YGOLD 规范卡包编号 (Pack Code, 如 BETB-JP028, ROTD-SC001)
   */
  drawPackCode(ctx, card) {
    const packCode = (card.packCode || '').trim();
    if (!packCode) return;

    ctx.save();
    const isXyz = !!(card.type & 8388608);
    const isLink = !!(card.type & 67108864);
    const isPendulum = !!(card.type & 16777216);

    ctx.font = '34px "ygo-cardkey", "AtkDef", Consolas, monospace';
    ctx.textBaseline = 'alphabetic';

    if (isPendulum) {
      // 灵摆卡官方 OCG 规范：卡包编号位于卡面左下方（怪兽效果框与攻守标尺左端：x=116, y=1895）
      ctx.fillStyle = isXyz ? '#cbd5e1' : '#000000';
      ctx.textAlign = 'left';
      ctx.fillText(packCode, 116, 1895);
    } else {
      // 非灵摆卡：卡包编号位于插画框右下方 (x=1224, y=1472)
      ctx.fillStyle = (isXyz || isLink) ? '#cbd5e1' : '#000000';
      ctx.textAlign = 'right';
      ctx.fillText(packCode, 1224, 1472);
    }

    ctx.restore();
  }

  /**
   * 绘制 YGOLD 官方防伪与限定纪念水印 (20th / 25th / 10000 / DIY / sample / star)
   */
  async drawWatermark(ctx, card) {
    const wm = (card.watermark || 'none').trim();
    if (!wm || wm === 'none') return;

    const wmImg = await this.loadImage(`${this.baseImage}/watermark/${wm}.png`);
    if (wmImg) {
      ctx.save();
      const alpha = card.watermarkOpacity !== undefined ? Number(card.watermarkOpacity) : 0.22;
      ctx.globalAlpha = Math.min(Math.max(alpha, 0.05), 1.0);
      ctx.drawImage(wmImg, 0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);
      ctx.restore();
    }
  }

  /**
   * 绘制 YGOLD 官方罕贵度闪膜与工艺特效 (全套 14 款罕贵度 + 灵摆/连接上下文异构自适应 + 顶层立体金属边框覆层)
   * 支持: UR, SER, PSER, PSER2, CR, HR, MR, KC, GR, GSER, ESR, DT, NPR, PP
   */
  async drawRareFoil(ctx, card) {
    const rawRare = (card.rare || 'none').trim().toUpperCase();
    if (!rawRare || rawRare === 'NONE') return;

    const isPendulum = !!(card.type & 16777216);
    const isLink = !!(card.type & 67108864);
    const isOverframe = !!card.isOverframe;

    let effectiveRare = rawRare;
    if (rawRare === '20TH') effectiveRare = 'PSER2';
    else if (rawRare === 'BLUE') effectiveRare = 'SER';

    let baseFoilFile = null;
    let frontFoilFile = null;

    if (effectiveRare === 'DT') {
      frontFoilFile = 'DT.png';
    } else if (effectiveRare === 'NPR') {
      frontFoilFile = 'NPR.png';
    } else if (effectiveRare === 'PP') {
      baseFoilFile = isPendulum ? 'PSER_print_P.png' : (isLink ? 'PSER_print_LINK.png' : 'PSER_print.png');
      if (isPendulum) frontFoilFile = 'PSER_print_P_front.png';
    } else {
      baseFoilFile = isPendulum ? `${effectiveRare}_P.png` : (isLink ? `${effectiveRare}_LINK.png` : `${effectiveRare}.png`);
      // YGOLD 原生 front 边框图层严格对照表 (UR/GR 等无额外内边框，SER/CR/PSER 等具备金属反光内框)
      if (isPendulum) {
        if (['CR', 'ESR', 'GR', 'GSER', 'HR', 'KC', 'MR', 'PSER', 'PSER2'].includes(effectiveRare)) {
          frontFoilFile = `${effectiveRare}_P_front.png`;
        }
      } else {
        if (['CR', 'ESR', 'GSER', 'HR', 'KC', 'MR', 'PSER', 'PSER2', 'SER'].includes(effectiveRare)) {
          frontFoilFile = `${effectiveRare}_front.png`;
        }
      }
    }

    const foilOpacity = card.rareOpacity !== undefined ? Number(card.rareOpacity) : 0.65;

    // 1. 绘制底层闪膜特效纹理
    if (baseFoilFile) {
      let baseImg = await this.loadImage(`${this.baseImage}/rare/${baseFoilFile}`);
      if (!baseImg && baseFoilFile.includes('_')) {
        // 若异画变体未命中，平滑降级至标准版
        baseImg = await this.loadImage(`${this.baseImage}/rare/${rawRare}.png`);
      }
      if (baseImg) {
        ctx.save();
        ctx.globalAlpha = Math.min(Math.max(foilOpacity, 0.1), 1.0);
        ctx.drawImage(baseImg, 0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);
        ctx.restore();
      }
    }

    // 2. 绘制顶层立体金属边框覆层 (非出框全画模式下生效，避免标准内框切割出框怪兽插画)
    if (!isOverframe && frontFoilFile) {
      const frontImg = await this.loadImage(`${this.baseImage}/rare/${frontFoilFile}`);
      if (frontImg) {
        ctx.save();
        ctx.globalAlpha = Math.min(1.0, foilOpacity * 1.3);
        ctx.drawImage(frontImg, 0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);
        ctx.restore();
      }
    }
  }

  /**
   * 导出为高清 PNG Blob (支持 toBlob + toDataURL 双保险降级)
   */
  async exportBlob(canvas) {
    if (canvas && typeof canvas.convertToBlob === 'function') {
      try {
        return await canvas.convertToBlob({ type: 'image/png' });
      } catch (e) {
        console.warn('convertToBlob failed, fallback:', e);
      }
    }
    return new Promise((resolve) => {
      try {
        if (canvas.toBlob) {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              this.fallbackDataUrlBlob(canvas, resolve);
            }
          }, 'image/png');
        } else {
          this.fallbackDataUrlBlob(canvas, resolve);
        }
      } catch (err) {
        this.fallbackDataUrlBlob(canvas, resolve);
      }
    });
  }

  fallbackDataUrlBlob(canvas, resolve) {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const binStr = atob(dataUrl.split(',')[1]);
      const len = binStr.length;
      const arr = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
      }
      resolve(new Blob([arr], { type: 'image/png' }));
    } catch (e) {
      console.error('[CardRenderer] DataURL fallback failed:', e);
      resolve(null);
    }
  }

  /**
   * 离屏极清渲染（支持 1x 标清 / 2x 4K 极清超采样）
   */
  async renderOffscreen(cardData, uploadedImg = null, renderScale = 2) {
    let offscreen;
    if (typeof OffscreenCanvas !== 'undefined') {
      offscreen = new OffscreenCanvas(Math.round(this.CARD_WIDTH * renderScale), Math.round(this.CARD_HEIGHT * renderScale));
    } else {
      offscreen = document.createElement('canvas');
      offscreen.width = Math.round(this.CARD_WIDTH * renderScale);
      offscreen.height = Math.round(this.CARD_HEIGHT * renderScale);
    }
    await this.render(offscreen, cardData, uploadedImg, renderScale);
    return offscreen;
  }
}

window.CardRenderer = CardRenderer;
