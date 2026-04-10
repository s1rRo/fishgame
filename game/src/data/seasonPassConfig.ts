// ============================================================
// SEASON PASS CONFIG — 28 уровней из тз/11_GAME_CONFIGS.md секция 10
// ============================================================

export interface SeasonPassLevel {
  level: number;
  freeReward: string;
  freeIcon: string;
  freeType: 'softCoins' | 'gems' | 'item' | 'cosmetic' | 'npc' | 'pet' | 'title';
  freeAmount: number;
  premiumReward: string;
  premiumIcon: string;
  premiumType: 'softCoins' | 'gems' | 'item' | 'cosmetic' | 'npc' | 'pet' | 'title';
  premiumAmount: number;
}

export const SEASON_PASS_CONFIG = {
  durationDays: 28,
  xpPerFishFree: 50,
  xpPerFishPremium: 100,
  xpPerNPCGather: 25,
  xpPerDailyLogin: 200,
  xpPerLevel: 1000,
  totalLevels: 28,
  premiumCostGems: 150,
};

export const SEASON_PASS_LEVELS: SeasonPassLevel[] = [
  { level: 1,  freeReward: '2× Обычный NPC',              freeIcon: '🎲', freeType: 'npc',       freeAmount: 2,     premiumReward: '100 монет',             premiumIcon: '💰', premiumType: 'softCoins', premiumAmount: 100 },
  { level: 2,  freeReward: '500 монет',                    freeIcon: '💰', freeType: 'softCoins', freeAmount: 500,   premiumReward: '+500 монет',            premiumIcon: '💰', premiumType: 'softCoins', premiumAmount: 500 },
  { level: 3,  freeReward: '5× Мотыль',                    freeIcon: '🪱', freeType: 'item',      freeAmount: 5,     premiumReward: 'Питомец Common',        premiumIcon: '🐾', premiumType: 'pet',       premiumAmount: 1 },
  { level: 4,  freeReward: '1000 монет',                   freeIcon: '💰', freeType: 'softCoins', freeAmount: 1000,  premiumReward: '50 гемов',              premiumIcon: '💎', premiumType: 'gems',      premiumAmount: 50 },
  { level: 5,  freeReward: 'Скин хижины «Деревенский»',    freeIcon: '🏠', freeType: 'cosmetic',  freeAmount: 1,     premiumReward: 'Редкий NPC',            premiumIcon: '👤', premiumType: 'npc',       premiumAmount: 1 },
  { level: 6,  freeReward: '5× Блесна',                    freeIcon: '🎣', freeType: 'item',      freeAmount: 5,     premiumReward: '100 гемов',             premiumIcon: '💎', premiumType: 'gems',      premiumAmount: 100 },
  { level: 7,  freeReward: '2000 монет',                   freeIcon: '💰', freeType: 'softCoins', freeAmount: 2000,  premiumReward: '+2000 монет',           premiumIcon: '💰', premiumType: 'softCoins', premiumAmount: 2000 },
  { level: 8,  freeReward: 'Обычный питомец',              freeIcon: '🐾', freeType: 'pet',       freeAmount: 1,     premiumReward: 'Редкий питомец',        premiumIcon: '🐾', premiumType: 'pet',       premiumAmount: 1 },
  { level: 9,  freeReward: '3000 монет',                   freeIcon: '💰', freeType: 'softCoins', freeAmount: 3000,  premiumReward: 'Скин удочки',           premiumIcon: '🎣', premiumType: 'cosmetic',  premiumAmount: 1 },
  { level: 10, freeReward: 'Uncommon NPC',                 freeIcon: '👤', freeType: 'npc',       freeAmount: 1,     premiumReward: '200 гемов',             premiumIcon: '💎', premiumType: 'gems',      premiumAmount: 200 },
  { level: 11, freeReward: '10× Блесна',                   freeIcon: '🎣', freeType: 'item',      freeAmount: 10,    premiumReward: '3000 монет',            premiumIcon: '💰', premiumType: 'softCoins', premiumAmount: 3000 },
  { level: 12, freeReward: '4000 монет',                   freeIcon: '💰', freeType: 'softCoins', freeAmount: 4000,  premiumReward: 'Редкий NPC',            premiumIcon: '👤', premiumType: 'npc',       premiumAmount: 1 },
  { level: 13, freeReward: 'Скин «Патагонский»',           freeIcon: '🏘', freeType: 'cosmetic',  freeAmount: 1,     premiumReward: 'Эпический питомец',     premiumIcon: '🐾', premiumType: 'pet',       premiumAmount: 1 },
  { level: 14, freeReward: '5000 монет',                   freeIcon: '💰', freeType: 'softCoins', freeAmount: 5000,  premiumReward: '300 гемов',             premiumIcon: '💎', premiumType: 'gems',      premiumAmount: 300 },
  { level: 15, freeReward: 'Редкий NPC',                   freeIcon: '👤', freeType: 'npc',       freeAmount: 1,     premiumReward: 'Аватар «Кочевник»',     premiumIcon: '🎭', premiumType: 'cosmetic',  premiumAmount: 1 },
  { level: 16, freeReward: '10× Искусственная мушка',      freeIcon: '🪰', freeType: 'item',      freeAmount: 10,    premiumReward: '400 гемов',             premiumIcon: '💎', premiumType: 'gems',      premiumAmount: 400 },
  { level: 17, freeReward: '6000 монет',                   freeIcon: '💰', freeType: 'softCoins', freeAmount: 6000,  premiumReward: '+6000 монет',           premiumIcon: '💰', premiumType: 'softCoins', premiumAmount: 6000 },
  { level: 18, freeReward: 'Редкий питомец',               freeIcon: '🐾', freeType: 'pet',       freeAmount: 1,     premiumReward: 'Эпический NPC',         premiumIcon: '👤', premiumType: 'npc',       premiumAmount: 1 },
  { level: 19, freeReward: '8000 монет',                   freeIcon: '💰', freeType: 'softCoins', freeAmount: 8000,  premiumReward: '500 гемов',             premiumIcon: '💎', premiumType: 'gems',      premiumAmount: 500 },
  { level: 20, freeReward: 'Скин рыбки пруда',             freeIcon: '🐟', freeType: 'cosmetic',  freeAmount: 1,     premiumReward: 'Эпический скин деревни',premiumIcon: '🏘', premiumType: 'cosmetic',  premiumAmount: 1 },
  { level: 21, freeReward: '10000 монет',                  freeIcon: '💰', freeType: 'softCoins', freeAmount: 10000, premiumReward: '600 гемов',             premiumIcon: '💎', premiumType: 'gems',      premiumAmount: 600 },
  { level: 22, freeReward: 'Эпический питомец',            freeIcon: '🐾', freeType: 'pet',       freeAmount: 1,     premiumReward: 'Эпический NPC',         premiumIcon: '👤', premiumType: 'npc',       premiumAmount: 1 },
  { level: 23, freeReward: 'Удочка «Золотая»',             freeIcon: '🎣', freeType: 'cosmetic',  freeAmount: 1,     premiumReward: '700 гемов',             premiumIcon: '💎', premiumType: 'gems',      premiumAmount: 700 },
  { level: 24, freeReward: '15000 монет',                  freeIcon: '💰', freeType: 'softCoins', freeAmount: 15000, premiumReward: '+15000 монет',          premiumIcon: '💰', premiumType: 'softCoins', premiumAmount: 15000 },
  { level: 25, freeReward: 'Эпический NPC',                freeIcon: '👤', freeType: 'npc',       freeAmount: 1,     premiumReward: 'Легендарный питомец',   premiumIcon: '🐾', premiumType: 'pet',       premiumAmount: 1 },
  { level: 26, freeReward: '20000 монет',                  freeIcon: '💰', freeType: 'softCoins', freeAmount: 20000, premiumReward: '1000 гемов',            premiumIcon: '💎', premiumType: 'gems',      premiumAmount: 1000 },
  { level: 27, freeReward: 'Скин «Nomad»',                 freeIcon: '🧑', freeType: 'cosmetic',  freeAmount: 1,     premiumReward: 'Легенд. скин деревни',  premiumIcon: '🏘', premiumType: 'cosmetic',  premiumAmount: 1 },
  { level: 28, freeReward: 'Титул «River Lord»',           freeIcon: '🏆', freeType: 'title',     freeAmount: 1,     premiumReward: 'Титул + 2000 гемов',   premiumIcon: '👑', premiumType: 'gems',      premiumAmount: 2000 },
];
