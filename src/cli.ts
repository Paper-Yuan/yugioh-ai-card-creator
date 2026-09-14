#!/usr/bin/env node
import { Command } from 'commander';
import { YuGiOhCardCreator } from './index.js';
import { AICardRequest, CardImageOptions } from './types.js';
import path from 'path';

const program = new Command();

program
  .name('yugioh-card-creator')
  .description('AI-powered Yu-Gi-Oh! card creator with custom card face generation')
  .version('1.0.0');

program
  .command('create')
  .description('Create a single card with AI')
  .requiredOption('-p, --prompt <text>', 'Card creation prompt')
  .option('-t, --type <type>', 'Card type (monster/spell/trap)')
  .option('-i, --image <path>', 'Custom card artwork image path')
  .option('-u, --image-url <url>', 'Custom card artwork image URL')
  .option('-o, --output <dir>', 'Output directory', './workspace')
  .option('--id <number>', 'Card ID (default: auto-generated)', parseInt)
  .option('--theme <text>', 'Card theme')
  .action(async (options) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('Error: OPENAI_API_KEY environment variable not set');
        process.exit(1);
      }

      const creator = new YuGiOhCardCreator(apiKey);

      const request: AICardRequest = {
        prompt: options.prompt,
        cardType: options.type,
        theme: options.theme,
        startId: options.id || Math.floor(Math.random() * 900000000) + 100000000
      };

      const imageOptions: CardImageOptions = {
        imagePath: options.image,
        imageUrl: options.imageUrl
      };

      console.log('Creating card...');
      const result = await creator.createCard(
        request,
        imageOptions,
        path.resolve(options.output)
      );

      console.log('\n✅ Card created successfully!');
      console.log(`   ID: ${result.card.id}`);
      console.log(`   Name: ${result.card.name}`);
      console.log(`   Database: ${result.cdbPath}`);
      console.log(`   Image: ${result.imagePath}`);
    } catch (error) {
      console.error('Error creating card:', error);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Create multiple cards with AI')
  .requiredOption('-p, --prompt <text>', 'Card creation prompt')
  .requiredOption('-n, --count <number>', 'Number of cards to create', parseInt)
  .option('-t, --type <type>', 'Card type (monster/spell/trap)')
  .option('-i, --image <path>', 'Default card artwork image path')
  .option('-o, --output <dir>', 'Output directory', './workspace')
  .option('--start-id <number>', 'Starting card ID', parseInt)
  .option('--theme <text>', 'Card theme')
  .action(async (options) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('Error: OPENAI_API_KEY environment variable not set');
        process.exit(1);
      }

      const creator = new YuGiOhCardCreator(apiKey);

      const request: AICardRequest = {
        prompt: options.prompt,
        cardType: options.type,
        theme: options.theme,
        startId: options.startId || Math.floor(Math.random() * 900000000) + 100000000
      };

      const imageOptions: CardImageOptions = {
        imagePath: options.image
      };

      console.log(`Creating ${options.count} cards...`);
      const result = await creator.createCardBatch(
        request,
        options.count,
        imageOptions,
        path.resolve(options.output)
      );

      console.log('\n✅ Cards created successfully!');
      console.log(`   Count: ${result.cards.length}`);
      console.log(`   Database: ${result.cdbPath}`);
      console.log(`   Images: ${result.imagePaths.length} files in ${path.join(options.output, 'images')}`);
      console.log('\nCreated cards:');
      result.cards.forEach(card => {
        console.log(`   - ${card.id}: ${card.name}`);
      });
    } catch (error) {
      console.error('Error creating cards:', error);
      process.exit(1);
    }
  });

program
  .command('generate-images')
  .description('Generate images for existing cards in a CDB file')
  .requiredOption('-c, --cdb <path>', 'Path to CDB file')
  .option('-i, --image <path>', 'Default card artwork image path')
  .option('-o, --output <dir>', 'Output directory for images', './images')
  .action(async (options) => {
    try {
      const creator = new YuGiOhCardCreator();

      const imageOptions: CardImageOptions = {
        imagePath: options.image
      };

      console.log('Loading cards from database and generating images...');
      const imagePaths = await creator.loadAndGenerateImages(
        path.resolve(options.cdb),
        imageOptions,
        path.resolve(options.output)
      );

      console.log('\n✅ Images generated successfully!');
      console.log(`   Generated ${imagePaths.length} card images`);
      console.log(`   Output: ${path.resolve(options.output)}`);
    } catch (error) {
      console.error('Error generating images:', error);
      process.exit(1);
    }
  });

program.parse();
