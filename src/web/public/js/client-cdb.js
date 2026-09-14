/**
 * 客户端 YGOPro / MDPro3 CDB (SQLite) 数据库构建与卡密冲突分析引擎
 * 使用 WebAssembly sql.js 直接在浏览器/WebView 内操作官方兼容的 .cdb 文件
 */
class ClientCDBManager {
  constructor() {
    this.SQL = null;
    // 已占用卡密索引表：Map<id, cardName>
    this.occupiedPasscodes = new Map();
    this.isPoolLoaded = false;
    this.poolSourceInfo = '未加载外部卡池';
  }

  async init() {
    if (this.SQL) return;
    if (typeof window.initSqlJs !== 'function') {
      throw new Error('WebAssembly sql.js 未正确加载');
    }
    this.SQL = await window.initSqlJs({
      locateFile: file => `./libs/${file}`
    });
  }

  /**
   * 为单张卡片生成完整的 .cdb 数据库二进制 Uint8Array
   */
  async buildCdbBuffer(cardData, effectStrings = []) {
    return this.buildMergedCdbBuffer([cardData]);
  }

  /**
   * 为多张卡片生成统一合并的 .cdb 数据库二进制 Uint8Array (用于整套卡包工程与 MDPro3)
   */
  async buildMergedCdbBuffer(cardsList = []) {
    await this.init();
    const db = new this.SQL.Database();

    // 1. 创建 YGOPro datas 表
    db.run(`
      CREATE TABLE datas (
        id INTEGER PRIMARY KEY,
        ot INTEGER,
        alias INTEGER,
        setcode INTEGER,
        type INTEGER,
        atk INTEGER,
        def INTEGER,
        level INTEGER,
        race INTEGER,
        attribute INTEGER,
        category INTEGER
      )
    `);

    // 2. 创建 YGOPro texts 表
    db.run(`
      CREATE TABLE texts (
        id INTEGER PRIMARY KEY,
        name TEXT,
        desc TEXT,
        str1 TEXT, str2 TEXT, str3 TEXT, str4 TEXT,
        str5 TEXT, str6 TEXT, str7 TEXT, str8 TEXT,
        str9 TEXT, str10 TEXT, str11 TEXT, str12 TEXT,
        str13 TEXT, str14 TEXT, str15 TEXT, str16 TEXT
      )
    `);

    // 3. 循环插入卡片
    for (const cardData of cardsList) {
      if (!cardData) continue;
      const cardId = parseInt(cardData.id) || 100000001;

      // 等级与灵摆刻度计算（如果是灵摆怪兽，高16位为刻度，低16位为等级）
      let levelCode = parseInt(cardData.level) || 0;
      if (cardData.scale !== undefined && cardData.scale !== null) {
        levelCode = ((parseInt(cardData.scale) & 0xFFFF) << 16) | (levelCode & 0xFFFF);
      }

      // 字段 setcode 计算：支持十六进制 0x... 与十进制整数
      let setcode = 0;
      if (cardData.setcode !== undefined && cardData.setcode !== null && cardData.setcode !== '') {
        setcode = typeof cardData.setcode === 'string' && cardData.setcode.startsWith('0x')
          ? parseInt(cardData.setcode, 16)
          : parseInt(cardData.setcode) || 0;
      }

      // 写入 datas
      db.run(
        `INSERT OR REPLACE INTO datas VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cardId,
          3, // OCG + TCG
          0, // alias
          setcode,
          cardData.type || 33,
          cardData.atk ?? 0,
          cardData.def ?? 0,
          levelCode,
          cardData.race || 1,
          cardData.attribute ?? 0,
          cardData.category ?? 0
        ]
      );

      // 处理灵摆与怪兽双描述 (支持日文 OCG 导出)
      const isJa = cardData.language === 'ja';
      let fullDesc = (isJa && cardData.jaDescription) ? cardData.jaDescription : (cardData.description || '');
      if (cardData.type & 16777216) {
        const pen = (isJa && cardData.jaPendulumDescription) 
          ? cardData.jaPendulumDescription 
          : (cardData.pendulumDescription || (typeof cardData.pendulumEffect === 'string' ? cardData.pendulumEffect : ''));
        if (pen && !fullDesc.includes('【ペンデュラム効果】') && !fullDesc.includes('【灵摆效果】')) {
          fullDesc = isJa
            ? `【ペンデュラム効果】\n${pen}\n【モンスター効果】\n${fullDesc}`
            : `【灵摆效果】\n${pen}\n【怪兽效果】\n${fullDesc}`;
        }
      }

      // 提取 str1 ~ str16
      const effectList = cardData.effectStrings || [];
      const strParams = [];
      for (let i = 0; i < 16; i++) {
        strParams.push(effectList[i] || '');
      }

      // 写入 texts
      db.run(
        `INSERT OR REPLACE INTO texts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cardId, cardData.name || '', fullDesc, ...strParams]
      );
    }

    // 4. 导出二进制数据
    const binaryArray = db.export();
    db.close();

    return binaryArray;
  }

  /**
   * 读取并索引外部已有的 cards.cdb 文件二进制流 (支持本机 YGOPRO、MDPro3 或用户手动载入)
   */
  async loadCdbFromBuffer(buffer, sourceName = '外部卡池') {
    await this.init();
    try {
      const db = new this.SQL.Database(new Uint8Array(buffer));
      
      // 查询现存卡片 ID 与卡名
      const res = db.exec("SELECT id, name FROM texts WHERE id > 0");
      if (res && res.length > 0 && res[0].values) {
        let loadedCount = 0;
        for (const row of res[0].values) {
          const id = row[0];
          const name = row[1] || '未知卡片';
          this.occupiedPasscodes.set(Number(id), String(name));
          loadedCount++;
        }
        this.isPoolLoaded = true;
        this.poolSourceInfo = `${sourceName} (已索引 ${loadedCount} 张卡)`;
        console.log(`[CDBManager] 成功索引 ${loadedCount} 张卡片，来源: ${sourceName}`);
        db.close();
        return { success: true, count: loadedCount, source: sourceName };
      }
      db.close();
      return { success: false, error: '数据库中未找到有效卡片记录' };
    } catch (err) {
      console.error('[CDBManager] 无法解析 CDB 数据库:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * 实时检测卡密是否与原卡池或官方卡密发生碰撞
   */
  checkPasscodeConflict(passcode) {
    const id = parseInt(passcode);
    if (!id || isNaN(id) || id <= 0) {
      return { conflict: false };
    }

    // 1. 若外部卡池已载入，优先精确比对
    if (this.occupiedPasscodes.has(id)) {
      const existingName = this.occupiedPasscodes.get(id);
      return {
        conflict: true,
        source: 'local_pool',
        cardName: existingName,
        message: `卡密与原卡池卡片【${existingName}】(ID: ${id}) 冲突！进入游戏将导致原卡被覆盖`
      };
    }

    // 2. 若未载入外部卡池，根据官方 OCG/TCG 标准号段进行启发式预警
    if (id >= 10000 && id <= 99999999 && !this.isPoolLoaded) {
      return {
        conflict: false,
        warning: true,
        message: '提示：8位数字可能落在官方实卡编号区间内，建议载入本机 cards.cdb 比对或使用 9 位自制卡密'
      };
    }

    return { conflict: false };
  }

  /**
   * 自动分配一个未被任何原卡池或预设占用的绝对安全空闲卡密
   * @param {number} startId - 起始卡密
   * @param {Set<number>} [additionalAvoidSet] - 额外需要避开的已占用卡密集合（如其他 DIY 卡密）
   */
  suggestSafePasscode(startId = 100000001, additionalAvoidSet = null) {
    let candidate = parseInt(startId) || 100000001;
    if (candidate < 100000001) {
      candidate = 100000001;
    }
    // 寻找下一个完全未被原卡池或 DIY 集合占用的空闲 ID
    while (this.occupiedPasscodes.has(candidate) || (additionalAvoidSet && additionalAvoidSet.has(candidate))) {
      candidate++;
    }
    return candidate;
  }

  /**
   * 生成一个未被原卡池与 DIY 占用的随机安全卡密（默认 8 位官方编号，彻底排除已占用的 14,981 个原卡）
   */
  generateRandomSafePasscode(additionalAvoidSet = null) {
    let candidate;
    let attempts = 0;
    do {
      // 8 位正整数卡密: 10000000 ~ 99999999
      candidate = Math.floor(10000000 + Math.random() * 90000000);
      attempts++;
    } while ((this.occupiedPasscodes.has(candidate) || (additionalAvoidSet && additionalAvoidSet.has(candidate))) && attempts < 2000);

    if (attempts >= 2000) {
      // 若 8 位冲突严重，回退至 9 位专用安全区 (100000000+)
      candidate = this.suggestSafePasscode(100000001, additionalAvoidSet);
    }
    return candidate;
  }

  /**
   * 自动加载内置提炼的官方 YGOPro 14,981 张原卡密码与卡名表
   */
  async loadOfficialResources() {
    try {
      const resp = await fetch('./assets/yugioh/official-cardnames.json');
      if (resp.ok) {
        const namesMap = await resp.json();
        for (const id in namesMap) {
          this.occupiedPasscodes.set(Number(id), namesMap[id]);
        }
        this.isPoolLoaded = true;
        this.poolSourceInfo = `官方 YGOPro 原卡库 (已索引 ${this.occupiedPasscodes.size} 张卡)`;
        console.log(`[CDBManager] 已成功加载 ${this.occupiedPasscodes.size} 张官方实卡数据库黑名单`);
        return { success: true, count: this.occupiedPasscodes.size };
      }
    } catch (e) {
      console.warn('[CDBManager] 加载官方原卡库索引失败 (可能在独立环境运行):', e);
    }
    return { success: false };
  }
}

window.ClientCDBManager = ClientCDBManager;
