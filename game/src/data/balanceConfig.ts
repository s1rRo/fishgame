// ============================================================
// БАЛАНС ЭКОНОМИКИ — из тз/11_GAME_CONFIGS.md раздел 12
// ============================================================

/** Валюты и обмен */
export const CURRENCY_CONFIG = {
  startSoftCoins: 250,
  startGems: 5,
  softCoinsPerGem: 120,    // 120 softCoins = 1 gem
  gemsToSoftCoins: 100,    // 1 gem = 100 softCoins
  auctionFluctuation: 0.10, // ±10%
  auctionCommission: 0.05,  // 5%
  maxOfflineHours: 8,
  autosaveIntervalSec: 30,
  rateLimitPerHour: 100,
} as const;

/** XP и прогрессия деревни */
export const VILLAGE_XP_TABLE: { level: number; xpRequired: number; bonus: string }[] = [
  { level: 2,  xpRequired: 500,    bonus: '+1 слот NPC' },
  { level: 3,  xpRequired: 1500,   bonus: 'Разблокировка здания' },
  { level: 4,  xpRequired: 3000,   bonus: '+территория' },
  { level: 5,  xpRequired: 6000,   bonus: 'Разблокировка L2 condition' },
  { level: 6,  xpRequired: 10000,  bonus: '+2 слота NPC' },
  { level: 7,  xpRequired: 16000,  bonus: 'Редкий NPC в лутбоксе' },
  { level: 8,  xpRequired: 25000,  bonus: '+территория ×1.5' },
  { level: 9,  xpRequired: 38000,  bonus: 'Разблокировка крафта L2' },
  { level: 10, xpRequired: 55000,  bonus: 'Эпический NPC в лутбоксе' },
  { level: 11, xpRequired: 80000,  bonus: '+территория ×2' },
  { level: 12, xpRequired: 110000, bonus: 'Разблокировка L3 condition' },
];

/** FishingScene — баланс натяжения */
export const FISHING_BALANCE = {
  tensionRate: 15,         // ед/сек при hold
  releaseRate: 20,         // ед/сек при отпускании
  crashThreshold: 80,      // обрыв при >= 80 (не 100!)
  minSessionTimeSec: 45,   // Duolingo-правило
  maxFishPerSession: 12,
  minFishPerSession: 8,
} as const;

/** Шанс поимки по rarity */
export const CATCH_CHANCE_BASE: Record<string, number> = {
  common: 0.35,
  uncommon: 0.22,
  rare: 0.12,
  epic: 0.06,
  legendary: 0.01,
};

/** Звёзды лидерборда */
export const STAR_CONDITIONS = {
  maxCastsPerCheckpoint: 5,  // ≤5 забросов на чекпоинт → +1★
  rareRarities: ['rare', 'epic', 'legendary'], // +1★
  heavyWeightThreshold: 0.5, // >50% maxWeight → +1★
  maxStars: 3,
} as const;

/** NPC тренировка */
export const NPC_TRAINING = {
  speedBonusPerLevel: 0.08,   // +8%/lvl
  cargoBonusPerLevel: 0.12,   // +12%/lvl
  fishingBonusFlat: 0.15,     // +15% к рыбалке
} as const;

/** Порча еды */
export const SPOILAGE_CONFIG = {
  maxSpoilageRate: 1.0,   // полная потеря за час при rate=1.0
  checkIntervalMin: 30,   // проверка каждые 30 мин оффлайн
} as const;
