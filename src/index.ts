import { AICardGenerator } from './ai-generator.js';
import { CDBManager } from './cdb-manager.js';
import { CardImageGenerator } from './image-generator.js';
import { CardData, AICardRequest, CardImageOptions } from './types.js';
import { mkdir } from 'fs/promises';
import path from 'path';

export class YuGiOhCardCreator {
  private aiGenerator: AICardGenerator;
  private cdbManager: CDBManager;
  private imageGenerator: CardImageGenerator;

  constructor(openaiApiKey?: string) {
    this.aiGenerator = new AICardGenerator(openaiApiKey);
    this.cdbManager = new CDBManager();
    this.imageGenerator = new CardImageGenerator();
  }

  /**
   * 创建单张AI生成的卡片，包含数据库和图片
   */
  async createCard(
    request: AICardRequest,
    imageOptions: CardImageOptions,
    workspaceDir: string
  ): Promise<{ card: CardData; imagePath: string; cdbPath: string }> {
    // 确保工作目录存在
    await mkdir(workspaceDir, { recursive: true });
    await mkdir(path.join(workspaceDir, 'images'), { recursive: true });

    // 生成卡片数据
    console.log('Generating card data with AI...');
    const card = await this.aiGenerator.generateCard(request);

    // 创建 CDB 数据库
    const cdbPath = path.join(workspaceDir, `${card.id}.cdb`);
    console.log('Creating card database...');
    await this.cdbManager.createDatabase(cdbPath);
    this.cdbManager.addCard(card);
    await this.cdbManager.saveDatabase(cdbPath);
    this.cdbManager.close();

    // 生成卡片图片
    console.log('Generating card image...');
    const imagePath = path.join(workspaceDir, 'images', `${card.id}_${card.name}.png`);
    await this.imageGenerator.generateCardImage(card, imageOptions, imagePath);

    return { card, imagePath, cdbPath };
  }

  /**
   * 批量创建AI生成的卡片
   */
  async createCardBatch(
    request: AICardRequest,
    count: number,
    imageOptions: CardImageOptions,
    workspaceDir: string
  ): Promise<{
    cards: CardData[];
    imagePaths: string[];
    cdbPath: string;
  }> {
    // 确保工作目录存在
    await mkdir(workspaceDir, { recursive: true });
    await mkdir(path.join(workspaceDir, 'images'), { recursive: true });

    // 生成多张卡片数据
    console.log(`Generating ${count} cards with AI...`);
    const cards = await this.aiGenerator.generateMultipleCards(request, count);

    // 创建 CDB 数据库并添加所有卡片
    const cdbPath = path.join(workspaceDir, 'cards.cdb');
    console.log('Creating card database...');
    await this.cdbManager.createDatabase(cdbPath);
    this.cdbManager.addCards(cards);
    await this.cdbManager.saveDatabase(cdbPath);
    this.cdbManager.close();

    // 生成所有卡片图片
    console.log('Generating card images...');
    const imagePaths = await this.imageGenerator.generateMultipleCardImages(
      cards,
      imageOptions,
      path.join(workspaceDir, 'images')
    );

    return { cards, imagePaths, cdbPath };
  }

  /**
   * 从现有卡片数据生成图片
   */
  async generateImageForExistingCard(
    card: CardData,
    imageOptions: CardImageOptions,
    outputPath: string
  ): Promise<string> {
    return await this.imageGenerator.generateCardImage(card, imageOptions, outputPath);
  }

  /**
   * 从 CDB 文件加载卡片并生成图片
   */
  async loadAndGenerateImages(
    cdbPath: string,
    imageOptions: CardImageOptions,
    outputDir: string
  ): Promise<string[]> {
    await mkdir(outputDir, { recursive: true });

    await this.cdbManager.loadDatabase(cdbPath);
    const cards = this.cdbManager.getAllCards();
    this.cdbManager.close();

    return await this.imageGenerator.generateMultipleCardImages(
      cards,
      imageOptions,
      outputDir
    );
  }
}

// 导出所有类型和类
export * from './types.js';
export { AICardGenerator } from './ai-generator.js';
export { CDBManager } from './cdb-manager.js';
export { CardImageGenerator } from './image-generator.js';
