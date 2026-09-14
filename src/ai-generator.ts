import { OpenAI } from 'openai';
import { CardData, CardType, Race, Attribute, AICardRequest } from './types.js';

/**
 * 各 AI 服务方的默认端点与模型。
 * - openai / deepseek / zhipu 走 OpenAI 兼容接口（智谱 GLM 亦提供 OpenAI 兼容模式）
 * - anthropic 使用其原生 Messages 接口（非 OpenAI 兼容，单独分支处理）
 */
export const AI_PROVIDER_DEFAULTS: Record<string, { endpoint: string; model: string }> = {
  openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  zhipu: { endpoint: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  anthropic: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
  custom: { endpoint: '', model: '' }
};

/** 支持 response_format=json_object 的服务方；其余不传该参数以保证兼容性 */
const JSON_MODE_PROVIDERS = new Set(['openai', 'deepseek', 'zhipu']);

export interface AIConfig {
  provider?: string;
  apiKey: string;
  endpoint?: string;
  model?: string;
}

export class AICardGenerator {
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly openai?: OpenAI;

  /** 兼容旧调用：传入字符串视为 apiKey（默认 OpenAI） */
  constructor(config: AIConfig | string) {
    const cfg: AIConfig = typeof config === 'string' ? { apiKey: config } : config;
    this.provider = (cfg.provider || 'openai').toLowerCase();
    this.apiKey = cfg.apiKey || process.env.OPENAI_API_KEY || '';

    const defaults = AI_PROVIDER_DEFAULTS[this.provider] || AI_PROVIDER_DEFAULTS.custom;
    this.endpoint = (cfg.endpoint || defaults.endpoint || '').trim();
    this.model = (cfg.model || defaults.model || '').trim() || 'gpt-4o-mini';

    if (this.provider !== 'anthropic') {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.endpoint || undefined
      });
    }
  }

  /** 真实发起一次最小请求，用于「测试连接」 */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const reply = await this.chat('You are a connectivity test.', 'Reply with the single word: ok');
      return { success: true, message: (reply.trim() || 'ok').slice(0, 60) };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async generateCard(request: AICardRequest): Promise<CardData> {
    const prompt = this.buildPrompt(request);
    const content = await this.chat(
      'You are a Yu-Gi-Oh! card designer. Generate balanced, creative cards with proper OCG formatting. Return valid JSON only.',
      prompt
    );
    const cardJson = this.extractJson(content);
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

  /** 按服务方选择接口：Anthropic 用原生 Messages API，其余走 OpenAI 兼容接口 */
  private async chat(system: string, user: string): Promise<string> {
    if (this.provider === 'anthropic') {
      return this.chatAnthropic(system, user);
    }
    return this.chatOpenAICompatible(system, user);
  }

  private async chatOpenAICompatible(system: string, user: string): Promise<string> {
    if (!this.openai) {
      throw new Error('AI 客户端未初始化（缺少 API Key 或端点）');
    }

    const messages = [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: user }
    ];
    const useJsonMode = JSON_MODE_PROVIDERS.has(this.provider);

    try {
      const resp = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.8,
        ...(useJsonMode ? { response_format: { type: 'json_object' as const } } : {})
      });
      return resp.choices[0]?.message?.content || '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 部分兼容端点不支持 response_format，遇到相关报错时去掉该参数重试一次
      if (useJsonMode && /response_format|json_object|json mode/i.test(msg)) {
        const retry = await this.openai.chat.completions.create({
          model: this.model,
          messages,
          temperature: 0.8
        });
        return retry.choices[0]?.message?.content || '';
      }
      throw err;
    }
  }

  private async chatAnthropic(system: string, user: string): Promise<string> {
    const base = this.endpoint || 'https://api.anthropic.com/v1';
    const res = await fetch(`${base.replace(/\/$/, '')}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });

    if (!res.ok) {
      throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }

    const data: any = await res.json();
    return (data.content || [])
      .filter((part: any) => part && part.type === 'text')
      .map((part: any) => part.text || '')
      .join('');
  }

  /** 从模型返回中稳健提取 JSON（兼容代码块围栏与前后多余文本） */
  private extractJson(text: string): any {
    if (!text || !text.trim()) {
      throw new Error('AI 返回内容为空');
    }
    let t = text.trim();

    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      t = fence[1].trim();
    }

    try {
      return JSON.parse(t);
    } catch {
      const start = t.indexOf('{');
      const end = t.lastIndexOf('}');
      if (start !== -1 && end > start) {
        return JSON.parse(t.slice(start, end + 1));
      }
      throw new Error('AI 返回内容不是合法 JSON');
    }
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

    return raceMap[String(race).toLowerCase()] || Race.WARRIOR;
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

    return attrMap[String(attr).toLowerCase()] || Attribute.DARK;
  }
}
