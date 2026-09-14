export interface CardData {
  id: number;
  name: string;
  type: CardType;
  race: Race;
  attribute?: Attribute;
  level?: number;
  atk?: number;
  def?: number;
  scale?: number;
  linkMarkers?: LinkMarker[];
  description: string;
  pendulumEffect?: string;
  imageUrl?: string;
}

export enum CardType {
  MONSTER = 0x1,
  SPELL = 0x2,
  TRAP = 0x4,
  NORMAL = 0x10,
  EFFECT = 0x20,
  FUSION = 0x40,
  RITUAL = 0x80,
  TRAPMONSTER = 0x100,
  SPIRIT = 0x200,
  UNION = 0x400,
  DUAL = 0x800,
  TUNER = 0x1000,
  SYNCHRO = 0x2000,
  TOKEN = 0x4000,
  QUICKPLAY = 0x10000,
  CONTINUOUS = 0x20000,
  EQUIP = 0x40000,
  FIELD = 0x80000,
  COUNTER = 0x100000,
  FLIP = 0x200000,
  TOON = 0x400000,
  XYZ = 0x800000,
  PENDULUM = 0x1000000,
  SPSUMMON = 0x2000000,
  LINK = 0x4000000
}

export enum Race {
  WARRIOR = 0x1,
  SPELLCASTER = 0x2,
  FAIRY = 0x4,
  FIEND = 0x8,
  ZOMBIE = 0x10,
  MACHINE = 0x20,
  AQUA = 0x40,
  PYRO = 0x80,
  ROCK = 0x100,
  WINDBEAST = 0x200,
  PLANT = 0x400,
  INSECT = 0x800,
  THUNDER = 0x1000,
  DRAGON = 0x2000,
  BEAST = 0x4000,
  BEASTWARRIOR = 0x8000,
  DINOSAUR = 0x10000,
  FISH = 0x20000,
  SEASERPENT = 0x40000,
  REPTILE = 0x80000,
  PSYCHO = 0x100000,
  DIVINE = 0x200000,
  CREATORGOD = 0x400000,
  WYRM = 0x800000,
  CYBERSE = 0x1000000,
  ILLUSION = 0x2000000
}

export enum Attribute {
  EARTH = 0x1,
  WATER = 0x2,
  FIRE = 0x4,
  WIND = 0x8,
  LIGHT = 0x10,
  DARK = 0x20,
  DIVINE = 0x40
}

export enum LinkMarker {
  TOP_LEFT = 0x001,
  TOP = 0x002,
  TOP_RIGHT = 0x004,
  LEFT = 0x008,
  RIGHT = 0x020,
  BOTTOM_LEFT = 0x040,
  BOTTOM = 0x080,
  BOTTOM_RIGHT = 0x100
}

export interface AICardRequest {
  prompt: string;
  cardType?: 'monster' | 'spell' | 'trap';
  theme?: string;
  startId?: number;
}

export interface CardImageOptions {
  imageUrl?: string;
  imagePath?: string;
  customBackground?: string;
  foil?: boolean;
}
