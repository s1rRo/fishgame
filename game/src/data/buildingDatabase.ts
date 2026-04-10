// ============================================================
// BUILDING DATABASE — 7 типов зданий с уровнями
// Из тз/11_GAME_CONFIGS.md раздел 5
// ============================================================

export interface BuildingLevelConfig {
  level: number;
  upgradeCostSoft: number;
  upgradeResources: Array<{ resourceId: string; quantity: number }>;
  upgradeTimeMin: number;
  bonusDescription: string;
  unlockVillageLevel?: number;
  npcSlots?: number;
  storageCapacityKg?: number;
  processingMultiplier?: number;
  processingTimeMin?: number;
  passiveIncomePerMin?: number;
  trainingSpeedBonus?: number;
  trainingSlots?: number;
  fishSlots?: number;
  growthMultiplier?: number;
  fishPerSession?: number;
}

export interface BuildingDBConfig {
  id: string;
  type: string;
  name: string;
  description: string;
  maxLevel: number;
  levels: BuildingLevelConfig[];
  position3D: { x: number; z: number };
  gridSize: { w: number; h: number };
  movable: boolean;
  meshKey: string;
}

export const BUILDING_DATABASE: BuildingDBConfig[] = [
  // ─── Хижина (house) ───
  {
    id: 'house', type: 'house', name: 'Хижина', description: 'Жилище — определяет кол-во NPC слотов',
    maxLevel: 5, movable: true, meshKey: 'building_house',
    position3D: { x: 0, z: 0 }, gridSize: { w: 3, h: 3 },
    levels: [
      { level: 1, upgradeCostSoft: 0, upgradeResources: [], upgradeTimeMin: 0, bonusDescription: 'Стартовая хижина', unlockVillageLevel: 1, npcSlots: 2 },
      { level: 2, upgradeCostSoft: 800, upgradeResources: [{ resourceId: 'wood_oak', quantity: 15 }, { resourceId: 'stone', quantity: 10 }], upgradeTimeMin: 30, bonusDescription: '+2 слота NPC', unlockVillageLevel: 2, npcSlots: 4 },
      { level: 3, upgradeCostSoft: 2000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 25 }, { resourceId: 'stone', quantity: 18 }], upgradeTimeMin: 90, bonusDescription: '+2 слота NPC', unlockVillageLevel: 4, npcSlots: 6 },
      { level: 4, upgradeCostSoft: 4500, upgradeResources: [{ resourceId: 'wood_oak', quantity: 40 }, { resourceId: 'stone', quantity: 30 }, { resourceId: 'ore_iron', quantity: 5 }], upgradeTimeMin: 240, bonusDescription: '+2 слота NPC', unlockVillageLevel: 7, npcSlots: 8 },
      { level: 5, upgradeCostSoft: 9000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 60 }, { resourceId: 'stone', quantity: 50 }, { resourceId: 'ore_iron', quantity: 15 }], upgradeTimeMin: 480, bonusDescription: 'Легендарный статус', unlockVillageLevel: 10, npcSlots: 12 },
    ],
  },

  // ─── Склад еды ───
  {
    id: 'storage_food', type: 'storage_food', name: 'Склад еды', description: 'Хранение рыбы и продуктов',
    maxLevel: 4, movable: true, meshKey: 'building_storage',
    position3D: { x: -6, z: 0 }, gridSize: { w: 2, h: 2 },
    levels: [
      { level: 1, upgradeCostSoft: 600, upgradeResources: [{ resourceId: 'wood_oak', quantity: 12 }, { resourceId: 'stone', quantity: 8 }], upgradeTimeMin: 15, bonusDescription: 'Базовый', storageCapacityKg: 200 },
      { level: 2, upgradeCostSoft: 1500, upgradeResources: [{ resourceId: 'wood_oak', quantity: 20 }, { resourceId: 'stone', quantity: 15 }], upgradeTimeMin: 45, bonusDescription: '-25% порча', storageCapacityKg: 400 },
      { level: 3, upgradeCostSoft: 3000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 35 }, { resourceId: 'stone', quantity: 25 }, { resourceId: 'ore_iron', quantity: 3 }], upgradeTimeMin: 120, bonusDescription: '-50% порча', storageCapacityKg: 800 },
      { level: 4, upgradeCostSoft: 6000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 55 }, { resourceId: 'stone', quantity: 40 }, { resourceId: 'ore_iron', quantity: 10 }], upgradeTimeMin: 300, bonusDescription: '-75% порча', storageCapacityKg: 1500 },
    ],
  },

  // ─── Склад дерева ───
  {
    id: 'storage_wood', type: 'storage_wood', name: 'Склад дерева', description: 'Хранение древесины',
    maxLevel: 4, movable: true, meshKey: 'building_storage',
    position3D: { x: -6, z: 3 }, gridSize: { w: 2, h: 2 },
    levels: [
      { level: 1, upgradeCostSoft: 600, upgradeResources: [{ resourceId: 'wood_oak', quantity: 12 }, { resourceId: 'stone', quantity: 8 }], upgradeTimeMin: 15, bonusDescription: 'Базовый', storageCapacityKg: 200 },
      { level: 2, upgradeCostSoft: 1500, upgradeResources: [{ resourceId: 'wood_oak', quantity: 20 }, { resourceId: 'stone', quantity: 15 }], upgradeTimeMin: 45, bonusDescription: 'Больше места', storageCapacityKg: 400 },
      { level: 3, upgradeCostSoft: 3000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 35 }, { resourceId: 'stone', quantity: 25 }, { resourceId: 'ore_iron', quantity: 3 }], upgradeTimeMin: 120, bonusDescription: 'Ещё больше', storageCapacityKg: 800 },
      { level: 4, upgradeCostSoft: 6000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 55 }, { resourceId: 'stone', quantity: 40 }, { resourceId: 'ore_iron', quantity: 10 }], upgradeTimeMin: 300, bonusDescription: 'Максимум', storageCapacityKg: 1500 },
    ],
  },

  // ─── Склад камня ───
  {
    id: 'storage_stone', type: 'storage_stone', name: 'Склад камня', description: 'Хранение камня и руды',
    maxLevel: 4, movable: true, meshKey: 'building_storage',
    position3D: { x: -6, z: -3 }, gridSize: { w: 2, h: 2 },
    levels: [
      { level: 1, upgradeCostSoft: 600, upgradeResources: [{ resourceId: 'wood_oak', quantity: 12 }, { resourceId: 'stone', quantity: 8 }], upgradeTimeMin: 15, bonusDescription: 'Базовый', storageCapacityKg: 200 },
      { level: 2, upgradeCostSoft: 1500, upgradeResources: [{ resourceId: 'wood_oak', quantity: 20 }, { resourceId: 'stone', quantity: 15 }], upgradeTimeMin: 45, bonusDescription: 'Больше места', storageCapacityKg: 400 },
      { level: 3, upgradeCostSoft: 3000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 35 }, { resourceId: 'stone', quantity: 25 }, { resourceId: 'ore_iron', quantity: 3 }], upgradeTimeMin: 120, bonusDescription: 'Ещё больше', storageCapacityKg: 800 },
      { level: 4, upgradeCostSoft: 6000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 55 }, { resourceId: 'stone', quantity: 40 }, { resourceId: 'ore_iron', quantity: 10 }], upgradeTimeMin: 300, bonusDescription: 'Максимум', storageCapacityKg: 1500 },
    ],
  },

  // ─── Коптильня (smokehouse) ───
  {
    id: 'smokehouse', type: 'smokehouse', name: 'Коптильня', description: 'Переработка рыбы в копчёную (×2-3.5 стоимость)',
    maxLevel: 4, movable: true, meshKey: 'building_smokehouse',
    position3D: { x: 5, z: -4 }, gridSize: { w: 2, h: 3 },
    levels: [
      { level: 1, upgradeCostSoft: 1200, upgradeResources: [{ resourceId: 'wood_oak', quantity: 20 }, { resourceId: 'stone', quantity: 15 }], upgradeTimeMin: 60, bonusDescription: '×2.0 цена, 60 мин', processingMultiplier: 2.0, processingTimeMin: 60 },
      { level: 2, upgradeCostSoft: 2800, upgradeResources: [{ resourceId: 'wood_oak', quantity: 35 }, { resourceId: 'stone', quantity: 25 }, { resourceId: 'ore_iron', quantity: 5 }], upgradeTimeMin: 180, bonusDescription: '×2.5 цена, 45 мин, 2 слота', processingMultiplier: 2.5, processingTimeMin: 45 },
      { level: 3, upgradeCostSoft: 5500, upgradeResources: [{ resourceId: 'wood_oak', quantity: 55 }, { resourceId: 'stone', quantity: 40 }, { resourceId: 'ore_iron', quantity: 12 }], upgradeTimeMin: 360, bonusDescription: '×3.0 цена, 30 мин, 3 слота', processingMultiplier: 3.0, processingTimeMin: 30 },
      { level: 4, upgradeCostSoft: 10000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 80 }, { resourceId: 'stone', quantity: 60 }, { resourceId: 'ore_iron', quantity: 20 }], upgradeTimeMin: 720, bonusDescription: '×3.5 цена, 20 мин, 4 слота', processingMultiplier: 3.5, processingTimeMin: 20 },
    ],
  },

  // ─── Обучающий центр (training_center) ───
  {
    id: 'training_center', type: 'training_center', name: 'Обучающий центр', description: 'Тренировка NPC — ускоряет прокачку',
    maxLevel: 4, movable: true, meshKey: 'building_training',
    position3D: { x: 5, z: 4 }, gridSize: { w: 2, h: 2 },
    levels: [
      { level: 1, upgradeCostSoft: 1500, upgradeResources: [{ resourceId: 'wood_oak', quantity: 25 }, { resourceId: 'stone', quantity: 30 }], upgradeTimeMin: 90, bonusDescription: 'Базовая скорость, 1 слот', trainingSpeedBonus: 1.0, trainingSlots: 1 },
      { level: 2, upgradeCostSoft: 3500, upgradeResources: [{ resourceId: 'wood_oak', quantity: 40 }, { resourceId: 'stone', quantity: 45 }, { resourceId: 'ore_iron', quantity: 8 }], upgradeTimeMin: 240, bonusDescription: '×1.5 скорость, 2 слота', trainingSpeedBonus: 1.5, trainingSlots: 2 },
      { level: 3, upgradeCostSoft: 7000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 65 }, { resourceId: 'stone', quantity: 70 }, { resourceId: 'ore_iron', quantity: 20 }], upgradeTimeMin: 480, bonusDescription: '×2.0 скорость, 3 слота', trainingSpeedBonus: 2.0, trainingSlots: 3 },
      { level: 4, upgradeCostSoft: 13000, upgradeResources: [{ resourceId: 'wood_oak', quantity: 100 }, { resourceId: 'stone', quantity: 100 }, { resourceId: 'ore_iron', quantity: 40 }], upgradeTimeMin: 960, bonusDescription: '×3.0 скорость, 4 слота', trainingSpeedBonus: 3.0, trainingSlots: 4 },
    ],
  },

  // ─── Пристань (dock) ───
  {
    id: 'dock', type: 'dock', name: 'Пристань', description: 'Пассивный доход монет',
    maxLevel: 3, movable: true, meshKey: 'building_dock',
    position3D: { x: 0, z: -8 }, gridSize: { w: 3, h: 2 },
    levels: [
      { level: 1, upgradeCostSoft: 900, upgradeResources: [{ resourceId: 'wood_oak', quantity: 18 }, { resourceId: 'stone', quantity: 10 }], upgradeTimeMin: 45, bonusDescription: '5💰/мин', passiveIncomePerMin: 5 },
      { level: 2, upgradeCostSoft: 2200, upgradeResources: [{ resourceId: 'wood_oak', quantity: 30 }, { resourceId: 'stone', quantity: 20 }, { resourceId: 'ore_iron', quantity: 5 }], upgradeTimeMin: 120, bonusDescription: '12💰/мин + морской NPC', passiveIncomePerMin: 12 },
      { level: 3, upgradeCostSoft: 4800, upgradeResources: [{ resourceId: 'wood_oak', quantity: 50 }, { resourceId: 'stone', quantity: 35 }, { resourceId: 'ore_iron', quantity: 12 }], upgradeTimeMin: 300, bonusDescription: '25💰/мин + торговые маршруты', passiveIncomePerMin: 25 },
    ],
  },

  // ─── Личный пруд (pond) ───
  {
    id: 'pond', type: 'pond', name: 'Личный пруд', description: 'Выращивание рыбы — пассивный рост веса',
    maxLevel: 3, movable: false, meshKey: 'building_pond',
    position3D: { x: -4, z: 5 }, gridSize: { w: 3, h: 3 },
    levels: [
      { level: 1, upgradeCostSoft: 500, upgradeResources: [{ resourceId: 'wood_oak', quantity: 10 }, { resourceId: 'stone', quantity: 5 }], upgradeTimeMin: 20, bonusDescription: '5 рыб, ×1.0 рост', fishSlots: 5, growthMultiplier: 1.0, fishPerSession: 3 },
      { level: 2, upgradeCostSoft: 1200, upgradeResources: [{ resourceId: 'wood_oak', quantity: 18 }, { resourceId: 'stone', quantity: 12 }], upgradeTimeMin: 60, bonusDescription: '10 рыб, ×1.3 рост', fishSlots: 10, growthMultiplier: 1.3, fishPerSession: 5 },
      { level: 3, upgradeCostSoft: 2800, upgradeResources: [{ resourceId: 'wood_oak', quantity: 30 }, { resourceId: 'stone', quantity: 20 }, { resourceId: 'ore_iron', quantity: 5 }], upgradeTimeMin: 150, bonusDescription: '20 рыб, ×1.6 рост', fishSlots: 20, growthMultiplier: 1.6, fishPerSession: 8 },
    ],
  },
];

/** Получить здание по id */
export const getBuildingById = (id: string): BuildingDBConfig | undefined =>
  BUILDING_DATABASE.find((b) => b.id === id);

/** Получить конфиг уровня здания */
export const getBuildingLevel = (buildingId: string, level: number): BuildingLevelConfig | undefined => {
  const building = getBuildingById(buildingId);
  return building?.levels.find((l) => l.level === level);
};
