import initSqlJs, { Database } from 'sql.js';
import { CardData, CardType } from './types.js';
import { readFile, writeFile } from 'fs/promises';

export class CDBManager {
  private db: Database | null = null;

  async createDatabase(filePath: string): Promise<void> {
    const SQL = await initSqlJs();
    this.db = new SQL.Database();

    // 创建 datas 表（卡片基本信息）
    this.db.run(`
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

    // 创建 texts 表（卡片文本信息）
    this.db.run(`
      CREATE TABLE texts (
        id INTEGER PRIMARY KEY,
        name TEXT,
        desc TEXT,
        str1 TEXT,
        str2 TEXT,
        str3 TEXT,
        str4 TEXT,
        str5 TEXT,
        str6 TEXT,
        str7 TEXT,
        str8 TEXT,
        str9 TEXT,
        str10 TEXT,
        str11 TEXT,
        str12 TEXT,
        str13 TEXT,
        str14 TEXT,
        str15 TEXT,
        str16 TEXT
      )
    `);

    await this.saveDatabase(filePath);
  }

  async loadDatabase(filePath: string): Promise<void> {
    const SQL = await initSqlJs();
    const buffer = await readFile(filePath);
    this.db = new SQL.Database(buffer);
  }

  async saveDatabase(filePath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const data = this.db.export();
    await writeFile(filePath, Buffer.from(data));
  }

  addCard(card: CardData): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // 插入基本数据
    const level = this.calculateLevel(card);
    
    this.db.run(
      `INSERT INTO datas (id, ot, alias, setcode, type, atk, def, level, race, attribute, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.id,
        3, // OCG + TCG
        0, // 无别名
        0, // 无系列代码
        card.type,
        card.atk ?? 0,
        card.def ?? 0,
        level,
        card.race,
        card.attribute ?? 0,
        0
      ]
    );

    // 插入文本数据
    const description = card.pendulumEffect 
      ? `[ Pendulum Effect ]\n${card.pendulumEffect}\n[ Monster Effect ]\n${card.description}`
      : card.description;

    this.db.run(
      `INSERT INTO texts (id, name, desc) VALUES (?, ?, ?)`,
      [card.id, card.name, description]
    );
  }

  addCards(cards: CardData[]): void {
    for (const card of cards) {
      this.addCard(card);
    }
  }

  getCard(id: number): CardData | null {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.exec(
      `SELECT d.*, t.name, t.desc 
       FROM datas d 
       JOIN texts t ON d.id = t.id 
       WHERE d.id = ?`,
      [id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    return this.rowToCard(row);
  }

  getAllCards(): CardData[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.exec(
      `SELECT d.*, t.name, t.desc 
       FROM datas d 
       JOIN texts t ON d.id = t.id 
       ORDER BY d.id`
    );

    if (result.length === 0) {
      return [];
    }

    return result[0].values.map(row => this.rowToCard(row));
  }

  private calculateLevel(card: CardData): number {
    // 对于灵摆怪兽，level字段编码: scale(左16位) | level(右16位)
    if (card.type & CardType.PENDULUM && card.scale !== undefined) {
      return (card.scale << 16) | (card.level || 0);
    }
    return card.level || 0;
  }

  private rowToCard(row: any[]): CardData {
    const [id, ot, alias, setcode, type, atk, def, level, race, attribute, category, name, desc] = row;
    
    const card: CardData = {
      id: id as number,
      name: name as string,
      type: type as CardType,
      race: race as number,
      description: desc as string
    };

    if (type & CardType.MONSTER) {
      card.attribute = attribute as number;
      card.atk = atk as number;
      card.def = def as number;
      
      // 解码灵摆怪兽的等级和刻度
      if (type & CardType.PENDULUM) {
        card.scale = (level >> 16) & 0xFFFF;
        card.level = level & 0xFFFF;
      } else {
        card.level = level as number;
      }
    }

    return card;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
