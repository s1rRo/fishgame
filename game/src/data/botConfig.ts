// ============================================================
// БОТЫ — симуляция мира, из тз/11_GAME_CONFIGS.md раздел 13
// ============================================================

export const BOT_CONFIG = {
  /** Распределение ботов по биомам */
  distribution: {
    L1: 0.80, // 80% от всех деревень
    L2: 0.15,
    L3: 0.05,
  },
  /** Уровень деревни ботов */
  levelRange: {
    L1: { min: 1, max: 4 },
    L2: { min: 5, max: 8 },
    L3: { min: 8, max: 12 },
  },
  /** Обновление лидерборда */
  leaderboardUpdateMinutes: 10,
  /** Диапазон счёта ботов: playerScore × (min – max) */
  scoreRange: { min: 0.3, max: 2.0 },
} as const;

/** Префиксы и суффиксы для генерации имён */
export const BOT_NAME_PREFIXES = ['Bot', 'Pato', 'Pescador', 'Gaucho', 'Patagón', 'Río', 'Lago'];
export const BOT_NAME_SUFFIXES = ['_77', '_12', '_Pro', '_Max', '_King', '_Ace'];

/** Генерация случайного имени бота */
export function generateBotName(): string {
  const prefix = BOT_NAME_PREFIXES[Math.floor(Math.random() * BOT_NAME_PREFIXES.length)];
  const suffix = BOT_NAME_SUFFIXES[Math.floor(Math.random() * BOT_NAME_SUFFIXES.length)];
  return `${prefix}${suffix}`;
}

/** Генерация счёта бота относительно игрока */
export function generateBotScore(playerScore: number): number {
  const mult = BOT_CONFIG.scoreRange.min + Math.random() * (BOT_CONFIG.scoreRange.max - BOT_CONFIG.scoreRange.min);
  return Math.floor(playerScore * mult);
}
