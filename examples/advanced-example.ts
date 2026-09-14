import { YuGiOhCardCreator, AICardGenerator, CDBManager, CardImageGenerator } from '../src/index.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not set');
    process.exit(1);
  }

  console.log('========================================');
  console.log('高级示例：分步创建卡片');
  console.log('========================================\n');

  // 步骤 1: 使用 AI 生成器单独生成卡片数据
  console.log('步骤 1: 生成卡片数据...\n');
  const aiGenerator = new AICardGenerator(process.env.OPENAI_API_KEY);
  
  const cardData = await aiGenerator.generateCard({
    prompt: '创建一张融合怪兽，需要2只龙族怪兽作为融合素材，攻击力3000',
    cardType: 'monster',
    theme: '究极龙',
    startId: 100000100
  });

  console.log('✅ 卡片数据生成完成：');
  console.log(`   名称: ${cardData.name}`);
  console.log(`   类型: ${cardData.type}`);
  console.log(`   攻击力: ${cardData.atk}`);
  console.log(`   效果: ${cardData.description}\n`);

  // 步骤 2: 创建 CDB 数据库
  console.log('步骤 2: 创建数据库...\n');
  const cdbManager = new CDBManager();
  const cdbPath = path.join(__dirname, '../workspace/advanced/cards.cdb');
  
  await cdbManager.createDatabase(cdbPath);
  cdbManager.addCard(cardData);
  await cdbManager.saveDatabase(cdbPath);
  
  console.log('✅ 数据库创建完成：');
  console.log(`   路径: ${cdbPath}\n`);
  
  // 验证数据库
  const loadedCard = cdbManager.getCard(cardData.id);
  console.log('   验证：从数据库读取卡片');
  console.log(`   ID: ${loadedCard?.id}`);
  console.log(`   名称: ${loadedCard?.name}\n`);
  
  cdbManager.close();

  // 步骤 3: 生成卡片图片
  console.log('步骤 3: 生成卡片图片...\n');
  const imageGenerator = new CardImageGenerator();
  const imagePath = path.join(__dirname, '../workspace/advanced/images', `${cardData.id}_${cardData.name}.png`);
  
  await imageGenerator.generateCardImage(
    cardData,
    {
      // 可以添加自定义图片
      // imagePath: './custom-artwork.png'
    },
    imagePath
  );

  console.log('✅ 图片生成完成：');
  console.log(`   路径: ${imagePath}\n`);

  // 步骤 4: 批量生成并组合
  console.log('步骤 4: 批量生成额外卡片...\n');
  const additionalCards = await aiGenerator.generateMultipleCards(
    {
      prompt: '创建"究极龙"系列的支援卡，包括魔法和陷阱',
      startId: 100000101
    },
    5
  );

  console.log(`✅ 生成了 ${additionalCards.length} 张额外卡片：`);
  additionalCards.forEach((card, index) => {
    console.log(`   ${index + 1}. ${card.name} (ID: ${card.id})`);
  });

  // 将额外卡片添加到数据库
  await cdbManager.loadDatabase(cdbPath);
  cdbManager.addCards(additionalCards);
  await cdbManager.saveDatabase(cdbPath);
  cdbManager.close();

  console.log('\n✅ 所有卡片已添加到数据库');

  // 生成所有卡片的图片
  const allImagePaths = await imageGenerator.generateMultipleCardImages(
    additionalCards,
    {},
    path.join(__dirname, '../workspace/advanced/images')
  );

  console.log(`✅ 生成了 ${allImagePaths.length} 张图片\n`);

  console.log('========================================');
  console.log('高级示例完成！');
  console.log(`总计: ${additionalCards.length + 1} 张卡片`);
  console.log('========================================');
}

main().catch(console.error);
