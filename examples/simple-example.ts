import { YuGiOhCardCreator } from '../src/index.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config();

async function main() {
  // 检查 API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not set in .env file');
    process.exit(1);
  }

  const creator = new YuGiOhCardCreator(process.env.OPENAI_API_KEY);

  console.log('========================================');
  console.log('游戏王 AI 制卡器示例');
  console.log('========================================\n');

  // 示例1: 创建单张怪兽卡
  console.log('示例 1: 创建一张龙族怪兽卡\n');
  try {
    const result = await creator.createCard(
      {
        prompt: '创造一只攻击力2500的暗属性龙族怪兽，具有破坏魔法陷阱的能力',
        cardType: 'monster',
        theme: '暗黑龙',
        startId: 100000001
      },
      {
        // 如果有自定义图片，可以指定路径
        // imagePath: './artwork/dragon.png'
      },
      path.join(__dirname, '../workspace/example1')
    );

    console.log('✅ 卡片创建成功！');
    console.log(`   ID: ${result.card.id}`);
    console.log(`   名称: ${result.card.name}`);
    console.log(`   ATK: ${result.card.atk} / DEF: ${result.card.def}`);
    console.log(`   效果: ${result.card.description.substring(0, 50)}...`);
    console.log(`   数据库: ${result.cdbPath}`);
    console.log(`   图片: ${result.imagePath}\n`);
  } catch (error) {
    console.error('创建卡片失败:', error);
  }

  // 示例2: 批量创建魔法卡
  console.log('示例 2: 批量创建魔法卡系列\n');
  try {
    const batchResult = await creator.createCardBatch(
      {
        prompt: '创建一个"星光"主题的魔法卡系列，包含快速魔法和装备魔法',
        cardType: 'spell',
        theme: '星光',
        startId: 100000010
      },
      3, // 创建3张卡
      {},
      path.join(__dirname, '../workspace/example2')
    );

    console.log('✅ 批量创建成功！');
    console.log(`   创建数量: ${batchResult.cards.length}`);
    console.log('   卡片列表:');
    batchResult.cards.forEach(card => {
      console.log(`   - ${card.id}: ${card.name}`);
    });
    console.log(`   数据库: ${batchResult.cdbPath}`);
    console.log(`   图片目录: ${path.dirname(batchResult.imagePaths[0])}\n`);
  } catch (error) {
    console.error('批量创建失败:', error);
  }

  console.log('========================================');
  console.log('示例运行完成！');
  console.log('========================================');
}

main().catch(console.error);
