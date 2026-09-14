import { OpenAI } from 'openai';
import { CardData, CardType, Race, Attribute, AICardRequest } from './types.js';

export class AICardGenerator {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  async generateCard(request: AICardRequest): Promise<CardData> {
    const prompt = this.buildPrompt(request);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a Yu-Gi-Oh! card designer. Generate balanced, creative cards with proper OCG formatting. Return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const cardJson = JSON.parse(content);
    return this.parseCardData(cardJson, request.startId || 100000000);
  }

  async generateMultipleCards(request: AICardRequest, count: number): Promise<CardData[]> {
    const cards: CardData[] = [];
    const baseId = request.startId || 100000000;

    for (let i = 0; i < count; i++) {
      const card = await this.generateCard({
        ...request,
        startId: baseId + i
      });
      cards.push(card);
    }

    return cards;
  }

  private buildPrompt(request: AICardRequest): string {
    let prompt = `Generate a Yu-Gi-Oh! card based on: "${request.prompt}"\n\n`;
    
    if (request.cardType) {
      prompt += `Card type: ${request.cardType}\n`;
    }
    
    if (request.theme) {
      prompt += `Theme: ${request.theme}\n`;
    }

    prompt += `
Return a JSON object with this structure:
{
  "name": "Card Name",
  "cardType": "monster|spell|trap",
  "monsterType": "normal|effect|fusion|synchro|xyz|link|pendulum" (if monster),
  "race": "warrior|spellcaster|dragon|fiend|etc",
  "attribute": "light|dark|fire|water|earth|wind|divine" (if monster),
  "level": 4 (if monster, or rank/link rating),
  "atk": 1800 (if monster),
  "def": 1200 (if monster, or null for link),
  "spellTrapType": "normal|quick-play|continuous|equip|field|counter" (if spell/trap),
  "description": "Card effect text in OCG format",
  "pendulumEffect": "Pendulum effect text" (if pendulum),
  "scale": 5 (if pendulum)
}

Make sure effects are balanced and follow Yu-Gi-Oh! card text conventions.`;

    return prompt;
  }

  private parseCardData(json: any, id: number): CardData {
    const card: CardData = {
      id,
      name: json.name,
      type: this.parseCardType(json),
      race: this.parseRace(json.race),
      description: json.description
    };

    if (json.cardType === 'monster') {
      card.attribute = this.parseAttribute(json.attribute);
      card.level = json.level || 4;
      card.atk = json.atk ?? 0;
      card.def = json.def ?? 0;

      if (json.monsterType === 'pendulum' && json.pendulumEffect) {
        card.pendulumEffect = json.pendulumEffect;
        card.scale = json.scale || 0;
      }
    }

    return card;
  }

  private parseCardType(json: any): CardType {
    let type = 0;

    if (json.cardType === 'spell') {
      type = CardType.SPELL;
      const spellType = json.spellTrapType || 'normal';
      if (spellType === 'quick-play') type |= CardType.QUICKPLAY;
      else if (spellType === 'continuous') type |= CardType.CONTINUOUS;
      else if (spellType === 'equip') type |= CardType.EQUIP;
      else if (spellType === 'field') type |= CardType.FIELD;
    } else if (json.cardType === 'trap') {
      type = CardType.TRAP;
      const trapType = json.spellTrapType || 'normal';
      if (trapType === 'continuous') type |= CardType.CONTINUOUS;
      else if (trapType === 'counter') type |= CardType.COUNTER;
    } else {
      type = CardType.MONSTER;
      const monsterType = json.monsterType || 'effect';
      
      if (monsterType === 'normal') type |= CardType.NORMAL;
      else type |= CardType.EFFECT;
      
      if (monsterType === 'fusion') type |= CardType.FUSION;
      else if (monsterType === 'synchro') type |= CardType.SYNCHRO;
      else if (monsterType === 'xyz') type |= CardType.XYZ;
      else if (monsterType === 'link') type |= CardType.LINK;
      else if (monsterType === 'pendulum') type |= CardType.PENDULUM;
    }

    return type;
  }

  private parseRace(race: string): Race {
    const raceMap: { [key: string]: Race } = {
      'warrior': Race.WARRIOR,
      'spellcaster': Race.SPELLCASTER,
      'fairy': Race.FAIRY,
      'fiend': Race.FIEND,
      'zombie': Race.ZOMBIE,
      'machine': Race.MACHINE,
      'aqua': Race.AQUA,
      'pyro': Race.PYRO,
      'rock': Race.ROCK,
      'windbeast': Race.WINDBEAST,
      'plant': Race.PLANT,
      'insect': Race.INSECT,
      'thunder': Race.THUNDER,
      'dragon': Race.DRAGON,
      'beast': Race.BEAST,
      'beast-warrior': Race.BEASTWARRIOR,
      'dinosaur': Race.DINOSAUR,
      'fish': Race.FISH,
      'sea serpent': Race.SEASERPENT,
      'reptile': Race.REPTILE,
      'psychic': Race.PSYCHO,
      'divine-beast': Race.DIVINE,
      'wyrm': Race.WYRM,
      'cyberse': Race.CYBERSE
    };

    return raceMap[race.toLowerCase()] || Race.WARRIOR;
  }

  private parseAttribute(attr: string): Attribute {
    const attrMap: { [key: string]: Attribute } = {
      'earth': Attribute.EARTH,
      'water': Attribute.WATER,
      'fire': Attribute.FIRE,
      'wind': Attribute.WIND,
      'light': Attribute.LIGHT,
      'dark': Attribute.DARK,
      'divine': Attribute.DIVINE
    };

    return attrMap[attr.toLowerCase()] || Attribute.DARK;
  }
}
