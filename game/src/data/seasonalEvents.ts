// ============================================================
// СЕЗОННЫЕ СОБЫТИЯ — 4 события из тз/11_GAME_CONFIGS.md раздел 11
// ============================================================

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  biomeLevels: number[];
  durationHours: number;
  frequencyDays: number;
  effects: {
    chanceMultiplier: number;
    speedMultiplier: number;
    quantityMultiplier: number;
    rarityBonus: number;
    valueMultiplier: number;
  };
  visualEffect: 'rain' | 'fog' | 'aurora' | 'heatwave' | 'golden' | 'snow';
  skyColorOverride: number | null;
  checkpointBonus: number;
  leaderboardBonus: number;
  specialReward: string;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'event_spawn', name: 'Нерест',
    description: 'Рыба активно нерестится — шанс поимки удвоен!',
    biomeLevels: [1, 2, 3], durationHours: 120, frequencyDays: 7,
    effects: { chanceMultiplier: 2.0, speedMultiplier: 1.2, quantityMultiplier: 1.0, rarityBonus: 50, valueMultiplier: 1.0 },
    visualEffect: 'rain', skyColorOverride: 0x6a9abf,
    checkpointBonus: 1, leaderboardBonus: 1.0,
    specialReward: '+3★ в лидерборде + 300 монет',
  },
  {
    id: 'event_golden_week', name: 'Золотая неделя',
    description: 'Стоимость всего увеличена в 2.5 раза!',
    biomeLevels: [1, 2, 3], durationHours: 96, frequencyDays: 7,
    effects: { chanceMultiplier: 1.5, speedMultiplier: 1.0, quantityMultiplier: 1.3, rarityBonus: 0, valueMultiplier: 2.5 },
    visualEffect: 'golden', skyColorOverride: 0xf5d06e,
    checkpointBonus: 0, leaderboardBonus: 1.0,
    specialReward: 'Спец. лутбокс',
  },
  {
    id: 'event_salmon_migration', name: 'Миграция лосося',
    description: 'Лососи мигрируют через Lago Argentino — огромные трофеи!',
    biomeLevels: [3], durationHours: 168, frequencyDays: 14,
    effects: { chanceMultiplier: 1.0, speedMultiplier: 1.5, quantityMultiplier: 1.0, rarityBonus: 150, valueMultiplier: 1.0 },
    visualEffect: 'fog', skyColorOverride: 0x4a6b8a,
    checkpointBonus: 2, leaderboardBonus: 1.0,
    specialReward: 'Трофей «Король реки»',
  },
  {
    id: 'event_spring_bloom', name: 'Весенний расцвет',
    description: 'Природа расцветает — больше ресурсов в биомах!',
    biomeLevels: [2, 3], durationHours: 72, frequencyDays: 7,
    effects: { chanceMultiplier: 1.5, speedMultiplier: 1.0, quantityMultiplier: 1.4, rarityBonus: 0, valueMultiplier: 1.0 },
    visualEffect: 'aurora', skyColorOverride: 0x9ed8b8,
    checkpointBonus: 1, leaderboardBonus: 1.0,
    specialReward: 'Бесплатные приманки ×10',
  },
  {
    id: 'event_ice_festival', name: 'Ледниковый фестиваль',
    description: 'Льды приносят редких рыб из глубин!',
    biomeLevels: [3], durationHours: 96, frequencyDays: 21,
    effects: { chanceMultiplier: 1.8, speedMultiplier: 1.3, quantityMultiplier: 1.2, rarityBonus: 80, valueMultiplier: 1.8 },
    visualEffect: 'snow', skyColorOverride: 0xd6eaf8,
    checkpointBonus: 2, leaderboardBonus: 1.5,
    specialReward: 'Ледниковый лутбокс + 500 gems',
  },
];
