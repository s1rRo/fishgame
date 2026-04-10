// ============================================================
// ЛУТБОКС-КОНФИГ — 6 типов лутбоксов
// River Lord: Pixel Fishery
// Источник: тз/11_GAME_CONFIGS.md секция 14
// ============================================================

export type LootboxType = 'starter' | 'daily' | 'basic' | 'premium' | 'fishing' | 'season' | 'golden';

export type LootRewardType = 'softCoins' | 'gems' | 'npc' | 'pet' | 'bait' | 'cosmetic';

export interface LootDrop {
  type: LootRewardType;
  chance: number;         // 0.0–1.0
  rarity?: string;        // для npc/pet: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
  valueMin?: number;      // мин значение (для softCoins/gems/bait qty)
  valueMax?: number;      // макс значение
  itemIds?: string[];     // конкретные id предметов (для cosmetic)
}

export interface LootboxConfig {
  id: LootboxType;
  name: string;
  description: string;
  priceGems: number;      // 0 = бесплатный / квест
  maxPerDay: number;      // лимит в день (0 = без лимита)
  drops: LootDrop[];
}

export const LOOTBOX_CONFIGS: LootboxConfig[] = [
  {
    id: 'starter',
    name: 'Стартовый',
    description: 'Бесплатный лутбокс для новых игроков. Содержит NPC и ресурсы.',
    priceGems: 0,
    maxPerDay: 0,
    drops: [
      { type: 'npc', chance: 0.60, rarity: 'Common' },
      { type: 'softCoins', chance: 0.30, valueMin: 100, valueMax: 250 },
      { type: 'npc', chance: 0.10, rarity: 'Uncommon' },
    ],
  },
  {
    id: 'daily',
    name: 'Ежедневный',
    description: 'Бесплатный ежедневный лутбокс. Монеты, приманки или NPC.',
    priceGems: 0,
    maxPerDay: 1,
    drops: [
      { type: 'softCoins', chance: 0.70, valueMin: 50, valueMax: 150 },
      { type: 'bait', chance: 0.20, valueMin: 3, valueMax: 5 },
      { type: 'npc', chance: 0.10, rarity: 'Common' },
    ],
  },
  {
    id: 'basic',
    name: 'Обычный',
    description: 'Базовый лутбокс с шансом на редкого NPC.',
    priceGems: 50,
    maxPerDay: 0,
    drops: [
      { type: 'npc', chance: 0.55, rarity: 'Common' },
      { type: 'npc', chance: 0.30, rarity: 'Uncommon' },
      { type: 'npc', chance: 0.14, rarity: 'Rare' },
      { type: 'npc', chance: 0.01, rarity: 'Epic' },
    ],
  },
  {
    id: 'premium',
    name: 'Премиум',
    description: 'Гарантированный NPC от Uncommon и выше!',
    priceGems: 150,
    maxPerDay: 0,
    drops: [
      { type: 'npc', chance: 0.60, rarity: 'Uncommon' },
      { type: 'npc', chance: 0.30, rarity: 'Rare' },
      { type: 'npc', chance: 0.09, rarity: 'Epic' },
      { type: 'npc', chance: 0.01, rarity: 'Legendary' },
    ],
  },
  {
    id: 'fishing',
    name: 'Рыбацкий',
    description: 'Приманки, монеты и шанс на скин удочки.',
    priceGems: 80,
    maxPerDay: 0,
    drops: [
      { type: 'bait', chance: 0.60, valueMin: 5, valueMax: 10 },
      { type: 'softCoins', chance: 0.30, valueMin: 200, valueMax: 500 },
      { type: 'cosmetic', chance: 0.10, itemIds: ['rod_steel', 'rod_golden'] },
    ],
  },
  {
    id: 'season',
    name: 'Сезонный',
    description: 'Награда Season Pass. Только редкие NPC!',
    priceGems: 0,
    maxPerDay: 0,
    drops: [
      { type: 'npc', chance: 0.70, rarity: 'Rare' },
      { type: 'npc', chance: 0.25, rarity: 'Epic' },
      { type: 'npc', chance: 0.05, rarity: 'Legendary' },
    ],
  },
  {
    id: 'golden',
    name: 'Золотой',
    description: 'Премиальный лутбокс с эпическими и легендарными питомцами!',
    priceGems: 250,
    maxPerDay: 3,
    drops: [
      { type: 'pet', chance: 0.40, rarity: 'Epic' },
      { type: 'pet', chance: 0.35, rarity: 'Legendary' },
      { type: 'gems', chance: 0.15, valueMin: 400, valueMax: 600 },
      { type: 'cosmetic', chance: 0.10, rarity: 'Legendary' },
    ],
  },
];

export function getLootboxConfig(type: LootboxType): LootboxConfig | undefined {
  return LOOTBOX_CONFIGS.find(c => c.id === type);
}

/** Цветовая схема по типу */
export const LOOTBOX_COLORS: Record<LootboxType, number> = {
  starter:  0x27ae60, // зелёный
  daily:    0x3498db, // синий
  basic:    0x95a5a6, // серый
  premium:  0xf39c12, // золотой
  fishing:  0x2980b9, // тёмно-синий
  season:   0x8e44ad, // фиолетовый
  golden:   0xf1c40f, // ярко-золотой
};
